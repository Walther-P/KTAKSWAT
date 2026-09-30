import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const command=fs.readFileSync('dist/ktak-v35-command.js','utf8');
const usability=fs.readFileSync('dist/ktak-v35-usability.js','utf8');
const prompt=fs.readFileSync('dist/ktak-v35-assignment-prompt-v14.js','utf8');
const runtime=fs.readFileSync('dist/ktak-v35-maintenance-v355.js','utf8');
for(const [name,src] of [['command',command],['usability',usability],['assignment prompt',prompt],['maintenance runtime',runtime]]){
  try{new Function(src)}catch(e){throw new Error(`V3.5.5 ${name} syntax failed: ${e.message}`)}
}
const requireMarker=(src,marker,label)=>{if(!src.includes(marker))throw new Error(`V3.5.5 missing ${label}: ${marker}`)};

// SOS: resolver targets the SOS originator and stale SOS-only emergency is ignored/repaired.
requireMarker(command,"target=data.sos.find(x=>String(x.id)===String(id))",'SOS originator lookup');
requireMarker(command,".eq('user_id',targetId).eq('status','emergency').eq('note','SOS 已觸發')",'SOS originator status reset');
requireMarker(command,"row?.note==='SOS 已觸發'&&!data.sos.some",'stale SOS display guard');
requireMarker(runtime,"row.note!=='SOS 已觸發'",'stale SOS repair safety guard');

// Team marker: a unique v355team key reaches a wide directional pentagon with label/color.
requireMarker(html,"startsWith('v355team:')",'team marker type');
requireMarker(html,'M4 5H66L92 25 66 45H4Z','directional pentagon path');
requireMarker(html,'v355TeamMarkerLabel','team label inside marker');
requireMarker(runtime,'`v355team:${g.id}`','group shortcut unique map key');
requireMarker(runtime,'miniTeamSvg(g.color)','group shortcut colored preview');

// Brief location: draft bridge preserves both ordinary fields and equipment/vehicle drafts.
requireMarker(html,'captureBriefDraft:()=>({values:Object.fromEntries(briefIds.map','brief draft bridge');
requireMarker(html,'vehicles:vehicleDraft.map','vehicle draft preservation');
requireMarker(html,'equipment:equipmentDraft.map','equipment draft preservation');
requireMarker(runtime,'setTimeout(returnToBriefEditor,80)','automatic return after map point');
requireMarker(runtime,'restoreBriefDraft(saved)','brief draft restoration');

// Assignment update must not force-open a prompt already handled on mobile.
requireMarker(prompt,"if(isMine(a)&&ACTIVE.has(a.status)){current=a;renderPrompt(a,false)}",'assignment update de-duplication');
if(prompt.includes("if(isMine(a)&&ACTIVE.has(a.status)){current=a;renderPrompt(a,true)}"))throw new Error('V3.5.5 still force-opens assignment prompt on UPDATE');

// Automatic radar refresh must never enable a radar that is currently off.
requireMarker(usability,"radarRefreshTimer=setInterval(()=>{if(toggle.checked&&!radarPlaying)$('v35RadarNow')?.click()},5*60*1000)",'radar opt-in refresh');
if(usability.includes("radarRefreshTimer=setInterval(()=>{if(!radarPlaying)$('v35RadarNow')?.click()},5*60*1000)"))throw new Error('V3.5.5 still auto-refreshes radar while the toggle is off');

// Timeline export reads full DB pages and gives commander terminal actions semantic wording.
requireMarker(runtime,"if(actorCommander&&d.status==='completed')return '指揮官結案'",'commander close export wording');
requireMarker(runtime,"if(actorCommander&&d.status==='cancelled')return '指揮官取消任務'",'commander cancel export wording');
requireMarker(runtime,".range(from,from+pageSize-1)",'full timeline pagination');
requireMarker(runtime,"'詳細內容'",'detailed timeline column');
requireMarker(runtime,"window.__KTAK35_V355={version:'3.5.5'",'runtime version');
requireMarker(html,'./ktak-v35-maintenance-v355.js?v=3.5.5','runtime script tag');

console.log('V3.5.5 maintenance tests passed: SOS originator recovery, directional team marker, brief draft preservation, prompt de-duplication, radar opt-in refresh and detailed Timeline export are guarded.');

