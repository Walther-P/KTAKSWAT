import fs from 'node:fs';
const htmlPath='dist/index.html';
const src='public/ktak-v35-assignment-prompt-v14.js';
const dst='dist/ktak-v35-assignment-prompt-v14.js';
let html=fs.readFileSync(htmlPath,'utf8');
fs.copyFileSync(src,dst);
if(!html.includes('ktak-v35-assignment-prompt-v14.js')){
  const anchor=/<script src="\.\/ktak-v35-radar-v13\.js[^"]*"><\/script>/;
  if(!anchor.test(html))throw new Error('V3.5 assignment-prompt-v14 missing radar v13 anchor');
  html=html.replace(anchor,m=>m+'<script src="./ktak-v35-assignment-prompt-v14.js?v=35-assignment14"></script>');
}
html=html.replace('</style>','\n/* ktak-v35-assignment-prompt-v14 */\n</style>');
const runtime=fs.readFileSync(dst,'utf8');
for(const marker of ['ktak-v35-assignment-prompt-v14','✅ 接受並開始執行','▶ 開始執行','postgres_changes','v35AssignmentPrompt14'])if(!runtime.includes(marker))throw new Error('V3.5 assignment-prompt-v14 runtime self-check failed: '+marker);
if(!html.includes('ktak-v35-assignment-prompt-v14.js')||!html.includes('ktak-v35-assignment-prompt-v14'))throw new Error('V3.5 assignment-prompt-v14 HTML self-check failed');
fs.writeFileSync(htmlPath,html);
await import('./test-v35-assignment-prompt-v14.mjs');
console.log('KTAK V3.5 assignment prompt v14 applied: realtime direct-action assignment card with accept/start/map/complete controls.');

// V15 owns the final field UX layer: task-map details, landscape avoidance and SOS priority prompt.
await import('./patch-v35-field-v15.mjs');

