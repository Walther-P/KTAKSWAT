import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const prompt=fs.readFileSync('dist/ktak-v35-assignment-prompt-v14.js','utf8');
const runtime=fs.readFileSync('dist/ktak-v35-hotfix-v356.js','utf8');
for(const [name,src] of [['prompt',prompt],['runtime',runtime]]){try{new Function(src)}catch(e){throw new Error(`V3.5.6 ${name} syntax failed: ${e.message}`)}}
const need=(src,marker,label)=>{if(!src.includes(marker))throw new Error(`V3.5.6 missing ${label}: ${marker}`)};

// Team marker readability and fast drag path.
need(html,'.v355TeamMarkerShape path{fill-opacity:1!important}','opaque team marker');
need(html,'.v355TeamMarkerLabel{opacity:1!important','opaque team label');
need(html,'background:rgba(3,8,11,.9)!important','high-contrast team label background');
need(html,"const teamFast=String(item.icon||'').startsWith('v355team:')",'team drag fast-path detector');
need(html,'if(teamFast)layer.setLatLng([item.lat,item.lng]);else updateLeafletLayer(layer,item)','team drag latlng-only update');
need(html,'if(selectedMapId===item.id&&!teamFast)renderMapSelection()','team drag avoids selection rebuild');

// Full-screen assignment prompt becomes one-shot NEW-task notification.
need(prompt,'function promptSeenStorageKey()','persistent seen-state helper');
need(prompt,"if(!force&&a.status!=='pending')return",'accepted/active auto-popup block');
need(prompt,'wasPromptSeen(a)||key===lastShownKey','seen pending suppression');
need(prompt,"if(!force)markPromptSeen(a)",'mark pending as seen on first automatic display');
need(prompt,"$('v35AssignmentPrompt14Later').onclick=()=>hidePrompt(current)",'later button remembers dismissal');
need(prompt,"if(out.queued){hidePrompt(a);",'queued response does not leave recurring popup');
need(prompt,'if(current)markPromptSeen(current);','accepted/active state remembered after action');
need(prompt,"revision:'14.2-v356'",'prompt revision marker');
need(prompt,"renderPrompt(a,false)})\n  .on('postgres_changes',{event:'UPDATE'",'INSERT no-force popup');
if(prompt.includes("renderPrompt(current,true)"))throw new Error('V3.5.6 still force-opens accepted/active prompt after user action');

need(html,'./ktak-v35-assignment-prompt-v14.js?v=35-assignment14-v356','prompt cache bust');
need(html,'./ktak-v35-hotfix-v356.js?v=3.5.6','V3.5.6 runtime tag');
need(runtime,"window.__KTAK35_V356={version:'3.5.6'",'V3.5.6 runtime marker');
need(runtime,"return status==='pending'&&!seen",'one-shot prompt pure rule');

console.log('V3.5.6 hotfix tests passed: team labels are opaque/high-contrast, team drag avoids icon rebuilds, and assignment full-screen prompts are one-shot pending notifications only.');

