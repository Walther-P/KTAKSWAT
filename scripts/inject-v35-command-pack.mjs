import fs from 'node:fs';

const file='dist/index.html';
let html=fs.readFileSync(file,'utf8');
const rep=(a,b,label)=>{if(!html.includes(a))throw new Error(`KTAK35 marker missing: ${label}`);html=html.replace(a,b)};

if(html.includes('ktak35-command-pack-v1')){
  console.log('KTAK V3.5 command pack already injected');
  process.exit(0);
}

const css=`
/* KTAK ktak35-command-pack-v1 — Police / Fire Command Pack */
nav{grid-template-columns:repeat(6,1fr)}
.v35OfflineBanner{position:fixed;z-index:8050;left:50%;top:calc(58px + var(--safeTop));transform:translateX(-50%);font-size:10px;padding:4px 9px;border-radius:999px;background:#143324;border:1px solid #337d59;color:#bff2d2;pointer-events:none;box-shadow:0 3px 12px #0008}.v35OfflineBanner.offline{background:#5a3415;border-color:#bd7631;color:#ffe0ad}.v35OfflineBanner.pending{background:#3d3414;border-color:#8e7626;color:#ffe79a}
.v35CommandShell{max-width:1180px;margin:0 auto;padding:12px;display:grid;gap:10px}.v35Hero{border:1px solid #3a6579;background:linear-gradient(135deg,#10252f,#102027);border-radius:14px;padding:12px}.v35Hero h2{margin:0 0 4px;font-size:18px}.v35Hero .v35Mode{color:#91cfee;font-size:11px;font-weight:800}.v35Summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.v35Stat{border:1px solid #304752;background:#0d171c;border-radius:12px;padding:10px}.v35Stat small{display:block;color:#9db1ba;font-size:9px}.v35Stat b{display:block;font-size:22px;margin-top:2px}.v35CommandGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v35Card{border:1px solid #304550;background:#111c22;border-radius:13px;padding:11px;min-width:0}.v35Card h3{margin:0 0 8px;font-size:14px}.v35CardHead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.v35CardHead h3{margin:0}.v35Full{grid-column:1/-1}
.v35StatusRow{display:grid;grid-template-columns:1fr auto;align-items:center;gap:7px;border-top:1px solid #253943;padding:7px 2px;font-size:11px}.v35StatusRow:first-child{border-top:0}.v35StatusRow small{display:block;color:#91a7b1;font-size:9px;margin-top:2px}.v35StatusControls{display:grid;grid-template-columns:150px 1fr;gap:7px;margin-bottom:8px}.v35CheckList{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.v35Check{display:flex;align-items:center;gap:4px;padding:5px 8px;border:1px solid #38515e;border-radius:999px;background:#0d171c;font-size:10px}.v35Check input{width:auto}.v35Task,.v35Sector{border:1px solid #2d4652;border-radius:10px;padding:9px;background:#0c161b;margin-top:7px}.v35Task.priority-critical{border-color:#a83b3b;background:#281417}.v35Task.priority-high{border-color:#92682d}.v35TaskHead{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px}.v35TaskHead>span{font-size:9px;color:#aac0ca;white-space:nowrap}.v35TaskBody{font-size:11px;white-space:pre-wrap;margin:5px 0;color:#d8e5ea}.v35Task small{font-size:9px;color:#90a5af}.v35TaskActions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.v35TaskActions button{padding:5px 7px;font-size:9px}
.v35SosButton{width:100%;min-height:64px;border:2px solid #ee6969;background:#691f25;font-size:16px;border-radius:14px;position:relative;overflow:hidden}.v35SosButton::after{content:"";position:absolute;inset:0;background:#ff5b5b55;transform:scaleX(0);transform-origin:left;transition:transform 1.5s linear}.v35SosButton.holding::after{transform:scaleX(1)}.v35SosButton span{position:relative;z-index:2}.v35SosRow{display:flex;justify-content:space-between;gap:8px;padding:8px;border:1px solid #863c3c;background:#2b1518;border-radius:10px;margin-top:7px}.v35SosRow small{display:block;color:#d5a9a9;font-size:9px}.v35SosPin{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#d62e36;color:white;border:3px solid white;box-shadow:0 0 20px #ff2d36;font:900 11px sans-serif}
.v35Timeline{max-height:340px;overflow:auto}.v35TimelineRow{display:grid;grid-template-columns:88px 1fr;gap:8px;padding:7px 2px;border-bottom:1px solid #243740;font-size:10px}.v35TimelineRow>span{color:#8fa4af}.v35TimelineRow small{display:block;color:#8fa4af;font-size:9px;margin-top:2px}.v35SectorControls{display:grid;grid-template-columns:130px 1fr auto;gap:6px;margin-top:7px;align-items:center}.v35SectorControls input{padding:0}.v35SearchProgress{font-weight:900}
.v35MapAid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v35MapAid label{display:flex;align-items:center;gap:7px;border:1px solid #334c58;background:#0d171c;border-radius:9px;padding:8px;font-size:10px}.v35MapAid input{width:auto}.v35Compass{position:absolute;z-index:920;right:10px;top:10px;width:58px;height:72px;border-radius:12px;background:#0a141ae8;border:1px solid #486573;box-shadow:0 4px 14px #000a;display:grid;place-items:center;pointer-events:none}.v35CompassArrow{font-size:30px;line-height:1;transform-origin:center;transition:transform .18s ease}.v35Compass small{font-size:8px;color:#9fb5bf;margin-top:-7px}.v35FloorBox{border:1px solid #3d5662;border-radius:10px;padding:8px;background:#0d171c;margin-bottom:8px}.v35FloorBox label{font-size:10px;color:#a8bbc4;display:block;margin-bottom:5px}.v35FloorStatusLabel{font-weight:900;font-size:11px;margin-top:5px}
.v35StickerTray{display:none;grid-template-columns:repeat(4,1fr);gap:6px;padding:7px;border:1px solid #3b5562;border-radius:10px;background:#0b151a}.v35StickerTray.open{display:grid}.v35StickerTray button{display:grid;place-items:center;gap:1px;padding:6px 3px;min-height:55px}.v35StickerTray button span{font-size:24px}.v35StickerTray button small{font-size:8px}.v35StickerMessage{display:grid!important;place-items:center;text-align:center;min-width:110px;padding:7px}.v35StickerEmoji{font-size:42px;line-height:1.1;margin-bottom:3px}
.v35DisasterList{display:grid;gap:6px}.v35DisasterItem{padding:8px;border:1px solid #39505b;border-radius:9px;background:#0d171c;font-size:10px;line-height:1.45}.v35DisasterItem b{display:block;font-size:11px;margin-bottom:3px}.v35DisasterItem small{display:block;color:#8fa5af;margin-top:3px}.v35DisasterItem.level-warning{border-color:#8d7028;background:#29220f}.v35DisasterItem.level-danger{border-color:#9c3d3d;background:#2a1416}.v35DisasterOk{padding:9px;border:1px solid #276b4a;background:#102d20;border-radius:9px;color:#a9e8c3;font-size:10px}.v35OfficialLinks{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.v35OfficialLinks a{font-size:9px;color:#9fd9ff;text-decoration:none;border:1px solid #335466;border-radius:8px;padding:5px 7px;background:#0e1a20}
@media(max-width:820px){nav{grid-template-columns:repeat(6,minmax(86px,1fr))}.v35CommandGrid{grid-template-columns:1fr}.v35Full{grid-column:auto}.v35Summary{grid-template-columns:repeat(2,1fr)}.v35OfflineBanner{top:calc(52px + var(--safeTop))}.v35StatusControls{grid-template-columns:1fr}.v35StickerTray{grid-template-columns:repeat(4,1fr)}}
`;
rep('</style>',css+'\n</style>','css');

html=html.replace('<title>KTAK Mission Room V2.1 DEV6-C3.2</title>','<title>KTAK V3.5 Police / Fire Command</title>');
html=html.replace('<meta name="apple-mobile-web-app-title" content="KTAK">','<meta name="apple-mobile-web-app-title" content="KTAK 3.5">');
html=html.replace('<div class="brand"><div class="logo">K</div><div class="brandText"><b>KTAK Mission Room</b><small>V2.1 DEV6-C3.2 · PWA 安全驗證修正版</small></div></div>', '<div class="brand"><div class="logo">K</div><div class="brandText"><b>KTAK Command</b><small>V3.5 · Police / Fire Command Pack</small></div></div>');

rep('<button class="navBtn" data-page="chatPage">💬 聊天室</button>','<button class="navBtn" data-page="chatPage">💬 聊天室</button><button class="navBtn" data-page="commandPage">🚨 指揮</button>','command nav');

const commandPage=`
<section id="commandPage" class="page"><div class="v35CommandShell">
  <div class="v35Hero"><h2>KTAK V3.5 · Police / Fire Command Pack</h2><div class="v35Mode" id="v35MissionTemplateLabel">👮 高風險／戰術勤務</div><div class="muted">共同態勢、任務派遣、SOS、搜索進度、災害情報與任務時間軸。</div></div>
  <div class="v35Summary">
    <div class="v35Stat"><small>在線／總人員</small><b id="v35SummaryTeam">—</b></div><div class="v35Stat"><small>進行中任務</small><b id="v35SummaryTasks">—</b></div><div class="v35Stat"><small>目前 SOS</small><b id="v35SummarySos">—</b></div><div class="v35Stat"><small>搜索完成度</small><b id="v35SummarySearch">—</b></div>
  </div>
  <div class="v35CommandGrid">
    <div class="v35Card"><h3>👥 人員狀態</h3><div class="v35StatusControls"><select id="v35MyStatus"><option value="available">🟢 可派遣</option><option value="active">🔵 執行中</option><option value="standby">🟡 待命</option><option value="support">🟠 需要支援</option><option value="emergency">🔴 緊急</option></select><input id="v35MyStatusNote" maxlength="240" placeholder="狀態備註（選填）"></div><div id="v35TeamStatusList"></div></div>
    <div class="v35Card"><h3>🚨 SOS 緊急支援</h3><button id="v35SosHold" class="v35SosButton" type="button"><span>長按 1.5 秒送出 SOS</span></button><div class="muted" style="margin-top:6px">會附上目前定位與高度；房內成員可直接跳到該位置。</div><div id="v35SosList"></div></div>
    <div class="v35Card v35CommanderOnly"><h3>🧩 任務模式</h3><select id="v35MissionTemplate"><option value="police_tactical">👮 高風險／戰術勤務</option><option value="warrant">🚪 搜索／逮捕</option><option value="missing_person">🔎 失蹤人口搜索</option><option value="crowd">👥 群眾活動</option><option value="event_security">🛡️ 大型活動維安</option><option value="traffic_major">🚧 重大交通事故</option><option value="fire_building">🚒 建築火警</option><option value="wildfire">🔥 山林火災</option><option value="flood">🌊 淹水／水災</option><option value="earthquake">🏚️ 地震搜救</option><option value="water_rescue">🛟 水域救援</option><option value="mci">🚑 大量傷病患</option><option value="custom">⚙️ 自訂任務</option></select><div class="muted" style="margin-top:6px">模板會作為 V3.5 指揮介面的任務情境標記；後續工具會依模板逐步自動優先顯示。</div></div>
    <div class="v35Card v35CommanderOnly"><h3>📌 建立派遣</h3><input id="v35TaskTitle" maxlength="120" placeholder="例如：搜索 A 棟 3F"><textarea id="v35TaskDetails" maxlength="3000" placeholder="任務內容、集合點、注意事項" style="margin-top:6px;min-height:70px"></textarea><select id="v35TaskPriority" style="margin-top:6px"><option value="normal">優先度：一般</option><option value="high">優先度：高</option><option value="critical">優先度：緊急</option><option value="low">優先度：低</option></select><div class="label" style="margin-top:7px">指派隊員</div><div id="v35Assignees" class="v35CheckList"></div><button id="v35CreateTask" class="primary" style="width:100%">送出派遣</button></div>
    <div class="v35Card v35Full"><div class="v35CardHead"><h3>📋 任務派遣</h3><span class="muted">接受 → 執行 → 完成</span></div><div id="v35AssignmentList"></div></div>
    <div class="v35Card"><div class="v35CardHead"><h3>🔎 搜索區域</h3><span id="v35SearchProgress" class="v35SearchProgress"></span></div><button id="v35SearchSectorBtn" type="button">▦ 建立搜索區</button><button id="v35SearchCancel" class="hidden" type="button">取消劃設</button><div id="v35SectorList"></div></div>
    <div class="v35Card"><div class="v35CardHead"><h3>🌧️ 天氣／災害情報</h3><button id="v35DisasterRefresh" type="button">更新</button></div><div id="v35DisasterUpdated" class="muted"></div><div id="v35DisasterList" class="v35DisasterList"></div><div class="v35OfficialLinks"><a href="https://qpeplus.cwa.gov.tw/pub/" target="_blank" rel="noopener">CWA 雷達／QPE</a><a href="https://fhy.wra.gov.tw/" target="_blank" rel="noopener">水利署防災資訊</a><a href="https://246.ardswc.gov.tw/Monitoring/Map" target="_blank" rel="noopener">土石流防災地圖</a></div></div>
    <div class="v35Card v35Full"><h3>🕒 任務 Timeline</h3><div id="v35Timeline" class="v35Timeline"></div></div>
  </div>
</div></section>
`;
rep('<section id="permissionPage" class="page">',commandPage+'\n<section id="permissionPage" class="page">','command page');

rep('<div class="card"><h3>地圖操作</h3>',`<div class="card"><h3>V3.5 地圖輔助</h3><div class="v35MapAid"><label><input id="v35GridToggle" type="checkbox">▦ 經緯網格</label><label><input id="v35RadarToggle" type="checkbox">🌧️ 雷達回波</label></div><div class="row" style="margin-top:7px"><button id="v35SearchSectorBtnMap" type="button" style="flex:1">▦ 搜索區</button></div><div class="muted" style="margin-top:6px">右下角顯示公制比例尺；右上角指北針固定指向北方。雷達回波使用中央氣象署臺灣鄰近區域整合回波圖。</div></div><div class="card"><h3>地圖操作</h3>`,'map aids');
rep('<div id="mapProviderBadge" class="mapProviderBadge">底圖：初始化中</div>', '<div id="mapProviderBadge" class="mapProviderBadge">底圖：初始化中</div><div id="v35Compass" class="v35Compass" aria-label="指北針"><div id="v35CompassArrow" class="v35CompassArrow">↑<div style="font-size:9px;text-align:center;margin-top:-5px">N</div></div><small id="v35CompassDeg">0°</small></div>','compass');

rep('<div class="card"><h3>畫筆 / 物件</h3>',`<div class="v35FloorBox"><label>V3.5 建築／樓層搜索狀態</label><select id="v35FloorStatus"><option value="unknown">⬜ UNKNOWN</option><option value="searching">🔵 SEARCHING</option><option value="clear">✅ CLEAR</option><option value="danger">⚠️ DANGER</option><option value="fire">🔥 FIRE</option><option value="blocked">⛔ BLOCKED</option></select><div id="v35FloorStatusLabel" class="v35FloorStatusLabel">—</div></div><div class="card"><h3>畫筆 / 物件</h3>`,'floor status');

rep('<button id="chatTagBtn" type="button">@ Tag</button>', '<button id="chatTagBtn" type="button">@ Tag</button><button id="v35StickerBtn" type="button">😀 貼圖</button>','sticker button');
rep('<div class="chatInput"><input id="chatInput" placeholder="輸入訊息…">', '<div id="v35StickerTray" class="v35StickerTray"></div><div class="chatInput"><input id="chatInput" placeholder="輸入訊息…">','sticker tray');

rep('<main>', '<div id="v35OfflineBanner" class="v35OfflineBanner">● 線上同步</div><main>','offline banner');

rep('const {data,error}=await sb.from("ktak_member_locations").select("user_id,lat,lng,accuracy_m,updated_at").eq("room_id",currentRoomUuid);', 'const {data,error}=await sb.from("ktak_member_locations").select("user_id,lat,lng,accuracy_m,altitude_m,altitude_accuracy_m,speed_mps,heading_deg,updated_at").eq("room_id",currentRoomUuid);','location select');
rep('(data||[]).forEach(r=>{memberLocations[r.user_id]={userId:r.user_id,lat:+r.lat,lng:+r.lng,accuracyM:r.accuracy_m==null?null:+r.accuracy_m,updatedAt:r.updated_at}});', '(data||[]).forEach(r=>{memberLocations[r.user_id]={userId:r.user_id,lat:+r.lat,lng:+r.lng,accuracyM:r.accuracy_m==null?null:+r.accuracy_m,altitudeM:r.altitude_m==null?null:+r.altitude_m,altitudeAccuracyM:r.altitude_accuracy_m==null?null:+r.altitude_accuracy_m,speedMps:r.speed_mps==null?null:+r.speed_mps,headingDeg:r.heading_deg==null?null:+r.heading_deg,updatedAt:r.updated_at}});','location map');
rep('else memberLocations[row.user_id]={userId:row.user_id,lat:+row.lat,lng:+row.lng,accuracyM:row.accuracy_m==null?null:+row.accuracy_m,updatedAt:row.updated_at};', 'else memberLocations[row.user_id]={userId:row.user_id,lat:+row.lat,lng:+row.lng,accuracyM:row.accuracy_m==null?null:+row.accuracy_m,altitudeM:row.altitude_m==null?null:+row.altitude_m,altitudeAccuracyM:row.altitude_accuracy_m==null?null:+row.altitude_accuracy_m,speedMps:row.speed_mps==null?null:+row.speed_mps,headingDeg:row.heading_deg==null?null:+row.heading_deg,updatedAt:row.updated_at};','location realtime');
rep('const {error}=await sb.from("ktak_member_locations").upsert({room_id:currentRoomUuid,user_id:currentUserId,lat:loc.lat,lng:loc.lng,accuracy_m:loc.accuracyM,updated_at:loc.updatedAt},{onConflict:"room_id,user_id"});if(error)throw error', 'const {error}=await sb.from("ktak_member_locations").upsert({room_id:currentRoomUuid,user_id:currentUserId,lat:loc.lat,lng:loc.lng,accuracy_m:loc.accuracyM,altitude_m:loc.altitudeM,altitude_accuracy_m:loc.altitudeAccuracyM,speed_mps:loc.speedMps,heading_deg:loc.headingDeg,updated_at:loc.updatedAt},{onConflict:"room_id,user_id"});if(error)throw error','location write');
rep('const loc={userId:currentUserId,lat:+c.latitude,lng:+c.longitude,accuracyM:Number.isFinite(c.accuracy)?+c.accuracy:null,updatedAt:new Date(pos.timestamp||Date.now()).toISOString()};', 'const loc={userId:currentUserId,lat:+c.latitude,lng:+c.longitude,accuracyM:Number.isFinite(c.accuracy)?+c.accuracy:null,altitudeM:Number.isFinite(c.altitude)?+c.altitude:null,altitudeAccuracyM:Number.isFinite(c.altitudeAccuracy)?+c.altitudeAccuracy:null,speedMps:Number.isFinite(c.speed)?+c.speed:null,headingDeg:Number.isFinite(c.heading)?+c.heading:null,updatedAt:new Date(pos.timestamp||Date.now()).toISOString()};','location fix');
rep('const accuracy=loc&&Number.isFinite(loc.accuracyM)?`±${Math.round(loc.accuracyM)}m`:"精度—";', 'const accuracy=loc&&Number.isFinite(loc.accuracyM)?`±${Math.round(loc.accuracyM)}m`:"精度—",altitude=loc&&Number.isFinite(loc.altitudeM)?` · 高度 ${Math.round(loc.altitudeM)}m${Number.isFinite(loc.altitudeAccuracyM)?` ±${Math.round(loc.altitudeAccuracyM)}m`:""}`:" · 高度—";','location display var');
rep('${loc?accuracy:"未分享位置"}</small>', '${loc?accuracy+altitude:"未分享位置"}</small>','location display');

const bridge=`
window.__KTAK35_CORE={
  get sb(){return sb},get state(){return state},get roomUuid(){return currentRoomUuid},get roomCode(){return roomId},get userId(){return currentUserId},get map(){return map},get memberLocations(){return memberLocations},
  role:()=>role(),displayName:()=>displayName(),toast:t=>toast(t),
  openMapAt:(lat,lng,z=18)=>{const b=document.querySelector('[data-page="mapPage"]');b?.click();setTimeout(()=>{map.invalidateSize();map.setView([lat,lng],z)},80)},
  openMapPage:()=>document.querySelector('[data-page="mapPage"]')?.click(),
  renderMemberLocations:()=>renderMemberLocations()
};
`;
rep('/* restore online room session if possible */',bridge+'\n/* restore online room session if possible */','core bridge');
rep('renderMembers();refreshPushUi().catch(e=>console.warn("push ui",e))}', 'renderMembers();refreshPushUi().catch(e=>console.warn("push ui",e));setTimeout(()=>window.__KTAK35?.onCoreRender?.(),0)}','render hook');

rep('</body>', '<script src="./ktak-v35-command.js"></script>\n</body>','runtime script');

fs.writeFileSync(file,html);

const manifestPath='dist/manifest.webmanifest';
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
manifest.name='KTAK V3.5 Police / Fire Command';manifest.short_name='KTAK 3.5';manifest.start_url='./?v=3.5-command';manifest.id='./?app=ktak-v35-command';manifest.description='KTAK V3.5 Police / Fire Command Pack';
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');

for(const marker of ['ktak35-command-pack-v1','id="commandPage"','id="v35Compass"','id="v35GridToggle"','id="v35SosHold"','id="v35StickerBtn"','altitude_m','window.__KTAK35_CORE','ktak-v35-command.js'])if(!html.includes(marker))throw new Error('KTAK35 self-check failed: '+marker);
console.log('KTAK V3.5 Police / Fire Command Pack shell injected.');

