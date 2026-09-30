import fs from 'node:fs';

const htmlPath='dist/index.html';
let html=fs.readFileSync(htmlPath,'utf8');

const targets=[
  {
    file:'dist/ktak-v35-command.js',
    pattern:/async function setupRealtime\(\)\{\s*const key=room\(\);if\(!key\|\|!sb\(\)\|\|key===roomKey\)return;/,
    auth:"try{await sb().realtime.setAuth()}catch(e){console.warn('KTAK35 realtime auth',e);return}"
  },
  {
    file:'dist/ktak-v35-field-v9.js',
    pattern:/async function setupRealtime\(\)\{\s*const r=room\(\);if\(!r\|\|!sb\(\)\|\|r===roomKey\)return;/,
    auth:"try{await sb().realtime.setAuth()}catch(e){console.warn('KTAK35 v9 realtime auth',e);return}"
  },
  {
    file:'dist/ktak-v35-assignment-prompt-v14.js',
    pattern:/async function setupRealtime\(\)\{\s*const r=room\(\);if\(!r\|\|!sb\(\)\|\|r===roomKey\)return;/,
    auth:"try{await sb().realtime.setAuth()}catch(e){console.warn('KTAK35 v14 realtime auth',e);return}"
  },
  {
    file:'dist/ktak-v35-field-v15.js',
    pattern:/async function setupSosRealtime\(\)\{\s*const r=room\(\);if\(!r\|\|!sb\(\)\|\|r===sosRoom\)return;/,
    auth:"try{await sb().realtime.setAuth()}catch(e){console.warn('KTAK35 v15 realtime auth',e);return}"
  }
];

let changed=0;
for(const t of targets){
  if(!fs.existsSync(t.file))throw new Error('V17 missing runtime: '+t.file);
  let src=fs.readFileSync(t.file,'utf8');
  if(src.includes(t.auth))continue;
  const matches=src.match(new RegExp(t.pattern.source,'g'))||[];
  if(matches.length!==1)throw new Error(`V17 expected one auth insertion point in ${t.file}, got ${matches.length}`);
  src=src.replace(t.pattern,m=>m+t.auth);
  fs.writeFileSync(t.file,src);
  changed++;
}

// If a private V3.5 channel is rejected or a token was stale, make the existing
// periodic room check recreate it after setAuth() instead of keeping a dead room key.
const recoveryTargets=[
  {
    file:'dist/ktak-v35-field-v9.js',
    before:').subscribe();',
    after:").subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')roomKey=''});"
  },
  {
    file:'dist/ktak-v35-assignment-prompt-v14.js',
    before:".subscribe(status=>{if(status==='SUBSCRIBED')refresh(true)});",
    after:".subscribe(status=>{if(status==='SUBSCRIBED')refresh(true);else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')roomKey=''});"
  },
  {
    file:'dist/ktak-v35-field-v15.js',
    before:".subscribe(status=>{if(status==='SUBSCRIBED')refreshSos(true)});",
    after:".subscribe(status=>{if(status==='SUBSCRIBED')refreshSos(true);else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')sosRoom=''});"
  }
];

for(const t of recoveryTargets){
  let src=fs.readFileSync(t.file,'utf8');
  if(src.includes(t.after))continue;
  const count=src.split(t.before).length-1;
  if(count!==1)throw new Error(`V17 expected one recovery subscription in ${t.file}, got ${count}`);
  src=src.replace(t.before,t.after);
  fs.writeFileSync(t.file,src);
}

html=html.replace('</style>','\n/* ktak-v35-realtime-auth-v17 */\n</style>');
fs.writeFileSync(htmlPath,html);

await import('./test-v35-realtime-auth-v17.mjs');
console.log(`KTAK V3.5 realtime auth v17 applied: ${changed} runtime(s) gained explicit Realtime JWT binding; failed private channels now recreate with fresh auth.`);

// V18 is deliberately last: it only reorganizes UI and keyboard behavior after all
// operational, radar, assignment, SOS and Realtime patches have finished.
await import('./patch-v35-ux-v18.mjs');

