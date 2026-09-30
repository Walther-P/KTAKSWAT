import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

const startMarker = '$("leaveBtn").onclick=async()=>';
const endMarker = '\n\n/* navigation */';
const start = html.indexOf(startMarker);
const end = start >= 0 ? html.indexOf(endMarker, start) : -1;
if (start < 0 || end < 0) throw new Error('Unable to normalize leave-button marker');

const canonical = '$("leaveBtn").onclick=async()=>{try{await stopLocationSharing({removeRemote:true,silent:true});if(roomChannel&&sb)await sb.removeChannel(roomChannel)}catch{}sessionStorage.removeItem("ktak.v16.roomUuid");sessionStorage.removeItem("ktak.v16.room");location.reload()};';
html = html.slice(0, start) + canonical + html.slice(end);
fs.writeFileSync(file, html);
console.log('Normalized legacy full-UI markers for V3 injection.');

// Apply symbol/version refresh immediately after the legacy source is normalized.
await import('./inject-v3-version-and-symbols.mjs');
// Add the hidden owner console before subsequent V3 runtime patches are applied.
await import('./inject-v3-admin-console.mjs');
// Make the seven-tap hidden entry deterministic on desktop and mobile/PWA.
await import('./inject-v3-admin-trigger-fix.mjs');
// Make the admin overlay visible even if its backend client has not initialized yet.
await import('./inject-v3-admin-open-fix.mjs');

