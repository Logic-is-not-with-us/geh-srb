import fs from 'node:fs';
import assert from 'node:assert/strict';
for(const period of ['24h','7d','30d']){
 const path=`data/energy/${period}.json`,d=JSON.parse(fs.readFileSync(path,'utf8'));
 assert.equal(d.period,period,period+' period');
 assert.equal(d.v18?.schema_version,'18.0.0','schema');
 for(const feed of ['production','physical_flows','commercial_exchange','actual_load','load_forecast','day_ahead_price']){
  assert.ok(d.v18?.sources?.[feed],'missing '+feed+' status');
  assert.ok(Array.isArray(d.v18?.data?.[feed]?.points),feed+' data array');
  if(feed==='day_ahead_price')assert.equal(d.v18.sources[feed].quality,'license_required','no market license');
 }
 console.log('V18 snapshot contract: '+period+' | '+Object.entries(d.v18.sources).map(([k,v])=>k+':'+v.quality).join(', '));
}
console.log('PASS V18 all three snapshot contracts');
