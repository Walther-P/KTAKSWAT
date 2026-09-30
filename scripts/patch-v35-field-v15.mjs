import fs from 'node:fs';
const htmlPath='dist/index.html';
const src='public/ktak-v35-field-v15.js';
const dst='dist/ktak-v35-field-v15.js';
let html=fs.readFileSync(htmlPath,'utf8');
fs.copyFileSync(src,dst);
if(!html.includes('ktak-v35-field-v15.js')){
  const anchor=/<script src="\.\/ktak-v35-assignment-prompt-v14\.js[^"]*"><\/script>/;
  if(!anchor.test(html))throw new Error('V3.5 field-v15 missing assignment v14 anchor');
  html=html.replace(anchor,m=>m+'<script src="./ktak-v35-field-v15.js?v=35-field15"></script>');
}
html=html.replace('</style>','\n/* ktak-v35-field-v15 */\n</style>');
const runtime=fs.readFileSync(dst,'utf8');
for(const marker of ['ktak-v35-field-v15','v35SosPrompt15','🚨 前往支援並定位','showCurrentTaskDetails','orientation:landscape'])if(!runtime.includes(marker))throw new Error('V3.5 field-v15 runtime self-check failed: '+marker);
if(!html.includes('ktak-v35-field-v15.js')||!html.includes('ktak-v35-field-v15'))throw new Error('V3.5 field-v15 HTML self-check failed');
fs.writeFileSync(htmlPath,html);
await import('./test-v35-field-v15.mjs');
console.log('KTAK V3.5 field v15 applied: assignment navigation closes correctly, task chip opens details, landscape compass avoids tools, and SOS gets priority full-screen prompt.');

// V16 hardens the shared room/map synchronization after all V3.5 feature channels exist.
await import('./patch-v35-realtime-sync-v16.mjs');

