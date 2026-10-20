
/* GEH V7 — progressive enhancement for editorial reveals; accessibility-first. */
(()=>{const d=document,reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce && 'IntersectionObserver' in window){
 const targets=[...d.querySelectorAll('[data-reveal]')];
 const obs=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');obs.unobserve(entry.target)}}},{threshold:.08,rootMargin:'0px 0px 60px 0px'});
 d.documentElement.classList.add('motion-ready');targets.forEach(el=>obs.observe(el));
}
})();
