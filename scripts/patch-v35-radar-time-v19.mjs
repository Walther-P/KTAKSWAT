import fs from 'node:fs';

const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

const oldHandler="$('v35RadarNow').onclick=()=>{stopRadarPlayback(false);radarFrames=[];window.__KTAK35?.showLatestRadar?.()};";
const newHandler="function refreshRadarTimeWindow(){const now=new Date(),past=new Date(now.getTime()-60*60*1000),hh=x=>String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');const start=$('v35RadarStart'),end=$('v35RadarEnd');if(start)start.value=hh(past);if(end)end.value=hh(now);return {start:hh(past),end:hh(now)}}$('v35RadarNow').onclick=()=>{stopRadarPlayback(false);radarFrames=[];const w=refreshRadarTimeWindow();window.__KTAK35?.showLatestRadar?.();const s=$('v35RadarPlaybackStatus');if(s)s.textContent='最新回波已更新 · '+w.end};";

const count=usability.split(oldHandler).length-1;
if(count!==1)throw new Error(`V19 expected one radar-now handler, got ${count}`);
usability=usability.replace(oldHandler,newHandler);
usability='// ktak-v35-radar-time-v19\n'+usability;

// Force clients to fetch the updated usability runtime instead of reusing the cached V18/V7 copy.
html=html.replace(/\.\/ktak-v35-usability\.js(?:\?[^"']*)?/, './ktak-v35-usability.js?v=35-radar19');
html=html.replace('</style>','\n/* ktak-v35-radar-time-v19 */\n</style>');

if(!usability.includes('function refreshRadarTimeWindow()'))throw new Error('V19 refresh helper missing');
if(!usability.includes("s.textContent='最新回波已更新 · '+w.end"))throw new Error('V19 status update missing');
if(!html.includes('./ktak-v35-usability.js?v=35-radar19'))throw new Error('V19 cache key missing');

fs.writeFileSync(usabilityPath,usability);
fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 radar time v19 applied: Update latest radar now refreshes the displayed one-hour start/end window as well as the radar layer.');

// V3.5.2 is a workflow/UI pass applied after all existing operational and radar
// patches. It does not alter Stable or the production database.
await import('./patch-v352-command-flow.mjs');

