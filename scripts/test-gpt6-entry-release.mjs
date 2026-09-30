import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {JSDOM} from 'jsdom';
// Exercise the real entry dialog with deferred subscription checks, permission denial and retry.
const dom=new JSDOM('<body><div id="app"><main></main></div><div id="entryOverlay"></div><dialog class="g6-room-dialog"></dialog><div class="chatInfo"></div><div class="pushCard"><button id="pushToggleBtn"></button><span id="pushStatus">未開啟</span><p id="pushHelp"></p></div></body>',{runScripts:'outside-only'});
const w=dom.window;w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};w.setInterval=()=>1;
let calls=0,resolveCheck,fail=true;const checked=new Promise(r=>resolveCheck=r);
w.__KTAK35_CORE={roomUuid:'room-a'};w.__KTAK6_PUSH={enabled:false,refresh:()=>checked,enable:async()=>{calls++;if(fail)throw Error('使用者未允許');w.__KTAK6_PUSH.enabled=true},test:async()=>({delivered:1})};
w.eval(fs.readFileSync('src/gpt6/gpt6-notifications.js','utf8'));
const ask=w.document.querySelector('.g6-entry-push');assert.equal(ask.open,false);
w.document.getElementById('entryOverlay').classList.add('hidden');w.document.dispatchEvent(new w.Event('g6:push-status'));assert.equal(ask.open,false);
resolveCheck();await new Promise(r=>setTimeout(r,0));assert.equal(ask.open,true);assert.equal(calls,0);
ask.querySelector('button').click();assert.equal(calls,1);await new Promise(r=>setTimeout(r,0));assert.equal(ask.open,true);assert.match(ask.textContent,/使用者未允許/);
fail=false;ask.querySelector('button').click();await new Promise(r=>setTimeout(r,0));assert.equal(ask.open,false);assert.equal(calls,2);
w.document.dispatchEvent(new w.Event('g6:push-status'));assert.equal(ask.open,false);
console.log('PASS entry waits for room entry and subscription check; explicit click enables; denial stays retryable; success closes prompt');dom.window.close();
const handlers={},cacheStores=new Map();let network=0;
const key=r=>typeof r==='string'?r:r.url;
const caches={keys:async()=>[...cacheStores.keys()],delete:async k=>cacheStores.delete(k),open:async name=>{if(!cacheStores.has(name))cacheStores.set(name,new Map());const c=cacheStores.get(name);return {match:async r=>c.get(key(r))?.clone(),put:async(r,v)=>c.set(key(r),v),keys:async()=>[...c.keys()].map(url=>({url})),delete:async r=>c.delete(key(r))}}};
function redirectedShell(){const r=new Response('<title>KTAK GPT-6</title><div id="app"></div>',{headers:{'content-type':'text/html','content-encoding':'gzip','content-length':'999'}});Object.defineProperty(r,'redirected',{value:true});Object.defineProperty(r,'url',{value:'https://qa.invalid/'});r.clone=redirectedShell;return r}
const sw={URL,Request,Response,Headers,Promise,Math,Error,caches,self:{registration:{scope:'https://qa.invalid/'},addEventListener:(n,f)=>handlers[n]=f,skipWaiting:async()=>{},clients:{claim:async()=>{}}},fetch:async()=>{network++;return redirectedShell()}};
vm.createContext(sw);vm.runInContext(fs.readFileSync('src/gpt6/gpt6-sw.js','utf8'),sw);
let installed;handlers.install({waitUntil:p=>installed=p});await installed;assert.equal(network,1);
async function nav(url){let answer;handlers.fetch({request:{url,method:'GET',mode:'navigate'},respondWith:p=>answer=p});return answer?await answer:null}
assert.match(await (await nav('https://qa.invalid/?open=command')).text(),/KTAK/);await nav('https://qa.invalid/');assert.equal(network,1);
assert.equal(await nav('https://qa.invalid/owner-admin-v3/'),null);assert.equal(await nav('https://qa.invalid/rest/v1/rooms'),null);assert.equal(await nav('https://elsewhere.invalid/'),null);
let shell=await nav('https://qa.invalid/');assert.equal(shell.redirected,false);assert.equal(shell.headers.get('content-encoding'),null);
const saved=[...cacheStores.values()][0];saved.set('https://qa.invalid/index.html',redirectedShell());shell=await nav('https://qa.invalid/');assert.equal(shell.redirected,false);assert.match(await shell.text(),/KTAK/);
saved.clear();shell=await nav('https://qa.invalid/');assert.equal(shell.redirected,false);assert.match(await shell.text(),/KTAK/);
assert.equal(await nav('https://qa.invalid/recover.html'),null);
console.log('PASS Safari redirect-chain removal during install, legacy cached navigation and network fallback; recovery page bypasses shell');
console.log('PASS release shell is fetched once during install; repeated entry has zero document requests; admin/data/other origins bypass shell');
const html=fs.readFileSync('dist/index.html','utf8'),css=fs.readFileSync('src/gpt6/gpt6-workspace.css','utf8');
assert.match(html,/v355TeamDivIcon[\s\S]*?iconSize:\[40,40\],iconAnchor:\[20,20\]/);assert.match(css,/v355TeamMarker\{width:40px;height:40px\}/);
assert.match(fs.readFileSync('src/gpt6/gpt6-radar.js','utf8'),/pane:"overlayPane"/);assert.doesNotMatch(fs.readFileSync('src/gpt6/gpt6-canvas-ui.js','utf8'),/g6-radar-time|summary.textContent='使用說明'/);
console.log('PASS team footprint matches quick symbols; radar is outside hidden tile pane; instructions and playback remain expanded');
const recovery=fs.readFileSync('public/recover.html','utf8'),elements={repair:{},status:{}};let destination='',removed=[];
const recoveryContext={document:{getElementById:id=>elements[id]},navigator:{serviceWorker:{register:async(path,options)=>{assert.equal(path,'./sw.js');assert.equal(options.updateViaCache,'none');return {update:async()=>{}}}}},window:{caches:true},caches:{keys:async()=>['ktak-gpt6-shell-old','ktak-gpt6-static-v1','identity-data'],delete:async key=>removed.push(key)},location:{replace:path=>destination=path},setTimeout,clearTimeout,Error,Promise};
vm.createContext(recoveryContext);vm.runInContext(recovery.match(/<script>([\s\S]*?)<\/script>/)[1],recoveryContext);await elements.repair.onclick();assert.equal(destination,'./');assert.deepEqual(removed,['ktak-gpt6-shell-old']);
recoveryContext.navigator.serviceWorker.register=async()=>{throw Error('network unavailable')};await elements.repair.onclick();assert.equal(elements.repair.disabled,false);assert.match(elements.status.textContent,/network unavailable/);
console.log('PASS recovery updates worker and deletes only public shell cache; failure remains retryable without clearing identity');
