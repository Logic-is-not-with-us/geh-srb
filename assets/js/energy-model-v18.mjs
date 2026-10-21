/** GEH V18 energy truth contract. Shared by the Node ingest and browser contract tests.
 * No UI heuristics: downstream apps display only normalized, validated results.
 */
export const SCHEMA_VERSION='18.0.0';
export const BORDERS=['HU','RO','BG','MK','XK','ME','BA','HR'];
export const FUELS=['coal','gas','hydro','wind','solar','bio','other'];
const REN=new Set(['hydro','wind','solar','bio']);
const REFRESH_LIMITS={production:6*3600000,physical_flows:8*3600000,commercial_exchange:8*3600000,actual_load:8*3600000,load_forecast:36*3600000,day_ahead_price:36*3600000};
const validTime = x => typeof x==='string'&&Number.isFinite(Date.parse(x));
const validNum = x => typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<1e10;
export function toMW(value,unit){
 if(!validNum(value))return null;
 switch(String(unit||'').toUpperCase().trim()){case 'MW':return value;case 'GW':return value*1000;case 'KW':return value/1000;default:return null}
}
export function fuelFromId(id){
 const s=String(id||'').toLowerCase();
 if(/total|sum|share|percent|capacity|forecast|load|demand|price|balance|import|export|storage_consumption/.test(s))return null;
 if(/pumped_storage|pumped_hydro|pumping/.test(s))return null; // output is not primary energy technology in this model
 if(/biogas|biomass|bioenergy|renewable_waste|geothermal/.test(s))return 'bio';
 if(/gas/.test(s))return 'gas';
 if(/coal|lignite/.test(s))return 'coal';
 if(/hydro|run_of_river|water/.test(s))return 'hydro';
 if(/wind/.test(s))return 'wind';
 if(/solar|photovoltaic/.test(s))return 'solar';
 if(/oil|fossil|peat|nuclear|other|waste/.test(s))return 'other';
 return null;
}
const BORDER_TOKENS={HU:['hu','hungary','magyar'],RO:['ro','romania'],BG:['bg','bulgaria'],MK:['mk','north macedonia','macedonia'],XK:['xk','ks','kosovo'],ME:['me','montenegro'],BA:['ba','bih','bosnia','herzegovina'],HR:['hr','croatia']};
export function borderFromId(id,name=''){
 const text=String(id+' '+name).toLowerCase().replace(/[_/:>.<()\[\],;\-]+/g,' ').replace(/\s+/g,' ').trim();
 const words=' '+text+' ';
 for(const [code,terms] of Object.entries(BORDER_TOKENS))if(terms.some(x=>words.includes(' '+x+' ')))return code;
 return null;
}
function descriptor(ds){return new Map((ds?.series||[]).filter(x=>x?.id).map(x=>[x.id,x]))}
function records(ds,now,forecast=false){
 const limit=Date.parse(now),seen=new Set(),out=[];
 for(const row of ds?.data||[]){
  if(!validTime(row?.timestamp))continue;
  const t=Date.parse(row.timestamp);
  if(!forecast&&t>limit+5*60000)continue; // future slots are not measurements
  if(seen.has(t))continue; seen.add(t);
  out.push({t,iso:new Date(t).toISOString(),values:row.values||{}});
 }
 return out.sort((a,b)=>a.t-b.t).slice(-4000);
}
function baseStatus(ds,kind,now,last){
 const age=last?Date.parse(now)-Date.parse(last):null;
 const count=(ds?.data||[]).length;
 const kindState=ds?.status||'unavailable';
 let quality=count?'observed':'unavailable';
 if(kindState==='license_required')quality='license_required';
 else if(kindState==='not_configured')quality='not_configured';
 else if(kindState==='demo')quality='demo';
 else if(count && (kindState==='cached'||kindState==='cached_derived'))quality=age>REFRESH_LIMITS[kind]*3?'stale':'cached';
 else if(count && age>REFRESH_LIMITS[kind]*3)quality='stale';
 else if(count && age>REFRESH_LIMITS[kind])quality='delayed';
 const checked=validTime(ds?.retrieved_at)?ds.retrieved_at:null;
 return {schema_version:SCHEMA_VERSION,id:kind,feed_id:kind,quality,source:ds?.source||null,url:/^https:\/\//.test(ds?.url||'')?ds.url:null,unit:ds?.unit||null,observed_at:last||null,retrieved_at:checked,published_at:validTime(ds?.generated_at)?ds.generated_at:null,age_ms:age,stale_after_ms:REFRESH_LIMITS[kind],records:count,source_state:kindState,reason:ds?.error||null,license:ds?.license||null,license_status:kind==='day_ahead_price'?'unverified_for_public_redistribution':'verify_upstream_conditions',is_derived:false};
}
function production(ds,now){
 const meta=descriptor(ds),points=[],unknown=new Set(),invalid=new Set();
 for(const r of records(ds,now)){
  const buckets=Object.fromEntries(FUELS.map(k=>[k,null]));let total=0,classified=0;
  for(const [id,n] of Object.entries(r.values)){
   if(!validNum(n))continue;
   const unit=meta.get(id)?.unit||ds.unit, mw=toMW(n,unit);
   if(mw===null){invalid.add(id+' ('+String(unit)+')');continue}
   const fuel=fuelFromId(id);
   if(!fuel){unknown.add(id);continue}
   if(mw<0){invalid.add(id+' (negative)');continue}
   buckets[fuel]=(buckets[fuel]??0)+mw;total+=mw;classified++;
  }
  if(!classified)continue;
  const ren=FUELS.filter(k=>REN.has(k)&&buckets[k]!==null).reduce((s,k)=>s+buckets[k],0);
  points.push({t:r.t,iso:r.iso,total:Number(total.toFixed(4)),renewables:ren,
   renewable_share:total>0?Number((ren*100/total).toFixed(3)):null,buckets,
   categories_covered:FUELS.filter(k=>buckets[k]!==null).length});
 }
 return {points,unknown_ids:[...unknown],invalid_units:[...invalid],caveat:'Calculated only from reported technology series, not independently verified national generation.'};
}
function flow(ds,now){
 const meta=descriptor(ds),points=[],unmapped=new Set(),conflicts=new Set(),badUnits=new Set();
 for(const r of records(ds,now)){
  const edges={},ids={};let sum=null,sourceSum=false;
  for(const [id,n] of Object.entries(r.values)){
   if(!validNum(n))continue;
   const unit=meta.get(id)?.unit||ds.unit,mw=toMW(n,unit);
   if(mw===null){badUnits.add(id+':'+String(unit));continue}
   if(/^(sum|net|net_import|net_imports|net_physical_flow|total)$/i.test(id)){
    if(sourceSum){sum=null;conflicts.add('duplicate source total');}else{sum=mw;sourceSum=true;} continue;
   }
   const code=borderFromId(id,meta.get(id)?.name||'');
   if(!code){unmapped.add(id);continue}
   if(code in edges){edges[code]=null;conflicts.add(code);ids[code].push(id)}
   else{edges[code]=mw;ids[code]=[id]}
  }
  const coverage=BORDERS.filter(k=>Number.isFinite(edges[k])).length;
  // Only publish an aggregate when the source explicitly provides it, or coverage is complete & nonambiguous.
  const net=sourceSum&&Number.isFinite(sum)?sum:coverage===BORDERS.length?BORDERS.reduce((s,k)=>s+edges[k],0):null;
  points.push({t:r.t,iso:r.iso,edges,net,coverage,total_borders:BORDERS.length,ambiguous:Object.keys(ids).filter(k=>ids[k].length>1)});
 }
 return {points,unmapped_ids:[...unmapped],conflicts:[...conflicts],invalid_units:[...badUnits],direction:'positive = import to Serbia, negative = export from Serbia; based on Energy-Charts published cbpf/cbet sign convention',caveat:'Physical and commercial series represent different phenomena; no inference of plant-level movement.'};
}
function scalar(ds,now,forecast=false){
 const meta=descriptor(ds),points=[];
 for(const r of records(ds,now,forecast)){
  const keys=Object.keys(r.values);
  const id=keys.find(k=>/(^actual_load$|^day_ahead_load_forecast$|^price$)/.test(k))|| (keys.length===1?keys[0]:null);
  if(!id)continue;
  const unit=meta.get(id)?.unit||ds.unit;
  const val=/(price)/.test(id)?(unit==='EUR/MWh'&&validNum(r.values[id])?r.values[id]:null):toMW(r.values[id],unit);
  if(val!==null)points.push({t:r.t,iso:r.iso,value:val});
 }
 return {points};
}
/** Read-only normalized contract; safe for already-stored v15.2 data in both Node and browser. */
export function normalizeSnapshot(snapshot,{now=new Date().toISOString()}={}){
 if(!validTime(now))throw Error('Invalid normalization time');
 const datasets=snapshot?.datasets||{};const sources={},data={},warnings=[];
 for(const id of ['production','physical_flows','commercial_exchange','actual_load','load_forecast','day_ahead_price']){
  const ds=datasets[id],obs=id==='production'?production(ds,now):id==='physical_flows'||id==='commercial_exchange'?flow(ds,now):scalar(ds,now,id==='load_forecast');
  data[id]=obs;
  const last=obs.points.at(-1)?.iso||null;
  sources[id]=baseStatus(ds,id,now,last);
  if(obs.unknown_ids?.length)warnings.push(id+':unclassified '+obs.unknown_ids.join(','));
  if(obs.invalid_units?.length)warnings.push(id+':unit rejected '+obs.invalid_units.join(','));
  if(obs.conflicts?.length)warnings.push(id+':ambiguous '+obs.conflicts.join(','));
  if(obs.unmapped_ids?.length)warnings.push(id+':unmapped borders '+obs.unmapped_ids.join(','));
 }
 return {schema_version:SCHEMA_VERSION,mode:snapshot?.mode||'unknown',period:snapshot?.period||null,
  evaluated_at:now,published_at:snapshot?.published_at||null,sources,data,warnings,
  methodological_note:'Source-specific observed intervals; no aligned national supply-demand balance is calculated. Missing readings are not zero.',
  licensing:'Day-ahead price unavailable for public distribution until an appropriate license is confirmed.'};
}
