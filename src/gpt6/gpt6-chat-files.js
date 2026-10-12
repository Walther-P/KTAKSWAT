// Kept inside the chat closure: room authorization stays with the existing client.
const g6FileTypes={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',odt:'application/vnd.oasis.opendocument.text',ods:'application/vnd.oasis.opendocument.spreadsheet',odp:'application/vnd.oasis.opendocument.presentation',rtf:'application/rtf',txt:'text/plain',csv:'text/csv',json:'application/json',xml:'application/xml',zip:'application/zip','7z':'application/x-7z-compressed',rar:'application/vnd.rar',kml:'application/vnd.google-earth.kml+xml',kmz:'application/vnd.google-earth.kmz',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
const g6FileLimit=50*1024*1024;
let g6FileSending=false,g6TusPromise;
function g6FileInfo(file){const ext=file.name.split('.').pop().toLowerCase();if(!g6FileTypes[ext])throw Error('不支援此格式，請選擇 Office、PDF、ODF、文字、ZIP／7z／RAR、KML 或圖片');if(!file.size)throw Error('無法傳送空白檔案');if(file.size>g6FileLimit)throw Error('每個檔案上限 50 MB');return {ext,mime:g6FileTypes[ext]}}
function g6SelectFile(file){if(g6FileSending)return toast('檔案傳送中，請稍候');if(!can('chat'))return toast('目前無法傳送檔案');try{g6FileInfo(file)}catch(e){toast(e.message);return}clearChatPhoto();pendingChatFile=file;$('chatFileName').textContent=file.name;$('chatFileSize').textContent=fmtBytes(file.size);$('chatFilePreview').classList.remove('hidden');chatBottom()}
function g6FileStatus(text){$('g6FileStatus').textContent=text}
function g6LoadTus(){return g6TusPromise||(g6TusPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='./vendor/tus-4.3.1.min.js';s.onload=()=>resolve(window.tus);s.onerror=()=>{s.remove();g6TusPromise=null;reject(Error('上傳工具載入失敗，請重試'))};document.head.append(s)}))}
async function g6SendFile(){
 if(g6FileSending||!can('chat')||!currentRoomUuid)return;
 const file=pendingChatFile,{ext,mime}=g6FileInfo(file),room=currentRoomUuid,user=currentUserId,name=displayName(),text=$('chatInput').value,reply=chatReplyTarget;
 const object=room+'/'+user+'/files/'+safeUuid()+'.'+ext;
 const unchanged=()=>currentRoomUuid===room&&currentUserId===user;
 g6FileSending=true;g6FileStatus('準備上傳…');
 const controls=['chatSendBtn','chatFileBtn','chatPhotoBtn','chatFileClearBtn'];controls.forEach(id=>$(id).disabled=true);
 let inserted=false;
 try{
  const tus=await g6LoadTus();const {data,error}=await sb.auth.getSession();if(error||!data.session)throw Error('連線已過期，請重新進入房間');
  await new Promise((resolve,reject)=>{const upload=new tus.Upload(file,{endpoint:cfg.SUPABASE_URL.replace('.supabase.co','.storage.supabase.co')+'/storage/v1/upload/resumable',headers:{authorization:'Bearer '+data.session.access_token},metadata:{bucketName:'ktak-chat',objectName:object,contentType:mime,cacheControl:'3600'},chunkSize:6*1024*1024,uploadDataDuringCreation:true,storeFingerprintForResuming:false,retryDelays:[0,3000,5000,10000,20000],onError:reject,onProgress:(sent,total)=>g6FileStatus('上傳 '+Math.floor(sent/total*100)+'% · '+fmtBytes(sent)+' / '+fmtBytes(total)),onSuccess:resolve});upload.start()});
  const prefix=reply?'↩ 回覆 '+reply.senderName+'：「'+reply.preview+'」\n':'';
  const {data:message,error:messageError}=await sb.from('ktak_chat_messages').insert({room_id:room,sender_id:user,sender_name:name,text:prefix+'📎 檔案：'+file.name+' ('+fmtBytes(file.size)+')\n'+text.trim(),image_path:object}).select('id').single();if(messageError)throw messageError;inserted=true;
  if(unchanged()){if(pendingChatFile===file)clearChatFile();if($('chatInput').value===text)$('chatInput').value='';if(chatReplyTarget===reply)clearChatReply();chatBottom();if(message?.id)void triggerChatPush(message.id)}
  g6FileStatus('檔案已傳送');
 }catch(e){if(!inserted)await sb.storage.from('ktak-chat').remove([object]).catch(()=>{});g6FileStatus('傳送失敗，附件已保留，可再按送出');toast('傳送失敗：'+e.message)}
 finally{g6FileSending=false;controls.forEach(id=>$(id).disabled=!can('chat'))}
}
$('chatFileInput').accept=Object.keys(g6FileTypes).map(x=>'.'+x).join(',');
$('chatFileInput').onchange=e=>{const file=e.target.files?.[0];if(file)g6SelectFile(file)};
const g6Status=document.createElement('div');g6Status.id='g6FileStatus';g6Status.setAttribute('role','status');g6Status.style.cssText='font-size:12px;overflow-wrap:anywhere;color:#9fb2bd';g6Status.textContent='檔案每個上限 50 MB；可拖曳檔案至聊天室';document.querySelector('.chatComposer').append(g6Status);
const g6Chat=$('chatPage');let g6DragDepth=0;
const g6FileDrag=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
for(const type of ['dragover','drop'])window.addEventListener(type,e=>{if(g6FileDrag(e))e.preventDefault()});
g6Chat.addEventListener('dragenter',e=>{if(!g6FileDrag(e))return;e.preventDefault();g6DragDepth++;g6Chat.style.outline='2px dashed #45aff2'});
g6Chat.addEventListener('dragleave',()=>{if(--g6DragDepth<=0){g6DragDepth=0;g6Chat.style.outline=''}});
g6Chat.addEventListener('drop',e=>{if(!g6FileDrag(e))return;e.preventDefault();g6DragDepth=0;g6Chat.style.outline='';const files=Array.from(e.dataTransfer.files);if(files.length!==1)return toast('請一次拖入一個檔案；多個文件可先壓縮為 ZIP');g6SelectFile(files[0])});
