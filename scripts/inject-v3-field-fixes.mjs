import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Field fix marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Field fix regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK V3 field-fix-v3: persistent edit mode, robust location avatars, map contrast */
.member-loc-pin.has-avatar{background-color:#17394b!important;background-size:cover!important;background-position:50% 50%!important;background-repeat:no-repeat!important;color:transparent!important}
.map-symbol-shell svg{filter:drop-shadow(0 0 1.4px rgba(3,9,12,.98)) drop-shadow(0 0 2.4px rgba(3,9,12,.92))!important}
.map-symbol-shell .tac-inner{position:relative;z-index:1}
`;
replaceOnce('</style>', css + '\n</style>', 'field fix css');

// Once a map item is selected, it stays in edit mode. A stationary 0.5 s
// long-press toggles it back to locked/confirmed. Moving a selected item is
// immediate on every later touch/pointer-down.
replaceOnce(
  'start={x:e.clientX,y:e.clientY,ll:map.mouseEventToLatLng(e)};base=clone(item);moved=false;longTriggered=false;historyPushed=false;',
  'start={x:e.clientX,y:e.clientY,ll:map.mouseEventToLatLng(e)};base=clone(item);moved=false;longTriggered=selectedMapId===item.id;historyPushed=false;',
  'remember persistent edit state on pointer down',
);
replaceOnce(
  "timer=setTimeout(()=>{if(!moved){longTriggered=true;if(selectedMapId!==item.id){selectedMapId=item.id;toast('已解鎖物件：可拖曳移動；右下 ↻ 旋轉／縮放；左上 ＋ 可複製');renderMapItems()}window.__ktakRoute?.onLongPressItem?.(item)}},500);",
  "timer=setTimeout(()=>{if(moved)return;if(selectedMapId===item.id&&longTriggered){selectedMapId=null;longTriggered=true;window.__ktakRoute?.clearNodeEditor?.();toast('已確認定位，物件已鎖定');renderMapItems();return}longTriggered=true;selectedMapId=item.id;toast('已進入編輯：可直接拖曳；右下 ↻ 旋轉／縮放；左上 ＋ 可複製');renderMapItems();window.__ktakRoute?.onLongPressItem?.(item)},500);",
  'toggle persistent map edit state',
);
replaceOnce(
  'if(!longTriggered){if(holdDist>8){moved=true;clearTimeout(timer)}return}',
  'if(!longTriggered){if(holdDist>8){longTriggered=true;start=null;clearTimeout(timer)}return}',
  'cancel unlock when unselected pointer slides',
);
replaceOnce(
  "pan:'拖曳地圖；物件預設鎖定，按住 0.5 秒解鎖後才可移動／旋轉'",
  "pan:'拖曳地圖；長按 0.5 秒進入編輯，＋／↻ 出現期間可直接拖曳；再長按 0.5 秒確認並鎖定'",
  'persistent edit map hint',
);
replaceOnce(
  '    renderList,\n    onLongPressItem(item) {',
  '    renderList,\n    clearNodeEditor() { clearRouteNodeEditor(); },\n    onLongPressItem(item) {',
  'route node editor clear hook',
);

// On coarse pointers, a single tap is view-only. It must never call showMapMenu,
// because showMapMenu selects the item and makes the + / rotate handles appear.
// Editing is exclusively entered through the 0.5 s long-press above.
replaceOnce(
  '                showMapMenu(item,x,y);\n                mapTapMemory={id:null,at:0,timer:null}',
  '                showMapQuickInfo(layer,item,{sticky:true});\n                mapTapMemory={id:null,at:0,timer:null}',
  'mobile single tap stays view-only',
);

// Leaflet DivIcon HTML was intermittently producing a blank replacement box
// even though the exact same signed avatar URL rendered in the room member list.
// Render the pin shell first, then set the verified URL through the DOM style
// property after the marker exists. This avoids re-parsing the signed URL as HTML.
replaceRegexOnce(
  /function locationIcon\(userId,u,age\)\{[\s\S]*?return L\.divIcon\(\{className:"",html,iconSize:\[42,56\],iconAnchor:\[21,21\],tooltipAnchor:\[0,-20\]\}\)\n\}/,
  `function locationIcon(userId,u,age){
  const url=memberAvatarUrl(userId),warn=age>10000;
  const html=\`<div class="member-loc-wrap"><div class="member-loc-pin" data-avatar-user="\${escapeHtml(userId)}">\${url?'':locationInitials(u)}</div>\${warn?'<div class="member-loc-stale">!</div>':''}<div class="member-loc-name">\${escapeHtml(u?.nick||"隊員")}</div></div>\`;
  return L.divIcon({className:"",html,iconSize:[42,56],iconAnchor:[21,21],tooltipAnchor:[0,-20]})
}`,
  'robust location icon shell',
);
replaceOnce(
  'const marker=L.marker([loc.lat,loc.lng],{icon:locationIcon(u.id,u,age),keyboard:false,zIndexOffset:8000}).addTo(locationLayer);\n    marker.bindPopup',
  `const marker=L.marker([loc.lat,loc.lng],{icon:locationIcon(u.id,u,age),keyboard:false,zIndexOffset:8000}).addTo(locationLayer);
    const markerAvatar=memberAvatarUrl(u.id);
    if(markerAvatar){
      requestAnimationFrame(()=>{
        const pin=marker.getElement?.()?.querySelector('.member-loc-pin');
        if(!pin)return;
        pin.style.backgroundImage=\`url("\${markerAvatar}")\`;
        pin.classList.add('has-avatar');
        pin.textContent='';
      });
    }
    marker.bindPopup`,
  'apply avatar URL after Leaflet marker creation',
);

if (!html.includes('field-fix-v3') || !html.includes('clearNodeEditor()') || !html.includes("pin.style.backgroundImage") || !html.includes('已確認定位，物件已鎖定') || !html.includes('showMapQuickInfo(layer,item,{sticky:true})')) {
  throw new Error('KTAK field-fix-v3 self-check failed');
}

fs.writeFileSync(file, html);
console.log('KTAK field-fix-v3 applied: long-press-only mobile edit mode, marker avatar DOM binding, tactical symbol contrast.');

