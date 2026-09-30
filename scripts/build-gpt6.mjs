import {writeCameraRegions} from './build-gpt6-cctv.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {patchStability} from './gpt6-stability.mjs';
import {patchGoogleMaps} from './gpt6-google.mjs';
import {patchCanvas} from './gpt6-canvas.mjs';
import {patchPush} from './gpt6-push.mjs';
import {patchBoardMarkers} from './gpt6-markers.mjs';
const dir='dist/';
let h=fs.readFileSync(dir+'index.html','utf8');
fs.mkdirSync('.qa-ui',{recursive:true});fs.writeFileSync('.qa-ui/baseline-v356.html',h);
h=patchStability(h);
h=patchGoogleMaps(h);
h=patchCanvas(h);
h=patchPush(h);
h=patchBoardMarkers(h);
const swap=(a,b)=>{if(!h.includes(a))throw Error('Missing engine anchor: '+a.slice(0,80));h=h.replace(a,b)};
swap('function fillBrief(){',fs.readFileSync('src/gpt6/gpt6-brief-locations.js','utf8')+'\n'+fs.readFileSync('src/gpt6/gpt6-brief-draft.js','utf8')+'\nfunction fillBrief(){\n  if(g6KeepBrief())return;\n  g6LocationDraft=g6NormalizeLocations(state.brief);g6RenderLocations(true);');
swap('fillBrief();setBriefEdit(false);publish();toast("任務簡報已儲存")','g6SaveLocations();g6ClearBriefDraft();fillBrief();setBriefEdit(false);publish();toast("任務簡報已儲存")');
swap('  briefEditing=on;','  briefEditing=on;g6RenderLocations();');
swap('map.on(\'move\',syncGoogleMap);',"g6BindLocationMap();\nmap.on('move',syncGoogleMap);");
swap('fillBrief();setBriefEdit(false);renderMapItems();','fillBrief();setBriefEdit(briefEditing&&can("brief"));renderMapItems();');
swap('window.__KTAK35_CORE={',fs.readFileSync('src/gpt6/gpt6-radar.js','utf8')+'\nwindow.__KTAK35_CORE={');
swap('iconSize:[104,54],iconAnchor:[52,27]', 'iconSize:[40,40],iconAnchor:[20,20]');
swap('<title>KTAK V3.5 Police / Fire Command</title>','<title>KTAK GPT-6 · 任務工作站</title>');
swap('<meta name="apple-mobile-web-app-title" content="KTAK 3.5">','<meta name="apple-mobile-web-app-title" content="KTAK GPT-6">');
swap("return localGet(LOCATION_AUTO_STORAGE) !== '0';","return false; // GPT6: each mission requires explicit sharing consent");
swap('if(role()!=="commander"||!currentRoomUuid)return;', 'if(role()!=="commander"||!currentRoomUuid||!sb)return;');
swap('"error-callback":()=>{turnstileToken="";onlineStatus("安全驗證載入失敗","bad")}', '"error-callback":code=>{turnstileToken="";onlineStatus(String(code)==="110200"?"此測試網址尚未通過安全設定，請通知站主管理者（110200）":"安全驗證載入失敗，請重新整理後再試","bad")}');
swap('window.__KTAK35_CORE={',`window.__KTAK6_EDITOR={
 get selected(){if(!state||!document.querySelector('#mapPage.active,#boardPage.active'))return null;const board=document.getElementById('boardPage').classList.contains('active');const item=board?boardItem(selectedBoardId):itemById(selectedMapId);return item?{id:item.id,label:item.label||item.text||boardTypeName(item),board,editable:canEditItem(item)}:null},
 get sharing(){return locationSharing||locationStarting},
 get locating(){return locationStarting},
 get sync(){return gpt6SyncError?'failed':gpt6SyncPending?'pending':'saved'},
 retry(){publish()},
 select(id,board){if(!state)return;const item=board?boardItem(id):itemById(id);if(!item)return;if(board){selectedBoardId=id;renderBoard()}else{selectedMapId=id;renderMapSelection()}},
 list(board){if(!state)return [];return ((board?floor()?.objects:state?.map?.items)||[]).map(item=>({...item,label:item.label||item.text||boardTypeName(item)}))},
 transform(angle,scale){if(!state)return;const board=document.getElementById('boardPage').classList.contains('active');const item=board?boardItem(selectedBoardId):itemById(selectedMapId);if(!item||!canEditItem(item))return;if(board){pushBoardHistory();item.rotation=(item.rotation||0)+angle;item.scale=Math.max(.2,Math.min(6,(item.scale||1)*scale));renderBoard()}else{pushMapHistory();applyMapTransform(item,clone(item),angle,scale);renderMapItems()}publish()},
 cancel(){if(!state)return;selectedMapId=null;selectedBoardId=null;setMapTool('pan');setBoardTool('select');clearPreview();hideMapMenu();hideBoardMenu();renderMapItems();renderBoard()},
 details(){if(!state)return;const board=document.getElementById('boardPage').classList.contains('active');const item=board?boardItem(selectedBoardId):itemById(selectedMapId);if(!item)return;board?showBoardMenu(item,Math.min(innerWidth-310,90),120):showMapMenu(item,Math.min(innerWidth-310,90),120)},
 remove(){if(!state)return;document.getElementById(document.getElementById('boardPage').classList.contains('active')?'boardCtxDelete':'mapCtxDelete').click()},
 stop:()=>stopLocationSharing({disablePreference:true}),
};
window.__KTAK35_CORE={`);
swap('if(!item||!canEditItem(item))return;pushMapHistory();const photoPath=item.photoPath;', 'if(!item||!canEditItem(item))return;if(!confirm("刪除此地圖物件？"))return;pushMapHistory();const photoPath=item.photoPath;');
swap('if(!o||!canEditItem(o))return;pushBoardHistory();const photoPath=o.photoPath;', 'if(!o||!canEditItem(o))return;if(!confirm("刪除此戰術板物件？"))return;pushBoardHistory();const photoPath=o.photoPath;');
swap("if(b.dataset.page==='boardPage')setTimeout(renderBoard,30)","if(b.dataset.page==='boardPage')setTimeout(()=>{updateBoardScale();renderBoard()},30)");
swap('boardBaseScale=mobile?Math.min(1,usableW/1200):1;', 'boardBaseScale=mobile?Math.min(1,Math.max(usableW/1200,(stageRect.height-16)/canvas.height)):1;');
swap('</head>','<link rel="stylesheet" href="./gpt6-workspace.css">\n</head>');
swap('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','./vendor/leaflet/leaflet.css');
swap('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','./vendor/leaflet/leaflet.js');
swap('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','./owner-admin/supabase-client.js');
fs.cpSync('node_modules/leaflet/dist',dir+'vendor/leaflet',{recursive:true});
swap('</body>','<script src="./gpt6-workspace.js"></script>\n<script src="./gpt6-canvas-ui.js"></script>\n<script src="./gpt6-markers-ui.js"></script>\n<script src="./gpt6-notifications.js"></script>\n</body>');
// The legacy dock hid any card containing this control, including the new panel.
swap('#mapPage .card:has(#v35GridToggle){display:none!important}', 'body:not(.g6-workspace) #mapPage .card:has(#v35GridToggle){display:none!important}');
h=h.replaceAll('KTAK V3.5 · Police / Fire Command Pack','KTAK GPT-6 · 任務指揮');
h=h.replace('直接加入房間</button>','加入任務</button>');
// Keep password changes and recovery compatible with the existing management tools.
swap('id="joinPassword" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="4"', 'id="joinPassword" type="password" minlength="4" maxlength="72"');
swap('id="recoverCode" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="4"', 'id="recoverCode" type="password" minlength="4" maxlength="32"');
swap('id="newRoomPassword" type="password" minlength="8"', 'id="newRoomPassword" type="password" minlength="4"');
swap('新密碼（至少 8 碼）','新 PIN（4 位數字）或 8–72 碼密碼');
swap('if(p.length<8||p.length>72){toast("新密碼需 8～72 碼");return}', 'if(!/^[0-9]{4}$/.test(p)&&(p.length<8||p.length>72)){toast("請使用 4 位數字 PIN 或 8–72 碼密碼");return}');
swap('return}if(!/^\\d{4}$/.test(pass)){toast("房間密碼請輸入 4 位數字");return}', 'return}if(!/^[0-9]{4}$/.test(pass)&&(pass.length<8||pass.length>72)){toast("請輸入房間 PIN 或已設定的密碼");return}');
swap('if(!/^\\d{4}$/.test(code)){toast("指揮官 PIN 請輸入 4 位數字");return}', 'if(!/^([0-9]{4}|[0-9A-F]{32})$/.test(code)){toast("請輸入 4 位數字 PIN 或完整恢復金鑰");return}');
h=h.replace(/(<input id="joinPassword"[^>]*placeholder=")[^"]*/, '$1房間 PIN 或密碼');
h=h.replace('placeholder="指揮官恢復 PIN（4 位數字）"','placeholder="指揮官 PIN 或完整恢復金鑰"');
// Preserve the 3.5 Google engine. The owner supplies one independent, non-billing
// Maps Demo Key for the whole test site; ordinary users never configure a key.
const cfg=JSON.parse(fs.readFileSync(dir+'config.js','utf8').match(/= ([\s\S]*);/)[1]);
if(cfg.SUPABASE_URL!=='https://pvkbdmpwfrojmftncxmy.supabase.co')throw Error('Isolation failed');
const googleKey=String(cfg.GOOGLE_MAPS_API_KEY||'').trim();
cfg.GOOGLE_MAPS_API_KEY=/^(YOUR_|DISABLED_)|^$/.test(googleKey)?'':googleKey;
cfg.GOOGLE_MAPS_KEY_MODE=cfg.GOOGLE_MAPS_API_KEY?'demo':'pending';
if(cfg.GOOGLE_MAPS_API_KEY&&process.env.VITE_GOOGLE_MAPS_KEY_MODE!=='demo')throw Error('A separate no-billing Maps Demo Key is required for this zero-cost test site');
fs.writeFileSync(dir+'config.js','window.KTAK_CONFIG = '+JSON.stringify(cfg)+';\n');
// Keep authorization failures within the same basemap controller, so an old
// emergency tile layer cannot cover satellite view or give a false Google state.
const fallbackFile=dir+'ktak-v35-google-fallback.js';
const briefMapFile=dir+'ktak-v35-brief-map-v353.js';
let briefMap=fs.readFileSync(briefMapFile,'utf8');
briefMap=briefMap.replace("state()?.brief?.executionLocation||loc.label", "(Array.isArray(state()?.brief?.executionLocations)?state().brief.executionLocations.find(x=>x.lat!=null&&x.lng!=null)?.name:state()?.brief?.executionLocation)||loc.label");
fs.writeFileSync(briefMapFile,briefMap);
let googleFallback=fs.readFileSync(fallbackFile,'utf8');
const fallbackAnchor="  function activateFallback(reason = 'Google Maps 驗證失敗') {";
if(!googleFallback.includes(fallbackAnchor))throw Error('Google fallback anchor missing');
googleFallback=googleFallback.replace(fallbackAnchor,fallbackAnchor+'\n    if(window.__KTAK6_GOOGLE_FAILURE){window.__KTAK6_GOOGLE_FAILURE();return}');
fs.writeFileSync(fallbackFile,googleFallback);
let p=fs.readFileSync(dir+'ktak-v35-assignment-prompt-v14.js','utf8');
p=p.replace("function chooseTask(rows){return (rows||[]).map(memberView).filter(x=>isMine(x)&&ACTIVE.has(x.status)).sort((a,b)=>rank(b)-rank(a)||new Date(b.created_at||0)-new Date(a.created_at||0))[0]||null}","function chooseTask(rows){return (rows||[]).map(memberView).filter(x=>isMine(x)&&x.status==='pending'&&!wasPromptSeen(x)).sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0))[0]||null}");
p=p.replace("if(!force&&a.status!=='pending')return;","if(!force&&a.status!=='pending'){if(current?.id===a.id)hidePrompt(a);return;}");
// Keep the visible task tied to the displayed controls; an unrelated UPDATE must not steal it.
p=p.replace("if(isMine(a)&&ACTIVE.has(a.status)){current=a;renderPrompt(a,false)}","if(isMine(a)&&ACTIVE.has(a.status)){renderPrompt(a,false)}");
p=p.replace("if(r!==room()||u!==me())return;const task=chooseTask(data);current=task;if(task&&show)renderPrompt(task,false);else if(!task)ensurePrompt().classList.add('hidden');","if(r!==room()||u!==me())return;const displayed=(data||[]).map(memberView).find(x=>x.id===current?.id);if(current&&(!displayed||displayed.status!=='pending'))hidePrompt(current);const task=chooseTask(data);if(task&&show)renderPrompt(task,false);");
p=p.replace("if(current&&['pending','accepted'].includes(current.status)&&ensurePrompt().classList.contains('hidden')&&document.visibilityState==='visible')renderPrompt(current,false)","if(document.visibilityState==='visible')await refresh(true)");
new vm.Script(p);fs.writeFileSync(dir+'ktak-v35-assignment-prompt-v14.js',p);
let command=fs.readFileSync(dir+'ktak-v35-command.js','utf8');
command=command.replaceAll('O-A0058-003.png','O-A0058-006.png');
const radarAnchor='radarLayer=L.imageOverlay(`${RADAR_URL}?t=${Math.floor(Date.now()/600000)}`,[[20.5,118.0],[26.5,124.0]],{opacity:.55,interactive:false,zIndex:350})';
if(!command.includes(radarAnchor))throw Error('Radar anchor missing');
command=command.replace(radarAnchor,'radarLayer=window.__KTAK6_RADAR.create(`${RADAR_URL}?t=${Math.floor(Date.now()/300000)}`)');
command=command.replace("let n=0,legacy=false;", "if(!room()||!me()||!sb()){el.classList.remove('offline','pending');el.textContent='尚未進入任務';return}\n  let n=0,legacy=false;");
fs.writeFileSync(dir+'ktak-v35-command.js',command);
const historyFile=dir+'ktak-v35-radar-v13.js';let historyRadar=fs.readFileSync(historyFile,'utf8');
historyRadar=historyRadar.replace('function hideOrdinaryRadar(){','function hideOrdinaryRadar(){window.__KTAK6_RADAR.hideLatest();').replace('function restoreOrdinaryRadar(){','function restoreOrdinaryRadar(){window.__KTAK6_RADAR.restoreLatest();').replace('ensurePane();syncUi();','syncUi();');
fs.writeFileSync(historyFile,historyRadar);
for(const m of h.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1]);
fs.writeFileSync(dir+'index.html',h);
const nativeHtml=dir+'native-debug/index.html';if(fs.existsSync(nativeHtml))fs.writeFileSync(nativeHtml,fs.readFileSync(nativeHtml,'utf8').replaceAll('\"/assets/','\"./assets/'));
fs.copyFileSync('public/manifest.webmanifest',dir+'manifest.webmanifest');
fs.copyFileSync('src/gpt6/gpt6-sw.js',dir+'sw.js');
for(const folder of ['owner-admin','owner-admin-v2','owner-admin-v3']){
 const file=dir+folder+'/index.html';
 let admin=fs.readFileSync(file,'utf8').replaceAll('KTAK DEV','KTAK GPT-6').replaceAll('DEV 房間','獨立測試房間').replaceAll('DEV 管理','測試管理');
 fs.writeFileSync(file,admin);
}
for(const name of ['gpt6-workspace.js','gpt6-workspace.css','gpt6-canvas-ui.js','gpt6-markers-ui.js','gpt6-notifications.js'])fs.copyFileSync('src/gpt6/'+name,dir+name);
// Camera code and catalog are excluded from startup; import only on explicit enable.
writeCameraRegions(JSON.parse(fs.readFileSync('public/data/gpt6-cctv.json','utf8')),dir+'data');
const cameraCatalogHash=createHash('sha256').update(fs.readFileSync(dir+'data/gpt6-cctv.json')).digest('hex').slice(0,12);
const cameraModule=fs.readFileSync('src/gpt6/gpt6-cctv.js','utf8').replaceAll('__CCTV_CATALOG__','./data/gpt6-cctv.json?v='+cameraCatalogHash);
fs.writeFileSync(dir+'gpt6-cctv.js',cameraModule);
const cameraModuleHash=createHash('sha256').update(cameraModule).digest('hex').slice(0,12);
const cameraUiPath=dir+'gpt6-canvas-ui.js';fs.writeFileSync(cameraUiPath,fs.readFileSync(cameraUiPath,'utf8').replace('__CCTV_MODULE__','./gpt6-cctv.js?v='+cameraModuleHash));
fs.writeFileSync(dir+'KTAK_BUILD.json',JSON.stringify({version:'GPT6-0.1',baseline:'3.5.6-e371832',isolatedProject:'pvkbdmpwfrojmftncxmy',iphoneVerified:false}));
console.log('GPT6 workspace built with isolated config, explicit consent, editor bridge and assignment reconciliation.');

// Content-address local scripts and styles so a resumed phone cannot mix releases.
// Preserve legacy execution order, but remove 22 separate startup requests.
const startupTags=[...h.matchAll(/<script src="\.\/((?:ktak-v35-|gpt6-)[^"?]+\.js)(?:\?[^\"]*)?"><\/script>/g)];
if(startupTags.length!==22)throw Error('Unexpected startup script count: '+startupTags.length);
const startup=startupTags.map(m=>';\n'+fs.readFileSync(dir+m[1],'utf8')).join('\n');
new vm.Script(startup);fs.writeFileSync(dir+'gpt6-startup.js',startup);
let inserted=false;h=h.replace(/<script src="\.\/((?:ktak-v35-|gpt6-)[^"?]+\.js)(?:\?[^\"]*)?"><\/script>/g,()=>{if(inserted)return '';inserted=true;return '<script src="./gpt6-startup.js"></script>'});
h=h.replace(/((?:src|href)=")[^"]+?(?:\.js|\.css)(?:\?[^"]*)?"/g,(match,prefix)=>{const url=match.slice(prefix.length,-1).split('?')[0];if(/^(https?:|data:|\/\/)/.test(url))return match;const file=path.join(dir,url.replace(/^\//,''));if(!fs.existsSync(file))return match;const hash=createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0,12);return prefix+url+'?v='+hash+'"'});fs.writeFileSync(dir+'index.html',h);

fs.writeFileSync(dir+'sw.js',fs.readFileSync('src/gpt6/gpt6-sw.js','utf8').replace('__SHELL_REVISION__',createHash('sha256').update(h).digest('hex').slice(0,12)));
