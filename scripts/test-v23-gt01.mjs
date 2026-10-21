import assert from 'node:assert/strict';
import fs from 'node:fs';
const req=['assets/js/te-to-gt01-pilot.mjs','assets/css/te-to-gt01-pilot.css','assets/img/gt01-pilot/gt01-shell.webp','assets/img/gt01-pilot/gt01-exposed.webp','assets/img/gt01-pilot/gt01-inner.webp','assets/img/gt01-pilot/registration.json'];
for(const p of req)assert(fs.existsSync(p),'Missing '+p);
const reg=JSON.parse(fs.readFileSync('assets/img/gt01-pilot/registration.json','utf8'));
for(const mode of ['shell','exposed','inner']){assert.equal(reg.modes[mode].unchanged_region_pixel_diffs,0);assert.deepEqual(reg.modes[mode].dimensions,[985,510])}
const js=fs.readFileSync(req[0],'utf8');
for(const k of ['shell','exposed','inner','gas','air','heat','power','prefers-reduced-motion','visibilitychange','v23-paused','aria-pressed'])assert(js.includes(k),k);
for(const lang of ['sr-lat','sr-cyr','en','ru']){
 const html=fs.readFileSync(lang+'/energetski-monitor.html','utf8');
 for(const k of ['id="v23-gt01-pilot"','te-to-gt01-pilot.mjs','te-to-gt01-pilot.css','id="pane-plant"','id="v19-machine-drawing"'])assert(html.includes(k),lang+' missing '+k);
}
console.log('PASS V23 GT-01 pilot: 4 locales / aligned images / UI hooks / legacy preserved');
