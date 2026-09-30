import fs from 'node:fs';

const htmlPath='dist/index.html';
const promptPath='dist/ktak-v35-assignment-prompt-v14.js';
const runtimeSource='public/ktak-v35-hotfix-v356.js';
const runtimeDist='dist/ktak-v35-hotfix-v356.js';
for(const p of [htmlPath,promptPath,runtimeSource])if(!fs.existsSync(p))throw new Error('V3.5.6 missing '+p);
let html=fs.readFileSync(htmlPath,'utf8');
let prompt=fs.readFileSync(promptPath,'utf8');
const runtime=fs.readFileSync(runtimeSource,'utf8');new Function(runtime);fs.copyFileSync(runtimeSource,runtimeDist);

const replaceOnce=(text,needle,replacement,label)=>{
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`V3.5.6 expected one ${label}, got ${count}`);
  return text.replace(needle,replacement);
};
const replaceRegex=(text,re,replacement,label)=>{
  const matches=text.match(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))||[];
  if(matches.length!==1)throw new Error(`V3.5.6 expected one ${label}, got ${matches.length}`);
  return text.replace(re,replacement);
};

/* 1. Team marker legibility + drag performance.
   The old large divIcon rebuilt its SVG and text DOM on every pointer move.
   During dragging, a team marker only needs a lat/lng update; its icon geometry
   does not change until the drag finishes. */
const dragNeedle="translateMapItem(item,dlat,dlng,base);updateLeafletLayer(layer,item);renderFansOnly();if(selectedMapId===item.id)renderMapSelection();e.preventDefault()";
const dragReplacement="const teamFast=String(item.icon||'').startsWith('v355team:');translateMapItem(item,dlat,dlng,base);if(teamFast)layer.setLatLng([item.lat,item.lng]);else updateLeafletLayer(layer,item);renderFansOnly();if(selectedMapId===item.id&&!teamFast)renderMapSelection();e.preventDefault()";
html=replaceOnce(html,dragNeedle,dragReplacement,'team drag fast path');

const css=`
/* ktak-v35-hotfix-v356 */
.v355TeamDivIcon{will-change:transform!important}
.v355TeamMarker{filter:none!important;will-change:transform!important}
.v355TeamMarkerShape path{fill-opacity:1!important}
.v355TeamMarkerLabel{opacity:1!important;color:#fff!important;font-weight:1000!important;font-size:11px!important;line-height:1.1!important;background:rgba(3,8,11,.9)!important;border-radius:4px!important;padding:2px 4px!important;box-shadow:0 0 0 1px rgba(255,255,255,.22)!important;text-shadow:0 1px 2px #000,0 0 4px #000!important}
.v353MapGroupPick b{opacity:1!important;color:#fff!important;font-weight:950!important;text-shadow:0 1px 2px #000!important}
.v353MapGroupPick small{opacity:1!important;color:#bcd0d8!important}
`;
if(!html.includes('ktak-v35-hotfix-v356'))html=html.replace('</style>',css+'\n</style>');

/* 2. Assignment popup is now a one-shot NEW-task notifier.
   accepted/active states are handled from the task card / map shortcut and never
   auto-open full screen. Seen pending states persist across Realtime reconnects,
   focus changes and foreground/background cycles on the same device. */
const helperAnchor="function sb(){return core.sb}\n";
const helper=`function promptSeenStorageKey(){return \`ktak35.assignmentPrompt.v356.\${room()||'none'}.\${me()||'none'}\`}
function promptStateKey(a){return a?.id&&a?.status?String(a.id)+':'+String(a.status):''}
function readPromptSeen(){try{const x=JSON.parse(localStorage.getItem(promptSeenStorageKey())||'[]');return Array.isArray(x)?x:[]}catch{return []}}
function wasPromptSeen(a){const k=promptStateKey(a);return !!k&&readPromptSeen().includes(k)}
function markPromptSeen(a){const k=promptStateKey(a);if(!k)return;try{const list=readPromptSeen().filter(x=>x!==k);list.push(k);localStorage.setItem(promptSeenStorageKey(),JSON.stringify(list.slice(-240)))}catch{}}
function hidePrompt(a=current){if(a)markPromptSeen(a);ensurePrompt().classList.add('hidden')}
`;
prompt=replaceOnce(prompt,helperAnchor,helperAnchor+helper,'prompt seen-state helpers');

const laterNeedle="document.body.append(root);$('v35AssignmentPrompt14Later').onclick=()=>root.classList.add('hidden');return root;";
prompt=replaceOnce(prompt,laterNeedle,"document.body.append(root);$('v35AssignmentPrompt14Later').onclick=()=>hidePrompt(current);return root;",'later button seen-state');

prompt=replaceRegex(prompt,/async function updateStatus\(a,status\)\{[\s\S]*?\n\}\n\nfunction renderPrompt/,
`async function updateStatus(a,status){
 if(!a||!sb())return false;
 markPromptSeen(a);
 const r=room(),u=me();
 try{
  const out=await window.__KTAK35_ASSIGNMENTS.respond(a,status);
  if(r!==room()||u!==me())return false;
  if(out.queued){hidePrompt(a);core.toast?.('回報已暫存，尚未送達；恢復連線後會重試');return false}
  current=window.__KTAK35_ASSIGNMENTS.memberView(out.row,me());
  if(current)markPromptSeen(current);
  hidePrompt(current||a);
  await window.__KTAK35?.refresh?.();await refresh(false);
  return true;
 }catch(e){core.toast?.('任務回報未送達：'+(e?.message||e));return false}
}

function renderPrompt`,
'one-shot updateStatus flow');

const gateNeedle="const key=room()+':'+me()+':'+a.id+':'+a.status;if(!force&&key===lastShownKey)return;lastShownKey=key;current=a;";
const gateReplacement="const key=room()+':'+me()+':'+a.id+':'+a.status;if(!force&&a.status!=='pending')return;if(!force&&(wasPromptSeen(a)||key===lastShownKey))return;lastShownKey=key;current=a;if(!force)markPromptSeen(a);";
prompt=replaceOnce(prompt,gateNeedle,gateReplacement,'auto prompt state gate');

prompt=replaceOnce(prompt,
".on('postgres_changes',{event:'INSERT',schema:'public',table:'ktak35_assignments',filter:'room_id=eq.'+r},payload=>{if(r!==room())return;const a=memberView(payload.new);if(isMine(a)&&ACTIVE.has(a.status))renderPrompt(a,true)})",
".on('postgres_changes',{event:'INSERT',schema:'public',table:'ktak35_assignments',filter:'room_id=eq.'+r},payload=>{if(r!==room())return;const a=memberView(payload.new);if(isMine(a)&&ACTIVE.has(a.status))renderPrompt(a,false)})",
'INSERT one-shot prompt');

// V3.5.5 already changed UPDATE to non-force; retain that guard and add a revision marker.
if(!prompt.includes("if(isMine(a)&&ACTIVE.has(a.status)){current=a;renderPrompt(a,false)}"))throw new Error('V3.5.6 missing V3.5.5 UPDATE de-duplication');
prompt=replaceOnce(prompt,
"window.__KTAK35_ASSIGNMENT_PROMPT14={version:14,refresh,show:a=>renderPrompt(a,true),openTaskLocation,getState:()=>({room:room(),user:me(),current:current?{id:current.id,status:current.status,title:current.title}:null,visible:!ensurePrompt().classList.contains('hidden'),realtimeRoom:roomKey})};",
"window.__KTAK35_ASSIGNMENT_PROMPT14={version:14,revision:'14.2-v356',refresh,show:a=>renderPrompt(a,true),openTaskLocation,getState:()=>({room:room(),user:me(),current:current?{id:current.id,status:current.status,title:current.title}:null,visible:!ensurePrompt().classList.contains('hidden'),realtimeRoom:roomKey})};",
'prompt revision marker');

// Cache-bust the patched prompt asset and add the V3.5.6 runtime marker.
html=html.replace(/\.\/ktak-v35-assignment-prompt-v14\.js(?:\?[^"']*)?/, './ktak-v35-assignment-prompt-v14.js?v=35-assignment14-v356');
if(!html.includes('./ktak-v35-hotfix-v356.js'))html=html.replace('</body>','<script src="./ktak-v35-hotfix-v356.js?v=3.5.6"></script>\n</body>');
else html=html.replace(/\.\/ktak-v35-hotfix-v356\.js(?:\?[^"']*)?/, './ktak-v35-hotfix-v356.js?v=3.5.6');

fs.writeFileSync(htmlPath,html);
fs.writeFileSync(promptPath,prompt);

await import('./test-v356-hotfix.mjs');
console.log('KTAK V3.5.6 hotfix applied: team markers are fully legible and use a lightweight drag path; assignment full-screen alerts are one-shot pending notifications and cannot reopen after acceptance.');

