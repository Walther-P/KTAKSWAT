import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Polish marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Polish regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK V3 polish-v1: stable lock, route/fan colors, accordion tactics, multi-room */
#app{grid-template-rows:auto auto auto 1fr!important}
.roomSwitcherBar{min-height:40px;display:flex;align-items:center;gap:7px;padding:5px 10px;background:#0b1419;border-bottom:1px solid #293d47;overflow-x:auto;white-space:nowrap;z-index:46}
.roomSwitcherLabel{font-size:10px;color:#8fa6b1;font-weight:850;flex:0 0 auto}
.roomSwitcherTabs{display:flex;gap:5px;align-items:center;min-width:0;flex:1;overflow-x:auto;scrollbar-width:thin}
.roomSwitchBtn{padding:6px 9px!important;font-size:10px!important;border-radius:999px!important;white-space:nowrap;flex:0 0 auto;background:#142129!important}
.roomSwitchBtn.active{background:#165071!important;border-color:#45aff2!important;outline:1px solid #45aff2}
#roomSwitcherAdd{padding:6px 8px!important;font-size:10px!important;flex:0 0 auto}
.tacticalListGrid.ktakAccordionReady{display:block!important}
.tacticalAccordion{border:1px solid #2b414c;border-radius:9px;background:#0c151a;margin-top:6px;overflow:hidden}
.tacticalAccordion>summary{list-style:none;cursor:pointer;padding:9px 10px;font-size:11px;font-weight:850;color:#d7e6ed;display:flex;align-items:center;justify-content:space-between;gap:8px;user-select:none}
.tacticalAccordion>summary::-webkit-details-marker{display:none}
.tacticalAccordion>summary::after{content:'＋';font-size:14px;color:#8db4c7}
.tacticalAccordion[open]>summary::after{content:'−'}
.tacticalAccordionBody{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:7px;border-top:1px solid #243842}
.routeColorControl{display:grid;grid-template-columns:auto 52px;gap:8px;align-items:center;margin-top:7px;padding:6px 8px;border:1px solid #304651;border-radius:8px;background:#0b151a}
.routeColorControl span{font-size:10px;color:#a9bec8;font-weight:800}
#routeDraftColor,.routeSharedColor,#mapCtxFanColor{height:34px;padding:3px;border-radius:8px;min-width:44px}
.routeSharedRow{grid-template-columns:1fr auto auto!important}
.routeSharedColor{width:40px!important;padding:2px!important}
.fanColorLabel{font-size:9px;color:#9fb1ba;white-space:nowrap;align-self:center}
@media(max-width:820px){.roomSwitcherBar{padding:4px 6px;min-height:38px}.roomSwitcherLabel{display:none}.roomSwitchBtn{padding:6px 8px!important}.routeSharedRow{grid-template-columns:1fr auto auto!important}}
`;
replaceOnce('</style>', css + '\n</style>', 'polish css');

replaceOnce(
  '</header>\n<nav>',
  `</header>
<div id="roomSwitcherBar" class="roomSwitcherBar">
  <span class="roomSwitcherLabel">任務房間</span>
  <div id="roomSwitcherTabs" class="roomSwitcherTabs"><span class="muted">進房後顯示已加入房間</span></div>
  <button id="roomSwitcherAdd" type="button">＋ 房間</button>
</div>
<nav>`,
  'room switcher bar',
);

// Locking an already-unlocked item is committed on pointer release. This avoids
// destroying/recreating the Leaflet layer while the same finger is still down,
// which caused the selection frame to flash back on some phones.
replaceOnce(
  "timer=setTimeout(()=>{if(moved)return;if(selectedMapId===item.id&&longTriggered){selectedMapId=null;longTriggered=true;window.__ktakRoute?.clearNodeEditor?.();toast('已確認定位，物件已鎖定');renderMapItems();return}longTriggered=true;selectedMapId=item.id;toast('已進入編輯：可直接拖曳；右下 ↻ 旋轉／縮放；左上 ＋ 可複製');renderMapItems();window.__ktakRoute?.onLongPressItem?.(item)},500);",
  "timer=setTimeout(()=>{if(moved)return;if(selectedMapId===item.id&&longTriggered){longTriggered=true;window.__ktakRoute?.clearNodeEditor?.();toast('已確認定位，放開手指後鎖定');let done=false;const finalize=()=>{if(done)return;done=true;document.removeEventListener('pointerup',finalize);document.removeEventListener('pointercancel',finalize);if(selectedMapId===item.id){selectedMapId=null;renderMapItems()}};document.addEventListener('pointerup',finalize,{once:true});document.addEventListener('pointercancel',finalize,{once:true});return}longTriggered=true;selectedMapId=item.id;toast('已進入編輯：可直接拖曳；右下 ↻ 旋轉／縮放；左上 ＋ 可複製');renderMapItems();window.__ktakRoute?.onLongPressItem?.(item)},500);",
  'deferred second-long-press lock',
);

// Shared-route colors: choose before save and allow per-route recoloring later.
replaceOnce(
  '<div class="row" style="margin-top:7px;align-items:center"><input id="routeDraftSpeed" type="number" min="1" max="160" value="40" inputmode="decimal"><span class="muted" style="white-space:nowrap">km/h</span></div>',
  '<div class="row" style="margin-top:7px;align-items:center"><input id="routeDraftSpeed" type="number" min="1" max="160" value="40" inputmode="decimal"><span class="muted" style="white-space:nowrap">km/h</span></div><div class="routeColorControl"><span>路線顏色</span><input id="routeDraftColor" type="color" value="#ffb300" title="選擇共享路線顏色"></div>',
  'route draft color control',
);
replaceOnce(
  "      color: '#ffb300',",
  "      color: $(\"routeDraftColor\")?.value || '#ffb300',",
  'route saved color',
);
replaceOnce(
  "        color: '#00e5ff', weight: 5, opacity: 1, dashArray: '10,5', interactive: false,",
  "        color: $(\"routeDraftColor\")?.value || '#00e5ff', weight: 5, opacity: 1, dashArray: '10,5', interactive: false,",
  'route draft preview color',
);
replaceOnce(
  "      color:'#00e5ff', weight:4, opacity:.9, dashArray:'7,6', interactive:false,",
  "      color:$(\"routeDraftColor\")?.value||'#00e5ff', weight:4, opacity:.9, dashArray:'7,6', interactive:false,",
  'route segment preview color',
);
replaceOnce(
  '  $("routeDraftSpeed")?.addEventListener(\'input\', updateUi);',
  '  $("routeDraftSpeed")?.addEventListener(\'input\', updateUi);\n  $("routeDraftColor")?.addEventListener(\'input\', ()=>{redrawDraft();});',
  'route color live preview listener',
);
replaceOnce(
  '      row.appendChild(main);\n      if (canEditItem(item)) {',
  `      row.appendChild(main);
      if (canEditItem(item)) {
        const color=document.createElement('input');
        color.type='color';color.className='routeSharedColor';color.value=item.color||'#ffb300';color.title='變更路線顏色';
        color.onchange=()=>{pushMapHistory();item.color=color.value;publish();renderMapItems();toast('已更新「'+(item.label||'導航路線')+'」顏色')};
        row.appendChild(color);`,
  'shared route recolor control',
);

// Observation fan color selector.
replaceOnce(
  '      <option value="90">扇形 90°</option>\n    </select>\n  </div>',
  '      <option value="90">扇形 90°</option>\n    </select>\n    <span class="fanColorLabel">顏色</span><input id="mapCtxFanColor" type="color" value="#ffc650" title="觀察扇形顏色">\n  </div>',
  'fan color input',
);
replaceOnce(
  "function renderFansOnly(){fanLayer.clearLayers();state.map.items.forEach(item=>{const p=fanPolygon(item);if(p)L.polygon(p,{color:'#ffc650',weight:1.5,fillColor:'#ffc650',fillOpacity:.20,interactive:false}).addTo(fanLayer)})}",
  "function renderFansOnly(){fanLayer.clearLayers();state.map.items.forEach(item=>{const p=fanPolygon(item);if(p){const fc=item.fan?.color||'#ffc650';L.polygon(p,{color:fc,weight:1.5,fillColor:fc,fillOpacity:.20,interactive:false}).addTo(fanLayer)}})}",
  'fan per-item rendering color',
);
replaceOnce(
  '  if(item.fan)$("mapCtxFanAngle").value=String(item.fan.angle||60);',
  '  if(item.fan){$("mapCtxFanAngle").value=String(item.fan.angle||60);if($("mapCtxFanColor"))$("mapCtxFanColor").value=item.fan.color||"#ffc650"}',
  'fan menu current color',
);
replaceOnce(
  '$("mapCtxFanAngle").onchange=()=>{\n  const item=itemById(selectedMapId);if(item&&canEditItem(item)&&item.fan){item.fan.angle=+$("mapCtxFanAngle").value||60;publish();renderFansOnly()}\n};',
  '$("mapCtxFanAngle").onchange=()=>{\n  const item=itemById(selectedMapId);if(item&&canEditItem(item)&&item.fan){item.fan.angle=+$("mapCtxFanAngle").value||60;publish();renderFansOnly()}\n};\n$("mapCtxFanColor").onchange=()=>{const item=itemById(selectedMapId);if(item&&canEditItem(item)&&item.fan){item.fan.color=$("mapCtxFanColor").value||"#ffc650";publish();renderFansOnly()}};',
  'fan color change handler',
);
replaceOnce(
  '      const ll=map.mouseEventToLatLng(ev);item.fan=item.fan||{};item.fan.angle=+$("mapCtxFanAngle").value||60;',
  '      const ll=map.mouseEventToLatLng(ev);item.fan=item.fan||{};item.fan.angle=+$("mapCtxFanAngle").value||60;item.fan.color=$("mapCtxFanColor")?.value||item.fan.color||"#ffc650";',
  'fan initial color while drawing',
);

// On startup, reclaim the last saved room by device key rather than depending
// solely on the current anonymous auth user id. This makes PWA reopen resilient.
replaceRegexOnce(
  /const \{data:member,error\}=await sb\.from\("ktak_room_members"\)\.select\("user_id,approved"\)\.eq\("room_id",savedRoom\)\.eq\("user_id",currentUserId\)\.maybeSingle\(\);\s*if\(!error&&member\)\{\s*if\(member\.approved\)\{await loadOnlineRoom\(savedRoom\);await enterRoom\(\);return\}\s*const savedCode=window\.__ktakEnhance\?\.savedRoomCode\(\)\|\|"房間";\s*await waitForApproval\(savedRoom,savedCode,"目前使用者"\);return\s*\}/,
  'const {data:switched,error}=await sb.rpc("ktak_switch_device_room",{p_room_id:savedRoom,p_device_key:window.__ktakEnhance?.deviceKey?.()});\n      const recovered=Array.isArray(switched)?switched[0]:switched;\n      if(!error&&recovered?.status==="OK"){await loadOnlineRoom(savedRoom);await enterRoom();return}',
  'device-based saved room restore',
);

function ktakPolishRuntime(){
  function accordionize(root){
    if(!root||root.classList.contains('ktakAccordionReady'))return;
    const children=Array.from(root.children);
    let body=null;
    children.forEach(node=>{
      if(node.classList.contains('tacticalGroupTitle')){
        const details=document.createElement('details');details.className='tacticalAccordion';
        const summary=document.createElement('summary');summary.textContent=node.textContent||'圖樣';
        body=document.createElement('div');body.className='tacticalAccordionBody';
        details.append(summary,body);root.insertBefore(details,node);node.remove();
      }else if(body&&node.classList.contains('tacticalPickBtn')){
        body.appendChild(node);
      }
    });
    root.classList.add('ktakAccordionReady');
  }
  accordionize($("mapTacticalList"));
  accordionize($("boardTacticalList"));

  async function refreshRoomSwitcher(){
    const host=$("roomSwitcherTabs");if(!host||!sb||!currentUserId)return;
    const key=window.__ktakEnhance?.deviceKey?.();if(!key)return;
    const {data,error}=await sb.rpc('ktak_list_device_rooms',{p_device_key:key});
    if(error){console.warn('list device rooms',error);return}
    const rooms=Array.isArray(data)?data:[];host.innerHTML='';
    if(!rooms.length){host.innerHTML='<span class="muted">目前只有此任務房間</span>';return}
    rooms.forEach(r=>{
      const b=document.createElement('button');b.type='button';b.className='roomSwitchBtn'+(r.room_id===currentRoomUuid?' active':'');
      b.textContent=(r.room_code||'ROOM')+(r.room_id===currentRoomUuid?' · 現在':'');b.title='切換到 '+(r.room_code||'任務房間');
      b.onclick=async()=>{
        if(r.room_id===currentRoomUuid)return;
        b.disabled=true;toast('正在切換到 '+(r.room_code||'任務房間')+'…');
        try{
          await stopLocationSharing({removeRemote:true,silent:true});
          if(roomChannel&&sb)await sb.removeChannel(roomChannel);
          const {data:sw,error:swErr}=await sb.rpc('ktak_switch_device_room',{p_room_id:r.room_id,p_device_key:key});
          if(swErr)throw swErr;const row=Array.isArray(sw)?sw[0]:sw;
          if(!row||row.status!=='OK')throw new Error(row?.status||'SWITCH_FAILED');
          window.__ktakEnhance?.rememberRoom(r.room_id,r.room_code||'ROOM');
          location.reload();
        }catch(e){console.error(e);toast('切換房間失敗：'+(e.message||e));b.disabled=false}
      };
      host.appendChild(b);
    });
  }

  const add=$("roomSwitcherAdd");
  if(add)add.onclick=()=>{
    let close=$("roomManagerClose");
    if(!close){close=document.createElement('button');close.id='roomManagerClose';close.type='button';close.textContent='返回目前房間';close.style.cssText='width:100%;margin-top:10px';$("entryHome")?.appendChild(close)}
    close.onclick=()=>$("entryOverlay")?.classList.add('hidden');
    showEntry('home');$("entryOverlay")?.classList.remove('hidden');
  };

  const originalEnterRoom=enterRoom;
  enterRoom=async function(){await originalEnterRoom();await refreshRoomSwitcher().catch(e=>console.warn('room switcher refresh',e))};
  window.__ktakRoomSwitcher={refresh:refreshRoomSwitcher};
}

const bootIndex=html.lastIndexOf('(async()=>{');
if(bootIndex<0)throw new Error('Polish boot marker missing');
html=html.slice(0,bootIndex)+';('+ktakPolishRuntime.toString()+')();\n'+html.slice(bootIndex);

if(!html.includes('polish-v1')||!html.includes('routeDraftColor')||!html.includes('mapCtxFanColor')||!html.includes('roomSwitcherTabs')||!html.includes('ktak_list_device_rooms')||!html.includes('tacticalAccordion')){
  throw new Error('KTAK polish-v1 self-check failed');
}

fs.writeFileSync(file,html);
console.log('KTAK polish-v1 applied: stable lock, route/fan colors, compact tactical groups, multi-room switching and resilient reopen.');

