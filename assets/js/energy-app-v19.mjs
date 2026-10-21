/** BLUE CURRENT V19: UI is a read-only consumer of energy-model-v18 normalization.
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
const state={compare:false,compared:new Set(['coal','hydro']),mapFocus:false,active:'intro',range:'24h',periods:{},norm:null,fuel:'coal',border:'HU',mode:'physical',flowIndex:null,gridIndex:null,analysis:'production',stage:0,cutaway:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,demo:new URLSearchParams(location.search).get('demo')==='1',playing:false,tour:false,interval:null,tourInterval:null,busy:false,error:false};
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
const FLOW_PALETTE={coal:'#edb987',gas:'#89c9fc',hydro:'#4ad4fa',wind:'#86e9d0',solar:'#f6d580',bio:'#a0d9a9',other:'#b6a4e4'};
const FLOW_COPY={
 'sr-lat':{console:'Tok proizvodnje / operativna matrica',overview:'Pregled sistema',total:'Ukupno prijavljeno',renewable:'Obnovljivi izvori',nonrenewable:'Neobnovljivi izvori',selected:'Izabrana tehnologija',coverage:'Pokrivenost tehnologija',composition:'Kompozicija miksa',routing:'Raspodela po kanalima',compare:'Aktivni fokus',rank:'Pozicija u miksu',cluster:'Klaster',renewable_cluster:'Obnovljivi blok',thermal_cluster:'Termalni blok',mixed_cluster:'Mešoviti blok',share_cluster:'Udeo u klasteru',timeline:'Vremenski pregled',leaders:'Najveći doprinosi',activity:'Status kanala',active:'Aktivan kanal',inactive:'Neaktivan kanal',missing:'Nema objave',available:'Dostupni kanali',dominant:'Dominantni izvor',dominant_note:'Najveći doprinos u odabranom preseku',delta:'Promena prema prethodnom preseku',selection_note:'Klik na kanal ili segment menja fokus.'},
 'sr-cyr':{console:'Ток производње / оперативна матрица',overview:'Преглед система',total:'Укупно пријављено',renewable:'Обновљиви извори',nonrenewable:'Необновљиви извори',selected:'Изабрана технологија',coverage:'Покривеност технологија',composition:'Композиција микса',routing:'Расподела по каналима',compare:'Активни фокус',rank:'Позиција у миксу',cluster:'Кластер',renewable_cluster:'Обновљиви блок',thermal_cluster:'Термални блок',mixed_cluster:'Мешовити блок',share_cluster:'Удео у кластеру',timeline:'Временски преглед',leaders:'Највећи доприноси',activity:'Статус канала',active:'Активан канал',inactive:'Неактиван канал',missing:'Нема објаве',available:'Доступни канали',dominant:'Доминантни извор',dominant_note:'Највећи допринос у изабраном пресеку',delta:'Промена према претходном пресеку',selection_note:'Клик на канал или сегмент мења фокус.'},
 en:{console:'Generation flow / operating matrix',overview:'System overview',total:'Reported total',renewable:'Renewables',nonrenewable:'Non-renewables',selected:'Selected technology',coverage:'Technology coverage',composition:'Generation mix composition',routing:'Channel routing',compare:'Active focus',rank:'Rank in mix',cluster:'Cluster',renewable_cluster:'Renewable block',thermal_cluster:'Thermal block',mixed_cluster:'Mixed block',share_cluster:'Share inside cluster',timeline:'Time review',leaders:'Top contributors',activity:'Channel state',active:'Active channel',inactive:'Inactive channel',missing:'Not published',available:'Available channels',dominant:'Leading source',dominant_note:'Largest contribution in the selected slice',delta:'Change vs previous slice',selection_note:'Click a channel or a segment to change focus.'},
 ru:{console:'Поток генерации / операционная матрица',overview:'Обзор системы',total:'Суммарно опубликовано',renewable:'Возобновляемые источники',nonrenewable:'Невозобновляемые источники',selected:'Выбранная технология',coverage:'Покрытие технологий',composition:'Структура микса',routing:'Маршрутизация каналов',compare:'Активный фокус',rank:'Позиция в миксе',cluster:'Кластер',renewable_cluster:'Блок ВИЭ',thermal_cluster:'Тепловой блок',mixed_cluster:'Смешанный блок',share_cluster:'Доля внутри кластера',timeline:'Временной обзор',leaders:'Крупнейшие вклады',activity:'Состояние канала',active:'Активный канал',inactive:'Неактивный канал',missing:'Нет публикации',available:'Доступные каналы',dominant:'Ведущий источник',dominant_note:'Наибольший вклад в выбранном срезе',delta:'Изменение к предыдущему срезу',selection_note:'Щелчок по каналу или сегменту меняет фокус.'}
};
const FC=(FLOW_COPY[LANG]||FLOW_COPY['sr-lat']);
const FLOW_CLUSTER={coal:'thermal',gas:'thermal',other:'mixed',hydro:'renewable',wind:'renewable',solar:'renewable',bio:'renewable'};
function clusterLabel(k){const c=FLOW_CLUSTER[k]||'mixed';return c==='renewable'?FC.renewable_cluster:c==='thermal'?FC.thermal_cluster:FC.mixed_cluster}
function finiteFuelRows(selected){return FUELS.map(k=>({key:k,value:flowPt(selected,k),color:FLOW_PALETTE[k],label:fuelLabel(k)})).filter(x=>Number.isFinite(x.value))}
function shareOf(value,total){return Number.isFinite(value)&&Number.isFinite(total)&&total>0?100*value/total:null}
function sourceGlyph(kind,x,y,color){
 const frame=`transform="translate(${x} ${y})" stroke="${color}" fill="none" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"`;
 const parts={
  coal:'<path d="M-8 3L0 -8L8 3L0 9Z"/><path d="M-4 2L0 6L4 2"/>',
  gas:'<path d="M0 -10Q-8 -3-7 4Q-5 12 1 10Q9 8 6 0Q3 4 1 0Q-1 -4 0 -10Z"/>',
  hydro:'<path d="M-9 -4Q-3 -9 3 -4T14 -4M-9 3Q-3 -2 3 3T14 3M-9 9Q-3 4 3 9T14 9"/>',
  wind:'<circle r="2.8"/><path d="M0 -3V-12Q10 -14 6 -5L2 -1M3 2L12 6Q10 15 3 9L0 3M-3 1L-10 6Q-16 -2 -6 -4L-1 -2"/>',
  solar:'<circle r="5"/>'+Array.from({length:8},(_,i)=>`<path d="M0 -9V-13" transform="rotate(${i*45})"/>`).join(''),
  bio:'<path d="M-7 10Q-10 -11 9 -9Q11 7 -7 10Z"/><path d="M-7 10Q-1 1 8 -7"/>',
  other:'<path d="M0 -11L9 -5V6L0 11L-9 6V-5Z"/><circle r="3"/>'
 };
 return `<g ${frame} aria-hidden="true">${parts[kind]||parts.other}</g>`;
}
function renderFlow(){
 const rows=points('production'),selected=current('production',state.flowIndex),q=source('production').quality;
 const shell=document.querySelector('.v19-energy-stage');
 if(!shell)return;
 const total=Number.isFinite(selected?.total)&&selected.total>0?selected.total:0;
 const items=FUELS.map(k=>({key:k,label:fuelLabel(k),value:flowPt(selected,k),color:FLOW_PALETTE[k]}));
 const finiteItems=items.filter(x=>Number.isFinite(x.value));
 const sorted=[...finiteItems].sort((a,b)=>b.value-a.value);
 const dominant=sorted[0]||null;
 const selectedVal=flowPt(selected,state.fuel);
 const selectedShare=shareOf(selectedVal,total);
 const renewableMW=Number.isFinite(selected?.renewables)?selected.renewables:null;
 const nonRenewableMW=Number.isFinite(renewableMW)&&Number.isFinite(total)?Math.max(0,total-renewableMW):null;
 const covered=Number.isInteger(selected?.categories_covered)?selected.categories_covered:finiteItems.length;
 const step=state.flowIndex==null?rows.length-1:Math.min(rows.length-1,state.flowIndex);
 const previous=step>0?flowPt(rows[step-1],state.fuel):null;
 const delta=Number.isFinite(selectedVal)&&Number.isFinite(previous)?selectedVal-previous:null;
 const fuelRows=rows.map(row=>flowPt(row,state.fuel)).filter(Number.isFinite);
 const rank=sorted.findIndex(x=>x.key===state.fuel);
 const clusterKeys=FUELS.filter(k=>FLOW_CLUSTER[k]===FLOW_CLUSTER[state.fuel]);
 const clusterTotal=clusterKeys.reduce((sum,k)=>sum+(Number.isFinite(flowPt(selected,k))?flowPt(selected,k):0),0);
 const clusterShare=shareOf(selectedVal,clusterTotal);
 const compareSet=(state.compare?[...state.compared]:[state.fuel]).filter(k=>FUELS.includes(k)).slice(0,3);
 const series=compareSet.map(k=>({name:fuelLabel(k),color:FLOW_PALETTE[k],points:rows.map(r=>({t:r.t,iso:r.iso,v:flowPt(r,k)}))}));
 const lanes=[72,130,188,246,304,362,420];
 const laneMarkup=items.map((item,i)=>{
   const y=lanes[i],value=item.value,share=shareOf(value,total)||0,active=state.fuel===item.key,compare=state.compare&&state.compared.has(item.key),highlight=state.compare?compare:active;
   const width=value===null?4:Math.max(8,Math.min(30,6+share*.28));
   const opacity=value===null?0.18:highlight?1:state.compare?0.34:0.55;
   const busY=92+i*47;
   const path=`M248 ${y} C318 ${y}, 392 ${busY}, 470 ${busY} L 560 ${busY}`;
   return `<g class="v21-flow-node ${highlight?'is-highlight':''}" data-fuel-path="${item.key}" tabindex="0" role="button" aria-label="${esc(item.label)}: ${value===null?T.no_data:num(value,1)+' MW'}">
      <rect x="28" y="${y-24}" width="198" height="48" rx="12" class="v21-source-shell"/>
      <rect x="28" y="${y-24}" width="6" height="48" rx="3" fill="${item.color}" opacity="${value===null?0.25:1}"/>
      ${sourceGlyph(item.key,52,y,item.color)}
      <text x="71" y="${y-5}" class="v21-source-label">${esc(item.label)}</text>
      <text x="71" y="${y+14}" class="v21-source-reading">${value===null?esc(T.no_data):esc(num(value,1))+' MW'}</text>
      <text x="213" y="${y+14}" text-anchor="end" class="v21-source-share">${value!==null&&total?esc(num(share,1))+' %':''}</text>
      <path d="${path}" class="v21-flow-lane-shadow" stroke="${item.color}" stroke-width="${width+10}" opacity="${opacity*.12}" fill="none"/>
      <path d="${path}" class="v21-flow-lane-core" stroke="${item.color}" stroke-width="${width}" opacity="${opacity}" fill="none" stroke-linecap="round"/>
      ${value>0&&state.motion&&isActiveQuality(q)&&highlight?`<circle r="3.2" fill="#e9fbff"><animateMotion dur="${(2.6+i*0.17).toFixed(2)}s" path="${path}" repeatCount="indefinite"/></circle>`:''}
    </g>`;
 }).join('');
 const sinkCards=[
   {label:FC.total,value:Number.isFinite(selected?.total)?num(total,1)+' MW':T.no_data,color:'#5ad7fa',y:118},
   {label:FC.renewable,value:Number.isFinite(renewableMW)?num(renewableMW,1)+' MW':T.no_data,color:'#86e9d0',y:230},
   {label:FC.nonrenewable,value:Number.isFinite(nonRenewableMW)?num(nonRenewableMW,1)+' MW':T.no_data,color:'#eec497',y:342},
 ].map((card,idx)=>{
   const path=`M588 ${230+idx*36} C 642 ${230+idx*36}, 655 ${card.y}, 690 ${card.y}`;
   return `<g class="v21-sink-card">
      <path d="${path}" stroke="${card.color}" stroke-opacity=".6" stroke-width="${idx===0?14:10}" fill="none" stroke-linecap="round"/>
      <rect x="700" y="${card.y-34}" width="160" height="68" rx="12" class="v21-sink-shell"/>
      <circle cx="722" cy="${card.y}" r="7" fill="${card.color}"/>
      <text x="740" y="${card.y-8}" class="v21-sink-label">${esc(card.label)}</text>
      <text x="740" y="${card.y+16}" class="v21-sink-reading">${esc(card.value)}</text>
   </g>`;
 }).join('');
 const segments=(()=>{
   if(!total||!finiteItems.length)return `<rect x="36" y="468" width="828" height="20" rx="10" fill="#0f2f46" stroke="#294f67"/>`;
   let x=36;
   return finiteItems.sort((a,b)=>b.value-a.value).map(item=>{const w=Math.max(10,828*(item.value/total));const part=`<g class="v21-stack-segment" data-fuel-path="${item.key}" tabindex="0" role="button" aria-label="${esc(item.label)} ${esc(num(item.value,1))} MW"><rect x="${x.toFixed(1)}" y="468" width="${w.toFixed(1)}" height="20" rx="${w<18?3:9}" fill="${item.color}" opacity="${state.fuel===item.key?1:.88}"/><title>${esc(item.label)} ${esc(num(item.value,1))} MW</title></g>`; x+=w; return part;}).join('');
 })();
 const stageHTML=`<div class="v19-scene-caption v21-caption"><span>${esc(FC.console)}</span><span class="v19-scene-led" id="v19-flow-led">●</span></div>
 <div class="v21-flow-stage-wrap">
 <svg viewBox="0 0 900 520" class="ei-energy-graphic v19-flow-svg v21-flow-svg" role="img" aria-label="${esc(FC.routing)}">
 <defs>
   <linearGradient id="v21-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#081f30"/><stop offset="1" stop-color="#04121f"/></linearGradient>
   <pattern id="v21-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" stroke="#285268" stroke-opacity=".18" fill="none"/></pattern>
   <filter id="v21-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
   <linearGradient id="v21-bus" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#25526b"/><stop offset="1" stop-color="#0d3048"/></linearGradient>
 </defs>
 <rect width="900" height="520" fill="url(#v21-bg)"/>
 <rect width="900" height="520" fill="url(#v21-grid)"/>
 <text x="34" y="26" class="v19-svg-serial">${esc(FC.routing).toUpperCase()}</text>
 <text x="864" y="26" text-anchor="end" class="v19-svg-serial">${esc(localTime(selected?.iso))}</text>
 <rect x="480" y="74" width="92" height="356" rx="18" fill="#0b2a3e" stroke="#2c5b72"/>
 <rect x="512" y="96" width="28" height="312" rx="14" fill="url(#v21-bus)" stroke="#5dbedc" stroke-opacity=".45"/>
 <circle cx="526" cy="252" r="84" fill="#0a2637" stroke="#2e5e76"/>
 <circle cx="526" cy="252" r="66" fill="none" stroke="#58d3f8" stroke-opacity=".24" stroke-dasharray="6 10" class="v21-orbit"/>
 <text x="526" y="214" text-anchor="middle" class="ei-core-kicker">${esc(FC.total).toUpperCase()}</text>
 <text x="526" y="257" text-anchor="middle" class="ei-core-num" id="ei-flow-core">${Number.isFinite(selected?.total)?esc(num(total)):esc(T.no_data)}</text>
 <text x="526" y="285" text-anchor="middle" class="ei-core-unit">MW</text>
 <text x="526" y="311" text-anchor="middle" class="v19-svg-serial">${esc(FC.available)} ${covered}/7</text>
 ${laneMarkup}
 ${sinkCards}
 <text x="36" y="458" class="v19-svg-serial">${esc(FC.composition).toUpperCase()}</text>
 ${segments}
 </svg>
 <div class="v21-flow-summary">
  <div><span>${esc(FC.total)}</span><strong>${Number.isFinite(selected?.total)?esc(num(total,1))+' MW':esc(T.no_data)}</strong></div>
  <div><span>${esc(FC.renewable)}</span><strong id="v19-renewables-value">${Number.isFinite(selected?.renewable_share)?esc(num(selected.renewable_share,1))+' %':esc(T.no_data)}</strong></div>
  <div><span>${esc(FC.coverage)}</span><strong id="v19-mix-count">${covered} / 7</strong></div>
  <div><span>${esc(FC.selected)}</span><strong id="v19-selected-power">${selectedVal===null?esc(T.no_data):esc(num(selectedVal,1))+' MW'}</strong></div>
 </div>
 </div>`;
 shell.innerHTML=stageHTML;
 shell.style.setProperty('--v19-active',FLOW_PALETTE[state.fuel]);
 setTxt('ei-flow-quality',smallStatus(q));
 setTxt('ei-flow-time',T.time+': '+localTime(selected?.iso));
 $$('[data-fuel]').forEach(el=>{const k=el.dataset.fuel,v=flowPt(selected,k);el.setAttribute('aria-pressed',String(state.compare?state.compared.has(k):k===state.fuel));el.querySelector('strong').textContent=v===null?T.no_data:num(v,1)+' MW'});
 setTxt('ei-flow-title',fuelLabel(state.fuel));
 setTxt('ei-flow-value',selectedVal===null?T.no_data:num(selectedVal,1));
 setTxt('ei-flow-share',selectedShare===null?T.no_data:num(selectedShare,1)+' %');
 setTxt('ei-flow-note',selectedVal===null?T.no_data:clusterLabel(state.fuel)+' · '+FC.share_cluster+': '+(clusterShare===null?T.no_data:num(clusterShare,1)+' %'));
 setTxt('v19-source-range',fuelRows.length?num(Math.min(...fuelRows),1)+' / '+num(Math.max(...fuelRows),1)+' MW':T.no_data);
 setTxt('v19-source-delta',delta===null?T.no_data:(delta>0?'+':'')+num(delta,1)+' MW');
 $('v19-share-fill').style.width=(selectedShare??0).toFixed(2)+'%';
 $('v19-share-fill').style.background=FLOW_PALETTE[state.fuel];
 $('v19-compare-mode').checked=state.compare;
 const leaderboard=(sorted.length?sorted.slice(0,3):[]).map((item,idx)=>`<div class="v21-legend-row"><span><i style="background:${item.color}"></i>${idx+1}. ${esc(item.label)}</span><strong>${esc(num(item.value,1))} MW</strong></div>`).join('');
 $('v19-compare-legend').innerHTML=`<div class="v21-legend-block"><h4>${esc(FC.leaders)}</h4>${leaderboard||`<p>${esc(T.no_data)}</p>`}</div>`+
   `<div class="v21-legend-block"><h4>${esc(FC.compare)}</h4>${compareSet.map(k=>`<div class="v21-legend-chip"><i style="background:${FLOW_PALETTE[k]}"></i>${esc(fuelLabel(k))}</div>`).join('')}${state.compare?'':`<p>${esc(FC.selection_note)}</p>`}</div>`;
 const stats=document.querySelector('.v19-source-stats');
 if(stats)stats.innerHTML=`
   <div><small>${esc(FC.rank).toUpperCase()}</small><strong>${rank>=0?esc(String(rank+1)+' / '+sorted.length):esc(T.no_data)}</strong></div>
   <div><small>${esc(FC.cluster).toUpperCase()}</small><strong>${esc(clusterLabel(state.fuel))}</strong></div>
   <div><small>${esc(FC.share_cluster).toUpperCase()}</small><strong>${clusterShare===null?esc(T.no_data):esc(num(clusterShare,1))+' %'}</strong></div>
   <div><small>${esc(FC.delta).toUpperCase()}</small><strong>${delta===null?esc(T.no_data):esc((delta>0?'+':'')+num(delta,1))+' MW'}</strong></div>`;
 chart('ei-flow-chart',series,{label:T.trend+' / '+compareSet.map(fuelLabel).join(', '),height:240});
 const slider=$('ei-flow-slider');slider.disabled=rows.length<2;slider.max=Math.max(0,rows.length-1);slider.value=state.flowIndex??Math.max(rows.length-1,0);setTxt('ei-flow-clock',localTime(selected?.iso));
 $$('[data-fuel-path]').forEach(el=>{const fn=()=>selectFuel(el.dataset.fuelPath);el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}})});
}

function selectFuel(k){if(!FUELS.includes(k))return;if(state.compare){if(state.compared.has(k)&&state.compared.size>1)state.compared.delete(k);else{state.compared.add(k);if(state.compared.size>3){const old=[...state.compared].find(x=>x!==k);state.compared.delete(old)}}}state.fuel=k;renderFlow()}
function mapDataset(){return state.mode==='physical'?'physical_flows':'commercial_exchange'}
function flowMeaning(v){return v>0?T.inbound:v<0?T.outbound:T.zero}
let v19MapFrame=null;
function cameraMap(svg,dest,motion){
 const from=svg.viewBox.baseVal;const original=[from.x,from.y,from.width,from.height];
 if(v19MapFrame){cancelAnimationFrame(v19MapFrame);v19MapFrame=null}
 if(!motion){svg.setAttribute('viewBox',dest.join(' '));return}
 let tick=null;const duration=560;
 function frame(now){if(tick===null)tick=now;const f=Math.min(1,(now-tick)/duration),smooth=1-Math.pow(1-f,3);svg.setAttribute('viewBox',dest.map((x,i)=>(original[i]+(x-original[i])*smooth).toFixed(2)).join(' '));if(f<1)v19MapFrame=requestAnimationFrame(frame);else v19MapFrame=null}
 v19MapFrame=requestAnimationFrame(frame);
}
// V22 independently inspectable border overview; source timestamps are not blended.
const V22_TEXT={
 'sr-lat':{network:'Pregled svih granica',all:'Sve granice',in:'Uvoz',out:'Izvoz',missing:'Nedostupno',filter:'Filtriraj tokove',scale:'Snaga u odnosu na najveću objavljenu vrednost u izabranom trenutku',reported:'Pokrivenost merenja',nototal:'Nema pouzdanog zajedničkog salda za nepotpun obuhvat',national:'Izvorni zbir',physical:'Fizički tok',commercial:'Komercijalna razmena',independent:'Odvojeni podaci i vreme objave',measured:'Mereno',source:'Izvor',supply:'Tehnološki proces',stage:'Izabrana faza',illustration:'Ilustracija procesa, ne podatak o radu postrojenja',step:'Korak',start:'Ulaz',end:'Izlaz',next:'Sledeći korak',story:'Tok energije',disclosure:'Otvori tehnički presek',hint:'Izaberi fazu ili tačku na postrojenju.'},
 'sr-cyr':{network:'Преглед свих граница',all:'Све границе',in:'Увоз',out:'Извоз',missing:'Недоступно',filter:'Филтрирај токове',scale:'Снага у односу на највећу објављену вредност у изабраном тренутку',reported:'Покривеност мерења',nototal:'Нема поузданог заједничког салда за непотпун обухват',national:'Изворни збир',physical:'Физички ток',commercial:'Комерцијална размена',independent:'Одвојени подаци и време објаве',measured:'Мерено',source:'Извор',supply:'Технолошки процес',stage:'Изабрана фаза',illustration:'Илустрација процеса, не податак о раду постројења',step:'Корак',start:'Улаз',end:'Излаз',next:'Следећи корак',story:'Ток енергије',disclosure:'Отвори технички пресек',hint:'Изабери фазу или тачку на постројењу.'},
 en:{network:'All border readings',all:'All borders',in:'Imports',out:'Exports',missing:'Unavailable',filter:'Filter flows',scale:'Bar lengths relative to largest published reading in selected time slice',reported:'Measurement coverage',nototal:'No reliable aggregate balance for partial coverage',national:'Published aggregate',physical:'Physical flow',commercial:'Commercial exchange',independent:'Different datasets and observation times',measured:'Observed',source:'Source',supply:'Technology process',stage:'Selected stage',illustration:'Process illustration, not plant operating data',step:'Stage',start:'Input',end:'Output',next:'Next stage',story:'Energy journey',disclosure:'Open engineering cutaway',hint:'Select a stage or equipment hotspot.'},
 ru:{network:'Обзор всех границ',all:'Все границы',in:'Импорт',out:'Экспорт',missing:'Недоступно',filter:'Фильтр потоков',scale:'Относительная величина по максимальному опубликованному значению текущего среза',reported:'Охват измерений',nototal:'Нет достоверного общего сальдо при неполном охвате',national:'Опубликованное сальдо',physical:'Физический поток',commercial:'Коммерческий обмен',independent:'Разные наборы данных и время измерения',measured:'Измерено',source:'Источник',supply:'Технологический процесс',stage:'Выбранный этап',illustration:'Иллюстрация процесса, не данные работы станции',step:'Этап',start:'Вход',end:'Выход',next:'Следующий этап',story:'Путь энергии',disclosure:'Открыть технический разрез',hint:'Выберите этап или оборудование.'}
};
const X22=V22_TEXT[LANG]||V22_TEXT['sr-lat'];
const netUI={filter:'all'};
function enhanceScaffold(){
 const map=document.querySelector('.ei-map-card');
 if(map&&!$('v22-network')){
  const guide=document.createElement('section');guide.id='v22-network';guide.className='v22-network';
  guide.innerHTML=`<header class="v22-sectionbar"><div><span>NETWORK / 08</span><h3>${esc(X22.network)}</h3></div><span id="v22-map-sum"></span></header>
  <div class="v22-network-filters" role="group" aria-label="${esc(X22.filter)}">
  ${[['all',X22.all],['in',X22.in],['out',X22.out],['missing',X22.missing]].map(([id,label])=>`<button type="button" data-v22-filter="${id}" aria-pressed="${id==='all'}">${esc(label)}</button>`).join('')}</div>
  <div class="v22-border-bars" id="v22-border-bars"></div>
  <p class="v22-caption">${esc(X22.scale)}</p>`;
  const telemetry=map.querySelector('.v19-network-telemetry');map.insertBefore(guide,telemetry);
  guide.addEventListener('click',e=>{const filter=e.target.closest('[data-v22-filter]');if(filter){netUI.filter=filter.dataset.v22Filter;renderGrid();return}
  const border=e.target.closest('[data-v22-border]');if(border){state.border=border.dataset.v22Border;renderGrid();}});
 }
 const inspector=document.querySelector('.ei-grid-inspect');
 if(inspector&&!$('v22-comparison')){const block=document.createElement('div');block.id='v22-comparison';block.className='v22-comparison';inspector.insertBefore(block,inspector.querySelector('.ei-chart-title'));}
 const scene=$('v20-cinematic-scene');
 if(scene&&!$('v22-stage-annotation')){
  const stage=document.createElement('div');stage.id='v22-stage-annotation';stage.className='v22-stage-annotation';stage.setAttribute('aria-live','polite');
  stage.innerHTML='<span id="v22-plant-step"></span><strong id="v22-plant-focus-label"></strong>';
  scene.appendChild(stage);
  if(!scene.querySelector('[data-plant-focus="0"]')){const point=document.createElement('button');point.type='button';point.className='v20-scene-point v22-scene-input';point.dataset.plantFocus='0';point.style.setProperty('--x','11%');point.style.setProperty('--y','56%');point.setAttribute('aria-label',T.stage_names[0]);point.innerHTML=`<span class="v20-point-num">00</span><span class="v20-point-label">${esc(T.stage_names[0])}</span>`;scene.appendChild(point)}

 }
 const machine=document.querySelector('.ei-machine');
 if(machine&&!$('v22-plant-journey')){
  const journey=document.createElement('div');journey.id='v22-plant-journey';journey.className='v22-plant-journey';
  journey.innerHTML=`<div class="v22-sectionbar"><div><span>COMBINED CYCLE</span><h3>${esc(X22.story)}</h3></div><small>${esc(X22.illustration)}</small></div><div class="v22-journey-steps" id="v22-journey-steps"></div>`;
  const details=machine.querySelector('.v20-technical-detail');machine.insertBefore(journey,details);
  journey.addEventListener('click',e=>{const item=e.target.closest('[data-v22-stage]');if(item){stopTour();state.stage=Number(item.dataset.v22Stage);renderPlant();}});
 }
}
function renderNetworkV22(id,rows,row,edges){
 const host=$('v22-border-bars');if(!host)return;
 const keys=BORDERS.map(k=>({key:k,value:Number.isFinite(edges[k])?edges[k]:null}));
 const maximum=Math.max(1,...keys.filter(x=>x.value!==null).map(x=>Math.abs(x.value)));
 const visible=keys.filter(x=>netUI.filter==='all'||(netUI.filter==='missing'?x.value===null:netUI.filter==='in'?x.value>0:x.value<0)).sort((a,b)=>{if(a.value===null)return 1;if(b.value===null)return -1;return Math.abs(b.value)-Math.abs(a.value)});
 host.innerHTML=visible.length?visible.map(item=>{
   const kind=item.value===null?'missing':item.value>0?'in':item.value<0?'out':'zero';
   const width=item.value===null?0:Math.max(item.value===0?0:2,Math.abs(item.value)/maximum*100);
   const direction=item.value===null?X22.missing:item.value>0?T.inbound:item.value<0?T.outbound:T.zero;
   return `<button type="button" class="v22-border-row ${item.key===state.border?'is-selected':''} v22-${kind}" data-v22-border="${item.key}" aria-pressed="${item.key===state.border}">
      <span class="v22-border-label">${esc(borderLabel(item.key))}<small>${item.key}</small></span>
      <span class="v22-border-scale"><i style="width:${width.toFixed(2)}%"></i></span>
      <span class="v22-border-value">${item.value===null?esc(T.no_data):esc(num(Math.abs(item.value),1))+' MW'}<small>${esc(direction)}</small></span>
   </button>`;
 }).join(''):`<p class="v22-empty">${esc(T.no_data)}</p>`;
 $$('[data-v22-filter]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.v22Filter===netUI.filter)));
 const count=keys.filter(x=>x.value!==null).length;
 setTxt('v22-map-sum',Number.isFinite(row?.net)?X22.national+': '+num(row.net,1)+' MW':X22.reported+': '+count+'/8');
 const pair=$('v22-comparison');if(pair){
 const variants=[['physical_flows',X22.physical],['commercial_exchange',X22.commercial]].map(([kind,label])=>{
   const r=current(kind,kind===id?state.gridIndex:null),v=r?.edges?.[state.border],q=source(kind).quality;
   return `<section><small>${esc(label)}</small><strong>${Number.isFinite(v)?esc(num(v,1))+' MW':esc(T.no_data)}</strong><span>${esc(Number.isFinite(v)?flowMeaning(v):T.no_data)}</span><p>${esc(X22.measured)}: ${esc(localTime(r?.iso))} | ${esc(statusText(q))}</p></section>`;
 }).join('');
 pair.innerHTML=`<header>${esc(X22.independent)}</header><div>${variants}</div>`;
 }
}
function renderPlantV22(){
 const s=state.stage,scene=$('v20-cinematic-scene');
 if(scene){const focus={0:[11,56],1:[32,66],2:[57,71],3:[69,38],4:[86,49]}[s];scene.style.setProperty('--focus-x',focus[0]+'%');scene.style.setProperty('--focus-y',focus[1]+'%');scene.style.setProperty('--stage-scale',s===0?'1.02':'1.15');}
 setTxt('v22-plant-step',X22.step+' '+String(s+1).padStart(2,'0')+'/05');
 setTxt('v22-plant-focus-label',T.stage_names[s]);
 const steps=$('v22-journey-steps');if(steps)steps.innerHTML=T.stage_names.map((name,i)=>`<button type="button" data-v22-stage="${i}" aria-pressed="${s===i}"><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(name)}</strong><i aria-hidden="true"></i></button>`).join('');
}
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
  if(path){path.classList.remove('is-import','is-export','is-current','is-missing','is-zero');path.classList.add(Number.isFinite(v)?v>0?'is-import':v<0?'is-export':'is-zero':'is-missing');path.classList.toggle('is-current',state.border===code&&Number.isFinite(v));path.style.strokeDasharray=state.motion&&isActiveQuality(q)&&Number.isFinite(v)&&v!==0?'8 8':'';path.style.animation=state.motion&&isActiveQuality(q)&&Number.isFinite(v)&&v!==0?'ei-dash 2.6s linear infinite':'';path.style.animationDirection=v>0?'reverse':'normal';}
 }
  // Independent border diagnostics; never interpret the sum of partial borders as national net.
  const present=BORDERS.filter(code=>Number.isFinite(b[code]));
  setTxt('v19-import-count',String(present.filter(code=>b[code]>0).length));
  setTxt('v19-export-count',String(present.filter(code=>b[code]<0).length));
  setTxt('v19-coverage-count',present.length+' / 8');
  const history=rows.map(r=>r.edges?.[state.border]).filter(Number.isFinite);
  setTxt('v19-border-active',borderLabel(state.border));
  setTxt('v19-border-availability',history.length+' / '+rows.length);
  setTxt('v19-border-range',history.length?num(Math.min(...history),1)+' / '+num(Math.max(...history),1)+' MW':T.no_data);
  $('v19-map-focus').setAttribute('aria-pressed',String(state.mapFocus));
  // SVG arrowheads and bubble readings follow the actual dataset and the selected observation.
  const coordinates={RS:[451.91,266],HU:[372.77,108.57],RO:[684.26,195.43],BG:[679.15,347.43],MK:[505.53,404.43],XK:[454.47,350.14],ME:[365.11,339.29],BA:[301.28,266],HR:[211.91,187.29]};
  const annotations=BORDERS.map(k=>{
   const n=b[k],pos=coordinates[k],src=coordinates.RS;
   if(!Number.isFinite(n))return '';
   const mx=src[0]*.38+pos[0]*.62,my=src[1]*.38+pos[1]*.62;
   const ang=Math.atan2(pos[1]-src[1],pos[0]-src[0])*180/Math.PI+(n>0?180:0);
   const picked=k===state.border;
   return `<g class="v19-grid-tag ${picked?'is-picked':''}" transform="translate(${mx.toFixed(1)} ${my.toFixed(1)})">
     <rect x="-39" y="-31" width="78" height="22" rx="6"/><text y="-16" text-anchor="middle">${esc(num(Math.abs(n)))} MW</text>
     ${n===0?'<circle r="3" fill="#95b5c6"/>':`<g transform="rotate(${ang.toFixed(1)})"><path d="M-11 0H10M4 -5L11 0L4 5" stroke="${n>0?'#7de7cb':'#f3c28c'}" stroke-width="2.8" fill="none" stroke-linejoin="round"/></g>`}</g>`;
  }).join('');
  $('v19-map-data').innerHTML=annotations;
  const svg=document.querySelector('.ei-geo-svg');if(svg){const pos=coordinates[state.border],center=[(coordinates.RS[0]+pos[0])/2,(coordinates.RS[1]+pos[1])/2],w=570,h=375,px=Math.max(0,Math.min(960-w,center[0]-w/2)),py=Math.max(0,Math.min(570-h,center[1]-h/2));cameraMap(svg,state.mapFocus?[px,py,w,h]:[0,0,960,570],state.motion && state.active==='grid');svg.classList.toggle('is-focused',state.mapFocus)}
 const chosen=b[state.border];setTxt('ei-border-name',borderLabel(state.border));setTxt('ei-border-reading',Number.isFinite(chosen)?num(chosen,1):'n/d');
 setTxt('ei-border-direction',Number.isFinite(chosen)?flowMeaning(chosen)+' | '+T.src_time+': '+localTime(row?.iso):T.no_data);
 chart('ei-grid-chart',[{name:borderLabel(state.border),color:'#75dafa',points:rows.map(r=>({t:r.t,iso:r.iso,v:r.edges?.[state.border]??null}))}],{label:labels[id]+' - '+borderLabel(state.border),height:190});
 renderNetworkV22(id,rows,row,b);
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
function macroPlant(stage){
 const rotor=(x,y,r,blades=16)=>`<g transform="translate(${x} ${y})" class="v19-macro-rotor"><circle r="${r+13}" fill="#0b273c" stroke="#a6dced" stroke-width="3"/><circle r="${r+6}" fill="url(#v19-metal)" stroke="#d0efff" stroke-width="1.5"/>${Array.from({length:blades},(_,i)=>`<path d="M1 -${r-2}Q${r*.7} -${r*.64},${r*.55} -5 L3 -4 Z" transform="rotate(${i*360/blades})" fill="${i%3?'url(#v19-metal)':'url(#v19-bronze)'}" stroke="#7badc4" stroke-width=".8"/>`).join('')}<circle r="13" fill="#0d2433" stroke="#ccecfb" stroke-width="3"/><circle r="5" fill="#bfeefd"/></g>`;
 const title=(k,t)=>`<text x="32" y="34" class="v19-macro-kicker">0${k} / ${esc(t.toUpperCase())}</text><text x="30" y="220" class="v19-macro-caption">${esc(T.v19_stage)}</text>`;
 const timeline=`<path d="M40 194H900" stroke="#37637e" stroke-width="1" stroke-dasharray="4 7"/><path d="M40 194H900" stroke="#57c8ed" stroke-width="2" stroke-dasharray="15 14" class="v19-macro-current"/>`;
 const turbine=()=>`<g class="v19-macro-entry"><path d="M175 83H690L732 113V162L690 182H175L129 151V111Z" fill="url(#v19-metal)" stroke="#bfeaff" stroke-width="2"/><path d="M148 92L690 92L713 109H156Z" fill="#c4e9fa" opacity=".17"/><path d="M166 105H679V166H166Z" fill="#061a29" stroke="#688aa0"/>${Array.from({length:11},(_,i)=>`<path d="M${192+i*41} 110L${180+i*41} 161M${192+i*41} 161L${204+i*41} 110" stroke="${i%3?'#7da9bf':'#e0b680'}" stroke-width="3" opacity=".68"/>`).join('')}<path d="M95 135H798" stroke="#e2edf2" stroke-width="12" stroke-linecap="round"/><path d="M95 135H798" stroke="#3a6580" stroke-width="4"/>${rotor(318,135,56,22)}${rotor(560,135,48,19)}<path d="M732 117H795V160H732Z" fill="url(#v19-metal)" stroke="#a9def4"/><path d="M183 80V64H617V80" stroke="#6cbce2" fill="none" stroke-width="5"/><text x="775" y="92" class="v19-macro-label">SHAFT</text></g>`;
 const generator=()=>`<g class="v19-macro-entry"><path d="M178 77H733L781 116V164L731 187H178L139 160V103Z" fill="url(#v19-metal)" stroke="#a8def7" stroke-width="2"/><path d="M175 100H754V168H175Z" fill="#081e2c" stroke="#41677e"/>${Array.from({length:16},(_,i)=>`<rect x="${194+i*32}" y="104" width="17" height="60" rx="3" fill="${i%2?'#bc855a':'#e6bb81'}" opacity=".91"/><path d="M${201+i*32} 103V165" stroke="#fff0be" stroke-opacity=".6" stroke-width="1"/>`).join('')}<path d="M104 136H829" stroke="#a6d1e9" stroke-width="19" stroke-linecap="round"/><path d="M104 136H829" stroke="#1a415b" stroke-width="7"/>${rotor(488,136,42,18)}<path d="M154 80H760" stroke="#bbe1ed" stroke-width="4" opacity=".6"/><text x="720" y="74" class="v19-macro-label">STATOR / ROTOR</text></g>`;
 const boiler=()=>`<g class="v19-macro-entry"><path d="M174 61H762V192H174Z" fill="url(#v19-metal)" stroke="#8fc6de" stroke-width="2"/><path d="M194 74H740V181H194Z" fill="#081c2c" stroke="#3e6783"/>${Array.from({length:37},(_,i)=>`<path d="M${201+i*14.5} 80V176" stroke="${i%4===0?'#e4a970':'#8cbccc'}" stroke-width="${i%4===0?4:2}"/>`).join('')}<path d="M200 102H740M200 152H740" stroke="#84e1f0" stroke-opacity=".6" stroke-width="2"/><path d="M278 60V28H314V60M640 60V28H672V60" stroke="#7fc4de" stroke-width="6" fill="none"/><path class="v19-gas-pulse" d="M125 128H810" stroke="#f6a16c" stroke-width="7" stroke-dasharray="13 21" stroke-linecap="round" fill="none"/></g>`;
 const steam=()=>`<g class="v19-macro-entry"><path d="M107 101H302V135H530V72H695V135H813" fill="none" stroke="url(#v19-metal)" stroke-width="31" stroke-linejoin="round"/><path d="M107 101H302V135H530V72H695V135H813" fill="none" stroke="#ade8fd" stroke-width="4" stroke-dasharray="18 25" class="v19-macro-current"/><path d="M310 115V156Q310 178 340 178H465Q490 178 490 151" fill="none" stroke="url(#v19-metal)" stroke-width="22"/><circle cx="625" cy="105" r="55" fill="#08243b" stroke="#b0d8e8" stroke-width="4"/>${rotor(625,105,36,16)}<path d="M165 58V104M765 136V185" stroke="#ccf0ff" stroke-width="4"/><text x="96" y="76" class="v19-macro-label">HOT STEAM</text><text x="747" y="211" class="v19-macro-label">OUTPUT</text></g>`;
 const overview=()=>`<g class="v19-macro-entry">${[105,295,485,675].map((x,i)=>`<rect x="${x}" y="87" width="157" height="103" rx="8" fill="url(#v19-metal)" stroke="#86c8e7" stroke-width="2"/><rect x="${x+10}" y="97" width="137" height="81" fill="#091e31"/><text x="${x+78}" y="119" text-anchor="middle" class="v19-macro-label">${['GAS TURBINE','GENERATOR','HEAT RECOVERY','STEAM'][i]}</text><g transform="translate(${x+78} 152)"><circle r="24" fill="none" stroke="${i%2?'#f3c58e':'#65d4f9'}" stroke-width="3"/><path d="M-15 0H15M0 -15V15" stroke="#a0e1f0" stroke-width="2"/></g>`).join('')}<path d="M270 145H287M460 145H478M650 145H669" stroke="#69d5fa" stroke-width="4" stroke-dasharray="7 6"/></g>`;
 const subtitles=[T.stage_names[0],T.stage_names[1],T.stage_names[2],T.stage_names[3],T.stage_names[4]];
 const shell=!state.cutaway&&stage>0?`<g class="v19-macro-casing"><path d="M132 85Q145 63 179 63H749Q792 73 801 108V164Q766 183 744 187H183Q143 173 132 153Z" fill="url(#v19-metal)" stroke="#d7eefb" stroke-width="3"/><path d="M173 82H759" stroke="#f2fcff" stroke-opacity=".7" stroke-width="3"/>${Array.from({length:15},(_,i)=>`<circle cx="${170+i*41}" cy="164" r="2.6" fill="#d1ebf8"/>`).join('')}</g>`:'';
 return `<rect width="940" height="240" fill="#071d30"/><g opacity=".16">${Array.from({length:30},(_,i)=>`<path d="M${i*32} 0V240" stroke="#4d7793" stroke-width=".8"/>`).join('')}</g>${title(stage,subtitles[stage]||'')}${[overview,turbine,generator,boiler,steam][stage]()}${shell}${timeline}`;
}
function renderMacro(){const target=$('v19-machine-drawing');if(!target)return;const art=macroPlant(state.stage);target.innerHTML=art;const tags={
  'sr-lat':[['Kompletan ciklus','Kogeneracija'],['Kompresor','Rotor','Ekspanzija'],['Osovina','Stator','Generator'],['Cevni snop','Prenos toplote','Povrat energije'],['Procesna para','Turbina','Izlaz']],
  'sr-cyr':[['Комплетан циклус','Когенерација'],['Компресор','Ротор','Експанзија'],['Осовина','Статор','Генератор'],['Цевни сноп','Пренос топлоте','Поврат енергије'],['Процесна пара','Турбина','Излаз']],
  'en':[['Complete cycle','Cogeneration'],['Compressor','Rotor','Expansion'],['Shaft','Stator','Generator'],['Tube bank','Heat transfer','Recovery'],['Process steam','Turbine','Output']],
  'ru':[['Полный цикл','Когенерация'],['Компрессор','Ротор','Расширение'],['Вал','Статор','Генератор'],['Пучок труб','Теплопередача','Рекуперация'],['Технологический пар','Турбина','Выход']]
 }[LANG];$('v19-component-tags').innerHTML=tags[state.stage].map((n,i)=>`<span><b>${String(i+1).padStart(2,'0')}</b> ${esc(n)}</span>`).join('')}
function renderPlant(){const s=state.stage;
 const scene=$('v20-cinematic-scene');if(scene){scene.dataset.activeStage=String(s);const focus={1:[32,66],2:[57,71],3:[69,38],4:[86,49]}[s]||[50,50];scene.style.setProperty('--focus-x',focus[0]+'%');scene.style.setProperty('--focus-y',focus[1]+'%');$$('[data-plant-focus]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.plantFocus)===s)));}
 $$('[data-stage]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.stage)===s)));
 setTxt('ei-stage-title',T.stage_names[s]);setTxt('ei-stage-text',T.stage_texts[s]);setTxt('v19-plant-input',T.v19_inputs[s]);setTxt('v19-plant-output',T.v19_outputs[s]);setTxt('ei-stage-index',String(s+1).padStart(2,'0')+' / 05');setTxt('ei-stage-number',String(s+1).padStart(2,'0'));
 $('ei-cutaway').setAttribute('aria-pressed',String(state.cutaway));$('ei-cutaway').textContent=state.cutaway?T.shell:T.cutaway;
 document.querySelector('.ei-machine').classList.toggle('is-cutaway',state.cutaway);
 document.querySelector('.ei-machine').classList.toggle('stage-focus',s!==0);
 updateSVG(ZOOMS[s],state.motion && state.active==='plant');renderMacro();renderPlantV22();
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
 $$('[data-fuel]').forEach(el=>el.addEventListener('click',()=>selectFuel(el.dataset.fuel)));
  $('v19-compare-mode').addEventListener('change',e=>{state.compare=e.target.checked;if(state.compare)state.compared=new Set([state.fuel]);renderFlow()});
  $('v19-compare-reset').addEventListener('click',()=>{state.compare=false;state.compared.clear();renderFlow()});
  $('v19-map-focus').addEventListener('click',()=>{state.mapFocus=!state.mapFocus;renderGrid()});
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
 $$('[data-plant-focus]').forEach(el=>el.addEventListener('click',()=>{stopTour();state.stage=Number(el.dataset.plantFocus);renderPlant()}));
 $$('svg .v18-focusable').forEach((el,i)=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',T.stage_names[i+1]||T.stage_names[0]);const choose=()=>{stopTour();state.stage=Math.min(i+1,4);renderPlant()};el.addEventListener('click',choose);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}})});
 $('ei-cutaway').addEventListener('click',()=>{const drawing=document.querySelector('.v20-technical-detail');if(drawing)drawing.open=true;state.cutaway=!state.cutaway;renderPlant()});$('ei-plant-reset').addEventListener('click',()=>{stopTour();state.stage=0;renderPlant()});
 $('ei-plant-tour').addEventListener('click',()=>{if(state.tour){stopTour();return}if(!state.motion){toast(T.motion_off);return}state.tour=true;state.stage=0;renderPlant();setTxt('ei-plant-tour','Ⅱ '+T.endtour);state.tourInterval=setInterval(()=>{if(document.hidden||state.active!=='plant'){stopTour();return}if(state.stage>=4){stopTour();return}state.stage++;renderPlant()},11500)});
 $('ei-export').addEventListener('click',exportCSV);$('ei-analytics-export').addEventListener('click',exportCSV);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPlayback();stopTour();video.pause()}else if(state.active==='intro'&&state.motion)video.play().catch(()=>{})});
 window.addEventListener('hashchange',()=>activateTab(location.hash.slice(1)||'intro',{history:false}));
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){stopPlayback();stopTour();$('ei-site-nav').classList.remove('is-open')}});
}
enhanceScaffold();wire();setMotion(state.motion);activateTab(['intro','flow','grid','analysis','plant','sources'].includes(location.hash.slice(1))?location.hash.slice(1):'intro',{history:false});fetchPeriod('24h');
setInterval(()=>{if(document.visibilityState==='visible'&&!state.demo){delete state.periods[state.range];fetchPeriod(state.range)}},5*60000);
