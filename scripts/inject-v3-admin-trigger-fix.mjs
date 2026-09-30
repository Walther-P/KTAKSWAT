import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

const triggerRegex = /  const versionTarget = document\.querySelector\('\.brandText small'\);[\s\S]*?  adminEl\('ktakAdminClose'\)\?\.addEventListener/;
if (!triggerRegex.test(html)) throw new Error('Admin trigger block not found');

const replacement = `  let ktakAdminLastTapAt = 0;
  let ktakAdminLastPhysicalEventAt = 0;
  function ktakAdminVersionTargetAt(x, y, eventTarget) {
    const direct = eventTarget?.closest?.('.brandText small');
    if (direct) return direct;
    const version = document.querySelector('.brandText small');
    if (!version) return null;
    const r = version.getBoundingClientRect();
    const pad = 12;
    if (Number.isFinite(x) && Number.isFinite(y) && x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return version;
    return null;
  }
  function ktakAdminOpenOwnerV3() {
    const target = new URL('/owner-admin-v3/', location.origin);
    location.assign(target.href);
  }
  function ktakAdminRecordPhysicalTap(event, x, y) {
    const target = ktakAdminVersionTargetAt(x, y, event?.target);
    if (!target) return;
    const now = Date.now();
    if (now - ktakAdminLastPhysicalEventAt < 90) return;
    ktakAdminLastPhysicalEventAt = now;
    if (event?.cancelable) event.preventDefault();
    event?.stopPropagation?.();
    if (now - ktakAdminLastTapAt > 5000) ktakAdminTapCount = 0;
    ktakAdminLastTapAt = now;
    ktakAdminTapCount++;
    clearTimeout(ktakAdminTapTimer);
    ktakAdminTapTimer = setTimeout(() => { ktakAdminTapCount = 0; }, 5000);
    target.setAttribute('data-ktak-admin-trigger', '7tap-v3');
    target.setAttribute('data-ktak-admin-tap-count', String(ktakAdminTapCount));
    if (ktakAdminTapCount >= 7) {
      ktakAdminTapCount = 0;
      clearTimeout(ktakAdminTapTimer);
      target.classList.add('ktakAdminTriggerFlash');
      setTimeout(ktakAdminOpenOwnerV3, 120);
    }
  }
  document.addEventListener('touchend', event => {
    const t = event.changedTouches?.[0];
    if (!t) return;
    ktakAdminRecordPhysicalTap(event, t.clientX, t.clientY);
  }, { capture: true, passive: false });
  document.addEventListener('mouseup', event => {
    ktakAdminRecordPhysicalTap(event, event.clientX, event.clientY);
  }, true);
  document.addEventListener('dblclick', event => {
    if (event.target?.closest?.('.brandText small')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  try {
    if (new URLSearchParams(location.search).get('ktak-admin') === '1') {
      setTimeout(ktakAdminOpenOwnerV3, 0);
    }
  } catch {}
  adminEl('ktakAdminClose')?.addEventListener`;

html = html.replace(triggerRegex, replacement);
html = html.replace(
  '.brandText small{user-select:none;-webkit-user-select:none}',
  ".brandText small{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:manipulation;cursor:pointer;padding:6px 4px;margin:-6px -4px;border-radius:5px}.brandText small.ktakAdminTriggerFlash{background:#8a6a16!important;color:#fff2a8!important;box-shadow:0 0 0 2px #ffdb60aa}"
);

if (!html.includes('ktakAdminOpenOwnerV3') || !html.includes("new URL('/owner-admin-v3/', location.origin)") || !html.includes("document.addEventListener('touchend'") || !html.includes("document.addEventListener('mouseup'") || !html.includes('7tap-v3') || !html.includes("get('ktak-admin') === '1'")) {
  throw new Error('Admin v3 hidden trigger self-check failed');
}

fs.writeFileSync(file, html);
console.log('KTAK hidden admin trigger now routes seven taps directly to /owner-admin-v3/.');

