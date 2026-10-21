#!/usr/bin/env node
/** GEH Serbia V15.2 public energy ingestion for GitHub Pages.
 * No private operational data or restricted price series are published.
 * ENTSO-E token is optional and exists only in GitHub Actions process env.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cleanEnergy, derivedFromProduction, parseEntsoeLoad, MAX_BYTES} from './energy-transform.mjs';
import {normalizeSnapshot} from '../assets/js/energy-model-v18.mjs';
const SITE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(SITE,'data','energy');
const URL_BASE='https://api.energy-charts.info/v2/';
const DAYS={'24h':1,'7d':7,'30d':30};
const REFRESH={'24h':14*60_000,'7d':110*60_000,'30d':350*60_000};
const ENDPOINTS={production:'public_power',physical_flows:'cbpf',commercial_exchange:'cbet'};
const NOW=process.env.GEH_TEST_NOW?new Date(process.env.GEH_TEST_NOW):new Date();
const iso=d=>d.toISOString();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Per-endpoint request pacing; avoids bursts across 24h/7d/30d calls.
const endpointNext=new Map();
async function pace(url){
 if(process.env.GEH_TEST_NOW)return;
 const endpoint=new URL(url).pathname;
 if(!endpoint.startsWith('/v2/'))return;
 const earliest=endpointNext.get(endpoint)||0;
 if(Date.now()<earliest)await sleep(earliest-Date.now());
 endpointNext.set(endpoint,Date.now()+25000);
}
const safeError=e=>String(e?.message||e).replace(/securityToken=[^&\s]+/gi,'securityToken=[REDACTED]').slice(0,160);
function empty(error,source='Fraunhofer ISE Energy-Charts',url='https://api.energy-charts.info/'){
 return {status:'unavailable',data:[],series:[],timestamp:null,source,url,error};
}
async function getResponse(url,{timeoutMs=20000,maxBytes=MAX_BYTES}={}){
  await pace(url);
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(url,{headers:{Accept:'application/json, text/xml, application/xml','User-Agent':'GEH-Serbia-Energy-Preview/15.2'},signal:controller.signal});
      if(r.status===429 || r.status===502 || r.status===503 || r.status===504){
        if(attempt===2)throw Error('HTTP '+r.status+' after 3 attempts');
        const header=r.headers.get('retry-after');
        const sec=header&&/^\d+(?:\.\d+)?$/.test(header)?Number(header):null;
        const until=header&&!Number.isFinite(sec)?Date.parse(header):NaN;
        const wait=sec!==null?Math.min(sec*1000,60000):Number.isFinite(until)?Math.min(Math.max(1000,until-Date.now()),60000):Math.min(2000*2**attempt,8000);
        console.warn(`Upstream HTTP ${r.status}; retry in ${Math.round(wait/1000)}s`);
        await sleep(wait);continue;
      }
      if(!r.ok)throw Error('HTTP '+r.status);
      const size=Number(r.headers.get('content-length')||0);
      if(size>maxBytes)throw Error('Response size exceeds limit');
      const body=await r.text();
      if(Buffer.byteLength(body)>maxBytes)throw Error('Body size exceeds limit');
      return body;
    }catch(e){
      if(attempt<2 && (e?.name==='AbortError'||e instanceof TypeError)){
        await sleep(1500*(attempt+1));continue;
      }
      throw e;
    }finally{clearTimeout(timer)}
  }
  throw Error('Upstream request failed');
}
async function loadPrevious(range){
  // In case this repository intentionally contains a measured snapshot.
  try{
    const obj=JSON.parse(await fs.readFile(path.join(OUT,range+'.json'),'utf8'));
    if(obj?.datasets && Object.values(obj.datasets).some(d=>d?.data?.length))return obj;
  }catch{}
  const base=process.env.PAGES_BASE_URL||'';
  if(/^https:\/\/[^\s]+$/.test(base)){
    try{
      const data=JSON.parse(await getResponse(new URL('data/energy/'+range+'.json',base.endsWith('/')?base:base+'/')));
      if(data?.datasets && Object.values(data.datasets).some(d=>d?.data?.length))return data;
    }catch(e){console.warn(`Previous ${range} snapshot unavailable: ${safeError(e)}`)}
  }
  return {datasets:{},server_time:null};
}
async function updateDataset(name,fetcher,old){
  try{
    const result=await fetcher();
    if(!result.data?.length)throw Error('No usable observed records');
    console.log(`${name}: ${result.data.length} samples, latest ${result.timestamp}`);
    return result;
  }catch(e){
    const stale=old?.[name];
    if(stale?.data?.length){
      console.warn(`${name}: retained previous measured data; ${safeError(e)}`);
      return {...stale,status:'cached',error:`Upstream refresh failed: ${safeError(e)}`};
    }
    console.warn(`${name}: unavailable; ${safeError(e)}`);
    return empty(`No verified observations: ${safeError(e)}`, ['actual_load','load_forecast'].includes(name)?'ENTSO-E Transparency Platform':'Fraunhofer ISE Energy-Charts', ['actual_load','load_forecast'].includes(name)?'https://transparency.entsoe.eu/':'https://api.energy-charts.info/');
  }
}
function entsoeURL(processType,start,end){
  const params=new URLSearchParams({
    securityToken:process.env.ENTSOE_API_TOKEN,
    documentType:'A65',processType,
    outBiddingZone_Domain:'10YCS-SERBIATSOV',
    periodStart:start.toISOString().slice(0,16).replace(/[-:T]/g,''),
    periodEnd:end.toISOString().slice(0,16).replace(/[-:T]/g,'')
  });
  return 'https://web-api.tp.entsoe.eu/api?'+params;
}
async function entsoe(kind,days){
  // API accepts UTC periodStart / periodEnd YYYYMMDDHHmm and returns XML.
  const end=NOW,start=new Date(NOW.getTime()-days*86400_000);
  const xml=await getResponse(entsoeURL(kind==='actual_load'?'A16':'A01',start,end));
  return parseEntsoeLoad(xml,kind,NOW);
}
function placeholder(kind){
  return kind==='day_ahead_price'
    ? {status:'license_required',data:[],series:[],timestamp:null,source:'SEEPEX — market data licensing needed',url:'https://www.seepex-spot.rs/',error:'No public redistribution without verified licence'}
    : {...empty('Requires ENTSOE_API_TOKEN secret and ENTSOE_PUBLIC_REUSE_APPROVED=1 repository variable after rights review', 'ENTSO-E Transparency Platform','https://transparency.entsoe.eu/'),status:'not_configured'};
}
function datasetFresh(o,range){
  const stamp=Date.parse(o?.server_time||'');
  return Number.isFinite(stamp)&&Date.now()-stamp<REFRESH[range];
}
async function collect(range,days){
  const previous=await loadPrevious(range);
  // Recalculate derived data even on a reused snapshot (purges old obsolete total_power cards).
  if(process.env.FORCE_ALL!=='1' && datasetFresh(previous,range)){
    const datasets={...previous.datasets};
    for(const k of Object.keys(datasets))if(k==='generation_total'||k.startsWith('reported_'))delete datasets[k];
    Object.assign(datasets,derivedFromProduction(datasets.production));
    if(!(process.env.ENTSOE_API_TOKEN && process.env.ENTSOE_PUBLIC_REUSE_APPROVED==='1')){
      for(const k of ['actual_load','load_forecast'])datasets[k]=placeholder(k);
    }
    datasets.day_ahead_price=placeholder('day_ahead_price');
    console.log(`${range}: reuse deployed observations (within refresh interval)`);
    const candidate={...previous, datasets, published_at:iso(NOW),status:'partial',period:range};
    return {...candidate,v18:normalizeSnapshot(candidate,{now:iso(NOW)})};
  }
  const tasks=Object.entries(ENDPOINTS).map(async ([name,route])=>{
    const params=new URLSearchParams({country:'rs',start:iso(new Date(NOW.getTime()-days*86400_000)),end:iso(NOW)});
    return [name,await updateDataset(name,async()=>cleanEnergy(JSON.parse(await getResponse(URL_BASE+route+'?'+params)),NOW),previous.datasets)];
  });
  if(process.env.ENTSOE_API_TOKEN && process.env.ENTSOE_PUBLIC_REUSE_APPROVED==='1'){
    for(const name of ['actual_load','load_forecast'])
      tasks.push((async()=>[name,await updateDataset(name,()=>entsoe(name,days),previous.datasets)])());
  }
  // Endpoint query load: three Energy-Charts URLs per range, each fetched at most
  // once for 24h, 7d, 30d respectively. 429 backoff is rate-limit aware.
  const pairs=await Promise.all(tasks);
  const datasets=Object.fromEntries(pairs);
  for(const name of ['actual_load','load_forecast'])if(!datasets[name])datasets[name]=placeholder(name);
  datasets.day_ahead_price=placeholder('day_ahead_price');
  Object.assign(datasets,derivedFromProduction(datasets.production));
  const inputs=Object.keys(ENDPOINTS);
  const observed=inputs.filter(key=>datasets[key]?.data?.length).length;
  const status=observed===inputs.length?'observed':observed?'partial':'unavailable';
  // never imply current observations from server_time if only old data was retained
  const candidate={mode:'github-pages',period:range,server_time:iso(NOW),published_at:iso(NOW),
    refresh_interval_seconds:900,status,datasets,
    source_counts:{public_feed_available:observed,public_feed_configured:inputs.length,
      entsoe_available:['actual_load','load_forecast'].filter(x=>datasets[x]?.data?.length).length,
      derived_available:Object.keys(datasets).filter(k=>k.startsWith('reported_')&&datasets[k].data?.length).length},
    attribution:'Energy-Charts (Fraunhofer ISE), ENTSO-E where available. Not TE-TO Pančevo telemetry.',
    legal:'No day-ahead price series publicly redistributed; derived series describe only observed production technologies.'};
  return {...candidate,v18:normalizeSnapshot(candidate,{now:iso(NOW)})};
}
await fs.mkdir(OUT,{recursive:true});
for(const [range,days] of Object.entries(DAYS)){
  const obj=await collect(range,days);
  const target=path.join(OUT,range+'.json');
  await fs.writeFile(target+'.tmp',JSON.stringify(obj,null,2)+'\n','utf8');
  await fs.rename(target+'.tmp',target);
  console.log(JSON.stringify({range,status:obj.status,source_counts:obj.source_counts,
    latest:Object.fromEntries(Object.entries(obj.datasets).map(([k,v])=>[k,{status:v.status,records:v.data?.length||0,last:v.timestamp||null}]))},null,2));
}
