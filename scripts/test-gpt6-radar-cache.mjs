import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const draws=[];let instance;
const c={window:{},Promise,Math,Error,Image:class{naturalWidth=3600;naturalHeight=3600;set src(v){this.url=v;queueMicrotask(()=>this.onload())}},document:{createElement:()=>({getContext:()=>({drawImage:(...args)=>draws.push(args)})}),getElementById:()=>null},L:{setOptions:(obj,options)=>obj.options=options,GridLayer:{extend:spec=>class{constructor(url){Object.assign(this,spec);this.initialize(url);instance=this}getTileSize(){return {x:256,y:256}}getContainer(){return this.container??=( {style:{}} )}}}}};vm.createContext(c);vm.runInContext(fs.readFileSync('src/gpt6/gpt6-radar.js','utf8'),c);
const api=c.window.__KTAK6_RADAR;assert.equal(api.sourceRow(26.5,3600),0);assert.equal(api.sourceRow(23.5,3600),1800);assert.equal(api.sourceRow(20.5,3600),3600);
api.create('fixture.png');const z=9,n=256*2**z;
instance._map={unproject:([x,y])=>({lng:x/n*360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI})};
const coords={x:Math.floor((121+180)/360*2**z),y:Math.floor((1-Math.asinh(Math.tan(23.5*Math.PI/180))/Math.PI)/2*2**z),z};
await new Promise((resolve,reject)=>instance.createTile(coords,error=>error?reject(error):resolve()));
assert.equal(draws.length,256);for(let y=0;y<256;y++){const expected=api.sourceRow(instance._map.unproject([0,coords.y*256+y]).lat,3600);assert.ok(Math.abs(draws[y][2]-expected)<1e-8);assert.equal(draws[y][8],1)}
api.hideLatest();assert.equal(instance.container.style.display,'none');api.restoreLatest();assert.equal(instance.container.style.display,'');console.log('PASS radar source latitude rows are reprojected per output pixel; playback hides/restores latest layer');
const handlers={},cache=new Map();let requests=0;
const sw={URL,Promise,Math,self:{registration:{scope:'https://qa.invalid/'},addEventListener:(k,v)=>handlers[k]=v},caches:{open:async()=>({match:async r=>cache.get(r.url),put:async(r,v)=>cache.set(r.url,v),keys:async()=>[...cache.keys()].map(url=>({url})),delete:async r=>cache.delete(r.url)})},fetch:async()=>{requests++;return {ok:true,type:'basic',clone(){return this}}}};
vm.createContext(sw);vm.runInContext(fs.readFileSync('src/gpt6/gpt6-sw.js','utf8'),sw);
async function request(url){let response;handlers.fetch({request:{url,method:'GET'},respondWith:p=>response=p});if(response)await response;return !!response}
for(const url of ['https://qa.invalid/','https://qa.invalid/config.js?v=123456789abc','https://qa.invalid/rest/v1/rooms','https://other.invalid/code.js?v=123456789abc'])assert.equal(await request(url),false);
await request('https://qa.invalid/gpt6-startup.js?v=123456789abc');await request('https://qa.invalid/gpt6-startup.js?v=123456789abc');assert.equal(requests,1);await request('https://qa.invalid/gpt6-startup.js?v=abcdefabcdef');assert.equal(requests,2);
console.log('PASS repeat startup asset reads use cache; changed versions refetch; room/HTML/config/external requests bypass cache');
