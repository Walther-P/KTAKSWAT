#!/usr/bin/env bash
set -euo pipefail

SOURCE_BASE="https://raw.githubusercontent.com/Walther-P/KTAK-DEV/2ee5187ce911c4e9880a4717c63fc5572a948706"

: "${VITE_SUPABASE_URL:?VITE_SUPABASE_URL is required}"
: "${VITE_SUPABASE_PUBLISHABLE_KEY:?VITE_SUPABASE_PUBLISHABLE_KEY is required}"
: "${VITE_TURNSTILE_SITE_KEY:?VITE_TURNSTILE_SITE_KEY is required}"
: "${VITE_GOOGLE_MAPS_API_KEY:?VITE_GOOGLE_MAPS_API_KEY is required}"

test -d dist || { echo "dist/ is missing; run npm run build first"; exit 1; }

rm -rf .ktak-v3-debug-build
mv dist .ktak-v3-debug-build
mkdir -p dist/native-debug
cp -R .ktak-v3-debug-build/. dist/native-debug/

fetch_required() {
  local path="$1"
  echo "Fetching full KTAK UI: ${SOURCE_BASE}/${path}"
  curl -fsSL --retry 5 --retry-delay 2 --retry-all-errors \
    "${SOURCE_BASE}/${path}" -o "dist/${path}"
}

cp vendor/ktak-dev/index.html dist/index.html
cp vendor/ktak-dev/manifest.webmanifest dist/manifest.webmanifest
cp vendor/ktak-dev/sw.js dist/sw.js

node scripts/normalize-full-ui-markers.mjs

node <<'NODE'
const fs = require('fs');
const p = 'scripts/inject-v3-enhancements.mjs';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/\\catch/g, 'catch');
fs.writeFileSync(p, s);
NODE

node --check scripts/inject-route-tools-v2.mjs
node scripts/inject-route-tools-v2.mjs
node --check scripts/inject-v3-enhancements.mjs
node scripts/inject-v3-enhancements.mjs

node --check scripts/restore-shared-google-map.mjs
node scripts/restore-shared-google-map.mjs

node --check scripts/inject-v3-mobile-ux.mjs
node scripts/inject-v3-mobile-ux.mjs

# Tactical field-use hardening: route preview/node edit, default location
# sharing, map-object long press protection, and member jump controls.
node --check scripts/inject-v3-tactical-ux.mjs
node scripts/inject-v3-tactical-ux.mjs

# Follow-up field fixes: persistent edit/lock state, DOM-bound location
# avatars, higher-contrast symbols, and mobile long-press-only editing.
node --check scripts/inject-v3-field-fixes.mjs
node scripts/inject-v3-field-fixes.mjs

# Desktop board canvas-only zoom and stale shared-route node-editor cleanup.
node --check scripts/inject-v3-board-route-fixes.mjs
node scripts/inject-v3-board-route-fixes.mjs

# Final field polish: stable second-long-press lock, per-route/fan colors,
# collapsible tactical symbol groups, multi-room switching and resilient reopen.
node --check scripts/inject-v3-polish-v1.mjs
node scripts/inject-v3-polish-v1.mjs

# Mobile map gesture separation: single tap info, 0.5-second long-press direct
# manipulation, double-tap advanced actions, and guided observation-fan drawing.
node --check scripts/inject-v3-mobile-map-gestures-v2.mjs
node scripts/inject-v3-mobile-map-gestures-v2.mjs

# Replace only pistol/rifle/explosive artwork with the three user-approved assets.
# Icon keys and categories remain unchanged for existing room compatibility.
node --check scripts/inject-v3-approved-weapon-icons.mjs
node scripts/inject-v3-approved-weapon-icons.mjs

# Final independent owner hotspot. This is intentionally injected after all
# mission-UI transforms so later injectors cannot replace its event handler.
node --check scripts/inject-v3-owner-hotspot-v1.mjs
node scripts/inject-v3-owner-hotspot-v1.mjs

npx vite build --config vite.full-ui-bridge.config.js

node <<'NODE'
const fs = require('fs');
const cfg = {
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  TURNSTILE_SITE_KEY: process.env.VITE_TURNSTILE_SITE_KEY,
  GOOGLE_MAPS_API_KEY: process.env.VITE_GOOGLE_MAPS_API_KEY,
};
fs.writeFileSync('dist/config.js', `window.KTAK_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`);
NODE

# Standalone owner console is intentionally separate from the mission UI.
# Bundle Supabase locally so the admin page never waits on an external CDN.
node --check scripts/write-owner-admin-page.mjs
node scripts/write-owner-admin-page.mjs
node --check scripts/fix-owner-admin-local-supabase.mjs
node scripts/fix-owner-admin-local-supabase.mjs
npx vite build --config vite.owner-admin-supabase.config.js

node scripts/validate-full-ui.mjs

grep -q 'id="routeDraftStart"' dist/index.html
grep -q '導航路線' dist/index.html
grep -q "item.type==='route'" dist/index.html
grep -q 'lineDistanceTooltip' dist/index.html
grep -q 'routePreviewTooltip' dist/index.html
grep -q 'route-node-delete' dist/index.html
grep -q 'onLongPressItem' dist/index.html
grep -q 'clearNodeEditor' dist/index.html
grep -q 'syncNodeEditor' dist/index.html
grep -q 'board-route-fix-v1' dist/index.html
grep -q 'ktak-board-desktop-zoom-v1' dist/index.html
grep -q 'boardDesktopZoom' dist/index.html
grep -q 'locationJumpAvatar' dist/index.html
grep -q 'field-fix-v3' dist/index.html
grep -q 'showMapQuickInfo(layer,item,{sticky:true})' dist/index.html
grep -q 'pin.style.backgroundImage' dist/index.html
grep -q '已確認定位' dist/index.html
grep -q "localGet(LOCATION_AUTO_STORAGE) !== '0'" dist/index.html
grep -q 'id="boardFloorplanSet"' dist/index.html
grep -q 'ktak_join_room_v3' dist/index.html
grep -q 'ktak.locationAuto.v1' dist/index.html
grep -q 'ktak_claim_google_map_load' dist/index.html
grep -q "let mapProvider='google'" dist/index.html
grep -q '房間密碼（4 位數字）' dist/index.html
grep -q 'ktak_recover_commander_v3' dist/index.html
grep -q 'orientation:landscape' dist/index.html
grep -q 'polish-v1' dist/index.html
grep -q 'id="routeDraftColor"' dist/index.html
grep -q 'className=.routeSharedColor' dist/index.html
grep -q 'id="mapCtxFanColor"' dist/index.html
grep -q 'id="roomSwitcherTabs"' dist/index.html
grep -q 'ktak_list_device_rooms' dist/index.html
grep -q 'ktak_switch_device_room' dist/index.html
grep -q 'tacticalAccordion' dist/index.html
grep -q '放開手指後鎖定' dist/index.html
grep -q 'mobile-map-gesture-v2' dist/index.html
grep -q 'id="mobileFanStart"' dist/index.html
grep -q 'id="mapCtxRouteNodes"' dist/index.html
grep -q 'menu.dataset.prevSelectedId' dist/index.html
grep -q '往觀察方向拖曳，放開手指完成扇形' dist/index.html
grep -q 'if(coarsePointer)return;showMapMenu' dist/index.html
grep -q 'approved-weapon-icons-v1' dist/index.html
grep -q '/ktak-icons/pistol.svg' dist/index.html
grep -q '/ktak-icons/rifle.svg' dist/index.html
grep -q '/ktak-icons/explosive.svg' dist/index.html
test -s dist/ktak-icons/pistol.svg
test -s dist/ktak-icons/rifle.svg
test -s dist/ktak-icons/explosive.svg
grep -q 'ktak-owner-hotspot-v1' dist/index.html
grep -q "window.location.assign('/owner-admin-v3/')" dist/index.html
grep -q "document.addEventListener('pointerup'" dist/index.html
! grep -q 'id="recoverNick"' dist/index.html
! grep -q 'Google 底圖（自備 API Key）' dist/index.html
test -f dist/ktak-native-bridge.js

test -f dist/owner-admin/index.html
test -s dist/owner-admin/supabase-client.js
grep -q 'KTAK DEV 管理後台' dist/owner-admin/index.html
grep -q 'ktak_admin_login' dist/owner-admin/index.html
grep -q "action:'delete'" dist/owner-admin/index.html
grep -q './supabase-client.js' dist/owner-admin/index.html
! grep -q 'cdn.jsdelivr.net/npm/@supabase/supabase-js' dist/owner-admin/index.html

for icon in icon-192.png icon-512.png apple-touch-icon.png; do
  cp "public/${icon}" "dist/${icon}"
done

printf '%s\n' 'KTAK full UI + V3 routes + route/fan colors + compact tactical groups + multi-room switcher + resilient reopen + separated mobile tap/long-press/double-tap map gestures + guided fan workflow + desktop canvas zoom + route-node cleanup + persistent edit lock + DOM avatar pins + symbol contrast + approved pistol/rifle/explosive artwork + preview/node edit + distance + floorplan + stable identity + auto/background location + avatar jump + Google default + 4-digit PIN + landscape chat + dedicated owner hotspot + standalone owner admin with local Supabase bundle' > dist/DEV_BUILD_MODE.txt

rm -rf .ktak-v3-debug-build

echo "Full KTAK UI prepared at dist/"
echo "Standalone owner admin available at /owner-admin/ with bundled local Supabase client"
echo "Owner hotspot: seven taps anywhere on the KTAK brand block opens /owner-admin-v3/"
echo "Approved weapon artwork: pistol, rifle and explosive use the user-confirmed icon assets"
echo "Mobile map: single tap info; 0.5-second long press manipulation frame; double tap advanced actions"
echo "Mobile observation fan: choose angle/color, start, drag direction/radius, release to finish"
echo "Shared routes support per-route colors"
echo "Observation fans support per-target colors"
echo "Tactical symbol groups are collapsible and remain two-column when opened"
echo "Top multi-room switcher uses device-bound room membership without storing passwords"
echo "Last active room is reclaimed by device key on PWA reopen"
echo "Desktop board canvas-only zoom integrated"
echo "Deleted-route node-editor cleanup integrated"
echo "Location avatar marker DOM binding integrated"
echo "High-contrast tactical symbols integrated"
echo "Shared-route preview and node editing integrated"
echo "Location defaults on and avatar map refresh/jump integrated"
echo "Board floorplan background integrated"
echo "Stable room identity and auto/background location integrated"
echo "Google Maps restored as default with the 8,000/month safety gate"
echo "4-digit room PIN and commander recovery PIN integrated"
echo "Phone landscape chat compact mode integrated"
echo "V3 native engineering page preserved at /native-debug/"


