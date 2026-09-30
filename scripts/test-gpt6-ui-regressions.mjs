import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const checks=[];const pass=n=>{checks.push(n);console.log('PASS',n)};
const source=fs.readFileSync('dist/ktak-v35-assignment-prompt-v14.js','utf8');
function device(){
 const dom=new JSDOM('<!doctype html><body></body>',{url:'https://gpt6.test',runScripts:'outside-only'});const w=dom.window;
 const rows=[],handlers={},timers=[];
 const ch={on(type,filter,callback){handlers[filter.event]=callback;return this},subscribe(){return this}};
 const client={realtime:{async setAuth(){}},channel(){return ch},async removeChannel(){},from(){const q={select(){return q},eq(){return q},contains(){return q},in(){return q},order(){return q},async limit(){return {data:structuredClone(rows)}}};return q}};
 const context={roomUuid:'fake-room',userId:'fake-member',sb:client,toast(){}};
 w.__KTAK35_CORE=context;w.__KTAK35_ASSIGNMENTS={memberView(a,u){return a?{...a,status:a.status==='cancelled'?'cancelled':a.member_states?.[u]?.status||a.status}:null},pendingFor(){return null},async respond(a,status){const row=rows.find(x=>x.id===a.id);row.member_states={'fake-member':{status,revision:1}};return {queued:false,row}}};
 w.setTimeout=f=>{timers.push(f);return 1};w.setInterval=()=>1;w.clearInterval=()=>{};
 w.eval(source);return {w,rows,handlers,boot:()=>timers[0](),ui:w.__KTAK35_ASSIGNMENT_PROMPT14,close:()=>dom.window.close()};
}
const make=(id,status='pending')=>({id,room_id:'fake-room',assigned_to:['fake-member'],status,title:'虛構任務 '+id,created_at:id==='old'?'2026-09-01':'2026-09-02',member_states:{'fake-member':{status}}});
const a=device();a.rows.push(make('old','active'),make('new'));await a.boot();assert.equal(a.ui.getState().current.id,'new');assert.equal(a.ui.getState().visible,true);pass('existing active assignment does not hide a new pending task');
await a.w.document.querySelector('#v35AssignmentPrompt14Actions button:nth-child(2)').onclick();assert.equal(a.ui.getState().visible,false);await a.ui.refresh(true);assert.equal(a.ui.getState().visible,false);pass('acceptance remains dismissed after refresh');
const b=device();b.rows.push(make('new'));await b.boot();assert.equal(b.ui.getState().visible,true);b.rows[0].member_states['fake-member'].status='accepted';b.handlers.UPDATE({new:b.rows[0]});assert.equal(b.ui.getState().visible,false);pass('acceptance on another device closes the existing prompt');
b.handlers.UPDATE({new:b.rows[0]});await b.ui.refresh(true);assert.equal(b.ui.getState().visible,false);pass('realtime duplicates and reconnect refresh do not reopen accepted tasks');
b.rows.push(make('next'));await b.ui.refresh(true);assert.equal(b.ui.getState().current.id,'next');b.w.document.querySelector('#v35AssignmentPrompt14Later').click();await b.ui.refresh(true);assert.equal(b.ui.getState().visible,false);pass('later action is remembered while new assignments still appear');
b.ui.show(b.rows[0]);assert.equal(b.ui.getState().visible,true);pass('accepted task can still be explicitly opened');
a.close();b.close();
const html=fs.readFileSync('dist/index.html','utf8');
const grab=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
// Exercise the actual map writer across an asynchronous room change.
const writes=[];let finish;const pending=new Promise(r=>finish=r);
const sandbox={Map,clone:structuredClone,jsonSame:(a,b)=>JSON.stringify(a)===JSON.stringify(b),ensureObjectUuid:x=>x,currentRoomUuid:'new-room',currentUserId:'new-user',sb:{from(table){return {upsert(rows){writes.push({table,rows});return pending},delete(){return {eq(key,room){writes.push({room});return {in:async()=>({})}}}}}}}};
vm.createContext(sandbox);vm.runInContext(grab('function collectionById','function flattenBoardObjects'),sandbox);
const ctx={room:'old-room',user:'old-user',snapshot:{map:{items:[{id:'deleted'}]}}};const target={items:[{id:'kept',type:'symbol'}]};const task=sandbox.syncMap(target,ctx);finish({});await task;
assert.equal(writes[0].rows[0].room_id,'old-room');assert.equal(writes[0].rows[0].updated_by,'old-user');assert.equal(writes[1].room,'old-room');pass('in-flight map upsert and deletion stay in their original room');
// Exercise late GPS permission and stop-vs-upload ordering using the production functions.
const gps={};const locationEvents=[];let resolveUpload;
const l={navigator:{geolocation:{getCurrentPosition(ok,err){gps.ok=ok;gps.err=err},clearWatch(id){locationEvents.push('clear:'+id)}}},window:{isSecureContext:true,__ktakEnhance:{startNativeLocationIfAvailable:async()=>false,stopNativeLocation:async()=>{},setLocationAuto(){}}},currentRoomUuid:'r',currentUserId:'u',user:()=>({approved:true}),toast(){},setLocationUi(){},onLocationError(){},beginLocationWatchFromGrantedFix(){locationEvents.push('started')},renderMemberLocations(){},clearTimeout(){},memberLocations:{u:{}},locationSharing:false,locationStarting:false,locationGeneration:0,locationWatchId:1,locationWriteTimer:null,locationPendingFix:null,locationWriteInFlight:null,sb:{from(){return {delete(){return {eq(){return {eq:async()=>{locationEvents.push('deleted');return {}}}}}}}}}};
vm.createContext(l);vm.runInContext(grab('async function startLocationSharing','$("locationShareBtn").onclick'),l);
await l.startLocationSharing();await l.stopLocationSharing();gps.ok({coords:{}});assert.ok(!locationEvents.includes('started'));pass('late GPS permission response cannot restart sharing after stop');
l.locationSharing=true;l.locationWriteInFlight=new Promise(r=>resolveUpload=r);locationEvents.length=0;const stop=l.stopLocationSharing();await Promise.resolve();assert.ok(!locationEvents.includes('deleted'));resolveUpload();await stop;assert.ok(locationEvents.includes('deleted'));assert.equal(l.locationSharing,false);pass('stop waits for in-flight location upload before deleting remote position');
// Run the actual publisher through a rejected request followed by a successful retry.
let rejectSync=true;const uploadEvents=[];
const pub={save(){},sb:{},currentRoomUuid:'mission-a',currentUserId:'member-a',state:{brief:{note:'unsent'},map:{items:[]},board:{pages:[],active:0}},syncSnapshot:{brief:null,map:null,board:null},syncChain:Promise.resolve(),clone:structuredClone,can:()=>true,jsonSame:(a,b)=>JSON.stringify(a)===JSON.stringify(b),console:{error(){}},toast(){},async syncBrief(target,ctx){uploadEvents.push(ctx.room);if(rejectSync)throw Error('offline');ctx.snapshot.brief=structuredClone(target)},async syncMap(target,ctx){ctx.snapshot.map=structuredClone(target)},async syncBoard(target,ctx){ctx.snapshot.board=structuredClone(target)}};
vm.createContext(pub);vm.runInContext(grab('let gpt6SyncPending=0','function scheduleRefresh')+';globalThis.syncState=()=>({pending:gpt6SyncPending,error:gpt6SyncError});',pub);
pub.publish();assert.equal(pub.syncState().pending,1);await pub.syncChain;assert.equal(pub.syncState().pending,0);assert.equal(pub.syncState().error,'offline');assert.equal(pub.state.brief.note,'unsent');pass('failed write is visible and preserves the unsent edit');
rejectSync=false;pub.publish();await pub.syncChain;assert.equal(pub.syncState().error,'');assert.equal(pub.syncSnapshot.brief.note,'unsent');assert.deepEqual(uploadEvents,['mission-a','mission-a']);pass('retry sends the preserved edit to its original mission and clears the error');
fs.writeFileSync('reports/ui-regressions.json',JSON.stringify({at:new Date().toISOString(),passed:true,checks,scope:'actual compiled prompt and engine functions; mocked transport, no physical device'},null,2));
