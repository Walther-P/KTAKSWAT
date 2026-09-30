import fs from 'node:fs';
import {createHash} from 'node:crypto';
export function writeCameraRegions(catalog,dir){
  fs.mkdirSync(dir,{recursive:true});
  const groups=new Map();
  for(const c of catalog.cameras){const key=Math.floor(c.lat*4)+'-'+Math.floor(c.lng*4);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)}
  const regions=[];
  for(const [key,cameras] of groups){
    const json=JSON.stringify({cameras}),hash=createHash('sha256').update(json).digest('hex').slice(0,12),file=`gpt6-cctv-${key}-${hash}.json`;
    fs.writeFileSync(dir+'/'+file,json);
    const lats=cameras.map(c=>c.lat),lngs=cameras.map(c=>c.lng);
    regions.push({id:key,file,count:cameras.length,lat:cameras[0].lat,lng:cameras[0].lng,bounds:[[Math.min(...lats),Math.min(...lngs)],[Math.max(...lats),Math.max(...lngs)]]});
  }
  const manifest={sources:catalog.sources,total:catalog.cameras.length,unlocated:catalog.unlocated||[],regions};
  fs.writeFileSync(dir+'/gpt6-cctv.json',JSON.stringify(manifest));return manifest;
}
