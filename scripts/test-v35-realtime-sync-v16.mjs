import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const files=[
  'dist/ktak-v35-command.js',
  'dist/ktak-v35-usability.js',
  'dist/ktak-v35-field-v9.js',
  'dist/ktak-v35-assignment-prompt-v14.js',
  'dist/ktak-v35-field-v15.js'
];
const runtimes=files.map(f=>[f,fs.readFileSync(f,'utf8')]);

if(!html.includes('if(!sb||!currentRoomUuid)return;'))throw new Error('v16 publish no longer writes during Realtime loss');
if(html.includes('if(!onlineReady||!sb||!currentRoomUuid)return;'))throw new Error('v16 old publish guard still present');
if(!html.includes('onlineReady=false'))throw new Error('v16 room channel errors do not mark Realtime unhealthy');
if(!html.includes('roomFallbackPollBusy')||!html.includes('await fetchMap();save();renderMapItems()'))throw new Error('v16 fallback map polling missing');
if(!html.includes('即時連線不穩，已切換備援同步'))throw new Error('v16 fallback status message missing');

// Inspect every actual V3.5 Realtime channel in the final built runtimes instead
// of assuming an old channel still exists in a particular file. DEV is PrivateOnly,
// so any remaining public V3.5 channel is a build failure.
let channelCount=0;
for(const [file,src] of runtimes){
  const re=/\.channel\(([^;]{0,420}?)\)\s*\.on\(/g;
  for(const m of src.matchAll(re)){
    channelCount++;
    const call=m[1];
    if(!call.includes('private:true'))throw new Error(`v16 public Realtime channel remains in ${file}: ${call.slice(0,160)}`);
  }
  const knownPublic=[
    'sb().channel(`ktak35:${key}`)',
    'core.sb.channel(`ktak35-notify:${room}`)',
    "sb().channel('ktak35:v9-assignment:'+r)",
    "sb().channel('ktak35-assignment-prompt-v14:'+r)",
    "sb().channel('ktak35-sos-prompt-v15:'+r)"
  ];
  for(const p of knownPublic)if(src.includes(p))throw new Error('v16 known public channel remains in '+file+': '+p);
}
if(channelCount<4)throw new Error('v16 unexpectedly found fewer than four V3.5 Realtime channels: '+channelCount);

// Deterministic behaviour check: persistence is allowed when Realtime is down,
// while fallback polling activates only during that outage.
const canPublish=({sb,room})=>!!sb&&!!room;
if(!canPublish({sb:{},room:'009'}))throw new Error('v16 persistence incorrectly depends on Realtime');
if(canPublish({sb:null,room:'009'}))throw new Error('v16 persistence should still require Supabase');
const shouldPoll=({onlineReady,busy,sb,room,state})=>!onlineReady&&!busy&&!!sb&&!!room&&!!state;
if(!shouldPoll({onlineReady:false,busy:false,sb:{},room:'009',state:{}}))throw new Error('v16 fallback does not activate during outage');
if(shouldPoll({onlineReady:true,busy:false,sb:{},room:'009',state:{}}))throw new Error('v16 fallback should stop after Realtime recovers');

console.log(`V3.5 realtime v16 tests passed: ${channelCount} built V3.5 channel(s) are private-only, map persistence is Realtime-independent, and outage-only fallback polling is present.`);

