import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalizeSnapshot,toMW,borderFromId,fuelFromId} from '../assets/js/energy-model-v18.mjs';
const now='2026-10-20T13:00:00.000Z';const t1='2026-10-20T11:00:00.000Z',t2='2026-10-20T12:00:00.000Z';
const pack=({production,flow,commercial})=>({mode:'test',period:'24h',datasets:{production,physical_flows:flow,commercial_exchange:commercial}});
const ds=(series,data,status='observed')=>({status,unit:'MW',series,data,retrieved_at:now,source:'fixture',url:'https://example.org/'});
assert.equal(toMW(0,'MW'),0);assert.equal(toMW(1,'GW'),1000);assert.equal(toMW(1000,'kW'),1);
for(const unit of ['','MWh','EUR/MWh','%','kVA','nonsense'])assert.equal(toMW(35,unit),null);
assert.equal(fuelFromId('biogas'),'bio');assert.equal(fuelFromId('pumped_storage'),null);
assert.equal(borderFromId('ro','Romania'),'RO');assert.equal(borderFromId('unknown'),null);
const product=ds([{id:'solar',unit:'MW'},{id:'fossil_gas',unit:'GW'},{id:'invalid',unit:'MWh'},{id:'pumped_storage',unit:'MW'}],
 [{timestamp:t1,values:{solar:0,fossil_gas:0.5,invalid:99999,pumped_storage:50}},{timestamp:t2,values:{solar:70,fossil_gas:0.6,invalid:99999}}]);
const f=ds([{id:'hu',unit:'MW'},{id:'ro',unit:'MW'}],[{timestamp:t2,values:{hu:0,ro:-130}}]);
const r=normalizeSnapshot(pack({production:product,flow:f,commercial:f}),{now});
assert.equal(r.data.production.points[0].buckets.solar,0,'actual zero survives');
assert.equal(r.data.production.points[0].buckets.gas,500);
assert.equal(r.data.production.points[0].total,500,'MWh and pumped storage excluded');
assert.equal(r.data.production.points[0].renewable_share,0);
assert.equal(r.data.production.points[1].total,670);
assert.equal(r.data.physical_flows.points[0].edges.HU,0);
assert.equal(r.data.physical_flows.points[0].edges.RO,-130);
assert.equal(r.data.physical_flows.points[0].net,null,'partial borders cannot sum');
assert.equal(r.sources.production.quality,'observed');
assert.ok(r.warnings.some(x=>x.includes('unit rejected')));
const dup=ds([{id:'hu',unit:'MW'},{id:'hungary',unit:'MW'}],[{timestamp:t2,values:{hu:25,hungary:55}}]);
const dupVal=normalizeSnapshot(pack({flow:dup}),{now}).data.physical_flows;
assert.equal(dupVal.points[0].edges.HU,null,'duplicate borders fail closed');
assert.ok(dupVal.conflicts.includes('HU'));
const tooOld=normalizeSnapshot(pack({production:product}),{now:'2026-10-25T13:00:00.000Z'});
assert.equal(tooOld.sources.production.quality,'stale','republished data does not reset freshness');
const cached=normalizeSnapshot(pack({production:{...product,status:'cached'}}),{now});
assert.equal(cached.sources.production.quality,'cached');
const future=ds([{id:'solar',unit:'MW'}],[{timestamp:'2026-10-21T11:00:00.000Z',values:{solar:50}}]);
assert.equal(normalizeSnapshot(pack({production:future}),{now}).data.production.points.length,0,'future observations removed');
for(const lang of ['sr-lat','sr-cyr','en','ru']){
 const html=fs.readFileSync(`${lang}/energetski-monitor.html`,'utf8');
 assert.match(html,/energy-v19.css/);assert.match(html,/energy-app-v19.mjs/);
 assert.equal((html.match(/data-tab="/g)||[]).length,6);
 assert.ok(!html.includes('energy-v17-4-interaction.js'),'no generation cascade');
 assert.ok(!html.includes('id="v17-film-sound"'));
 assert.ok(!html.includes('undefined'));
 assert.match(html,/data-grid-mode="physical"/);
 assert.match(html,/<svg[^>]*class="ei-plant-svg"/);
 assert.match(html,/v18-shell-cover/);assert.match(html,/v19-machine-drawing/);assert.match(html,/v19-map-data/);assert.match(html,/v19-compare-mode/);
 assert.ok(!html.includes('<div class="ei-machine-art">None</div>'),'plant SVG not dropped by rebuild');
}
const expectedVideo=fs.readFileSync('assets/video/geh-energy-film-web.mp4');assert.ok(expectedVideo.byteLength>1_000_000);
for(const range of ['24h','7d','30d']){
 const obj=JSON.parse(fs.readFileSync(`data/energy/demo-${range}.json`,'utf8'));
 assert.equal(obj.mode,'explicit-demo');assert.equal(obj.v18.schema_version,'18.0.0');
 assert.equal(obj.v18.sources.production.quality,'demo');
 assert.equal(obj.v18.sources.day_ahead_price.quality,'license_required');
}
console.log('PASS V19: semantic contract, strict units, null vs zero, duplicate borders, future/stale, four languages, tabs, demo provenance');
