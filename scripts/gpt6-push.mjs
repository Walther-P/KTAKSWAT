import fs from 'node:fs';
export function patchPush(html){
  const start=html.indexOf('async function pushRegistration(){'),end=html.indexOf('async function triggerChatPush(messageId){',start);
  if(start<0||end<start)throw Error('Push engine boundaries missing');
  html=html.slice(0,start)+fs.readFileSync('src/gpt6/gpt6-push-engine.js','utf8')+'\n'+html.slice(end);
  const anchor='window.__KTAK35_CORE={';
  if(!html.includes(anchor))throw Error('Push bridge anchor missing');
  html=html.replace(anchor,`window.__KTAK6_PUSH={
    get enabled(){return pushEnabledCurrent},refresh:refreshPushUi,enable:enablePushNotifications,
    async test(){
      if(!pushEnabledCurrent||!currentRoomUuid)throw Error('請先加入任務並開啟通知');
      const sub=await currentPushSubscription();if(!sub)throw Error('此裝置沒有有效訂閱');
      const {data,error}=await sb.functions.invoke('ktak-push',{body:{action:'test',roomId:currentRoomUuid,endpoint:sub.endpoint}});
      if(error||!data?.ok)throw Error('測試推送失敗，請重新開啟通知後再試');
      return data;
    }
  };\n`+anchor);
  html=html.replace('🔔 此裝置聊天室通知','🔔 此裝置派遣與訊息通知');
  html=html.replace('pushUiBusy=false;\n    await refreshPushUi()','pushUiBusy=false;\n    await refreshPushUi(true)');
  return html;
}
