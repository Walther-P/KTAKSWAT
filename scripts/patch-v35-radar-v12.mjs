import fs from 'node:fs';
const htmlPath='dist/index.html';
const src='public/ktak-v35-radar-warp-v12.js';
const dst='dist/ktak-v35-radar-warp-v12.js';
let html=fs.readFileSync(htmlPath,'utf8');
fs.copyFileSync(src,dst);
if(!html.includes('ktak-v35-radar-warp-v12.js')){
  const anchor=/<script src="\.\/ktak-v35-entry-v10\.js[^"]*"><\/script>/;
  if(!anchor.test(html))throw new Error('V3.5 radar-v12 missing v10 runtime anchor');
  html=html.replace(anchor,m=>m+'<script src="./ktak-v35-radar-warp-v12.js?v=35-radar12"></script>');
}
html=html.replace('</style>','\n/* ktak-v35-radar-warp-v12 */\n</style>');
const runtime=fs.readFileSync(dst,'utf8');
if(!runtime.includes('ktak-v35-radar-warp-v12')||!runtime.includes('STRIPS=36')||!runtime.includes("api.setRadarFrame=(url,_frameBounds)=>showWarp(url)"))throw new Error('V3.5 radar-v12 runtime self-check failed');
if(!html.includes('ktak-v35-radar-warp-v12.js')||!html.includes('ktak-v35-radar-warp-v12'))throw new Error('V3.5 radar-v12 HTML self-check failed');
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 radar v12 applied: latitude-linear CWA radar frames are piecewise warped into Leaflet Web Mercator so zoomed alignment stays stable.');

// V13 supersedes V12 georeference/playback at runtime and owns the final controller.
await import('./patch-v35-radar-v13.mjs');

