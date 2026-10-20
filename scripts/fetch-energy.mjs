#!/usr/bin/env node
/**
 * GEH Serbia public GitHub Pages refresh. Node 22 built-ins only.
 * NO private-only/market-price datasets are published. No API keys are exposed.
 * Scheduled job makes deployable JSON; no continuously running backend needed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(SITE,'data','energy');
const BASE = 'https://api.energy-charts.info/v2/';
const RANGES = {'24h':1,'7d':7,'30d':30};
const FRESH_INTERVAL={'24h':15*60_000,'7d':120*60_000,'30d':6*3600_000};
const ENDPOINTS={
  production:{route:'public_power',country:'rs'},
  generation_total:{route:'total_power',country:'rs'},
  physical_flows:{route:'cbpf',country:'rs'},
  commercial_exchange:{route:'cbet',country:'rs'},
  // The public dashboard intentionally does not redistribute licensed RS price series.
};
const NOW=new Date();
const iso=d=>d.toISOString();
const validNumber=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e11;
const TIMEOUT_MS=16000;
const MAX_BYTES=5_000_000;
function trimResponse(raw){
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.data)) throw Error('v2 data array missing');
  if(raw.data.length>7000||!Array.isArray(raw.series))throw Error('too many data points or invalid series');
  const series=raw.series.filter(x=>x&&typeof x.id==='string').slice(0,120).map(x=>({id:x.id.slice(0,95),name:String(x.name||x.id).slice(0,160),unit:String(x.unit||raw.unit||'').slice(0,20)}));
  const validIds=new Set(series.map(x=>x.id));
  const data=[];
  for(const row of raw.data){
    if(!row||typeof row!=='object'||!Number.isFinite(Date.parse(row.timestamp)))continue;
    const v={};
    for(const [k,n] of Object.entries(row.values||{}))if(validIds.has(k)&&validNumber(n))v[k]=n;
    if(Object.keys(v).length)data.push({timestamp:String(row.timestamp).slice(0,55),values:v});
  }
  return {source:'Fraunhofer ISE Energy-Charts',url:'https://api.energy-charts.info/',
    series,data,unit:String(raw.unit||'').slice(0,24),
    timestamp:data.at(-1)?.timestamp||null,generated_at:raw.generated_at||null,
    available_until:raw.available_until||null,timezone:raw.timezone||null,
    interval_minutes:raw.interval_minutes||null,
    license:raw.license||'Source license applies; attribution required',
    retrieved_at:iso(NOW),status:data.length?'observed':'unavailable'};
}
async function getJSON(url){
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
    const resp=await fetch(url,{headers:{'Accept':'application/json','User-Agent':'GEH-Serbia-Pages-Preview/1.0'},signal:controller.signal});
    if(!resp.ok)throw Error(`HTTP ${resp.status}`);
    const body=await resp.text();if(Buffer.byteLength(body)>MAX_BYTES)throw Error('Response exceeds size limit');
    return JSON.parse(body);
  }finally{clearTimeout(timeout)}
}
async function previous(range){
  try {
    const local=JSON.parse(await fs.readFile(path.join(OUT,`${range}.json`),'utf8'));
    if(local?.datasets&&Object.keys(local.datasets).length)return local;
  } catch {}
  // Runner is stateless; recover last successfully deployed data if available.
  const siteURL=process.env.PAGES_BASE_URL||'';
  if(/^https:\/\//.test(siteURL)){
    try{
      const obj=await getJSON(siteURL.replace(/\/?$/,'/')+`data/energy/${range}.json`);
      if(obj?.datasets&&typeof obj.datasets==='object')return obj;
    }catch(e){console.log(`Previous ${range} unavailable: ${String(e.message).slice(0,90)}`)}
  }
  return {datasets:{},server_time:null};
}
async function collect(range,days){
  const old=await previous(range);
  const age=Date.now()-Date.parse(old.server_time||'');
  const shouldRefresh=process.env.FORCE_ALL==='1'||!Number.isFinite(age)||age>=FRESH_INTERVAL[range];
  if(!shouldRefresh){
    console.log(`${range}: reuse successfully deployed snapshot (${Math.round(age/60000)}min)`);
    return old;
  }
  const endpoints=Object.entries(ENDPOINTS);
  const results=await Promise.allSettled(endpoints.map(async ([key,{route,country}])=>{
    const params=new URLSearchParams({country,start:iso(new Date(NOW.getTime()-days*86400_000)),end:iso(NOW)});
    const data=await getJSON(BASE+route+'?'+params);
    return {key,result:trimResponse(data)};
  }));
  const datasets={};let good=0;
  results.forEach((s,i)=>{
    const key=endpoints[i][0],cached=old.datasets?.[key];
    if(s.status==='fulfilled'&&s.value.result.data.length){datasets[key]=s.value.result;good++;console.log(`${range} ${key}: ${s.value.result.data.length} observed records, source latest ${s.value.result.timestamp}`);}
    else if(cached?.data?.length){
      datasets[key]={...cached,status:'cached',error:'Upstream refresh failed; last published observation retained'};
      console.warn(`${range} ${key} reused prior measurement; ${s.status==='rejected'?s.reason?.message:'empty dataset'}`);
    }else{
      datasets[key]={status:'unavailable',series:[],data:[],timestamp:null,
        source:'Fraunhofer ISE Energy-Charts',error:'No confirmed published measurement'};
      const why=s.status==='rejected'?String(s.reason?.message||s.reason).slice(0,220):'upstream returned no usable measurements';
      datasets[key].error='No confirmed published measurement: '+why;
      console.warn(`${range} ${key}: unavailable; ${why}`);
    }
  });
  // Deliberately no public price data. Optional paid/licensed integration should be separate.
  datasets.day_ahead_price={status:'license_required',data:[],series:[],timestamp:null,
    source:'SEEPEX / authorised market-data feed required',
    error:'Price series disabled on public GitHub Pages preview pending redistribution rights'};
  datasets.actual_load={status:'unavailable',data:[],series:[],timestamp:null,
    source:'EMS / ENTSO-E',error:'Dedicated load feed not configured'};
  const hadData=Object.values(datasets).some(x=>x?.data?.length);
  const publishedAt=good?iso(NOW):(old.server_time||null);
  return {
    mode:'github-pages',period:range,server_time:publishedAt,
    published_at:iso(NOW),refresh_interval_seconds:900,
    status:good===endpoints.length?'observed':hadData?'partial':'unavailable',
    datasets,
    attribution:'Data © Fraunhofer ISE Energy-Charts; see source licensing. Public sample, not TE-TO telemetry.',
    legal:'Market price redistribution is intentionally disabled; no licensed values embedded in public JSON.'
  };
}
await fs.mkdir(OUT,{recursive:true});
const summary=[];
for(const [range,days] of Object.entries(RANGES)){
  const result=await collect(range,days);
  const dest=path.join(OUT,range+'.json');
  const temp=dest+'.tmp';
  await fs.writeFile(temp,JSON.stringify(result,null,2)+'\n','utf8');await fs.rename(temp,dest);
  summary.push({range,status:result.status,updated:result.server_time,counts:Object.fromEntries(Object.entries(result.datasets).map(([k,v])=>[k,v.data?.length||0]))});
}
console.log(JSON.stringify(summary,null,2));
