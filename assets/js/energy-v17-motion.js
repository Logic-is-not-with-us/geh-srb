/* GEH Serbia V17.1 — independent cinematic motion engine.
   Physical particles only appear on OBSERVED, non-stale series with non-zero
   published values. Educational turbine motion does NOT imply plant telemetry.
   No network requests, no third-party assets, no persistent storage. */
(()=>{'use strict';
const body=document.body;if(!body?.classList.contains('bc-v16'))return;
const NS='http://www.w3.org/2000/svg';
const make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n};
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const active=slug=>{const panel=document.querySelector(`[data-v17-panel="${slug}"]`);return panel&&!panel.hidden};
const permitted=()=>!document.hidden&&(active('flow')||active('grid'))&&!reduced.matches&&!body.classList.contains('bc-motion-off')&&navigator.connection?.saveData!==true;
const tracks=[...document.querySelectorAll('.bc-current-path[data-path],.bc-border-path[data-border-path]')].map((path)=>{
 const parent=path.parentNode;const layer=make('g',{'class':'v17-motion-particles','aria-hidden':'true','pointer-events':'none'});
 const dots=[0,1,2].map((i)=>{const halo=make('circle',{'class':'v17-particle-halo',r:6,opacity:0});const dot=make('circle',{'class':'v17-particle-core',r:i===0?2.6:2,opacity:0});layer.append(halo,dot);return {halo,dot}});
 parent.appendChild(layer);
 return{path,dots,len:0,failed:false};
});
function dimension(t){if(t.len||t.failed)return;try{t.len=t.path.getTotalLength()}catch{t.failed=true}}
let raf=0,last=0;
function tick(time){raf=0;if(!permitted())return;
 if(time-last>=30){last=time;
  for(const tr of tracks){const p=tr.path;const grid=p.hasAttribute('data-border-path');const on=grid?active('grid')&&p.classList.contains('is-moving')&&!p.classList.contains('is-commercial'):active('flow')&&p.classList.contains('is-observed');
   if(!on){for(const dot of tr.dots){dot.halo.style.opacity='0';dot.dot.style.opacity='0'}continue}
   dimension(tr);if(!tr.len)continue;
   const direction=grid&&p.classList.contains('is-import')?-1:1;const dur=grid?3800:4900;
   for(let i=0;i<tr.dots.length;i++){
    const phase=(((time/dur)+(i/tr.dots.length))%1),progress=direction<0?1-phase:phase;
    const point=p.getPointAtLength(Math.max(0,Math.min(tr.len,tr.len*progress)));
    const intensity=Math.min(1,Math.sin(Math.PI*phase)*2.5);
    const {halo,dot}=tr.dots[i];for(const c of [halo,dot]){c.setAttribute('cx',point.x.toFixed(2));c.setAttribute('cy',point.y.toFixed(2));c.style.opacity=String(intensity)}
   }
  }
 }
 raf=requestAnimationFrame(tick);
}
function start(){if(!raf&&permitted())raf=requestAnimationFrame(tick)}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;for(const t of tracks)for(const x of t.dots){x.halo.style.opacity='0';x.dot.style.opacity='0'}}
function svgEnhance(){if(document.querySelector('.v18-plant-art'))return;const scene=document.querySelector('.bc-plant-svg');if(!scene)return;
 const turbine=scene.querySelector('.bc-turbine-machine'),generator=scene.querySelector('.bc-generator-machine'),heat=scene.querySelector('.bc-heat-recovery');
 if(turbine){
  // Deliberately illustrative rotor internals: projected engineering cutaway.
  const carrier=make('g',{'class':'v17-rotor-carrier'});
  carrier.append(make('ellipse',{cx:285,cy:354,rx:48,ry:22,fill:'#041c2c',stroke:'#62ddff','stroke-width':2.2,opacity:.95}));
  const rotor=make('g',{'class':'v17-rotor-wheel'});
  for(let i=0;i<16;i++){
   const a=i*22.5,blade=make('path',{d:'M 284 348 Q 294 333 304 338 L 300 350 Q 292 355 285 356 Z',fill:i%2?'#65bcd6':'#b5e7f8',stroke:'#28627c','stroke-width':.65,transform:`rotate(${a} 285 354)`});rotor.appendChild(blade);
  }
  rotor.append(make('circle',{cx:285,cy:354,r:10,fill:'#0d4b68',stroke:'#b3edff','stroke-width':2}),make('circle',{cx:285,cy:354,r:3,fill:'#e1faff'}));
  carrier.append(rotor,make('ellipse',{cx:285,cy:354,rx:51,ry:23,fill:'none',stroke:'#5bd3ef','stroke-dasharray':'2 6',opacity:.55}));turbine.appendChild(carrier);
 }
 if(generator){const g=make('g',{'class':'v17-generator-coils'});for(let i=0;i<7;i++){
  g.append(make('path',{d:`M ${453+i*13} ${358+i*4.2} l 0 24`,stroke:'#9dd8f2','stroke-width':2,'stroke-linecap':'round',opacity:i%2?.36:.7}));
 }g.append(make('path',{d:'M 443 392 Q 493 367 563 398',fill:'none',stroke:'#64d6f4','stroke-width':2.5,'stroke-dasharray':'5 5'}));generator.append(g)}
 if(heat){const g=make('g',{'class':'v17-hrsg-detail'});for(let i=0;i<5;i++){
  g.append(make('path',{d:`M ${506+i*19} ${261+i*5} l 0 91`,stroke:'#7dbbd0','stroke-width':3,opacity:.6}));
  g.append(make('path',{d:`M ${509+i*18} ${275+i*6} l 42 16`,stroke:'#90c7de','stroke-width':1,opacity:.36}));
 }heat.append(g)}
 const plant=document.querySelector('.bc-plant-art');const buttons=[...document.querySelectorAll('[data-step]')];
 const semantic=['gas','turbine','generator','heat','steam'];
 function follow(){const pressed=buttons.find(b=>b.getAttribute('aria-pressed')==='true');const i=Math.max(0,Number(pressed?.dataset.step||'0'));plant.dataset.v17Focus=semantic[i];}
 const observer=new MutationObserver(follow);for(const b of buttons)observer.observe(b,{attributes:true,attributeFilter:['aria-pressed']});follow();
}
svgEnhance();
// The existing motion switch governs all our effects as well.
const observer=new MutationObserver(()=>{if(permitted())start();else stop()});observer.observe(body,{attributes:true,attributeFilter:['class']});
document.addEventListener('visibilitychange',()=>permitted()?start():stop());
reduced.addEventListener?.('change',()=>permitted()?start():stop());
document.querySelectorAll('[data-v17-panel]').forEach(panel=>{new MutationObserver(()=>{stop();start()}).observe(panel,{attributes:true,attributeFilter:['hidden']})});
document.querySelectorAll('[data-v17-tab]').forEach(t=>t.addEventListener('click',()=>{stop();start()}));
window.addEventListener('pageshow',start);start();
})();
