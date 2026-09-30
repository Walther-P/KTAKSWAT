(() => {
  const push=window.__KTAK6_PUSH,core=window.__KTAK35_CORE;
  if(!push)return;
  const $=id=>document.getElementById(id),card=document.querySelector('.pushCard'),room=document.querySelector('.g6-room-dialog');
  const dialog=document.createElement('dialog');dialog.className='g6-object-dialog g6-notification-dialog';
  const title=document.createElement('h2');title.textContent='派遣與訊息通知';
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b};
  const result=document.createElement('p');result.className='g6-push-result';result.setAttribute('role','status');
  const test=button('傳送測試通知到此裝置',async()=>{
    test.disabled=true;result.textContent='正在傳送…';
    try{const r=await push.test();result.textContent=r.delivered>0?'推播服務已接受。請確認系統是否收到「KTAK 測試通知」。':'此裝置訂閱可能已失效，請重新開啟通知。'}catch(e){result.textContent=e.message}finally{test.disabled=!push.enabled}
  });
  dialog.append(title,card,test,result,button('關閉',()=>dialog.close()));document.body.append(dialog);
  const open=()=>{room?.close();if(!dialog.open)dialog.showModal();push.refresh(true)};
  room.prepend(button('🔔 派遣與訊息通知',open));
  const chat=document.querySelector('.chatInfo');chat.append(button('🔔 通知設定',open));
  // Entry requires an explicit button click: iOS does not allow automatic permission prompts.
  const ask=document.createElement('dialog');ask.className='g6-object-dialog g6-entry-push';
  const heading=document.createElement('h2');heading.textContent='開啟派遣與 SOS 通知';
  const help=document.createElement('p');help.textContent='允許後，即使切換 App 或鎖定螢幕，也能收到此房間的派遣、SOS 與訊息。';
  const status=document.createElement('p');status.setAttribute('role','status');
  const enable=button('允許並開啟通知',async()=>{
    enable.disabled=true;status.textContent='正在開啟通知…';
    try{await push.enable();ask.close()}catch(error){status.textContent=error.message}finally{enable.disabled=false}
  });
  ask.append(heading,help,enable,button('暫時略過',()=>ask.close()),status);document.body.append(ask);
  let lastRoom='',promptedRoom='',checking=false;
  function update(){
    test.disabled=!push.enabled;
    const entered=!!core.roomUuid&&$('entryOverlay')?.classList.contains('hidden');
    if(!entered){ask.close();promptedRoom='';return}
    if(push.enabled){ask.close();return}
    if(lastRoom!==core.roomUuid){lastRoom=core.roomUuid;checking=true;Promise.resolve(push.refresh(true)).finally(()=>{checking=false;update()});return}
    if(checking)return;
    if(promptedRoom===core.roomUuid||$('pushStatus').textContent==='檢查中')return;
    // Wait for another dialog to finish; do not cover room-entry or recovery controls.
    if(document.querySelector('dialog[open]'))return;
    promptedRoom=core.roomUuid;
    const unavailable=$('pushToggleBtn').disabled;
    enable.disabled=unavailable;
    status.textContent=unavailable||window.Notification?.permission==='denied'?$('pushHelp').textContent:'';
    ask.showModal();
  }
  document.addEventListener('g6:push-status',update);const timer=setInterval(update,1500);update();
  window.addEventListener('online',()=>push.refresh(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)push.refresh(true)});
  window.addEventListener('pagehide',e=>{if(!e.persisted)clearInterval(timer)});
})();
