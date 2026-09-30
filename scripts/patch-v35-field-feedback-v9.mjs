import fs from 'node:fs';

const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';
const runtimeSource='public/ktak-v35-field-v9.js';
const runtimeDist='dist/ktak-v35-field-v9.js';
let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

const replaceOnce=(text,needle,replacement,label)=>{
  if(!text.includes(needle)) throw new Error('V3.5 feedback-v9 missing: '+label);
  return text.replace(needle,replacement);
};

// Historical images exposed by the CWA South service are the large-area radar
// composition. The live O-A0058-003 layer is the smaller 118-124E / 20.5-26.5N
// product. Reusing the live bounds for history caused the visible displacement.
command=replaceOnce(
  command,
  "setRadarFrame:url=>{if(!core.map||!url)return false;const bounds=[[20.5,118.0],[26.5,124.0]];if(!radarLayer){radarLayer=L.imageOverlay(url,bounds,{opacity:.55,interactive:false,zIndex:350});radarLayer.addTo(core.map)}else radarLayer.setUrl(url);const t=$('v35RadarToggle');if(t&&!t.checked)t.checked=true;return true}",
  "setRadarFrame:(url,frameBounds)=>{if(!core.map||!url)return false;const fallback=[[20.5,118.0],[26.5,124.0]],bounds=Array.isArray(frameBounds)&&frameBounds.length===2?frameBounds:fallback;if(radarLayer){core.map.removeLayer(radarLayer);radarLayer=null}radarLayer=L.imageOverlay(url,bounds,{opacity:.55,interactive:false,zIndex:350});radarLayer.addTo(core.map);const t=$('v35RadarToggle');if(t&&!t.checked)t.checked=true;return true}",
  'radar frame bounds bridge'
);

usability=replaceOnce(
  usability,
  "window.__KTAK35?.setRadarFrame?.(f.url);",
  "window.__KTAK35?.setRadarFrame?.(f.url,f.bounds||[[17.75,115.0],[29.25,126.5]]);",
  'historical radar bounds'
);
usability=usability.replace('每格約 10 分鐘；播放官方歷史回波。','每格約 10 分鐘；歷史影像使用官方大範圍座標校正。');

fs.copyFileSync(runtimeSource,runtimeDist);
if(!html.includes('ktak-v35-field-v9.js')){
  const re=/(<script src="\.\/ktak-v35-usability\.js[^"]*"><\/script>)/;
  if(!re.test(html))throw new Error('V3.5 feedback-v9 missing: usability script tag');
  html=html.replace(re,'$1<script src="./ktak-v35-field-v9.js?v=35-feedback9"></script>');
}
html=html.replace('</style>','\n/* ktak-v35-field-feedback-v9 */\n</style>');

if(!command.includes('setRadarFrame:(url,frameBounds)'))throw new Error('V3.5 feedback-v9 radar bridge self-check failed');
if(!usability.includes('f.bounds||[[17.75,115.0],[29.25,126.5]]'))throw new Error('V3.5 feedback-v9 radar bounds self-check failed');
if(!html.includes('ktak-v35-field-v9.js')||!html.includes('ktak-v35-field-feedback-v9'))throw new Error('V3.5 feedback-v9 HTML self-check failed');
if(!fs.readFileSync(runtimeDist,'utf8').includes('ktak-v35-field-v9-runtime'))throw new Error('V3.5 feedback-v9 runtime self-check failed');

fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 feedback v9 applied: historical radar geobounds corrected, direct assignment action card/map shortcut enabled, sync badge moved to top, and tiny field text enlarged.');

// V10 runs after V9 so its mobile-only override wins over the V9 sync badge style.
await import('./patch-v35-entry-recovery-v10.mjs');

