import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Mobile map gesture marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Mobile map gesture regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK V3 mobile-map-gesture-v2: tap/info, long-press/edit, double-tap/actions */
.mobileFanActions{display:none;gap:7px;margin-top:8px;padding:8px;border:1px solid #35505d;border-radius:9px;background:#0b151a}
.mobileFanActions .ctxHint{margin:0!important}
#fanDrawGuide{display:none;position:absolute;z-index:12500;left:50%;top:12px;transform:translateX(-50%);width:min(92%,430px);padding:9px 10px;border-radius:11px;background:rgba(8,19,25,.96);border:1px solid #4b8bab;box-shadow:0 6px 22px #000a;align-items:center;gap:8px;color:#eaf6fb;font-size:11px;font-weight:750;pointer-events:auto}
#fanDrawGuide.show{display:flex}
#fanDrawGuide span{flex:1;line-height:1.4}
#fanDrawCancel{padding:6px 8px!important;font-size:10px!important;flex:0 0 auto}
@media(pointer:coarse){
  #mapContextMenu.contextMenu.open{left:8px!important;right:8px!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;top:auto!important;width:auto!important;max-width:none!important;max-height:72vh!important;overflow:auto!important;padding:10px!important}
  #mapContextMenu button,#mapContextMenu input,#mapContextMenu select{touch-action:manipulation}
  #mapCtxDuplicate{display:none!important}
  #mapCtxFanAngle,#mapCtxFanColor{display:none}
  #mapContextMenu.mobileFanOpen #mapCtxFanAngle,#mapContextMenu.mobileFanOpen #mapCtxFanColor{display:block}
  #mapContextMenu.mobileFanOpen .fanColorLabel{display:block}
  #mapContextMenu:not(.mobileFanOpen) .fanColorLabel{display:none}
  #mapContextMenu.mobileFanOpen .mobileFanActions{display:grid}
}
`;
replaceOnce('</style>', css + '\n</style>', 'mobile gesture css');

replaceOnce(
  '    <button id="mapCtxDirectionClear">清除方向</button>\n    <button id="mapCtxDuplicate">＋ 複製圖樣</button>',
  '    <button id="mapCtxDirectionClear">清除方向</button>\n    <button id="mapCtxRouteNodes" class="hidden">編輯路徑節點</button>\n    <button id="mapCtxDuplicate">＋ 複製圖樣</button>',
  'route node action button',
);

replaceOnce(
  '    <span class="fanColorLabel">顏色</span><input id="mapCtxFanColor" type="color" value="#ffc650" title="觀察扇形顏色">\n  </div>',
  `    <span class="fanColorLabel">顏色</span><input id="mapCtxFanColor" type="color" value="#ffc650" title="觀察扇形顏色">
  </div>
  <div id="mobileFanActions" class="mobileFanActions">
    <div class="ctxHint">先選扇形角度與顏色，再按「開始拉出扇形」。回到地圖後往觀察方向拖曳，拖曳距離就是扇形長度，放開手指即完成。</div>
    <button id="mobileFanStart" type="button" class="primary">開始拉出／重新調整扇形</button>
  </div>`,
  'mobile fan workflow panel',
);

replaceOnce(
  '<input id="mapObjectPhotoInput" type="file" accept="image/*" class="hidden">',
  `<div id="fanDrawGuide"><span>👁️ 往觀察方向拖曳；距離決定扇形長度，放開手指即完成。</span><button id="fanDrawCancel" type="button">取消</button></div>
<input id="mapObjectPhotoInput" type="file" accept="image/*" class="hidden">`,
  'fan draw guide',
);

// Long-press is exclusively the direct-manipulation frame. Route-node editing
// lives in the mobile double-tap action menu so the two modes cannot collide.
replaceOnce(
  "renderMapItems();window.__ktakRoute?.onLongPressItem?.(item)},500);",
  "renderMapItems()},500);",
  'long press only opens manipulation frame',
);

// Mobile single tap = compact information immediately. Double tap = advanced menu.
replaceRegexOnce(
  /\}else if\(!longTriggered&&coarsePointer\)\{[\s\S]*?\n      \}\n      start=null/,
  `}else if(!longTriggered&&coarsePointer){
        const tapNow=Date.now();
        const sameSecondTap=mapTapMemory.id===item.id && tapNow-mapTapMemory.at<=420;
        if(sameSecondTap){
          clearTimeout(mapTapMemory.timer);
          mapTapMemory={id:null,at:0,timer:null};
          try{layer.closeTooltip?.()}catch{}
          showMapMenu(item,e.clientX,e.clientY)
        }else{
          clearTimeout(mapTapMemory.timer);
          const id=item.id;
          mapTapMemory={id,at:tapNow,timer:setTimeout(()=>{if(mapTapMemory.id===id)mapTapMemory={id:null,at:0,timer:null}},430)};
          hideMapMenu();
          showMapQuickInfo(layer,item,{sticky:true})
        }
      }
      start=null`,
  'mobile tap and double-tap split',
);

// Mobile long-press may emit a synthetic contextmenu event. Suppress only on
// coarse pointers; desktop right-click remains exactly as before.
replaceOnce(
  "el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();showMapMenu(item,e.clientX,e.clientY)})",
  "el.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();if(coarsePointer)return;showMapMenu(item,e.clientX,e.clientY)})",
  'suppress mobile synthetic context menu',
);

// The mobile advanced menu remembers its own target without permanently changing
// the direct-manipulation selection. Existing handlers temporarily receive the menu
// target when a control is touched, then the previous edit selection is restored.
replaceOnce(
  'function showMapMenu(item,clientX,clientY){\n  selectedMapId=item.id;renderMapSelection();\n  const menu=$("mapContextMenu");',
  `function showMapMenu(item,clientX,clientY){
  const menu=$("mapContextMenu");
  if(coarsePointer){
    menu.dataset.itemId=item.id;
    menu.dataset.prevSelectedId=selectedMapId||'';
    selectionLayer.clearLayers();
    menu.classList.remove('mobileFanOpen');
  }else{
    selectedMapId=item.id;renderMapSelection();
  }`,
  'advanced menu isolated from edit selection',
);

replaceOnce(
  '  if(item.fan){$("mapCtxFanAngle").value=String(item.fan.angle||60);if($("mapCtxFanColor"))$("mapCtxFanColor").value=item.fan.color||"#ffc650"}\n  menu.classList.add("open");',
  `  if(item.fan){$("mapCtxFanAngle").value=String(item.fan.angle||60);if($("mapCtxFanColor"))$("mapCtxFanColor").value=item.fan.color||"#ffc650"}
  else if(coarsePointer){$("mapCtxFanAngle").value='60';if($("mapCtxFanColor"))$("mapCtxFanColor").value='#ffc650'}
  const routeNodes=$("mapCtxRouteNodes");if(routeNodes)routeNodes.classList.toggle('hidden',!coarsePointer||item.type!=='route'||!editable);
  if(coarsePointer&&$("mapCtxDirection"))$("mapCtxDirection").textContent=item.fan?'調整觀察扇形':'方向／觀察扇形';
  menu.classList.add("open");`,
  'prepare mobile advanced menu state',
);

replaceOnce(
  'function hideMapMenu(){$("mapContextMenu").classList.remove("open")}',
  `function hideMapMenu(){
  const menu=$("mapContextMenu");
  const hadMobileTarget=coarsePointer&&!!menu.dataset.itemId;
  const prev=hadMobileTarget?(menu.dataset.prevSelectedId||''):'';
  menu.classList.remove("open");menu.classList.remove('mobileFanOpen');
  if(hadMobileTarget){
    menu.dataset.itemId='';menu.dataset.prevSelectedId='';
    selectedMapId=prev&&itemById(prev)?prev:null;
    selectionLayer.clearLayers();
    if(selectedMapId)renderMapSelection()
  }
}`,
  'restore previous mobile edit selection after menu',
);

// Desktop keeps the original immediate right-click fan action. Mobile first opens
// angle/color controls, then starts a guided drag-and-release workflow.
replaceOnce(
  '$("mapCtxDirection").onclick=()=>{\n  const item=itemById(selectedMapId);if(!item||!canEditItem(item))return;\n  pushMapHistory();fanTargetId=item.id;hideMapMenu();map.getContainer().style.cursor=\'crosshair\';toast(\'從物件位置朝觀察／拍攝方向拖曳\')\n};',
  `$("mapCtxDirection").onclick=()=>{
  const item=itemById(selectedMapId);if(!item||!canEditItem(item))return;
  if(coarsePointer){
    $("mapContextMenu").classList.add('mobileFanOpen');
    toast('先選扇形角度與顏色，再按「開始拉出扇形」');
    return
  }
  pushMapHistory();fanTargetId=item.id;hideMapMenu();map.getContainer().style.cursor='crosshair';toast('從物件位置朝觀察／拍攝方向拖曳')
};`,
  'two-stage mobile fan action',
);

// Restore the advanced-menu target before existing one-tap handlers run. Do not
// stop click propagation here: the menu is outside the map and the document-level
// dismiss logic already ignores pointer events inside #mapContextMenu.
replaceOnce(
  '$("mapCtxDirection").onclick=()=>{',
  `const mobileMapMenu=$("mapContextMenu");
if(mobileMapMenu){
  mobileMapMenu.addEventListener('pointerdown',()=>{
    if(!coarsePointer)return;
    const id=mobileMapMenu.dataset.itemId;if(id)selectedMapId=id;
  },true);
}

$("mapCtxDirection").onclick=()=>{`,
  'single tap mobile menu controls',
);

// Anchor mobile-only actions directly before the single map-level pointer handler.
// This is deliberately independent of the exact formatting of the direction handler.
const mapPointerMarker = "map.getContainer().addEventListener('pointerdown',e=>{";
replaceOnce(
  mapPointerMarker,
  `$("mobileFanStart").onclick=()=>{
  const item=itemById(selectedMapId);if(!item||!canEditItem(item))return;
  pushMapHistory();fanTargetId=item.id;
  hideMapMenu();
  $("fanDrawGuide")?.classList.add('show');
  map.getContainer().style.cursor='crosshair';
  toast('往觀察方向拖曳，放開手指完成扇形')
};
$("fanDrawCancel").onclick=e=>{
  e.preventDefault();e.stopPropagation();fanTargetId=null;map.dragging.enable();map.getContainer().style.cursor=cursorFor(mapTool);$("fanDrawGuide")?.classList.remove('show');toast('已取消觀察扇形設定')
};
$("mapCtxRouteNodes").onclick=()=>{
  const item=itemById(selectedMapId);if(!item||item.type!=='route'||!canEditItem(item))return;
  window.__ktakRoute?.onLongPressItem?.(item);hideMapMenu()
};

${mapPointerMarker}`,
  'mobile fan start and route node actions',
);

replaceOnce(
  "const up=()=>{document.removeEventListener('pointermove',move);map.dragging.enable();fanTargetId=null;map.getContainer().style.cursor=cursorFor(mapTool);publish();renderMapItems()};",
  "const up=()=>{document.removeEventListener('pointermove',move);map.dragging.enable();fanTargetId=null;map.getContainer().style.cursor=cursorFor(mapTool);$('fanDrawGuide')?.classList.remove('show');publish();renderMapItems();if(coarsePointer){navigator.vibrate?.(25);toast('觀察扇形已完成；雙擊物件可再次調整')}};",
  'fan release completion feedback',
);

if (!html.includes('mobile-map-gesture-v2') ||
    !html.includes("if(coarsePointer)return;showMapMenu") ||
    !html.includes('menu.dataset.prevSelectedId') ||
    !html.includes('mobileFanStart') ||
    !html.includes('mapCtxRouteNodes') ||
    !html.includes('往觀察方向拖曳，放開手指完成扇形')) {
  throw new Error('KTAK mobile-map-gesture-v2 self-check failed');
}

fs.writeFileSync(file, html);
console.log('KTAK mobile map gestures v2 applied: tap info, long-press frame, double-tap actions, guided fan workflow.');

