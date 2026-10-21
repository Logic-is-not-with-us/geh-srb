#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'dist');
await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});
// A missing hidden marker used to block the entire deployment (ENOENT). Ensure it exists.
try { await fs.access(path.join(root,'.nojekyll')) } catch { await fs.writeFile(path.join(root,'.nojekyll'),'GitHub Pages: disable Jekyll processing\n') }
for(const item of ['index.html','.nojekyll','assets','data','sr-lat','sr-cyr','en','ru']){
  const from=path.join(root,item);const to=path.join(target,item);
  await fs.cp(from,to,{recursive:true,force:true});
}
const req=['sr-lat/energetski-monitor.html','sr-cyr/energetski-monitor.html','en/energetski-monitor.html','ru/energetski-monitor.html',
'assets/css/energy-v19.css','assets/js/energy-app-v19.mjs','assets/js/energy-model-v18.mjs',
'assets/video/geh-energy-film-web.mp4',
'data/energy/24h.json','data/energy/7d.json','data/energy/30d.json'];
for(const filename of req) await fs.access(path.join(target,filename));
for(const period of ['24h','7d','30d']) {
 const snap=JSON.parse(await fs.readFile(path.join(target,'data','energy',period+'.json'),'utf8'));
 if(snap.v18?.schema_version!=='18.0.0')throw Error('V18 data contract missing in '+period+'; run the ingest/seed first');
}
console.log('GEH V19 Pages artifact ready: '+target);
