// Subscription health must include the server registration, not just the browser.
let gpt6PushRefresh=null,gpt6PushCheckedAt=0,gpt6PushIdentity='';
function pushTimeout(promise,ms=12000){
  let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('通知連線逾時，請重試')),ms))]).finally(()=>clearTimeout(timer));
}
async function pushRegistration(){
  const reg=await pushTimeout(window.KTAK_SW_READY||navigator.serviceWorker.ready);
  if(!reg?.active)throw Error('通知服務尚未就緒，請重新整理後再試');
  return reg;
}
async function getVapidPublicKey(){
  if(pushPublicKeyCache)return pushPublicKeyCache;
  const {data,error}=await pushTimeout(sb.functions.invoke('ktak-push',{body:{action:'vapid-public-key'}}));
  if(error||!data?.ok||!data.publicKey)throw Error('無法連接通知服務，請重試');
  pushPublicKeyCache=String(data.publicKey);return pushPublicKeyCache;
}
function pushIdentityValid(user){return !!user&&user===currentUserId&&!!currentRoomUuid}
async function savePushSubscription(sub,previewEnabled,user=currentUserId){
  if(!pushIdentityValid(user))throw Error('任務已切換，請重新開啟通知');
  const raw=sub.toJSON(),p256dh=raw?.keys?.p256dh,auth=raw?.keys?.auth;
  if(!raw?.endpoint||!p256dh||!auth)throw Error('裝置沒有提供完整通知訂閱');
  const {error}=await pushTimeout(sb.from('ktak_push_subscriptions').upsert({user_id:user,endpoint:raw.endpoint,p256dh,auth,enabled:true,preview_enabled:!!previewEnabled,user_agent:navigator.userAgent},{onConflict:'endpoint'}));
  if(error){const failure=Error('通知訂閱尚未保存，請按重新開啟');failure.rotate=['42501','23505'].includes(error.code);throw failure;}
  if(!pushIdentityValid(user))throw Error('任務已切換，請重新檢查通知');
}
async function currentPushSubscription(){
  if(!pushCapability().ok)return null;
  const reg=await pushRegistration();return await pushTimeout(reg.pushManager.getSubscription());
}
function setPushUi(status,label,help,buttonText,buttonDisabled=false){
  const s=$('pushStatus'),b=$('pushToggleBtn'),h=$('pushHelp');if(!s||!b||!h)return;
  s.textContent=label;s.className='pushStatus'+(status==='on'?' on':status==='warn'?' warn':'');
  b.textContent=buttonText;b.disabled=buttonDisabled||pushUiBusy;h.textContent=help;
  document.dispatchEvent(new Event('g6:push-status'));
}
function refreshPushUi(force=false){
  if(gpt6PushRefresh)return gpt6PushRefresh;
  const identity=currentUserId+'|'+currentRoomUuid;
  if(!force&&identity===gpt6PushIdentity&&Date.now()-gpt6PushCheckedAt<60000)return Promise.resolve();
  gpt6PushIdentity=identity;gpt6PushCheckedAt=Date.now();
  gpt6PushRefresh=checkGpt6Push().finally(()=>{gpt6PushRefresh=null});return gpt6PushRefresh;
}
async function checkGpt6Push(){
  const user=currentUserId,preview=$('pushPreviewToggle');if(!preview)return;
  preview.checked=pushPreviewPreference();preview.disabled=true;pushEnabledCurrent=false;
  if(!pushIdentityValid(user)){setPushUi('','尚未加入任務','加入房間後，可在此裝置開啟派遣與訊息通知。','加入任務後開啟',true);return}
  const cap=pushCapability();
  if(cap.reason==='IOS_HOME_SCREEN'){setPushUi('warn','需從主畫面開啟','iPhone 請在 Safari 分享選單加入主畫面，再從 KTAK 圖示開啟並允許通知。需要 iOS 16.4 以上。','需加入主畫面',true);return}
  if(!cap.ok){setPushUi('warn','目前環境不支援','請使用 HTTPS 網址及支援通知的瀏覽器；iPhone 請從主畫面 App 開啟。','無法開啟',true);return}
  if(Notification.permission==='denied'){setPushUi('warn','系統已拒絕通知','請在系統的 KTAK 通知設定允許通知，再回到這裡。','重新檢查');return}
  try{
    const sub=await currentPushSubscription();if(!pushIdentityValid(user))return;
    if(!sub){setPushUi('','未開啟','開啟後，即使切換 App 或鎖定螢幕也可接收派遣與訊息；每台裝置需分別允許。','開啟通知');return}
    const {data,error}=await pushTimeout(sb.from('ktak_push_subscriptions').select('enabled,preview_enabled').eq('user_id',user).eq('endpoint',sub.endpoint).maybeSingle());
    if(error)throw Error('通知伺服器連線失敗');
    if(!pushIdentityValid(user))return;
    // A previously granted browser subscription can recover a lost server row.
    if(!data&&Notification.permission==='granted')await savePushSubscription(sub,preview.checked,user);
    if(data&&!data.enabled){setPushUi('warn','尚未啟用','此裝置訂閱已停用，請重新開啟。','重新開啟通知');return}
    if(!pushIdentityValid(user))return;
    pushEnabledCurrent=true;preview.disabled=false;
    if(data){preview.checked=data.preview_enabled;setPushPreviewPreference(data.preview_enabled)}
    setPushUi('on','已開啟 · 伺服器已登記','可接收同房其他成員的派遣、SOS 與訊息。可按測試通知確認；系統專注模式可能暫停提示。','關閉通知');
  }catch{
    if(!pushIdentityValid(user))return;
    setPushUi('warn','尚未確認可接收','訂閱未成功登記或網路暫時中斷。請重新開啟通知。','重新開啟通知');
  }
}
async function enablePushNotifications(){
  if(!pushCapability().ok)throw Error('iPhone 請先從主畫面開啟 KTAK；其他裝置請確認瀏覽器支援通知');
  const user=currentUserId;if(!pushIdentityValid(user))throw Error('請先加入任務房間');
  let permission=Notification.permission;
  // Keep requestPermission in the user's direct click, before any network await.
  if(permission==='default')permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('尚未取得通知權限，請在系統通知設定允許 KTAK');
  if(!pushIdentityValid(user))throw Error('任務已切換，請重試');
  const reg=await pushRegistration();let sub=await pushTimeout(reg.pushManager.getSubscription());
  const subscribe=async()=>{const key=await getVapidPublicKey();if(!pushIdentityValid(user))throw Error('任務已切換');return await pushTimeout(reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(key)}))};
  const preview=$('pushPreviewToggle')?.checked!==false;setPushPreviewPreference(preview);
  const existing=!!sub;if(!sub)sub=await subscribe();
  try{await savePushSubscription(sub,preview,user)}catch(error){
    // After account recovery the endpoint may belong to the previous identity.
    // Rotate only this browser's subscription; RLS on other users stays intact.
    if(!existing||!error.rotate||!pushIdentityValid(user))throw error;
    if(!await sub.unsubscribe())throw error;
    sub=await subscribe();await savePushSubscription(sub,preview,user);
  }
  if(gpt6PushRefresh)await gpt6PushRefresh;
  await refreshPushUi(true);
  if(!pushEnabledCurrent)throw Error('通知尚未確認，請稍後重試');
  toast('此裝置的派遣與訊息通知已開啟');
}
async function disablePushNotifications(){
  const user=currentUserId,sub=await currentPushSubscription();
  if(sub){
    if(!await pushTimeout(sub.unsubscribe()))throw Error('裝置尚未取消訂閱，請重試');
    // Browser revocation already stops delivery, even when database cleanup fails.
    await pushTimeout(sb.from('ktak_push_subscriptions').delete().eq('user_id',user).eq('endpoint',sub.endpoint)).catch(()=>{});
  }
  pushEnabledCurrent=false;await refreshPushUi(true);toast('此裝置的派遣與訊息通知已關閉');
}
async function updatePushPreviewPreference(){
  const enabled=!!$('pushPreviewToggle')?.checked,user=currentUserId;
  if(!pushEnabledCurrent){setPushPreviewPreference(enabled);return}
  try{
    const sub=await currentPushSubscription();if(!sub||!pushIdentityValid(user))return;
    const {error}=await pushTimeout(sb.from('ktak_push_subscriptions').update({preview_enabled:enabled}).eq('user_id',user).eq('endpoint',sub.endpoint));
    if(error)throw error;setPushPreviewPreference(enabled);toast(enabled?'通知會顯示訊息內容':'通知已隱藏訊息內容');
  }catch{toast('通知預覽設定尚未保存');await refreshPushUi(true)}
}
