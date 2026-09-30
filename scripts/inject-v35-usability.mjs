import fs from 'node:fs';

const file='dist/index.html';
let html=fs.readFileSync(file,'utf8');
if(html.includes('ktak-v35-usability-v1')){console.log('KTAK V3.5 usability already injected');process.exit(0)}

const css=`
/* ktak-v35-usability-v1 */
.v35MapModeHud{position:fixed;z-index:9100;left:50%;bottom:calc(76px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:11px;background:#0c171de8;border:1px solid #38525f;box-shadow:0 4px 18px #0009;font-size:10px;pointer-events:auto}.v35MapModeHud:not(.active){display:none}.v35MapModeHud.active{display:flex;border-color:#d8a538;background:#30260eea}.v35MapModeHud button{padding:5px 7px;font-size:9px}.v35MemberPopup{font-size:12px;line-height:1.5;min-width:210px}.v35MemberPopup b{display:block;font-size:14px;margin-bottom:4px}.v35GridLabel{background:#071218dc!important;border:1px solid #9ec8d9!important;color:#e7f8ff!important;border-radius:5px!important;padding:2px 4px!important;width:auto!important;height:auto!important;font:700 9px/1.2 ui-monospace,monospace;white-space:nowrap;box-shadow:0 1px 4px #0009}.v35RadarTools{display:grid;grid-template-columns:auto auto auto minmax(210px,auto);gap:7px;align-items:center;margin-top:8px;padding:8px 10px;border:1px solid #38515d;background:#0c171c;border-radius:10px}.v35RadarTools>div{grid-column:1/-1;display:flex;align-items:baseline;gap:8px;min-width:0}.v35RadarTools>div span{display:inline;color:#91a8b2;font-size:9px;margin:0}.v35RadarTools>div b,.v35RadarTools>div span{writing-mode:horizontal-tb;word-break:keep-all}.v35RadarTools label{display:flex;align-items:center;gap:4px;font-size:9px;white-space:nowrap}.v35RadarTools input{width:100px;padding:5px}.v35RadarTools button,.v35RadarTools a{font-size:9px;padding:6px 8px;white-space:nowrap;width:auto}.v35RadarTools a{color:#9ed9ff;text-decoration:none;border:1px solid #365567;border-radius:8px;background:#101d23}
#chatInput{min-height:42px;max-height:130px;resize:vertical;line-height:1.35}
@media(max-width:820px){.v35Compass{top:auto!important;right:10px!important;bottom:calc(92px + env(safe-area-inset-bottom))!important}.v35MapModeHud.active{left:10px;right:auto;bottom:calc(82px + env(safe-area-inset-bottom));transform:none;max-width:calc(100vw - 88px);width:max-content}.v35RadarTools{grid-template-columns:1fr 1fr}.v35RadarTools>div,.v35RadarTools a{grid-column:1/-1}.v35RadarTools>div{display:block}.v35RadarTools>div span{display:block;margin-top:2px;word-break:normal}.v35RadarTools input{width:100%}#chatInput{min-height:62px;max-height:180px}}
`;
html=html.replace('</style>',css+'\n</style>');
html=html.replace('<input id="chatInput" placeholder="輸入訊息…">','<textarea id="chatInput" rows="2" maxlength="5000" placeholder="輸入訊息…"></textarea>');
html=html.replace('</body>','<script src="./ktak-v35-usability.js"></script>\n</body>');
if(!html.includes('ktak-v35-usability-v1')||!html.includes('ktak-v35-usability.js'))throw new Error('KTAK35 usability self-check failed');
fs.writeFileSync(file,html);
console.log('KTAK V3.5 usability layer injected.');

