/** Reset local/repository JSON to expressly empty V18 data. Avoid shipping QA observations. */
import fs from 'node:fs/promises';
import {normalizeSnapshot} from '../assets/js/energy-model-v18.mjs';
const TIME='2026-10-20T00:00:00.000Z';
for(const period of ['24h','7d','30d']){
 const blank={mode:'github-pages',period,server_time:null,published_at:null,datasets:{
 production:{status:'unavailable',source:'Fraunhofer ISE Energy-Charts',url:'https://api.energy-charts.info/',data:[],series:[]},
 physical_flows:{status:'unavailable',source:'Fraunhofer ISE Energy-Charts',url:'https://api.energy-charts.info/',data:[],series:[]},
 commercial_exchange:{status:'unavailable',source:'Fraunhofer ISE Energy-Charts',url:'https://api.energy-charts.info/',data:[],series:[]},
 actual_load:{status:'not_configured',source:'ENTSO-E Transparency Platform',url:'https://transparency.entsoe.eu/',data:[],series:[]},
 load_forecast:{status:'not_configured',source:'ENTSO-E Transparency Platform',url:'https://transparency.entsoe.eu/',data:[],series:[]},
 day_ahead_price:{status:'license_required',source:'SEEPEX',url:'https://www.seepex-spot.rs/',data:[],series:[]}}};
 blank.v18=normalizeSnapshot(blank,{now:TIME});
 await fs.writeFile(new URL(`../data/energy/${period}.json`,import.meta.url),JSON.stringify(blank,null,2)+'\n');
 console.log('Seeded intentionally empty '+period);
}
