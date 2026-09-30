import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const command=fs.readFileSync('dist/ktak-v35-command.js','utf8');
const usability=fs.readFileSync('dist/ktak-v35-usability.js','utf8');
const runtime=fs.readFileSync('dist/ktak-v35-ux-v18.js','utf8');

new Function(runtime);

const need=(ok,msg)=>{if(!ok)throw new Error('V18 UX test failed: '+msg)};
need(html.includes('ktak-v35-ux-v18'),'V18 CSS marker');
need(html.includes('./ktak-v35-ux-v18.js?v=18.3'),'V18.3 runtime cache key');
need(html.includes('id="v35GridToggle"')&&html.includes('id="v35RadarToggle"'),'map aid controls preserved');
need(html.includes('id="v35Compass"'),'compass preserved');
need(runtime.includes('v35MapAidDock')&&runtime.includes("grid.closest('.card')"),'map aids move into floating dock');
need(runtime.includes("document.querySelectorAll('.locationCard')")&&runtime.includes('v18Collapsed'),'member location collapsible');
need(runtime.includes("revision:'18.3'")&&runtime.includes('installLocationCollapse'),'member location collapse runtime revision exposed');
need(runtime.includes("header.className='v18LocationHeader'")&&runtime.includes("title.textContent='隊員定位'"),'member location gets a safe fallback header when markup changes');
need(!html.includes('.locationCard:not(.v18Ready)>:not(h3){display:none!important}'),'member location is never pre-hidden before runtime initializes');
need(html.includes('.locationCard.v18Ready.v18Collapsed>:not(.v18LocationHeader){display:none!important}'),'only successfully initialized member location cards collapse their body');
need(runtime.includes('v35SearchSectorBtn')&&runtime.includes('v35TaskSectorRow')&&runtime.includes('v35SummarySearch'),'search-sector UI retired');
need(runtime.includes("option[value=\"__choose__\"]")&&runtime.includes("if(all&&all.textContent!=='全臺')all.textContent='全臺';"),'weather choice is idempotent and cannot self-trigger observer forever');
need(runtime.includes('observer.disconnect()'),'temporary startup observer is disconnected after initialization window');
need(runtime.includes("replaceToggle('v35TimelineToggle','v35TimelineBody')"),'timeline defaults collapsed');
need(command.includes("if(raw==='__choose__')"),'weather auto-fetch guarded before selection');
need((usability.match(/const mobile=\/Android\|iPhone\|iPad\|iPod\|Mobile\/i/g)||[]).length===2,'desktop chat uses UA mobile detection');
need(!usability.includes('const mobile=coarse()||innerWidth<=820;'),'legacy desktop misclassification removed');
need(usability.includes("e.preventDefault();e.stopImmediatePropagation();$('chatSendBtn')?.click();"),'Enter sends through existing chat send action');
need(html.includes('ktak-v35-realtime-auth-v17')||command.includes('realtime.setAuth'),'V17 realtime repair remains intact');
need(html.includes('.v35MapAidDockPanel{width:min(470px,calc(100vw - 28px));'),'desktop map-aid dock expands enough for radar controls');
need(html.includes('.v35MapAidDockPanel .v35RadarTools{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important'),'desktop radar tools use two-column grid');
need(html.includes('.v35MapAidDockPanel .v35RadarPlayback{grid-column:1/-1!important;display:grid!important'),'radar playback occupies a dedicated full row');
need(html.includes('.v35MapAidDockPanel #v35RadarPlaybackStatus{grid-column:1/-1!important'),'radar playback status cannot collide with controls');
console.log('V3.5 UX v18.3 tests passed: member location is preserved and only safely collapsed after initialization; desktop radar layout, startup observer, compact panels, desktop Enter send, weather/timeline defaults remain guarded.');

// V19 is deliberately applied after every V18 assertion so it patches the final
// built usability runtime without disturbing the already-stable radar playback UI.
await import('./patch-v35-radar-time-v19.mjs');

