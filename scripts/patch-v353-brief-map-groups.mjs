import fs from 'node:fs';

const htmlPath='dist/index.html';
const commandPath='dist/ktak-v35-command.js';
const runtimeSource='public/ktak-v35-brief-map-v353.js';
const runtimeDist='dist/ktak-v35-brief-map-v353.js';
let html=fs.readFileSync(htmlPath,'utf8');
let command=fs.readFileSync(commandPath,'utf8');

const replaceOnce=(text,needle,replacement,label)=>{
  const count=text.split(needle).length-1;
  if(count!==1)throw new Error(`V3.5.3 expected one ${label}, got ${count}`);
  return text.replace(needle,replacement);
};

if(!fs.existsSync(runtimeSource))throw new Error('V3.5.3 runtime source missing');
const runtime=fs.readFileSync(runtimeSource,'utf8');
new Function(runtime);
fs.copyFileSync(runtimeSource,runtimeDist);

// Expose only the existing map actions needed by the V3.5.3 runtime. Anchor on
// the unique existing bridge method rather than surrounding whitespace/formatting.
const bridgeNeedle='renderMemberLocations:()=>renderMemberLocations()';
const bridgeReplacement="renderMemberLocations:()=>renderMemberLocations(),publish:()=>publish(),renderMapItems:()=>renderMapItems(),setMapTool:t=>setMapTool(t),chooseMapSymbol:(key,label,color)=>{if(color&&/^#[0-9a-f]{6}$/i.test(color))currentColor=color;chooseIcon(key,label)}";
html=replaceOnce(html,bridgeNeedle,bridgeReplacement,'core map bridge');

// Let the brief-to-dispatch integration seed the existing V7 task-location state
// instead of introducing a parallel dispatch-location implementation.
const exportNeedle="focusSector:id=>{const s=sectorById(id);if(s)focusSectorOnMap(s)}};";
const exportReplacement="setDispatchLocation:loc=>{const lat=Number(loc?.lat),lng=Number(loc?.lng);if(Number.isFinite(lat)&&Number.isFinite(lng))taskLocation={mode:'point',lat,lng,label:String(loc?.label||'主任務位置'),sectorId:null};else taskLocation={mode:'none',lat:null,lng:null,label:'',sectorId:null};taskLocationPicking=false;renderTaskLocationUi();return resolveTaskLocation()},focusSector:id=>{const s=sectorById(id);if(s)focusSectorOnMap(s)}};";
command=replaceOnce(command,exportNeedle,exportReplacement,'dispatch location bridge');

const css=`
/* ktak-v35-brief-map-v353 */
.v353BriefLocationTools{margin-top:8px;padding:8px;border:1px solid #334d59;border-radius:10px;background:#0d171c;display:grid;gap:6px}.v353BriefLocationActions{display:flex;gap:6px;flex-wrap:wrap}.v353BriefLocationActions button{width:auto!important;font-size:10px!important;padding:6px 8px!important}.v353BriefLocationTools .muted{font-size:10px!important;line-height:1.45!important}
.v353MapGroupTitle{color:#c2d7e0!important;border-bottom-style:dashed!important}.v353MapGroupPick{border-left:4px solid var(--team-color)!important;position:relative}.v353MapGroupPick>span{min-width:0;display:grid;gap:2px;text-align:left}.v353MapGroupPick b{font-size:10px;white-space:normal;line-height:1.25}.v353MapGroupPick small{display:flex;align-items:center;gap:4px;color:#93aab4;font-size:8px}.v353TeamDot{width:8px;height:8px;border-radius:50%;background:var(--team-color);display:inline-block;box-shadow:0 0 5px color-mix(in srgb,var(--team-color) 65%,transparent)}.v353GroupEmoji{font-size:22px;line-height:1}
#v353UseMissionLocation{width:100%!important;margin-bottom:6px!important;border-color:#5e7b31!important;background:#1d351b!important;color:#ddf4be!important}
@media(max-width:820px){.v353BriefLocationActions{display:grid;grid-template-columns:1fr 1fr}.v353BriefLocationActions button{width:100%!important}}
`;
html=html.replace('</style>',css+'\n</style>');
if(!html.includes('./ktak-v35-brief-map-v353.js'))html=html.replace('</body>','<script src="./ktak-v35-brief-map-v353.js?v=3.5.3"></script>\n</body>');
else html=html.replace(/\.\/ktak-v35-brief-map-v353\.js(?:\?[^"']*)?/, './ktak-v35-brief-map-v353.js?v=3.5.3');

fs.writeFileSync(htmlPath,html);
fs.writeFileSync(commandPath,command);

await import('./test-v353-brief-map-groups.mjs');
await import('./patch-v354-group-fix.mjs');
console.log('KTAK V3.5.3 map integration applied: brief location creates a shared mission marker and seeds dispatch location; A-Z group name/color shortcuts are mirrored into map personnel/team tools.');

