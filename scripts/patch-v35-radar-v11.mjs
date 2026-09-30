import fs from 'node:fs';

const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';
let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

const replaceOnce=(text,needle,replacement,label)=>{
  if(!text.includes(needle))throw new Error('V3.5 radar-v11 missing: '+label);
  return text.replace(needle,replacement);
};
const replaceRegex=(text,re,replacement,label)=>{
  if(!re.test(text))throw new Error('V3.5 radar-v11 missing: '+label);
  re.lastIndex=0;
  return text.replace(re,replacement);
};

// Historical radar_echo frames are the same Taiwan-near product used by the
// live layer. Keep one Leaflet ImageOverlay alive and update its URL/bounds in
// place. V9 removed/recreated the layer every frame, which caused visible flash.
command=replaceOnce(
  command,
  "setRadarFrame:(url,frameBounds)=>{if(!core.map||!url)return false;const fallback=[[20.5,118.0],[26.5,124.0]],bounds=Array.isArray(frameBounds)&&frameBounds.length===2?frameBounds:fallback;if(radarLayer){core.map.removeLayer(radarLayer);radarLayer=null}radarLayer=L.imageOverlay(url,bounds,{opacity:.55,interactive:false,zIndex:350});radarLayer.addTo(core.map);const t=$('v35RadarToggle');if(t&&!t.checked)t.checked=true;return true}",
  "setRadarFrame:(url,frameBounds)=>{if(!core.map||!url)return false;const fallback=[[20.5,118.0],[26.5,124.0]],bounds=Array.isArray(frameBounds)&&frameBounds.length===2?frameBounds:fallback;if(!radarLayer){radarLayer=L.imageOverlay(url,bounds,{opacity:.55,interactive:false,zIndex:350});radarLayer.addTo(core.map)}else{if(typeof radarLayer.setBounds==='function')radarLayer.setBounds(bounds);radarLayer.setUrl(url);if(!core.map.hasLayer(radarLayer))radarLayer.addTo(core.map)}const t=$('v35RadarToggle');if(t&&!t.checked)t.checked=true;return true}",
  'persistent radar overlay'
);

usability=replaceOnce(
  usability,
  "window.__KTAK35?.setRadarFrame?.(f.url,f.bounds||[[17.75,115.0],[29.25,126.5]]);",
  "window.__KTAK35?.setRadarFrame?.(f.url,[[20.5,118.0],[26.5,124.0]]);",
  'near-product playback bounds'
);

usability=replaceOnce(
  usability,
  "let radarPlayTimer=null,radarFrames=[],radarFrameIndex=0,radarPlaying=false;",
  "let radarPlayTimer=null,radarFrames=[],radarFrameIndex=0,radarPlaying=false,radarDisplayToken=0;const radarPreloads=new Map();function preloadRadarFrame(f){if(!f?.url)return null;let img=radarPreloads.get(f.url);if(img)return img;img=new Image();img.decoding='async';img.src=f.url;radarPreloads.set(f.url,img);return img}",
  'radar preload state'
);

usability=replaceOnce(
  usability,
  "function stopRadarPlayback(restoreLatest=false){if(radarPlayTimer)clearInterval(radarPlayTimer);radarPlayTimer=null;radarPlaying=false;const b=$('v35RadarPlay');if(b)b.textContent='▶ 播放';if(restoreLatest)window.__KTAK35?.showLatestRadar?.()}",
  "function stopRadarPlayback(restoreLatest=false){if(radarPlayTimer)clearInterval(radarPlayTimer);radarPlayTimer=null;radarPlaying=false;radarDisplayToken++;const b=$('v35RadarPlay');if(b)b.textContent='▶ 播放';if(restoreLatest)window.__KTAK35?.showLatestRadar?.()}",
  'stop invalidates pending frame'
);

usability=replaceRegex(
  usability,
  /function showRadarFrame\(i\)\{[\s\S]*?\}\nasync function loadRadarPlayback/,
  `function showRadarFrame(i){if(!radarFrames.length)return;radarFrameIndex=(i+radarFrames.length)%radarFrames.length;const f=radarFrames[radarFrameIndex],token=++radarDisplayToken,img=preloadRadarFrame(f);const apply=()=>{if(token!==radarDisplayToken)return;window.__KTAK35?.setRadarFrame?.(f.url,[[20.5,118.0],[26.5,124.0]]);const s=$('v35RadarPlaybackStatus');if(s)s.textContent=(f.time||'雷達影像')+' · '+(radarFrameIndex+1)+'/'+radarFrames.length;for(let n=1;n<=4;n++)preloadRadarFrame(radarFrames[(radarFrameIndex+n)%radarFrames.length])};if(img?.complete&&img.naturalWidth)apply();else if(img){img.onload=apply;img.onerror=()=>{if(token===radarDisplayToken){const s=$('v35RadarPlaybackStatus');if(s)s.textContent='這一格雷達影像載入失敗，繼續下一格'}}}else apply()}
async function loadRadarPlayback`,
  'preloaded frame switch'
);

usability=replaceOnce(
  usability,
  "radarFrames=frames;radarFrameIndex=0;showRadarFrame(0);return true",
  "radarFrames=frames;radarFrameIndex=0;frames.slice(0,Math.min(10,frames.length)).forEach(preloadRadarFrame);showRadarFrame(0);return true",
  'initial frame preloads'
);

usability=replaceOnce(
  usability,
  "radarPlayTimer=setInterval(()=>showRadarFrame(radarFrameIndex+1),700)",
  "radarPlayTimer=setInterval(()=>showRadarFrame(radarFrameIndex+1),900)",
  'smoother playback cadence'
);

usability=usability.replace('歷史影像使用官方大範圍座標校正。','歷史影像使用臺灣鄰近回波座標校正，並預載下一幀減少閃爍。');
html=html.replace('</style>','\n/* ktak-v35-radar-v11 */\n</style>');

if(!command.includes("radarLayer.setUrl(url)")||command.includes("core.map.removeLayer(radarLayer);radarLayer=null}radarLayer=L.imageOverlay(url,bounds"))throw new Error('V3.5 radar-v11 persistent layer self-check failed');
if(!usability.includes('const radarPreloads=new Map()')||!usability.includes("[[20.5,118.0],[26.5,124.0]]")||!usability.includes('setInterval(()=>showRadarFrame(radarFrameIndex+1),900)'))throw new Error('V3.5 radar-v11 playback self-check failed');
if(!html.includes('ktak-v35-radar-v11'))throw new Error('V3.5 radar-v11 HTML self-check failed');

fs.writeFileSync(commandPath,command);
fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 radar v11 applied: Taiwan-near georeference restored, persistent overlay used, and frames preloaded to remove flashing.');

// V12 corrects the projection itself: CWA source pixels are latitude-linear,
// while Leaflet renders in Web Mercator. Piecewise latitude strips keep the
// historical layer registered to the basemap at every zoom level.
await import('./patch-v35-radar-v12.mjs');

