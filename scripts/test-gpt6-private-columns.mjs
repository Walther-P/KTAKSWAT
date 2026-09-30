import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import WebSocket from 'ws';
import {HttpsProxyAgent} from 'https-proxy-agent';

const url='https://pvkbdmpwfrojmftncxmy.supabase.co';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').trim().split('\n').map(l=>l.split(/=(.*)/s).slice(0,2)));
assert.equal(env.VITE_SUPABASE_URL,url);
const sessionPath=process.env.KTAK_TEST_SESSIONS||'/workspace/scratch/71e602ebc86b/gpt6-test-sessions.json';
const sessions=JSON.parse(fs.readFileSync(sessionPath,'utf8'));
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
class TestSocket extends WebSocket {constructor(u,p){super(u,p,proxy?{agent:new HttpsProxyAgent(proxy)}:{});}}
const clients=await Promise.all(sessions.map(async(s,i)=>{
  const c=createClient(url,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:TestSocket}});
  const r=await c.auth.setSession(s);assert.ifError(r.error);sessions[i]=r.data.session;return c;
}));
fs.writeFileSync(sessionPath,JSON.stringify(sessions),{mode:0o600});
const [owner,member,,recovered]=clients;
const checks=[];
const record=name=>{checks.push(name);console.log('PASS',name);};
const ok=async(q,name)=>{const r=await q;assert.ifError(r.error);record(name);return r.data;};
const denied=async(q,name)=>{const r=await q;assert.ok(r.error,name);assert.equal(r.error.code,'42501',name);record(name);};
const memberColumns='user_id,nick,role,requested_role,approved,approved_at,joined_at,avatar_path';
const roomColumns='id,code,creator_user_id,created_at,expires_at';
let room,channel,cleanupClient=owner,failure=null,passed=false;
try{
  const made=await ok(owner.rpc('ktak_create_room',{p_code:'G6SEC'+Date.now().toString().slice(-8),p_password:'7319',p_nick:'虛構權限測試指揮',p_retention_days:1}),'room creation still works');
  room=made[0].room_id;const code=made[0].room_code,deviceKey=randomUUID();
  await ok(owner.rpc('ktak_touch_member',{p_room_id:room,p_device_key:deviceKey}),'owner can bind locally held recovery key');
  const joined=await ok(member.rpc('ktak_join_room_v3',{p_code:code,p_password:'7319',p_nick:'虛構權限測試隊員',p_requested_role:'commander',p_device_key:randomUUID()}),'correct PIN still joins directly');
  assert.equal(joined[0].approved,true);assert.equal(joined[0].member_role,'tactical');
  const rows=await ok(member.from('ktak_room_members').select(memberColumns).eq('room_id',room),'actual member-list columns readable');assert.equal(rows.length,2);
  await ok(member.from('ktak_room_members').select('approved,role').eq('room_id',room).eq('user_id',sessions[1].user.id).single(),'actual own-permission columns readable');
  await ok(member.from('ktak_rooms').select(roomColumns).eq('id',room).single(),'actual room bootstrap columns readable');
  await denied(member.from('ktak_room_members').select('device_key').eq('room_id',room),'member cannot read recovery keys');
  await denied(owner.from('ktak_room_members').select('device_key').eq('room_id',room),'commander cannot enumerate recovery keys');
  await denied(member.from('ktak_rooms').select('password_hash').eq('id',room),'member cannot read password hashes');
  await denied(owner.from('ktak_rooms').select('recovery_hash').eq('id',room),'commander cannot read recovery hashes');
  await denied(member.from('ktak_room_members').update({role:'commander'}).eq('room_id',room).eq('user_id',sessions[1].user.id),'direct membership privilege escalation denied');
  const outsiders=await ok(recovered.from('ktak_room_members').select(memberColumns).eq('room_id',room),'outsider query retains RLS');assert.equal(outsiders.length,0);

  await member.realtime.setAuth(sessions[1].access_token);
  const events=[];
  channel=member.channel('ktak35:'+room,{config:{private:true}})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'ktak_room_members',filter:'room_id=eq.'+room},p=>events.push(p));
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('private member subscription timeout')),30000);
    channel.subscribe((state,error)=>{if(state==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(state==='CHANNEL_ERROR'){clearTimeout(timer);reject(Error(error?.message||'channel error'));}});
  });record('private member subscription still works');
  await ok(owner.rpc('ktak_touch_member',{p_room_id:room,p_device_key:deviceKey}),'guarded member update still works');
  for(let i=0;i<50&&!events.length;i++)await new Promise(r=>setTimeout(r,200));
  assert.equal(events[0]?.new?.user_id,sessions[0].user.id);record('cross-user membership realtime delivery');
  assert.ok(events.every(e=>!Object.hasOwn(e.new,'device_key')&&!Object.hasOwn(e.old,'device_key')));record('realtime does not expose recovery key');
  const mapId=randomUUID();
  await ok(owner.from('ktak_map_items').insert({id:mapId,room_id:room,owner_id:sessions[0].user.id,updated_by:sessions[0].user.id,data:{id:mapId,type:'symbol',label:'虛構恢復驗證',lat:22.7,lng:120.3}}),'create fictional object before identity recovery');
  const guarded=await ok(owner.from('ktak_map_items').update({owner_id:sessions[1].user.id}).eq('id',mapId).select('owner_id').single(),'ordinary commander update retains ownership guard');assert.equal(guarded.owner_id,sessions[0].user.id);
  const restored=await ok(recovered.rpc('ktak_join_room_v3',{p_code:code,p_password:'7319',p_nick:'虛構恢復裝置',p_requested_role:'tactical',p_device_key:deviceKey}),'device recovery with locally held key still works');
  assert.equal(restored[0].member_role,'commander');assert.equal(restored[0].approved,true);cleanupClient=recovered;
  const former=await ok(owner.from('ktak_room_members').select(memberColumns).eq('room_id',room),'previous identity loses room access after recovery');assert.equal(former.length,0);
  const moved=await ok(recovered.from('ktak_map_items').select('owner_id,updated_by,data').eq('id',mapId).single(),'recovered identity preserves object ownership');assert.equal(moved.owner_id,sessions[3].user.id);assert.equal(moved.data.label,'虛構恢復驗證');
  const rotated=await ok(recovered.rpc('ktak_rotate_recovery_code',{p_room_id:room}),'recovered commander can rotate recovery code');
  const recoveredAgain=await ok(owner.rpc('ktak_recover_commander_v3',{p_code:code,p_recovery_code:rotated[0].recovery_code,p_device_key:randomUUID()}),'commander code recovery works across identities');
  assert.equal(recoveredAgain[0].status,'OK');cleanupClient=owner;
  const back=await ok(owner.from('ktak_map_items').select('owner_id,data').eq('id',mapId).single(),'code recovery preserves room object');assert.equal(back.owner_id,sessions[0].user.id);
  passed=true;
}catch(error){failure=error.message;throw error;}finally{
  if(channel)await member.removeChannel(channel);
  if(room)await ok(cleanupClient.rpc('ktak_delete_room',{p_room_id:room}),'fictional permission-test room removed');
  for(const c of clients)await c.removeAllChannels();
  fs.writeFileSync('reports/private-column-tests.json',JSON.stringify({at:new Date().toISOString(),project:'pvkbdmpwfrojmftncxmy',passed,failure,checks},null,2));
}
console.log(checks.length+' private-column checks passed.');
