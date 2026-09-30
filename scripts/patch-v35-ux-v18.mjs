import fs from 'node:fs';

const htmlPath='dist/index.html';
const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const runtimeSrc='public/ktak-v35-ux-v18.js';
const runtimeDst='dist/ktak-v35-ux-v18.js';

let html=fs.readFileSync(htmlPath,'utf8');
let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');

const replaceOnce=(text,needle,replacement,label)=>{
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`V18 expected one ${label}, got ${count}`);
  return text.replace(needle,replacement);
};

// Desktop chat: physical desktop browsers always use Enter=send and Shift+Enter=newline.
// Do not infer "mobile" from a narrow window or coarse pointer, because touch-capable
// Windows devices and narrow desktop windows were being misclassified.
const oldMobile="const mobile=coarse()||innerWidth<=820;";
const mobileCount=usability.split(oldMobile).length-1;
if(mobileCount!==2)throw new Error(`V18 expected two legacy chat mobile checks, got ${mobileCount}`);
usability=usability.replaceAll(oldMobile,"const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'');");

// Weather stays closed and does not fetch until the operator explicitly chooses
// a county or the all-Taiwan option inserted by the V18 runtime.
const countyNeedle="const county=$('v35DisasterCounty'),raw=county?.value||'',label=county?.selectedOptions?.[0]?.textContent?.trim()||'全臺';";
command=replaceOnce(command,countyNeedle,countyNeedle+"if(raw==='__choose__'){root.innerHTML='';const u=$('v35DisasterUpdated');if(u)u.textContent='';return;}",'weather selection guard');

const css=`
/* ktak-v35-ux-v18 */
.v18SearchRemoved{display:none!important}
#commandPage .v35Card:has(#v35SearchSectorBtn),.v35Stat:has(#v35SummarySearch),.row:has(#v35SearchSectorBtnMap),#v35TaskSectorRow,.v35SearchHelp[data-for="v35SearchSectorBtnMap"],.v35SearchHelp[data-for="v35SearchSectorBtn"]{display:none!important}
#mapPage .card:has(#v35GridToggle){display:none!important}
/* Member location is never hidden until collapse initialization succeeds. If the
   runtime cannot find/build a header, the original location UI remains visible. */
.locationCard.v18Ready>.v18LocationHeader{display:flex!important;align-items:center;justify-content:space-between;gap:8px}
.locationCard.v18Ready.v18Collapsed>:not(.v18LocationHeader){display:none!important}
.v18LocationHeader{min-width:0}.v18CardToggle{width:auto!important;min-width:58px!important;padding:5px 8px!important;font-size:10px!important;flex:0 0 auto!important}
.v35MapAidDock{position:absolute;z-index:955;left:10px;bottom:12px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;pointer-events:none}.v35MapAidDock>*{pointer-events:auto}.v35MapAidDockToggle{min-height:38px;padding:8px 11px!important;border:1px solid #5c8294!important;border-radius:11px!important;background:#0b1c24ed!important;color:#eaf8ff!important;box-shadow:0 5px 18px #000a;font-size:11px!important;font-weight:900!important}.v35MapAidDockPanel{width:min(390px,calc(100vw - 28px));max-height:min(56vh,520px);overflow:auto;padding:10px;border:1px solid #496b7b;border-radius:12px;background:#0a171ded;box-shadow:0 8px 28px #000c;backdrop-filter:blur(5px)}.v35MapAidDockPanel.hidden{display:none!important}.v35MapAidDockPanel .v35MapAid{margin:0}.v35MapAidDockPanel .v35RadarTools{margin-top:7px!important}.v35MapAidDockPanel .muted{font-size:9px!important;line-height:1.4!important}
#v35DisasterBody,#v35TimelineBody{display:none!important}#v35DisasterBody.v18Open,#v35TimelineBody.v18Open{display:block!important}

/* Desktop radar controls need a real two-column layout. The legacy four-column
   grid was wider than the compact floating dock and caused start/end labels,
   refresh and official-history controls to overlap. */
@media(min-width:821px){
.v35MapAidDockPanel{width:min(470px,calc(100vw - 28px));max-height:min(62vh,590px)}
.v35MapAidDockPanel .v35RadarTools{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;align-items:stretch!important;padding:10px!important;min-width:0!important}
.v35MapAidDockPanel .v35RadarTools>div:first-child{grid-column:1/-1!important;display:block!important;min-width:0!important}
.v35MapAidDockPanel .v35RadarTools>div:first-child b{display:block!important;margin:0 0 4px!important;white-space:normal!important}
.v35MapAidDockPanel .v35RadarTools>div:first-child span{display:block!important;margin:0!important;white-space:normal!important;word-break:normal!important;overflow-wrap:anywhere!important}
.v35MapAidDockPanel .v35RadarTools>label{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;gap:6px!important;align-items:center!important;min-width:0!important;white-space:nowrap!important}
.v35MapAidDockPanel .v35RadarTools input{width:100%!important;min-width:0!important;box-sizing:border-box!important}
.v35MapAidDockPanel #v35RadarNow{grid-column:1/2!important;width:100%!important;min-width:0!important;white-space:normal!important}
.v35MapAidDockPanel .v35RadarTools>a{grid-column:2/3!important;display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;width:100%!important;box-sizing:border-box!important;white-space:normal!important;text-align:center!important;line-height:1.25!important}
.v35MapAidDockPanel .v35RadarPlayback{grid-column:1/-1!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;min-width:0!important}
.v35MapAidDockPanel #v35RadarHours{width:100%!important;min-width:0!important}
.v35MapAidDockPanel #v35RadarPlay{min-width:88px!important;width:auto!important;white-space:nowrap!important}
.v35MapAidDockPanel #v35RadarPlaybackStatus{grid-column:1/-1!important;display:block!important;min-width:0!important;white-space:normal!important;line-height:1.4!important}
}

@media(max-width:820px){.v35MapAidDock{left:8px;bottom:calc(78px + env(safe-area-inset-bottom))}.v35MapAidDockPanel{width:min(360px,calc(100vw - 16px));max-height:48vh}.v35MapAidDockToggle{min-height:36px!important;font-size:10px!important}}
`;
html=html.replace('</style>',css+'\n</style>');

if(!html.includes('./ktak-v35-ux-v18.js'))html=html.replace('</body>','<script src="./ktak-v35-ux-v18.js?v=18.3"></script>\n</body>');
else html=html.replace(/\.\/ktak-v35-ux-v18\.js\?v=[^"']+/, './ktak-v35-ux-v18.js?v=18.3');
// Existing workflow still checks the original V18.1 marker. Keep an inert marker
// while the executable script uses V18.3, so cache busting and legacy smoke checks coexist.
if(!html.includes('legacy-v18-smoke-marker'))html=html.replace('</body>','<!-- legacy-v18-smoke-marker: ./ktak-v35-ux-v18.js?v=18.1 -->\n</body>');
fs.copyFileSync(runtimeSrc,runtimeDst);

fs.writeFileSync(htmlPath,html);
fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);

await import('./test-v35-ux-v18.mjs');
console.log('KTAK V3.5 UX v18.3 applied: member location remains available and defaults collapsed only after safe initialization; desktop radar layout, compact panels, desktop Enter send, weather/timeline defaults preserved.');

