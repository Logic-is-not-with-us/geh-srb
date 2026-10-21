/* GEH V15.2 — deterministic energy transformations. Node built-ins only. */
export const isValid = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e11;
export const MAX_BYTES = 6_000_000;
const chartsURL = 'https://api.energy-charts.info/';
export function cleanEnergy(raw, now = new Date()) {
  if (!raw || !Array.isArray(raw.series) || !Array.isArray(raw.data) || raw.data.length > 8000) throw Error('Unexpected Energy-Charts v2 shape');
  const series = raw.series.filter(s => s && typeof s.id === 'string').slice(0, 120).map(s => ({
    id: s.id.slice(0,96), name: String(s.name || s.id).slice(0,160), unit: String(s.unit || raw.unit || '').slice(0,20)
  }));
  const ids = new Set(series.map(s => s.id));
  const data = [];
  for (const row of raw.data) {
    if (!row || !Number.isFinite(Date.parse(row.timestamp))) continue;
    const values = {};
    for (const [key, val] of Object.entries(row.values || {})) if (ids.has(key) && isValid(val)) values[key] = val;
    if (Object.keys(values).length) data.push({timestamp:String(row.timestamp).slice(0,55),values});
  }
  data.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
  return {
    source:'Fraunhofer ISE Energy-Charts',url:chartsURL,
    series,data, unit:String(raw.unit || '').slice(0,24),
    timestamp:data.at(-1)?.timestamp||null,generated_at:raw.generated_at || null,
    available_until:raw.available_until || null,timezone:raw.timezone || null,
    interval_minutes:raw.interval_minutes || null,
    license:raw.license || 'Check upstream source-specific license',
    retrieved_at:now.toISOString(),status:data.length?'observed':'unavailable',kind:'observed'
  };
}
export function classifyFuel(id) {
  const s=String(id).toLowerCase();
  if (/share|percent|total|sum|capacity|forecast|load|demand|price|balance|import|export|storage_consumption/.test(s))return null;
  if (/pumped_storage|pumped_hydro/.test(s))return 'storage';
  if (/biogas/.test(s))return 'biomass'; if (/gas/.test(s))return 'gas';
  if (/coal|lignite/.test(s))return 'coal';
  if (/hydro|water|run_of_river/.test(s))return 'hydro';
  if (/wind/.test(s))return 'wind';
  if (/solar|photovoltaic/.test(s))return 'solar';
  if (/biomass|bioenergy|geothermal|renewable_waste/.test(s))return 'biomass';
  if (/oil|fossil|peat|nuclear|other|waste/.test(s))return 'other';
  return null;
}
const renewable = new Set(['hydro','wind','solar','biomass']);
const meta = {reported_generation:['Reported technology generation','MW'],reported_renewable_power:['Reported renewable production','MW'],reported_renewable_share:['Renewable share of reported production','%'],reported_gas:['Reported gas production','MW'],reported_coal:['Reported coal production','MW'],reported_hydro:['Reported hydro production','MW'],reported_wind:['Reported wind production','MW'],reported_solar:['Reported solar production','MW'],reported_biomass:['Reported biomass production','MW']};
export function derivedFromProduction(prod) {
  const result={};
  const seriesUnits=new Map((prod?.series || []).map(x=>[x.id,x.unit || prod.unit || 'MW']));
  const bucket={};
  for(const [id,[name,unit]] of Object.entries(meta))bucket[id]={series:[{id,name,unit}],data:[]};
  for(const row of prod?.data || []) {
    const fuels=new Map();
    for(const [id,value] of Object.entries(row.values || {})) {
      const fuel=classifyFuel(id),unit=String(seriesUnits.get(id) || '').toLowerCase();
      if(!fuel || fuel === 'storage' || !isValid(value) || value<0)continue;
      // Never quietly interpret non-power metrics as MW.
      if (!['mw','gw','kw'].includes(unit))continue;
      const mw=unit==='gw'?value*1000:unit==='kw'?value/1000:value;
      fuels.set(fuel,(fuels.get(fuel)||0)+mw);
    }
    if(!fuels.size) continue;
    const total=[...fuels.values()].reduce((a,b)=>a+b,0);
    const ren=[...fuels].filter(([k])=>renewable.has(k)).reduce((a,[,v])=>a+v,0);
    const write=(id,value)=>{if(isValid(value))bucket[id].data.push({timestamp:row.timestamp,values:{[id]:Number(value.toFixed(5))}})};
    write('reported_generation',total);
    if ([...fuels.keys()].some(k=>renewable.has(k))) {
      write('reported_renewable_power',ren);
      if(total>0)write('reported_renewable_share',100*ren/total);
    }
    for(const [key,val] of fuels)if(bucket['reported_'+key])write('reported_'+key,val);
  }
  for(const [id,v] of Object.entries(bucket)) {
    if(!v.data.length)continue; // no fictitious zero for missing fuels
    const stamp=v.data.at(-1).timestamp;
    result[id]={...v,unit:v.series[0].unit,timestamp:stamp,status:prod.status==='cached'?'cached_derived':'derived',
      kind:'derived',source:'Calculated from reported Energy-Charts production series',
      url:chartsURL,license:prod.license,derived_from:['production'],
      caveat:'Subset of published technology series, NOT independently validated national generation or renewable share.'};
  }
  return result;
}
const val=(xml,tag)=>{const m=new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>').exec(xml);return m?.[1]?.trim()||null};
export function parseEntsoeLoad(xml, kind, now=new Date()){
  if(typeof xml!=='string'||xml.length>MAX_BYTES)throw Error('ENTSO-E XML invalid or too large');
  // Strip optional XML namespace prefixes from element names, not text content.
  const clean=xml.replace(/(<\/?)[\w.-]+:/g,'$1');
  if(/<Acknowledgement_MarketDocument\b/.test(clean) || /<Reason\b/.test(clean) && !/<TimeSeries\b/.test(clean))throw Error('ENTSO-E returned acknowledgement / no data');
  const seen=new Map();
  for(const series of clean.matchAll(/<TimeSeries(?:\s[^>]*)?>([\s\S]*?)<\/TimeSeries>/g)){
    for(const p of series[1].matchAll(/<Period(?:\s[^>]*)?>([\s\S]*?)<\/Period>/g)){
      const body=p[1], start=val(val(body,'timeInterval')||'','start'), resolution=val(body,'resolution');
      const match=/^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(resolution||'');
      const step=match?(Number(match[1]||0)*60+Number(match[2]||0))*60_000:0;
      if(!start||!Number.isFinite(Date.parse(start))||step<60_000||step>86400_000)continue;
      for(const point of body.matchAll(/<Point(?:\s[^>]*)?>([\s\S]*?)<\/Point>/g)){
        const position=Number(val(point[1],'position')),q=Number(val(point[1],'quantity'));
        if(!Number.isInteger(position)||position<1||position>2000 || !Number.isFinite(q)||q<0||q>1e8)continue;
        const time=new Date(Date.parse(start)+(position-1)*step).toISOString();
        if(seen.has(time)&&seen.get(time)!==q)throw Error('ENTSO-E overlapping contradictory TimeSeries at '+time);
        seen.set(time,q);
      }
    }
  }
  const id=kind==='actual_load'?'actual_load':'day_ahead_load_forecast';
  const data=[...seen].sort((a,b)=>a[0].localeCompare(b[0])).map(([timestamp,q])=>({timestamp,values:{[id]:q}}));
  return {kind:'observed',source:'ENTSO-E Transparency Platform',url:'https://transparency.entsoe.eu/',
    unit:'MW',series:[{id,name:kind==='actual_load'?'Actual total load':'Day-ahead total load forecast',unit:'MW'}],
    data,timestamp:data.at(-1)?.timestamp||null,retrieved_at:now.toISOString(),status:data.length?'observed':'unavailable',
    caveat:'Total system load / forecast reported for Serbia bidding zone, subject to publisher delays and usage terms.'};
}
