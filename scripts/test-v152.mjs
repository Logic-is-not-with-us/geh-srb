/** Offline regression. No real upstream calls, no keys, no fabricated measurements published. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cleanEnergy,derivedFromProduction,parseEntsoeLoad} from './energy-transform.mjs';
const generated=new Date('2026-10-20T12:00:00Z');
const raw={unit:'MW',series:['fossil_gas','fossil_brown_coal_lignite','solar','wind_onshore','hydro_run_of_river'].map(id=>({id,unit:'MW'})),data:[
 {timestamp:'2026-10-20T10:00:00Z',values:{fossil_gas:0,fossil_brown_coal_lignite:1900,solar:0,wind_onshore:100,hydro_run_of_river:500}},
 {timestamp:'2026-10-20T11:00:00Z',values:{fossil_gas:450,fossil_brown_coal_lignite:2000,solar:250,wind_onshore:120,hydro_run_of_river:510}}]};
const clean=cleanEnergy(raw,generated);
assert.equal(clean.data[0].values.fossil_gas,0,'Zero must remain an observed zero');
const derived=derivedFromProduction(clean);
assert.equal(derived.reported_generation.data[1].values.reported_generation,3330);
assert.equal(derived.reported_gas.data[0].values.reported_gas,0,'Zero gas generation is valid');
assert.equal(derived.reported_renewable_power.data[1].values.reported_renewable_power,880);
assert.ok(derived.reported_renewable_share.data[1].values.reported_renewable_share>26);
assert.ok(!derived.reported_nuclear,'Do not fabricate missing fuel types');
const empty=derivedFromProduction({data:[],series:[]});assert.deepEqual(empty,{});
const xml=`<?xml version="1.0"?><GL_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-6:generationloaddocument:3:0"><TimeSeries><Period><timeInterval><start>2026-10-20T10:00Z</start><end>2026-10-20T12:00Z</end></timeInterval><resolution>PT60M</resolution><Point><position>1</position><quantity>5000</quantity></Point><Point><position>2</position><quantity>0</quantity></Point></Period></TimeSeries></GL_MarketDocument>`;
assert.equal(parseEntsoeLoad(xml,'actual_load',generated).data[0].values.actual_load,5000);
assert.equal(parseEntsoeLoad(xml,'actual_load',generated).data[1].values.actual_load,0);
assert.equal(parseEntsoeLoad(xml,'load_forecast',generated).series[0].id,'day_ahead_load_forecast');
// Mock API allows deterministic GitHub builder to run without network or token.
const restoreRanges=['24h','7d','30d'];
const beforeSnapshots=await Promise.all(restoreRanges.map(r=>fs.readFile(new URL(`../data/energy/${r}.json`,import.meta.url))));
const prior=globalThis.fetch,requests=[];
process.env.FORCE_ALL='1';process.env.GEH_TEST_NOW='2026-10-20T12:00:00Z';
delete process.env.PAGES_BASE_URL;delete process.env.ENTSOE_API_TOKEN;
globalThis.fetch=async url=>{
 const s=url.toString();requests.push(s);
 assert.ok(!s.includes('total_power'),'Unsupported German-only total_power called for Serbia');
 assert.ok(!s.includes('securityToken'),'Public no-token test leaked secret');
 return new Response(JSON.stringify(raw),{status:200,headers:{'content-type':'application/json'}});
};
try{
 await import('./fetch-energy.mjs?offline-v152-test='+Date.now());
 const obj=JSON.parse(await fs.readFile(new URL('../data/energy/24h.json',import.meta.url)));
 assert.equal(obj.source_counts.public_feed_configured,3);
 assert.equal(obj.source_counts.public_feed_available,3);
 assert.ok(obj.source_counts.derived_available>=7);
 assert.equal(obj.datasets.actual_load.status,'not_configured');
 assert.equal(obj.datasets.day_ahead_price.status,'license_required');
 assert.equal(obj.datasets.reported_gas.data[0].values.reported_gas,0);
 assert.ok(requests.length>=9,'Three feeds across three ranges should be queried');
 console.log('PASS V15.2: observed zero, correct derived sums, 3 feeds, token privacy, ENTSO-E XML, empty source handling');
} finally {
 globalThis.fetch=prior;delete process.env.FORCE_ALL;delete process.env.GEH_TEST_NOW;
 for(let i=0;i<restoreRanges.length;i++) await fs.writeFile(new URL(`../data/energy/${restoreRanges[i]}.json`,import.meta.url),beforeSnapshots[i]);
}
