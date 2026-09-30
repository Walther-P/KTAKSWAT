import fs from 'node:fs';

const htmlPath='dist/index.html';
let html=fs.readFileSync(htmlPath,'utf8');

const replaceOnce=(text,needle,replacement,label)=>{
  const first=text.indexOf(needle);
  if(first<0)throw new Error('V3.5 realtime-v16 missing: '+label);
  if(text.indexOf(needle,first+needle.length)>=0)throw new Error('V3.5 realtime-v16 duplicate marker: '+label);
  return text.replace(needle,replacement);
};

// Database persistence must not depend on the Presence/Realtime channel state.
// A transient CHANNEL_ERROR previously made publish() return before writing map items,
// which produced the one-way desktop -> phone symptom.
html=replaceOnce(
  html,
  'if(!onlineReady||!sb||!currentRoomUuid)return;',
  'if(!sb||!currentRoomUuid)return;',
  'publish onlineReady guard'
);

// Mark the main room channel unhealthy on errors, throttle the warning, and use a
// lightweight database polling fallback only while Realtime is unavailable.
html=replaceOnce(
  html,
  'if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")toast("即時連線異常，正在重試")',
  'if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"){onlineReady=false;if(!window.__ktakRealtimeWarnAt||Date.now()-window.__ktakRealtimeWarnAt>20000){window.__ktakRealtimeWarnAt=Date.now();toast("即時連線不穩，已切換備援同步")}}',
  'room realtime error handling'
);

const resumeMarker='\nlet roomResumeBusy=false,lastRoomResumeAt=0;';
if(!html.includes(resumeMarker))throw new Error('V3.5 realtime-v16 missing room resume marker');
html=html.replace(resumeMarker,`\nlet roomFallbackPollBusy=false;\nsetInterval(async()=>{\n  if(onlineReady||roomFallbackPollBusy||!sb||!currentRoomUuid||!state)return;\n  roomFallbackPollBusy=true;\n  try{await fetchMap();save();renderMapItems()}\n  catch(e){console.warn('KTAK map fallback sync',e)}\n  finally{roomFallbackPollBusy=false}\n},2500);\n${resumeMarker.trimStart()}`);

// DEV Supabase is Private-Only Realtime. Every V3.5 channel therefore has to opt
// in to private mode. Invalid public channels were repeatedly rejected by Realtime
// and destabilised the shared websocket on mobile.
const files=[
  'dist/ktak-v35-command.js',
  'dist/ktak-v35-usability.js',
  'dist/ktak-v35-field-v9.js',
  'dist/ktak-v35-assignment-prompt-v14.js',
  'dist/ktak-v35-field-v15.js'
];
const patches=[
  ["sb().channel(`ktak35:${key}`)","sb().channel(`ktak35:${key}`,{config:{private:true}})"],
  ["core.sb.channel(`ktak35-notify:${room}`)","core.sb.channel(`ktak35-notify:${room}`,{config:{private:true}})"],
  ["sb().channel('ktak35:v9-assignment:'+r)","sb().channel('ktak35:v9-assignment:'+r,{config:{private:true}})"],
  ["sb().channel('ktak35-assignment-prompt-v14:'+r)","sb().channel('ktak35-assignment-prompt-v14:'+r,{config:{private:true}})"],
  ["sb().channel('ktak35-sos-prompt-v15:'+r)","sb().channel('ktak35-sos-prompt-v15:'+r,{config:{private:true}})"],
];
let patchedChannels=0;
for(const file of files){
  if(!fs.existsSync(file))throw new Error('V3.5 realtime-v16 missing built runtime: '+file);
  let src=fs.readFileSync(file,'utf8');
  for(const [before,after] of patches){
    if(src.includes(after))continue;
    if(src.includes(before)){src=src.replaceAll(before,after);patchedChannels++}
  }
  fs.writeFileSync(file,src);
}

html=html.replace('</style>','\n/* ktak-v35-realtime-sync-v16 */\n</style>');
fs.writeFileSync(htmlPath,html);

if(!html.includes('ktak-v35-realtime-sync-v16')||!html.includes('roomFallbackPollBusy')||html.includes('if(!onlineReady||!sb||!currentRoomUuid)return;'))throw new Error('V3.5 realtime-v16 HTML self-check failed');

// Do not require all five to be changed in this pass: earlier patches may have
// already made a channel private. The test below validates the final built output.
await import('./test-v35-realtime-sync-v16.mjs');
await import('./patch-v35-realtime-auth-v17.mjs');
console.log(`KTAK V3.5 realtime v16 applied: ${patchedChannels} channel(s) changed in this pass; final output verified private-only compatible, map persistence is independent of Presence, and polling backs up transient Realtime loss.`);

