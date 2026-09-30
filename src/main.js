import './styles.css';
import {
  bootstrapKtAKIdentity,
  CaptchaRequiredError,
} from './lib/auth-bootstrap.js';
import { renderTurnstile } from './lib/turnstile.js';
import {
  listRoomRoutes,
  createRoomRoute,
  subscribeRoomRoutes,
} from './lib/routes.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getActiveRoomMembers,
} from './lib/rooms.js';
import {
  saveCurrentRoom,
  readCurrentRoom,
  clearCurrentRoom,
} from './native/current-room.js';
import {
  startNativeLocation,
  stopNativeLocation,
  restoreLocationPreference,
  getLocationPermissionStatus,
  openLocationSettings,
} from './native/location.js';
import {
  prepareNativeLocationUpload,
  clearNativeLocationUpload,
  queueNativeLocationUpload,
  getNativeUploadState,
} from './native/location-upload.js';
import { getAuthStorageInfo } from './native/secure-storage.js';
import { bindNativeSessionLifecycle } from './native/session.js';
import {
  createMissionMap,
  destroyMissionMap,
  enableRouteDrawing,
  disableRouteDrawing,
  undoRoutePoint,
  clearRouteDraft,
  getRouteDraftState,
  setSharedRoutes,
} from './native/mission-map.js';

const app = document.querySelector('#app');

let bootResult = null;
let currentRoom = null;
let turnstileWidget = null;
let latestLocation = null;
let routeModeActive = false;
let routeDraftSummary = {
  active: false,
  points: [],
  distanceM: 0,
};

let roomRoutes = [];
let stopRoomRouteSubscription = null;

function shortId(value) {
  if (!value) return '—';
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setState(label, kind = '') {
  const el = document.querySelector('#bootState');
  if (!el) return;
  el.textContent = label;
  el.className = `bootState ${kind}`.trim();
}

function setCaptchaVisible(visible) {
  const el = document.querySelector('#captchaCard');
  if (!el) return;
  el.hidden = !visible;
}

function setRoomMessage(message, kind = '') {
  const el = document.querySelector('#roomMessage');
  if (!el) return;
  el.textContent = message;
  el.className = `roomMessage ${kind}`.trim();
}

function setLocationStatus(message, kind = '') {
  const el = document.querySelector('#locationStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `locationStatus ${kind}`.trim();
}

function setUploadStatus(message, kind = '') {
  const el = document.querySelector('#uploadStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `uploadStatus ${kind}`.trim();
}

function setMapStatus(message, kind = '') {
  const el = document.querySelector('#mapStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `mapStatus ${kind}`.trim();
}

function setRouteStatus(message, kind = '') {
  const el = document.querySelector('#routeStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `routeStatus ${kind}`.trim();
}

function setRouteSyncStatus(message, kind = '') {
  const el = document.querySelector('#routeSyncStatus');
  if (!el) return;
  el.textContent = message;
  el.className = `routeSyncStatus ${kind}`.trim();
}

function normalizeRealtimeStatus(status) {
  if (status === 'SUBSCRIBED') return 'Realtime 已連線';
  if (status === 'TIMED_OUT') return 'Realtime 連線逾時';
  if (status === 'CHANNEL_ERROR') return 'Realtime 連線錯誤';
  if (status === 'CLOSED') return 'Realtime 已關閉';
  return status ?? 'Realtime 狀態未知';
}

function formatRouteDistance(distanceM) {
  const value = Number(distanceM);
  if (!Number.isFinite(value) || value <= 0) return '0 m';
  if (value < 1000) return `${Math.round(value)} m`;
  return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)} km`;
}

function calculateEtaMinutes(distanceM, speedKph) {
  const distance = Number(distanceM);
  const speed = Number(speedKph);

  if (
    !Number.isFinite(distance) ||
    distance <= 0 ||
    !Number.isFinite(speed) ||
    speed <= 0
  ) {
    return 0;
  }

  return (distance / 1000 / speed) * 60;
}

function formatEta(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '—';

  if (value < 1) {
    return '< 1 分';
  }

  if (value < 60) {
    return `${Math.ceil(value)} 分`;
  }

  const hours = Math.floor(value / 60);
  const mins = Math.ceil(value % 60);

  return mins > 0 ? `${hours} 小時 ${mins} 分` : `${hours} 小時`;
}

function renderRouteDraft(summary = routeDraftSummary) {
  routeDraftSummary = summary ?? getRouteDraftState();

  const speedInput = document.querySelector('#routeSpeedKph');
  const speedKph = Number(speedInput?.value ?? 40);

  document.querySelector('#routePointCount').textContent =
    String(routeDraftSummary.points?.length ?? 0);

  document.querySelector('#routeDistance').textContent =
    formatRouteDistance(routeDraftSummary.distanceM);

  document.querySelector('#routeEta').textContent =
    formatEta(calculateEtaMinutes(routeDraftSummary.distanceM, speedKph));

  const undoButton = document.querySelector('#routeUndoBtn');
  const clearButton = document.querySelector('#routeClearBtn');

  if (undoButton) {
    undoButton.disabled = (routeDraftSummary.points?.length ?? 0) === 0;
  }

  if (clearButton) {
    clearButton.disabled = (routeDraftSummary.points?.length ?? 0) === 0;
  }

  const saveButton = document.querySelector('#routeSaveBtn');
  if (saveButton) {
    saveButton.disabled =
      !currentRoom ||
      (routeDraftSummary.points?.length ?? 0) < 2;
  }
}


function renderSavedRoutes() {
  const list = document.querySelector('#savedRouteList');
  const count = document.querySelector('#savedRouteCount');

  if (count) {
    count.textContent = String(roomRoutes.length);
  }

  if (!list) return;

  if (!currentRoom) {
    list.innerHTML = '<div class="empty">加入房間後才會同步共享路徑。</div>';
    return;
  }

  if (!roomRoutes.length) {
    list.innerHTML = '<div class="empty">這個房間還沒有共享路徑。</div>';
    return;
  }

  list.innerHTML = roomRoutes
    .map((route) => {
      const speed = Number(route.speed_kph);
      const distance = Number(route.total_distance_m);
      const eta = calculateEtaMinutes(distance, speed);

      return `
        <div class="savedRouteRow">
          <div>
            <strong>${escapeHtml(route.name ?? '路徑')}</strong>
            <div class="savedRouteMeta">
              ${escapeHtml(formatRouteDistance(distance))}
              · ${escapeHtml(Number.isFinite(speed) ? `${speed} km/h` : '—')}
              · ETA ${escapeHtml(formatEta(eta))}
            </div>
          </div>
          <div class="savedRouteTime">
            ${escapeHtml(
              route.updated_at
                ? new Date(route.updated_at).toLocaleTimeString()
                : '—',
            )}
          </div>
        </div>
      `;
    })
    .join('');
}

async function refreshRoomRoutes() {
  if (!currentRoom?.roomId) {
    roomRoutes = [];
    await setSharedRoutes([]);
    renderSavedRoutes();
    return [];
  }

  const routes = await listRoomRoutes(currentRoom.roomId);
  roomRoutes = routes;
  await setSharedRoutes(roomRoutes);
  renderSavedRoutes();
  return roomRoutes;
}

async function stopRoomRoutesRealtime() {
  if (stopRoomRouteSubscription) {
    await stopRoomRouteSubscription();
    stopRoomRouteSubscription = null;
  }
}

async function startRoomRoutesRealtime() {
  await stopRoomRoutesRealtime();

  if (!currentRoom?.roomId) {
    roomRoutes = [];
    await setSharedRoutes([]);
    renderSavedRoutes();
    setRouteSyncStatus('未加入房間：共享路徑尚未連線');
    return;
  }

  setRouteSyncStatus('正在讀取共享路徑…');

  try {
    await refreshRoomRoutes();

    stopRoomRouteSubscription = await subscribeRoomRoutes(
      currentRoom.roomId,
      {
        async onChange() {
          try {
            await refreshRoomRoutes();
            setRouteSyncStatus(
              `✓ 已同步 ${roomRoutes.length} 條共享路徑`,
              'success',
            );
          } catch (error) {
            console.error('[KTAK V3] route realtime refresh failed', error);
            setRouteSyncStatus(
              `路徑更新讀取失敗：${error?.message ?? String(error)}`,
              'error',
            );
          }
        },
        onStatus(status) {
          if (status === 'SUBSCRIBED') {
            setRouteSyncStatus(
              `✓ ${normalizeRealtimeStatus(status)} · ${roomRoutes.length} 條路徑`,
              'success',
            );
            return;
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT'
          ) {
            setRouteSyncStatus(
              normalizeRealtimeStatus(status),
              'error',
            );
          }
        },
        onError(error) {
          console.error('[KTAK V3] route realtime error', error);
          setRouteSyncStatus(
            `Realtime 錯誤：${error?.message ?? String(error)}`,
            'error',
          );
        },
      },
    );
  } catch (error) {
    console.error('[KTAK V3] start route realtime failed', error);
    setRouteSyncStatus(
      `共享路徑載入失敗：${error?.message ?? String(error)}`,
      'error',
    );
  }
}

function resetRouteUi() {
  routeModeActive = false;
  routeDraftSummary = {
    active: false,
    points: [],
    distanceM: 0,
  };

  const routeButton = document.querySelector('#routeModeBtn');
  if (routeButton) {
    routeButton.textContent = '開始畫路徑';
    routeButton.disabled = false;
  }

  renderRouteDraft(routeDraftSummary);
  setRouteStatus('地圖建立後，可進入路徑模式');
}

function formatMaybe(value, digits = 1, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `${Number(value).toFixed(digits)}${suffix}`;
}

function renderLocation(position) {
  latestLocation = position;

  document.querySelector('#locLat').textContent =
    formatMaybe(position?.latitude, 6);
  document.querySelector('#locLng').textContent =
    formatMaybe(position?.longitude, 6);
  document.querySelector('#locAltitude').textContent =
    position?.altitude == null ? '—' : formatMaybe(position.altitude, 1, ' m');
  document.querySelector('#locAltitudeAccuracy').textContent =
    position?.altitudeAccuracy == null
      ? '—'
      : `± ${formatMaybe(position.altitudeAccuracy, 1, ' m')}`;
  document.querySelector('#locAccuracy').textContent =
    position?.accuracy == null
      ? '—'
      : `± ${formatMaybe(position.accuracy, 1, ' m')}`;
  document.querySelector('#locSpeed').textContent =
    position?.speed == null
      ? '—'
      : formatMaybe(position.speed * 3.6, 1, ' km/h');
  document.querySelector('#locBearing').textContent =
    position?.bearing == null
      ? '—'
      : formatMaybe(position.bearing, 0, '°');
  document.querySelector('#locUpdated').textContent =
    position?.time
      ? new Date(position.time).toLocaleTimeString()
      : '—';

  const simulated = document.querySelector('#locSimulated');
  simulated.textContent = position?.simulated ? '模擬位置' : '真實裝置位置';
  simulated.className = position?.simulated ? 'warningText' : 'successText';
}

async function prepareUploadForCurrentRoom() {
  if (!currentRoom || !bootResult) {
    setUploadStatus('未加入房間：只取得本機 GPS，不上傳', '');
    return false;
  }

  try {
    const state = await prepareNativeLocationUpload({
      roomId: currentRoom.roomId,
      installationId: bootResult.identity.installationId,
    });

    setUploadStatus(
      `✓ Native 上傳已就緒 · 10 秒一次 · Token 到期 ${new Date(
        state.expiresAt,
      ).toLocaleTimeString()}`,
      'success',
    );

    if (latestLocation) {
      await queueNativeLocationUpload(latestLocation, { force: true });
    }

    return true;
  } catch (error) {
    console.error('[KTAK V3] prepare native upload failed', error);
    setUploadStatus(
      `Native 上傳準備失敗：${error?.message ?? String(error)}`,
      'error',
    );
    return false;
  }
}

async function handleNativeLocation(position) {
  renderLocation(position);
  setLocationStatus('✓ 任務定位已開啟', 'success');

  try {
    const sent = await queueNativeLocationUpload(position);
    if (sent) {
      const state = getNativeUploadState();
      setUploadStatus(
        `✓ Native 已送出 · ${new Date(state.lastSentAt).toLocaleTimeString()} · 10 秒一次`,
        'success',
      );
    }
  } catch (error) {
    console.error('[KTAK V3] native location upload failed', error);
    setUploadStatus(
      `Native 上傳失敗：${error?.message ?? String(error)}`,
      'error',
    );
  }
}

function handleLocationError(error) {
  console.error('[KTAK V3] location error', error);
  const code = error?.code ? ` (${error.code})` : '';
  setLocationStatus(
    `定位錯誤${code}：${error?.message ?? String(error)}`,
    'error',
  );
}

function fillIdentity(result, storage) {
  document.querySelector('#installationId').textContent =
    shortId(result.identity.installationId);
  document.querySelector('#installationId').title =
    result.identity.installationId;

  document.querySelector('#userId').textContent =
    shortId(result.auth.userId);
  document.querySelector('#userId').title = result.auth.userId;

  document.querySelector('#sessionState').textContent =
    result.auth.sessionCreatedNow ? '本次新建' : '成功恢復';

  document.querySelector('#storageType').textContent = storage.storage;

  document.querySelector('#backendState').textContent =
    `已登記 · ${shortId(result.installation.installation_id)}`;
}

function setFormsEnabled(enabled) {
  document.querySelectorAll('input, button').forEach((el) => {
    if (
      el.id === 'leaveRoomBtn' ||
      el.id === 'refreshMembersBtn' ||
      el.id === 'locationSettingsBtn'
    ) {
      return;
    }
    el.disabled = !enabled;
  });
}

function renderCurrentRoom() {
  const card = document.querySelector('#currentRoomCard');
  if (!currentRoom) {
    card.hidden = true;
    return;
  }

  card.hidden = false;
  document.querySelector('#currentRoomCode').textContent =
    currentRoom.code ?? '—';
  document.querySelector('#currentRoomId').textContent =
    shortId(currentRoom.roomId);
  document.querySelector('#currentRoomId').title = currentRoom.roomId;
  document.querySelector('#currentRoomRole').textContent =
    currentRoom.role ?? '—';
}

function renderMembers(members) {
  const list = document.querySelector('#memberList');
  const count = document.querySelector('#memberCount');
  const ownCount = document.querySelector('#ownMemberCount');

  count.textContent = String(members.length);

  const myInstallation = bootResult?.identity?.installationId;
  ownCount.textContent = String(
    members.filter((m) => m.installation_id === myInstallation).length,
  );

  if (!members.length) {
    list.innerHTML = '<div class="empty">目前沒有可顯示的成員。</div>';
    return;
  }

  list.innerHTML = members
    .map(
      (member) => `
        <div class="memberRow">
          <div>
            <strong>${escapeHtml(member.nickname)}</strong>
            <span class="role">${escapeHtml(member.role)}</span>
          </div>
          <div class="memberMeta">
            installation ${escapeHtml(shortId(member.installation_id))}
          </div>
        </div>
      `,
    )
    .join('');
}

async function refreshMembers() {
  if (!currentRoom?.roomId) {
    renderMembers([]);
    return;
  }

  try {
    renderMembers(await getActiveRoomMembers(currentRoom.roomId));
  } catch (error) {
    console.error(error);
    renderMembers([]);
    setRoomMessage(
      `讀取成員失敗：${error?.message ?? String(error)}`,
      'error',
    );
  }
}

async function activateRoom(result) {
  currentRoom = {
    roomId: result.room_id,
    code: result.code,
    role: result.role,
  };

  await saveCurrentRoom(result);
  renderCurrentRoom();
  await refreshMembers();
  await prepareUploadForCurrentRoom();
  await startRoomRoutesRealtime();
  renderRouteDraft(routeDraftSummary);
}

function normalizeRoomError(error) {
  const message = error?.message ?? String(error);
  if (message.includes('ROOM_CODE_TAKEN')) return '房號已被使用';
  if (message.includes('ROOM_NOT_FOUND')) return '找不到房間或房間已到期';
  if (message.includes('BAD_ROOM_PASSWORD')) return '房間密碼錯誤';
  if (message.includes('BAD_ROOM_CODE')) return '房號格式不正確';
  if (message.includes('BAD_NICKNAME')) return '暱稱格式不正確';
  return message;
}

app.innerHTML = `
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">KTAK NATIVE V3 · PHASE 3B</div>
      <h1>背景定位 Native 上傳</h1>
      <p>
        GPS 每約 2 秒更新本機畫面；伺服器同步限制為 10 秒一次。
        網路傳輸使用 Capacitor 原生 HTTP，不再依賴 WebView 的 fetch。
      </p>
    </section>

    <section class="card">
      <h2>啟動狀態</h2>
      <div id="bootState" class="bootState">正在初始化…</div>
    </section>

    <section id="captchaCard" class="card captchaCard" hidden>
      <h2>安全驗證</h2>
      <p class="muted">第一次建立 KTAK 身分需要完成一次驗證。</p>
      <div id="turnstileContainer" class="turnstileContainer"></div>
      <div id="captchaHint" class="captchaHint">等待驗證…</div>
    </section>

    <section class="card locationCard">
      <div class="sectionHeader">
        <div>
          <h2>任務定位</h2>
          <p class="muted locationNote">
            開啟後會記住設定；Android 背景時持續使用原生定位服務。
          </p>
        </div>
        <label class="switchLabel">
          <input id="locationToggle" type="checkbox" />
          <span>定位 ON</span>
        </label>
      </div>

      <div id="locationStatus" class="locationStatus">尚未啟動定位</div>
      <div id="uploadStatus" class="uploadStatus">
        未加入房間：只取得本機 GPS，不上傳
      </div>

      <div class="locationGrid">
        <div><span>緯度</span><strong id="locLat">—</strong></div>
        <div><span>經度</span><strong id="locLng">—</strong></div>
        <div><span>海拔</span><strong id="locAltitude">—</strong></div>
        <div><span>高度精度</span><strong id="locAltitudeAccuracy">—</strong></div>
        <div><span>水平精度</span><strong id="locAccuracy">—</strong></div>
        <div><span>速度</span><strong id="locSpeed">—</strong></div>
        <div><span>航向</span><strong id="locBearing">—</strong></div>
        <div><span>最後更新</span><strong id="locUpdated">—</strong></div>
      </div>

      <div class="locationFooter">
        <span id="locSimulated">—</span>
        <button id="locationSettingsBtn">定位設定</button>
      </div>

      <p class="phaseWarning">
        這版用房間＋裝置專屬 256-bit 定位 Token；資料庫只存 Token 雜湊。
        離開房間會立即撤銷 Token。
      </p>
    </section>

    <section class="card mapControlCard">
      <div class="sectionHeader">
        <div>
          <h2>任務地圖</h2>
          <p class="muted locationNote">
            Phase 4B：Native 地圖＋自繪路徑、距離與 ETA。
          </p>
        </div>
        <button id="startMapBtn" class="primaryBtn">啟動地圖</button>
      </div>
      <div id="mapStatus" class="mapStatus">尚未建立 Native Google Map</div>

      <div class="routePanel">
        <div class="routeToolbar">
          <button id="routeModeBtn" class="primaryBtn" disabled>開始畫路徑</button>
          <button id="routeUndoBtn" disabled>復原一點</button>
          <button id="routeClearBtn" disabled>清除</button>
        </div>

        <div id="routeStatus" class="routeStatus">
          地圖建立後，可進入路徑模式
        </div>

        <div class="routeSaveRow">
          <label>
            路徑名稱
            <input id="routeName" maxlength="80" value="任務路徑" />
          </label>
          <button id="routeSaveBtn" class="primaryBtn" disabled>
            儲存並共享
          </button>
        </div>

        <div class="routeStats">
          <div>
            <span>節點</span>
            <strong id="routePointCount">0</strong>
          </div>
          <div>
            <span>總距離</span>
            <strong id="routeDistance">0 m</strong>
          </div>
          <div>
            <span>模擬速度</span>
            <label class="speedField">
              <input id="routeSpeedKph" type="number" min="1" max="300" step="1" value="40" />
              <span>km/h</span>
            </label>
          </div>
          <div>
            <span>ETA</span>
            <strong id="routeEta">—</strong>
          </div>
        </div>

        <p class="routeHint">
          青色＝尚未儲存草稿；橘色＝已儲存到房間的共享路徑。
          儲存時伺服器會重新計算總距離。
        </p>

        <div class="sharedRoutePanel">
          <div class="sharedRouteHeader">
            <strong>共享路徑</strong>
            <span><strong id="savedRouteCount">0</strong> 條</span>
          </div>
          <div id="routeSyncStatus" class="routeSyncStatus">
            未加入房間：共享路徑尚未連線
          </div>
          <div id="savedRouteList" class="savedRouteList">
            <div class="empty">加入房間後才會同步共享路徑。</div>
          </div>
        </div>
      </div>
    </section>

    <section class="mapViewport" aria-label="KTAK 任務地圖">
      <capacitor-google-map id="missionMap"></capacitor-google-map>
    </section>

    <section class="card">
      <h2>Identity</h2>
      <div class="identityRow"><span>installation_id</span><strong id="installationId">—</strong></div>
      <div class="identityRow"><span>Supabase user</span><strong id="userId">—</strong></div>
      <div class="identityRow"><span>Session</span><strong id="sessionState">—</strong></div>
      <div class="identityRow"><span>安全儲存</span><strong id="storageType">—</strong></div>
      <div class="identityRow"><span>後端 installation</span><strong id="backendState">—</strong></div>
    </section>

    <section class="card">
      <h2>建立測試房間</h2>
      <div class="formGrid">
        <label>房號<input id="createCode" maxlength="12" placeholder="例如 GPS3B" /></label>
        <label>房間密碼<input id="createPassword" type="password" maxlength="72" placeholder="至少 4 碼" /></label>
        <label>暱稱<input id="createNickname" maxlength="40" placeholder="例如 K" /></label>
        <label>房間名稱（可留空）<input id="createName" maxlength="80" placeholder="定位測試" /></label>
      </div>
      <button id="createRoomBtn" class="primaryBtn">建立房間</button>
    </section>

    <section class="card">
      <h2>加入／重新加入房間</h2>
      <div class="formGrid">
        <label>房號<input id="joinCode" maxlength="12" /></label>
        <label>房間密碼<input id="joinPassword" type="password" maxlength="72" /></label>
        <label class="fullWidth">暱稱<input id="joinNickname" maxlength="40" /></label>
      </div>
      <button id="joinRoomBtn" class="primaryBtn">加入／重新加入</button>
      <div id="roomMessage" class="roomMessage"></div>
    </section>

    <section id="currentRoomCard" class="card" hidden>
      <h2>目前房間</h2>
      <div class="identityRow"><span>房號</span><strong id="currentRoomCode">—</strong></div>
      <div class="identityRow"><span>room_id</span><strong id="currentRoomId">—</strong></div>
      <div class="identityRow"><span>我的角色</span><strong id="currentRoomRole">—</strong></div>

      <div class="memberStats">
        <div><span>活躍成員</span><strong id="memberCount">0</strong></div>
        <div><span>我的 installation 筆數</span><strong id="ownMemberCount">0</strong></div>
      </div>

      <div id="memberList" class="memberList"></div>

      <div class="buttonRow">
        <button id="refreshMembersBtn">重新整理成員</button>
        <button id="leaveRoomBtn" class="dangerBtn">離開房間</button>
      </div>
    </section>
  </main>
`;

async function completeBootstrap(captchaToken = null) {
  const storage = await getAuthStorageInfo();
  bootResult = await bootstrapKtAKIdentity({ captchaToken });
  fillIdentity(bootResult, storage);
  setCaptchaVisible(false);
  setState('✓ Identity / Session / Supabase 已串接', 'success');
  setFormsEnabled(true);

  currentRoom = await readCurrentRoom();
  renderCurrentRoom();

  if (currentRoom) {
    await refreshMembers();
    await prepareUploadForCurrentRoom();
    await startRoomRoutesRealtime();
  } else {
    renderSavedRoutes();
  }

  await bindNativeSessionLifecycle();

  try {
    const restored = await restoreLocationPreference({
      onLocation: handleNativeLocation,
      onError: handleLocationError,
    });

    document.querySelector('#locationToggle').checked = restored;

    if (restored) {
      setLocationStatus('正在恢復任務定位…');
    }
  } catch (error) {
    handleLocationError(error);
  }
}

async function requestCaptcha() {
  setCaptchaVisible(true);
  setState('請先完成 Cloudflare 安全驗證');
  const hint = document.querySelector('#captchaHint');
  const container = document.querySelector('#turnstileContainer');

  let busy = false;

  turnstileWidget = await renderTurnstile({
    container,
    async onToken(token) {
      if (busy) return;
      busy = true;
      hint.textContent = '驗證成功，正在建立 KTAK 身分…';
      setState('正在建立安全 Session…');

      try {
        await completeBootstrap(token);
      } catch (error) {
        console.error(error);
        setState(`✕ ${error?.message ?? String(error)}`, 'error');
        hint.textContent = '建立 Session 失敗，請重新驗證。';
        busy = false;
        turnstileWidget?.reset();
      }
    },
    onError(code) {
      setState(`✕ Turnstile 驗證失敗 (${code})`, 'error');
      hint.textContent = '安全驗證失敗，請稍後重試。';
      busy = false;
    },
    onExpired() {
      hint.textContent = '驗證已逾時，請重新完成驗證。';
      busy = false;
    },
  });
}

document.querySelector('#locationToggle').addEventListener('change', async (event) => {
  const toggle = event.currentTarget;
  toggle.disabled = true;

  try {
    if (toggle.checked) {
      setLocationStatus('正在要求定位權限…');

      await startNativeLocation({
        onLocation: handleNativeLocation,
        onError: handleLocationError,
      });

      await getLocationPermissionStatus();
      setLocationStatus('定位已開啟，等待第一筆 GPS…');
    } else {
      await stopNativeLocation();
      setLocationStatus('定位已關閉');
    }
  } catch (error) {
    console.error(error);
    toggle.checked = false;
    handleLocationError(error);
  } finally {
    toggle.disabled = false;
  }
});

document.querySelector('#locationSettingsBtn').addEventListener('click', async () => {
  await openLocationSettings();
});


document.querySelector('#startMapBtn').addEventListener('click', async () => {
  const button = document.querySelector('#startMapBtn');
  const element = document.querySelector('#missionMap');

  button.disabled = true;
  setMapStatus('正在建立 Android Native Google Map…');

  try {
    await destroyMissionMap();

    const hasLocation =
      latestLocation &&
      Number.isFinite(Number(latestLocation.latitude)) &&
      Number.isFinite(Number(latestLocation.longitude));

    await createMissionMap({
      element,
      center: hasLocation
        ? {
            lat: Number(latestLocation.latitude),
            lng: Number(latestLocation.longitude),
          }
        : {
            lat: 23.6978,
            lng: 120.9605,
          },
      zoom: hasLocation ? 16 : 7,
    });

    setMapStatus('✓ Native Google Map 已建立，可以拖曳與縮放', 'success');
    button.textContent = '重新建立地圖';

    await setSharedRoutes(roomRoutes);

    routeModeActive = false;
    routeDraftSummary = getRouteDraftState();
    document.querySelector('#routeModeBtn').disabled = false;
    document.querySelector('#routeModeBtn').textContent = '開始畫路徑';
    renderRouteDraft(routeDraftSummary);
    setRouteStatus('可以開始畫路徑：按「開始畫路徑」後點地圖');
  } catch (error) {
    console.error('[KTAK V3] mission map create failed', error);
    setMapStatus(
      `地圖建立失敗：${error?.message ?? String(error)}`,
      'error',
    );
  } finally {
    button.disabled = false;
  }
});


document.querySelector('#routeModeBtn').addEventListener('click', async () => {
  const button = document.querySelector('#routeModeBtn');
  button.disabled = true;

  try {
    if (!routeModeActive) {
      routeDraftSummary = await enableRouteDrawing({
        onChange(summary) {
          renderRouteDraft(summary);
        },
      });

      routeModeActive = true;
      button.textContent = '結束畫路徑';
      setRouteStatus(
        '路徑模式 ON：點地圖增加節點；仍可拖曳／縮放地圖',
        'success',
      );
    } else {
      routeDraftSummary = await disableRouteDrawing();
      routeModeActive = false;
      button.textContent = '開始畫路徑';
      setRouteStatus('路徑模式已結束；草稿仍保留');
    }

    renderRouteDraft(routeDraftSummary);
  } catch (error) {
    console.error('[KTAK V3] route mode failed', error);
    setRouteStatus(
      `路徑模式失敗：${error?.message ?? String(error)}`,
      'error',
    );
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#routeUndoBtn').addEventListener('click', async () => {
  try {
    routeDraftSummary = await undoRoutePoint();
    renderRouteDraft(routeDraftSummary);
  } catch (error) {
    console.error('[KTAK V3] route undo failed', error);
    setRouteStatus(
      `復原失敗：${error?.message ?? String(error)}`,
      'error',
    );
  }
});

document.querySelector('#routeClearBtn').addEventListener('click', async () => {
  try {
    routeDraftSummary = await clearRouteDraft();
    renderRouteDraft(routeDraftSummary);
    setRouteStatus(
      routeModeActive
        ? '路徑已清除；可以繼續點地圖重畫'
        : '路徑已清除',
    );
  } catch (error) {
    console.error('[KTAK V3] route clear failed', error);
    setRouteStatus(
      `清除失敗：${error?.message ?? String(error)}`,
      'error',
    );
  }
});

document.querySelector('#routeSpeedKph').addEventListener('input', (event) => {
  const input = event.currentTarget;
  const value = Number(input.value);

  if (!Number.isFinite(value)) return;

  if (value < 1) input.value = '1';
  if (value > 300) input.value = '300';

  renderRouteDraft(routeDraftSummary);
});


document.querySelector('#routeSaveBtn').addEventListener('click', async () => {
  const button = document.querySelector('#routeSaveBtn');

  if (!bootResult || !currentRoom) {
    setRouteStatus('請先建立或加入房間，才能共享路徑', 'error');
    return;
  }

  const points = routeDraftSummary.points ?? [];

  if (points.length < 2) {
    setRouteStatus('至少需要 2 個節點才能儲存路徑', 'error');
    return;
  }

  const name =
    document.querySelector('#routeName').value.trim() || '任務路徑';
  const speedKph = Number(
    document.querySelector('#routeSpeedKph').value,
  );

  button.disabled = true;
  setRouteStatus('正在儲存共享路徑…');

  try {
    const saved = await createRoomRoute({
      roomId: currentRoom.roomId,
      installationId: bootResult.identity.installationId,
      name,
      points,
      speedKph,
    });

    setRouteStatus(
      `✓ 已共享「${saved.name ?? name}」 · ${formatRouteDistance(
        saved.total_distance_m,
      )}`,
      'success',
    );

    routeDraftSummary = await clearRouteDraft();
    renderRouteDraft(routeDraftSummary);

    await refreshRoomRoutes();
  } catch (error) {
    console.error('[KTAK V3] save shared route failed', error);
    setRouteStatus(
      `共享失敗：${error?.message ?? String(error)}`,
      'error',
    );
  } finally {
    renderRouteDraft(routeDraftSummary);
  }
});

document.querySelector('#createRoomBtn').addEventListener('click', async () => {
  if (!bootResult) return;
  setRoomMessage('正在建立房間…');

  try {
    const result = await createRoom({
      installationId: bootResult.identity.installationId,
      code: document.querySelector('#createCode').value,
      password: document.querySelector('#createPassword').value,
      nickname: document.querySelector('#createNickname').value,
      name: document.querySelector('#createName').value,
    });

    await activateRoom(result);

    document.querySelector('#joinCode').value = result.code ?? '';
    document.querySelector('#joinPassword').value =
      document.querySelector('#createPassword').value;
    document.querySelector('#joinNickname').value =
      document.querySelector('#createNickname').value;

    setRoomMessage(`✓ 房間 ${result.code} 建立完成`, 'success');
  } catch (error) {
    console.error(error);
    setRoomMessage(`建立失敗：${normalizeRoomError(error)}`, 'error');
  }
});

document.querySelector('#joinRoomBtn').addEventListener('click', async () => {
  if (!bootResult) return;
  setRoomMessage('正在加入房間…');

  try {
    const result = await joinRoom({
      installationId: bootResult.identity.installationId,
      code: document.querySelector('#joinCode').value,
      password: document.querySelector('#joinPassword').value,
      nickname: document.querySelector('#joinNickname').value,
    });

    await activateRoom(result);
    setRoomMessage(
      `✓ 已加入 ${result.code}；Native 定位 Token 已準備`,
      'success',
    );
  } catch (error) {
    console.error(error);
    setRoomMessage(`加入失敗：${normalizeRoomError(error)}`, 'error');
  }
});

document.querySelector('#refreshMembersBtn').addEventListener('click', async () => {
  await refreshMembers();
});

document.querySelector('#leaveRoomBtn').addEventListener('click', async () => {
  if (!bootResult || !currentRoom) return;

  try {
    const changed = await leaveRoom({
      installationId: bootResult.identity.installationId,
      roomId: currentRoom.roomId,
    });

    await clearNativeLocationUpload();
    await stopRoomRoutesRealtime();
    roomRoutes = [];
    await setSharedRoutes([]);
    await clearCurrentRoom();
    currentRoom = null;
    renderCurrentRoom();
    renderMembers([]);
    setUploadStatus('未加入房間：只取得本機 GPS，不上傳');
    setRouteSyncStatus('未加入房間：共享路徑尚未連線');
    renderSavedRoutes();
    renderRouteDraft(routeDraftSummary);

    setRoomMessage(
      changed ? '✓ 已正式離開房間；Native 定位 Token 已撤銷' : '目前已不在房間內',
      'success',
    );
  } catch (error) {
    console.error(error);
    setRoomMessage(`離開失敗：${normalizeRoomError(error)}`, 'error');
  }
});

async function boot() {
  setFormsEnabled(false);

  try {
    setState('正在讀取安全 Session…');

    try {
      await completeBootstrap();
    } catch (error) {
      if (error instanceof CaptchaRequiredError) {
        await requestCaptcha();
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    setState(`✕ ${error?.message ?? String(error)}`, 'error');
  }
}

boot();

