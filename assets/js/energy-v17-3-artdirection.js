/* GEH Serbia — V17.2 Industrial Atlas: tech process illustration only.
   Does not fetch, estimate, or alter operational energy data. */
(()=>{'use strict';
const art=document.querySelector('.v18-plant-art');if(!art)return;
const svg=art.querySelector('.v18-industrial-svg');const cutButtons=[...art.querySelectorAll('[data-v18-cutaway]')];
const rail=[...art.querySelectorAll('[data-step]')];const reset=art.querySelector('[data-v18-reset]');
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
const boxes=[[0,0,820,570],[46,225,420,295],[121,285,320,230],[360,302,214,180],[551,95,248,390],[594,55,206,240]];
const full=boxes[0],stepIdx=[1,2,3,4,5];let current=full.slice(),frame=0,focus=0,zoom=false;
const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0};
function changeBox(to,animate=true){stop();const start=current.slice(),target=to.slice();const reduced=motion.matches||document.body.classList.contains('bc-motion-off');if(!animate||reduced||!document.querySelector('[data-v17-panel="plant"]:not([hidden])')){current=target;svg.setAttribute('viewBox',current.join(' '));return}
const t0=performance.now(),duration=520;function draw(time){let v=Math.min(1,(time-t0)/duration);v=1-Math.pow(1-v,3);current=start.map((n,i)=>n+(target[i]-n)*v);svg.setAttribute('viewBox',current.map(x=>x.toFixed(2)).join(' '));frame=v<1?requestAnimationFrame(draw):0}frame=requestAnimationFrame(draw)}
function setFocus(i,shouldZoom=true){focus=Math.max(0,Math.min(4,i));art.dataset.v18Focus=['gas','turbine','generator','heat','steam'][focus];zoom=shouldZoom;if(zoom)changeBox(boxes[stepIdx[focus]]);else changeBox(full)}
function setCutaway(on){art.classList.toggle('is-cutaway',on);for(const btn of cutButtons)btn.setAttribute('aria-pressed',String(btn.dataset.v18Cutaway===String(on)))}
cutButtons.forEach(btn=>btn.addEventListener('click',()=>setCutaway(btn.dataset.v18Cutaway==='true')));
reset?.addEventListener('click',()=>{zoom=false;changeBox(full)});
rail.forEach(btn=>btn.addEventListener('click',()=>{setFocus(Number(btn.dataset.step));(()=>{const r=btn.parentElement;if(r&&r.scrollWidth>r.clientWidth){r.scrollTo({left:Math.max(0,btn.offsetLeft-r.offsetLeft-r.clientWidth/2+btn.offsetWidth/2),behavior:motion.matches?'instant':'smooth'})}})()}));
// Existing guided tour updates aria-pressed on stage buttons; mirror it to the camera.
const obs=new MutationObserver(()=>{const active=rail.find(b=>b.getAttribute('aria-pressed')==='true');if(active){const i=Number(active.dataset.step);if(i!==focus)setFocus(i,zoom)}});rail.forEach(btn=>obs.observe(btn,{attributes:true,attributeFilter:['aria-pressed']}));
// SVG pointer hit-tests reuse genuine guided-tour steps, including keyboard-accessible buttons.
const targetMap={turbine:1,generator:2,heat:3};
svg.querySelectorAll('.v18-focusable').forEach(el=>el.addEventListener('click',()=>{const i=targetMap[el.dataset.focus];rail[i]?.click()}));
// Pause any zoom animation when tab is closed; restore requested view when reopened.
const panel=document.querySelector('[data-v17-panel="plant"]');if(panel)new MutationObserver(()=>{if(panel.hidden)stop();else changeBox(zoom?boxes[stepIdx[focus]]:full,false)}).observe(panel,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('pagehide',stop);
art.dataset.v18Focus='gas';setCutaway(true);
})();


/* V17.3 / informative focus rail + animation orchestration; no data calculations. */
(()=>{'use strict';
const scene=document.querySelector('.v18-plant-art');if(!scene)return;
const panel=document.querySelector('[data-v17-panel="plant"]');const focusTxt=scene.querySelector('[data-v173-label]');
const focusNo=scene.querySelector('[data-v173-index]');const progress=scene.querySelector('.v173-progress>span');
const stages=[...scene.querySelectorAll('.v18-stage-rail [data-step]')];
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const state=()=>!document.hidden&&!panel.hidden&&!document.body.classList.contains('bc-motion-off')&&!reduced.matches;
function sync(){const active=stages.findIndex(x=>x.getAttribute('aria-pressed')==='true');const pos=active>=0?active:0;const selected=stages[pos];
if(focusTxt)focusTxt.textContent=selected?.querySelector('strong')?.textContent||'';
if(focusNo)focusNo.textContent=String(pos+1).padStart(2,'0')+' / 05';
if(progress)progress.style.width=((pos+1)*20)+'%';
scene.classList.toggle('v173-motion-running',state());
}
const observer=new MutationObserver(sync);stages.forEach(x=>observer.observe(x,{attributes:true,attributeFilter:['aria-pressed']}));
observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
for(const btn of stages)btn.addEventListener('click',()=>queueMicrotask(sync));
for(const g of scene.querySelectorAll('.v18-focusable')){
  const kind=g.getAttribute('data-focus');const idx=kind==='turbine'?1:kind==='generator'?2:kind==='heat'?3:-1;
  if(idx<0)continue;
  g.setAttribute('tabindex','0');g.setAttribute('role','button');
  g.setAttribute('aria-label',stages[idx]?.querySelector('strong')?.textContent||kind);
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();stages[idx]?.click();}});
}
document.addEventListener('visibilitychange',sync);
reduced.addEventListener?.('change',sync);
document.getElementById('bc-motion-toggle')?.addEventListener('click',()=>queueMicrotask(sync));
sync();
})();

/* V17.3 mobile composition: show the illustrated machine before the long explanatory copy.
   DOM order follows presentation order, including keyboard and screen readers. */
(()=>{'use strict';
 const container=document.querySelector('.bc-plant-scene');if(!container)return;
 const copy=container.querySelector('.bc-plant-intro');const art=container.querySelector('.v18-plant-art');
 if(!copy||!art)return;
 const mq=matchMedia('(max-width:720px)');
 function arrange(){if(mq.matches){if(container.firstElementChild!==art)container.insertBefore(art,copy)}
 else if(container.firstElementChild!==copy)container.insertBefore(copy,art)}
 mq.addEventListener?.('change',arrange);arrange();
})();
