// Legacy status/sector/floor delivery. Assignment delivery uses the shared RPC outbox.
const pendingKey=()=>`ktak35.pending.v351.${room()}.${me()}.`;
const isOnline=()=>navigator.onLine!==false;
let queueFlush=null;
function queuedItems(prefix=pendingKey()){
  const items=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;
    const q=JSON.parse(localStorage.getItem(key));
    if(!q||key!==prefix+q.operationId)throw new Error('待送資料無法讀取，請保留並回報問題');
    items.push(q);
  }
  return items.sort((a,b)=>a.queuedAt.localeCompare(b.queuedAt));
}
function queueAction(action){
  if(!room()||!me())throw new Error('請先加入任務房間');
  const q={...action,operationId:crypto.randomUUID(),roomId:room(),userId:me(),queuedAt:new Date().toISOString()};
  localStorage.setItem(pendingKey()+q.operationId,JSON.stringify(q));renderOffline();return q;
}
async function runOrQueue(action,runner){
  // Persist before attempting the network. A response lost in transit remains pending.
  const q=queueAction(action);await flushQueue();
  const queued=!!localStorage.getItem(`ktak35.pending.v351.${q.roomId}.${q.userId}.`+q.operationId);
  if(queued)notify('操作已暫存，尚未送達；恢復連線後會重試');
  return {queued};
}
async function flushQueue(){
  if(!isOnline()||!room()||!me())return;
  if(queueFlush)return queueFlush;
  const r=room(),u=me(),prefix=pendingKey();
  const run=async()=>{
    let sent=0;
    for(const q of queuedItems(prefix)){
      if(r!==room()||u!==me()||!isOnline())break;
      if(!localStorage.getItem(prefix+q.operationId))continue;
      try{
        if(q.roomId!==r||q.userId!==u)throw new Error('待送身分不符');
        if(q.kind==='status')await setStatus(q.status,q.note,true);
        else if(q.kind==='sector')await updateSector(q.id,q.patch,true);
        else if(q.kind==='floor')await saveFloor(q.pageId,q.status,true);
        else throw new Error('此操作需確認後重新送出');
        localStorage.removeItem(prefix+q.operationId);sent++;
      }catch(e){localStorage.setItem(prefix+q.operationId,JSON.stringify({...q,error:'尚未送達，請確認連線及權限後重試'}));console.warn('KTAK pending delivery',e);break;}
    }
    if(r===room()&&u===me()){if(sent)notify(`已同步 ${sent} 項離線操作`);renderOffline();}
  };
  queueFlush=Promise.resolve().then(()=>navigator.locks?.request?navigator.locks.request(prefix,run):run()).finally(()=>{queueFlush=null;});
  return queueFlush;
}
function renderOffline(){
  window.dispatchEvent(new Event('ktak35:delivery'));const el=$('v35OfflineBanner');if(!el)return;
  let n=0,legacy=false;
  try{n=queuedItems().length+(window.__KTAK35_ASSIGNMENTS?.list()?.length||0);legacy=JSON.parse(localStorage.getItem(`ktak35.pending.${room()}`)||'[]').length>0;}catch{legacy=true;}
  el.classList.toggle('offline',!isOnline());el.classList.toggle('pending',n>0||legacy);
  el.textContent=legacy?'⚠ 舊版待送資料已保留，請至指揮頁確認':!isOnline()?`⚠ 離線模式 · ${n} 項待送`:n?`⏳ ${n} 項尚未送達`:'● 網路已連線';
}
window.addEventListener('online',()=>{renderOffline();flushQueue().catch(console.warn)});
window.addEventListener('offline',renderOffline);
setInterval(()=>{if(document.visibilityState==='visible')flushQueue().catch(console.warn)},30000);

window.__KTAK35_PENDING={flush:flushQueue,list:queuedItems,discard:async id=>{const key=pendingKey()+id,r=room(),u=me();if(queueFlush)await queueFlush;if(r!==room()||u!==me())throw new Error('房間已切換');localStorage.removeItem(key);renderOffline()}};

