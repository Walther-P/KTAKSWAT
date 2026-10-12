import * as tus from 'tus-js-client';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import WebSocket from 'ws';
import {HttpsProxyAgent} from 'https-proxy-agent';
const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
class TestSocket extends WebSocket {constructor(url,protocols){super(url,protocols,proxy?{agent:new HttpsProxyAgent(proxy)}:{});}}
const url='https://pvkbdmpwfrojmftncxmy.supabase.co';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').trim().split('\n').map(l=>l.split(/=(.*)/s).slice(0,2)));
assert.equal(env.VITE_SUPABASE_URL,url);
const sessions=JSON.parse(fs.readFileSync(process.env.KTAK_TEST_SESSIONS||'/workspace/scratch/71e602ebc86b/gpt6-test-sessions.json','utf8'));
const clients=[];for(const s of sessions){const c=createClient(url,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},realtime:{transport:TestSocket}});const r=await c.auth.setSession(s);assert.ifError(r.error);sessions[clients.length]=r.data.session;clients.push(c)}
fs.writeFileSync(process.env.KTAK_TEST_SESSIONS||'/workspace/scratch/71e602ebc86b/gpt6-test-sessions.json',JSON.stringify(sessions),{mode:0o600});
const [owner,member,observer,outsider]=clients,ids=sessions.map(s=>s.user.id),checks=[];
const ok=async(q,name)=>{const r=await q;if(r.error)throw Error(name+': '+r.error.message);checks.push(name);console.log('PASS',name);return r.data};
const no=async(q,name)=>{const r=await q;assert.ok(r.error||r.data?.length===0,name);checks.push(name);console.log('PASS',name)};
let room;const paths=[];
try{
 const made=await ok(owner.rpc('ktak_create_room',{p_code:'FILES'+Date.now(),p_password:'7319',p_nick:'虛構附件測試',p_retention_days:1}),'create attachment test room');room=made[0].room_id;
 await ok(member.rpc('ktak_join_room_v3',{p_code:made[0].room_code,p_password:'7319',p_nick:'虛構接收者',p_requested_role:'tactical',p_device_key:randomUUID()}),'join recipient');
 const path=room+'/'+ids[0]+'/files/'+randomUUID()+'.pdf';paths.push(path);
 const bytes=Buffer.alloc(50*1024*1024,32);bytes.write('%PDF-1.7\n% fictional upload size test\n');
 await new Promise((resolve,reject)=>new tus.Upload(bytes,{endpoint:url.replace('.supabase.co','.storage.supabase.co')+'/storage/v1/upload/resumable',httpStack:new tus.DefaultHttpStack(proxy?{agent:new HttpsProxyAgent(proxy)}:{}),headers:{authorization:'Bearer '+sessions[0].access_token},metadata:{bucketName:'ktak-chat',objectName:path,contentType:'application/pdf'},chunkSize:6*1024*1024,uploadDataDuringCreation:true,storeFingerprintForResuming:false,retryDelays:[0,1000,3000],onError:reject,onSuccess:resolve}).start());console.log('PASS actual 50 MB resumable upload');
 const downloaded=await ok(member.storage.from('ktak-chat').download(path),'member download 50 MB');assert.equal(downloaded.size,bytes.length);assert.equal(Buffer.compare(Buffer.from(await downloaded.arrayBuffer()),bytes),0);console.log('PASS downloaded bytes match');
 await no(outsider.storage.from('ktak-chat').createSignedUrl(path,60),'outsider cannot access attachment');
 const large=await owner.storage.from('ktak-chat').upload(path+'.over',Buffer.alloc(50*1024*1024+1),{contentType:'application/pdf'});assert.ok(large.error);console.log('PASS backend rejects over 50 MB');
 for(const [ext,mime] of [['docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],['xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],['odt','application/vnd.oasis.opendocument.text'],['7z','application/x-7z-compressed']]){const p=room+'/'+ids[0]+'/files/'+randomUUID()+'.'+ext;paths.push(p);await ok(owner.storage.from('ktak-chat').upload(p,Buffer.from('fictional MIME transport test'),{contentType:mime}),ext+' storage MIME accepted')}
}finally{if(paths.length)await ok(owner.storage.from('ktak-chat').remove(paths),'remove fictional attachments');if(room)await ok(owner.rpc('ktak_delete_room',{p_room_id:room}),'remove fictional room');for(const c of clients)await c.removeAllChannels()}
