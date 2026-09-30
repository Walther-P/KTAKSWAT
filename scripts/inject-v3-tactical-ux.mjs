import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Tactical UX marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Tactical UX regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK Native V3 — tactical interaction hardening */
.routePreviewTooltip{background:rgba(7,14,18,.94)!important;color:#fff!important;border:1px solid #00e5ff!important;border-radius:999px!important;box-shadow:0 3px 10px #0008!important;padding:3px 7px!important;font-size:10px!important;font-weight:850!important}
.routePreviewTooltip::before{display:none!important}
.route-node-delete{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#8a2727;color:#fff;border:2px solid #fff;box-shadow:0 3px 12px #000b;font:900 20px/1 sans-serif;user-select:none;touch-action:manipulation}
.locationMemberRow{grid-template-columns:auto 1fr auto!important}
.locationJumpAvatar{width:36px;height:36px;border-radius:50%;padding:0!important;display:grid;place-items:center;overflow:hidden;background:#17394b;border:2px solid #7897a8;font-size:10px;font-weight:900;min-width:36px}
.locationJumpAvatar img{width:100%;height:100%;object-fit:cover;display:block}
.locationJumpAvatar:disabled{opacity:.42;cursor:default}
`;
replaceOnce('</style>', css + '\n</style>', 'tactical UX css');

replaceOnce(
  "timer=setTimeout(()=>{if(!moved){longTriggered=true;toggleMapSelection(item)}},1000);",
  "timer=setTimeout(()=>{if(!moved){longTriggered=true;if(selectedMapId!==item.id){selectedMapId=item.id;toast('已解鎖物件：可拖曳移動；右下 ↻ 旋轉／縮放；左上 ＋ 可複製');renderMapItems()}window.__ktakRoute?.onLongPressItem?.(item)}},500);",
  '0.5 second map-item long press',
);
replaceOnce(
  'if(!start||longTriggered)return;',
  "if(!start)return;\n      const holdDist=Math.hypot(e.clientX-start.x,e.clientY-start.y);\n      if(!longTriggered){if(holdDist>8){moved=true;clearTimeout(timer)}return}",
  'lock map-item movement until stationary long press',
);
replaceOnce(
  "pan:'拖曳地圖；拖曳既有物件可移動，按住物件 1 秒可調整'",
  "pan:'拖曳地圖；物件預設鎖定，按住 0.5 秒解鎖後才可移動／旋轉'",
  'map interaction hint',
);

replaceRegexOnce(
  /function locationAutoEnabled\(\) \{\s*return localGet\(LOCATION_AUTO_STORAGE\) === '1';\s*\}/,
  "function locationAutoEnabled() {\n    return localGet(LOCATION_AUTO_STORAGE) !== '0';\n  }",
  'location sharing default enabled',
);

replaceRegexOnce(
  /memberAvatarUrls\.set\(userId,\{path,url\}\);\s*renderMyAvatar\(\);/,
  "memberAvatarUrls.set(userId,{path,url});\n        renderMyAvatar();\n        renderMemberLocations();",
  'avatar refresh on location layer',
);

replaceRegexOnce(
  /(const marker=L\.marker\(\[loc\.lat,loc\.lng\],[\s\S]*?marker\.bindPopup\([^\n]+\)\s*)/,
  `$1\n    const jump=document.createElement("button");jump.type="button";jump.className="locationJumpAvatar";jump.title="跳到 "+(u.nick||"隊員")+" 的位置";\n    const jumpUrl=memberAvatarUrl(u.id);if(jumpUrl){const img=document.createElement("img");img.src=jumpUrl;img.alt="";jump.appendChild(img)}else{jump.textContent=(u.nick||"隊").trim().slice(0,2)||"隊"}\n    jump.onclick=e=>{e.preventDefault();e.stopPropagation();map.setView([loc.lat,loc.lng],Math.max(map.getZoom(),17));marker.openPopup()};row.prepend(jump);\n`,
  'member avatar jump-to-location button',
);

replaceOnce(
  '  let routeDraftPoints = [];\n  let routeDraftLayer = null;',
  `  let routeDraftPoints = [];
  let routeDraftLayer = null;
  let routePreviewLayer = null;
  let routePreviewTip = null;
  const routeNodeEditLayer = L.layerGroup().addTo(map);
  let routeEditingId = null;`,
  'route preview state',
);

replaceOnce(
  '  function redrawDraft() {',
  `  function clearRoutePreview() {
    if (routePreviewLayer) { try { map.removeLayer(routePreviewLayer); } catch {} routePreviewLayer = null; }
    if (routePreviewTip) { try { map.removeLayer(routePreviewTip); } catch {} routePreviewTip = null; }
  }

  function previewRouteTo(latlng) {
    clearRoutePreview();
    if (mapTool !== 'route' || !routeDraftPoints.length || !latlng) return;
    const last = routeDraftPoints[routeDraftPoints.length - 1];
    const a = L.latLng(last[0], last[1]);
    const segment = map.distance(a, latlng);
    routePreviewLayer = L.polyline([[a.lat,a.lng],[latlng.lat,latlng.lng]], {
      color:'#00e5ff', weight:4, opacity:.9, dashArray:'7,6', interactive:false,
    }).addTo(map);
    const mid = L.latLng((a.lat+latlng.lat)/2,(a.lng+latlng.lng)/2);
    routePreviewTip = L.tooltip({permanent:true,direction:'center',className:'routePreviewTooltip',interactive:false,opacity:1})
      .setLatLng(mid).setContent(routeDistanceText(segment)).addTo(map);
  }

  function clearRouteNodeEditor() {
    routeEditingId = null;
    routeNodeEditLayer.clearLayers();
  }

  function showRouteNodeEditor(item) {
    clearRouteNodeEditor();
    if (!item || item.type !== 'route' || !canEditItem(item)) return;
    routeEditingId = item.id;
    (item.points || []).forEach((p,index) => {
      const icon=L.divIcon({className:'',html:'<div class="route-node-delete">−</div>',iconSize:[30,30],iconAnchor:[15,15]});
      const node=L.marker([p[0],p[1]],{icon,keyboard:false,zIndexOffset:6200}).addTo(routeNodeEditLayer);
      node.bindTooltip('節點 '+(index+1)+' · 點一下刪除',{direction:'top',offset:[0,-12]});
      node.on('click',e=>{
        L.DomEvent.stopPropagation(e);
        const live=(state.map?.items||[]).find(x=>x.id===item.id);
        if(!live||!canEditItem(live))return;
        if((live.points||[]).length<=2){toast('導航路線至少要保留 2 個節點');return}
        pushMapHistory();
        live.points.splice(index,1);
        const distance=routeDistanceM(live.points||[]);live.distanceM=Math.round(distance);
        const speed=Number(live.speedKmh)||40;
        live.note='距離 '+routeDistanceText(distance)+'｜ETA '+routeEtaText(distance,speed)+'｜'+speed+' km/h';
        publish();renderMapItems();
        const refreshed=(state.map?.items||[]).find(x=>x.id===item.id);
        if(refreshed)showRouteNodeEditor(refreshed);
        toast('已刪除第 '+(index+1)+' 個節點');
      });
    });
  }

  function redrawDraft() {`,
  'route preview and node editor functions',
);

replaceOnce(
  '  function clearDraft() {\n    if (routeDraftLayer) {',
  '  function clearDraft() {\n    clearRoutePreview();\n    if (routeDraftLayer) {',
  'clear route preview with draft',
);

replaceOnce(
  '  $("routeDraftSpeed")?.addEventListener(\'input\', updateUi);',
  `  $("routeDraftSpeed")?.addEventListener('input', updateUi);
  map.on('mousemove', e => previewRouteTo(e.latlng));
  map.on('mouseout', clearRoutePreview);`,
  'route mouse preview listeners',
);

replaceOnce(
  '  window.__ktakRoute = {\n    addPoint,\n    renderList,',
  `  window.__ktakRoute = {
    addPoint,
    renderList,
    onLongPressItem(item) {
      if (item?.type === 'route') {
        showRouteNodeEditor(item);
        if (canEditItem(item)) toast('路線節點編輯：點紅色 − 可逐點刪除');
      } else {
        clearRouteNodeEditor();
      }
    },`,
  'route long-press editor hook',
);

fs.writeFileSync(file, html);
console.log('KTAK tactical UX integration applied.');

