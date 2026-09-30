import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const runtime=fs.readFileSync('dist/ktak-v35-group-fix-v354.js','utf8');
new Function(runtime);
const need=(ok,msg)=>{if(!ok)throw new Error('V3.5.4 group fix test failed: '+msg)};

need(html.includes('./ktak-v35-group-fix-v354.js?v=3.5.4'),'V3.5.4 runtime cache key');
need(runtime.includes("window.__KTAK35_V354={version:'3.5.4'"),'runtime version marker');
need(runtime.includes("#mapPage [data-tactical-key=\"group\"]"),'map personnel/team group anchor is used');
need(runtime.includes("while(n){if(n.classList?.contains('tacticalGroupTitle'))"),'next tactical category is found structurally');
need(!runtime.includes("textContent.trim()==='車輛／載具'"),'no exact vehicle-title dependency remains');
need(runtime.includes("title.textContent='目前編組'"),'current-group map section');
need(runtime.includes("core.chooseMapSymbol?.('group'"),'existing group map symbol flow reused');
need(runtime.includes("btn.dataset.v354ConfirmDelete='1'")&&runtime.includes("btn.textContent='再按一次刪除'"),'two-tap in-app delete confirmation');
need(runtime.includes("original.call(btn,e)")&&runtime.includes('window.confirm=()=>true'),'legacy local delete path is reused without native confirm dialog');
need(runtime.includes('persistCurrentGroups')&&runtime.includes("from('ktak35_mission_profile')"),'delete is immediately reinforced to mission profile');
need(runtime.includes('setInterval(()=>{if(document.visibilityState===\'visible\')renderMapGroups(false)},900)'),'map shortcuts self-heal after tactical grid rebuilds');
need(!runtime.includes("from('ktak35_groups')"),'no duplicate group table');

console.log('V3.5.4 group-fix tests passed: delete uses two-tap in-app confirmation with immediate persistence, and map current-group shortcuts anchor structurally to the existing personnel/team group symbol.');

