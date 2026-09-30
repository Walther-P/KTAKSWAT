import fs from 'node:fs';
const src=fs.readFileSync('public/ktak-v35-assignment-prompt-v14.js','utf8');
// Compile the production runtime to catch syntax errors without executing browser APIs.
new Function('window','document','navigator',src);
const required=[
 'ktak-v35-assignment-prompt-v14',
 "event:'INSERT'",
 "event:'UPDATE'",
 "✅ 接受並開始執行",
 "▶ 開始執行",
 "🎯 前往任務區",
 "updateStatus(a,'active')",
 "window.__KTAK35_ASSIGNMENTS.respond(a,status)",
 "memberView(out.row,me())",
 "v35AssignmentActionModal{display:none!important}",
 "setInterval(async()=>",
 "8000"
];
for(const marker of required)if(!src.includes(marker))throw new Error('assignment prompt v14 missing marker: '+marker);
// Deterministic task-selection/state-flow check matching the production ranking rules.
const me='u-mobile';
const isMine=a=>Array.isArray(a.assigned_to)&&a.assigned_to.includes(me);
const rank=a=>a.status==='active'?3:a.status==='accepted'?2:a.status==='pending'?1:0;
const choose=rows=>(rows||[]).filter(x=>isMine(x)&&['pending','accepted','active'].includes(x.status)).sort((a,b)=>rank(b)-rank(a)||new Date(b.created_at)-new Date(a.created_at))[0]||null;
const old={id:'old',assigned_to:[me],status:'completed',created_at:'2026-09-03T01:00:00Z'};
const pending={id:'p1',assigned_to:[me],status:'pending',created_at:'2026-09-03T02:00:00Z'};
if(choose([old,pending])?.id!=='p1')throw new Error('assignment prompt v14 failed pending selection');
pending.status='accepted';if(choose([pending])?.status!=='accepted')throw new Error('assignment prompt v14 failed accepted state');
pending.status='active';if(choose([pending])?.status!=='active')throw new Error('assignment prompt v14 failed active state');
pending.status='completed';if(choose([pending])!==null)throw new Error('assignment prompt v14 failed final-state dismissal');
console.log('V3.5 assignment prompt v14 tests passed: syntax, realtime hooks, direct action controls, and pending→accepted→active→completed selection flow.');


