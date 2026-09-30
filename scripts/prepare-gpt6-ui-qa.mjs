import fs from 'node:fs';
import {createHash} from 'node:crypto';
// Local UI fixture. Authentication and transport are tested separately against the test project.
let html=fs.readFileSync('dist/index.html','utf8');
const anchor="  showEntry('home');if(!await initBackend())return;";
if(!html.includes(anchor))throw new Error('QA boot anchor changed');
html=html.replace('<head>','<head><base href="/">');
html=html.replace(/<script src="https:\/\/challenges.cloudflare.com[^>]*><\/script>/,'');
html=html.replace(anchor,`  currentUserId='00000000-0000-4000-8000-000000000001';roomId='UI-QA';currentRoomUuid='00000000-0000-4000-8000-000000000099';
  state=blankState(roomId,currentUserId);state.meta.expiresAt=new Date(Date.now()+86400000).toISOString();
  state.users[currentUserId]={id:currentUserId,nick:'測試成員',role:'commander',approved:true};
  state.brief={...defaultBrief(),missionTime:'2026/09/09 10:00 虛構演練',caseType:'操作測試',situationSummary:'本頁僅供 UI 測試，不連線任何任務資料。',executionLocation:'虛構訓練場',teamComposition:'A 組、B 組'};
  state.map.items=[{id:'00000000-0000-4000-8000-000000000010',type:'symbol',icon:'v355team:A',lat:23.003,lng:120.215,label:'A 攻擊隊',color:'#35a7ff',scale:1,rotation:0,ownerId:currentUserId,ownerName:'虛構指揮官',note:'虛構集合點'}];
  state.board.pages=[{id:'00000000-0000-4000-8000-000000000020',name:'1F',objects:[{id:'00000000-0000-4000-8000-000000000021',type:'friendly',x:350,y:300,rotation:0,scale:1,color:'#35a7ff',ownerId:currentUserId,ownerName:'虛構指揮官'}]},{id:'00000000-0000-4000-8000-000000000022',name:'2F',objects:[]}];
  $('entryOverlay').classList.add('hidden');renderAll();window.__KTAK6_QA_ONLY=true;return;
  const backendOk=false;`);
if(process.argv.includes('--google')){
  const config=JSON.parse(fs.readFileSync('dist/config.js','utf8').match(/= ([\s\S]*);/)[1]);
  if(config.GOOGLE_MAPS_KEY_MODE!=='demo')throw Error('Live map QA requires the no-billing Demo Key');
  html=html.replace("  $('entryOverlay').classList.add('hidden');renderAll();", `
  window.__KTAK6_QA_CAMERA=()=>({googleMap,googleMapsReady,map});
  googleMapSlotClaimed=true;googleMapGateInfo={used:0,limit:8000,reason:'Local QA Demo Key'};
  state.map.items[0]={...state.map.items[0],icon:'suspect',label:'測試位置'};
  map.setView([23.003,120.215],18);
  $('entryOverlay').classList.add('hidden');renderAll();`);
  html=html.replace('</body>',`<output id="qa-camera" style="position:fixed;bottom:0;left:100px;z-index:99999;background:#fff;color:#000;font:14px monospace;padding:5px"></output>
  <script>let qaReference=null;setInterval(()=>{
    const el=document.getElementById('qa-camera'),{googleMap,googleMapsReady,map}=window.__KTAK6_QA_CAMERA?.()||{};if(!googleMap||!googleMapsReady){el.textContent='Google loading';return}
    if(!qaReference){qaReference=new google.maps.OverlayView();qaReference.onAdd=()=>{const cross=document.createElement('div');cross.style.cssText='position:absolute;width:4px;height:4px;background:#0f0;border:1px solid #000;transform:translate(-50%,-50%);pointer-events:none';qaReference.cross=cross;qaReference.getPanes().floatPane.append(cross)};qaReference.draw=()=>{const p=qaReference.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(23.003,120.215));qaReference.cross.style.left=p.x+'px';qaReference.cross.style.top=p.y+'px'};qaReference.onRemove=()=>qaReference.cross?.remove();qaReference.setMap(googleMap)}
    const projection=qaReference.getProjection(),p=projection?.fromLatLngToContainerPixel(new google.maps.LatLng(23.003,120.215)),q=map.latLngToContainerPoint([23.003,120.215]);
    const base=document.getElementById('googleMapBase'),scale=base.getBoundingClientRect().width/base.clientWidth;
    const r=qaReference.cross?.getBoundingClientRect(),m=map.getContainer().getBoundingClientRect();
    el.textContent='Leaflet '+map.getZoom()+' / Google '+googleMap.getZoom()+' / display '+scale.toFixed(1)+'x / max '+map.getMaxZoom()+' / error px '+(r?Math.hypot(r.left+r.width/2-m.left-q.x,r.top+r.height/2-m.top-q.y).toFixed(2):'pending');
  },250)</script></body>`);
}
// Browser QA controls exercise production gesture listeners with real timers.
// This fixture is outside dist and is never published.
html=html.replace('</body>',`<button id="qa-hold" style="position:fixed;right:0;top:0;z-index:99999">QA 長按</button><output id="qa-result" style="position:fixed;right:0;top:48px;z-index:99999;background:#fff;color:#000"></output>
<script>document.getElementById('qa-hold').onclick=()=>{
const page=document.querySelector('#mapPage.active,#boardPage.active'),target=page?.querySelector('#map,canvas');if(!target)return;
const r=target.getBoundingClientRect(),x=r.left+Math.min(160,r.width/2),y=r.top+Math.min(240,r.height/2);
const emit=type=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:987,pointerType:'touch',button:0,clientX:x,clientY:y}));
emit('pointerdown');setTimeout(()=>{const layer=page.querySelector('.g6-radial-backdrop'),before=!layer.classList.contains('hidden');emit('pointerup');layer.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));document.getElementById('qa-result').textContent='持續按住:'+before+' 放開保留:'+!layer.classList.contains('hidden');},800);
};</script></body>`);
fs.mkdirSync('.qa-ui',{recursive:true});fs.writeFileSync('.qa-ui/fixture.html',html);
for(const [name,w,h] of [['mobile',390,844],['landscape',844,390],['desktop',1366,768]])fs.writeFileSync('.qa-ui/'+name+'.html',`<!doctype html><html><head><meta charset="utf-8"><title>KTAK UI QA ${name}</title><style>body{margin:0;background:#18232e}iframe{display:block;border:0;width:${w}px;height:${h}px}</style></head><body><iframe id="qa-frame" title="${name} QA" src="/__qa__/fixture.html?v=${createHash('sha256').update(html).digest('hex').slice(0,12)}"></iframe></body></html>`);
console.log('Local UI fixtures prepared; network authentication is tested separately.');
