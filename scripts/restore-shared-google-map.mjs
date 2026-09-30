import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceRequired(from, to, label) {
  if (!html.includes(from)) throw new Error(`Shared Google restore marker missing: ${label}`);
  html = html.replace(from, to);
}

// Remove the temporary per-device API-key settings card. KTAK should remain
// zero-configuration for room members: Google is the default when the shared
// monthly safety gate still has capacity.
const personalCardRe = /\n  <div class="card googlePersonalCard">[\s\S]*?<span class="zeroCostBadge">預設 OSM \/ Esri：不使用 KTAK Google 帳單<\/span>\n  <\/div>\n/;
if (!personalCardRe.test(html)) throw new Error('Personal Google key card marker missing');
html = html.replace(personalCardRe, '\n');

replaceRequired(
  'const googleMapsConfigured=(()=>{try{return !!(localStorage.getItem("ktak.googleMapsApiKey.v1")||"").trim()}catch{return false}})();',
  'const googleMapsConfigured=!!(cfg.GOOGLE_MAPS_API_KEY&&!String(cfg.GOOGLE_MAPS_API_KEY).includes("YOUR_"));',
  'shared Google configuration',
);

replaceRequired(
  'async function claimGoogleMapLoadSlot(){\n  if(window.__ktakEnhance?.googleKey()){googleMapSlotClaimed=true;googleMapGateDenied=false;googleMapGateInfo={used:null,limit:null,reason:"自備 API Key"};return true}\n  if(googleMapSlotClaimed)return true;',
  'async function claimGoogleMapLoadSlot(){\n  if(googleMapSlotClaimed)return true;',
  'shared Google cost gate',
);

replaceRequired(
  "encodeURIComponent(window.__ktakEnhance?.googleKey()||'')",
  'encodeURIComponent(cfg.GOOGLE_MAPS_API_KEY)',
  'shared Google loader key',
);

// Declare Google as the preferred/default provider. initGoogleBasemap() still
// performs the authenticated 8,000-load monthly safety claim before loading
// Google; when the gate is exhausted or Google fails, existing code falls back
// to OSM automatically.
replaceRequired("let mapProvider='osm';", "let mapProvider='google';", 'default Google provider');

// The old local key helper remains harmless inside the enhancement runtime for
// backwards compatibility, but it is no longer consulted by the map loader.
if (html.includes('Google 底圖（自備 API Key）')) {
  throw new Error('Personal Google key UI was not fully removed');
}
if (!html.includes('ktak_claim_google_map_load') || !html.includes('GOOGLE_MAPS_MONTHLY_SAFE_LIMIT=8000')) {
  throw new Error('Google monthly safety gate is missing');
}
if (!html.includes('encodeURIComponent(cfg.GOOGLE_MAPS_API_KEY)')) {
  throw new Error('Shared Google API key loader is missing');
}
if (!html.includes("let mapProvider='google';")) {
  throw new Error('Google is not the default provider');
}

fs.writeFileSync(file, html);
console.log('Restored zero-configuration shared Google Maps default with the 8,000/month safety gate.');

