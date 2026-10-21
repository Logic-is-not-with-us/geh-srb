/** BLUE CURRENT V18: UI is a read-only consumer of energy-model-v18 normalization.
 * No units, fuel categories or border parsing is implemented here.
 */
import {SCHEMA_VERSION,BORDERS,FUELS} from './energy-model-v18.mjs';
const $=id=>document.getElementById(id), $$=selector=>Array.from(document.querySelectorAll(selector));
const T=JSON.parse($('ei-i18n').textContent),LANG=document.body.dataset.lang;
const locale={en:'en-GB',ru:'ru-RU','sr-lat':'sr-RS','sr-cyr':'sr-RS'}[LANG]||'sr-RS';
const localTime=iso=>iso&&Number.isFinite(Date.parse(iso))?new Intl.DateTimeFormat(locale,{timeZone:'Europe/Belgrade',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso)):T.no_data;
const num=(x,dec=0)=>Number.isFinite(x)?new Intl.NumberFormat(locale,{maximumFractionDigits:dec}).format(x):T.no_data;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={production:T.generation,physical_flows:T.physical,commercial_exchange:T.commercial,actual_load:T.load,load_forecast:T.forecast,day_ahead_price:T.market};
const fuelLabel=k=>T.fuel_names[FUELS.indexOf(k)]||k;
const borderLabel=k=>T.countries[BORDERS.indexOf(k)]||k;
const state={active:'intro',range:'24h',periods:{},norm:null,fuel:'coal',border:'HU',mode:'physical',flowIndex:null,gridIndex:null,analysis:'production',stage:0,cutaway:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,demo:new URLSearchParams(location.search).get('demo')==='1',playing:false,tour:false,interval:null,tourInterval:null,busy:false,error:false};
const toast=s=>{const el=$('ei-toast');el.textContent=s;el.classList.add('is-visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('is-visible'),3500)};
const sources=()=>state.norm?.sources||{},data=()=>state.norm?.data||{};
const points=id=>data()[id]?.points||[];
const source=id=>sources()[id]||{};
const current=(id,idx)=>{const rows=points(id);return rows.length?rows[idx==null?rows.length-1:Math.min(rows.length-1,Math.max(0,idx))]:null};
function statusText(q){return T[q]||T.unavailable}
function isActiveQuality(q){return ['observed','demo'].includes(q)}
function smallStatus(q){return statusText(q)+(state.error?' / '+T.cached:'')}
function setTxt(id,val){const node=$(id);if(node)node.textContent=val}
function stopPlayback(){if(state.interval)clearInterval(state.interval);state.interval=null;state.playing=false;setTxt('ei-grid-play','▶ '+T.play)}
function stopTour(){if(state.tourInterval)clearInterval(state.tourInterval);state.tourInterval=null;state.tour=false;setTxt('ei-plant-tour','▶ '+T.tour)}
function activateTab(name,{focus=false,history=true}={}){
 if(!['intro','flow','grid','analysis','plant','sources'].includes(name))return;
 if(name!==state.active){stopPlayback();stopTour()}
 state.active=name;
 $$('[data-tab]').forEach(el=>{const active=el.dataset.tab===name;el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;if(active&&focus)el.focus({preventScroll:true})});
 $$('.ei-pane').forEach(el=>{el.hidden=el.id!=='pane-'+name});
 if(history)window.history.replaceState(null,'','#'+name);
 const video=$('ei-hero-video');if(name!=='intro')video.pause();else if(state.motion&&!document.hidden)video.play().catch(()=>{});
 setTxt('ei-film-toggle',video.paused?T.playvideo:T.pausevideo);
 if(name==='flow')renderFlow();else if(name==='grid')renderGrid();else if(name==='analysis')renderAnalysis();else if(name==='sources')renderSources();else if(name==='plant')renderPlant();
}
function setMotion(on){state.motion=Boolean(on);document.body.classList.toggle('ei-motion-off',!state.motion);const el=$('ei-motion');el.setAttribute('aria-pressed',String(state.motion));el.textContent=(state.motion?'✦ '+T.motion:'○ '+T.motion_off);if(!on){stopPlayback();stopTour();$('ei-hero-video').pause()}else if(state.active==='intro')$('ei-hero-video').play().catch(()=>{});renderFlow();renderGrid();renderPlant()}
async function fetchPeriod(range){
 if(state.busy)return;state.busy=true;
 try{
  let norm=state.periods[range];
  if(!norm){
   const file=(state.demo?'demo-':'')+range+'.json';
   // The assets/js path is one level deeper than language page; resolve relative to page, not module.
   const target=new URL('../data/energy/'+file,window.location.href);
   const response=await fetch(target.href+'?v18='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();
   if(!json.v18||json.v18.schema_version!==SCHEMA_VERSION)throw Error('V18 schema not published yet');
   norm=json.v18;state.periods[range]=norm;
  }
  state.range=range;state.norm=norm;state.error=false;state.flowIndex=null;state.gridIndex=null;
  $$('[data-range]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.range===range)));
  renderAll();
 }catch(error){
  console.warn('GEH V18 dataset loading:',error);
  state.error=true;
  if(!state.norm)state.norm={schema_version:SCHEMA_VERSION,sources:{},data:{}};
  renderAll();toast(T.cached+': '+error.message);
 }finally{state.busy=false}
}
function renderAll(){renderFlow();renderGrid();renderAnalysis();renderSources();renderPlant()}
const CHART_COLORS=['#57d7fb','#f0c081','#91e7cb','#a3bff3','#e99b94'];
function chart(container,series,{unit='MW',label='History',height=210}={}){
 const node=$(container);if(!node)return;
 const usable=series.filter(s=>s.points?.some(p=>Number.isFinite(p.v)&&Number.isFinite(p.t)));
 if(!usable.length){node.innerHTML='<div class="ei-chart-empty">'+esc(T.no_data)+'</div>';node.setAttribute('aria-label',T.no_data);return}
 const all=usable.flatMap(s=>s.points.filter(p=>Number.isFinite(p.v)&&Number.isFinite(p.t)));
 const minTime=Math.min(...all.map(p=>p.t)),maxTime=Math.max(...all.map(p=>p.t)),range=Math.max(3600000,maxTime-minTime);
 const vals=all.map(p=>p.v);let lo=Math.min(0,...vals),hi=Math.max(0,...vals);
 if(hi===lo)hi=lo+1;
 const W=660,H=height,L=53,R=18,TOP=19,B=44,xx=t=>L+(t-minTime)/range*(W-L-R),yy=v=>TOP+(hi-v)/(hi-lo)*(H-TOP-B);
 const grid=[];for(let i=0;i<=4;i++){let val=lo+(hi-lo)*i,y=yy(val);grid.push(`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="#26506b" stroke-width=".8"/><text x="${L-8}" y="${y+4}" text-anchor="end" fill="#82aabf" font-size="11">${esc(num(val,Math.abs(hi-lo)<25?1:0))}</text>`)}
 for(const pos of [0,.5,1]){const when=new Date(minTime+range*pos).toISOString();grid.push(`<text x="${xx(Date.parse(when))}" y="${H-9}" fill="#8bb5ca" text-anchor="${pos===0?'start':pos===1?'end':'middle'}" font-size="11">${esc(localTime(when))}</text>`)}
 if(lo<0&&hi>0)grid.push(`<line x1="${L}" x2="${W-R}" y1="${yy(0)}" y2="${yy(0)}" stroke="#91cbda" stroke-opacity=".65" stroke-dasharray="4 4"/>`);
 const curves=usable.map((s,si)=>{
  let d='',prev=null,dt=s.points.map((p,i)=>i&&p.t-s.points[i-1].t).filter(x=>x>0).sort((a,b)=>a-b),interval=dt.length?dt[Math.floor(dt.length/2)]:3600000;
  for(const p of s.points){if(!Number.isFinite(p.v)||!Number.isFinite(p.t)){prev=null;continue}d+=(prev===null||p.t-prev>Math.max(interval*2.5,3600000)?'M':'L')+xx(p.t).toFixed(2)+' '+yy(p.v).toFixed(2)+' ';prev=p.t}
  return `<path fill="none" stroke="${s.color||CHART_COLORS[si%CHART_COLORS.length]}" stroke-width="${si?1.9:2.8}" stroke-linejoin="round" d="${d}"/>`
 }).join('');
 node.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${grid.join('')}<g>${curves}</g></svg><div class="ei-chart-tooltip" hidden></div><details class="ei-chart-table"><summary>${esc(T.details)}</summary><table><thead><tr><th>${esc(T.time)}</th><th>${esc(unit)}</th></tr></thead><tbody>${usable[0].points.filter(p=>Number.isFinite(p.v)).slice(-8).map(p=>`<tr><td>${esc(localTime(p.iso))}</td><td>${esc(num(p.v,1))}</td></tr>`).join('')}</tbody></table></details>`;
 node.setAttribute('aria-label',label+' - '+usable.map(s=>s.name).join(', '));
 const tip=node.querySelector('.ei-chart-tooltip');
 node.onpointermove=e=>{const rect=node.querySelector('svg').getBoundingClientRect();if(!rect.width)return;const part=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));const when=minTime+part*range;const base=usable[0].points.filter(p=>Number.isFinite(p.v)).reduce((a,b)=>Math.abs(b.t-when)<Math.abs(a.t-when)?b:a);tip.textContent=localTime(base.iso)+' | '+usable.map(s=>{const best=s.points.filter(p=>Number.isFinite(p.v)).reduce((a,b)=>!a||Math.abs(b.t-base.t)<Math.abs(a.t-base.t)?b:a,null);return s.name+': '+num(best?.v,1)+' '+unit}).join(' | ');tip.hidden=false;tip.style.left=Math.min(Math.max(5,e.clientX-node.getBoundingClientRect().left+10),Math.max(5,node.clientWidth-190))+'px';tip.style.top='12px'};
 node.onpointerleave=()=>tip.hidden=true;
}
function flowPt(row,k){return row&&Number.isFinite(row.buckets?.[k])?row.buckets[k]:null}
function renderFlow(){
 const rows=points('production'),selected=current('production',state.flowIndex),q=source('production').quality;
 setTxt('ei-flow-quality',smallStatus(q));setTxt('ei-flow-time',T.time+': '+localTime(selected?.iso));
 const coreValue=selected?.total;setTxt('ei-flow-core',Number.isFinite(coreValue)?num(coreValue):'n/d');
 const rays=$('ei-rays');let paths='';const palette=['#c8a58d','#f3c184','#58bfff','#86e4c7','#f8de84','#93c980','#aaaad6'];
 for(let i=0;i<FUELS.length;i++){
  const kind=FUELS[i],v=flowPt(selected,kind),total=selected?.total||0,share=v!==null&&total>0?v/total:0;
  const y=35+i*54.5,path=`M145 ${y.toFixed(1)} C260 ${y.toFixed(1)} 308 200 455 200`,sel=state.fuel===kind,known=v!==null;
  const thick=known?Math.min(20,Math.max(v===0?1:3,3+share*25)):1;
  paths+=`<text class="ei-flow-fan-index" x="15" y="${(y-3).toFixed(1)}">0${i+1}</text><text class="ei-flow-fan-name" x="39" y="${(y+4).toFixed(1)}">${esc(fuelLabel(kind))}</text>`;
  paths+=`<path class="ei-fan-blur" d="${path}" stroke="${palette[i]}" stroke-width="${thick+8}" opacity="${known?(sel?.28:.07):0}"/>`;
  paths+=`<path class="ei-fan-track ${known?'':'ei-ray-missing'}" d="${path}" stroke="${palette[i]}" stroke-width="${thick}" opacity="${known?(sel?1:.55):.19}"/>`;
  if(known && state.motion && isActiveQuality(q) && v>0)paths+=`<circle r="${sel?4:2.4}" class="ei-ray-dot"><animateMotion dur="${sel?'2.7s':'4.5s'}" repeatCount="indefinite" path="${path}"/></circle>`;
 }
 rays.innerHTML=paths;
 $$('[data-fuel]').forEach(el=>{const k=el.dataset.fuel;el.setAttribute('aria-pressed',String(k===state.fuel));setTxt('unused-'+k,'');const r=flowPt(selected,k);el.querySelector('strong').textContent=r===null?'n/d':num(r)+' MW'});
 setTxt('ei-flow-title',fuelLabel(state.fuel));const v=flowPt(selected,state.fuel);setTxt('ei-flow-value',v===null?'n/d':num(v,1));
 setTxt('ei-flow-share',v!==null&&selected?.total>0?num(v*100/selected.total,1)+' %':T.no_data);
 setTxt('ei-flow-note',v===null?T.no_data:T.renew+': '+(selected.renewable_share==null?T.no_data:num(selected.renewable_share,1)+' %'));
 const series=[{name:fuelLabel(state.fuel),color:'#5cddff',points:rows.map(r=>({t:r.t,iso:r.iso,v:flowPt(r,state.fuel)}))}];chart('ei-flow-chart',series,{label:T.trend+' - '+fuelLabel(state.fuel)});
 const slider=$('ei-flow-slider');slider.disabled=rows.length<2;slider.max=Math.max(0,rows.length-1);slider.value=state.flowIndex??Math.max(rows.length-1,0);
 setTxt('ei-flow-clock',localTime(selected?.iso));
}
function mapDataset(){return state.mode==='physical'?'physical_flows':'commercial_exchange'}
function flowMeaning(v){return v>0?T.inbound:v<0?T.outbound:T.zero}
function renderGrid(){
 const id=mapDataset(),rows=points(id),row=current(id,state.gridIndex),b=row?.edges||{},q=source(id).quality;
 setTxt('ei-grid-quality',smallStatus(q));setTxt('ei-grid-type',labels[id]);setTxt('ei-grid-count',(row?.coverage||0)+' / 8 '+T.coverage);
 for(const code of BORDERS){
  const v=b[code];const val=Number.isFinite(v)?num(v,1)+' MW':'n/d';
  setTxt('unused-border-'+code,'');const span=document.querySelector(`[data-border-value="${code}"]`);if(span)span.textContent=val;
  const button=document.querySelector(`[data-border="${code}"]`);button?.setAttribute('aria-pressed',String(state.border===code));
  const region=document.querySelector(`[data-country="${code}"]`);region?.classList.toggle('is-highlight',state.border===code);
  const marker=document.querySelector(`[data-map-marker="${code}"]`);marker?.classList.toggle('is-current',state.border===code);
  const path=document.querySelector(`[data-map-link="${code}"]`);
  if(path){path.classList.remove('is-import','is-export','is-current','is-missing');path.classList.add(Number.isFinite(v)?v>0?'is-import':v<0?'is-export':'is-missing':'is-missing');path.classList.toggle('is-current',state.border===code&&Number.isFinite(v));path.style.strokeDasharray=state.motion&&isActiveQuality(q)&&Number.isFinite(v)&&v!==0?'8 8':'';path.style.animation=state.motion&&isActiveQuality(q)&&Number.isFinite(v)&&v!==0?'ei-dash 2.6s linear infinite':'';path.style.animationDirection=v>0?'reverse':'normal';}
 }
 const chosen=b[state.border];setTxt('ei-border-name',borderLabel(state.border));setTxt('ei-border-reading',Number.isFinite(chosen)?num(chosen,1):'n/d');
 setTxt('ei-border-direction',Number.isFinite(chosen)?flowMeaning(chosen)+' | '+T.src_time+': '+localTime(row?.iso):T.no_data);
 chart('ei-grid-chart',[{name:borderLabel(state.border),color:'#75dafa',points:rows.map(r=>({t:r.t,iso:r.iso,v:r.edges?.[state.border]??null}))}],{label:labels[id]+' - '+borderLabel(state.border),height:190});
 const slider=$('ei-grid-slider');slider.max=Math.max(0,rows.length-1);slider.value=state.gridIndex??Math.max(0,rows.length-1);slider.disabled=rows.length<2;setTxt('ei-grid-clock',localTime(row?.iso));
}
function sourcePoint(id){return current(id,null)}
function renderAnalysis(){
 const totals=sourcePoint('production'),physical=sourcePoint('physical_flows'),trade=sourcePoint('commercial_exchange');
 const pct=totals?.renewable_share;
 const items=[{label:T.generation,v:totals?.total,unit:'MW',key:'production'}, {label:T.renew,v:pct,unit:'%',key:'production'}, {label:T.physical,v:physical?.net,unit:'MW',key:'physical_flows'}, {label:T.commercial,v:trade?.net,unit:'MW',key:'commercial_exchange'}];
 $('ei-metrics').innerHTML=items.map(x=>`<article class="ei-metric"><small>${esc(x.label)}</small><strong>${Number.isFinite(x.v)?esc(num(x.v,x.unit==='%'?1:0)):'n/d'} <span style="font-size:.38em;color:#82b9d1">${esc(x.unit)}</span></strong><p>${esc(localTime(sourcePoint(x.key)?.iso))} / ${esc(statusText(source(x.key).quality))}</p></article>`).join('');
 const keys=['production','physical_flows','commercial_exchange','actual_load','load_forecast','day_ahead_price'];
 $('ei-analysis-options').innerHTML=keys.map(k=>`<button data-analysis="${k}" aria-pressed="${state.analysis===k}">${esc(labels[k])}</button>`).join('');
 const id=state.analysis,ds=data()[id],q=source(id),rows=ds?.points||[];
 setTxt('ei-analysis-quality',smallStatus(q.quality));setTxt('ei-analysis-name',labels[id]);
 const val=r=>id==='production'?r.total:id==='physical_flows'||id==='commercial_exchange'?r.net:r.value;
 const unit=id==='day_ahead_price'?'EUR/MWh':'MW';chart('ei-analysis-chart',[{name:labels[id],points:rows.map(r=>({t:r.t,iso:r.iso,v:val(r)})),color:'#56d5ff'}],{unit,label:labels[id],height:320});
 const p=rows.at(-1);
 $('ei-analysis-detail').innerHTML=`<dl><dt>${esc(T.src_time)}</dt><dd>${esc(localTime(p?.iso))}</dd><dt>${esc(T.selected)}</dt><dd>${esc(p&&Number.isFinite(val(p))?num(val(p),1)+' '+unit:T.no_data)}</dd><dt>Status</dt><dd>${esc(statusText(q.quality))}</dd><dt>${esc(T.coverage)}</dt><dd>${esc(p&&p.coverage!==undefined?p.coverage+' / 8':rows.length+' intervals')}</dd></dl><p>${esc(id==='production'?data().production?.caveat: id==='physical_flows'||id==='commercial_exchange'?data()[id]?.caveat:T.no_data)}</p>`;
}
function renderSources(){const S=sources();const ids=['production','physical_flows','commercial_exchange','actual_load','load_forecast','day_ahead_price'];
 const available=ids.filter(k=>['observed','delayed','cached','stale'].includes(S[k]?.quality)).length;
 setTxt('ei-feed-summary',available+' / '+ids.length+' '+T.feed_count+' | '+T.derived+'. '+(state.demo?'DEMO / SYNTHETIC DATA':'PUBLIC DATA / OBSERVATION-LEVEL FRESHNESS'));
 $('ei-source-list').innerHTML=ids.map(id=>{const x=S[id]||{};return `<article class="ei-source-card" data-quality="${esc(x.quality||'unavailable')}"><h3>${esc(labels[id])}</h3><span class="status">${esc(statusText(x.quality))}</span><dl><dt>${esc(T.src_time)}</dt><dd>${esc(localTime(x.observed_at))}</dd><dt>Retrieved</dt><dd>${esc(localTime(x.retrieved_at))}</dd><dt>Records</dt><dd>${esc(x.records||0)}</dd><dt>Feed</dt><dd>${esc(x.source||T.unavailable)}</dd></dl>${x.reason?`<p>${esc(x.reason)}</p>`:''}<p>${esc(x.license||'')}</p>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(T.open_source)} ↗</a>`:''}</article>`}).join('');
 const warnings=state.norm?.warnings||[];
 $('ei-method-text').innerHTML=`<p>${esc(state.norm?.methodological_note||T.no_data)}</p><p>${esc(state.norm?.licensing||'')}</p>${warnings.length?`<details><summary>DATA QA (${warnings.length})</summary><ul>${warnings.slice(0,40).map(w=>`<li>${esc(w)}</li>`).join('')}</ul></details>`:''}`;
}
const ZOOMS=[[0,0,820,570],[55,125,405,360],[260,155,365,315],[435,100,375,390],[445,135,375,345]];
let zoomFrame=null;
function updateSVG(box,animate){const svg=document.querySelector('.ei-plant-svg');if(!svg)return;
 if(zoomFrame)cancelAnimationFrame(zoomFrame);
 const from=svg.viewBox.baseVal;const begin=[from.x,from.y,from.width,from.height];
 const target=box,duration=animate?650:0;let start=null;
 function frame(now){if(start===null)start=now;const fraction=duration?Math.min(1,(now-start)/duration):1;const e=fraction*fraction*(3-2*fraction);const out=begin.map((v,i)=>v+(target[i]-v)*e);svg.setAttribute('viewBox',out.join(' '));if(fraction<1)zoomFrame=requestAnimationFrame(frame)}
 zoomFrame=requestAnimationFrame(frame);
}
function renderPlant(){const s=state.stage;
 $$('[data-stage]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.stage)===s)));
 setTxt('ei-stage-title',T.stage_names[s]);setTxt('ei-stage-text',T.stage_texts[s]);setTxt('ei-stage-index',String(s+1).padStart(2,'0')+' / 05');setTxt('ei-stage-number',String(s+1).padStart(2,'0'));
 $('ei-cutaway').setAttribute('aria-pressed',String(state.cutaway));$('ei-cutaway').textContent=state.cutaway?T.shell:T.cutaway;
 document.querySelector('.ei-machine').classList.toggle('is-cutaway',state.cutaway);
 document.querySelector('.ei-machine').classList.toggle('stage-focus',s!==0);
 updateSVG(ZOOMS[s],state.motion && state.active==='plant');
}
function exportCSV(){if(!state.norm||state.demo){toast(T.demo+' / '+T.no_data);return}
 const norm=state.norm,lines=[['dataset','observation_time_iso','series','value','unit','status','source','retrieved_at','origin'].join(',')];
 const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s)&&!/^[-]?\d+(\.\d+)?$/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 for(const [id,ds] of Object.entries(norm.data||{}))for(const row of ds.points||[]){
  const values=id==='production'?{reported_total:row.total,...row.buckets}:id==='physical_flows'||id==='commercial_exchange'?{source_net:row.net,...row.edges}:{value:row.value};
  for(const [key,v] of Object.entries(values)){if(!Number.isFinite(v))continue;const unit=id==='day_ahead_price'?'EUR/MWh':'MW';const origin=norm.sources[id]?.source||'';lines.push([id,row.iso,key,v,unit,norm.sources[id]?.quality||'',origin,norm.sources[id]?.retrieved_at||'', 'published-or-derived'].map(cell).join(','))}
 }
 const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`geh-energy-v18-${state.range}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
}
function stepAdvance(kind,dir){
 if(kind==='plant'){stopTour();state.stage=Math.max(0,Math.min(4,state.stage+dir));renderPlant();return}
 const id=kind==='flow'?'production':mapDataset(),rows=points(id);if(!rows.length)return;
 const key=kind==='flow'?'flowIndex':'gridIndex';state[key]=Math.max(0,Math.min(rows.length-1,(state[key]??rows.length-1)+dir));
 if(kind==='flow')renderFlow();else renderGrid();
}
function wire(){
 $('ei-lang').value=LANG;$('ei-lang').addEventListener('change',e=>{const target=e.target.value;if(['sr-lat','sr-cyr','en','ru'].includes(target))location.href='../'+target+'/energetski-monitor.html'+location.search+location.hash});
 document.querySelector('.ei-menu').addEventListener('click',e=>{const nav=$('ei-site-nav'),open=nav.classList.toggle('is-open');e.currentTarget.setAttribute('aria-expanded',String(open))});
 $$('[data-tab]').forEach(b=>b.addEventListener('click',()=>activateTab(b.dataset.tab)));
 document.querySelector('.ei-tabs').addEventListener('keydown',e=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const arr=$$('[data-tab]'),i=arr.findIndex(b=>b.dataset.tab===state.active);let j=e.key==='Home'?0:e.key==='End'?arr.length-1:(i+(e.key==='ArrowLeft'?-1:1)+arr.length)%arr.length;activateTab(arr[j].dataset.tab,{focus:true})});
 $$('[data-go]').forEach(el=>el.addEventListener('click',()=>activateTab(el.dataset.go)));
 $('ei-motion').addEventListener('click',()=>setMotion(!state.motion));
 const video=$('ei-hero-video');$('ei-film-toggle').addEventListener('click',()=>{if(video.paused)video.play().catch(()=>toast(T.unavailable));else video.pause()});video.addEventListener('play',()=>setTxt('ei-film-toggle',T.pausevideo));video.addEventListener('pause',()=>setTxt('ei-film-toggle',T.playvideo));
 $$('[data-range]').forEach(el=>el.addEventListener('click',()=>{stopPlayback();fetchPeriod(el.dataset.range)}));
 $$('[data-fuel]').forEach(el=>el.addEventListener('click',()=>{state.fuel=el.dataset.fuel;renderFlow()}));
 $$('[data-border]').forEach(el=>el.addEventListener('click',()=>{state.border=el.dataset.border;renderGrid()}));
 $$('[data-map-marker]').forEach(el=>{const code=el.dataset.mapMarker;if(code==='RS')return;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',borderLabel(code));el.addEventListener('click',()=>{state.border=code;renderGrid()});el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();state.border=code;renderGrid()}})});
 $$('[data-grid-mode]').forEach(el=>el.addEventListener('click',()=>{stopPlayback();state.mode=el.dataset.gridMode;state.gridIndex=null;$$('[data-grid-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));renderGrid()}));
 $('ei-flow-slider').addEventListener('input',e=>{state.flowIndex=Number(e.target.value);renderFlow()});
 $('ei-grid-slider').addEventListener('input',e=>{stopPlayback();state.gridIndex=Number(e.target.value);renderGrid()});
 $$('[data-advance]').forEach(el=>el.addEventListener('click',()=>{const [kind,dir]=el.dataset.advance.split(':');stepAdvance(kind,Number(dir))}));
 $$('[data-latest]').forEach(el=>el.addEventListener('click',()=>{const kind=el.dataset.latest;state[kind==='flow'?'flowIndex':'gridIndex']=null;kind==='flow'?renderFlow():renderGrid()}));
 $('ei-grid-play').addEventListener('click',()=>{if(state.playing){stopPlayback();return}if(!state.motion){toast(T.motion_off);return}const rows=points(mapDataset());if(rows.length<2)return;state.gridIndex=state.gridIndex??0;state.playing=true;setTxt('ei-grid-play','Ⅱ '+T.stop);state.interval=setInterval(()=>{if(document.hidden||state.active!=='grid'){stopPlayback();return}if(state.gridIndex>=rows.length-1){stopPlayback();return}state.gridIndex++;renderGrid()},900)});
 $('ei-analysis-options').addEventListener('click',e=>{const el=e.target.closest('[data-analysis]');if(el){state.analysis=el.dataset.analysis;renderAnalysis()}});
 $$('[data-stage]').forEach(el=>el.addEventListener('click',()=>{stopTour();state.stage=Number(el.dataset.stage);renderPlant()}));
 $$('svg .v18-focusable').forEach((el,i)=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',T.stage_names[i+1]||T.stage_names[0]);const choose=()=>{stopTour();state.stage=Math.min(i+1,4);renderPlant()};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})});
 $('ei-cutaway').addEventListener('click',()=>{state.cutaway=!state.cutaway;renderPlant()});$('ei-plant-reset').addEventListener('click',()=>{stopTour();state.stage=0;renderPlant()});
 $('ei-plant-tour').addEventListener('click',()=>{if(state.tour){stopTour();return}if(!state.motion){toast(T.motion_off);return}state.tour=true;state.stage=0;renderPlant();setTxt('ei-plant-tour','Ⅱ '+T.endtour);state.tourInterval=setInterval(()=>{if(document.hidden||state.active!=='plant'){stopTour();return}if(state.stage>=4){stopTour();return}state.stage++;renderPlant()},11500)});
 $('ei-export').addEventListener('click',exportCSV);$('ei-analytics-export').addEventListener('click',exportCSV);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPlayback();stopTour();video.pause()}else if(state.active==='intro'&&state.motion)video.play().catch(()=>{})});
 window.addEventListener('hashchange',()=>activateTab(location.hash.slice(1)||'intro',{history:false}));
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){stopPlayback();stopTour();$('ei-site-nav').classList.remove('is-open')}});
}
wire();setMotion(state.motion);activateTab(['intro','flow','grid','analysis','plant','sources'].includes(location.hash.slice(1))?location.hash.slice(1):'intro',{history:false});fetchPeriod('24h');
setInterval(()=>{if(document.visibilityState==='visible'&&!state.demo){delete state.periods[state.range];fetchPeriod(state.range)}},5*60000);
