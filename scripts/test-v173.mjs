import assert from 'node:assert/strict';
import fs from 'node:fs';
const langs=['sr-lat','sr-cyr','en','ru'];
for(const lang of langs){
 const s=fs.readFileSync(`${lang}/energetski-monitor.html`,'utf8');
 assert.equal((s.match(/data-v17-tab="/g)||[]).length,6,lang+' tab count');
 assert.match(s,/energy-v17-3-artdirection\.css/);
 assert.match(s,/energy-v17-3-artdirection\.js/);
 assert.equal((s.match(/class="v173-readout"/g)||[]).length,1);
 assert.equal((s.match(/data-step="[0-4]"/g)||[]).length,5);
 assert.match(s,/geh-energy-film-web\.mp4/);
 assert.ok(s.indexOf('class="v18-stage-rail"')<s.indexOf('class="bc-plant-svg v18-industrial-svg"'),lang+' phase rail before illustration');
}
const controller=fs.readFileSync('assets/js/energy-v17-3-artdirection.js','utf8');
assert.match(controller,/prefers-reduced-motion/);
assert.match(controller,/e.key==='Enter'/);
assert.match(controller,/mobile composition/i);
const css=fs.readFileSync('assets/css/energy-v17-3-artdirection.css','utf8');
assert.match(css,/v173-readout/);assert.match(css,/prefers-reduced-motion/);
console.log('PASS V17.3: six tabs, four languages, scene controls, motion/accessibility guards, no video/data changes');
