import fs from 'node:fs';

const htmlPath='dist/index.html';
const source='public/ktak-v35-group-fix-v354.js';
const target='dist/ktak-v35-group-fix-v354.js';
let html=fs.readFileSync(htmlPath,'utf8');
if(!fs.existsSync(source))throw new Error('V3.5.4 group-fix runtime source missing');
const runtime=fs.readFileSync(source,'utf8');
new Function(runtime);
fs.copyFileSync(source,target);

const css=`
/* ktak-v35-group-fix-v354 */
#v352GroupCard .v352GroupHead button[data-v354-confirm-delete="1"]{border-color:#df6b6b!important;background:#5a1c22!important;color:#ffe6e6!important;min-width:88px}
`;
if(!html.includes('ktak-v35-group-fix-v354'))html=html.replace('</style>',css+'\n</style>');
if(!html.includes('./ktak-v35-group-fix-v354.js'))html=html.replace('</body>','<script src="./ktak-v35-group-fix-v354.js?v=3.5.4"></script>\n</body>');
else html=html.replace(/\.\/ktak-v35-group-fix-v354\.js(?:\?[^"']*)?/, './ktak-v35-group-fix-v354.js?v=3.5.4');

fs.writeFileSync(htmlPath,html);
await import('./test-v354-group-fix.mjs');
console.log('KTAK V3.5.4 group fix applied: delete is reliable without native confirm, and current groups are structurally injected into the map personnel/team tactical section.');

// V3.5.5 is the maintenance-only layer for the proven V3.5 UI.
await import('./patch-v355-maintenance.mjs');

