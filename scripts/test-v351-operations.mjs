import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
await import('../public/ktak-v35-operations.js');
const {createClient,memberStatus,memberView}=globalThis.KTAK35Operations;
const row={id:'task',room_id:'room',title:'Patrol',status:'active',assigned_to:['a','b'],member_states:{a:{status:'pending',revision:0,operations:{}},b:{status:'active',revision:2,operations:{}}}};
function memory(){const map=new Map();return {get length(){return map.size},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
function fixture(handler){
 let seq=0,calls=[];
 const storage=memory();let ctx={roomId:'room',userId:'a',sb:{rpc:async(name,args)=>{calls.push({name,args});return handler?handler(name,args):{data:ack(args)};}}};
 const ack=args=>({...structuredClone(row),member_states:{...structuredClone(row.member_states),a:{status:args.p_status,revision:1,operations:{[args.p_operation_id]:args.p_status}}}});
 const build=()=>createClient({getContext:()=>ctx,storage,makeId:()=>`op-${++seq}`,locks:null});
 return {client:build(),build,storage,calls,ack,switchTo:c=>{ctx={...ctx,...c}}};
}
test('individual completion does not dismiss another member’s task',()=>{
 const x=structuredClone(row);x.member_states.a.status='completed';
 assert.equal(memberStatus(x,'b'),'active');assert.equal(memberView(x,'a').status,'completed');
 assert.equal(memberView(x,'a').task_status,'active');
 x.status='cancelled';assert.equal(memberStatus(x,'b'),'cancelled');
});
test('server acknowledgement removes only that operation',async()=>{
 const f=fixture();assert.equal((await f.client.respond(row,'active')).queued,false);assert.equal(f.client.list().length,0);
 assert.equal(f.calls[0].args.p_expected_revision,0);
});
test('network errors persist across a new client and retry with the same operation ID',async()=>{
 let fail=true;const f=fixture((_,args)=>{if(fail)throw Error('connection lost');return {data:f.ack(args)};});
 assert.equal((await f.client.respond(row,'active')).queued,true);const id=f.client.list()[0].id;
 fail=false;const afterReload=f.build();assert.equal((await afterReload.flush()).sent,1);
 assert.equal(f.calls[1].args.p_operation_id,id);assert.equal(afterReload.list().length,0);
});
test('permission rejection stays visible and is not automatically retried',async()=>{
 const f=fixture(()=>({error:{code:'42501'}}));await f.client.respond(row,'active');
 assert.equal(f.client.list()[0].blocked,true);await f.client.flush();assert.equal(f.calls.length,1);
 await f.client.flush({retry:true});assert.equal(f.calls.length,2);assert.equal(f.client.list().length,1);
});
test('no row or missing operation receipt is not success',async()=>{
 for(const data of [null,row]){const f=fixture(()=>({data}));assert.equal((await f.client.respond(row,'active')).queued,true);assert.equal(f.client.list().length,1);}
});
test('storage failure prevents the first request',async()=>{
 const f=fixture();f.storage.setItem=()=>{throw Error('Quota exceeded');};
 await assert.rejects(f.client.respond(row,'active'),/Quota/);assert.equal(f.calls.length,0);
});
test('simultaneous flush calls share a request; enqueued work is not overwritten',async()=>{
 let release;const gate=new Promise(r=>release=r);const f=fixture(async(_,args)=>{await gate;return {data:f.ack(args)};});
 const first=f.client.respond(row,'active');await Promise.resolve();await Promise.resolve();
 assert.equal(f.client.flush(),f.client.flush());
 const other={...row,id:'other'};const second=f.client.respond(other,'active');release();
 await Promise.all([first,second]);assert.equal(f.calls.length,1);assert.equal(f.client.list()[0].assignmentId,'other');
});
test('switching room/user does not send the old queue under the new identity',async()=>{
 const f=fixture(()=>({error:{code:'503'}}));await f.client.respond(row,'active');
 f.switchTo({roomId:'another',userId:'b'});await f.client.flush();assert.equal(f.calls.length,1);assert.equal(f.client.list().length,0);
 f.switchTo({roomId:'room',userId:'a'});assert.equal(f.client.list().length,1);
});
test('same task cannot enqueue a second transition before acknowledgement',async()=>{
 const f=fixture(()=>({error:{code:'503'}}));await f.client.respond(row,'active');
 await assert.rejects(f.client.respond(row,'completed'),/待送回報/);assert.equal(f.client.list().length,1);
});
test('room switch during a request preserves the remaining old-room queue',async()=>{
 let release;const gate=new Promise(r=>release=r);const f=fixture(async(_,args)=>{await gate;return {data:f.ack(args)};});
 const first=f.client.respond(row,'active');await Promise.resolve();await Promise.resolve();
 const second=f.client.respond({...row,id:'other'},'active');f.switchTo({roomId:'another'});release();await Promise.all([first,second]);
 assert.equal(f.calls.length,1);f.switchTo({roomId:'room'});assert.equal(f.client.list().length,1);
});
test('production prompt selection reads per-member state, not aggregate state',()=>{
 const source=fs.readFileSync('public/ktak-v35-assignment-prompt-v14.js','utf8');
 const choose=source.match(/function chooseTask\(rows\)\{[^\n]+/)[0];
 const context={memberView:x=>memberView(x,'a'),isMine:x=>x.assigned_to.includes('a'),ACTIVE:new Set(['pending','accepted','active']),rank:x=>({pending:1,accepted:2,active:3})[x.status]||0};
 vm.createContext(context);vm.runInContext(choose+'\nthis.choose=chooseTask;',context);
 assert.equal(context.choose([row]).status,'pending');
 const completed=structuredClone(row);completed.member_states.a.status='completed';assert.equal(context.choose([completed]),null);
});
test('production legacy queue retains failed delivery and never claims synchronization',async()=>{
 const storage=memory(),messages=[];const ctx={Event,localStorage:storage,room:()=> 'r',me:()=> 'u',crypto:{randomUUID:()=> 'x'},navigator:{onLine:true},document:{visibilityState:'visible'},window:{addEventListener(){},dispatchEvent(){}},setInterval(){},$:()=>null,console:{warn(){}},notify:x=>messages.push(x),setStatus:async()=>{throw Error('database failure')}};
 const queue=fs.readFileSync('scripts/v351-command-queue.js','utf8');assert.ok(fs.readFileSync('public/ktak-v35-command.js','utf8').includes(queue));vm.createContext(ctx);vm.runInContext(queue+'\nthis.run=runOrQueue;this.items=queuedItems;',ctx);
 assert.equal((await ctx.run({kind:'status',status:'active'})).queued,true);assert.equal(ctx.items().length,1);
 assert.equal(messages.some(x=>x.startsWith('已同步')),false);
});

