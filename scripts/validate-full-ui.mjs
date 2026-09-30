import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('dist/index.html', 'utf8');
const required = [
  '導航路線',
  'lineDistanceTooltip',
  'boardFloorplanSet',
  'ktak_join_room_v3',
  'ktak.locationAuto.v1',
  'ktak_claim_google_map_load',
  'GOOGLE_MAPS_MONTHLY_SAFE_LIMIT=8000',
  "let mapProvider='google'",
  'encodeURIComponent(cfg.GOOGLE_MAPS_API_KEY)',
  'ktak-native-bridge.js',
  '房間密碼（4 位數字）',
  'ktak_recover_commander_v3',
  'orientation:landscape',
  '指揮官恢復 PIN（4 位數字）',
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing integrated UI marker: ${marker}`);
}
if (html.includes('Google 底圖（自備 API Key）')) {
  throw new Error('Personal Google API key UI must not be present');
}
if (html.includes('id="recoverNick"')) {
  throw new Error('Commander recovery must not ask for nickname');
}

const scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
let checked = 0;
while ((match = scriptRe.exec(html))) {
  const attrs = match[1] || '';
  const code = match[2] || '';
  if (/\bsrc\s*=/.test(attrs) || /type\s*=\s*["']module["']/.test(attrs) || !code.trim()) continue;
  new vm.Script(code, { filename: `dist/index-inline-${checked + 1}.js` });
  checked++;
}
if (!checked) throw new Error('No inline application scripts were validated');
console.log(`Full UI validation passed: ${checked} inline scripts parsed; Google default, four-digit PIN flow, and landscape chat are present.`);

