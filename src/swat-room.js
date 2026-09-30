// Runs inside the preserved engine: all server authorization remains enforced.
const swatStorage={get(k){try{return localStorage.getItem('swat:'+k)}catch{return null}},set(k,v){try{localStorage.setItem('swat:'+k,v)}catch{}}};
let swatLink=new URLSearchParams(location.hash.slice(1)).get('room')||swatStorage.get('last-link')||'';
let swatBusy=false;
$('leaveBtn').addEventListener('click',()=>{swatStorage.set('last-link','');history.replaceState(null,'',location.pathname+location.search)},true);
const swatNick=()=>swatStorage.get('nick')||('成員'+crypto.randomUUID().slice(0,4));
function swatRemember(row,token,nick){
  swatLink=token;swatStorage.set('last-link',token);swatStorage.set('nick',nick);
  swatStorage.set('title:'+row.room_id,row.title);swatStorage.set('link:'+row.room_id,token);
  history.replaceState(null,'','#room='+token);
}
async function swatJoin(){
  if(swatBusy||!/^[a-f0-9]{64}$/.test(swatLink))return;
  swatBusy=true;const nick=swatNick();
  try{
    await ensureAuth();
    const {data,error}=await sb.rpc('ktak_swat_join',{p_token:swatLink,p_nick:nick,p_device_key:window.__ktakEnhance.deviceKey()});
    if(error)throw error;const row=Array.isArray(data)?data[0]:data;
    swatRemember(row,swatLink,nick);await loadOnlineRoom(row.room_id);await enterRoom();
  }catch(e){onlineStatus('加入失敗：'+(String(e.message).includes('LINK')?'連結已失效或任務已到期':e.message),'bad')}
  finally{swatBusy=false}
}
$('createRoomBtn').onclick=async()=>{
  if(swatBusy)return;swatBusy=true;$('createRoomBtn').disabled=true;
  const nick=$('createNick').value.trim()||swatNick(),title=$('createRoom').value.trim()||'共同任務';
  try{
    await ensureAuth();
    const {data,error}=await sb.rpc('ktak_swat_create',{p_title:title,p_nick:nick,p_retention_days:Number($('createRetention').value),p_device_key:window.__ktakEnhance.deviceKey()});
    if(error)throw error;const row=Array.isArray(data)?data[0]:data;
    swatRemember(row,row.share_token,nick);await loadOnlineRoom(row.room_id);await enterRoom();toast('已建立，按「分享房間」邀請同事');
  }catch(e){toast('建立失敗：'+e.message)}finally{swatBusy=false;$('createRoomBtn').disabled=false;initTurnstile()}
};
$('showJoinBtn').onclick=()=>{
  const link=prompt('貼上 KTAK SWAT 房間連結');if(!link)return;
  try{const u=new URL(link,location.href),token=new URLSearchParams(u.hash.slice(1)).get('room');if(!/^[a-f0-9]{64}$/.test(token||''))throw Error();swatLink=token;swatJoin()}catch{toast('請貼上完整房間連結')}
};
const swatOriginalRender=renderAll;
renderAll=function(){swatOriginalRender();if(!state)return;$('headerRoom').textContent=swatStorage.get('title:'+currentRoomUuid)||roomId;$('headerRole').textContent='共同編輯'};
renderPermissions=function(){
  $('permissionTab').classList.remove('hidden');$('securityAdminCard').classList.remove('hidden');
  $('roomExpiryInfo').textContent=expiryStatusText(state.meta.expiresAt);
  $('permissionList').replaceChildren();
  for(const u of Object.values(state.users)){const row=document.createElement('div');row.className='valueBox';row.textContent=u.nick;$('permissionList').append(row)}
};
displayName=function(u=user()){return u?.nick||'尚未加入'};
Object.keys(roles).forEach(k=>roles[k]='成員');
async function swatBoot(){
  showEntry('home');if(!await initBackend())return;
  if(!/^[a-f0-9]{64}$/.test(swatLink))return;
  onlineStatus('正在加入分享房間…','wait');
  const {data:{session}}=await sb.auth.getSession();
  if(session?.user){await swatJoin();return}
  onlineStatus('完成安全驗證後會自動進入房間','wait');
  const started=Date.now(),timer=setInterval(()=>{
    if(Date.now()-started>180000){clearInterval(timer);return}
    if(turnstileToken){clearInterval(timer);swatJoin()}
  },400);
}
window.__SWAT={
  async share(){
    const token=swatStorage.get('link:'+currentRoomUuid);if(!token){toast('請由原分享連結重新進入');return}
    const url=new URL('./',location.href);url.hash='room='+token;
    try{await navigator.clipboard.writeText(url.href);toast('房間連結已複製，取得連結的人皆可編輯')}catch{prompt('複製房間連結',url.href)}
  },
  async nickname(){const nick=prompt('顯示名稱',swatNick());if(!nick?.trim())return;swatStorage.set('nick',nick.trim().slice(0,40));await swatJoin()}
};
swatBoot();
