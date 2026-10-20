import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
for(const lang of ['sr-lat','sr-cyr','en','ru']){
 const html=fs.readFileSync(path.join(lang,'energetski-monitor.html'),'utf8');
 assert.match(html,/energy-v17-(?:2-industrial|3-artdirection)\.css/);assert.match(html,/energy-v17-(?:2-industrial|3-artdirection)\.js/);
 assert.equal((html.match(/class="[^"]*v18-industrial-svg/g)||[]).length,1);
 assert.equal((html.match(/data-v18-cutaway="true"/g)||[]).length,1);
 assert.equal((html.match(/data-v18-cutaway="false"/g)||[]).length,1);
 assert.equal((html.match(/data-v18-reset/g)||[]).length,1);
 assert.equal((html.match(/data-step="[0-4]"/g)||[]).length,5);
 for(const slug of ['intro','flow','grid','analysis','plant','sources'])assert.match(html,new RegExp('data-v17-panel="'+slug+'"'));
 assert.match(html,/geh-energy-film-web\.mp4/);
 assert.match(html,/v18-plant-art/);
}
for(const file of ['assets/css/energy-v17-3-artdirection.css','assets/js/energy-v17-3-artdirection.js','assets/js/energy-v17-motion.js','.nojekyll','.github/workflows/pages-energy.yml'])assert.ok(fs.statSync(file).size>10,file);
const motion=fs.readFileSync('assets/js/energy-v17-motion.js','utf8');assert.match(motion,/\.v18-plant-art/);
const controller=fs.readFileSync('assets/js/energy-v17-3-artdirection.js','utf8');assert.match(controller,/reduced-motion/);assert.match(controller,/data-v18-reset/);
console.log('PASS V17.2 invariants on V17.3: 4 languages, cutaway/exterior, focus stage, six tabs, original film, motion guardrails');
