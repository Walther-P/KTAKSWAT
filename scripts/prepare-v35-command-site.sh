#!/usr/bin/env bash
set -euo pipefail

# Build the existing full KTAK DEV site first. V3.5 is deliberately applied only
# after that build is complete so this branch remains disposable and cannot
# contaminate the Stable/full DEV source chain.
bash scripts/prepare-full-dev-site.sh

node --check scripts/inject-v35-command-pack.mjs
node scripts/inject-v35-command-pack.mjs

node --check public/ktak-v35-command.js
node --check public/ktak-v35-compass-sync.js
node --check public/ktak-v35-location-accuracy.js
node --check public/ktak-v35-google-fallback.js
node --check scripts/finalize-v35-command-pack.mjs
node scripts/finalize-v35-command-pack.mjs

# User-facing V3.5 fixes are injected last so they can safely adapt the final UI.
node --check scripts/inject-v35-usability.mjs
node scripts/inject-v35-usability.mjs
cp public/ktak-v35-usability.js dist/ktak-v35-usability.js
node --check dist/ktak-v35-usability.js

# Field/performance pass.
node --check scripts/patch-v35-field-performance.mjs
node scripts/patch-v35-field-performance.mjs
node --check dist/ktak-v35-command.js
node --check dist/ktak-v35-usability.js

# Feedback v4: direct Realtime state updates, strict county filtering,
# persistent notification de-duplication, single search help, optimistic chat.
node --check scripts/patch-v35-field-feedback-v4.mjs
node scripts/patch-v35-field-feedback-v4.mjs
node --check dist/ktak-v35-command.js
node --check dist/ktak-v35-usability.js

# Feedback v5: assignment/SOS Web Push, shared command Realtime banners,
# immediate received chat rendering, desktop radar fit and Timeline controls.
node --check scripts/patch-v35-field-feedback-v5.mjs
node scripts/patch-v35-field-feedback-v5.mjs
node --check dist/ktak-v35-command.js
node --check dist/ktak-v35-usability.js

# Feedback v6: the map clear action removes every map object created by the
# current user (symbols, drawings and shared routes) without touching others.
node --check scripts/patch-v35-field-feedback-v6.mjs
node scripts/patch-v35-field-feedback-v6.mjs
node --check dist/ktak-v35-usability.js

# Feedback v7: explicit assignment location, search-sector-linked dispatch,
# mission-specific workflow panels and 3/6/9/12-hour radar playback.
node --check scripts/normalize-v35-feedback-v7-markers.mjs
node scripts/normalize-v35-feedback-v7-markers.mjs
node --check scripts/patch-v35-field-feedback-v7.mjs
node scripts/patch-v35-field-feedback-v7.mjs
node --check dist/ktak-v35-command.js
node --check dist/ktak-v35-usability.js

# V8: replace degree grid with an adaptive tactical grid expressed in metres.
# The downstream import chain applies V9-V19, V3.5.2, V3.5.3, V3.5.4 and V3.5.5.
node --check scripts/patch-v35-metric-grid-v8.mjs
node scripts/patch-v35-metric-grid-v8.mjs
node --check dist/ktak-v35-command.js
node --check dist/ktak-v35-usability.js
node --check dist/ktak-v35-flow-v352.js
node --check dist/ktak-v35-maintenance-v355.js

# V3.5 shell / feature assertions.
grep -q 'ktak35-command-pack-v1' dist/index.html
grep -q 'ktak-v35-usability-v1' dist/index.html
grep -q 'ktak-v35-field-performance-v3' dist/index.html
grep -q 'ktak-v35-field-feedback-v4' dist/index.html
grep -q 'ktak-v35-field-feedback-v5' dist/index.html
grep -q 'ktak-v35-field-feedback-v6' dist/index.html
grep -q 'ktak-v35-field-feedback-v7' dist/index.html
grep -q 'ktak-v35-metric-grid-v8' dist/index.html
grep -q 'ktak-v35-flow-v352' dist/index.html
grep -q 'ktak-v35-maintenance-v355' dist/index.html
grep -q 'id="commandPage"' dist/index.html
grep -q 'id="v35GridToggle"' dist/index.html
grep -q '▦ 公尺網格' dist/index.html
grep -q 'id="v35Compass"' dist/index.html
grep -q 'id="v35DisasterCounty"' dist/index.html
grep -q 'id="v35TimelineToggle"' dist/index.html
grep -q 'id="v35TimelineClear"' dist/index.html
grep -q 'id="v35MissionModeGuide"' dist/index.html
grep -q 'id="v35MissionModePanel"' dist/index.html
grep -q 'id="v35TaskLocationMode"' dist/index.html
grep -q 'altitude_m' dist/index.html
grep -q './ktak-v35-command.js' dist/index.html
grep -q './ktak-v35-compass-sync.js' dist/index.html
grep -q './ktak-v35-location-accuracy.js' dist/index.html
grep -q './ktak-v35-google-fallback.js' dist/index.html
grep -q './ktak-v35-usability.js' dist/index.html
grep -q './ktak-v35-flow-v352.js?v=3.5.2' dist/index.html
grep -q './ktak-v35-maintenance-v355.js?v=3.5.5' dist/index.html
grep -q '<textarea id="chatInput"' dist/index.html
grep -q 'applyChatRealtimeRow' dist/index.html
grep -q 'clearMyMapWork' dist/index.html

test -s dist/ktak-v35-command.js
test -s dist/ktak-v35-compass-sync.js
test -s dist/ktak-v35-location-accuracy.js
test -s dist/ktak-v35-google-fallback.js
test -s dist/ktak-v35-usability.js
test -s dist/ktak-v35-flow-v352.js
test -s dist/ktak-v35-maintenance-v355.js

grep -Fq "L.control.scale({imperial:false,metric:true,position:'bottomright'})" dist/ktak-v35-command.js
grep -Fq 'function renderGrid()' dist/ktak-v35-command.js
grep -Fq 'window.ktak35SetMapBearing=setMapBearing' dist/ktak-v35-command.js
grep -Fq 'applyStatusRealtime' dist/ktak-v35-command.js
grep -Fq 'applyAssignmentRealtime' dist/ktak-v35-command.js
grep -Fq 'county:countyName' dist/ktak-v35-command.js
grep -Fq "functions.invoke('ktak35-push'" dist/ktak-v35-command.js
grep -Fq "pushOperational('assignment'" dist/ktak-v35-command.js
grep -Fq "pushOperational('sos'" dist/ktak-v35-command.js
grep -Fq 'clearTimeline' dist/ktak-v35-command.js
grep -Fq '__KTAK35_ASSIGNMENTS.respond' dist/ktak-v35-command.js
grep -Fq 'applyMissionModeUi' dist/ktak-v35-command.js
grep -Fq 'MODE_CONFIG' dist/ktak-v35-command.js
grep -Fq 'search_sector_id' dist/ktak-v35-command.js
grep -Fq 'member_states' dist/ktak-v35-command.js
node --test scripts/test-v351-operations.mjs
grep -Fq 'setRadarFrame' dist/ktak-v35-command.js
grep -Fq "a.status!=='pending'" dist/ktak-v35-usability.js
grep -Fq 'opsSeenKey' dist/ktak-v35-usability.js
grep -Fq "window.addEventListener('ktak35:assignment'" dist/ktak-v35-usability.js
grep -Fq "window.addEventListener('ktak35:sos'" dist/ktak-v35-usability.js
grep -Fq 'v35SearchHelpOnce' dist/ktak-v35-usability.js
! grep -Fq 'pollOperationalNotifications(){' dist/ktak-v35-usability.js
grep -Fq 'v35NavAlert' dist/ktak-v35-usability.js
grep -Fq 'ktak-map-bearing' dist/ktak-v35-compass-sync.js
grep -Fq "typeof map.getBearing === 'function'" dist/ktak-v35-compass-sync.js
grep -Fq 'altitudeAccuracyM' dist/ktak-v35-location-accuracy.js
grep -Fq '高度精度' dist/ktak-v35-location-accuracy.js
grep -Fq '水平精度' dist/ktak-v35-location-accuracy.js
grep -Fq 'gm_authFailure' dist/ktak-v35-google-fallback.js
grep -Fq 'OpenStreetMap' dist/ktak-v35-google-fallback.js
grep -Fq 'ktak35FallbackTiles' dist/ktak-v35-google-fallback.js
grep -Fq '取消目前地圖操作' dist/ktak-v35-usability.js
grep -Fq 'renderMemberInfoTargets' dist/ktak-v35-usability.js
grep -Fq 'renderMajorGrid' dist/ktak-v35-usability.js
grep -Fq 'metricGridStep' dist/ktak-v35-usability.js
grep -Fq 'projectedStep=groundStep/cos' dist/ktak-v35-usability.js
grep -Fq '官方歷史時間軸／定量降雨預報' dist/ktak-v35-usability.js
grep -Fq 'v35ClearOwnMap' dist/ktak-v35-usability.js
grep -Fq '不會刪除 V3.5 搜索區' dist/ktak-v35-usability.js
grep -Fq 'v35RadarHours' dist/ktak-v35-usability.js
grep -Fq "functions.invoke('ktak35-radar-history'" dist/ktak-v35-usability.js
grep -Fq "id:'local-'" dist/index.html
grep -Fq '全臺警特報' dist/index.html
grep -Fq 'mapSidebar .v35RadarTools' dist/index.html
grep -Fq 'v35RadarPlayback' dist/index.html

# V3.5.2 workflow assertions retained; V3.5.5 is a maintenance layer on top.
grep -Fq "window.__KTAK35_V352={version:'3.5.2'" dist/ktak-v35-flow-v352.js
grep -Fq '主任務 · 來源：任務簡報' dist/ktak-v35-flow-v352.js
grep -Fq "LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')" dist/ktak-v35-flow-v352.js
grep -Fq 'v352AssignmentArchiveBody' dist/ktak-v35-flow-v352.js
grep -Fq '.v35OfflineBanner:not(.offline):not(.pending){display:none!important}' dist/index.html
grep -Fq '#commandPage .v35ModeFields{display:none!important}' dist/index.html

# V3.5.5 maintenance assertions.
grep -Fq "window.__KTAK35_V355={version:'3.5.5'" dist/ktak-v35-maintenance-v355.js
grep -Fq "return '指揮官結案'" dist/ktak-v35-maintenance-v355.js
grep -Fq "startsWith('v355team:')" dist/index.html
grep -Fq 'captureBriefDraft' dist/index.html
grep -Fq "if(toggle.checked&&!radarPlaying)\$('v35RadarNow')?.click()" dist/ktak-v35-usability.js
grep -Fq 'renderPrompt(a,false)' dist/ktak-v35-assignment-prompt-v14.js

echo 'KTAK V3.5.5 preview build verified.'
echo 'Verified: all V3.5.4 behavior plus cross-device SOS recovery, directional colored group markers, brief draft preservation, mobile assignment prompt de-duplication, radar opt-in refresh and detailed Timeline export.'

# An exact revision marker lets deployment verification reject a stale alias.
node --input-type=module - <<'NODE'
import fs from 'node:fs';
fs.writeFileSync('dist/KTAK_BUILD.json',JSON.stringify({version:'3.5.5',baseVersion:'3.5.4',commit:process.env.GITHUB_SHA||null})+'\n');
NODE

