import fs from 'node:fs';

const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';

let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

const replaceRegex=(text,regex,replacement,label)=>{
  if(!regex.test(text)) throw new Error(`V3.5 field/performance patch missing: ${label}`);
  regex.lastIndex=0;
  return text.replace(regex,replacement);
};
const replaceOnce=(text,needle,replacement,label)=>{
  if(!text.includes(needle)) throw new Error(`V3.5 field/performance patch missing: ${label}`);
  return text.replace(needle,replacement);
};

/* ---------------- command runtime: reduce fan-out + optimistic state ---------------- */

command=replaceRegex(
  command,
  /const TEMPLATES=\{[\s\S]*?\};/,
  m=>m+`
const MISSION_GUIDES={
  police_tactical:{text:'高風險／戰術勤務：優先掌握人員狀態、派遣、SOS 與戰術地圖。',focus:['people','dispatch','sos'],placeholder:'例如：建立封鎖線／進入 A 棟'},
  warrant:{text:'搜索／逮捕：優先掌握進入任務、搜索區、隊員位置與完成狀態。',focus:['dispatch','search','people'],placeholder:'例如：A 棟 3F 搜索／拘提目標'},
  missing_person:{text:'失蹤人口：優先使用搜索區、進度、天氣與人員分組。',focus:['search','weather','people'],placeholder:'例如：A 搜索區地毯式搜索'},
  crowd:{text:'群眾活動：優先掌握人員配置、派遣與緊急支援。',focus:['people','dispatch','sos'],placeholder:'例如：東側出入口警戒'},
  event_security:{text:'大型活動維安：優先掌握崗位、人員狀態、派遣與異常事件。',focus:['people','dispatch','sos'],placeholder:'例如：北門安檢／機動支援'},
  traffic_major:{text:'重大交通事故：優先派遣、SOS、現場位置與事件時間軸。',focus:['dispatch','sos','people'],placeholder:'例如：封閉內側車道／傷患區支援'},
  fire_building:{text:'建築火警：優先掌握 SOS、人員、樓層搜索、派遣與天氣。',focus:['sos','people','dispatch','weather'],placeholder:'例如：A 棟 3F 搜索／火點回報'},
  wildfire:{text:'山林火災：優先掌握天氣、搜索區、人員位置與派遣。',focus:['weather','search','people','dispatch'],placeholder:'例如：北側防火線搜索'},
  flood:{text:'淹水／水災：優先掌握天氣、搜索區、SOS 與撤離任務。',focus:['weather','search','sos','dispatch'],placeholder:'例如：低窪區撤離／逐戶搜索'},
  earthquake:{text:'地震搜救：優先使用搜索區、SOS、人員狀態與派遣。',focus:['search','sos','people','dispatch'],placeholder:'例如：倒塌建物 A 區搜索'},
  water_rescue:{text:'水域救援：優先掌握 SOS、人員位置、天氣與派遣。',focus:['sos','people','weather','dispatch'],placeholder:'例如：下游 200m 搜索／岸際支援'},
  mci:{text:'大量傷病患：優先掌握人員、派遣、SOS 與事件時間軸。',focus:['people','dispatch','sos'],placeholder:'例如：紅區後送／檢傷站支援'},
  custom:{text:'自訂任務：所有指揮工具維持可用，依現場自行編組。',focus:['dispatch','people'],placeholder:'輸入自訂任務內容'}
};`,
  'mission guide map'
);

command=replaceOnce(
  command,
  'async function setupRealtime(){',
  `let refreshDebounce=null,lastLightRender=0;
function scheduleRefresh(){
  clearTimeout(refreshDebounce);
  refreshDebounce=setTimeout(()=>refreshAll(true).catch(e=>console.warn('KTAK35 refresh',e)),140);
}
async function setupRealtime(){`,
  'realtime debounce'
);
command=command.replace(/\},\(\)=>refreshAll\(\)\)/g,'},()=>scheduleRefresh())');

command=replaceRegex(
  command,
  /async function ensureRuntime\(\)\{[\s\S]*?\}\nfunction effectiveStatus/,
  `async function ensureRuntime(){
  if(!room()||!core.state)return;
  if(roomKey!==room()){
    await setupRealtime();
    await refreshAll(false);
    initMapLayers();
    renderAll35();
    await flushQueue();
    scheduleDisaster();
    lastLightRender=Date.now();
    return;
  }
  if(Date.now()-lastLightRender>1200){
    lastLightRender=Date.now();
    renderSummary();
    renderSelfStatus();
    renderOffline();
  }
}
function effectiveStatus`,
  'lightweight ensureRuntime'
);

command=replaceRegex(
  command,
  /async function setStatus\(status,note='',fromQueue=false\)\{[\s\S]*?\}\nfunction renderAssigneeChoices/,
  `async function setStatus(status,note='',fromQueue=false){
  const previous=data.status.find(x=>x.user_id===me());
  const previousCopy=previous?{...previous}:null;
  if(!fromQueue){
    const next={room_id:room(),user_id:me(),status,note:String(note||'').slice(0,240),updated_at:new Date().toISOString()};
    if(previous)Object.assign(previous,next);else data.status.push(next);
    renderSelfStatus();renderSummary();
  }
  const runner=async()=>{
    const {error}=await sb().from('ktak35_member_status').upsert({room_id:room(),user_id:me(),status,note:String(note||'').slice(0,240),updated_at:new Date().toISOString()},{onConflict:'room_id,user_id'}).select('*').single();
    if(error)throw error;
    if(!fromQueue)timeline('member_status',\`狀態更新：\${STATUS[status]?.[1]||status}\`,{status,note}).catch(e=>console.warn('status timeline',e));
  };
  try{return fromQueue?await runner():await runOrQueue({kind:'status',status,note},runner)}
  catch(e){
    if(!fromQueue){
      data.status=data.status.filter(x=>x.user_id!==me());
      if(previousCopy)data.status.push(previousCopy);
      renderSelfStatus();renderSummary();
    }
    throw e;
  }
}
function renderAssigneeChoices`,
  'optimistic member status'
);

command=replaceRegex(
  command,
  /async function createAssignment\(\)\{[\s\S]*?\}\nasync function updateAssignment/,
  `async function createAssignment(){
  if(role()!=='commander'){notify('只有指揮官可以派遣任務');return}
  const title=$('v35TaskTitle').value.trim(),details=$('v35TaskDetails').value.trim(),priority=$('v35TaskPriority').value,assigned=[...$('v35Assignees').querySelectorAll('input:checked')].map(x=>x.value);
  if(!title){notify('請輸入任務內容');return}
  if(!assigned.length){notify('至少指派一名隊員');return}
  const center=core.map?.getCenter?.();
  const row={room_id:room(),title,details,priority,assigned_to:assigned,created_by:me(),lat:center?.lat??null,lng:center?.lng??null};
  const btn=$('v35CreateTask');if(btn){btn.disabled=true;btn.textContent='派遣中…'}
  try{
    const {data:created,error}=await sb().from('ktak35_assignments').insert(row).select('*').single();
    if(error)throw error;
    data.assignments.unshift(created||{...row,id:crypto.randomUUID?.()||String(Date.now()),status:'pending',created_at:new Date().toISOString()});
    renderAssignments();renderSummary();
    timeline('assignment_created',\`派遣任務：\${title}\`,{priority,assigned_to:assigned},assigned[0]||null).catch(e=>console.warn('assignment timeline',e));
    $('v35TaskTitle').value='';$('v35TaskDetails').value='';notify('任務已派遣');
  }catch(e){notify('派遣失敗：'+e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent='送出派遣'}}
}
async function updateAssignment`,
  'fast create assignment'
);

command=replaceRegex(
  command,
  /async function updateAssignment\(id,patch,fromQueue=false\)\{[\s\S]*?\}\nfunction renderSos/,
  `async function updateAssignment(id,patch,fromQueue=false){
  const item=data.assignments.find(x=>x.id===id),previous=item?{...item}:null,mine=(item?.assigned_to||[]).includes(me());
  if(item&&!fromQueue){Object.assign(item,patch,{updated_at:new Date().toISOString()});renderAssignments();renderSummary()}
  const runner=async()=>{
    const p={...patch,updated_at:new Date().toISOString()};
    const {error}=await sb().from('ktak35_assignments').update(p).eq('room_id',room()).eq('id',id);
    if(error)throw error;
    if(!fromQueue)timeline('assignment_updated',\`任務狀態：\${TASK_STATUS[p.status]||p.status||'更新'}\`,{assignment_id:id,...p}).catch(e=>console.warn('assignment timeline',e));
  };
  try{
    const out=fromQueue?await runner():await runOrQueue({kind:'assignment-state',id,patch},runner);
    if(!fromQueue&&mine&&patch.status==='active')setStatus('active',\`執行中：\${item?.title||'任務'}\`).catch(e=>console.warn('active status',e));
    if(!fromQueue&&mine&&['completed','cancelled','declined'].includes(patch.status)){
      setTimeout(()=>{
        const still=data.assignments.some(x=>(x.assigned_to||[]).includes(me())&&x.status==='active');
        if(!still)setStatus('available','').catch(e=>console.warn('available status',e));
      },0);
    }
    return out;
  }catch(e){
    if(item&&previous){Object.assign(item,previous);renderAssignments();renderSummary()}
    notify('任務更新失敗：'+e.message);
  }
}
function renderSos`,
  'optimistic assignment state'
);

command=replaceRegex(
  command,
  /async function triggerSos\(\)\{[\s\S]*?\}\nasync function resolveSos/,
  `async function triggerSos(){
  const l=locOf(),row={room_id:room(),user_id:me(),message:'緊急支援',lat:l?.lat??null,lng:l?.lng??null,altitude_m:l?.altitudeM??null};
  try{
    const {data:x,error}=await sb().from('ktak35_sos').insert(row).select('*').single();
    if(error)throw error;
    data.sos.unshift(x||{...row,id:crypto.randomUUID?.()||String(Date.now()),status:'active',created_at:new Date().toISOString()});
    renderSos();renderSummary();
    setStatus('emergency','SOS 已觸發').catch(e=>console.warn('SOS status',e));
    timeline('sos','🚨 SOS 緊急支援',{sos_id:x?.id,lat:row.lat,lng:row.lng},me()).catch(e=>console.warn('SOS timeline',e));
    notify('🚨 SOS 已送出給房間成員');
  }catch(e){notify('SOS 送出失敗：'+e.message)}
}
async function resolveSos`,
  'fast SOS trigger'
);

command=replaceRegex(
  command,
  /async function resolveSos\(id\)\{[\s\S]*?\}\nfunction installSosHold/,
  `async function resolveSos(id){
  const item=data.sos.find(x=>x.id===id),previous=item?{...item}:null;
  if(item){item.status='resolved';item.resolved_at=new Date().toISOString();item.resolved_by=me();renderSos();renderSummary()}
  try{
    const {error}=await sb().from('ktak35_sos').update({status:'resolved',resolved_at:new Date().toISOString(),resolved_by:me()}).eq('room_id',room()).eq('id',id);
    if(error)throw error;
    timeline('sos_resolved','SOS 已解除',{sos_id:id}).catch(e=>console.warn('SOS resolved timeline',e));
    setStatus('available','').catch(e=>console.warn('SOS available status',e));
  }catch(e){
    if(item&&previous){Object.assign(item,previous);renderSos();renderSummary()}
    notify('解除失敗：'+e.message);
  }
}
function installSosHold`,
  'optimistic SOS resolve'
);

command=replaceRegex(
  command,
  /async function saveTemplate\(\)\{[\s\S]*?\}\nfunction decorateStickers/,
  `function applyMissionModeUi(template=data.profile?.template||$('v35MissionTemplate')?.value||'police_tactical'){
  const guide=MISSION_GUIDES[template]||MISSION_GUIDES.custom,page=$('commandPage');
  if(page)page.dataset.missionMode=template;
  const guideEl=$('v35MissionModeGuide');if(guideEl)guideEl.textContent=guide.text;
  const title=$('v35TaskTitle');if(title&&!title.value)title.placeholder=guide.placeholder;
  const targets={people:'v35TeamStatusList',dispatch:'v35AssignmentList',sos:'v35SosHold',search:'v35SearchSectorBtn',weather:'v35DisasterList'};
  document.querySelectorAll('#commandPage .v35Card').forEach(x=>x.classList.remove('v35ModeFocus'));
  for(const key of guide.focus||[]){const el=$(targets[key]);el?.closest?.('.v35Card')?.classList.add('v35ModeFocus')}
}
async function saveTemplate(){
  if(role()!=='commander'){notify('只有指揮官可以切換任務模板');return}
  const template=$('v35MissionTemplate').value,previous=data.profile?{...data.profile}:null;
  data.profile={...(data.profile||{}),room_id:room(),template,data:{},updated_by:me(),updated_at:new Date().toISOString()};
  $('v35MissionTemplateLabel').textContent=TEMPLATES[template]||template;applyMissionModeUi(template);
  try{
    const {error}=await sb().from('ktak35_mission_profile').upsert({room_id:room(),template,data:{},updated_by:me(),updated_at:new Date().toISOString()},{onConflict:'room_id'});
    if(error)throw error;
    timeline('mission_template',\`任務模板：\${TEMPLATES[template]||template}\`,{template}).catch(e=>console.warn('template timeline',e));
  }catch(e){
    data.profile=previous;
    if(previous){$('v35MissionTemplate').value=previous.template;applyMissionModeUi(previous.template)}
    notify('模板更新失敗：'+e.message);
  }
}
function decorateStickers`,
  'mission mode behavior'
);

command=replaceRegex(
  command,
  /async function refreshDisaster\(\)\{[\s\S]*?\}\nfunction scheduleDisaster/,
  `async function refreshDisaster(){
  const root=$('v35DisasterList');if(!root||!sb()||!room())return;
  root.innerHTML='<div class="muted">正在更新政府防災資料…</div>';
  const county=$('v35DisasterCounty'),raw=county?.value||'',label=county?.selectedOptions?.[0]?.textContent||'目前位置';
  let c=core.map?.getCenter?.()||locOf()||{lat:null,lng:null};
  if(raw){const [lat,lng]=raw.split(',').map(Number);if(Number.isFinite(lat)&&Number.isFinite(lng))c={lat,lng}}
  try{
    const {data:r,error}=await sb().functions.invoke('ktak35-disaster',{body:{lat:c.lat,lng:c.lng}});
    if(error)throw error;
    const items=r?.alerts||[];root.innerHTML='';
    items.forEach(x=>{const d=document.createElement('div');d.className=\`v35DisasterItem level-\${x.level||'info'}\`;d.innerHTML=\`<b>\${esc(x.icon||'⚠️')} \${esc(x.title)}</b><div>\${esc(x.description||'')}</div><small>\${esc(x.source||'政府開放資料')}\${x.updatedAt?' · '+fmtTime(x.updatedAt):''}</small>\`;root.append(d)});
    if(!items.length)root.innerHTML='<div class="v35DisasterOk">✅ 目前資料源未回報任務區域重大警戒</div>';
    $('v35DisasterUpdated').textContent=\`\${label} · 更新 \${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}\`;
  }catch(e){root.innerHTML=\`<div class="muted">防災資料暫時無法取得。可使用下方官方即時平台。<br>\${esc(e.message||e)}</div>\`}
}
function scheduleDisaster`,
  'county disaster refresh'
);

command=replaceOnce(
  command,
  `function renderAll35(){renderSummary();renderSelfStatus();renderAssigneeChoices();renderAssignments();renderSos();renderTimeline();renderSectors();renderFloor();initMapLayers();bindSearchClick();renderStickerTray();renderOffline();const t=$('v35MissionTemplate');if(t)t.value=data.profile?.template||'police_tactical';const commander=role()==='commander';document.querySelectorAll('.v35CommanderOnly').forEach(x=>x.classList.toggle('hidden',!commander));decorateStickers()}`,
  `function renderAll35(){renderSummary();renderSelfStatus();renderAssigneeChoices();renderAssignments();renderSos();renderTimeline();renderSectors();renderFloor();initMapLayers();bindSearchClick();renderStickerTray();renderOffline();const t=$('v35MissionTemplate');if(t)t.value=data.profile?.template||'police_tactical';applyMissionModeUi(data.profile?.template||'police_tactical');const commander=role()==='commander';document.querySelectorAll('.v35CommanderOnly').forEach(x=>x.classList.toggle('hidden',!commander));decorateStickers()}`,
  'render mission mode'
);

command=replaceOnce(
  command,
  `$('v35MissionTemplate')?.addEventListener('change',saveTemplate);`,
  `$('v35MissionTemplate')?.addEventListener('change',e=>{applyMissionModeUi(e.target.value);saveTemplate()});`,
  'mission mode change'
);
command=replaceOnce(
  command,
  `$('v35DisasterRefresh')?.addEventListener('click',refreshDisaster);`,
  `$('v35DisasterRefresh')?.addEventListener('click',refreshDisaster);$('v35DisasterCounty')?.addEventListener('change',refreshDisaster);$('v35DisasterToggle')?.addEventListener('click',()=>{const body=$('v35DisasterBody'),b=$('v35DisasterToggle');body?.classList.toggle('hidden');if(b)b.textContent=body?.classList.contains('hidden')?'展開':'收合'});$('v35TimelineToggle')?.addEventListener('click',()=>{const body=$('v35TimelineBody'),b=$('v35TimelineToggle');body?.classList.toggle('hidden');if(b)b.textContent=body?.classList.contains('hidden')?'展開':'收合'});`,
  'collapsible weather/timeline'
);

command=replaceOnce(
  command,
  `window.__KTAK35={onCoreRender:ensureRuntime,setMapBearing,refresh:refreshAll};bindUi();setInterval(()=>{if(core.state&&room()){ensureRuntime();renderFloor()}},4000);refreshTimer=setInterval(()=>{if(core.state&&room())refreshAll(false).then(renderAll35)},30000);`,
  `window.__KTAK35={onCoreRender:ensureRuntime,setMapBearing,refresh:refreshAll};bindUi();setInterval(()=>{if(core.state&&room()&&roomKey!==room())ensureRuntime().catch(e=>console.warn('KTAK35 runtime',e))},10000);refreshTimer=setInterval(()=>{if(core.state&&room()&&document.visibilityState!=='hidden')refreshAll(false).then(renderAll35).catch(e=>console.warn('KTAK35 fallback refresh',e))},60000);`,
  'remove 4s full rerender loop'
);

command=`// ktak-v35-field-performance-v3\n${command}`;

/* ---------------- usability runtime: no heavy 2.5s map churn + reliable notifications ---------------- */

usability=replaceOnce(
  usability,
  `let memberInfoLayer=null,majorGridLayer=null,radarRefreshTimer=null,opsChannel=null,opsRoomKey='',audioCtx=null;`,
  `let memberInfoLayer=null,majorGridLayer=null,radarRefreshTimer=null,opsChannel=null,opsRoomKey='',opsPollTimer=null,opsSeeded=false,audioCtx=null;const seenAssignments=new Set(),seenSos=new Set();`,
  'notification state'
);

usability=replaceOnce(
  usability,
  `    b.insertAdjacentElement('afterend',h);`,
  `    if(id==='v35SearchSectorBtnMap'&&b.parentElement)b.parentElement.insertAdjacentElement('afterend',h);else b.insertAdjacentElement('afterend',h);`,
  'map help layout'
);

usability=replaceOnce(
  usability,
  `function showOperationalAlert(kind,title,body,onOpen){\n  const stack=ensureOpsAlertStack(),box=document.createElement('div');`,
  `function markCommandAlert(kind){const nav=document.querySelector('[data-page="commandPage"]');if(!nav)return;nav.classList.add('v35NavAlert');if(kind==='sos')nav.classList.add('v35NavSos');nav.dataset.alertCount=String((+nav.dataset.alertCount||0)+1);if(!nav.dataset.v35AlertBound){nav.dataset.v35AlertBound='1';nav.addEventListener('click',()=>{nav.classList.remove('v35NavAlert','v35NavSos');nav.dataset.alertCount='0'})}}\nfunction showOperationalAlert(kind,title,body,onOpen){\n  markCommandAlert(kind);const stack=ensureOpsAlertStack(),box=document.createElement('div');`,
  'command nav alert badge'
);

usability=replaceRegex(
  usability,
  /async function setupOperationalNotifications\(\)\{[\s\S]*?\}\nfunction bindAudioWarmup/,
  `function assignmentAlert(a){
  const assigned=Array.isArray(a?.assigned_to)?a.assigned_to:[];if(!a?.id||!assigned.includes(core.userId)||seenAssignments.has(a.id))return;
  seenAssignments.add(a.id);const priority=a.priority==='critical'?'緊急':a.priority==='high'?'高':'一般';
  showOperationalAlert('assignment',\`📣 新派案 · \${priority}\`,a.title||'你收到一項新任務',openCommandPage);
}
function sosAlert(s){
  if(!s?.id||s.user_id===core.userId||seenSos.has(s.id)||s.status==='resolved')return;
  seenSos.add(s.id);const u=userById(s.user_id),who=u?.nick||'隊員';
  showOperationalAlert('sos',\`🚨 SOS · \${who}\`,Number.isFinite(s.lat)?\`位置 \${fmtCoord(s.lat)}, \${fmtCoord(s.lng)}\${Number.isFinite(s.altitude_m)?\` · 高度 \${Math.round(s.altitude_m)} m\`:''}\`:'需要緊急支援',()=>{if(Number.isFinite(s.lat)&&Number.isFinite(s.lng))core.openMapAt?.(s.lat,s.lng,19);else openCommandPage()});
}
async function seedOperationalSeen(){
  if(!core.roomUuid||!core.sb)return;const room=core.roomUuid;
  const [a,s]=await Promise.all([
    core.sb.from('ktak35_assignments').select('id,assigned_to').eq('room_id',room).order('created_at',{ascending:false}).limit(30),
    core.sb.from('ktak35_sos').select('id,user_id,status').eq('room_id',room).order('created_at',{ascending:false}).limit(30)
  ]);
  for(const x of a.data||[])seenAssignments.add(x.id);for(const x of s.data||[])seenSos.add(x.id);opsSeeded=true;
}
async function pollOperationalNotifications(){
  if(!opsSeeded||!core.roomUuid||!core.sb)return;const room=core.roomUuid;
  try{
    const [a,s]=await Promise.all([
      core.sb.from('ktak35_assignments').select('id,title,priority,assigned_to,status,created_at').eq('room_id',room).order('created_at',{ascending:false}).limit(8),
      core.sb.from('ktak35_sos').select('id,user_id,status,lat,lng,altitude_m,created_at').eq('room_id',room).eq('status','active').order('created_at',{ascending:false}).limit(8)
    ]);
    for(const x of [...(a.data||[])].reverse())assignmentAlert(x);for(const x of [...(s.data||[])].reverse())sosAlert(x);
  }catch(e){console.warn('KTAK35 notification fallback',e)}
}
function startOpsPoll(){clearInterval(opsPollTimer);opsPollTimer=setInterval(pollOperationalNotifications,6000)}
async function setupOperationalNotifications(){
  const room=core.roomUuid;if(!room||!core.sb||opsRoomKey===room||opsRoomKey===\`pending:\${room}\`)return;
  opsRoomKey=\`pending:\${room}\`;opsSeeded=false;seenAssignments.clear();seenSos.clear();
  if(opsChannel)try{await core.sb.removeChannel(opsChannel)}catch{}
  opsChannel=core.sb.channel(\`ktak35-notify:\${room}\`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'ktak35_assignments',filter:\`room_id=eq.\${room}\`},payload=>assignmentAlert(payload.new||{}))
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'ktak35_sos',filter:\`room_id=eq.\${room}\`},payload=>sosAlert(payload.new||{}))
    .subscribe(status=>{
      if(status==='SUBSCRIBED'){opsRoomKey=room;seedOperationalSeen().then(startOpsPoll).catch(e=>{console.warn('KTAK35 notify seed',e);opsSeeded=true;startOpsPoll()})}
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){opsRoomKey='';opsSeeded=true;startOpsPoll()}
    });
}
function bindAudioWarmup`,
  'reliable operational notifications'
);

usability=replaceOnce(
  usability,
  `function tick(){ensureFeedbackStyle();ensureMapHud();bindChatKeys();installRadarTools();installSearchHelp();bindMemberAvatarClicks();renderMemberInfoTargets();renderMajorGrid();setupOperationalNotifications()}`,
  `function tick(){ensureFeedbackStyle();ensureMapHud();bindChatKeys();installRadarTools();installSearchHelp();bindMemberAvatarClicks();setupOperationalNotifications()}`,
  'lightweight usability tick'
);
usability=replaceOnce(
  usability,
  `function bindMap(){const map=core.map;if(!map||map.__v35UsabilityBound)return;map.__v35UsabilityBound=true;map.on('moveend',()=>{renderMajorGrid();renderMemberInfoTargets()});map.on('zoomend',renderMajorGrid);$('v35GridToggle')?.addEventListener('change',renderMajorGrid)}`,
  `function bindMap(){const map=core.map;if(!map||map.__v35UsabilityBound)return;map.__v35UsabilityBound=true;map.on('moveend',()=>{renderMajorGrid();renderMemberInfoTargets()});map.on('zoomend',renderMajorGrid);$('v35GridToggle')?.addEventListener('change',renderMajorGrid);renderMajorGrid();renderMemberInfoTargets()}`,
  'initial map render'
);
usability=replaceOnce(
  usability,
  `setInterval(()=>{bindMap();tick()},2500);\nsetTimeout(()=>{bindMap();tick()},300);`,
  `setInterval(()=>{bindMap();tick();if(document.visibilityState!=='hidden')renderMemberInfoTargets()},10000);\nsetTimeout(()=>{bindMap();tick()},300);`,
  'remove 2.5s map churn'
);
usability=`// ktak-v35-field-performance-v3\n${usability}`;

/* ---------------- HTML: layout, collapsibles, county target, visible mission modes ---------------- */

const countyOptions=`<option value="">📍 目前地圖／定位</option><option value="25.0375,121.5637">臺北市</option><option value="25.0120,121.4650">新北市</option><option value="25.1276,121.7392">基隆市</option><option value="24.9537,121.2258">桃園市</option><option value="24.1477,120.6736">臺中市</option><option value="23.0000,120.2270">臺南市</option><option value="22.6273,120.3014">高雄市</option><option value="24.8138,120.9675">新竹市</option><option value="24.8387,121.0177">新竹縣</option><option value="24.5602,120.8214">苗栗縣</option><option value="24.0756,120.5440">彰化縣</option><option value="23.9609,120.9719">南投縣</option><option value="23.7092,120.4313">雲林縣</option><option value="23.4801,120.4491">嘉義市</option><option value="23.4518,120.2555">嘉義縣</option><option value="22.5519,120.5488">屏東縣</option><option value="24.7021,121.7378">宜蘭縣</option><option value="23.9911,121.6112">花蓮縣</option><option value="22.7554,121.1500">臺東縣</option><option value="23.5712,119.5793">澎湖縣</option><option value="24.4321,118.3186">金門縣</option><option value="26.1605,119.9517">連江縣</option>`;

html=replaceOnce(
  html,
  `<div class="muted" style="margin-top:6px">模板會作為 V3.5 指揮介面的任務情境標記；後續工具會依模板逐步自動優先顯示。</div>`,
  `<div id="v35MissionModeGuide" class="v35MissionModeGuide">切換任務模式後，系統會突出該情境最需要的指揮卡片與派遣提示。</div>`,
  'mission mode guide shell'
);

const oldWeather=`<div class="v35Card"><div class="v35CardHead"><h3>🌧️ 天氣／災害情報</h3><button id="v35DisasterRefresh" type="button">更新</button></div><div id="v35DisasterUpdated" class="muted"></div><div id="v35DisasterList" class="v35DisasterList"></div><div class="v35OfficialLinks"><a href="https://qpeplus.cwa.gov.tw/pub/" target="_blank" rel="noopener">CWA 雷達／QPE</a><a href="https://fhy.wra.gov.tw/" target="_blank" rel="noopener">水利署防災資訊</a><a href="https://246.ardswc.gov.tw/Monitoring/Map" target="_blank" rel="noopener">土石流防災地圖</a></div></div>`;
const newWeather=`<div class="v35Card"><div class="v35CardHead"><h3>🌧️ 天氣／災害情報</h3><div class="v35HeadActions"><select id="v35DisasterCounty" aria-label="指定縣市">${countyOptions}</select><button id="v35DisasterToggle" type="button">收合</button><button id="v35DisasterRefresh" type="button">更新</button></div></div><div id="v35DisasterBody"><div id="v35DisasterUpdated" class="muted"></div><div id="v35DisasterList" class="v35DisasterList"></div><div class="v35OfficialLinks"><a href="https://qpeplus.cwa.gov.tw/pub/" target="_blank" rel="noopener">CWA 雷達／QPE</a><a href="https://fhy.wra.gov.tw/" target="_blank" rel="noopener">水利署防災資訊</a><a href="https://246.ardswc.gov.tw/Monitoring/Map" target="_blank" rel="noopener">土石流防災地圖</a></div></div></div>`;
html=replaceOnce(html,oldWeather,newWeather,'weather collapsible + county');

html=replaceOnce(
  html,
  `<div class="v35Card v35Full"><h3>🕒 任務 Timeline</h3><div id="v35Timeline" class="v35Timeline"></div></div>`,
  `<div class="v35Card v35Full"><div class="v35CardHead"><h3>🕒 任務 Timeline</h3><button id="v35TimelineToggle" type="button">收合</button></div><div id="v35TimelineBody"><div id="v35Timeline" class="v35Timeline"></div></div></div>`,
  'timeline collapsible'
);

const perfCss=`
/* ktak-v35-field-performance-v3 */
.v35MissionModeGuide{margin-top:7px;padding:8px 9px;border-radius:9px;background:#0c171c;border:1px solid #36515e;color:#b9d0da;font-size:10px;line-height:1.45}
.v35ModeFocus{border-color:#5aa8cf!important;box-shadow:inset 0 0 0 1px #5aa8cf55,0 0 18px #2b8fbd14!important}
.v35HeadActions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}.v35HeadActions select{width:auto;min-width:128px;max-width:170px;padding:6px 7px;font-size:9px}.v35HeadActions button{padding:6px 8px;font-size:9px}
#v35DisasterBody.hidden,#v35TimelineBody.hidden{display:none!important}
.navBtn.v35NavAlert{position:relative;border-color:#62b9e8!important;box-shadow:inset 0 0 0 1px #62b9e855}.navBtn.v35NavAlert::after{content:"!";position:absolute;right:4px;top:3px;min-width:15px;height:15px;padding:0 3px;display:grid;place-items:center;border-radius:999px;background:#36a9e8;color:#fff;font:900 9px/1 sans-serif}.navBtn.v35NavSos{border-color:#ff5b5b!important;animation:v35NavSosPulse .8s ease-in-out infinite alternate}.navBtn.v35NavSos::after{background:#ef3434}
@keyframes v35NavSosPulse{from{box-shadow:0 0 0 0 #ff454525}to{box-shadow:0 0 0 5px #ff454500}}
#v35SearchSectorBtnMap{writing-mode:horizontal-tb!important;white-space:nowrap!important;width:100%!important;min-width:0!important}.v35SearchHelp[data-for="v35SearchSectorBtnMap"]{width:100%!important;box-sizing:border-box!important}.row:has(#v35SearchSectorBtnMap){display:block!important;width:100%!important}
@media(min-width:821px){.v35RadarTools{width:100%!important;max-width:100%!important;box-sizing:border-box!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto auto!important}.v35RadarTools>div{grid-column:1/-1!important}.v35RadarTools label{min-width:0!important}.v35RadarTools input{max-width:115px!important}.v35RadarTools a{overflow:hidden;text-overflow:ellipsis!important}.v35SearchHelp[data-for="v35SearchSectorBtnMap"]{margin-top:6px!important}}
@media(max-width:820px){.v35CardHead{align-items:flex-start!important}.v35HeadActions{justify-content:flex-start}.v35HeadActions select{max-width:150px}.v35MissionModeGuide{font-size:9px}}
`;
html=replaceOnce(html,'</style>',perfCss+'\n</style>','field/performance css');

html=html.replace('./ktak-v35-command.js','./ktak-v35-command.js?v=35-perf3');
html=html.replace('./ktak-v35-usability.js','./ktak-v35-usability.js?v=35-perf3');

for(const marker of ['ktak-v35-field-performance-v3','v35DisasterCounty','v35TimelineToggle','v35MissionModeGuide'])if(!html.includes(marker)&&!command.includes(marker)&&!usability.includes(marker))throw new Error('V3.5 field/performance self-check failed: '+marker);
if(!command.includes('scheduleRefresh()')||!command.includes("setStatus('active'")||!usability.includes('pollOperationalNotifications'))throw new Error('V3.5 field/performance runtime checks failed');

fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 field/performance v3 applied: optimistic command actions, debounced realtime, reliable alerts, responsive map aids, county disaster view, collapsible timeline, mission-mode emphasis.');


