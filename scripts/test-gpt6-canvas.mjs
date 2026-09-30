import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
const checks=[];const pass=name=>{checks.push(name);console.log('PASS',name)};
function scenario(){
 const handlers={},route=[],published=[],history=[],nodes=[];let drag=true,allowed=true;
 const surface={addEventListener(k,fn){(handlers[k]??=[]).push(fn)},setPointerCapture(){},releasePointerCapture(){}};
 const latLng=(a,b)=>Array.isArray(a)?{lat:a[0],lng:a[1]}:typeof a==='object'?a:{lat:a,lng:b};
 const layer=(points,options)=>({points,options,addTo(){nodes.push(this);return this},bindTooltip(){return this}});
 const map={getContainer:()=>surface,dragging:{enable(){drag=true},disable(){drag=false},enabled:()=>drag},mouseEventToLatLng:e=>latLng(e.clientY/1000,e.clientX/1000),latLngToContainerPoint:p=>({distanceTo:q=>Math.hypot(p.lat-q.lat,p.lng-q.lng)*1000,...p}),distance:(a,b)=>Math.hypot(a.lat-b.lat,a.lng-b.lng)*100000,removeLayer(){},setView(){},fitBounds(){}};
 const c={window:{addEventListener(){},__ktakRoute:{get points(){return route.map(p=>p.slice())},clearPreview(){},previewSegment(){},commitSegment(a,b){if(!route.length)route.push([a.lat,a.lng]);route.push([b.lat,b.lng])}}},document:{addEventListener(){},querySelector(){return null}},L:{latLng,layerGroup:()=>({addTo(){return this},clearLayers(){}}),circleMarker:layer,polyline:layer,rectangle:layer,circle:layer},map,mapTool:'line',boardTool:'select',fanTargetId:null,can:()=>allowed,currentRoomUuid:'fictional-room',currentUserId:'fictional-user',currentColor:'#00aaff',state:{map:{items:[]},users:{}},presence:{},memberLocations:{},preview:null,clearPreview(){c.preview=null},requestAnimationFrame:fn=>{fn();return 1},cancelAnimationFrame(){},pushMapHistory(){history.push(JSON.stringify(c.state.map.items))},uid:()=>String(c.state.map.items.length+1),displayName:()=>'虛構隊員',publish(){published.push(c.state.map.items.length)},renderMapItems(){},$:()=>({value:'#ffb300'}),Date,Set,Math,Number,JSON,boardStage:{classList:{remove(){}}},findBoardAt(){return null},boardPoint:()=>({}),itemById:id=>c.state.map.items.find(x=>x.id===id)};
 vm.createContext(c);vm.runInContext(fs.readFileSync('src/gpt6/gpt6-canvas-engine.js','utf8'),c);
 function event(type,x=100,y=100,id=1){const e={type,clientX:x,clientY:y,pointerId:id,button:0,preventDefault(){},stopImmediatePropagation(){},target:{closest(){return null}}};for(const fn of handlers[type]||[])fn(e)}
 return {c,event,route,history,published,drag:()=>drag,allow:v=>allowed=v};
}
const a=scenario();a.event('pointerdown');a.event('pointermove',200,200);assert.equal(a.c.state.map.items.length,0);assert.equal(a.drag(),false);a.event('pointerup',200,200);assert.equal(a.c.state.map.items.length,1);assert.equal(a.c.state.map.items[0].type,'line');assert.equal(a.c.state.map.items[0].distanceM,14142);assert.equal(a.c.state.map.items[0].ownerId,'fictional-user');assert.equal(a.history.length,1);assert.equal(a.drag(),true);pass('line drag previews without saving, then commits distance and owner exactly once');
for(const tool of ['rect','circle']){const s=scenario();s.c.mapTool=tool;s.event('pointerdown');s.event('pointermove',180,240);s.event('pointerup',180,240);assert.equal(s.c.state.map.items[0].type,tool);if(tool==='rect')assert.equal(s.c.state.map.items[0].points.length,4);else assert.ok(s.c.state.map.items[0].radius>0)}pass('rectangle and circle use press-drag-release geometry');
for(const cancelled of ['pointercancel','tap','multitouch','room','permission']){const s=scenario();s.event('pointerdown');if(cancelled!=='tap')s.event('pointermove',200,200);if(cancelled==='multitouch')s.event('pointerdown',220,220,2);if(cancelled==='room')s.c.currentRoomUuid='other-room';if(cancelled==='permission')s.allow(false);s.event(cancelled==='pointercancel'?'pointercancel':'pointerup',200,200);assert.equal(s.c.state.map.items.length,0);assert.equal(s.history.length,0);assert.equal(s.drag(),true)}pass('cancel, tap, second finger, changed room and lost permission never commit a stroke');
const r=scenario();r.c.mapTool='route';r.event('pointerdown');r.event('pointermove',200,200);r.event('pointerup',200,200);assert.equal(r.route.length,2);r.event('pointerdown',350,350);r.event('pointermove',390,390);r.event('pointerup',390,390);assert.equal(r.route.length,2);r.event('pointerdown',202,202);r.event('pointermove',260,250);r.event('pointerup',260,250);assert.equal(r.route.length,3);pass('route resumes only from its last endpoint; dragging elsewhere does not add nodes');
const denied=scenario();denied.allow(false);denied.event('pointerdown');denied.event('pointermove',200,200);denied.event('pointerup',200,200);assert.equal(denied.published.length,0);pass('view-only member cannot start a drawing');
const online=scenario();online.c.state.users={a:{id:'a',nick:'甲',approved:true},b:{id:'b',nick:'乙',approved:true},c:{id:'c',nick:'丙',approved:false}};online.c.presence={a:{},c:{}};online.c.memberLocations.a={lat:23,lng:120,updatedAt:new Date().toISOString()};assert.equal(online.c.window.__KTAK6_CANVAS.onlineMembers().length,1);assert.equal(online.c.window.__KTAK6_CANVAS.onlineMembers()[0].name,'甲');online.c.memberLocations.a.updatedAt='2000-01-01';assert.equal(online.c.window.__KTAK6_CANVAS.onlineMembers()[0].location,null);pass('online list uses room presence and never jumps to an expired position');

// Execute the real UI adapters against the compiled controls, with synthetic engine data.
const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{runScripts:'outside-only',url:'https://qa.invalid'}),w=dom.window;
const timers=new Map();let timerId=0;w.setInterval=()=>0;w.setTimeout=fn=>{const id=++timerId;timers.set(id,fn);return id};w.clearTimeout=id=>timers.delete(id);w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};
const style=w.document.createElement('style');style.textContent=fs.readFileSync('src/gpt6/gpt6-workspace.css','utf8');w.document.head.append(style);
// Run the legacy dock before the current workspace, just as the shipped page does.
w.eval(fs.readFileSync('dist/ktak-v35-ux-v18.js','utf8'));
let mode='pan',boardMode='select';w.__KTAK35_CORE={roomUuid:'fictional-room',userId:'fictional-user',map:{getContainer:()=>w.document.getElementById('map')}};
w.__KTAK6_EDITOR={cancel(){mode='pan';boardMode='select'},selected:null,sharing:false,locating:false,sync:'saved',list:()=>[],retry(){}};
w.__KTAK6_CANVAS={get mapMode(){return mode},get boardMode(){return boardMode},color:'#00aaff',routes:[],refreshRouteNodes(){},onlineMembers:()=>[],canOpenMenu:()=>true,stopBoardPan(){},cancelStroke(){}};
w.eval(fs.readFileSync('src/gpt6/gpt6-workspace.js','utf8'));w.eval(fs.readFileSync('src/gpt6/gpt6-canvas-ui.js','utf8'));
assert.equal(w.document.querySelectorAll('.g6-dock').length,0);assert.ok(w.document.querySelector('.g6-map-chrome #mapSearch'));assert.ok(w.document.querySelector('.g6-members summary'));pass('UI removes both tool docks and relocates the actual address controls');
const map=w.document.getElementById('map'),pointer=(type,x,y,id=1,target=map)=>{const ev=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperty(ev,'pointerId',{value:id});Object.defineProperty(ev,'pointerType',{value:'touch'});target.dispatchEvent(ev)};
const runTimers=()=>{const pending=[...timers.values()];timers.clear();for(const fn of pending)fn()};
for(const target of [map,w.document.getElementById('boardCanvas')]){
 const layer=target.closest('.page').querySelector('.g6-radial-backdrop'),center=layer.querySelector('.g6-radial-center');
 pointer('pointerdown',150,150,1,target);runTimers();assert.ok(!layer.classList.contains('hidden'));pointer('pointerup',150,150,1,target);
 layer.click();center.click();assert.ok(!layer.classList.contains('hidden'));
 pointer('pointerdown',150,150,1,center);pointer('pointerup',150,150,1,center);center.click();assert.ok(layer.classList.contains('hidden'));
 pointer('pointerdown',100,100,1,target);pointer('pointermove',130,140,1,target);runTimers();pointer('pointerup',130,140,1,target);assert.ok(layer.classList.contains('hidden'));
}pass('both wheels appear while held, survive release/ghost clicks, allow deliberate close and reject panning');
for(const target of [map,w.document.getElementById('boardCanvas')]){
  pointer('pointerdown',100,100,1,target);pointer('pointerdown',110,110,2,target);runTimers();pointer('pointerup',110,110,2,target);pointer('pointerup',100,100,1,target);
  assert.ok(target.closest('.page').querySelector('.g6-radial-backdrop').classList.contains('hidden'));
  pointer('pointerdown',100,100,1,target);pointer('pointercancel',100,100,1,target);runTimers();pointer('pointerup',100,100,1,target);
  assert.ok(target.closest('.page').querySelector('.g6-radial-backdrop').classList.contains('hidden'));
}pass('pinch and cancelled gestures never open either canvas menu');
w.__KTAK6.openTools(false,'繪圖');w.document.getElementById('routeDraftStart').onclick=()=>mode='route';w.document.querySelector('.g6-start-route').click();assert.ok(!w.document.getElementById('mapSidebar').classList.contains('g6-open'));assert.ok(!w.document.getElementById('routeDraftCard').classList.contains('hidden'));assert.ok(w.document.querySelector('.g6-route-float #routeDraftSave'));pass('route starts with tools closed and real color/speed/share controls on the map');
const css=e=>w.getComputedStyle(e);
assert.equal(css(w.document.querySelector('.g6-search')).display,'none');assert.notEqual(css(w.document.querySelector('.g6-search-toggle')).display,'none');w.document.querySelector('.g6-search-toggle').click();assert.notEqual(css(w.document.querySelector('.g6-search')).display,'none');
assert.equal(css(w.document.querySelector('.g6-route-help')).display,'none');pass('routing minimizes search without losing address access or adding instruction panels');
const hud=w.document.createElement('div');hud.id='v35MapModeHud';hud.className='v35MapModeHud active';w.document.body.append(hud);assert.equal(css(hud).display,'none');pass('legacy yellow cancel HUD stays hidden');
const select=new w.Event('selectstart',{bubbles:true,cancelable:true});map.dispatchEvent(select);assert.equal(select.defaultPrevented,true);const textSelect=new w.Event('selectstart',{bubbles:true,cancelable:true});w.document.getElementById('mapSearch').dispatchEvent(textSelect);assert.equal(textSelect.defaultPrevented,false);pass('canvas text selection is blocked while search text remains editable');
w.__KTAK6.openTools(false,'圖層');const radar=w.document.getElementById('v35RadarToggle'),aids=radar.closest('.card');assert.ok(aids.classList.contains('g6-map-aids'));assert.notEqual(css(aids).display,'none');assert.notEqual(css(radar.parentElement).display,'none');
// Execute the original radar change handler after relocation, mocking only image transport.
let overlayAdded=0,overlayRemoved=0;w.__KTAK35_CORE.map.removeLayer=()=>overlayRemoved++;w.__KTAK6_RADAR={create:()=>({addTo(){overlayAdded++;return this}})};
const command=fs.readFileSync('dist/ktak-v35-command.js','utf8'),radarCode=command.slice(command.indexOf('const RADAR_URL='),command.indexOf('\n',command.indexOf('function toggleRadar(){')));
w.eval(`(()=>{const core=window.__KTAK35_CORE,$=id=>document.getElementById(id);let radarLayer=null;${radarCode};$('v35RadarToggle').addEventListener('change',toggleRadar)})()`);
radar.click();assert.equal(overlayAdded,1);radar.click();assert.equal(overlayRemoved,1);pass('layer card is visible with compiled legacy CSS and radar toggle still adds/removes the real overlay handler');
w.__KTAK6.openTools(false,'標記');assert.equal(css(aids).display,'none');assert.notEqual(css(w.document.getElementById('mapTacticalList').closest('.card')).display,'none');assert.equal(w.document.querySelectorAll('.g6-panel-tabs').length,0);assert.equal(w.document.querySelector('#mapSidebar .g6-panel-head strong').textContent,'標記');assert.ok(![...w.document.querySelectorAll('#mapPage .g6-radial-action')].some(b=>b.textContent==='圖層'));w.document.querySelector('.g6-aid-handle').click();assert.notEqual(css(aids).display,'none');assert.equal(w.document.querySelector('#mapSidebar .g6-panel-head strong').textContent,'地圖輔助');pass('map symbols stay in compact marking category; side arrow opens radar without layer wheel entry');
assert.deepEqual([...w.document.querySelectorAll('#boardPage .g6-radial-action')].map(b=>b.textContent),['標記','繪圖','平面圖','選取','復原']);
w.__KTAK6.openTools(true,'標記');assert.equal(w.document.getElementById('boardTacticalList').closest('.card').classList.contains('g6-filtered'),false);w.__KTAK6.openTools(true,'平面圖');assert.equal(w.document.querySelector('.floorplanCard').classList.contains('g6-filtered'),false);
assert.equal(w.document.getElementById('permissionTab').textContent,'設定');pass('board radial/panel names, floorplan entry and Settings tab match the requested labels');
// Build both lists from the actual shared marker catalog, including the shipped accordion adapter.
const compiled=fs.readFileSync('dist/index.html','utf8'),catalog=compiled.slice(compiled.indexOf('const tacticalSvg={'),compiled.indexOf("const colors=['#45aff2'"));
const accordion=compiled.slice(compiled.indexOf('  function accordionize(root){'),compiled.indexOf('  async function refreshRoomSwitcher(){'));
w.eval(`(()=>{const $=id=>document.getElementById(id),escapeHtml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');${catalog};buildTacticalGrid('mapTacticalList',()=>{});buildTacticalGrid('boardTacticalList',()=>{});${accordion}})()`);
assert.deepEqual([...w.document.querySelectorAll('#mapTacticalList [data-tactical-key]')].map(b=>b.dataset.tacticalKey),[...w.document.querySelectorAll('#boardTacticalList [data-tactical-key]')].map(b=>b.dataset.tacticalKey));
let groups=[{id:'alpha',code:'A',type:'支援組',color:'#55d572'}],chosen=null;
w.__KTAK35_V352={getGroups:()=>groups};w.__KTAK6_MARKERS={chooseBoard:(...args)=>{chosen=args;return true}};
w.eval(fs.readFileSync('src/gpt6/gpt6-markers-ui.js','utf8'));
w.__KTAK6.openTools(true,'標記');w.document.querySelector('.g6-board-group').click();assert.deepEqual(chosen,['v355team:alpha','A 支援組','#55d572']);assert.equal(w.document.getElementById('boardSidebar').classList.contains('g6-open'),false);
groups=[{id:'alpha',code:'A',type:'<img src=x onerror=alert(1)>',color:'#f25c5c'}];w.document.dispatchEvent(new w.Event('g6:canvas-tick'));assert.equal(w.document.querySelector('.g6-board-group').textContent,'A <img src=x onerror=alert(1)>');assert.equal(w.document.querySelector('.g6-board-group img'),null);assert.equal(w.document.querySelector('.g6-board-group path').getAttribute('fill'),'#f25c5c');
groups=[];w.document.dispatchEvent(new w.Event('g6:canvas-tick'));assert.equal(w.document.querySelector('.g6-board-group'),null);assert.ok(w.document.querySelector('.g6-empty-groups'));pass('board and map share all static marker choices; current groups update names/colors safely and disappear when removed');
fs.writeFileSync('reports/canvas-tests.json',JSON.stringify({at:new Date().toISOString(),passed:true,checks,scope:'Actual pointer engine and UI code; synthetic coordinates/room, VM and DOM; iPhone touch hardware not verified'},null,2));
