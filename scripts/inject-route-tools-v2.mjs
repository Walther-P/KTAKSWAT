import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Route integration marker missing: ${label}`);
  html = html.replace(marker, replacement);
}

const css = `
/* KTAK Native V3 — integrated shared route drawing */
.routeDraftCard{border-color:#356171!important;background:linear-gradient(180deg,#10232c,#101b21)!important}
.routeDraftActions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}
.routeDraftActions button{font-size:10px;padding:7px 5px}
.routeDraftStats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.routeDraftStat{padding:7px 8px;border:1px solid #304651;border-radius:8px;background:#0b151a;min-width:0}
.routeDraftStat small{display:block;color:#91a7b2;font-size:9px;margin-bottom:3px}
.routeDraftStat b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.routeSharedList{display:grid;gap:5px;margin-top:8px}
.routeSharedRow{display:grid;grid-template-columns:1fr auto;gap:5px;align-items:center;padding:6px;border:1px solid #334a55;border-radius:8px;background:#0c171c}
.routeSharedMain{min-width:0;background:transparent;border:0;padding:2px;text-align:left;font-weight:750}
.routeSharedMain small{display:block;margin-top:2px;color:#93a9b3;font-size:9px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.routeSharedDelete{padding:5px 7px!important;font-size:10px!important;background:#572727!important;border-color:#814040!important}
.routeLegend{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:7px;color:#9fb1ba;font-size:9px}
.routeLegend span::before{content:'';display:inline-block;width:18px;height:4px;border-radius:99px;margin-right:4px;vertical-align:middle;background:#00e5ff}
.routeLegend span.saved::before{background:#ffb300}
@media(max-width:600px){.routeDraftStats{grid-template-columns:1fr 1fr}.routeDraftActions{grid-template-columns:1fr 1fr}}
`;
replaceOnce('</style>', css + '\n</style>', 'style');

const card = `
  <div class="card routeDraftCard" id="routeDraftCard">
    <div class="flexBetween"><h3 style="margin:0">🧭 導航路線</h3><span id="routeDraftState" class="locationState off">未繪製</span></div>
    <div class="muted" style="margin-top:6px">按「開始畫路線」後，在地圖連續點選路徑。這是戰術規劃線，可同步給同房隊員。</div>
    <input id="routeDraftName" placeholder="路線名稱，例如：A組進入路線" style="margin-top:7px">
    <div class="row" style="margin-top:7px;align-items:center"><input id="routeDraftSpeed" type="number" min="1" max="160" value="40" inputmode="decimal"><span class="muted" style="white-space:nowrap">km/h</span></div>
    <div class="routeDraftActions">
      <button id="routeDraftStart" class="primary">開始畫路線</button>
      <button id="routeDraftUndo">↶ 復原一點</button>
      <button id="routeDraftClear">清除</button>
      <button id="routeDraftSave" class="good" style="grid-column:1/-1">儲存並共享</button>
    </div>
    <div class="routeDraftStats">
      <div class="routeDraftStat"><small>節點</small><b id="routeDraftPoints">0</b></div>
      <div class="routeDraftStat"><small>距離</small><b id="routeDraftDistance">0 m</b></div>
      <div class="routeDraftStat"><small>ETA</small><b id="routeDraftEta">—</b></div>
    </div>
    <div class="routeLegend"><span>目前草稿</span><span class="saved">已共享路線</span></div>
    <div class="label" style="margin-top:9px">共享路線</div>
    <div id="routeSharedList" class="routeSharedList"><div class="muted">目前沒有共享路線</div></div>
  </div>
`;
replaceOnce('  <div class="card"><h3>地圖操作</h3>', card + '  <div class="card"><h3>地圖操作</h3>', 'map sidebar route card');

replaceOnce(
  'function mapItemTypeName(item){\n  if(item.type==="symbol")return item.label||allIconDefs[item.icon]?.[1]||"圖樣";',
  'function mapItemTypeName(item){\n  if(item.type==="route")return item.label||"導航路線";\n  if(item.type==="symbol")return item.label||allIconDefs[item.icon]?.[1]||"圖樣";',
  'map item type name',
);

function ktakRouteFeature() {
  let routeDraftPoints = [];
  let routeDraftLayer = null;

  function routeDistanceM(points) {
    if (!Array.isArray(points) || points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += map.distance(
        L.latLng(points[i - 1][0], points[i - 1][1]),
        L.latLng(points[i][0], points[i][1]),
      );
    }
    return total;
  }

  function routeDistanceText(m) {
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km';
  }

  function routeEtaText(m, speed) {
    speed = Math.max(1, Number(speed) || 40);
    if (m <= 0) return '—';
    const sec = m / (speed * 1000 / 3600);
    if (sec < 60) return Math.max(1, Math.round(sec)) + ' 秒';
    if (sec < 3600) return Math.max(1, Math.round(sec / 60)) + ' 分';
    const h = Math.floor(sec / 3600);
    const min = Math.round((sec % 3600) / 60);
    return h + ' 小時' + (min ? ' ' + min + ' 分' : '');
  }

  function updateUi() {
    const distance = routeDistanceM(routeDraftPoints);
    const speed = Number($("routeDraftSpeed")?.value) || 40;
    if ($("routeDraftPoints")) $("routeDraftPoints").textContent = String(routeDraftPoints.length);
    if ($("routeDraftDistance")) $("routeDraftDistance").textContent = routeDistanceText(distance);
    if ($("routeDraftEta")) $("routeDraftEta").textContent = routeEtaText(distance, speed);
    const stateEl = $("routeDraftState");
    if (stateEl) {
      stateEl.textContent = mapTool === 'route' ? '繪製中' : routeDraftPoints.length ? '草稿' : '未繪製';
      stateEl.className = 'locationState ' + (mapTool === 'route' ? 'live' : routeDraftPoints.length ? 'warn' : 'off');
    }
    const save = $("routeDraftSave");
    if (save) save.disabled = routeDraftPoints.length < 2;
  }

  function redrawDraft() {
    if (routeDraftLayer) {
      try { map.removeLayer(routeDraftLayer); } catch {}
      routeDraftLayer = null;
    }
    if (routeDraftPoints.length >= 2) {
      routeDraftLayer = L.polyline(routeDraftPoints, {
        color: '#00e5ff', weight: 5, opacity: 1, dashArray: '10,5', interactive: false,
      }).addTo(map);
    }
    updateUi();
  }

  function clearDraft() {
    if (routeDraftLayer) {
      try { map.removeLayer(routeDraftLayer); } catch {}
      routeDraftLayer = null;
    }
    routeDraftPoints = [];
    updateUi();
  }

  function begin() {
    if (!can('map')) { toast('目前角色只能觀看'); return; }
    clearDraft();
    setMapTool('route');
    updateUi();
    if (matchMedia('(max-width:820px)').matches) $("mapSidebar")?.classList.remove('open');
    toast('導航路線：請依序點選地圖節點');
  }

  function addPoint(latlng) {
    routeDraftPoints.push([latlng.lat, latlng.lng]);
    redrawDraft();
    toast('已加入第 ' + routeDraftPoints.length + ' 個路線節點');
  }

  function undoPoint() {
    if (routeDraftPoints.length) routeDraftPoints.pop();
    redrawDraft();
  }

  function save() {
    if (!can('map')) { toast('目前角色只能觀看'); return; }
    if (routeDraftPoints.length < 2) { toast('至少需要 2 個路線節點'); return; }
    const speed = Math.max(1, Math.min(160, Number($("routeDraftSpeed")?.value) || 40));
    const distance = routeDistanceM(routeDraftPoints);
    const routeCount = (state?.map?.items || []).filter(x => x.type === 'route').length;
    const name = $("routeDraftName")?.value.trim() || ('導航路線 ' + (routeCount + 1));
    pushMapHistory();
    state.map.items.push({
      id: uid(),
      type: 'route',
      label: name,
      points: routeDraftPoints.map(p => [p[0], p[1]]),
      color: '#ffb300',
      speedKmh: speed,
      distanceM: Math.round(distance),
      note: '距離 ' + routeDistanceText(distance) + '｜ETA ' + routeEtaText(distance, speed) + '｜' + speed + ' km/h',
      ownerId: currentUserId,
      ownerName: displayName(),
      createdAt: now(),
    });
    routeDraftPoints = [];
    clearDraft();
    setMapTool('pan');
    publish();
    renderMapItems();
    if ($("routeDraftName")) $("routeDraftName").value = '';
    toast('導航路線已儲存並共享');
  }

  function renderList() {
    const host = $("routeSharedList");
    if (!host || !state) return;
    const routes = (state.map?.items || []).filter(x => x.type === 'route');
    host.innerHTML = '';
    if (!routes.length) {
      host.innerHTML = '<div class="muted">目前沒有共享路線</div>';
      return;
    }
    routes.forEach(item => {
      const row = document.createElement('div');
      row.className = 'routeSharedRow';
      const main = document.createElement('button');
      main.className = 'routeSharedMain';
      const distance = Number(item.distanceM) || routeDistanceM(item.points || []);
      const speed = Number(item.speedKmh) || 40;
      main.textContent = item.label || '導航路線';
      const meta = document.createElement('small');
      meta.textContent = routeDistanceText(distance) + ' · ETA ' + routeEtaText(distance, speed) + ' · ' + speed + ' km/h';
      main.appendChild(meta);
      main.onclick = () => {
        const bounds = L.latLngBounds(item.points || []);
        if (bounds.isValid()) map.fitBounds(bounds.pad(.15));
      };
      row.appendChild(main);
      if (canEditItem(item)) {
        const del = document.createElement('button');
        del.className = 'routeSharedDelete';
        del.textContent = '刪除';
        del.onclick = () => {
          if (!confirm('刪除「' + (item.label || '導航路線') + '」？')) return;
          pushMapHistory();
          state.map.items = state.map.items.filter(x => x.id !== item.id);
          publish();
          renderMapItems();
          toast('路線已刪除');
        };
        row.appendChild(del);
      }
      host.appendChild(row);
    });
  }

  $("routeDraftStart")?.addEventListener('click', begin);
  $("routeDraftUndo")?.addEventListener('click', undoPoint);
  $("routeDraftClear")?.addEventListener('click', () => {
    clearDraft();
    if (mapTool === 'route') setMapTool('pan');
  });
  $("routeDraftSave")?.addEventListener('click', save);
  $("routeDraftSpeed")?.addEventListener('input', updateUi);

  window.__ktakRoute = {
    addPoint,
    renderList,
    resetIfLeaving(nextTool) {
      if (mapTool === 'route' && nextTool !== 'route' && routeDraftPoints.length) clearDraft();
    },
  };
  updateUi();
}

const mapVarsMarker = "let mapTool='pan',mapIcon=null,currentColor='#45aff2',mapHistory=[],drawStart=null,preview=null,freePoints=[],freeDrawing=false,pendingPhoto=null,selectedMapId=null,fanTargetId=null,mapTapMemory={id:null,at:0,timer:null};\nconst coarsePointer=matchMedia('(pointer:coarse)').matches;";
replaceOnce(
  mapVarsMarker,
  mapVarsMarker + '\n;(' + ktakRouteFeature.toString() + ')();',
  'route runtime',
);

replaceOnce(
  "    if(item.type==='line'||item.type==='free')layer=L.polyline(item.points,{color:item.color||'#45aff2',weight:4});",
  "    if(item.type==='route')layer=L.polyline(item.points,{color:item.color||'#ffb300',weight:5,opacity:.95});\n    else if(item.type==='line'||item.type==='free')layer=L.polyline(item.points,{color:item.color||'#45aff2',weight:4});",
  'route rendering',
);

replaceOnce(
  '  renderMapSelection()\n}\n\nfunction cursorFor(t){',
  '  renderMapSelection();window.__ktakRoute?.renderList()\n}\n\nfunction cursorFor(t){',
  'route list refresh',
);

replaceOnce(
  "function cursorFor(t){if(t==='pan')return 'grab';if(t==='line')return 'crosshair';",
  "function cursorFor(t){if(t==='pan')return 'grab';if(t==='route')return 'crosshair';if(t==='line')return 'crosshair';",
  'route cursor',
);

replaceOnce(
  "function setMapTool(t){\n  if(t!=='pan'&&!can('map')){toast('目前角色只能觀看');return}\n  fanTargetId=null;drawStart=null;clearPreview();mapTool=t;mapIcon=null;pendingPhoto=null;hideMapMenu();",
  "function setMapTool(t){\n  if(t!=='pan'&&!can('map')){toast('目前角色只能觀看');return}\n  window.__ktakRoute?.resetIfLeaving(t);\n  fanTargetId=null;drawStart=null;clearPreview();mapTool=t;mapIcon=null;pendingPhoto=null;hideMapMenu();",
  'route tool switching',
);

replaceOnce(
  "const text={pan:'拖曳地圖；拖曳既有物件可移動，按住物件 1 秒可調整',line:'點起點再點終點畫直線',rect:'點第一角再點對角',circle:'點圓心再點邊界',free:'按住並拖曳自由畫'}[t]||'放置物件';",
  "const text={pan:'拖曳地圖；拖曳既有物件可移動，按住物件 1 秒可調整',route:'依序點地圖加入導航路線節點，完成後按「儲存並共享」',line:'點起點再點終點畫直線',rect:'點第一角再點對角',circle:'點圓心再點邊界',free:'按住並拖曳自由畫'}[t]||'放置物件';",
  'route hint',
);

replaceOnce(
  "  if(!can('map')){toast('目前角色只能觀看');return}\n  if(mapTool==='symbol'&&mapIcon){",
  "  if(!can('map')){toast('目前角色只能觀看');return}\n  if(mapTool==='route'){window.__ktakRoute?.addPoint(e.latlng);return}\n  if(mapTool==='symbol'&&mapIcon){",
  'route map click',
);

if (!html.includes('id="routeDraftStart"') || !html.includes("item.type==='route'")) {
  throw new Error('Route integration self-check failed');
}
fs.writeFileSync(file, html);
console.log('Integrated V3 shared route drawing into the full KTAK mission map.');

