/** Explicitly labelled synthetic fixture for browser/QA only. Never a published observation. */
import fs from 'node:fs/promises';
import {normalizeSnapshot} from '../assets/js/energy-model-v18.mjs';
const B=['hu','ro','bg','mk','xk','me','ba','hr'];
const fuels=['fossil_brown_coal_lignite','fossil_gas','hydro_run_of_river','wind_onshore','solar','biomass'];
const end=Date.parse('2026-10-20T12:00:00.000Z');
const fuelValues=(i,n)=>{
 const hour=(i%24);
 return {fossil_brown_coal_lignite:1250+210*Math.cos(i/9),fossil_gas:470+42*Math.sin(i/5),hydro_run_of_river:520+70*Math.cos(i/7),wind_onshore:185+165*Math.sin(i/11),solar:Math.max(0,325*Math.sin((hour-6)*Math.PI/13)),biomass:26};
};
for(const [range,n,hours] of [['24h',48,.5],['7d',168,1],['30d',360,2]]){
 const times=Array.from({length:n},(_,i)=>new Date(end-(n-i-1)*hours*3600000).toISOString());
 const ser=(ids,unit='MW')=>ids.map(id=>({id,name:id,unit}));
 const production={status:'demo',source:'DEMO / SYNTHETIC QA DATA',unit:'MW',series:ser(fuels),data:times.map((timestamp,i)=>({timestamp,values:fuelValues(i,n)})),retrieved_at:new Date(end).toISOString()};
 const makeFlow=(offset=0)=>({status:'demo',source:'DEMO / SYNTHETIC QA DATA',unit:'MW',series:ser([...B,'sum']),data:times.map((timestamp,i)=>{const v={};B.forEach((id,j)=>v[id]=Math.round(170*Math.sin(i/8+j)+offset));v.sum=Object.values(v).reduce((a,b)=>a+b,0);return {timestamp,values:v}}),retrieved_at:new Date(end).toISOString()});
 const actual={status:'demo',source:'DEMO / SYNTHETIC QA DATA',unit:'MW',series:ser(['actual_load']),data:times.map((timestamp,i)=>({timestamp,values:{actual_load:3170+140*Math.sin(i/9)}})),retrieved_at:new Date(end).toISOString()};
 const fc={status:'demo',source:'DEMO / SYNTHETIC QA DATA',unit:'MW',series:ser(['day_ahead_load_forecast']),data:times.map((timestamp,i)=>({timestamp,values:{day_ahead_load_forecast:3200+100*Math.sin(i/9)}})),retrieved_at:new Date(end).toISOString()};
 const price={status:'license_required',data:[],series:[],source:'SEEPEX',url:'https://www.seepex-spot.rs/'};
 const snap={mode:'explicit-demo',period:range,server_time:new Date(end).toISOString(),published_at:new Date(end).toISOString(),datasets:{production,physical_flows:makeFlow(),commercial_exchange:makeFlow(70),actual_load:actual,load_forecast:fc,day_ahead_price:price}};
 // Demo is a fixed historical snapshot, not claimed current. Choose evaluation time equal to fixture date.
 snap.v18=normalizeSnapshot(snap,{now:new Date(end).toISOString()});
 await fs.writeFile(new URL(`../data/energy/demo-${range}.json`,import.meta.url),JSON.stringify(snap,null,1));
 console.log('DEMO '+range+' '+times.length+' samples');
}
