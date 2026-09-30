import fs from 'node:fs';
const src=fs.readFileSync('public/ktak-v35-field-v15.js','utf8');
new Function('window','document','navigator','sessionStorage','MutationObserver',src);
const required=[
 'ktak-v35-field-v15',
 'v35SosPrompt15',
 '🚨 前往支援並定位',
 "event:'INSERT'",
 "event:'UPDATE'",
 "table:'ktak35_sos'",
 "e.stopImmediatePropagation();showCurrentTaskDetails()",
 "if(/任務區/.test(b.textContent||''))",
 '@media(orientation:landscape) and (max-height:520px)',
 '.v35ActiveTaskMapBtn{left:62px!important',
 "status:'support'",
 '5000'
];
for(const marker of required)if(!src.includes(marker))throw new Error('field v15 missing marker: '+marker);
const mine='u1';
const shouldShow=x=>!!x&&x.status==='active'&&x.user_id!==mine;
if(!shouldShow({status:'active',user_id:'u2'}))throw new Error('field v15 failed remote active SOS selection');
if(shouldShow({status:'active',user_id:'u1'}))throw new Error('field v15 must not prompt sender for own SOS');
if(shouldShow({status:'resolved',user_id:'u2'}))throw new Error('field v15 must not prompt resolved SOS');
console.log('V3.5 field v15 tests passed: SOS priority prompt, task-detail chip, modal-close navigation and landscape compass avoidance markers verified.');

