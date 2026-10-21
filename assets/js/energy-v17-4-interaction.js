/* GEH Serbia V17.4: observed-data exploration and contextual network inspector.
 * Runs entirely client-side on the established data contract. No synthetic values. */
(()=>{'use strict';
const root=document.body;if(!root.classList.contains('bc-v16'))return;
const lang=root.dataset.intelLang||'sr-lat';
const tr={
 'sr-lat':{all:'Svi izvori',obs:'Prijavljena proizvodnja',no:'Nema merenja',date:'Mereno',share:'Udeo',samples:'uzoraka',selected:'Izabrani izvor',missing:'Nema objavljenih merenja za ovu kategoriju',import:'Uvoz u Srbiju',export:'Izvoz iz Srbije',balance:'Nulti tok',unknown:'Nema podataka za granicu',coverage:'Objavljene granice',phys:'Fizički tok',trade:'Komercijalna razmena',trend:'Kretanje kroz period',latest:'Najnovije',historical:'Istorijski interval'},
 'sr-cyr':{all:'Сви извори',obs:'Пријављена производња',no:'Нема мерења',date:'Мерено',share:'Удео',samples:'узорака',selected:'Изабрани извор',missing:'Нема објављених мерења за категорију',import:'Увоз у Србију',export:'Извоз из Србије',balance:'Нулти ток',unknown:'Нема података за границу',coverage:'Објављене границе',phys:'Физички ток',trade:'Комерцијална размена',trend:'Кретање током периода',latest:'Најновије',historical:'Историјски интервал'},
 en:{all:'All sources',obs:'Reported generation',no:'No observations',date:'Observed',share:'Share',samples:'samples',selected:'Selected source',missing:'No published observations for this category',import:'Import into Serbia',export:'Export from Serbia',balance:'Zero flow',unknown:'No observation for this border',coverage:'Reported borders',phys:'Physical flow',trade:'Commercial exchange',trend:'Trend over selected period',latest:'Latest',historical:'Historical interval'},
 ru:{all:'Все источники',obs:'Учтённая выработка',no:'Нет измерений',date:'Измерено',share:'Доля',samples:'точек',selected:'Выбранный источник',missing:'Нет измерений для этой категории',import:'Импорт в Сербию',export:'Экспорт из Сербии',balance:'Нулевой переток',unknown:'Нет данных для границы',coverage:'Доступные границы',phys:'Физический переток',trade:'Коммерческий обмен',trend:'График за период',latest:'Последнее',historical:'Исторический интервал'}
}[lang];
const locale=lang==='en'?'en-GB':lang==='ru'?'ru-RU':'sr-RS';const $=id=>document.getElementById(id);
const fmt=(v,d=0)=>Number.isFinite(v)?new Intl.NumberFormat(locale,{maximumFractionDigits:d}).format(v):'n/d';
const time=t=>{const d=new Date(t);return t&&Number.isFinite(d.getTime())?new Intl.DateTimeFormat(locale,{timeZone:'Europe/Belgrade',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d):tr.no};
const colors={coal:'#8eb8d8',gas:'#4ecbf5',hydro:'#53ebc5',wind:'#a8a7ff',solar:'#ffbf75',other:'#b8cedf'};
const cats=['coal','gas','hydro','wind','solar','other'];
const catLabels={ 'sr-lat':['Ugalj','Gas','Hidro','Vetar','Solar','Ostalo'],'sr-cyr':['Угаљ','Гас','Хидро','Ветар','Сунце','Остало'],en:['Coal','Gas','Hydro','Wind','Solar','Other'],ru:['Уголь','Газ','Гидро','Ветер','Солнце','Прочее']}[lang];
let payload=null, prodTime=null, sel=null, previewIndex=null, list=[],currentRange='24h',lastGrid=null;
function classify(k){k=String(k).toLowerCase();if(/share|percent|total|sum|capacity|forecast|load|demand|price|balance|import|export/.test(k))return null;if(/pumped_storage|pumped_hydro/.test(k))return'other';if(/biogas|biomass|geothermal|bioenergy|waste/.test(k))return'other';if(/gas/.test(k))return'gas';if(/coal|lignite/.test(k))return'coal';if(/hydro|run.of.river|water/.test(k))return'hydro';if(/wind/.test(k))return'wind';if(/solar|photovoltaic/.test(k))return'solar';if(/oil|fossil|peat|other|nuclear/.test(k))return'other';return null}
function mw(n,u){if(!Number.isFinite(n))return null;u=String(u||'').toLowerCase();return u==='gw'?n*1000:u==='kw'?n/1000:n}
function mix(ds,row){const desc=new Map((ds?.series||[]).map(s=>[s.id,s.unit]));const r={};for(const [k,n] of Object.entries(row?.values||{})){if(!Number.isFinite(n))continue;const cat=classify(k);if(!cat)continue;const v=mw(n,desc.get(k)||ds.unit);if(v===null||v<0)continue;r[cat]=(r[cat]||0)+v}return r}
const sum=a=>Object.values(a).reduce((a,b)=>a+b,0);
function rows(){const ds=payload?.datasets?.production;return(ds?.data||[]).filter(r=>Number.isFinite(Date.parse(r.timestamp))&&Date.parse(r.timestamp)<Date.now()+3600000).map(r=>({stamp:r.timestamp,date:Date.parse(r.timestamp),values:mix(ds,r)})).sort((a,b)=>a.date-b.date).filter(r=>Object.keys(r.values).length)}
function rebuild(){list=rows();let idx=previewIndex===null?list.length-1:Math.max(0,Math.min(previewIndex,list.length-1));let slider=$('v174-flow-slider');slider.max=String(Math.max(0,list.length-1));slider.disabled=list.length<2;slider.value=String(Math.max(0,idx));display()}
function selection(){const active=document.querySelector('[data-energy][aria-pressed="true"]');return active?.dataset.energy||null}
function display(){sel=selection();const current=list[previewIndex===null?list.length-1:Math.max(0,Math.min(previewIndex,list.length-1))];const values=current?.values||{},total=sum(values),value=sel?values[sel]:total;
const i=cats.indexOf(sel);$('v174-flow-heading').textContent=sel?catLabels[i]:tr.all;
$('v174-flow-share').textContent=sel&&Number.isFinite(value)&&total>0?fmt(100*value/total,1)+'%':(!sel&&total>0?'100%':'n/d');
$('v174-flow-count').textContent=list.length+' '+tr.samples;
$('v174-flow-subtitle').textContent=Number.isFinite(value)&&current?(fmt(value)+' MW   ·   '+tr.date+': '+time(current.stamp)):(tr.missing);
$('v174-flow-time').textContent=current?time(current.stamp):tr.no;
let rowsNode=$('v174-mix-rows');rowsNode.replaceChildren();
for(let j=0;j<cats.length;j++){let k=cats[j],v=values[k],pct=Number.isFinite(v)&&total>0?100*v/total:null;
 let btn=document.createElement('button');btn.type='button';btn.className='v174-mix-item'+(sel===k?' is-selected':'');btn.disabled=!Number.isFinite(v);btn.setAttribute('aria-pressed',String(sel===k));btn.dataset.kind=k;
 let label=document.createElement('span');label.textContent=catLabels[j];let num=document.createElement('strong');num.textContent=Number.isFinite(v)?fmt(v)+' MW':'n/d';let meter=document.createElement('i');let fill=document.createElement('b');fill.style.width=Number.isFinite(pct)?Math.min(pct,100).toFixed(2)+'%':'0%';fill.style.background=colors[k];meter.append(fill);btn.append(label,num,meter);btn.addEventListener('click',()=>{const n=document.querySelector(`[data-energy="${k}"]`);n?.click()});rowsNode.append(btn)}
renderChart();}
function renderChart(){const el=$('v174-flow-chart');el.replaceChildren();if(!list.length){el.textContent=tr.no;return}const series=list.map((r,i)=>({i,x:r.date,y:sel?(Number.isFinite(r.values[sel])?r.values[sel]:null):sum(r.values)}));
const valid=series.filter(p=>Number.isFinite(p.y));if(!valid.length){el.textContent=tr.missing;return}
const w=720,h=172,top=14,bottom=148,left=18,right=704,max=Math.max(1,...valid.map(x=>x.y))*1.11,min=0;
const point=p=>[(left+(p.i/Math.max(1,series.length-1))*(right-left)),bottom-(p.y-min)/(max-min)*(bottom-top)];
let d='',on=false;for(const p of series){if(!Number.isFinite(p.y)){on=false;continue}const [x,y]=point(p);d+=(on?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';on=true}
const ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};const svg=make('svg',{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'none','aria-hidden':'true'});
for(let i=0;i<4;i++){let y=top+(bottom-top)*i/3;svg.append(make('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#24536f','stroke-opacity':'.5','stroke-dasharray':'3 9'}))}
svg.append(make('path',{d,fill:'none',stroke:sel?colors[sel]:'#55c8fa','stroke-width':'3','stroke-linejoin':'round','stroke-linecap':'round'}));
const idx=previewIndex===null?list.length-1:previewIndex;const v=series[idx];if(v&&Number.isFinite(v.y)){let [x,y]=point(v);svg.append(make('line',{x1:x,y1:top,x2:x,y2:bottom,stroke:'#c9edff','stroke-opacity':'.52','stroke-dasharray':'4 5'}));svg.append(make('circle',{cx:x,cy:y,r:'5.1',fill:'#e4f9ff',stroke:sel?colors[sel]:'#55c8fa','stroke-width':'3'}))}
const cursor=make('rect',{x:left,y:0,width:right-left,height:h,fill:'transparent',style:'cursor:crosshair'});svg.append(cursor);function seek(ev){const rect=svg.getBoundingClientRect();if(!rect.width)return;const ratio=Math.max(0,Math.min(1,(ev.clientX-rect.left)/rect.width));const i=Math.max(0,Math.min(list.length-1,Math.round(ratio*(list.length-1))));setPreview(i)}cursor.addEventListener('click',seek);
const foot=document.createElement('div');foot.className='v174-chart-caption';foot.textContent=`${tr.trend}   ·   ${fmt(valid.length)} / ${fmt(list.length)} ${tr.samples}`;
el.append(svg,foot)}
function setPreview(i){previewIndex=i;let slider=$('v174-flow-slider');slider.value=String(i);document.dispatchEvent(new CustomEvent('geh:v174-production-time',{detail:{timestamp:list[i]?.date??null}}));display()}
$('v174-flow-slider')?.addEventListener('input',e=>setPreview(Number(e.target.value)));
$('v174-flow-latest')?.addEventListener('click',()=>{previewIndex=null;document.dispatchEvent(new CustomEvent('geh:v174-production-time',{detail:{timestamp:null}}));rebuild()});
document.querySelectorAll('[data-energy]').forEach(el=>el.addEventListener('click',()=>queueMicrotask(display)));
$('bc-clear')?.addEventListener('click',()=>queueMicrotask(display));
function grid(detail){lastGrid=detail;const {borders={},selected='HU',flow='physical',time:stamp,sourceStatus='unavailable'}=detail;
const available=Object.values(borders).filter(Number.isFinite).length;
const labels=[...document.querySelectorAll('[data-border]')];
for(let n of labels){let code=n.dataset.border,v=borders[code];const badge=n.querySelector('.v174-border-reading');if(!badge)continue;badge.textContent=Number.isFinite(v)?((flow==='physical'?(v>0?'← ':v<0?'→ ':'• '):'')+fmt(Math.abs(v))+' MW'):'n/d';n.classList.toggle('v174-in',Number.isFinite(v)&&v>0&&flow==='physical');n.classList.toggle('v174-out',Number.isFinite(v)&&v<0&&flow==='physical');n.classList.toggle('v174-unavailable',!Number.isFinite(v));}
const info=$('v174-border-meter');if(!info)return;const v=borders[selected],physical=flow==='physical';const h=document.createElement('strong');h.textContent=selected+'   '+(Number.isFinite(v)?(physical?(v>0?tr.import:v<0?tr.export:tr.balance):tr.trade):tr.unknown);
const measure=document.createElement('span');measure.textContent=Number.isFinite(v)?fmt(physical?Math.abs(v):v)+' MW':'n/d';const sub=document.createElement('small');sub.textContent=(physical?tr.phys:tr.trade)+'   ·   '+tr.coverage+': '+available+'/8   ·   '+tr.date+': '+time(stamp)+(sourceStatus==='cached'?' · cache':'');info.replaceChildren(h,measure,sub);
const txt=$('v174-grid-explain');if(txt)txt.textContent=physical?(available===8?tr.phys+' · '+tr.date+': '+time(stamp):tr.coverage+': '+available+'/8. '+(lang==='en'?'Incomplete observations are not added to a national balance.':'Nepotpuna merenja se ne sabiraju u nacionalni saldo.')):tr.trade+' · '+(lang==='en'?'Contractual schedules, not physical electricity flow.':'Ugovorene razmene, ne fizički tok energije.');
}
document.addEventListener('geh:v174-border-view',e=>grid(e.detail));
function update(payloadInfo){payload=payloadInfo.payload;currentRange=payloadInfo.period;previewIndex=null;document.dispatchEvent(new CustomEvent('geh:v174-production-time',{detail:{timestamp:null}}));rebuild()}
document.addEventListener('geh:energy-data',e=>update(e.detail));if(window.GEH_V16_last)update(window.GEH_V16_last);
})();
