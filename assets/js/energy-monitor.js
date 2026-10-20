/* GEH Serbia Energy Intelligence: real data only, no fabricated fallback values */
(() => {
 'use strict';
 const root = document.querySelector('[data-energy-lang]'); if (!root) return;
 const lang = root.getAttribute('data-energy-lang');
 const locale = ({'sr-lat':'sr-RS','sr-cyr':'sr-RS','en':'en-GB','ru':'ru-RU'})[lang] || 'sr-RS';
 const tr = {
  'sr-lat':{unavailable:'Nema podataka',source:'Izvor',time:'Mereno',retrieved:'Preuzeto',cached:'Keširani podaci',fresh:'Podaci dostupni',delayed:'Objavljeni podaci kasne',offline:'Izvori nedostupni',loading:'Povezivanje sa izvorima…',insightImport:'Neto fizički uvoz u posmatranom intervalu',insightExport:'Neto fizički izvoz u posmatranom intervalu',insightGen:'Objavljena proizvodnja',insightNeed:'Nema dovoljno svežih podataka za zaključak.',with:'sa',other:'Ostalo',thermal:'Termo',hydro:'Hidro',wind:'Vetar',solar:'Sunce',bio:'Biomasa',renew:'Obnovljivi',market:'Day-ahead cena nije trenutna spot kotacija',notserver:'Za automatske podatke pokrenite START_DASHBOARD.bat ili python3 energy_server.py, pa otvorite http://127.0.0.1:18765/sr-lat/energetski-monitor.html'},
  'sr-cyr':{unavailable:'Нема података',source:'Извор',time:'Мерено',retrieved:'Преузето',cached:'Кеширани подаци',fresh:'Подаци доступни',delayed:'Објављени подаци касне',offline:'Извори недоступни',loading:'Повезивање са изворима…',insightImport:'Нето физички увоз у посматраном интервалу',insightExport:'Нето физички извоз у посматраном интервалу',insightGen:'Објављена производња',insightNeed:'Нема довољно свежих података за закључак.',with:'са',other:'Остало',thermal:'Термо',hydro:'Хидро',wind:'Ветар',solar:'Сунце',bio:'Биомаса',renew:'Обновљиви',market:'Цена за дан унапред није тренутна спот котација',notserver:'За аутоматске податке покрените START_DASHBOARD.bat или python3 energy_server.py и отворите http://127.0.0.1:18765/sr-cyr/energetski-monitor.html'},
  en:{unavailable:'Data unavailable',source:'Source',time:'Observed',retrieved:'Retrieved',cached:'Cached observation',fresh:'Data available',delayed:'Published data delayed',offline:'Data sources unavailable',loading:'Connecting to sources…',insightImport:'Net physical imports in the observed interval',insightExport:'Net physical exports in the observed interval',insightGen:'Reported power generation',insightNeed:'Insufficient recent published data for a supported conclusion.',with:'with',other:'Other',thermal:'Thermal',hydro:'Hydro',wind:'Wind',solar:'Solar',bio:'Biomass',renew:'Renewable',market:'Day-ahead auction price is not an intraday spot quote',notserver:'For live data, run START_DASHBOARD.bat or python3 energy_server.py and open http://127.0.0.1:18765/en/energetski-monitor.html'},
  ru:{unavailable:'Данные недоступны',source:'Источник',time:'Измерено',retrieved:'Получено',cached:'Кешированные данные',fresh:'Данные доступны',delayed:'Задержка публикации данных',offline:'Источники недоступны',loading:'Подключение к источникам…',insightImport:'Нетто-импорт по физическому перетоку',insightExport:'Нетто-экспорт по физическому перетоку',insightGen:'Опубликованная генерация',insightNeed:'Недостаточно свежих данных для вывода.',with:'с',other:'Прочее',thermal:'Тепловая',hydro:'Гидро',wind:'Ветер',solar:'Солнце',bio:'Биомасса',renew:'ВИЭ',market:'Цена на сутки вперёд не является внутридневной котировкой',notserver:'Для автоматических данных запустите START_DASHBOARD.bat или python3 energy_server.py и откройте http://127.0.0.1:18765/ru/energetski-monitor.html'}
 }[lang];
 const $ = id => document.getElementById(id);
 const fmt = (v,decimal=0)=>Number.isFinite(v)?new Intl.NumberFormat(locale,{maximumFractionDigits:decimal,minimumFractionDigits:decimal}).format(v):'—';
 const dtf = iso=>{if(!iso)return '—';const d=new Date(iso);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Belgrade'}).format(d)+' CET/CEST'};
 const epoch = iso => {const v=Date.parse(iso);return Number.isFinite(v)?v:NaN};
 const text = (id,str)=>{let el=$(id);if(el)el.textContent=str};
 const chooseLatest = d => [...(d?.data||[])].reverse().find(r=>r?.values&&Object.values(r.values).some(v=>Number.isFinite(v)));
 const isStale = stamp => !stamp||!Number.isFinite(epoch(stamp))||Date.now()-epoch(stamp)>120*60000;
 const latestAtOrBeforeNow = d => {const now=Date.now()+5*60000;return [...(d?.data||[])].reverse().find(r=>epoch(r.timestamp)<=now&&Object.values(r.values||{}).some(v=>Number.isFinite(v)))};
 const titleBy = (id)=>{const map={thermal:tr.thermal,hydro:tr.hydro,wind:tr.wind,solar:tr.solar,bio:tr.bio,other:tr.other};return map[id]||id};
 const groups = [
  ['thermal',/coal|lignite|fossil|gas|oil|peat|waste_non_renew|nuclear/],
  ['hydro',/hydro|water|pumped/],['wind',/wind/],['solar',/solar/],['bio',/biomass|biogas|geothermal|other_renew|waste_renew/],
 ];
 const categorise = id=>/pumped/i.test(id)?'other':groups.find(([k,pattern])=>pattern.test(id.toLowerCase()))?.[0]||'other';
 const COLORS={thermal:'#2ca7ed',hydro:'#5de5c3',wind:'#a1dcff',solar:'#f5b960',bio:'#949fe4',other:'#7999b6'};
 const safe = s=>String(s||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const descriptors=d=>new Map((d?.series||[]).map(s=>[s.id,s]));
 const keyIsGeneration=k=>!/(share|forecast|price|percentage|capacity|demand|import|export|load|net_flow)/i.test(k)&&(/coal|lignite|fossil|gas|oil|peat|nuclear|hydro|water|pumped|wind|solar|biomass|biogas|geothermal|waste|renewable|marine|other/i.test(k))&&!/^(total|sum|production|generation|other_total)$/i.test(k);
 const unitConvert=(v,unit,target)=>{let u=String(unit||'').toLowerCase();if(!Number.isFinite(v))return NaN;if(target==='MW'){if(/\bgw\b/.test(u))return v*1000;if(/\bkw\b/.test(u))return v/1000;}return v};
 const sumProduction = (row,d)=>{if(!row)return NaN;const meta=descriptors(d);let n=0,sum=0;for(const [id,v] of Object.entries(row.values||{})){if(!keyIsGeneration(id))continue;let val=unitConvert(v,meta.get(id)?.unit||d.unit,'MW');if(Number.isFinite(val)){sum+=Math.max(0,val);n++}}return n?sum:NaN};
 const generationMix = (row,d)=>{if(!row)return {};const meta=descriptors(d),data={};for(const [id,v] of Object.entries(row.values||{})){if(!keyIsGeneration(id))continue;const value=unitConvert(v,meta.get(id)?.unit||d.unit,'MW');if(!Number.isFinite(value)||value<0)continue;const group=categorise(id);data[group]=(data[group]||0)+value;}return data};
 const loadFrom = datasets=>{
  for(const d of [datasets.actual_load,datasets.generation_total,datasets.production]){
   if(!d?.data?.length)continue;
   const row=latestAtOrBeforeNow(d);if(!row)continue;
   const id=Object.keys(row.values).find(k=>/^(load|demand|actual_load|consumption|total_load|system_load)$/i.test(k));
   if(id)return {value:unitConvert(row.values[id],descriptors(d).get(id)?.unit||d.unit,'MW'),timestamp:row.timestamp,dataset:d};
  }
  return null;
 };
 const flowSum = (row,ds)=>{
  if(!row)return null;const values=row.values||{},keys=Object.keys(values),all=descriptors(ds);
  const totalKey=keys.find(k=>/^(sum|net|net_import|net_imports|net_physical_flow|total)$/i.test(k));
  const raw= totalKey ? values[totalKey] : keys.length>0 ? keys.reduce((a,k)=>a+values[k],0):NaN;
  return Number.isFinite(raw)?unitConvert(raw,all.get(totalKey)?.unit||ds.unit,'MW'):null;
 };
 const pricePoint=ds=>{const row=latestAtOrBeforeNow(ds);if(!row)return null;const meta=descriptors(ds);
  const id=Object.keys(row.values||{}).find(k=>/price/i.test(k))||Object.keys(row.values||{})[0];
  if(!id)return null;const v=row.values[id];return Number.isFinite(v)?{value:v,timestamp:row.timestamp,unit:meta.get(id)?.unit||ds.unit}:null;
 };
 function setKpi(which,value,stamp,digits=0){text('kpi-'+which,Number.isFinite(value)?fmt(value,digits):'—');text('kpi-'+which+'-time',Number.isFinite(value)?dtf(stamp):tr.unavailable)}
 function svgLineChart(id,series,unit,multi=false){const slot=$(id);if(!slot)return;const valid=series.filter(s=>s.points?.length>1);if(!valid.length){slot.innerHTML='<span class="empty-chart">'+safe(tr.unavailable)+'</span>';return;}
  const W=840,H=320,pad={l:67,r:22,t:20,b:37},colors=['#43caff','#69e6cb','#ffa85b','#d99cee','#94a4fa'];let vals=valid.flatMap(s=>s.points.map(p=>p.v));
  let min=Math.min(...vals),max=Math.max(...vals);if(!Number.isFinite(min)||!Number.isFinite(max)){return};if(min===max){max+=Math.max(1,Math.abs(max)*.1);min-=Math.max(1,Math.abs(min)*.1)}
  if(min>0)min=0;const innerW=W-pad.l-pad.r,innerH=H-pad.t-pad.b;
  const ts=valid.flatMap(s=>s.points.map(p=>p.t));let mint=Math.min(...ts),maxt=Math.max(...ts);if(maxt===mint)maxt+=3600000;
  const x=t=>pad.l+(t-mint)/(maxt-mint)*innerW,y=v=>pad.t+(max-v)/(max-min)*innerH;
  const seg=[];for(let i=0;i<5;i++){let n=min+(max-min)*i,yy=y(n);seg.push(`<line class="chart-gridline" x1="${pad.l}" x2="${W-pad.r}" y1="${yy.toFixed(2)}" y2="${yy.toFixed(2)}"/><text text-anchor="end" x="${pad.l-10}" y="${(yy+4).toFixed(2)}">${fmt(n,0)}</text>`)}
  const lines=valid.map((s,index)=>{let pts=s.points.filter(p=>Number.isFinite(p.v)&&Number.isFinite(p.t)), path=pts.map((p,j)=>`${j?'L':'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');return `<path class="chart-path" stroke="${s.color||colors[index%colors.length]}" d="${path}"/>`}).join('');
  const labels=[0,0.33,0.67,1].map(a=>{let t=mint+(maxt-mint)*a;return `<text text-anchor="middle" x="${x(t)}" y="${H-7}">${new Intl.DateTimeFormat(locale,{day:'2-digit',month:'2-digit',hour:'2-digit',timeZone:'Europe/Belgrade'}).format(new Date(t))}</text>`}).join('');
  slot.innerHTML=`<svg role="presentation" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="g-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#207db5" stop-opacity=".15"/><stop offset="1" stop-color="#207db5" stop-opacity="0"/></linearGradient></defs>${seg.join('')}${lines}${labels}</svg>`;
 }
 function downsample(rows,maxPoints=90){const stride=Math.max(1,Math.ceil(rows.length/maxPoints));let result=rows.filter((_,i)=>i%stride===0);if(rows.length&&result[result.length-1]!==rows[rows.length-1])result.push(rows[rows.length-1]);return result}
 function renderMix(mx){const entries=Object.entries(mx).filter(([k,v])=>Number.isFinite(v)&&v>0).sort((a,b)=>b[1]-a[1]);let total=entries.reduce((a,[,v])=>a+v,0);const donut=$('mix-donut'),list=$('mix-list');if(!total){donut.style.background='';donut.innerHTML='';list.innerHTML='<p class="empty-chart">'+safe(tr.unavailable)+'</p>';return;}
  let at=0;const stops=entries.map(([key,val])=>{let start=at;at+=val/total*100;return `${COLORS[key]} ${start.toFixed(2)}% ${at.toFixed(2)}%`});
  donut.style.background=`radial-gradient(circle at center,#092239 0%,#092239 56%,transparent 57%),conic-gradient(${stops.join(',')})`;donut.style.border='0';donut.innerHTML=`<span>MW</span><strong>${fmt(total)}</strong>`;
  list.innerHTML=entries.map(([key,val])=>`<div class="mix-item"><i style="background:${COLORS[key]}"></i><span>${safe(titleBy(key))}</span><b>${fmt(val)}</b></div>`).join('')
 }
 let period='24h',last=null,busy=false;
 async function load(){if(busy)return;busy=true;$('refresh-energy').disabled=true;const status=$('monitor-status');try{
   const r=await fetch('/api/energy?range='+encodeURIComponent(period),{cache:'no-store',headers:{Accept:'application/json'}});
   if(!r.ok)throw new Error('HTTP '+r.status);const obj=await r.json();if(!obj.datasets)throw new Error('Missing datasets');last=obj;const D=obj.datasets;
   const production=D.production,productionRow=latestAtOrBeforeNow(production),mix=generationMix(productionRow,production);const prod=productionRow?sumProduction(productionRow,production):NaN;
   setKpi('production',prod,productionRow?.timestamp);
   const ld=loadFrom(D);setKpi('load',ld?.value,ld?.timestamp);
   const phys=D.physical_flows,flowRow=latestAtOrBeforeNow(phys),net=flowSum(flowRow,phys);setKpi('flow',net,flowRow?.timestamp);
   const p=pricePoint(D.day_ahead_price);setKpi('price',p?.value,p?.timestamp,2);
   const total=Object.values(mix).reduce((a,b)=>a+b,0),renew=['hydro','wind','solar','bio'].reduce((a,k)=>a+(mix[k]||0),0);
   setKpi('renew',total>0?100*renew/total:NaN,productionRow?.timestamp,1);
   text('kpi-renew-time',total>0?dtf(productionRow?.timestamp):tr.unavailable);
   renderMix(mix);
   // Production chart uses published source categories; keep maximum five lines and never invent load.
   const pRows=downsample(production?.data||[]),groupsToShow=Object.keys(mix).sort((a,b)=>mix[b]-mix[a]).slice(0,5);
   const series=groupsToShow.map(key=>({name:titleBy(key),color:COLORS[key],points:pRows.map(row=>({t:epoch(row.timestamp),v:generationMix(row,production)[key]})).filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v))}));
   svgLineChart('generation-chart',series,'MW',true);
   $('generation-legend').innerHTML=groupsToShow.map(k=>`<span><i style="background:${COLORS[k]}"></i>${safe(titleBy(k))}</span>`).join('');
   text('generation-ts',productionRow?tr.time+': '+dtf(productionRow.timestamp):'');
   const flowPts=downsample(phys?.data||[]).map(row=>({t:epoch(row.timestamp),v:flowSum(row,phys)})).filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v));
   svgLineChart('flow-chart',[{points:flowPts,color:'#5ee4cb'}],'MW');
   const meta=descriptors(phys),neighbours=Object.entries(flowRow?.values||{}).filter(([k,v])=>!/^(sum|total|net.*)$/i.test(k)&&Number.isFinite(v)).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).slice(0,8);
   $('flow-neighbors').innerHTML=neighbours.map(([k,v])=>`<div class="flow-neighbor"><span>${safe(meta.get(k)?.name||k)}</span><b>${fmt(unitConvert(v,meta.get(k)?.unit||phys.unit,'MW'))} MW</b></div>`).join('');
   const prices=downsample(D.day_ahead_price?.data||[]).map(row=>{const key=Object.keys(row.values||{}).find(k=>/price/i.test(k))||Object.keys(row.values||{})[0];return {t:epoch(row.timestamp),v:row.values?.[key]}}).filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v));
   svgLineChart('price-chart',[{points:prices,color:'#f5ba6c'}],'EUR/MWh');
   const seen=Object.values(D).filter(d=>d&&d.data?.length);
   const hasRecent=seen.some(d=>!isStale(d.timestamp)),hasAny=seen.length>0;
   const state=hasRecent?'live':hasAny?'delayed':'off';status.dataset.state=state;
   status.lastChild.textContent=state==='live'?tr.fresh:state==='delayed'?tr.delayed:tr.offline;
   text('fetch-status',tr.retrieved+': '+dtf(obj.server_time)+(hasAny?'  ·  '+seen.length+'/'+Object.keys(D).length:'  ·  '+tr.unavailable));
   const hints=[];if(Number.isFinite(net))hints.push(`${net>=0?tr.insightImport:tr.insightExport}: ${fmt(Math.abs(net))} MW (${dtf(flowRow.timestamp)})`);
   if(Number.isFinite(prod))hints.push(`${tr.insightGen}: ${fmt(prod)} MW (${dtf(productionRow.timestamp)})`);
   text('insight-content',hints.join(' · ')||tr.insightNeed);
   const available=Object.entries(D).filter(([k,v])=>v?.data?.length).map(([k,v])=>`${k} — ${dtf(v.timestamp)} (${v.status==='cached'?tr.cached:tr.fresh})`).join(' · ');
   text('source-observed',available||tr.unavailable);
   $('energy-server-hint').hidden=true;
  }catch(err){status.dataset.state='off';status.lastChild.textContent=tr.offline;text('fetch-status',tr.offline);
    const hint=$('energy-server-hint');hint.hidden=false;hint.textContent=tr.notserver;
    for(const id of ['kpi-production','kpi-load','kpi-flow','kpi-price','kpi-renew'])text(id,'—');
    text('insight-content',tr.insightNeed);
  }finally{busy=false;$('refresh-energy').disabled=false;}
 }
 document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.range;document.querySelectorAll('[data-range]').forEach(other=>{other.classList.toggle('active',other===b);other.setAttribute('aria-pressed',String(other===b))});load()}));
 $('refresh-energy')?.addEventListener('click',load);
 $('export-csv')?.addEventListener('click',()=>{
  if(!last?.datasets)return;
  const lines=[['dataset','timestamp','series','value','unit'].join(',')];
  for(const [kind,d] of Object.entries(last.datasets)){let map=descriptors(d);for(const r of d.data||[])for(const [key,value] of Object.entries(r.values||{})){const cols=[kind,r.timestamp,key,value,map.get(key)?.unit||d.unit||''];lines.push(cols.map(s=>'"'+String(s??'').replace(/"/g,'""')+'"').join(','))}}
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='GEH_Serbia_energy_'+period+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 load();setInterval(()=>{if(!document.hidden)load()},300000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&last&&Date.now()-epoch(last.server_time)>300000)load()});
})();
