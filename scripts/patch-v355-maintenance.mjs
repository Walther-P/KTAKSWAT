import fs from 'node:fs';

const htmlPath='dist/index.html';
const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const promptPath='dist/ktak-v35-assignment-prompt-v14.js';
const runtimeSource='public/ktak-v35-maintenance-v355.js';
const runtimeDist='dist/ktak-v35-maintenance-v355.js';
for(const p of [htmlPath,commandPath,usabilityPath,promptPath,runtimeSource])if(!fs.existsSync(p))throw new Error('V3.5.5 missing '+p);
let html=fs.readFileSync(htmlPath,'utf8');
let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let prompt=fs.readFileSync(promptPath,'utf8');
const runtime=fs.readFileSync(runtimeSource,'utf8');new Function(runtime);fs.copyFileSync(runtimeSource,runtimeDist);

const replaceOnce=(text,needle,replacement,label)=>{
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`V3.5.5 expected one ${label}, got ${count}`);
  return text.replace(needle,replacement);
};
const replaceRegex=(text,re,replacement,label)=>{
  const matches=text.match(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))||[];
  if(matches.length!==1)throw new Error(`V3.5.5 expected one ${label}, got ${matches.length}`);
  return text.replace(re,replacement);
};

/* 1. A resolved SOS must not leave the originator in SOS-generated emergency. */
command=replaceRegex(command,
  /function effectiveStatus\(u\)\{const s=data\.status\.find\(x=>x\.user_id===u\.id\)\?\.status\|\|'available',l=locOf\(u\.id\);if\(l\?\.updatedAt&&Date\.now\(\)-new Date\(l\.updatedAt\)\.getTime\(\)>60000\)return 'offline';return s\}/,
  `function effectiveStatus(u){const row=data.status.find(x=>x.user_id===u.id),s=row?.status||'available',l=locOf(u.id);if(l?.updatedAt&&Date.now()-new Date(l.updatedAt).getTime()>60000)return 'offline';if(s==='emergency'&&row?.note==='SOS 已觸發'&&!data.sos.some(x=>x.status==='active'&&String(x.user_id)===String(u.id)))return 'available';return s}`,
  'stale SOS display guard');
command=replaceRegex(command,
  /async function resolveSos\(id\)\{[\s\S]*?\}\nfunction installSosHold/,
  `async function resolveSos(id){
  const target=data.sos.find(x=>String(x.id)===String(id))||null;
  const {error}=await sb().from('ktak35_sos').update({status:'resolved',resolved_at:new Date().toISOString(),resolved_by:me()}).eq('room_id',room()).eq('id',id);
  if(error){notify('解除失敗：'+error.message);return}
  const targetId=target?.user_id;
  if(targetId){
    const statusRow=data.status.find(x=>String(x.user_id)===String(targetId));
    if(statusRow?.status==='emergency'&&statusRow?.note==='SOS 已觸發'){
      if(String(targetId)===String(me()))await setStatus('available','');
      else if(role()==='commander'){
        const {error:statusError}=await sb().from('ktak35_member_status').update({status:'available',note:'',updated_at:new Date().toISOString()}).eq('room_id',room()).eq('user_id',targetId).eq('status','emergency').eq('note','SOS 已觸發');
        if(statusError)console.warn('KTAK35 clear resolved SOS status',statusError);
      }
    }
  }
  await timeline('sos_resolved','SOS 已解除',{sos_id:id,user_id:targetId||null},targetId||null);
  await refreshAll()
}
function installSosHold`,
  'SOS target status reset');

/* 4. UPDATE events may refresh task state, but must not force-open the same prompt again. */
const promptNeedle="if(isMine(a)&&ACTIVE.has(a.status)){current=a;renderPrompt(a,true)}else if(current?.id===a?.id)ensurePrompt().classList.add('hidden')";
prompt=replaceOnce(prompt,promptNeedle,"if(isMine(a)&&ACTIVE.has(a.status)){current=a;renderPrompt(a,false)}else if(current?.id===a?.id)ensurePrompt().classList.add('hidden')",'assignment UPDATE prompt de-duplication');

/* 5. Background radar refresh only refreshes a radar the user already turned on. */
const radarNeedle="radarRefreshTimer=setInterval(()=>{if(!radarPlaying)$('v35RadarNow')?.click()},5*60*1000)";
usability=replaceOnce(usability,radarNeedle,"radarRefreshTimer=setInterval(()=>{if(toggle.checked&&!radarPlaying)$('v35RadarNow')?.click()},5*60*1000)",'radar auto-refresh guard');

/* 3. Expose the existing brief editor draft (including vehicle/equipment drafts) without saving it. */
const bridgeNeedle="chooseMapSymbol:(key,label,color)=>{if(color&&/^#[0-9a-f]{6}$/i.test(color))currentColor=color;chooseIcon(key,label)}";
const bridgeReplacement=bridgeNeedle+`,captureBriefDraft:()=>({values:Object.fromEntries(briefIds.map(id=>[id,$(id)?.value??''])),vehicles:vehicleDraft.map(x=>({...x})),equipment:equipmentDraft.map(x=>({...x}))}),restoreBriefDraft:d=>{if(!d)return;setBriefEdit(true);briefIds.forEach(id=>{if($(id)&&Object.prototype.hasOwnProperty.call(d.values||{},id))$(id).value=d.values[id]});vehicleDraft=(d.vehicles||[]).map(x=>({...x}));equipmentDraft=(d.equipment||[]).map(x=>({...x}));renderVehicleEditor();renderEquipmentEditor();$("executionOtherWrap")?.classList.toggle("hidden",$("executionMode")?.value!=="其他")}`;
html=replaceOnce(html,bridgeNeedle,bridgeReplacement,'brief draft core bridge');

/* 2. Render v355team:* map items as a directional five-sided team marker. */
const makeIconNeedle="function makeIcon(item){\n  const svg=item.type==='photo'";
const makeIconHead=[
  "function makeIcon(item){",
  "  if(String(item?.icon||'').startsWith('v355team:')){",
  "    const color=/^#[0-9a-f]{6}$/i.test(item.color||'')?item.color:'#45aff2';",
  "    const label=escapeHtml(item.label||'編組');",
  "    const visual=(item.scale||1)*mapZoomVisualFactor(),rotation=Number(item.rotation)||0,selected=item.id===selectedMapId?' map-selected-glow':'';",
  "    return L.divIcon({className:'v355TeamDivIcon',html:`<div class=\"v355TeamMarker${selected}\" style=\"transform:scale(${visual})\"><svg class=\"v355TeamMarkerShape\" viewBox=\"0 0 96 50\" style=\"transform:rotate(${rotation}deg)\"><path d=\"M4 5H66L92 25 66 45H4Z\" fill=\"${color}\" fill-opacity=\".82\" stroke=\"#fff\" stroke-width=\"3\" stroke-linejoin=\"round\"/></svg><span class=\"v355TeamMarkerLabel\">${label}</span></div>`,iconSize:[104,54],iconAnchor:[52,27]});",
  "  }",
  "  const svg=item.type==='photo'"
].join('\n');
html=replaceOnce(html,makeIconNeedle,makeIconHead,'directional team map marker');

const css=`
/* ktak-v35-maintenance-v355 */
.v355LegacyGroupIcon{display:none!important}.v355GroupMini{width:34px;height:22px;display:grid;place-items:center;flex:0 0 34px}.v355GroupMini svg{display:block!important;width:34px!important;height:22px!important;filter:drop-shadow(0 2px 3px #0008)}
.v355TeamDivIcon{background:transparent!important;border:0!important}.v355TeamMarker{width:104px;height:54px;position:relative;transform-origin:center;filter:drop-shadow(0 3px 6px #000b)}.v355TeamMarkerShape{position:absolute!important;left:4px;top:2px;width:96px!important;height:50px!important;overflow:visible!important;transform-origin:48px 25px}.v355TeamMarkerLabel{position:absolute;left:10px;right:31px;top:50%;transform:translateY(-50%);z-index:2;color:#fff;font:900 10px/1.15 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px #000,0 0 2px #000;pointer-events:none}
#v355TimelineExport{background:#173346!important;border-color:#3b6c85!important}
`;
if(!html.includes('ktak-v35-maintenance-v355'))html=html.replace('</style>',css+'\n</style>');
if(!html.includes('./ktak-v35-maintenance-v355.js'))html=html.replace('</body>','<script src="./ktak-v35-maintenance-v355.js?v=3.5.5"></script>\n</body>');
else html=html.replace(/\.\/ktak-v35-maintenance-v355\.js(?:\?[^"']*)?/, './ktak-v35-maintenance-v355.js?v=3.5.5');

fs.writeFileSync(htmlPath,html);
fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(promptPath,prompt);

await import('./test-v355-maintenance.mjs');
console.log('KTAK V3.5.5 maintenance applied: cross-device SOS recovery, directional colored team markers, brief-draft map return, assignment prompt de-duplication, radar opt-in refresh and detailed Timeline export.');

// V3.5.6 is a narrow hotfix on top of the verified V3.5.5 maintenance layer.
await import('./patch-v356-hotfix.mjs');

