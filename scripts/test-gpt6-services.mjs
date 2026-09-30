import fs from 'node:fs';import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
const cfg=JSON.parse(fs.readFileSync('dist/config.js','utf8').match(/= ([\s\S]*);/)[1]);assert.equal(cfg.SUPABASE_URL,'https://pvkbdmpwfrojmftncxmy.supabase.co');
const sessions=JSON.parse(fs.readFileSync('/workspace/scratch/71e602ebc86b/gpt6-test-sessions.json','utf8'));const checks=[];const pass=s=>{checks.push(s);console.log('PASS',s)};
async function call(path,body,auth){const r=await fetch(cfg.SUPABASE_URL+path,{method:'POST',headers:{apikey:cfg.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+(auth||cfg.SUPABASE_PUBLISHABLE_KEY),'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();return {status:r.status,data}};
for(const name of ['ktak-push']){
 const r=await call('/functions/v1/'+name,{action:'vapid-public-key'},sessions[0].access_token);assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(r.data.publicKey?.length>80);pass(name+' isolated VAPID configuration');
 const denied=await call('/functions/v1/'+name,{action:'vapid-public-key'});assert.ok(denied.status===401||denied.status===403);pass(name+' rejects unauthenticated requests');
}
const push35=await call('/functions/v1/ktak35-push',{},sessions[0].access_token);assert.equal(push35.status,400);pass('assignment push validates event input');
const push35anon=await call('/functions/v1/ktak35-push',{});assert.equal(push35anon.status,401);pass('assignment push rejects unauthenticated requests');
const noadmin=await call('/functions/v1/ktak-admin',{action:'list',admin_token:'invalid-test-token'});assert.equal(noadmin.status,401);pass('admin endpoint rejects invalid token');
const bad=await call('/rest/v1/rpc/ktak_admin_setup',{p_bootstrap:'invalid-test-bootstrap',p_password:'TestOnly123!',p_device_key:'g6-services'});assert.equal(bad.data.status,'INVALID_BOOTSTRAP');pass('bootstrap verification');
const bootstrap=fs.readFileSync('/workspace/scratch/71e602ebc86b/gpt6-admin-bootstrap.txt','utf8').trim();const password=randomBytes(8).toString('base64url');
const setup=await call('/rest/v1/rpc/ktak_admin_setup',{p_bootstrap:bootstrap,p_password:password,p_device_key:'g6-services'});assert.equal(setup.data.status,'OK');pass('owner admin setup without a mission account');
const token=setup.data.token;
const rooms=await call('/functions/v1/ktak-admin',{action:'list',admin_token:token});assert.equal(rooms.status,200,JSON.stringify(rooms.data));assert.ok(Array.isArray(rooms.data.rooms));pass('owner admin room listing');
await call('/rest/v1/rpc/ktak_admin_logout',{p_token:token});
const after=await call('/functions/v1/ktak-admin',{action:'list',admin_token:token});assert.equal(after.status,401);pass('owner admin logout revokes session');
const login=await call('/rest/v1/rpc/ktak_admin_login',{p_password:password,p_device_key:'g6-services'});assert.equal(login.data.status,'OK');pass('owner admin password login');await call('/rest/v1/rpc/ktak_admin_logout',{p_token:login.data.token});
fs.writeFileSync('reports/services-tests.json',JSON.stringify({at:new Date().toISOString(),passed:true,checks},null,2));
