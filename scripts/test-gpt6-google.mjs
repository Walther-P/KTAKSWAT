import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8');
assert.ok(html.includes("let mapProvider='google';"),'Google remains the preferred provider');
const start=html.indexOf('function setProviderBadge('),end=html.indexOf('$("mapLayerBtn").onclick',start);
assert.ok(start>0&&end>start);
const checks=[];const pass=name=>{checks.push(name);console.log('PASS',name)};
function scenario({allowed=true,configured=true,failGate=false,failScript=false,defer=false}={}){
 let signalScript;const scriptRequested=new Promise(resolve=>signalScript=resolve);
 const buttons={},calls={construct:[],scripts:[],gate:0},layers=new Set(),road={name:'road',addTo(){layers.add(road)}},sat={name:'sat',addTo(){layers.add(sat)}};
 const map={center:{lat:22.7,lng:120.3},zoom:16,maxZoom:22,setMaxZoom(z){this.maxZoom=z;this.zoom=Math.min(this.zoom,z)},setZoom(z){this.zoom=Math.min(z,this.maxZoom)},getCenter(){return this.center},getZoom(){return this.zoom},hasLayer:l=>layers.has(l),removeLayer:l=>layers.delete(l)};
 class GoogleMap {constructor(element,options){calls.construct.push({element,options});this.type=options.mapTypeId;this.listeners={}}addListener(e,f){this.listeners[e]=f}getZoom(){return this.zoom}moveCamera(camera){Object.assign(this,camera)}setMapTypeId(type){this.type=type}setCenter(center){this.center=center}setZoom(zoom){this.zoom=zoom}}
 const c={Promise,Math,Error,Number,encodeURIComponent,setTimeout,clearTimeout,console:{warn(){}},GOOGLE_MAPS_MONTHLY_SAFE_LIMIT:8000,googleMapSlotClaimed:false,googleMapGateDenied:false,googleMapGateInfo:null,googleMapsLoadPromise:null,googleMapsConfigured:configured,googleMapsReady:false,googleMap:null,mapProvider:'google',satelliteOn:false,currentRoomUuid:'fictional-room',currentUserId:'fictional-member',map,road,sat,cfg:{GOOGLE_MAPS_API_KEY:'fictional-key-never-transmitted'},window:{},toast(){},$:id=>buttons[id]||(buttons[id]={classList:{toggle(){}},textContent:''}),sb:{async rpc(name){assert.equal(name,'ktak_claim_google_map_load');calls.gate++;return failGate?{error:Error('offline')}:{data:[{allowed,used_count:1,limit_count:8000}]}}},document:{createElement(){return {remove(){}}},head:{appendChild(script){calls.scripts.push(script);signalScript();if(!defer)queueMicrotask(()=>finishScript())}}}};
 const finishScript=()=>{const s=calls.scripts.at(-1);if(failScript){s.onerror();return}c.window.google={maps:{Map:GoogleMap}};c.window[new URL(s.src).searchParams.get('callback')]()};
 const getButton=c.$;c.$=id=>{const button=getButton(id);button.style ||= {};return button};
 vm.createContext(c);vm.runInContext(html.slice(start,end),c);
 return {c,calls,buttons,finishScript,scriptRequested,recoverGate:()=>failGate=false,recoverScript:()=>failScript=false};
}
const a=scenario();const first=a.c.initGoogleBasemap();assert.equal(a.c.initGoogleBasemap(),first);await first;await a.c.initGoogleBasemap();assert.equal(a.calls.construct.length,1);assert.equal(a.calls.gate,1);assert.equal(a.calls.scripts.length,1);assert.equal(a.c.mapProvider,'google');pass('rapid repeated map entry reuses one Google map and one isolated usage claim');
a.c.map.center={lat:23,lng:120.5};a.c.map.zoom=18;a.c.syncGoogleMap();assert.equal(a.c.googleMap.center.lat,23);assert.equal(a.c.googleMap.zoom,18);pass('Google center and zoom remain aligned with the tactical overlay');
assert.equal(a.calls.construct[0].options.colorScheme,'DARK');pass('Google roadmap is constructed with the official DARK color scheme');
assert.equal(a.calls.construct[0].options.maxZoom,22);assert.equal(a.c.googleMap.tilt,0);assert.equal(a.c.googleMap.heading,0);
a.c.map.setZoom(26);assert.equal(a.c.map.zoom,22);a.c.syncGoogleMap();assert.equal(a.c.googleMap.zoom,22);
for(const lng of [120.501,120.502,120.499]){a.c.map.center={lat:23,lng};a.c.syncGoogleMap();assert.equal(a.c.googleMap.center.lng,lng);assert.equal(a.c.googleMap.zoom,a.c.map.zoom)}
a.c.googleMap.zoom=20;a.c.googleMap.listeners.idle();assert.equal(a.c.map.zoom,21);assert.equal(a.c.map.maxZoom,21);assert.equal(a.buttons.googleMapBase.style.transform,'scale(2)');pass('imagery limit allows exactly one level of matched optical enlargement');
const clamped=scenario();await clamped.c.initGoogleBasemap();
clamped.c.googleMap.moveCamera=function(camera){Object.assign(this,camera,{zoom:Math.min(camera.zoom,20)})};
clamped.c.map.setZoom(22);clamped.c.syncGoogleMap();
assert.equal(clamped.c.map.zoom,21);assert.equal(clamped.c.map.maxZoom,21);
assert.equal(clamped.c.googleMap.zoom,20);
assert.equal(clamped.buttons.googleMapBase.style.transform,'scale(2)');
assert.equal(clamped.buttons.googleMapBase.style.width,'50%');
for(const lng of [120.301,120.299,120.302]){clamped.c.map.center={lat:22.7,lng};clamped.c.syncGoogleMap();assert.equal(clamped.c.googleMap.center.lng,lng);assert.equal(clamped.buttons.googleMapBase.style.transform,'scale(2)')}
clamped.c.map.setZoom(19);clamped.c.syncGoogleMap();assert.equal(clamped.buttons.googleMapBase.style.transform,'scale(1)');assert.equal(clamped.buttons.googleMapBase.style.width,'100%');
pass('silent SDK clamp enlarges the basemap with overlays; pan preserves center and zoom out restores normal layout');
a.c.satelliteOn=true;a.c.applyBasemapState();assert.equal(a.c.googleMap.type,'satellite');a.c.satelliteOn=false;a.c.applyBasemapState();assert.equal(a.c.googleMap.type,'roadmap');pass('Google satellite and road views switch on the existing map');
const b=scenario({allowed:false});await b.c.initGoogleBasemap();assert.equal(b.calls.construct.length,0);assert.equal(b.calls.scripts.length,0);assert.equal(b.c.googleMapGateDenied,true);pass('usage denial prevents any Google request');
const d=scenario({failGate:true});await d.c.initGoogleBasemap();assert.equal(d.calls.scripts.length,0);d.recoverGate();await d.c.initGoogleBasemap();assert.equal(d.calls.construct.length,1);pass('temporary budget-service outage fails closed and can recover');
const e=scenario({failScript:true});await e.c.initGoogleBasemap();assert.equal(e.calls.construct.length,0);e.recoverScript();await e.c.initGoogleBasemap();assert.equal(e.calls.construct.length,1);assert.equal(e.calls.gate,1);pass('failed Google script can retry without duplicate usage claims');
const f=scenario({configured:false});await f.c.initGoogleBasemap();assert.equal(f.calls.scripts.length,0);assert.match(f.buttons.mapProviderBadge.textContent,/待站端設定/);pass('missing site key is visible and does not send invalid API requests');
const g=scenario({defer:true});const pending=g.c.initGoogleBasemap();await g.scriptRequested;g.c.currentRoomUuid=null;g.finishScript();await pending;assert.equal(g.calls.construct.length,0);pass('leaving a room during loading prevents a late map initialization');
const k=scenario();await k.c.initGoogleBasemap();k.c.window.__KTAK6_GOOGLE_FAILURE();assert.equal(k.c.googleMapsReady,false);assert.equal(k.c.mapProvider,'osm');assert.match(k.buttons.mapProviderBadge.textContent,/授權或額度/);await k.c.initGoogleBasemap();assert.equal(k.calls.construct.length,1);k.c.satelliteOn=true;k.c.applyBasemapState();assert.ok(k.c.map.hasLayer(k.c.sat));pass('late Google authorization failure restores a usable basemap and does not repeatedly load a rejected key');
const fallback=fs.readFileSync('dist/ktak-v35-google-fallback.js','utf8');assert.ok(fallback.includes('window.__KTAK6_GOOGLE_FAILURE();return'));pass('legacy error observer delegates to the same basemap controller');
fs.writeFileSync('reports/google-map-tests.json',JSON.stringify({at:new Date().toISOString(),passed:true,checks,scope:'Actual compiled Google loader and 3.5 overlay functions with controlled Google SDK and transport; no real Google key or network request',liveGoogleVerified:false},null,2));
