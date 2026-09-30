// Narrow engine fixes. Applied to the preserved 3.5.6 build, never to production.
export function patchStability(html){
 const swap=(a,b)=>{if(!html.includes(a))throw Error('Stability anchor missing: '+a.slice(0,80));html=html.replace(a,b)};
 // Every queued write keeps its room, author and snapshot even if another room opens.
 for(const [name,next] of [['syncMap','function flattenBoardObjects'],['syncBoard','async function syncBrief'],['syncBrief','function publish']]){
  const start=html.indexOf('async function '+name+'('),end=html.indexOf(next,start);
  if(start<0||end<0)throw Error('Missing '+name);
  const block=html.slice(start,end).replace(/\((target0?)\)/, '($1,ctx)').replaceAll('syncSnapshot','ctx.snapshot').replaceAll('currentRoomUuid','ctx.room').replaceAll('currentUserId','ctx.user');
  html=html.slice(0,start)+block+html.slice(end);
 }
 swap('  const target={brief:clone(state.brief),map:clone(state.map),board:clone({...state.board,active:0})};', '  const target={brief:clone(state.brief),map:clone(state.map),board:clone({...state.board,active:0})};\n  const ctx={room:currentRoomUuid,user:currentUserId,snapshot:syncSnapshot,permissions:{brief:can("brief"),map:can("map"),board:can("board")}};');
 for(const kind of ['brief','map','board'])swap(`if(can("${kind}")&&!jsonSame(syncSnapshot.${kind},target.${kind}))await sync${kind[0].toUpperCase()+kind.slice(1)}(target.${kind})`,`if(ctx.permissions.${kind}&&!jsonSame(ctx.snapshot.${kind},target.${kind}))await sync${kind[0].toUpperCase()+kind.slice(1)}(target.${kind},ctx)`);
 swap('async function loadOnlineRoom(roomUuid){\n  currentRoomUuid=roomUuid;', 'async function loadOnlineRoom(roomUuid){\n  await syncChain;\n  if(currentRoomUuid&&currentRoomUuid!==roomUuid)await stopLocationSharing({removeRemote:true,silent:true});\n  syncSnapshot={brief:null,map:null,board:null};\n  currentRoomUuid=roomUuid;');
 // Let pending edits finish before a deliberate reload or room departure.
 swap('$("leaveBtn").onclick=async()=>{try{await stopLocationSharing', '$("leaveBtn").onclick=async()=>{try{await syncChain;await stopLocationSharing');
 swap("          await stopLocationSharing({removeRemote:true,silent:true});", "          await syncChain;\n          await stopLocationSharing({removeRemote:true,silent:true});");
 swap('async function writeMyLocation(loc){','let locationGeneration=0,locationStarting=false,locationWriteInFlight=null;\nasync function writeMyLocation(loc){');
 swap('try{await writeMyLocation(loc)}catch(e)', 'try{locationWriteInFlight=writeMyLocation(loc);await locationWriteInFlight}catch(e)');
 swap('finally{locationWriteBusy=false;if(locationPendingFix&&locationSharing)', 'finally{locationWriteInFlight=null;locationWriteBusy=false;if(locationPendingFix&&locationSharing)');
 swap('  if(locationSharing)return;\n  try{if(await window.__ktakEnhance?.startNativeLocationIfAvailable())return}', '  if(locationSharing||locationStarting)return;\n  if(!currentRoomUuid||!currentUserId||!user()?.approved){toast("請先加入並獲准進入任務");return}\n  const generation=++locationGeneration,shareRoom=currentRoomUuid,shareUser=currentUserId;\n  try{if(await window.__ktakEnhance?.startNativeLocationIfAvailable())return}');
 swap('  navigator.geolocation.getCurrentPosition(\n    beginLocationWatchFromGrantedFix,\n    onLocationError,', '  locationStarting=true;\n  navigator.geolocation.getCurrentPosition(\n    pos=>{if(generation!==locationGeneration||shareRoom!==currentRoomUuid||shareUser!==currentUserId)return;locationStarting=false;beginLocationWatchFromGrantedFix(pos)},\n    err=>{if(generation!==locationGeneration)return;locationStarting=false;onLocationError(err)},');
 swap('  locationSharing=false;if(disablePreference)', '  ++locationGeneration;locationStarting=false;const stoppedRoom=currentRoomUuid,stoppedUser=currentUserId;\n  locationSharing=false;if(disablePreference)');
 swap('  if(removeRemote&&sb&&currentRoomUuid&&currentUserId){try{await sb.from("ktak_member_locations").delete().eq("room_id",currentRoomUuid).eq("user_id",currentUserId)}catch(e){console.warn("remove location",e)}}', '  if(locationWriteInFlight)try{await locationWriteInFlight}catch{}\n  let remoteRemoved=true;\n  if(removeRemote&&sb&&stoppedRoom&&stoppedUser){try{const {error}=await sb.from("ktak_member_locations").delete().eq("room_id",stoppedRoom).eq("user_id",stoppedUser);if(error)throw error}catch(e){remoteRemoved=false;console.warn("remove location",e)}}');
 swap('delete memberLocations[currentUserId];setLocationUi("off","未分享","定位已關閉；其他隊員不再看到你的目前位置。");', 'delete memberLocations[stoppedUser];setLocationUi("off","未分享",remoteRemoved?"定位已關閉；其他隊員不再看到你的目前位置。":"本機已停止定位；遠端清除尚未確認，舊位置會在逾時後隱藏。");');
 swap('$("locationShareBtn").onclick=()=>locationSharing?', '$("locationShareBtn").onclick=()=>locationSharing||locationStarting?');
 // Preserve in-memory edits while requests are pending or failed. Never silently
 // replace them with a reconnect fetch; retry first and show the real write state.
 swap('function publish(){','let gpt6SyncPending=0,gpt6SyncError="";\nfunction publish(){');
 swap('  syncChain=syncChain.then(async()=>{','  gpt6SyncPending++;\n  syncChain=syncChain.then(async()=>{');
 swap('await syncBoard(target.board,ctx)\n  }).catch(err=>{console.error("sync",err);toast("同步失敗："+(err.message||"未知錯誤"))})','await syncBoard(target.board,ctx);\n    gpt6SyncError="";\n  }).catch(err=>{gpt6SyncError=err.message||"未知錯誤";console.error("sync",err);toast("內容尚未同步，請保持此頁並按重試")}).finally(()=>{gpt6SyncPending--})');
 swap('clearTimeout(refreshTimers[kind]);refreshTimers[kind]=setTimeout(async()=>{try{await fn();','clearTimeout(refreshTimers[kind]);refreshTimers[kind]=setTimeout(async()=>{try{await syncChain;if(gpt6SyncError)return;await fn();');
 swap('if(onlineReady||roomFallbackPollBusy||!sb||!currentRoomUuid||!state)return;','if(onlineReady||roomFallbackPollBusy||gpt6SyncPending||gpt6SyncError||!sb||!currentRoomUuid||!state)return;');
 swap('    currentUserId=session.user.id;\n    try{await window.__ktakEnhance?.touchMember()}', '    currentUserId=session.user.id;\n    await syncChain;if(gpt6SyncError){publish();await syncChain;if(gpt6SyncError)return}\n    try{await window.__ktakEnhance?.touchMember()}');
 swap('async function loadOnlineRoom(roomUuid){\n  await syncChain;', 'async function loadOnlineRoom(roomUuid){\n  await syncChain;if(gpt6SyncError)throw Error("目前任務有未同步內容，請重試同步後再切換");');
 swap('$("leaveBtn").onclick=async()=>{try{await syncChain;await stopLocationSharing', '$("leaveBtn").onclick=async()=>{await syncChain;if(gpt6SyncError){toast("請先重試同步，再離開任務");return}try{await stopLocationSharing');
 swap('          await syncChain;\n          await stopLocationSharing', '          await syncChain;if(gpt6SyncError)throw Error("請先重試同步，再切換房間");\n          await stopLocationSharing');
 swap('let roomResumeBusy=false,lastRoomResumeAt=0;', 'window.addEventListener("beforeunload",e=>{if(gpt6SyncPending||gpt6SyncError){e.preventDefault();e.returnValue=""}});\nlet roomResumeBusy=false,lastRoomResumeAt=0;');
 return html;
}
