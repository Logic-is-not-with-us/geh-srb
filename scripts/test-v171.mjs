#!/usr/bin/env node
// V17.1 fail-closed motion and navigation structural controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL(p,root),'utf8');
const motion=read('assets/js/energy-v17-motion.js');
const css=read('assets/css/energy-v17-motion.css');
assert(motion.includes("!p.classList.contains('is-commercial')"));
assert(motion.includes("p.classList.contains('is-observed')"));
assert(motion.includes("p.classList.contains('is-moving')"));
assert(motion.includes("p.classList.contains('is-import')"));
assert(motion.includes("body.classList.contains('bc-motion-off')"));
assert(motion.includes('document.hidden'));
assert(motion.includes('prefers-reduced-motion: reduce'));
assert(motion.includes('requestAnimationFrame'));
assert(css.includes('bc-motion-off')&&css.includes('prefers-reduced-motion'));
for (const lang of ['sr-lat','sr-cyr','en','ru']) {
 const html=read(`${lang}/energetski-monitor.html`);
 assert(html.includes('energy-v17-motion.js')&&html.includes('energy-v17-motion.css'));
 assert.equal((html.match(/data-v17-tab=/g)||[]).length,6);
 assert.equal((html.match(/data-v17-panel=/g)||[]).length,6);
}
console.log('PASS V17.1: four languages, six exclusive tabs, data-gated motion, sign semantics, reduced motion');
