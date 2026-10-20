/** Non-network test harness; intentionally never publishes mocked values. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const requests=[];
const oldFetch=globalThis.fetch;
globalThis.fetch=async(url)=>{
 requests.push(url.toString());
 const rows=[{timestamp:'2026-10-20T08:00:00Z',values:{fossil_gas:410}},{timestamp:'2026-10-20T09:00:00Z',values:{fossil_gas:420}}];
 return new Response(JSON.stringify({series:[{id:'fossil_gas',name:'Gas',unit:'MW'}],unit:'MW',data:rows,timezone:'Europe/Belgrade',generated_at:'2026-10-20T09:03:00Z'}),{status:200,headers:{'Content-Type':'application/json'}})
};
process.env.FORCE_ALL='1';
try {
 await import('./fetch-energy.mjs?test='+Date.now());
 const obj=JSON.parse(await fs.readFile(new URL('../data/energy/24h.json',import.meta.url),'utf8'));
 assert.equal(obj.mode,'github-pages');assert.equal(obj.datasets.production.status,'observed');
 assert.equal(obj.datasets.day_ahead_price.status,'license_required');
 assert.equal(obj.datasets.production.data.length,2);
 assert.equal(obj.datasets.actual_load.status,'unavailable');
 assert.ok(requests.length>=4);
 console.log('PASS / Node public dataset transform and exclusion of private price');
} finally {
 globalThis.fetch=oldFetch;
 delete process.env.FORCE_ALL;
 for(const range of ['24h','7d','30d']){
   await fs.writeFile(new URL(`../data/energy/${range}.json`,import.meta.url),JSON.stringify({mode:'github-pages',period:range,server_time:null,datasets:{},status:'not_fetched_yet',legal:'Public preview. No licensed price data published.'},null,2)+'\n','utf8')
 }
}
