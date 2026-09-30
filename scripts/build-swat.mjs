import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const dir='dist';let h=fs.readFileSync(dir+'/index.html','utf8');
const replace=(a,b)=>{if(!h.includes(a))throw Error('SWAT anchor missing: '+a.slice(0,70));h=h.replace(a,b)};
const bootStart=h.indexOf('(async()=>{\n  const backendOk=await initBackend();');
const bootEnd=h.indexOf('\n})();',bootStart);
if(bootStart<0||bootEnd<0)throw Error('SWAT startup boundary missing');
h=h.slice(0,bootStart)+fs.readFileSync('src/swat-room.js','utf8')+h.slice(bootEnd+6);
replace('auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}','auth:{storageKey:"ktak-swat-auth",persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}');
replace('觀察員僅能觀看；其他角色可發言。支援 @Tag、引用回覆、超連結、照片與檔案；指揮官可刪除房間內訊息。','所有成員都能發言與編輯。支援 @Tag、引用回覆、照片與檔案。');
replace('任務簡報由指揮官權限人員維護，其餘人員依權限觀看。','所有成員都能共同編輯任務簡報。');
replace('<div class="label" style="margin-top:10px">更換房間密碼</div>','<div class="label" style="display:none">更換房間密碼</div>');
replace("window.__ktakEnhance?.rememberRoom(r.room_id,r.room_code||'ROOM');", "window.__ktakEnhance?.rememberRoom(r.room_id,r.room_code||'ROOM');const token=swatStorage.get('link:'+r.room_id);if(!token)throw Error('請從該房間的分享連結進入');swatStorage.set('last-link',token);history.replaceState(null,'','#room='+token);");
replace('placeholder="設定房號，例如 A102"','placeholder="任務名稱（可留空）" maxlength="80"');
replace('<div class="formTitle">創建安全房間</div>','<div class="formTitle">建立共同任務</div>');
replace('<div class="sectionTitle">房間權限</div>','<div class="sectionTitle">房間設定</div><div class="card"><button onclick="window.__SWAT.share()">分享房間</button><button onclick="window.__SWAT.nickname()">更改顯示名稱</button><p>持有房間連結的人都能查看、編輯與刪除房間內容。</p></div>');
replace('<h2>成員核准與權限</h2>','<h2>成員</h2>');
replace('<h2>安全管理</h2>','<h2>保存期限</h2>');
replace('</head>',`<meta name="referrer" content="no-referrer"><style>
#createPassword,#showRecoverBtn,#joinForm,#recoverForm,#roomAdminCard,#permissionPage .card:has(#auditList),#permissionPage .card:has(.grid2),#newRoomPassword,#changeRoomPasswordBtn{display:none!important}
#securityAdminCard>.label:last-of-type,#securityAdminCard>.row:last-child{display:none!important}
.g6-admin-link{display:none!important}
</style></head>`);
replace('</body>',`<script>
(()=>{document.querySelector('.brandText b').textContent='KTAK SWAT';document.querySelector('.brandText small').textContent='共同任務工作站';document.querySelector('#entryHome h1').textContent='KTAK SWAT';document.querySelector('#entryHome p').textContent='建立任務後分享連結，所有加入者都能共同編輯。';document.querySelector('.g6-kicker')?.remove();document.querySelector('.g6-test-note')?.remove();const command=document.querySelector('[data-page="commandPage"]');command.textContent='協作';command.title='協作';const b=document.createElement('button');b.textContent='分享房間';b.onclick=()=>window.__SWAT.share();document.querySelector('.g6-room-dialog').prepend(b);})();
</script></body>`);
// Keep every engine asset and feature. Namespace origin storage and make PWA
// paths work in a GitHub project subdirectory, without controlling sibling apps.
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])}
fs.writeFileSync(dir+'/index.html',h);
for(const f of walk(dir).filter(f=>/\.(js|html|json|webmanifest)$/.test(f))){
 let s=fs.readFileSync(f,'utf8').replaceAll('KTAK GPT-6','KTAK SWAT').replaceAll('ktak-gpt6-','ktak-swat-').replaceAll('ktak.v','ktak.swat.v');
 s=s.replaceAll('href="/ktak-icons/','href="./ktak-icons/');
 s=s.replaceAll('https://ktak-gpt6.nianxi19901214.chatgpt.site','https://walther-p.github.io/KTAKSWAT');
 fs.writeFileSync(f,s);
}
const manifest=JSON.parse(fs.readFileSync(dir+'/manifest.webmanifest','utf8'));Object.assign(manifest,{name:'KTAK SWAT',short_name:'KTAK SWAT',description:'分享連結即可共同編輯的任務工作站',start_url:'./',scope:'./'});manifest.icons.forEach(i=>i.src='./'+i.src.replace(/^\//,''));fs.writeFileSync(dir+'/manifest.webmanifest',JSON.stringify(manifest,null,2));
let sw=fs.readFileSync(dir+'/sw.js','utf8');
sw=sw.replace("k.startsWith('ktak-')","k.startsWith('ktak-swat-')").replace("['/','/index.html'].includes(url.pathname)","[new URL(self.registration.scope).pathname,new URL(shellUrl).pathname].includes(url.pathname)").replace("url.pathname==='/config.js'","url.pathname===new URL('./config.js',self.registration.scope).pathname").replace("url=new URL('/',base)","url=new URL('./',base)").replace("if(candidate.origin!==base.origin)return url.href;","if(candidate.origin!==base.origin)return url.href;").replace("if(new URL(client.url).origin!==new URL(self.registration.scope).origin)continue;","if(!client.url.startsWith(self.registration.scope))continue;");
// Release hash covers the SWAT shell, not the upstream GPT6 shell.
sw=sw.replace(/ktak-swat-shell-[a-f0-9]+/, 'ktak-swat-shell-'+createHash('sha256').update(fs.readFileSync(dir+'/index.html')).digest('hex').slice(0,12));fs.writeFileSync(dir+'/sw.js',sw);
fs.writeFileSync(dir+'/.nojekyll','');
for(const folder of ['owner-admin-v2','owner-admin-v3','native-debug'])fs.rmSync(dir+'/'+folder,{recursive:true,force:true});
for(const f of fs.readdirSync(dir+'/owner-admin'))if(f!=='supabase-client.js')fs.rmSync(dir+'/owner-admin/'+f,{recursive:true,force:true});
h=fs.readFileSync(dir+'/index.html','utf8');
h=h.replace(/([?&]v=)[a-f0-9]{12}/g,'$1'+createHash('sha256').update(h).digest('hex').slice(0,12));
for(const [i,m] of [...h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].entries())if(!/\bsrc=/.test(m[1])&&m[2].trim())new vm.Script(m[2],{filename:'SWAT inline '+i});
fs.writeFileSync(dir+'/index.html',h);
console.log('KTAK SWAT built: link-only rooms, equal editing, separate storage, GitHub project paths.');
