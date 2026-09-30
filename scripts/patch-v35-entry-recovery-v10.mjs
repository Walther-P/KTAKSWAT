import fs from 'node:fs';
const htmlPath='dist/index.html';
const src='public/ktak-v35-entry-v10.js';
const dst='dist/ktak-v35-entry-v10.js';
let html=fs.readFileSync(htmlPath,'utf8');
fs.copyFileSync(src,dst);
if(!html.includes('ktak-v35-entry-v10.js')){
  const anchor=/<script src="\.\/ktak-v35-field-v9\.js[^"]*"><\/script>/;
  if(!anchor.test(html))throw new Error('V3.5 v10 missing v9 runtime anchor');
  html=html.replace(anchor,m=>m+'<script src="./ktak-v35-entry-v10.js?v=35-entry10"></script>');
}
html=html.replace('</style>','\n/* ktak-v35-entry-recovery-v10 */\n</style>');
if(!html.includes('ktak-v35-entry-v10.js')||!fs.readFileSync(dst,'utf8').includes('ktak-v35-entry-v10'))throw new Error('V3.5 v10 self-check failed');
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 entry recovery v10 applied: mobile sync badge hidden.');

// V11 owns final radar playback georeferencing and frame switching behavior.
await import('./patch-v35-radar-v11.mjs');

