import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Version/symbol marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Version/symbol regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK V3 version-symbols-v2: mobile build label + reference-shaped weapon/hazard symbols */
@media(max-width:820px){
  .brandText{min-width:0;max-width:min(52vw,220px)}
  .brandText b{font-size:12px;line-height:1.15}
  .brandText small{display:block!important;font-size:8px!important;line-height:1.15;color:#9fb4bf;white-space:normal;max-width:100%}
  header{align-items:flex-start}
  .roomStatus{align-self:center}
}
`;
replaceOnce('</style>', css + '\n</style>', 'mobile version css');

const pistolSvg = `pistol:\`<svg viewBox="0 0 120 78" aria-label="手槍">
  <g fill="#101417" stroke="#f4f7f8" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M9 16h79l13 4 8 7v18H69l-7 7H48l-8-9H25l-10-7H9Z"/>
    <path d="M41 49h29L61 75H39l-6-20Z"/>
    <path d="M28 43h32c-1 12-8 18-18 18-9 0-15-6-14-18Z" fill="none"/>
    <path d="M89 22h23v16h-11V29"/>
    <path d="M15 16v-6h68l13 6" fill="none"/>
  </g>
  <g fill="none" stroke="#697b84" stroke-width="1.5" stroke-linecap="round">
    <path d="M18 22h58M18 28h58M45 56h18M43 61h18M42 66h17"/>
    <path d="M58 37c4-5 8-7 14-7"/>
  </g>
</svg>\`,`;

const rifleSvg = `gun:\`<svg viewBox="0 0 168 64" aria-label="步槍">
  <g fill="#101417" stroke="#f4f7f8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M4 25h28l17-10h38l12 8h49v17H95l-10 7H61l-12-8H32L18 49H5Z"/>
    <path d="M64 45h22l-4 17H64l-7-15Z"/>
    <path d="M53 45 43 62H31l12-23Z"/>
    <path d="M148 25h14v15h-14"/>
    <path d="M162 29h6v7h-6"/>
    <path d="M8 25 2 15h21l15 10"/>
    <path d="M100 23v-8h21v8" fill="none"/>
    <path d="M129 23v-12h5v12M151 23v-13h5v13"/>
  </g>
  <g fill="none" stroke="#697b84" stroke-width="1.5" stroke-linecap="round">
    <path d="M106 30h39M109 34h36M114 38h31"/>
    <path d="M70 21h17M73 26h19"/>
  </g>
</svg>\`,`;

replaceRegexOnce(/pistol:`<svg viewBox="0 0 64 40">[\s\S]*?<\/svg>`,/, pistolSvg, 'replace pistol icon');
replaceRegexOnce(/gun:`<svg viewBox="0 0 76 40">[\s\S]*?<\/svg>`,/, rifleSvg, 'replace rifle icon');

const newHazardSvgs = `  explosive:\`<svg viewBox="0 0 80 90" aria-label="爆裂物">
    <g fill="#111518" stroke="#f5f7f8" stroke-width="2" stroke-linejoin="round">
      <path d="M32 8h16l7 9-6 45H31l-6-45Z"/>
      <path d="M26 18 12 9v20l14 7M54 18l14-9v20l-14 7"/>
      <path d="M40 63 50 74l17-5-8 13 15 4-18 4-2 10-14-8-14 8-2-10-18-4 15-4-8-13 17 5Z" fill="#111518"/>
    </g>
  </svg>\`,
  biohazard:\`<svg viewBox="0 0 64 64" aria-label="生化危害">
    <path d="M32 4 60 56H4Z" fill="#ffd91a" stroke="#11181c" stroke-width="5" stroke-linejoin="round"/>
    <text x="32" y="46" text-anchor="middle" font-size="34" font-family="Arial, sans-serif" font-weight="900" fill="#11181c">☣</text>
  </svg>\`,
`;
replaceOnce('  breach:`<svg', newHazardSvgs + '  breach:`<svg', 'insert explosive and biohazard icons');

replaceOnce("gun:['gun','槍械']", "gun:['gun','步槍']", 'rename gun to rifle');
replaceOnce(
  "pistol:['pistol','手槍'],breach:['breach','破門點']",
  "pistol:['pistol','手槍'],explosive:['explosive','爆裂物'],biohazard:['biohazard','生化危害'],breach:['breach','破門點']",
  'register new hazard icon defs',
);

replaceOnce(
  'personnel:{label:"人員／隊伍",keys:["friendly","enemy","civilian","person","group","command","medical","shield","sniper","gun","pistol","dog"]},\n  vehicles:',
  'personnel:{label:"人員／隊伍",keys:["friendly","enemy","civilian","person","group","command","medical","shield","sniper","dog"]},\n  weapons:{label:"武器／危害",keys:["pistol","gun","explosive","biohazard"]},\n  vehicles:',
  'create weapon hazard category',
);

if (!html.includes('version-symbols-v2') ||
    !html.includes('weapons:{label:"武器／危害"') ||
    !html.includes("explosive:['explosive','爆裂物']") ||
    !html.includes("biohazard:['biohazard','生化危害']") ||
    !html.includes('viewBox="0 0 168 64" aria-label="步槍"') ||
    !html.includes('viewBox="0 0 120 78" aria-label="手槍"') ||
    !html.includes('viewBox="0 0 80 90" aria-label="爆裂物"')) {
  throw new Error('KTAK version-symbols-v2 self-check failed');
}

fs.writeFileSync(file, html);
console.log('KTAK version/symbol update applied: mobile build label plus reference-shaped pistol/rifle/explosive and biohazard symbols.');

