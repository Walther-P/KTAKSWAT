import fs from 'node:fs';

const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';

let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

const replaceRegex=(text,regex,replacement,label)=>{
  if(!regex.test(text)) throw new Error(`V3.5 feedback-v5 missing: ${label}`);
  regex.lastIndex=0;
  return text.replace(regex,replacement);
};
const replaceOnce=(text,needle,replacement,label)=>{
  if(!text.includes(needle)) throw new Error(`V3.5 feedback-v5 missing: ${label}`);
  return text.replace(needle,replacement);
};

/* ---------------- reliable dispatch/SOS notifications ---------------- */
command=replaceRegex(
  command,
  /function notify\(t\)\{core\.toast\(t\)\}/,
  `function notify(t){core.toast(t)}
function pushOperational(kind,recordId){
  if(!recordId||!room()||!sb())return Promise.resolve();
  return sb().functions.invoke('ktak35-push',{body:{kind,roomId:room(),recordId}}).then(({error,data:r})=>{if(error)console.warn('KTAK35 push',kind,error);else if(r&&!r.ok)console.warn('KTAK35 push response',kind,r)}).catch(e=>console.warn('KTAK35 push',kind,e));
}`,
  'operational push helper'
);

command=replaceRegex(
  command,
  /function applyAssignmentRealtime\(payload\)\{[\s\S]*?\n\}/,
  `function applyAssignmentRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.assignments=deleteRealtimeRow(data.assignments,row);else mergeRealtimeRow(data.assignments,row);
  data.assignments.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  renderAssignments();renderSummary();
  if(payload.eventType==='INSERT')window.dispatchEvent(new CustomEvent('ktak35:assignment',{detail:row}));
}`,
  'assignment realtime event bridge'
);
command=replaceRegex(
  command,
  /function applySosRealtime\(payload\)\{[\s\S]*?\n\}/,
  `function applySosRealtime(payload){
  const row=payload.new||payload.old||{};
  if(payload.eventType==='DELETE')data.sos=deleteRealtimeRow(data.sos,row);else mergeRealtimeRow(data.sos,row);
  data.sos.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  renderSos();renderSummary();
  if(payload.eventType==='INSERT')window.dispatchEvent(new CustomEvent('ktak35:sos',{detail:row}));
}`,
  'sos realtime event bridge'
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
    if(created?.id)void pushOperational('assignment',created.id);
    timeline('assignment_created',\`派遣任務：\${title}\`,{priority,assigned_to:assigned},assigned[0]||null).catch(e=>console.warn('assignment timeline',e));
    $('v35TaskTitle').value='';$('v35TaskDetails').value='';notify('任務已派遣');
  }catch(e){notify('派遣失敗：'+e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent='送出派遣'}}
}
async function updateAssignment`,
  'assignment push invoke'
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
    if(x?.id)void pushOperational('sos',x.id);
    setStatus('emergency','SOS 已觸發').catch(e=>console.warn('SOS status',e));
    timeline('sos','🚨 SOS 緊急支援',{sos_id:x?.id,lat:row.lat,lng:row.lng},me()).catch(e=>console.warn('SOS timeline',e));
    notify('🚨 SOS 已送出給房間成員');
  }catch(e){notify('SOS 送出失敗：'+e.message)}
}
async function resolveSos`,
  'SOS push invoke'
);

/* ---------------- commander timeline management ---------------- */
command=replaceRegex(
  command,
  /function renderTimeline\(\)\{[\s\S]*?\}\nfunction sectorColor/,
  `async function deleteTimelineEntry(id){
  if(role()!=='commander'){notify('只有指揮官可以刪除 Timeline');return}
  if(!confirm('刪除這筆 Timeline 紀錄？'))return;
  const previous=[...data.timeline];data.timeline=data.timeline.filter(x=>String(x.id)!==String(id));renderTimeline();
  const {error}=await sb().from('ktak35_timeline').delete().eq('room_id',room()).eq('id',id);
  if(error){data.timeline=previous;renderTimeline();notify('刪除失敗：'+error.message)}
}
async function clearTimeline(){
  if(role()!=='commander'){notify('只有指揮官可以清空 Timeline');return}
  if(!data.timeline.length)return;
  if(!confirm(\`確定清空目前房間的 Timeline（\${data.timeline.length} 筆）？此操作無法復原。\`))return;
  const previous=[...data.timeline];data.timeline=[];renderTimeline();
  const {error}=await sb().from('ktak35_timeline').delete().eq('room_id',room());
  if(error){data.timeline=previous;renderTimeline();notify('清空失敗：'+error.message)}else notify('Timeline 已清空');
}
function renderTimeline(){
  const root=$('v35Timeline');if(!root)return;root.innerHTML='';const commander=role()==='commander';
  data.timeline.slice(0,80).forEach(x=>{const d=document.createElement('div');d.className='v35TimelineRow';d.innerHTML=\`<span>\${fmtTime(x.created_at)}</span><div><b>\${esc(x.title)}</b><small>\${esc(nameOf(x.actor_user_id))}</small></div>\`;if(commander){const b=document.createElement('button');b.type='button';b.className='v35TimelineDelete danger';b.textContent='刪除';b.onclick=()=>deleteTimelineEntry(x.id);d.append(b)}root.append(d)});
  if(!data.timeline.length)root.innerHTML='<div class="muted">任務事件會從 V3.5 的派遣、SOS、搜索與樓層狀態開始自動記錄。</div>';
}
function sectorColor`,
  'timeline delete and clear'
);
command=replaceOnce(
  command,
  `$('v35TimelineToggle')?.addEventListener('click',()=>{const body=$('v35TimelineBody'),b=$('v35TimelineToggle');body?.classList.toggle('hidden');if(b)b.textContent=body?.classList.contains('hidden')?'展開':'收合'});`,
  `$('v35TimelineToggle')?.addEventListener('click',()=>{const body=$('v35TimelineBody'),b=$('v35TimelineToggle');body?.classList.toggle('hidden');if(b)b.textContent=body?.classList.contains('hidden')?'展開':'收合'});$('v35TimelineClear')?.addEventListener('click',clearTimeline);`,
  'timeline clear binding'
);

/* ---------------- instant receiving chat ---------------- */
html=replaceOnce(
  html,
  `  renderMemberLocations:()=>renderMemberLocations()\n};`,
  `  renderMemberLocations:()=>renderMemberLocations(),
  applyChatRealtimeRow:r=>{if(!r||!state)return;const m=chatDbRow(r);const local=state.chat.findIndex(x=>String(x.id||'').startsWith('local-')&&x.senderId===m.senderId&&x.text===m.text&&Math.abs(new Date(x.ts||0)-new Date(m.ts||0))<10000);const exact=state.chat.findIndex(x=>x.id===m.id);if(exact>=0)state.chat[exact]=m;else if(local>=0)state.chat[local]=m;else state.chat.push(m);state.chat.sort((a,b)=>new Date(a.ts||0)-new Date(b.ts||0));renderChat();if(typeof chatBottom==='function')chatBottom()},
  deleteChatRealtimeRow:r=>{if(!r||!state)return;state.chat=state.chat.filter(x=>x.id!==r.id);renderChat()}
};`,
  'chat realtime core bridge'
);
html=replaceRegex(
  html,
  /\.on\("postgres_changes",\{event:"\*",schema:"public",table:"ktak_chat_messages",filter:`room_id=eq\.\$\{currentRoomUuid\}`\},\(\)=>scheduleRefresh\("chat",fetchChat\)\)/,
  `.on("postgres_changes",{event:"*",schema:"public",table:"ktak_chat_messages",filter:\`room_id=eq.\${currentRoomUuid}\`},payload=>{if(payload.eventType==="INSERT")window.__KTAK35_CORE?.applyChatRealtimeRow?.(payload.new);else if(payload.eventType==="DELETE")window.__KTAK35_CORE?.deleteChatRealtimeRow?.(payload.old);else scheduleRefresh("chat",fetchChat)})`,
  'direct chat realtime payload'
);

/* ---------------- in-app alert path uses command Realtime, not a second channel ---------------- */
usability=replaceRegex(
  usability,
  /async function setupOperationalNotifications\(\)\{[\s\S]*?\}\nfunction bindAudioWarmup/,
  `let opsEventsBound=false;
async function setupOperationalNotifications(){
  const room=core.roomUuid;if(!room||!core.sb)return;
  if(notificationSeenRoom!==room){notificationSeenRoom=room;seenAssignments.clear();seenSos.clear();loadOpsSeen();catchUpOperational().catch(e=>console.warn('KTAK35 notify catch-up',e))}
  if(!opsEventsBound){opsEventsBound=true;window.addEventListener('ktak35:assignment',e=>assignmentAlert(e.detail||{}));window.addEventListener('ktak35:sos',e=>sosAlert(e.detail||{}))}
}
function bindAudioWarmup`,
  'shared command realtime alert events'
);
// Web Push now owns the system notification. The in-page layer only renders banner/tone/vibration.
usability=usability.replace(/;browserNotify\(title,body,`ktak35-\$\{kind\}-\$\{Date\.now\(\)\}`,kind==='sos'\)/g,'');

/* ---------------- desktop radar layout + timeline UI ---------------- */
html=replaceOnce(
  html,
  `<div class="v35Card v35Full"><div class="v35CardHead"><h3>🕒 任務 Timeline</h3><button id="v35TimelineToggle" type="button">收合</button></div><div id="v35TimelineBody"><div id="v35Timeline" class="v35Timeline"></div></div></div>`,
  `<div class="v35Card v35Full"><div class="v35CardHead"><h3>🕒 任務 Timeline</h3><div class="v35HeadActions"><button id="v35TimelineClear" class="danger v35CommanderOnly" type="button">清空 Timeline</button><button id="v35TimelineToggle" type="button">收合</button></div></div><div id="v35TimelineBody"><div id="v35Timeline" class="v35Timeline"></div></div></div>`,
  'timeline clear button'
);
html=html.replace('</style>',`
/* ktak-v35-field-feedback-v5 */
.v35TimelineDelete{padding:4px 7px!important;font-size:9px!important;align-self:center}.v35TimelineRow{grid-template-columns:88px minmax(0,1fr) auto!important;align-items:center!important}
@media(min-width:821px){
  .mapSidebar .v35RadarTools{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:7px!important;width:100%!important;min-width:0!important;overflow:hidden!important}
  .mapSidebar .v35RadarTools>div{grid-column:1/-1!important;display:block!important;min-width:0!important}
  .mapSidebar .v35RadarTools>div b{display:block!important;margin-bottom:3px!important}.mapSidebar .v35RadarTools>div span{display:block!important;white-space:normal!important;line-height:1.4!important}
  .mapSidebar .v35RadarTools label{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;align-items:center!important;gap:5px!important;min-width:0!important;white-space:nowrap!important}
  .mapSidebar .v35RadarTools input{width:100%!important;min-width:0!important;max-width:none!important}
  .mapSidebar .v35RadarTools button,.mapSidebar .v35RadarTools a{grid-column:1/-1!important;width:100%!important;max-width:100%!important;white-space:normal!important;text-align:center!important;overflow-wrap:anywhere!important}
}
@media(max-width:520px){.v35TimelineRow{grid-template-columns:74px minmax(0,1fr) auto!important}.v35TimelineDelete{padding:4px 5px!important}}
</style>`);

html=html.replace('./ktak-v35-command.js?v=35-feedback4','./ktak-v35-command.js?v=35-feedback5');
html=html.replace('./ktak-v35-usability.js?v=35-feedback4','./ktak-v35-usability.js?v=35-feedback5');
command=`// ktak-v35-field-feedback-v5\n${command}`;
usability=`// ktak-v35-field-feedback-v5\n${usability}`;

for(const marker of ['ktak-v35-field-feedback-v5','pushOperational','clearTimeline','ktak35:assignment']){
  if(!command.includes(marker)&&!usability.includes(marker)&&!html.includes(marker))throw new Error(`V3.5 feedback-v5 self-check failed: ${marker}`);
}
if(!html.includes('applyChatRealtimeRow')||!html.includes('v35TimelineClear')||!html.includes('v=35-feedback5'))throw new Error('V3.5 feedback-v5 HTML self-check failed');
if(!command.includes("functions.invoke('ktak35-push'")||!command.includes("pushOperational('sos'")||!command.includes("pushOperational('assignment'"))throw new Error('V3.5 feedback-v5 push self-check failed');
if(!usability.includes("window.addEventListener('ktak35:assignment'")||!usability.includes("window.addEventListener('ktak35:sos'"))throw new Error('V3.5 feedback-v5 alert self-check failed');

fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 field feedback v5 applied: Web Push dispatch/SOS, shared Realtime banners, instant received chat, desktop radar fit, commander Timeline delete/clear.');

