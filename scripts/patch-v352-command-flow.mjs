import fs from 'node:fs';

const htmlPath='dist/index.html';
const runtimeSource='public/ktak-v35-flow-v352.js';
const runtimeDist='dist/ktak-v35-flow-v352.js';
let html=fs.readFileSync(htmlPath,'utf8');

if(!fs.existsSync(runtimeSource))throw new Error('V3.5.2 runtime source missing');
const runtime=fs.readFileSync(runtimeSource,'utf8');
new Function(runtime);
fs.copyFileSync(runtimeSource,runtimeDist);

const css=`
/* ktak-v35-flow-v352 */
/* Healthy sync is intentionally silent. Offline/pending delivery still appears. */
.v35OfflineBanner:not(.offline):not(.pending){display:none!important}

.v35MissionPrimary{border:1px solid #3e687b;background:linear-gradient(135deg,#102832,#0e1f26);border-radius:13px;padding:11px;display:grid;gap:6px}
.v352MissionHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.v352MissionHead small{display:block;font-size:9px;color:#8fb8ca;font-weight:800;margin-bottom:2px}.v352MissionHead h3{font-size:15px;margin:0;color:#edf8fc}.v352MissionHead>span{font-size:9px;color:#a7c9d8;border:1px solid #365c6d;border-radius:999px;padding:4px 7px;white-space:nowrap}.v352MissionMeta{font-size:10px;color:#b8cbd4;line-height:1.45}.v352MissionSummary{font-size:11px;color:#e0edf2;line-height:1.5;white-space:pre-wrap}.v352MissionActions{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}.v352MissionActions button{font-size:10px;padding:6px 8px}

/* Mission mode is a tool preset. Legacy duplicate mission-description fields stay hidden. */
#commandPage .v35ModeFields{display:none!important}.v35MissionModePanel{margin-top:8px}.v35ModePanelTitle{font-size:10px!important;color:#a8c9d7!important;margin-bottom:6px!important}.v35QuickTasks{margin-top:0!important}

#v352DispatchForm{display:grid;gap:9px}.v352Field{display:grid;gap:4px}.v352Optional{border:1px solid #2c4653;border-radius:10px;padding:8px;background:#0c161b}.v352Optional summary{cursor:pointer;font-size:10px;font-weight:850;color:#b8ced8;user-select:none}.v352Optional[open] summary{margin-bottom:7px}.v352GroupShortcuts{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 5px}.v352GroupChip{width:auto!important;padding:6px 9px!important;font-size:10px!important;border-left:4px solid var(--team-color)!important;background:#0c171c!important}.v352GroupChip.selected{outline:2px solid var(--team-color);outline-offset:1px;background:#13252d!important}.v352GroupChip:disabled{opacity:.45}

.v352Groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}.v352GroupBox{border:1px solid #35505d;border-left:4px solid var(--team-color);border-radius:11px;padding:8px;background:#0c171c;min-width:0}.v352GroupHead{display:grid;grid-template-columns:68px minmax(0,1fr) 44px auto;gap:6px;align-items:center}.v352GroupHead select,.v352GroupHead input,.v352GroupHead button{min-width:0}.v352GroupHead input[type=color]{width:44px!important;height:38px!important;padding:3px!important}.v352GroupHead .danger{padding:7px 8px!important;font-size:9px!important}.v352LeaderRow{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:center;margin-top:7px;font-size:10px;color:#a8bbc4}.v352GroupMembers{margin-top:7px}.v352Unassigned{grid-column:1/-1;border:1px dashed #39515d;border-radius:10px;padding:8px;background:#0d171c;display:flex;gap:8px;align-items:flex-start;font-size:10px}.v352Unassigned b{white-space:nowrap;color:#c7dce5}.v352Unassigned span{color:#93aab4;line-height:1.45}

.v352AssignmentArchive{margin-top:9px;border-top:1px solid #2b414c;padding-top:8px}.v352AssignmentArchive.hidden{display:none!important}.v352AssignmentArchive>summary{cursor:pointer;font-size:10px;font-weight:850;color:#9fb8c4;padding:7px 2px;user-select:none}.v352AssignmentArchive .v35Task{opacity:.78}.v352AssignmentArchive .v35TaskBody{max-height:90px;overflow:auto}

@media(max-width:820px){.v352MissionHead{flex-direction:column;gap:5px}.v352MissionHead>span{white-space:normal}.v352Groups{grid-template-columns:1fr}.v352GroupHead{grid-template-columns:60px minmax(0,1fr) 42px auto}.v352MissionActions button{flex:1}.v352Unassigned{display:grid;gap:4px}}
`;

if(!html.includes('ktak-v35-flow-v352'))html=html.replace('</style>',css+'\n</style>');
if(!html.includes('./ktak-v35-flow-v352.js'))html=html.replace('</body>','<script src="./ktak-v35-flow-v352.js?v=3.5.2"></script>\n</body>');
else html=html.replace(/\.\/ktak-v35-flow-v352\.js(?:\?[^"']*)?/, './ktak-v35-flow-v352.js?v=3.5.2');

if(!html.includes('.v35OfflineBanner:not(.offline):not(.pending){display:none!important}'))throw new Error('V3.5.2 healthy-network badge rule missing');
if(!html.includes('#commandPage .v35ModeFields{display:none!important}'))throw new Error('V3.5.2 tool-preset mode rule missing');
if(!html.includes('./ktak-v35-flow-v352.js?v=3.5.2'))throw new Error('V3.5.2 runtime tag missing');
if(!runtime.includes("window.__KTAK35_V352={version:'3.5.2'"))throw new Error('V3.5.2 runtime marker missing');

fs.writeFileSync(htmlPath,html);
await import('./test-v352-command-flow.mjs');
console.log('KTAK V3.5.2 command flow applied: mission brief is primary, completed dispatches archive, mission mode becomes tool presets, dispatch is simplified, brief-to-dispatch and A-Z grouping are enabled, and healthy network status is silent.');

