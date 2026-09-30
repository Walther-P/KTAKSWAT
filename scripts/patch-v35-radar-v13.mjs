import fs from 'node:fs';
const htmlPath='dist/index.html';
const src='public/ktak-v35-radar-v13.js';
const dst='dist/ktak-v35-radar-v13.js';
let html=fs.readFileSync(htmlPath,'utf8');
fs.copyFileSync(src,dst);
if(!html.includes('ktak-v35-radar-v13.js')){
  const anchor=/<script src="\.\/ktak-v35-radar-warp-v12\.js[^"]*"><\/script>/;
  if(!anchor.test(html))throw new Error('V3.5 radar-v13 missing v12 runtime anchor');
  html=html.replace(anchor,m=>m+'<script src="./ktak-v35-radar-v13.js?v=35-radar13"></script>');
}
html=html.replace('</style>','\n/* ktak-v35-radar-v13 */\n</style>');
const runtime=fs.readFileSync(dst,'utf8');
for(const marker of ['ktak-v35-radar-v13','[[17.75,115.0],[29.25,126.5]]','STRIPS=48','stopImmediatePropagation','state===\'playing\''])if(!runtime.includes(marker))throw new Error('V3.5 radar-v13 runtime self-check failed: '+marker);
if(!html.includes('ktak-v35-radar-v13.js')||!html.includes('ktak-v35-radar-v13'))throw new Error('V3.5 radar-v13 HTML self-check failed');
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 radar v13 applied: large-area historical georeference, projection strips, independent playback controller, and stable pause/play UI.');

// V14 owns the final direct assignment action prompt shown to assignees.
await import('./patch-v35-assignment-prompt-v14.mjs');

