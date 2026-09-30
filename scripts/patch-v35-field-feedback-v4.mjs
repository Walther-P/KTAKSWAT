import fs from 'node:fs';

const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';

let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

const replaceRegex=(text,regex,replacement,label)=>{
  if(!regex.test(text)) throw new Error(`V3.5 feedback-v4 missing: ${label}`);
  regex.lastIndex=0;
  return text.replace(regex,replacement);
};
const replaceOnce=(text,needle,replacement,label)=>{
  if(!text.includes(needle)) throw new Error(`V3.5 feedback-v4 missing: ${label}`);
  return text.replace(needle,replacement);
};

/* -------------------------------------------------------------------------- */
/* Command runtime: apply Realtime payloads locally instead of refetching 7 DB */
/* tables for every status/task/SOS/timeline event.                            */
/* -------------------------------------------------------------------------- */
command=replaceRegex(
  command,
  /async function setupRealtime\(\)\{[\s\S]*?\}\nasync function ensureRuntime/,
  `function mergeRealtimeRow(list,row,key='id'){
  if(!row)return;const value=row[key];if(value==null)return;
  const i=list.findIndex(x=>x?.[key]===value);
  if(i>=0)list[i]={...list[i],...row};else list.unshift(row);
}
function deleteRealtimeRow(list,row,key='id'){
  const value=row?.[key];return value==null?list:list.filter(x=>x?.[key]!==value);
}
function applyStatusRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.status=deleteRealtimeRow(data.status,row,'user_id');else mergeRealtimeRow(data.status,row,'user_id');
  renderSelfStatus();renderSummary();
}
function applyAssignmentRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.assignments=deleteRealtimeRow(data.assignments,row);else mergeRealtimeRow(data.assignments,row);
  data.assignments.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  renderAssignments();renderSummary();
}
function applySosRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.sos=deleteRealtimeRow(data.sos,row);else mergeRealtimeRow(data.sos,row);
  data.sos.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  renderSos();renderSummary();
}
function applyTimelineRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.timeline=deleteRealtimeRow(data.timeline,row);else mergeRealtimeRow(data.timeline,row);
  data.timeline.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));data.timeline=data.timeline.slice(0,150);renderTimeline();
}
function applySectorRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.sectors=deleteRealtimeRow(data.sectors,row);else mergeRealtimeRow(data.sectors,row);
  data.sectors.sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));renderSectors();renderSearchMap();renderSummary();
}
function applyProfileRealtime(payload){
  data.profile=payload.eventType==='DELETE'?null:(payload.new||null);
  const template=data.profile?.template||'police_tactical',sel=$('v35MissionTemplate');if(sel)sel.value=template;
  const label=$('v35MissionTemplateLabel');if(label)label.textContent=TEMPLATES[template]||template;applyMissionModeUi(template);renderSummary();
}
function applyFloorRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.floors=deleteRealtimeRow(data.floors,row,'page_id');else mergeRealtimeRow(data.floors,row,'page_id');renderFloor();
}
async function setupRealtime(){
  const key=room();if(!key||!sb()||key===roomKey)return;
  roomKey=key;if(channel)try{await sb().removeChannel(channel)}catch{}
  channel=sb().channel(\`ktak35:\${key}\`)
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_member_status',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applyStatusRealtime(payload)})
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_assignments',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applyAssignmentRealtime(payload)})
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_sos',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applySosRealtime(payload)})
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_timeline',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applyTimelineRealtime(payload)})
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_search_sectors',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applySectorRealtime(payload)})
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_mission_profile',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applyProfileRealtime(payload)})
    .on('postgres_changes',{event:'*',schema:'public',table:'ktak35_floor_status',filter:\`room_id=eq.\${key}\`},payload=>{if(key===room())applyFloorRealtime(payload)})
    .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')roomKey=''});
}
async function ensureRuntime`,
  'direct realtime command channel'
);

// A slow full refresh is retained only as disaster recovery, not as the normal sync path.
command=replaceOnce(
  command,
  `refreshTimer=setInterval(()=>{if(core.state&&room()&&document.visibilityState!=='hidden')refreshAll(false).then(renderAll35).catch(e=>console.warn('KTAK35 fallback refresh',e))},60000);`,
  `refreshTimer=setInterval(()=>{if(core.state&&room()&&document.visibilityState!=='hidden')refreshAll(false).then(renderAll35).catch(e=>console.warn('KTAK35 fallback refresh',e))},300000);`,
  'reduce full refresh fallback'
);

/* -------------------------------------------------------------------------- */
/* Weather/county: send the selected county to the Edge Function and defensively */
/* filter client-side as well.                                                  */
/* -------------------------------------------------------------------------- */
command=replaceRegex(
  command,
  /async function refreshDisaster\(\)\{[\s\S]*?\}\nfunction scheduleDisaster/,
  `async function refreshDisaster(){
  const root=$('v35DisasterList');if(!root||!sb()||!room())return;
  root.innerHTML='<div class="muted">正在更新政府防災資料…</div>';
  const county=$('v35DisasterCounty'),raw=county?.value||'',label=county?.selectedOptions?.[0]?.textContent?.trim()||'全臺';
  const countyName=raw?label:'';
  let c=core.map?.getCenter?.()||locOf()||{lat:null,lng:null};
  if(raw){const [lat,lng]=raw.split(',').map(Number);if(Number.isFinite(lat)&&Number.isFinite(lng))c={lat,lng}}
  const norm=s=>String(s||'').replace(/台/g,'臺').replace(/\\s+/g,'');
  try{
    const {data:r,error}=await sb().functions.invoke('ktak35-disaster',{body:{lat:c.lat,lng:c.lng,county:countyName}});
    if(error)throw error;
    let items=Array.isArray(r?.alerts)?r.alerts:[];
    if(countyName)items=items.filter(x=>norm(x?.county)===norm(countyName));
    root.innerHTML='';
    items.forEach(x=>{const d=document.createElement('div');d.className=\`v35DisasterItem level-\${x.level||'info'}\`;d.innerHTML=\`<b>\${esc(x.icon||'⚠️')} \${esc(x.title)}</b><div>\${esc(x.description||'')}</div><small>\${esc(x.source||'政府開放資料')}\${x.updatedAt?' · '+fmtTime(x.updatedAt):''}</small>\`;root.append(d)});
    if(!items.length)root.innerHTML=\`<div class="v35DisasterOk">✅ \${esc(countyName||'全臺')}目前無有效天氣警特報</div>\`;
    $('v35DisasterUpdated').textContent=\`\${countyName||'全臺'} · 更新 \${new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}\`;
  }catch(e){root.innerHTML=\`<div class="muted">防災資料暫時無法取得。可使用下方官方即時平台。<br>\${esc(e.message||e)}</div>\`}
}
function scheduleDisaster`,
  'strict county disaster filter'
);

/* -------------------------------------------------------------------------- */
/* Operational notifications: no polling storm, no completed-task alerts, and */
/* persisted de-duplication across reconnects/reloads.                         */
/* -------------------------------------------------------------------------- */
usability=replaceRegex(
  usability,
  /function assignmentAlert\(a\)\{[\s\S]*?\}\nfunction bindAudioWarmup/,
  `let notificationSeenRoom='';
function opsSeenKey(){return \`ktak35.opsSeen.v4.\${core.roomUuid||'none'}\`}
function loadOpsSeen(){
  try{const x=JSON.parse(localStorage.getItem(opsSeenKey())||'{}');for(const id of x.a||[])seenAssignments.add(id);for(const id of x.s||[])seenSos.add(id)}catch{}
}
function persistOpsSeen(){
  try{localStorage.setItem(opsSeenKey(),JSON.stringify({a:[...seenAssignments].slice(-120),s:[...seenSos].slice(-120)}))}catch{}
}
function markOpsSeen(kind,id){if(!id)return;(kind==='assignment'?seenAssignments:seenSos).add(id);persistOpsSeen()}
function assignmentAlert(a){
  const assigned=Array.isArray(a?.assigned_to)?a.assigned_to:[];
  if(!a?.id||a.status!=='pending'||!assigned.includes(core.userId)||seenAssignments.has(a.id))return;
  const age=Date.now()-Date.parse(a.created_at||0);if(Number.isFinite(age)&&age>120000){markOpsSeen('assignment',a.id);return}
  markOpsSeen('assignment',a.id);const priority=a.priority==='critical'?'緊急':a.priority==='high'?'高':'一般';
  showOperationalAlert('assignment',\`📣 新派案 · \${priority}\`,a.title||'你收到一項新任務',openCommandPage);
}
function sosAlert(s){
  if(!s?.id||s.status!=='active'||s.user_id===core.userId||seenSos.has(s.id))return;
  markOpsSeen('sos',s.id);const u=userById(s.user_id),who=u?.nick||'隊員';
  showOperationalAlert('sos',\`🚨 SOS · \${who}\`,Number.isFinite(s.lat)?\`位置 \${fmtCoord(s.lat)}, \${fmtCoord(s.lng)}\${Number.isFinite(s.altitude_m)?\` · 高度 \${Math.round(s.altitude_m)} m\`:''}\`:'需要緊急支援',()=>{if(Number.isFinite(s.lat)&&Number.isFinite(s.lng))core.openMapAt?.(s.lat,s.lng,19);else openCommandPage()});
}
async function catchUpOperational(){
  if(!core.roomUuid||!core.sb)return;const room=core.roomUuid;
  const [a,s]=await Promise.all([
    core.sb.from('ktak35_assignments').select('id,title,priority,assigned_to,status,created_at').eq('room_id',room).eq('status','pending').order('created_at',{ascending:false}).limit(30),
    core.sb.from('ktak35_sos').select('id,user_id,status,lat,lng,altitude_m,created_at').eq('room_id',room).eq('status','active').order('created_at',{ascending:false}).limit(30)
  ]);
  for(const x of [...(a.data||[])].reverse())assignmentAlert(x);for(const x of [...(s.data||[])].reverse())sosAlert(x);opsSeeded=true;
}
async function setupOperationalNotifications(){
  const room=core.roomUuid;if(!room||!core.sb)return;
  if(notificationSeenRoom!==room){notificationSeenRoom=room;seenAssignments.clear();seenSos.clear();loadOpsSeen()}
  if(opsRoomKey===room||opsRoomKey===\`pending:\${room}\`)return;
  opsRoomKey=\`pending:\${room}\`;opsSeeded=false;
  if(opsChannel)try{await core.sb.removeChannel(opsChannel)}catch{}
  opsChannel=core.sb.channel(\`ktak35-notify:\${room}\`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'ktak35_assignments',filter:\`room_id=eq.\${room}\`},payload=>assignmentAlert(payload.new||{}))
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'ktak35_sos',filter:\`room_id=eq.\${room}\`},payload=>sosAlert(payload.new||{}))
    .subscribe(status=>{
      if(status==='SUBSCRIBED'){opsRoomKey=room;catchUpOperational().catch(e=>console.warn('KTAK35 notify catch-up',e))}
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){opsRoomKey='';setTimeout(()=>setupOperationalNotifications().catch(()=>{}),1800)}
    });
}
function bindAudioWarmup`,
  'deduplicated realtime notifications'
);

// Do not stack a second generic toast on top of the dedicated operational alert.
usability=usability.replace(/;core\.toast\?\.\(title\)/g,'');
usability=usability.replace(`setTimeout(()=>box.remove(),kind==='sos'?20000:9000);`,`setTimeout(()=>box.remove(),kind==='sos'?12000:4500);`);

// Exactly one search help block, only under the map-side Search Area button.
usability=replaceRegex(
  usability,
  /function installSearchHelp\(\)\{[\s\S]*?\}\n\nfunction bindChatKeys/,
  `function installSearchHelp(){
  const existing=$('v35SearchHelpOnce');document.querySelectorAll('.v35SearchHelp').forEach(x=>{if(x!==existing)x.remove()});if(existing)return;
  const b=$('v35SearchSectorBtnMap');if(!b)return;const h=document.createElement('div');h.id='v35SearchHelpOnce';h.className='v35SearchHelp';
  h.textContent='搜索區：按下後依序點選邊界至少 3 點，再按「完成搜尋區」並命名；建立後可在指揮頁更新搜索狀態與進度。';b.insertAdjacentElement('afterend',h);
}

function bindChatKeys`,
  'single search help block'
);

// Remove database fallback polling; Realtime is the normal alert path. Keep only a
// cheap channel-health check and a low-frequency location popup refresh.
usability=replaceOnce(
  usability,
  `setInterval(()=>{bindMap();tick();if(document.visibilityState!=='hidden')renderMemberInfoTargets()},10000);\nsetTimeout(()=>{bindMap();tick()},300);`,
  `setInterval(()=>{setupOperationalNotifications().catch(()=>{})},2000);\nsetInterval(()=>{if(document.visibilityState!=='hidden')renderMemberInfoTargets()},15000);\nsetTimeout(()=>{bindMap();tick()},300);`,
  'remove notification polling and repeated tick'
);

/* -------------------------------------------------------------------------- */
/* Chat: make ordinary text messages optimistic. Network insert/push continues */
/* in the background while the sender sees the message immediately.           */
/* -------------------------------------------------------------------------- */
const chatNeedle=`const t=$('chatInput').value.trim(),photo=pendingChatPhoto,file=pendingChatFile;if(!t&&!photo&&!file)return;`;
const chatReplacement=`const t=$('chatInput').value.trim(),photo=pendingChatPhoto,file=pendingChatFile;if(!t&&!photo&&!file)return;
  if(t&&!photo&&!file){
    const replyPrefix=chatReplyTarget?'↩ 回覆 '+chatReplyTarget.senderName+'：「'+chatReplyTarget.preview+'」\\n':'';
    const storedText=replyPrefix+t,temp={id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2),senderId:currentUserId,senderName:displayName(),text:storedText,imagePath:null,ts:new Date().toISOString()};
    state.chat.push(temp);$('chatInput').value='';clearChatReply();renderChat();chatBottom();
    try{
      const {data:inserted,error}=await sb.from("ktak_chat_messages").insert({room_id:currentRoomUuid,sender_id:currentUserId,sender_name:displayName(),text:storedText,image_path:null}).select("id,created_at").single();
      if(error)throw error;temp.id=inserted.id;temp.ts=inserted.created_at||temp.ts;if(inserted?.id)void triggerChatPush(inserted.id);
    }catch(e){state.chat=state.chat.filter(x=>x!==temp);if(!$('chatInput').value)$('chatInput').value=t;renderChat();toast('傳送失敗：'+e.message)}
    return;
  }`;
html=replaceOnce(html,chatNeedle,chatReplacement,'optimistic text chat');

/* -------------------------------------------------------------------------- */
/* Small presentation fixes + cache bust.                                     */
/* -------------------------------------------------------------------------- */
html=html.replace('>📍 目前地圖／定位</option>','>全臺警特報</option>');
html=html.replace('</style>',`\n/* ktak-v35-field-feedback-v4 */\n@media(max-width:820px){.v35OpsAlertStack{top:auto!important;bottom:calc(78px + env(safe-area-inset-bottom))!important}.v35OpsAlert{padding:9px 34px 9px 10px!important}.v35OpsAlert b{font-size:13px!important}.v35OpsAlert small{font-size:10px!important}}\n</style>`);
html=html.replace('./ktak-v35-command.js?v=35-perf3','./ktak-v35-command.js?v=35-feedback4');
html=html.replace('./ktak-v35-usability.js?v=35-perf3','./ktak-v35-usability.js?v=35-feedback4');

command=`// ktak-v35-field-feedback-v4\n${command}`;
usability=`// ktak-v35-field-feedback-v4\n${usability}`;

for(const marker of ['ktak-v35-field-feedback-v4','applyStatusRealtime','strict county disaster filter']){
  if(marker==='strict county disaster filter')continue;
  if(!command.includes(marker)&&!usability.includes(marker)&&!html.includes(marker))throw new Error(`V3.5 feedback-v4 self-check failed: ${marker}`);
}
if(!html.includes('v=35-feedback4')||!html.includes('optimistic')&& !html.includes("id:'local-'"))throw new Error('V3.5 feedback-v4 cache/chat self-check failed');
if(!usability.includes("a.status!=='pending'")||usability.includes('pollOperationalNotifications(){'))throw new Error('V3.5 feedback-v4 notification self-check failed');
if(!command.includes("county:countyName")||!command.includes('applyAssignmentRealtime'))throw new Error('V3.5 feedback-v4 command self-check failed');

fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 field feedback v4 applied: persistent alert de-duplication, direct Realtime state sync, strict county filtering, single search help, optimistic text chat.');


