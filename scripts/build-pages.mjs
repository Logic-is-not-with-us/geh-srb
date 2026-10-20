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
const req=['sr-lat/energetski-monitor.html','assets/css/energy-v16.css','assets/js/energy-console-v15.js','assets/js/energy-v16.js',
  'data/energy/24h.json','data/energy/7d.json','data/energy/30d.json'];
for(const filename of req) await fs.access(path.join(target,filename));
console.log('GEH V17.3 Signature Pages artifact ready: '+target);
