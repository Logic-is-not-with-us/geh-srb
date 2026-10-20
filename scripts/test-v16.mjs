#!/usr/bin/env node
// Structural deployment guardrails. Dynamic interaction tests are separately run in headless Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const langs=['sr-lat','sr-cyr','en','ru'];
const css=read('assets/css/energy-v16.css');
const js=read('assets/js/energy-v16.js');
const legacy=read('assets/js/energy-console-v15.js');
assert(css.includes('bc-current-path')&&css.includes('prefers-reduced-motion'));
assert(js.includes('geh:energy-data')&&js.includes('commercial_exchange'));
assert(js.includes('bc-border-value')&&js.includes('is-moving'));
assert(legacy.includes("window.GEH_V16_last={payload,period,demo}"));
for(const lang of langs){
 const html=read(lang+'/energetski-monitor.html');
 for(const asset of ['../assets/css/energy-v16.css','../assets/js/energy-console-v15.js','../assets/js/energy-v16.js'])assert(html.includes(asset),lang+' missing '+asset);
 for(const id of ['bc-top','bc-system','bc-grid','bc-time-slider','bc-plant','bc-guide-next','bc-analysis','method','intel-sources','intel-export','intel-pill'])assert(html.includes('id="'+id+'"'),lang+' missing '+id);
 assert((html.match(/data-energy="(?:coal|gas|hydro|wind|solar|other)"/g)||[]).length===6,lang+' fuel count');
 assert((html.match(/data-border="(?:HU|RO|BG|MK|XK|ME|BA|HR)"/g)||[]).length===8,lang+' border count');
 assert((html.match(/data-lab="[0-3]"/g)||[]).length===4,lang+' analytics tab count');
 assert(html.includes('noindex,nofollow'),'Preview robots guard');
 const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,lang+' duplicate id');
}
assert(fs.existsSync(new URL('.nojekyll',root)),'nojekyll needed');
for(const p of ['data/energy/24h.json','data/energy/7d.json','data/energy/30d.json']){
 const raw=JSON.parse(read(p));assert.notEqual(raw.mode,'explicit-demo','Demo fixture cannot be packaged publicly');
}
console.log('PASS V16: four languages, assets, controls, source hook, no duplicate ids, static-safe JSON, nojekyll');
