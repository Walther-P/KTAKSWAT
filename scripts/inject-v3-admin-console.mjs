import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Admin console marker missing: ${label}`);
  html = html.replace(marker, replacement);
}

const css = `
/* KTAK V3 owner-admin-v1: hidden seven-tap owner console */
.ktakAdminOverlay{position:fixed;inset:0;z-index:20000;background:rgba(2,6,9,.94);display:none;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
.ktakAdminOverlay.open{display:flex}.ktakAdminCard{width:min(920px,97vw);max-height:94vh;overflow:auto;background:#0d171d;border:1px solid #496674;border-radius:16px;box-shadow:0 20px 70px #000e;padding:14px}.ktakAdminHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.ktakAdminHead h2{margin:0;font-size:18px}.ktakAdminBadge{display:inline-block;margin-left:7px;padding:3px 7px;border-radius:999px;background:#5a4411;border:1px solid #a17c21;color:#ffe38b;font-size:9px}.ktakAdminPanel{display:grid;gap:9px}.ktakAdminPanel.hidden{display:none!important}.ktakAdminHint{font-size:10px;color:#a9bbc4;line-height:1.5}.ktakAdminActions{display:flex;gap:7px;flex-wrap:wrap}.ktakAdminActions button{flex:1;min-width:120px}.ktakAdminRooms{display:grid;gap:8px;margin-top:8px}.ktakAdminRoom{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid #2f4651;border-radius:11px;background:#0a1318}.ktakAdminRoomCode{font-size:14px;font-weight:900;color:#eef7fa}.ktakAdminMeta{font-size:10px;color:#9fb2bc;line-height:1.55;margin-top:3px;white-space:pre-line}.ktakAdminDelete{background:#7a2424!important;border-color:#b84b4b!important;white-space:nowrap}.ktakAdminStatus{padding:7px 9px;border-radius:9px;background:#0a1318;border:1px solid #2f4651;font-size:10px;color:#b9c9d0}.ktakAdminStatus.good{border-color:#2e7955;color:#9ae5b8}.ktakAdminStatus.bad{border-color:#874242;color:#ffaaaa}.ktakAdminPasswordRow{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ktakAdminTopActions{display:flex;gap:7px}.ktakAdminTopActions button{padding:6px 9px;font-size:10px}.brandText small{user-select:none;-webkit-user-select:none}
@media(max-width:640px){.ktakAdminCard{padding:11px}.ktakAdminRoom{grid-template-columns:1fr}.ktakAdminDelete{width:100%}.ktakAdminPasswordRow{grid-template-columns:1fr}.ktakAdminHead h2{font-size:16px}}
`;
replaceOnce('</style>', css + '\n</style>', 'admin css');

const modal = `
<div id="ktakAdminOverlay" class="ktakAdminOverlay" aria-hidden="true">
  <div class="ktakAdminCard" role="dialog" aria-modal="true" aria-label="KTAK 管理後台">
    <div class="ktakAdminHead"><div><h2>👑 KTAK 管理後台 <span class="ktakAdminBadge">隱藏管理介面</span></h2><div class="ktakAdminHint">此介面具有刪除任何 DEV 房間與相關資料的權限。</div></div><div class="ktakAdminTopActions"><button id="ktakAdminLogout" class="hidden">登出</button><button id="ktakAdminClose">關閉</button></div></div>
    <div id="ktakAdminStatus" class="ktakAdminStatus">正在檢查管理狀態…</div>
    <div id="ktakAdminSetup" class="ktakAdminPanel hidden" style="margin-top:10px">
      <div class="ktakAdminHint">第一次啟用：輸入一次性啟用碼，再設定你的管理密碼。管理密碼必須 8–12 位，可使用數字、大小寫英文字母與特殊符號（不含空白）。</div>
      <input id="ktakAdminBootstrap" type="password" autocomplete="off" placeholder="一次性啟用碼">
      <div class="ktakAdminPasswordRow"><input id="ktakAdminNewPassword" type="password" autocomplete="new-password" maxlength="12" placeholder="設定 8–12 位管理密碼"><input id="ktakAdminNewPassword2" type="password" autocomplete="new-password" maxlength="12" placeholder="再次輸入管理密碼"></div>
      <button id="ktakAdminSetupBtn" class="primary">啟用管理後台</button>
    </div>
    <div id="ktakAdminLogin" class="ktakAdminPanel hidden" style="margin-top:10px">
      <div class="ktakAdminHint">輸入管理密碼。連續錯誤 5 次會鎖定 15 分鐘。</div>
      <input id="ktakAdminPassword" type="password" autocomplete="current-password" maxlength="12" placeholder="管理密碼">
      <button id="ktakAdminLoginBtn" class="primary">登入管理後台</button>
    </div>
    <div id="ktakAdminRoomsPanel" class="ktakAdminPanel hidden" style="margin-top:10px">
      <div class="ktakAdminActions"><button id="ktakAdminRefresh" class="primary">重新整理房間</button></div>
      <div id="ktakAdminRooms" class="ktakAdminRooms"></div>
    </div>
  </div>
</div>`;
replaceOnce('<div id="app">', modal + '\n<div id="app">', 'admin modal');

function ktakOwnerAdminRuntime() {
  const KTAK_ADMIN_SESSION_KEY = 'ktak.admin.session.v1';
  let ktakAdminTapCount = 0;
  let ktakAdminTapTimer = null;
  let ktakAdminToken = '';

  const adminEl = id => document.getElementById(id);
  function adminSetStatus(text, kind = '') {
    const el = adminEl('ktakAdminStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'ktakAdminStatus' + (kind ? ' ' + kind : '');
  }
  function adminShowPanel(id) {
    ['ktakAdminSetup', 'ktakAdminLogin', 'ktakAdminRoomsPanel'].forEach(x => adminEl(x)?.classList.toggle('hidden', x !== id));
    adminEl('ktakAdminLogout')?.classList.toggle('hidden', id !== 'ktakAdminRoomsPanel');
  }
  function adminSaveToken(token) {
    ktakAdminToken = token || '';
    try {
      if (token) sessionStorage.setItem(KTAK_ADMIN_SESSION_KEY, token);
      else sessionStorage.removeItem(KTAK_ADMIN_SESSION_KEY);
    } catch {}
  }
  function adminSavedToken() {
    try { return sessionStorage.getItem(KTAK_ADMIN_SESSION_KEY) || ''; } catch { return ''; }
  }
  function adminDeviceKey() {
    try { return window.__ktakEnhance?.deviceKey?.() || ''; } catch { return ''; }
  }
  function adminPasswordValid(value) {
    return /^[!-~]{8,12}$/.test(value || '');
  }
  function adminFormatTime(value) {
    if (!value) return '—';
    try { return new Date(value).toLocaleString('zh-TW', { hour12: false }); } catch { return String(value); }
  }

  async function adminOpen() {
    const overlay = adminEl('ktakAdminOverlay');
    if (!overlay || !window.sb && typeof sb === 'undefined') return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    adminSetStatus('正在檢查管理狀態…');
    try { await sb.auth.getSession(); } catch {}
    const saved = adminSavedToken();
    if (saved) {
      const { data: ok } = await sb.rpc('ktak_admin_verify', { p_token: saved });
      if (ok === true) {
        adminSaveToken(saved);
        adminShowPanel('ktakAdminRoomsPanel');
        adminSetStatus('管理員已登入', 'good');
        await adminLoadRooms();
        return;
      }
      adminSaveToken('');
    }
    const { data: configured, error } = await sb.rpc('ktak_admin_is_configured');
    if (error) {
      adminSetStatus('管理狀態檢查失敗：' + error.message, 'bad');
      return;
    }
    if (configured) {
      adminShowPanel('ktakAdminLogin');
      adminSetStatus('請輸入管理密碼');
    } else {
      adminShowPanel('ktakAdminSetup');
      adminSetStatus('第一次啟用：請輸入一次性啟用碼並設定管理密碼');
    }
  }
  function adminClose() {
    const overlay = adminEl('ktakAdminOverlay');
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
  }
  async function adminSetup() {
    const bootstrap = (adminEl('ktakAdminBootstrap')?.value || '').trim();
    const p1 = adminEl('ktakAdminNewPassword')?.value || '';
    const p2 = adminEl('ktakAdminNewPassword2')?.value || '';
    if (!bootstrap) { adminSetStatus('請輸入一次性啟用碼', 'bad'); return; }
    if (!adminPasswordValid(p1)) { adminSetStatus('管理密碼需 8–12 位，限數字／大小寫英文／特殊符號且不能含空白', 'bad'); return; }
    if (p1 !== p2) { adminSetStatus('兩次管理密碼不一致', 'bad'); return; }
    const btn = adminEl('ktakAdminSetupBtn');
    btn.disabled = true;
    try {
      const { data, error } = await sb.rpc('ktak_admin_setup', { p_bootstrap: bootstrap, p_password: p1, p_device_key: adminDeviceKey() });
      if (error) throw error;
      if (data?.status !== 'OK') {
        const message = data?.status === 'INVALID_BOOTSTRAP' ? '一次性啟用碼錯誤或已失效'
          : data?.status === 'ALREADY_CONFIGURED' ? '管理後台已經完成設定'
          : data?.status === 'INVALID_PASSWORD_FORMAT' ? '管理密碼格式不符合 8–12 位規則'
          : (data?.status || '設定失敗');
        adminSetStatus(message, 'bad');
        return;
      }
      adminSaveToken(data.token);
      adminEl('ktakAdminBootstrap').value = '';
      adminEl('ktakAdminNewPassword').value = '';
      adminEl('ktakAdminNewPassword2').value = '';
      adminShowPanel('ktakAdminRoomsPanel');
      adminSetStatus('管理後台啟用完成；一次性啟用碼已失效', 'good');
      await adminLoadRooms();
    } catch (error) {
      adminSetStatus('啟用失敗：' + (error.message || error), 'bad');
    } finally {
      btn.disabled = false;
    }
  }
  async function adminLogin() {
    const pass = adminEl('ktakAdminPassword')?.value || '';
    if (!adminPasswordValid(pass)) { adminSetStatus('請輸入 8–12 位管理密碼', 'bad'); return; }
    const btn = adminEl('ktakAdminLoginBtn');
    btn.disabled = true;
    try {
      const { data, error } = await sb.rpc('ktak_admin_login', { p_password: pass, p_device_key: adminDeviceKey() });
      if (error) throw error;
      if (data?.status !== 'OK') {
        if (data?.status === 'LOCKED') adminSetStatus('錯誤次數過多，暫時鎖定；請稍後再試', 'bad');
        else if (data?.status === 'INVALID_PASSWORD') adminSetStatus('管理密碼錯誤；剩餘嘗試 ' + (data.remaining_attempts ?? '—') + ' 次', 'bad');
        else adminSetStatus(data?.status || '登入失敗', 'bad');
        return;
      }
      adminSaveToken(data.token);
      adminEl('ktakAdminPassword').value = '';
      adminShowPanel('ktakAdminRoomsPanel');
      adminSetStatus('管理員已登入', 'good');
      await adminLoadRooms();
    } catch (error) {
      adminSetStatus('登入失敗：' + (error.message || error), 'bad');
    } finally {
      btn.disabled = false;
    }
  }
  async function adminInvoke(body) {
    if (!ktakAdminToken) throw new Error('ADMIN_UNAUTHORIZED');
    const { data, error } = await sb.functions.invoke('ktak-admin', { body, headers: { 'x-ktak-admin-token': ktakAdminToken } });
    if (error) throw error;
    if (data?.error) {
      if (data.error === 'ADMIN_UNAUTHORIZED') {
        adminSaveToken('');
        adminShowPanel('ktakAdminLogin');
      }
      throw new Error(data.error);
    }
    return data;
  }
  async function adminLoadRooms() {
    const host = adminEl('ktakAdminRooms');
    if (!host) return;
    host.innerHTML = '<div class="ktakAdminHint">讀取房間中…</div>';
    try {
      const data = await adminInvoke({ action: 'list' });
      const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
      host.innerHTML = '';
      if (!rooms.length) {
        host.innerHTML = '<div class="ktakAdminHint">目前沒有房間。</div>';
        return;
      }
      for (const room of rooms) {
        const row = document.createElement('div');
        row.className = 'ktakAdminRoom';
        const info = document.createElement('div');
        const code = document.createElement('div');
        code.className = 'ktakAdminRoomCode';
        code.textContent = room.room_code || 'ROOM';
        const meta = document.createElement('div');
        meta.className = 'ktakAdminMeta';
        meta.textContent = '成員 ' + (room.member_count || 0) + ' · 地圖 ' + (room.map_item_count || 0) + ' · 戰術板 ' + (room.board_item_count || 0) + ' · 聊天 ' + (room.chat_count || 0)
          + '\n建立：' + adminFormatTime(room.created_at)
          + '\n最後活動：' + adminFormatTime(room.last_activity);
        info.append(code, meta);
        const del = document.createElement('button');
        del.className = 'ktakAdminDelete';
        del.textContent = '刪除房間';
        del.onclick = () => adminDeleteRoom(room, del);
        row.append(info, del);
        host.appendChild(row);
      }
    } catch (error) {
      host.innerHTML = '<div class="ktakAdminHint">房間讀取失敗：' + String(error.message || error) + '</div>';
      adminSetStatus('房間讀取失敗', 'bad');
    }
  }
  async function adminDeleteRoom(room, btn) {
    const code = String(room.room_code || 'ROOM');
    if (!confirm('確定要由管理後台永久刪除房間 ' + code + '？\n\n將刪除房間、成員、任務簡報、地圖、戰術板、聊天室、定位與上傳照片／平面圖。此操作無法復原。')) return;
    const typed = (prompt('最後確認：請完整輸入房號 ' + code) || '').trim().toUpperCase();
    if (typed !== code.toUpperCase()) { adminSetStatus('房號不一致，已取消刪除', 'bad'); return; }
    btn.disabled = true;
    try {
      const data = await adminInvoke({ action: 'delete', room_id: room.room_id });
      adminSetStatus('已刪除 ' + (data.room_code || code) + '，並移除 ' + (data.removed_files || 0) + ' 個上傳檔案', 'good');
      const active = String(window.__ktakEnhance?.savedRoomUuid?.() || '') === String(room.room_id || '');
      await adminLoadRooms();
      if (active) {
        window.__ktakEnhance?.forgetRoom?.();
        alert('目前所在房間 ' + code + ' 已由管理後台刪除，將回到房間入口。');
        location.reload();
      }
    } catch (error) {
      adminSetStatus('刪除失敗：' + (error.message || error), 'bad');
      btn.disabled = false;
    }
  }
  async function adminLogout() {
    try { if (ktakAdminToken) await sb.rpc('ktak_admin_logout', { p_token: ktakAdminToken }); } catch {}
    adminSaveToken('');
    adminShowPanel('ktakAdminLogin');
    adminSetStatus('已登出管理後台');
  }

  const versionTarget = document.querySelector('.brandText small');
  if (versionTarget) {
    versionTarget.addEventListener('click', () => {
      ktakAdminTapCount++;
      clearTimeout(ktakAdminTapTimer);
      ktakAdminTapTimer = setTimeout(() => { ktakAdminTapCount = 0; }, 3200);
      if (ktakAdminTapCount >= 7) {
        ktakAdminTapCount = 0;
        clearTimeout(ktakAdminTapTimer);
        adminOpen().catch(error => adminSetStatus('管理後台開啟失敗：' + (error.message || error), 'bad'));
      }
    });
  }
  adminEl('ktakAdminClose')?.addEventListener('click', adminClose);
  adminEl('ktakAdminOverlay')?.addEventListener('pointerdown', event => { if (event.target === adminEl('ktakAdminOverlay')) adminClose(); });
  adminEl('ktakAdminSetupBtn')?.addEventListener('click', adminSetup);
  adminEl('ktakAdminLoginBtn')?.addEventListener('click', adminLogin);
  adminEl('ktakAdminPassword')?.addEventListener('keydown', event => { if (event.key === 'Enter') adminLogin(); });
  adminEl('ktakAdminRefresh')?.addEventListener('click', adminLoadRooms);
  adminEl('ktakAdminLogout')?.addEventListener('click', adminLogout);
}

const runtime = '\n;(' + ktakOwnerAdminRuntime.toString() + ')();\n';
replaceOnce('\n})();\n</script>', runtime + '\n})();\n</script>', 'admin runtime inside app closure');

if (!html.includes('owner-admin-v1') || !html.includes('ktakAdminOverlay') || !html.includes('ktak_admin_setup') || !html.includes("sb.functions.invoke('ktak-admin'")) {
  throw new Error('KTAK owner-admin-v1 self-check failed');
}
fs.writeFileSync(file, html);
console.log('KTAK hidden owner admin console applied: seven taps, 8-12 char password, room/data deletion.');

