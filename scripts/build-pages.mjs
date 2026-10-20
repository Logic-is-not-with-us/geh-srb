#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'dist');
await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});
for(const item of ['index.html','.nojekyll','assets','data','sr-lat','sr-cyr','en','ru']){
  const from=path.join(root,item);const to=path.join(target,item);
  await fs.cp(from,to,{recursive:true,force:true});
}
const req=['sr-lat/energetski-monitor.html','assets/css/energy-console-v15.css','assets/js/energy-console-v15.js',
  'data/energy/24h.json','data/energy/7d.json','data/energy/30d.json'];
for(const filename of req) await fs.access(path.join(target,filename));
console.log('Isolated V15 Pages artifact ready: '+target);
