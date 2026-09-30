import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
if(!html.includes('ktak-v35-realtime-auth-v17'))throw new Error('V17 HTML marker missing');

const files=[
  'dist/ktak-v35-command.js',
  'dist/ktak-v35-field-v9.js',
  'dist/ktak-v35-assignment-prompt-v14.js',
  'dist/ktak-v35-field-v15.js'
];

let channelCount=0;
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  if(!src.includes('realtime.setAuth()'))throw new Error('V17 explicit Realtime auth missing: '+file);
  const calls=[...src.matchAll(/\.channel\(([^\n;]+?ktak35[^\n;]+?)\)/g)];
  channelCount+=calls.length;
  for(const m of calls){
    if(!m[0].includes('private:true'))throw new Error('V17 non-private KTAK35 channel remains: '+file+' :: '+m[0]);
  }
}
if(channelCount<4)throw new Error('V17 expected at least four built KTAK35 channels, got '+channelCount);

const v9=fs.readFileSync('dist/ktak-v35-field-v9.js','utf8');
const v14=fs.readFileSync('dist/ktak-v35-assignment-prompt-v14.js','utf8');
const v15=fs.readFileSync('dist/ktak-v35-field-v15.js','utf8');
for(const [name,src,key] of [['v9',v9,"roomKey=''"],['v14',v14,"roomKey=''"],['v15',v15,"sosRoom='' ".trim()]]){
  if(!src.includes("status==='CHANNEL_ERROR'")||!src.includes("status==='TIMED_OUT'")||!src.includes(key))throw new Error(`V17 ${name} channel recovery missing`);
}

const sql=fs.readFileSync('supabase/V35_REALTIME_ROOM_TOPIC_AUTH.sql','utf8');
for(const marker of [
  '^ktak35:[0-9a-fA-F-]{36}$',
  '^ktak35:v9-assignment:[0-9a-fA-F-]{36}$',
  '^ktak35-assignment-prompt-v14:[0-9a-fA-F-]{36}$',
  '^ktak35-sos-prompt-v15:[0-9a-fA-F-]{36}$',
  'public.ktak_is_member',
  'to authenticated'
])if(!sql.includes(marker))throw new Error('V17 room-scoped Realtime SQL marker missing: '+marker);

console.log(`V3.5 realtime auth v17 tests passed: ${channelCount} private channel(s) explicitly bind current auth, retry cleanly, and repository SQL keeps topic access room-member scoped.`);

