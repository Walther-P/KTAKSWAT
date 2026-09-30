import fs from 'node:fs';

const htmlPath='dist/index.html';
const usabilityPath='dist/ktak-v35-usability.js';
let html=fs.readFileSync(htmlPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');

const replaceOnce=(text,needle,replacement,label)=>{
  if(!text.includes(needle)) throw new Error(`V3.5 feedback-v6 missing: ${label}`);
  return text.replace(needle,replacement);
};
const replaceRegex=(text,regex,replacement,label)=>{
  if(!regex.test(text)) throw new Error(`V3.5 feedback-v6 missing: ${label}`);
  regex.lastIndex=0;
  return text.replace(regex,replacement);
};

/* Expose one safe operation from the main KTAK runtime. All tactical symbols,
   freehand/shape drawing and shared routes already live in state.map.items and
   carry ownerId, so this can delete only the current user's work. */
html=replaceOnce(
  html,
  `  deleteChatRealtimeRow:r=>{if(!r||!state)return;state.chat=state.chat.filter(x=>x.id!==r.id);renderChat()}\n};`,
  `  deleteChatRealtimeRow:r=>{if(!r||!state)return;state.chat=state.chat.filter(x=>x.id!==r.id);renderChat()},
  clearMyMapWork:async()=>{
    if(!state?.map?.items)return 0;
    const mine=state.map.items.filter(x=>x?.ownerId===currentUserId);
    if(!mine.length){toast('你目前沒有自己建立的地圖內容');return 0}
    const photoPaths=mine.map(x=>x?.photoPath).filter(Boolean);
    pushMapHistory();
    state.map.items=state.map.items.filter(x=>x?.ownerId!==currentUserId);
    selectedMapId=null;fanTargetId=null;drawStart=null;freeDrawing=false;freePoints=[];
    try{clearPreview()}catch{}
    try{window.__ktakRoute?.clearNodeEditor?.()}catch{}
    try{setMapTool('pan')}catch{}
    publish();renderMapItems();
    Promise.allSettled(photoPaths.map(p=>removeObjectMedia(p))).catch(()=>{});
    toast('已刪除你建立的 '+mine.length+' 個地圖內容（含快速圖樣、繪圖、共享路線）');
    return mine.length;
  }
};`,
  'core clearMyMapWork bridge'
);

/* The existing button used to rely on its original per-permission behavior.
   In V3.5 it now means exactly: remove everything on the mission map created by
   the current user. Search sectors are separate command objects and are NOT
   removed by this button. */
usability=replaceRegex(
  usability,
  /function bindClearAll\(\)\{[\s\S]*?\n\}/,
  `function bindClearAll(){
  if(document.documentElement.dataset.v35ClearOwnMap==='1')return;
  document.documentElement.dataset.v35ClearOwnMap='1';
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('button');if(!b)return;
    const txt=(b.textContent||'').replace(/\\s+/g,'');
    if(/刪除全部地圖圖示/.test(txt)||/刪除我全部地圖內容/.test(txt)){
      e.preventDefault();e.stopImmediatePropagation();cancelTransientMapWork();
      const mine=(core.state?.map?.items||[]).filter(x=>x?.ownerId===core.userId);
      if(!mine.length){core.toast?.('你目前沒有自己建立的地圖內容');return}
      const routes=mine.filter(x=>x.type==='route').length;
      const drawings=mine.filter(x=>['line','rect','circle','free','freeShape'].includes(x.type)).length;
      const symbols=mine.length-routes-drawings;
      const detail=[symbols?'快速圖樣／標記 '+symbols+' 個':'',drawings?'地圖繪圖 '+drawings+' 個':'',routes?'共享路線 '+routes+' 條':''].filter(Boolean).join('、');
      if(!confirm('確定刪除「你自己建立」的全部地圖內容？\\n'+detail+'\\n\\n不會刪除其他人的內容，也不會刪除 V3.5 搜索區。'))return;
      Promise.resolve(core.clearMyMapWork?.()).catch(err=>core.toast?.('刪除失敗：'+(err?.message||err)));
      return;
    }
    if(/(清除所有地圖|清除內容|全部清除)/.test(txt)){
      cancelTransientMapWork();setTimeout(clearV35SearchSectors,150);
    }
  },true);
}`,
  'clear own map button behavior'
);

// Clarify the visible label if the exact control exists in the built UI.
html=html.replace(/>刪除全部地圖圖示</g,'>刪除我全部地圖內容<');

html=html.replace('./ktak-v35-usability.js?v=35-feedback5','./ktak-v35-usability.js?v=35-feedback6');
html=html.replace('</style>',`\n/* ktak-v35-field-feedback-v6 */\n</style>`);
usability=`// ktak-v35-field-feedback-v6\n${usability}`;

if(!html.includes('clearMyMapWork')||!html.includes('ktak-v35-field-feedback-v6'))throw new Error('V3.5 feedback-v6 HTML self-check failed');
if(!usability.includes('v35ClearOwnMap')||!usability.includes('不會刪除 V3.5 搜索區'))throw new Error('V3.5 feedback-v6 usability self-check failed');

fs.writeFileSync(htmlPath,html);
fs.writeFileSync(usabilityPath,usability);
console.log('KTAK V3.5 feedback v6 applied: one-click delete of all current-user map symbols, drawings and shared routes, without touching other users or search sectors.');

