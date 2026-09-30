import fs from 'node:fs';

const htmlPath = 'dist/index.html';
const commandSource = 'public/ktak-v35-command.js';
const compassSource = 'public/ktak-v35-compass-sync.js';
const locationAccuracySource = 'public/ktak-v35-location-accuracy.js';
const googleFallbackSource = 'public/ktak-v35-google-fallback.js';
const commandTarget = 'dist/ktak-v35-command.js';
const compassTarget = 'dist/ktak-v35-compass-sync.js';
const locationAccuracyTarget = 'dist/ktak-v35-location-accuracy.js';
const googleFallbackTarget = 'dist/ktak-v35-google-fallback.js';

for (const file of [htmlPath, commandSource, compassSource, locationAccuracySource, googleFallbackSource]) {
  if (!fs.existsSync(file)) throw new Error(`KTAK35 finalize missing file: ${file}`);
}

let html = fs.readFileSync(htmlPath, 'utf8');
if (!html.includes('ktak35-command-pack-v1')) {
  throw new Error('KTAK35 command pack shell has not been injected');
}
if (!html.includes('<script src="./ktak-v35-command.js"></script>')) {
  throw new Error('KTAK35 command runtime script marker missing');
}

// The native background-location callback in the existing full UI originally
// kept only latitude / longitude / horizontal accuracy in memory. V3.5 needs
// altitude and vertical accuracy immediately as well, not only after Realtime
// re-fetches the database row.
if (!html.includes('altitudeM: Number.isFinite(Number(location.altitude))')) {
  const nativeLocationBlock = /const loc = \{\s*userId: currentUserId,\s*lat: Number\(location\.latitude\),\s*lng: Number\(location\.longitude\),\s*accuracyM: Number\.isFinite\(Number\(location\.accuracy\)\) \? Number\(location\.accuracy\) : null,\s*updatedAt: new Date\(location\.time \|\| Date\.now\(\)\)\.toISOString\(\),\s*\};/m;
  if (!nativeLocationBlock.test(html)) {
    throw new Error('KTAK35 native background location marker missing');
  }
  html = html.replace(
    nativeLocationBlock,
    `const loc = {
      userId: currentUserId,
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      accuracyM: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null,
      altitudeM: Number.isFinite(Number(location.altitude)) ? Number(location.altitude) : null,
      altitudeAccuracyM: Number.isFinite(Number(location.altitudeAccuracy)) ? Number(location.altitudeAccuracy) : null,
      speedMps: Number.isFinite(Number(location.speed)) ? Number(location.speed) : null,
      headingDeg: Number.isFinite(Number(location.bearing ?? location.heading)) ? Number(location.bearing ?? location.heading) : null,
      updatedAt: new Date(location.time || Date.now()).toISOString(),
    };`,
  );
}

if (!html.includes('<script src="./ktak-v35-compass-sync.js"></script>')) {
  html = html.replace(
    '<script src="./ktak-v35-command.js"></script>',
    '<script src="./ktak-v35-command.js"></script>\n<script src="./ktak-v35-compass-sync.js"></script>',
  );
}
if (!html.includes('<script src="./ktak-v35-location-accuracy.js"></script>')) {
  html = html.replace(
    '<script src="./ktak-v35-compass-sync.js"></script>',
    '<script src="./ktak-v35-compass-sync.js"></script>\n<script src="./ktak-v35-location-accuracy.js"></script>',
  );
}
if (!html.includes('<script src="./ktak-v35-google-fallback.js"></script>')) {
  html = html.replace(
    '<script src="./ktak-v35-location-accuracy.js"></script>',
    '<script src="./ktak-v35-location-accuracy.js"></script>\n<script src="./ktak-v35-google-fallback.js"></script>',
  );
}

fs.copyFileSync('public/ktak-v35-operations.js','dist/ktak-v35-operations.js');
html=html.replace('<script src="./ktak-v35-command.js"></script>','<script src="./ktak-v35-operations.js"></script>\n<script src="./ktak-v35-command.js"></script>');
fs.copyFileSync(commandSource, commandTarget);
fs.copyFileSync(compassSource, compassTarget);
fs.copyFileSync(locationAccuracySource, locationAccuracyTarget);
fs.copyFileSync(googleFallbackSource, googleFallbackTarget);
fs.writeFileSync(htmlPath, html);

const checks = [
  ['command page', 'id="commandPage"'],
  ['altitude location fields', 'altitude_m'],
  ['native altitude memory', 'altitudeM: Number.isFinite(Number(location.altitude))'],
  ['native altitude accuracy memory', 'altitudeAccuracyM: Number.isFinite(Number(location.altitudeAccuracy))'],
  ['grid toggle', 'id="v35GridToggle"'],
  ['north compass', 'id="v35Compass"'],
  ['command runtime', './ktak-v35-command.js'],
  ['compass sync runtime', './ktak-v35-compass-sync.js'],
  ['vertical accuracy runtime', './ktak-v35-location-accuracy.js'],
  ['Google fallback runtime', './ktak-v35-google-fallback.js'],
];
for (const [label, marker] of checks) {
  if (!html.includes(marker)) throw new Error(`KTAK35 finalize self-check failed: ${label}`);
}

const command = fs.readFileSync(commandTarget, 'utf8');
const compass = fs.readFileSync(compassTarget, 'utf8');
const locationAccuracy = fs.readFileSync(locationAccuracyTarget, 'utf8');
const googleFallback = fs.readFileSync(googleFallbackTarget, 'utf8');
for (const marker of [
  'L.control.scale({imperial:false,metric:true,position:\'bottomright\'})',
  'function renderGrid()',
  'window.ktak35SetMapBearing=setMapBearing',
]) {
  if (!command.includes(marker)) throw new Error(`KTAK35 command runtime validation failed: ${marker}`);
}
for (const marker of [
  'ktak-map-bearing',
  'typeof map.getBearing === \'function\'',
  'window.ktak35SetMapBearing',
]) {
  if (!compass.includes(marker)) throw new Error(`KTAK35 compass validation failed: ${marker}`);
}
for (const marker of [
  'altitudeAccuracyM',
  '高度精度',
  '水平精度',
]) {
  if (!locationAccuracy.includes(marker)) throw new Error(`KTAK35 location accuracy validation failed: ${marker}`);
}
for (const marker of [
  'gm_authFailure',
  'OpenStreetMap',
  'ktak35FallbackTiles',
]) {
  if (!googleFallback.includes(marker)) throw new Error(`KTAK35 Google fallback validation failed: ${marker}`);
}

console.log('KTAK V3.5 command assets finalized: altitude + vertical accuracy, grid, metric scale, dynamic north compass and Google auth fallback ready.');


