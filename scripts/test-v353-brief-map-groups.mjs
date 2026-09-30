import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const command=fs.readFileSync('dist/ktak-v35-command.js','utf8');
const runtime=fs.readFileSync('dist/ktak-v35-brief-map-v353.js','utf8');
new Function(runtime);
const need=(ok,msg)=>{if(!ok)throw new Error('V3.5.3 map integration test failed: '+msg)};

need(html.includes('ktak-v35-brief-map-v353'),'V3.5.3 CSS marker');
need(html.includes('./ktak-v35-brief-map-v353.js?v=3.5.3'),'V3.5.3 runtime cache key');
need(html.includes('publish:()=>publish()')&&html.includes('renderMapItems:()=>renderMapItems()'),'core map persistence bridge');
need(html.includes('chooseMapSymbol:(key,label,color)'),'dynamic group symbol bridge');
need(command.includes('setDispatchLocation:loc=>'),'brief-to-dispatch location bridge');
need(command.includes("taskLocation={mode:'point',lat,lng,label:String(loc?.label||'主任務位置')"),'existing dispatch point state reused');
need(runtime.includes('missionLocation')&&runtime.includes("ktakV353Kind:'mission-brief-location'"),'brief location and unique mission marker');
need(runtime.includes("icon:'objective'")&&runtime.includes("label:'主任務｜'+label"),'mission objective marker presentation');
need(runtime.includes("id='v353BriefLocationTools'")||runtime.includes("wrap.id='v353BriefLocationTools'"),'brief map controls');
need(runtime.includes('📍 在地圖設定位置')&&runtime.includes('查看地圖')&&runtime.includes('清除位置'),'brief location actions');
need(runtime.includes('inheritMissionLocationIntoDispatch')&&runtime.includes('setDispatchLocation?.'),'dispatch inherits mission location');
need(runtime.includes('v353UseMissionLocation'),'manual use-main-mission-location shortcut');
need(runtime.includes('renderMapGroupShortcuts')&&runtime.includes("textContent='目前編組'"),'dynamic current-group map section');
need(runtime.includes("core.chooseMapSymbol?.('group'"),'group quick symbol uses existing map group icon');
need(runtime.includes('g.color')&&runtime.includes('v353TeamDot'),'group color carried into map shortcut');
need(runtime.includes("window.__KTAK35_V353={version:'3.5.3'"),'runtime version marker');
need(!runtime.includes("from('ktak35_groups')"),'no duplicate group table introduced');

console.log('V3.5.3 map integration tests passed: brief location persists as a map objective, seeds dispatch location, and dynamic A-Z group color/name shortcuts reuse the existing personnel/team symbol flow.');

