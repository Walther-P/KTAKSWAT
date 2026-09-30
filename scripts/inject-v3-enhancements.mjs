import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`V3 enhancement marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`V3 enhancement regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const extraCss = `
/* KTAK Native V3 — mission enhancements */
.lineDistanceTooltip{background:rgba(7,14,18,.92)!important;color:#fff!important;border:1px solid #45aff2!important;border-radius:999px!important;box-shadow:0 3px 10px #0008!important;padding:3px 7px!important;font-size:10px!important;font-weight:850!important}
.lineDistanceTooltip::before{display:none!important}
.floorplanCard{border-color:#4b5f6a!important}.floorplanStatus{margin-top:7px;padding:7px 8px;border:1px solid #314854;border-radius:8px;background:#0b151a;font-size:10px;color:#a9bdc6;line-height:1.45}.floorplanActions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:7px}.floorplanActions button{font-size:11px}.googlePersonalCard{border-color:#4d5c70!important}.googlePersonalState{margin-top:6px;font-size:10px;color:#a6b9c3;line-height:1.45}.zeroCostBadge{display:inline-block;margin-top:6px;padding:3px 7px;border-radius:999px;background:#153c2a;border:1px solid #2c6b4a;color:#8ee0ad;font-size:9px;font-weight:850}
`;
replaceOnce('</style>', extraCss + '\n</style>', 'enhancement css');

const googleCard = `
  <div class="card googlePersonalCard">
    <h3>Google 底圖（自備 API Key）</h3>
    <div class="muted">KTAK 不使用共用 Google Maps 額度。需要 Google 底圖時，可在這台裝置填入你自己的 Google Maps JavaScript API Key；金鑰只存在這台裝置的瀏覽器儲存區。</div>
    <input id="personalGoogleKey" type="password" autocomplete="off" placeholder="貼上自己的 Google Maps API Key" style="margin-top:7px">
    <div class="row" style="margin-top:7px"><button id="personalGoogleSave" class="primary" style="flex:1">儲存並重新載入</button><button id="personalGoogleClear">清除</button></div>
    <div id="personalGoogleState" class="googlePersonalState"></div>
    <span class="zeroCostBadge">預設 OSM / Esri：不使用 KTAK Google 帳單</span>
  </div>
`;
replaceOnce('  <div class="card locationCard">', googleCard + '  <div class="card locationCard">', 'personal Google card');

const floorplanCard = `
  <div class="card floorplanCard">
    <h3>🗺 建築平面圖背景</h3>
    <div class="muted">可上傳建築物平面圖／樓層圖，系統會把照片固定在目前頁面的最底層，再直接在上面放友軍、敵軍、門、路線與戰術圖樣。</div>
    <input id="boardFloorplanInput" class="hidden" type="file" accept="image/*">
    <div class="floorplanActions"><button id="boardFloorplanSet" class="primary">📷 上傳／更換平面圖</button><button id="boardFloorplanRemove" class="danger">移除背景</button></div>
    <div id="boardFloorplanStatus" class="floorplanStatus">目前沒有平面圖背景</div>
  </div>
`;
replaceOnce('<aside class="boardSidebar" id="boardSidebar">\n', '<aside class="boardSidebar" id="boardSidebar">\n' + floorplanCard, 'board floorplan card');

replaceOnce(
  '<script src="./config.js"></script>',
  '<script src="./config.js"></script>\n<script type="module" src="./ktak-native-bridge.js"></script>',
  'native bridge script',
);

replaceOnce(
  'const googleMapsConfigured=!!(cfg.GOOGLE_MAPS_API_KEY&&!String(cfg.GOOGLE_MAPS_API_KEY).includes("YOUR_"));',
  'const googleMapsConfigured=(()=>{try{return !!(localStorage.getItem("ktak.googleMapsApiKey.v1")||"").trim()}catch{return false}})();',
  'personal Google configuration',
);

replaceOnce(
  'const locationLayer=L.layerGroup().addTo(map);',
  'const locationLayer=L.layerGroup().addTo(map);\nconst distanceLayer=L.layerGroup().addTo(map);',
  'distance layer',
);

function ktakV3Enhancements() {
  const DEVICE_KEY_STORAGE = 'ktak.deviceKey.v1';
  const ROOM_UUID_STORAGE = 'ktak.v16.roomUuid';
  const ROOM_CODE_STORAGE = 'ktak.v16.room';
  const LOCATION_AUTO_STORAGE = 'ktak.locationAuto.v1';
  const GOOGLE_KEY_STORAGE = 'ktak.googleMapsApiKey.v1';
  const floorplanCache = new Map();
  let nativeLocationTokenExpiresAt = null;

  function localGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function localSet(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }
  function localRemove(key) {
    try { localStorage.removeItem(key); } catch {}
  }
  function deviceKey() {
    let key = localGet(DEVICE_KEY_STORAGE);
    if (key && key.length >= 24) return key;
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    key = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    localSet(DEVICE_KEY_STORAGE, key);
    return key;
  }
  function rememberRoom(roomUuid, roomCode) {
    if (roomUuid) localSet(ROOM_UUID_STORAGE, roomUuid);
    if (roomCode) localSet(ROOM_CODE_STORAGE, roomCode);
    try {
      if (roomUuid) sessionStorage.setItem(ROOM_UUID_STORAGE, roomUuid);
      if (roomCode) sessionStorage.setItem(ROOM_CODE_STORAGE, roomCode);
    } catch {}
  }
  function forgetRoom() {
    localRemove(ROOM_UUID_STORAGE);
    localRemove(ROOM_CODE_STORAGE);
    try {
      sessionStorage.removeItem(ROOM_UUID_STORAGE);
      sessionStorage.removeItem(ROOM_CODE_STORAGE);
    } catch {}
  }
  function savedRoomUuid() {
    const value = localGet(ROOM_UUID_STORAGE);
    if (value) return value;
    try { return sessionStorage.getItem(ROOM_UUID_STORAGE) || ''; } catch { return ''; }
  }
  function savedRoomCode() {
    const value = localGet(ROOM_CODE_STORAGE);
    if (value) return value;
    try { return sessionStorage.getItem(ROOM_CODE_STORAGE) || '房間'; } catch { return '房間'; }
  }
  function locationAutoEnabled() {
    return localGet(LOCATION_AUTO_STORAGE) === '1';
  }
  function setLocationAuto(enabled) {
    localSet(LOCATION_AUTO_STORAGE, enabled ? '1' : '0');
  }
  function googleKey() {
    return (localGet(GOOGLE_KEY_STORAGE) || '').trim();
  }
  async function touchMember() {
    if (!sb || !currentRoomUuid || !currentUserId) return false;
    const { error } = await sb.rpc('ktak_touch_member', {
      p_room_id: currentRoomUuid,
      p_device_key: deviceKey(),
    });
    if (error) throw error;
    return true;
  }
  async function nativeBridge(waitMs = 900) {
    if (window.KTAK_NATIVE_BRIDGE) return window.KTAK_NATIVE_BRIDGE;
    await new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; clearTimeout(timer); window.removeEventListener('ktak-native-bridge-ready', finish); resolve(); };
      const timer = setTimeout(finish, waitMs);
      window.addEventListener('ktak-native-bridge-ready', finish, { once: true });
    });
    return window.KTAK_NATIVE_BRIDGE || null;
  }
  function handleNativeFix(location, error) {
    if (error) {
      console.warn('native background geolocation', error);
      setLocationUi('warn', '背景定位異常', error.message || '原生背景定位暫時無法更新，系統會繼續嘗試。');
      return;
    }
    if (!locationSharing || !location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return;
    const loc = {
      userId: currentUserId,
      lat: Number(location.latitude),
      lng: Number(location.longitude),
      accuracyM: Number.isFinite(Number(location.accuracy)) ? Number(location.accuracy) : null,
      updatedAt: new Date(location.time || Date.now()).toISOString(),
    };
    memberLocations[currentUserId] = loc;
    setLocationUi('live', '背景分享中', '原生背景定位已啟用；切換到其他 App 時仍會由手機原生服務直接更新位置。');
    renderMemberLocations();
  }
  async function startNativeLocationIfAvailable() {
    const bridge = await nativeBridge();
    if (!bridge?.isNative?.()) return false;
    if (!sb || !currentRoomUuid || !currentUserId) throw new Error('尚未加入任務房間');
    await touchMember();
    const { data, error } = await sb.rpc('ktak_issue_location_token', {
      p_room_id: currentRoomUuid,
      p_device_key: deviceKey(),
    });
    if (error) throw error;
    if (!data?.token) throw new Error('背景定位 token 建立失敗');
    nativeLocationTokenExpiresAt = data.expires_at || null;
    locationSharing = true;
    setLocationAuto(true);
    setLocationUi('warn', '啟動背景定位', '正在啟動手機原生背景定位服務…');
    await bridge.startBackgroundLocation({
      url: String(cfg.SUPABASE_URL || '').replace(/\/+$/, '') + '/rest/v1/rpc/ktak_ingest_location',
      headers: {
        apikey: cfg.SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
        'x-ktak-location-token': data.token,
      },
      minIntervalMs: 5000,
    }, handleNativeFix);
    setLocationUi('live', '背景分享中', '原生背景定位已啟用；只要不是由系統限制或在 iPhone 上強制結束 App，切換到其他 App 時仍會持續更新。');
    return true;
  }
  async function stopNativeLocation() {
    const bridge = await nativeBridge(150);
    if (bridge?.isNative?.()) {
      try { await bridge.stopBackgroundLocation(); } catch (error) { console.warn('stop native location', error); }
    }
    if (sb && currentRoomUuid && currentUserId) {
      try { await sb.rpc('ktak_revoke_location_token', { p_room_id: currentRoomUuid }); } catch (error) { console.warn('revoke native location token', error); }
    }
    nativeLocationTokenExpiresAt = null;
  }
  function restoreAutoLocationSoon() {
    if (!locationAutoEnabled()) return;
    setTimeout(() => {
      if (state && currentRoomUuid && !locationSharing) startLocationSharing().catch(error => console.warn('auto location restore', error));
    }, 500);
  }

  function lineDistanceText(meters) {
    const m = Math.max(0, Number(meters) || 0);
    return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 2 : 1) + ' km';
  }
  function renderLineDistance(item) {
    const points = item?.points || [];
    if (points.length < 2) return;
    const a = L.latLng(points[0][0], points[0][1]);
    const b = L.latLng(points[points.length - 1][0], points[points.length - 1][1]);
    const meters = Number(item.distanceM) || map.distance(a, b);
    const midpoint = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
    L.tooltip({ permanent: true, direction: 'center', className: 'lineDistanceTooltip', interactive: false, opacity: 1 })
      .setLatLng(midpoint)
      .setContent(lineDistanceText(meters))
      .addTo(distanceLayer);
  }
  function labelLinePreview(layer, a, b) {
    if (!layer || !a || !b) return;
    const meters = map.distance(a, b);
    layer.bindTooltip(lineDistanceText(meters), { permanent: true, direction: 'center', className: 'lineDistanceTooltip', opacity: 1 }).openTooltip();
  }

  function floorplanObject() {
    try { return (floor()?.objects || []).find(o => o.type === 'floorplan') || null; } catch { return null; }
  }
  function updateFloorplanUi() {
    const status = $('boardFloorplanStatus');
    const remove = $('boardFloorplanRemove');
    const obj = floorplanObject();
    if (status) status.textContent = obj ? '✓ 目前頁面已套用平面圖背景；戰術物件會繪製在照片上方。' : '目前沒有平面圖背景';
    if (remove) remove.disabled = !obj || !can('board');
  }
  function requestFloorplanImage(obj) {
    if (!obj?.photoPath) return null;
    const cached = floorplanCache.get(obj.photoPath);
    if (cached?.img?.complete && cached.img.naturalWidth) return cached.img;
    if (cached?.loading) return null;
    floorplanCache.set(obj.photoPath, { loading: true });
    signedObjectMediaUrl(obj.photoPath)
      .then(url => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('平面圖載入失敗'));
        img.src = url;
      }))
      .then(img => { floorplanCache.set(obj.photoPath, { loading: false, img }); renderBoard(); })
      .catch(error => { floorplanCache.set(obj.photoPath, { loading: false, error }); console.warn('floorplan image', error); updateFloorplanUi(); });
    return null;
  }
  function drawBoardFloorplan() {
    const obj = floorplanObject();
    updateFloorplanUi();
    if (!obj?.photoPath) return;
    const img = requestFloorplanImage(obj);
    if (!img) return;
    const pad = 20;
    const scale = Math.min((canvas.width - pad * 2) / img.naturalWidth, (canvas.height - pad * 2) / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.save();
    ctx.globalAlpha = Number.isFinite(Number(obj.opacity)) ? Number(obj.opacity) : 0.92;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }
  async function uploadFloorplanFile(file) {
    if (!file?.type?.startsWith('image/')) throw new Error('請選擇平面圖圖片');
    if (file.size > 20 * 1024 * 1024) throw new Error('原始平面圖請小於 20MB');
    const packed = await compressImageFile(file, 2200, .82, 1100 * 1024);
    const path = currentRoomUuid + '/' + currentUserId + '/floorplan/' + safeUuid() + '.jpg';
    const { error } = await sb.storage.from('ktak-object-media').upload(path, packed.blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
    if (error) throw error;
    return { path, bytes: packed.compressedBytes };
  }
  async function setFloorplan(file) {
    if (!can('board')) { toast('目前角色只能觀看'); return; }
    const status = $('boardFloorplanStatus');
    if (status) status.textContent = '平面圖壓縮與上傳中…';
    const old = floorplanObject();
    const result = await uploadFloorplanFile(file);
    pushBoardHistory();
    if (old) {
      const oldPath = old.photoPath;
      old.photoPath = result.path;
      old.ownerId = currentUserId;
      old.ownerName = displayName();
      old.opacity = .92;
      if (oldPath && oldPath !== result.path) removeObjectMedia(oldPath).catch(() => {});
    } else {
      floor().objects.unshift({ id: uid(), type: 'floorplan', photoPath: result.path, opacity: .92, ownerId: currentUserId, ownerName: displayName(), note: '建築平面圖背景' });
    }
    publish();
    renderBoard();
    toast('平面圖背景已套用');
  }
  async function removeFloorplan() {
    if (!can('board')) { toast('目前角色只能觀看'); return; }
    const obj = floorplanObject();
    if (!obj) return;
    pushBoardHistory();
    floor().objects = floor().objects.filter(o => o.id !== obj.id);
    publish();
    renderBoard();
    if (obj.photoPath) await removeObjectMedia(obj.photoPath);
    toast('平面圖背景已移除');
  }

  const keyInput = $('personalGoogleKey');
  const keyState = $('personalGoogleState');
  if (keyInput) keyInput.value = googleKey();
  if (keyState) keyState.textContent = googleKey() ? '✓ 這台裝置已設定自備 Google API Key。' : '未設定：KTAK 會使用 OSM／Esri，不會消耗 KTAK 的 Google Maps 額度。';
  $('personalGoogleSave')?.addEventListener('click', () => {
    const key = (keyInput?.value || '').trim();
    if (!key) { toast('請先貼上自己的 Google Maps API Key'); return; }
    localSet(GOOGLE_KEY_STORAGE, key);
    location.reload();
  });
  $('personalGoogleClear')?.addEventListener('click', () => { localRemove(GOOGLE_KEY_STORAGE); location.reload(); });

  $('boardFloorplanSet')?.addEventListener('click', () => {
    if (!can('board')) { toast('目前角色只能觀看'); return; }
    const input = $('boardFloorplanInput'); if (input) { input.value = ''; input.click(); }
  });
  $('boardFloorplanRemove')?.addEventListener('click', () => removeFloorplan().catch(error => toast('移除失敗：' + error.message)));
  $('boardFloorplanInput')?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFloorplan(file).catch(error => { console.error(error); toast('平面圖上傳失敗：' + error.message); updateFloorplanUi(); });
  });

  window.__ktakEnhance = {
    deviceKey,
    rememberRoom,
    forgetRoom,
    savedRoomUuid,
    savedRoomCode,
    touchMember,
    locationAutoEnabled,
    setLocationAuto,
    restoreAutoLocationSoon,
    startNativeLocationIfAvailable,
    stopNativeLocation,
    isNative: () => Boolean(window.KTAK_NATIVE_BRIDGE?.isNative?.()),
    googleKey,
    lineDistanceText,
    renderLineDistance,
    labelLinePreview,
    drawBoardFloorplan,
    updateFloorplanUi,
  };
}

const runtimeMarker = 'const locationLayer=L.layerGroup().addTo(map);\nconst distanceLayer=L.layerGroup().addTo(map);';
replaceOnce(runtimeMarker, runtimeMarker + '\n;(' + ktakV3Enhancements.toString() + ')();', 'V3 enhancement runtime');

replaceOnce(
  'async function claimGoogleMapLoadSlot(){\n  if(googleMapSlotClaimed)return true;',
  'async function claimGoogleMapLoadSlot(){\n  if(window.__ktakEnhance?.googleKey()){googleMapSlotClaimed=true;googleMapGateDenied=false;googleMapGateInfo={used:null,limit:null,reason:"自備 API Key"};return true}\n  if(googleMapSlotClaimed)return true;',
  'personal Google cost gate',
);
replaceOnce(
  'encodeURIComponent(cfg.GOOGLE_MAPS_API_KEY)',
  "encodeURIComponent(window.__ktakEnhance?.googleKey()||'')",
  'personal Google loader key',
);

replaceOnce(
  'function renderMapItems(){\n  mapLayer.clearLayers();renderFansOnly();',
  'function renderMapItems(){\n  mapLayer.clearLayers();distanceLayer.clearLayers();renderFansOnly();',
  'clear line distance labels',
);
replaceOnce(
  '      layer.addTo(mapLayer)\n    }\n  });',
  "      layer.addTo(mapLayer)\n    }\n    if(item.type==='line')window.__ktakEnhance?.renderLineDistance(item);\n  });",
  'render line distance labels',
);
replaceOnce(
  "if(mapTool==='line')state.map.items.push({id:uid(),type:'line',points:[[drawStart.lat,drawStart.lng],[e.latlng.lat,e.latlng.lng]],rotation:0,color:currentColor,ownerId:currentUserId,ownerName:displayName()});",
  "if(mapTool==='line')state.map.items.push({id:uid(),type:'line',points:[[drawStart.lat,drawStart.lng],[e.latlng.lat,e.latlng.lng]],distanceM:Math.round(map.distance(drawStart,e.latlng)),rotation:0,color:currentColor,ownerId:currentUserId,ownerName:displayName()});",
  'persist straight line distance',
);
replaceOnce(
  "if(mapTool==='line')preview=L.polyline([[drawStart.lat,drawStart.lng],[e.latlng.lat,e.latlng.lng]],{color:currentColor,dashArray:'5,5'}).addTo(map);",
  "if(mapTool==='line'){preview=L.polyline([[drawStart.lat,drawStart.lng],[e.latlng.lat,e.latlng.lng]],{color:currentColor,dashArray:'5,5'}).addTo(map);window.__ktakEnhance?.labelLinePreview(preview,drawStart,e.latlng)}",
  'live straight line distance',
);

replaceOnce(
  "ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f7f7f4';ctx.fillRect(0,0,canvas.width,canvas.height);\n  ctx.strokeStyle='#e4e4de';",
  "ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f7f7f4';ctx.fillRect(0,0,canvas.width,canvas.height);\n  window.__ktakEnhance?.drawBoardFloorplan();\n  ctx.strokeStyle='rgba(228,228,222,.72)';",
  'draw board floorplan background',
);
replaceOnce(
  '  floor().objects.forEach(drawBoardObject);if(previewObj)drawBoardObject(previewObj);',
  "  floor().objects.filter(o=>o.type!=='floorplan').forEach(drawBoardObject);if(previewObj&&previewObj.type!=='floorplan')drawBoardObject(previewObj);",
  'floorplan under tactical objects',
);
replaceOnce(
  '  if(!boardWrap.style.width) updateBoardScale()\n}',
  '  window.__ktakEnhance?.updateFloorplanUi();\n  if(!boardWrap.style.width) updateBoardScale()\n}',
  'floorplan status refresh',
);
replaceOnce(
  '$("clearBoardBtn").onclick=()=>{if(!can(\'board\')){toast(\'目前角色只能觀看\');return}if(!confirm(\'清空目前頁面？\'))return;pushBoardHistory();floor().objects=[];publish();renderBoard()};',
  '$("clearBoardBtn").onclick=async()=>{if(!can(\'board\')){toast(\'目前角色只能觀看\');return}if(!confirm(\'清空目前頁面？\'))return;const media=(floor().objects||[]).map(o=>o.photoPath).filter(Boolean);pushBoardHistory();floor().objects=[];publish();renderBoard();for(const path of media)try{await removeObjectMedia(path)}catch{}};',
  'board clear removes media',
);

replaceOnce(
  'function beginLocationWatchFromGrantedFix(pos){\n  locationSharing=true;',
  'function beginLocationWatchFromGrantedFix(pos){\n  locationSharing=true;window.__ktakEnhance?.setLocationAuto(true);',
  'auto-enable location after permission',
);
replaceOnce(
  'function startLocationSharing(){\n  if(locationSharing)return;',
  'async function startLocationSharing(){\n  if(locationSharing)return;\n  try{if(await window.__ktakEnhance?.startNativeLocationIfAvailable())return}catch(e){console.error("native location start",e);setLocationUi("warn","背景定位啟動失敗",e.message||"原生背景定位無法啟動");return}',
  'native-first location start',
);
replaceOnce(
  'async function stopLocationSharing({removeRemote=true,silent=false}={}){\n  locationSharing=false;',
  'async function stopLocationSharing({removeRemote=true,silent=false,disablePreference=false}={}){\n  locationSharing=false;if(disablePreference)window.__ktakEnhance?.setLocationAuto(false);await window.__ktakEnhance?.stopNativeLocation();',
  'native location stop',
);
replaceOnce(
  '$("locationShareBtn").onclick=()=>locationSharing?stopLocationSharing():startLocationSharing();',
  '$("locationShareBtn").onclick=()=>locationSharing?stopLocationSharing({disablePreference:true}):startLocationSharing();',
  'explicit location preference toggle',
);
replaceOnce(
  '  locationSharing=false;\n  if(locationWatchId!==null)',
  '  locationSharing=false;window.__ktakEnhance?.setLocationAuto(false);\n  if(locationWatchId!==null)',
  'permission denial disables auto location',
);

replaceOnce(
  'async function enterRoom(){\n  sessionStorage.setItem("ktak.v16.roomUuid",currentRoomUuid);\n  sessionStorage.setItem("ktak.v16.room",roomId);\n  $("entryOverlay").classList.add("hidden");\n  renderAll();\n  await setupRealtime()\n}',
  'async function enterRoom(){\n  window.__ktakEnhance?.rememberRoom(currentRoomUuid,roomId);\n  $("entryOverlay").classList.add("hidden");\n  renderAll();\n  try{await window.__ktakEnhance?.touchMember()}catch(e){console.warn("member touch",e)}\n  await setupRealtime();\n  window.__ktakEnhance?.restoreAutoLocationSoon()\n}',
  'persistent room entry',
);
replaceOnce(
  '  sessionStorage.setItem("ktak.v16.roomUuid",roomUuid);\n  sessionStorage.setItem("ktak.v16.room",roomCode);',
  '  window.__ktakEnhance?.rememberRoom(roomUuid,roomCode);',
  'persistent pending room',
);
replaceOnce(
  'const savedRoom=sessionStorage.getItem("ktak.v16.roomUuid");',
  'const savedRoom=window.__ktakEnhance?.savedRoomUuid()||"";',
  'persistent room restore uuid',
);
replaceOnce(
  'const savedCode=sessionStorage.getItem("ktak.v16.room")||"房間";',
  'const savedCode=window.__ktakEnhance?.savedRoomCode()||"房間";',
  'persistent room restore code',
);

replaceOnce(
  'const {data,error}=await sb.rpc("ktak_join_room",{p_code:r,p_password:pass,p_nick:nick,p_requested_role:"tactical"});',
  'const {data,error}=await sb.rpc("ktak_join_room_v3",{p_code:r,p_password:pass,p_nick:nick,p_requested_role:"tactical",p_device_key:window.__ktakEnhance.deviceKey()});',
  'device-stable room join',
);

replaceOnce(
  '    currentUserId=session.user.id;\n    await Promise.all([fetchMembers(),fetchBrief(),fetchMap(),fetchBoard(),fetchChat(),fetchLocations()]);',
  '    currentUserId=session.user.id;\n    try{await window.__ktakEnhance?.touchMember()}catch(e){console.warn("member touch resume",e)}\n    await Promise.all([fetchMembers(),fetchBrief(),fetchMap(),fetchBoard(),fetchChat(),fetchLocations()]);',
  'member heartbeat on resume',
);
replaceOnce(
  '    renderAll();await setupRealtime();if(locationSharing)armLocationWatch();toast("已恢復線上連線")',
  '    renderAll();await setupRealtime();if(locationSharing&&!window.__ktakEnhance?.isNative())armLocationWatch();else if(!locationSharing&&window.__ktakEnhance?.locationAutoEnabled())window.__ktakEnhance.restoreAutoLocationSoon();toast("已恢復線上連線")',
  'location resume behavior',
);

replaceRegexOnce(
  /\$\("leaveBtn"\)\.onclick=async\(\)=>\{try\{await stopLocationSharing\(\{removeRemote:true,silent:true\}\);if\(roomChannel&&sb\)await sb\.removeChannel\(roomChannel\)\}catch\{\}sessionStorage\.removeItem\("ktak\.v16\.roomUuid"\);sessionStorage\.removeItem\("ktak\.v16\.room"\);location\.reload\(\)\};/,
  '$("leaveBtn").onclick=async()=>{try{await stopLocationSharing({removeRemote:true,silent:true});if(sb&&currentRoomUuid)await sb.rpc("ktak_leave_room",{p_room_id:currentRoomUuid});if(roomChannel&&sb)await sb.removeChannel(roomChannel)}catch(e){console.warn("leave room",e)}window.__ktakEnhance?.forgetRoom();location.reload()};',
  'leave removes membership',
);

html = html.replace(/sessionStorage\.removeItem\("ktak\.v16\.roomUuid"\);\s*sessionStorage\.removeItem\("ktak\.v16\.room"\);/g, 'window.__ktakEnhance?.forgetRoom();');

replaceOnce(
  '        onlineReady=true;\n        await roomChannel.track',
  '        onlineReady=true;\n        try{await window.__ktakEnhance?.touchMember()}catch(e){console.warn("member touch realtime",e)}\n        await roomChannel.track',
  'member heartbeat on realtime subscribe',
);

if (!html.includes('id="boardFloorplanSet"') || !html.includes('lineDistanceTooltip') || !html.includes('ktak_join_room_v3') || !html.includes('ktak.locationAuto.v1') || !html.includes('Google 底圖（自備 API Key）') || !html.includes('ktak-native-bridge.js')) {
  throw new Error('V3 enhancement self-check failed');
}

fs.writeFileSync(file, html);
console.log('Integrated line distance, board floorplan, stable identity, auto/background location, personal Google key, and zero-cost defaults.');

