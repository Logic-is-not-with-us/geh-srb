/* GEH / V17 Film Experience. Isolated controller, no changes to data fetching. */
(()=>{'use strict';
const tabs=[...document.querySelectorAll('[data-v17-tab]')];
if(!tabs.length)return;
const panels=[...document.querySelectorAll('[data-v17-panel]')];
const video=document.getElementById('v17-hero-video');
const play=document.getElementById('v17-film-play');
const sound=document.getElementById('v17-film-sound');
const lang=document.body.dataset.intelLang;
const labels={
'sr-lat':{play:'Pokreni film',pause:'Pauziraj',sound:'Uključi zvuk',mute:'Isključi zvuk'},
'sr-cyr':{play:'Покрени филм',pause:'Паузирај',sound:'Укључи звук',mute:'Искључи звук'},
en:{play:'Play film',pause:'Pause film',sound:'Enable sound',mute:'Mute'},
ru:{play:'Воспроизвести фильм',pause:'Пауза',sound:'Включить звук',mute:'Выключить звук'}}[lang]||{play:'Play film',pause:'Pause film',sound:'Enable sound',mute:'Mute'};
const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced=()=>motion.matches||document.body.classList.contains('bc-motion-off')||navigator.connection?.saveData===true;
let current='intro';
function paintPlayback(){if(play)play.innerHTML=(video?.paused?'▶ ':'Ⅱ ')+'<span>'+(video?.paused?labels.play:labels.pause)+'</span>';if(sound)sound.textContent=video?.muted?labels.sound:labels.mute;}
async function resume(){if(!video||reduced()||document.hidden||current!=='intro')return;try{await video.play()}catch{/* mobile autoplay policy; poster and explicit play remain available */}paintPlayback()}
function switchTab(slug,opts={}){
 if(!panels.some(x=>x.dataset.v17Panel===slug))return;
 current=slug;
 for(const tab of tabs){const on=tab.dataset.v17Tab===slug;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;}
 for(const panel of panels)panel.hidden=panel.dataset.v17Panel!==slug;
 if(slug!=='intro')video?.pause();else void resume();
 if(!opts.noHistory){try{history.replaceState(null,'','#'+slug)}catch{}}
 if(!opts.noScroll){document.querySelector('.v17-nav')?.scrollIntoView({behavior:'instant',block:'start'})}
 window.dispatchEvent(new Event('resize'));
 paintPlayback();
}
tabs.forEach((tab,i)=>{
 tab.addEventListener('click',()=>switchTab(tab.dataset.v17Tab));
 tab.addEventListener('keydown',e=>{const move=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
 let newIndex=move?(i+move+tabs.length)%tabs.length:e.key==='Home'?0:e.key==='End'?tabs.length-1:null;
 if(newIndex!==null){e.preventDefault();tabs[newIndex].focus();switchTab(tabs[newIndex].dataset.v17Tab)}});
});
document.querySelectorAll('[data-v17-open]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();switchTab(el.dataset.v17Open)}));
// Existing data-driven links within a tab now open the correct destination panel.
const panelByAnchor={ 'bc-top':'flow','bc-grid':'grid','bc-analysis':'analysis','bc-plant':'plant','method':'sources','overview':'flow'};
document.addEventListener('click',e=>{const a=e.target.closest?.('a[href^="#"]');if(!a)return;const id=a.getAttribute('href').slice(1);if(panelByAnchor[id]&&panelByAnchor[id]!==current){switchTab(panelByAnchor[id]);}});
play?.addEventListener('click',async()=>{if(!video)return;if(video.paused){try{await video.play()}catch{}}else video.pause();paintPlayback()});
sound?.addEventListener('click',()=>{if(!video)return;video.muted=!video.muted;paintPlayback()});
video?.addEventListener('play',paintPlayback);video?.addEventListener('pause',paintPlayback);
document.addEventListener('visibilitychange',()=>{if(document.hidden)video?.pause();else if(current==='intro')void resume()});
document.getElementById('bc-motion-toggle')?.addEventListener('click',()=>{if(reduced())video?.pause();else if(current==='intro')void resume()});
if(motion.addEventListener)motion.addEventListener('change',()=>{if(reduced())video?.pause();else void resume()});
let hash=decodeURIComponent(location.hash.slice(1));
let initial=panels.some(p=>p.dataset.v17Panel===hash)?hash:panelByAnchor[hash]||'intro';
switchTab(initial,{noHistory:true,noScroll:true});
paintPlayback();
})();
