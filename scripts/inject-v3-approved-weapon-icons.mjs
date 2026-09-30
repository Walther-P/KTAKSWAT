import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceIcon(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Approved weapon icon marker missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK approved-weapon-icons-v1: user-approved pistol/rifle/explosive artwork */
svg.ktak-approved-weapon-icon{overflow:visible;filter:drop-shadow(0 0 1.25px rgba(255,255,255,.92)) drop-shadow(0 2px 3px rgba(0,0,0,.85))}
svg.ktak-approved-weapon-icon image{pointer-events:none}
`;
if (!html.includes('approved-weapon-icons-v1')) {
  if (!html.includes('</style>')) throw new Error('Approved weapon icon CSS target missing');
  html = html.replace('</style>', css + '\n</style>');
}

replaceIcon(
  /pistol:`<svg[^>]*aria-label="手槍"[\s\S]*?<\/svg>`,/,
  'pistol:`<svg class="ktak-approved-weapon-icon" viewBox="0 0 190 192" aria-label="手槍"><image href="/ktak-icons/pistol.svg" x="0" y="0" width="190" height="192" preserveAspectRatio="xMidYMid meet"/></svg>`,',
  'pistol',
);

replaceIcon(
  /gun:`<svg[^>]*aria-label="步槍"[\s\S]*?<\/svg>`,/,
  'gun:`<svg class="ktak-approved-weapon-icon" viewBox="0 0 192 139" aria-label="步槍"><image href="/ktak-icons/rifle.svg" x="0" y="0" width="192" height="139" preserveAspectRatio="xMidYMid meet"/></svg>`,',
  'rifle',
);

replaceIcon(
  /explosive:`<svg[^>]*aria-label="爆裂物"[\s\S]*?<\/svg>`,/,
  'explosive:`<svg class="ktak-approved-weapon-icon" viewBox="0 0 183 192" aria-label="爆裂物"><image href="/ktak-icons/explosive.svg" x="0" y="0" width="183" height="192" preserveAspectRatio="xMidYMid meet"/></svg>`,',
  'explosive',
);

for (const asset of ['/ktak-icons/pistol.svg', '/ktak-icons/rifle.svg', '/ktak-icons/explosive.svg']) {
  if (!html.includes(asset)) throw new Error(`Approved weapon icon self-check failed: ${asset}`);
}
if (!html.includes('approved-weapon-icons-v1')) throw new Error('Approved weapon icon CSS self-check failed');

fs.writeFileSync(file, html);
console.log('KTAK approved weapon icons applied: pistol, rifle, explosive now use user-approved artwork assets.');

// Chat/map quality-of-life enhancements are intentionally applied here so they run
// late in the full-UI pipeline, after the base chat/map DOM has stabilized.
await import('./inject-v3-chat-tools-v1.mjs');
await import('./verify-v3-chat-tools.mjs');

