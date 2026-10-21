import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync('assets/js/energy-app-v19.mjs','utf8');
const css=fs.readFileSync('assets/css/energy-v19.css','utf8');
const source=fs.readFileSync('scripts/build-v19-site.py','utf8');
assert.match(source,/energy-v22-polish.css/);
for (const name of ['FLOW_COPY','renderFlow','renderNetworkV22','renderPlantV22','enhanceScaffold','v22-border-bars','v22-journey-steps'])assert.ok(js.includes(name),'missing V22 feature '+name);
for (const name of ['.v22-network','.v22-border-row','.v22-comparison','.v22-journey-steps','.v21-flow-svg'])assert.ok(css.includes(name),'missing compiled selector '+name);
for(const lang of ['sr-lat','sr-cyr','en','ru']){
 const html=fs.readFileSync(`${lang}/energetski-monitor.html`,'utf8');
 assert.match(html,/BLUE CURRENT 22/);
 assert.match(html,/v20-cinematic-scene/);
 assert.match(html,/data-tab="flow"/);
 assert.match(html,/data-tab="grid"/);
 assert.match(html,/data-tab="plant"/);
 assert.match(html,/energy-app-v19.mjs/);
 assert.equal((html.match(/data-tab="/g)||[]).length,6);
}
const snap=JSON.parse(fs.readFileSync('data/energy/24h.json','utf8'));
assert.equal(snap.v18.schema_version,'18.0.0');
for(const row of snap.v18.data.production.points||[])assert.ok(Object.values(row.buckets).every(v=>v===null||Number.isFinite(v)));
console.log('PASS V22: merged V20 scene, V21 flow, eight-border inspector, source templates, four languages');
