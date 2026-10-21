import assert from 'node:assert/strict';
import fs from 'node:fs';
const img=fs.statSync('assets/img/geh-ccgt-illustration-v20.webp');
assert.ok(img.size>100000&&img.size<1500000,'optimized image asset');
const css=fs.readFileSync('assets/css/energy-v19.css','utf8');
assert.match(css,/\.v20-cinematic-scene/);assert.match(css,/prefers-reduced-motion/);
const js=fs.readFileSync('assets/js/energy-app-v19.mjs','utf8');
assert.match(js,/\[data-plant-focus\]/);assert.match(js,/v20-cinematic-scene/);
for(const lang of ['sr-lat','sr-cyr','en','ru']){
 const page=fs.readFileSync(`${lang}/energetski-monitor.html`,'utf8');
 assert.match(page,/geh-ccgt-illustration-v20.webp/);
 assert.match(page,/v20-cinematic-scene/);
 assert.equal((page.match(/class="v20-scene-point"/g)||[]).length,4);
 assert.match(page,/v20-technical-detail/);
 for(const n of [1,2,3,4])assert.ok(page.includes(`data-plant-focus="${n}"`));
}
console.log('PASS V20 visual source, interactivity, four languages, image, motion preferences');
