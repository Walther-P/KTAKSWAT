(() => {
  'use strict';
  const engine=window.__KTAK6_CANVAS,space=window.__KTAK6,editor=window.__KTAK6_EDITOR;
  if(!engine||!space)return;
  const $=id=>document.getElementById(id);
  const button=(label,fn,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.addEventListener('click',fn);return b};
  let closeRadial=()=>{};
  for(const board of [false,true]){
    const page=$(board?'boardPage':'mapPage'),surface=board?$('boardCanvas'):window.__KTAK35_CORE.map.getContainer();
    // The original canvas ID is resolved from its existing container.
    const target=surface||$('boardWrap').querySelector('canvas');
    const layer=document.createElement('div');layer.className='g6-radial-backdrop hidden';
    const ring=document.createElement('div');ring.className='g6-radial';ring.setAttribute('role','dialog');ring.setAttribute('aria-modal','true');ring.setAttribute('aria-label',board?'戰術板轉盤':'地圖轉盤');
    const center=button('關閉 ×',()=>close());center.className='g6-radial-center';ring.append(center);layer.append(ring);page.append(layer);
    let opener=null;
    const close=()=>{layer.classList.add('hidden');opener?.focus();opener=null};
    const actions=board?
      [['標記',()=>space.openTools(true,'標記')],['繪圖',()=>space.openTools(true,'繪圖')],['平面圖',()=>space.openTools(true,'平面圖')],['選取',()=>editor.cancel()],['復原',()=>$('boardUndoBtn').click()]]:
      [['標記',()=>space.openTools(false,'標記')],['繪圖',()=>space.openTools(false,'繪圖')],['照片',()=>space.openTools(false,'照片')],['位置',()=>space.openTools(false,'隊員')],['復原',()=>$(engine.mapMode==='route'?'routeDraftUndo':'mapUndoBtn').click()]];
    actions.forEach(([label,fn],i)=>{const b=button(label,()=>{close();fn()});b.style.setProperty('--angle',`${i*360/actions.length-90}deg`);b.className='g6-radial-action';ring.append(b)});
    function open(x,y){
      space.closePanel();closeRadial();closeRadial=close;
      opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
      const rect=page.getBoundingClientRect(),radius=Math.min(146,(rect.height-12)/2,(rect.width-12)/2);
      ring.style.setProperty('--radius',radius+'px');
      ring.style.left=Math.max(radius+6,Math.min(rect.width-radius-6,x-rect.left))+'px';
      ring.style.top=Math.max(radius+6,Math.min(rect.height-radius-6,y-rect.top))+'px';
      layer.classList.remove('hidden');engine.stopBoardPan();center.focus();
    }
    layer.addEventListener('click',e=>{if(e.target===layer)close()});
    layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}if(e.key==='Tab'){const bs=[...ring.querySelectorAll('button')];const i=bs.indexOf(document.activeElement);bs[(i+(e.shiftKey?-1:1)+bs.length)%bs.length].focus();e.preventDefault()}});
    const trigger=button('＋ 工具',()=>{const r=page.getBoundingClientRect();open(r.right-155,r.bottom-156)},'g6-tool-trigger');
    trigger.title='按住空白畫面即可開啟工具';page.append(trigger);
    let hold=null,timer=0,blockedUntil=0,lastTouchAt=0;
    const contacts=new Set();
    const cancelHold=()=>{clearTimeout(timer);timer=0;hold=null};
    page.addEventListener('pointerdown',e=>{
      if(!contacts.size)blockedUntil=0;
      contacts.add(e.pointerId);if(e.pointerType==='touch')lastTouchAt=Date.now();
      if(contacts.size>1){cancelHold();return}
      if(!target.contains(e.target)||e.button!==0||!engine.canOpenMenu(board,e))return;
      hold={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,travel:0,ready:false,room:window.__KTAK35_CORE.roomUuid};
      timer=setTimeout(()=>{if(hold&&contacts.size===1&&hold.room===window.__KTAK35_CORE.roomUuid){hold.ready=true;blockedUntil=Date.now()+60000;open(hold.x,hold.y)}},600);
    },true);
    const moved=e=>{
      if(!hold||hold.id!==e.pointerId)return;
      if(hold.ready)return;
      const samples=e.getCoalescedEvents?.();
      for(const p of samples?.length?samples:[e]){
        hold.travel+=Math.hypot(p.clientX-hold.lastX,p.clientY-hold.lastY);hold.lastX=p.clientX;hold.lastY=p.clientY;
        if(Math.hypot(p.clientX-hold.x,p.clientY-hold.y)>9||hold.travel>24){cancelHold();return}
      }
    };
    page.addEventListener('pointermove',moved,true);
    page.addEventListener('pointerup',e=>{
      moved(e);const p=hold;
      const wasOpened=p?.id===e.pointerId&&p.ready;
      contacts.delete(e.pointerId);cancelHold();
      if(wasOpened){blockedUntil=Date.now()+700;e.preventDefault()}
    },true);
    const cancelled=e=>{contacts.delete(e.pointerId);cancelHold()};
    page.addEventListener('pointercancel',cancelled,true);page.addEventListener('lostpointercapture',cancelled,true);
    // Window cleanup runs after the surface's release handler.
    window.addEventListener('pointerup',cancelled);window.addEventListener('pointercancel',cancelled);
    page.addEventListener('scroll',cancelHold,true);
    document.querySelector('#app>nav').addEventListener('click',()=>{cancelHold();contacts.clear()});
    document.addEventListener('visibilitychange',()=>{cancelHold();contacts.clear()});
    if(!board)for(const event of ['dragstart','zoomstart'])window.__KTAK35_CORE.map.on?.(event,cancelHold);
    page.addEventListener('click',e=>{if(Date.now()<blockedUntil){e.stopImmediatePropagation();e.preventDefault()}},true);
    target.addEventListener('contextmenu',e=>{if(engine.canOpenMenu(board,e)){e.preventDefault();e.stopImmediatePropagation();if(e.pointerType==='touch'||Date.now()-lastTouchAt<1500)return;cancelHold();open(e.clientX,e.clientY)}},true);
    page.addEventListener('selectstart',e=>{if(!e.target.closest('input,textarea,[contenteditable="true"]'))e.preventDefault()});
    const mode=document.createElement('div');mode.className='g6-draw-mode hidden';
    const text=document.createElement('span');mode.append(text);
    if(!board){const color=document.createElement('input');color.type='color';color.value=engine.color;color.setAttribute('aria-label','繪圖顏色');color.addEventListener('input',()=>engine.color=color.value);mode.append(color)}
    mode.append(button('完成',()=>{editor.cancel();tick()}));page.append(mode);
    const toolNames={line:'直線',rect:'方形',circle:'圓形',free:'畫筆',freeShape:'封閉範圍',eraser:'橡皮擦',symbol:'圖樣',shapeSymbol:'形狀',photo:'照片',text:'文字'};
    function tick(){
      const tool=board?engine.boardMode:engine.mapMode;
      mode.classList.toggle('hidden',['pan','select','route'].includes(tool));
      text.textContent=(toolNames[tool]||'繪圖')+' · '+(['symbol','shapeSymbol','photo','text'].includes(tool)?'點選放置':'按住拖曳');
    }
    page.addEventListener('click',()=>queueMicrotask(tick));
    document.addEventListener('g6:canvas-tick',tick);
  }
  document.querySelector('#app>nav').addEventListener('click',()=>{closeRadial();space.closePanel()});

  // Relocate the actual search controls; preserve their listeners and geocoder.
  const page=$('mapPage'),search=$('mapSearch').closest('.card');
  search.classList.remove('g6-filtered');search.classList.add('g6-search');
  search.querySelector('h3').remove();$('mapSearch').placeholder='搜尋地址或地點';$('mapSearch').setAttribute('aria-label','搜尋地址或地點');
  $('googleAddressBtn').textContent='G 搜尋';$('streetViewBtn').textContent='街景';$('mapLayerBtn').textContent='衛星';
  const actions=$('googleAddressBtn').parentElement;actions.classList.add('g6-search-actions');
  const providerCard=document.createElement('div');providerCard.className='card';const ph=document.createElement('h3');ph.textContent='地圖底圖';providerCard.append(ph,$('mapProviderBtn').parentElement);$('mapSidebar').querySelector('.g6-panel-body').append(providerCard);
  const status=$('searchStatus');status.textContent='';status.setAttribute('aria-live','polite');
  const collapse=button('⌄',()=>{const closed=search.classList.toggle('g6-search-folded');collapse.textContent=closed?'⌄':'⌃';collapse.setAttribute('aria-expanded',String(!closed))});collapse.setAttribute('aria-label','展開或收起地圖搜尋選項');collapse.setAttribute('aria-expanded','false');search.classList.add('g6-search-folded');search.querySelector('.searchRow').append(collapse);
  const chrome=document.createElement('div');chrome.className='g6-map-chrome';chrome.append(search);page.append(chrome);
  const searchToggle=button('⌕ 搜尋',()=>{const expanded=chrome.classList.toggle('g6-search-expanded');searchToggle.setAttribute('aria-expanded',String(expanded));if(expanded)$('mapSearch').focus()},'g6-search-toggle');searchToggle.setAttribute('aria-expanded','false');searchToggle.setAttribute('aria-label','展開或收起地址搜尋');chrome.prepend(searchToggle);
  const members=document.createElement('details');members.className='g6-members';const summary=document.createElement('summary');summary.textContent='在線隊員';const memberList=document.createElement('div');members.append(summary,memberList);chrome.append(members);
  const center=button('◎',()=>$('locationCenterBtn').click(),'g6-center');center.title='我的位置';center.setAttribute('aria-label','我的位置');page.append(center);
  const aidHandle=button('◀',()=>{if(!aidDragged){closeRadial();space.openTools(false,'圖層')}},'g6-aid-handle');
  aidHandle.title='地圖輔助 · 可上下拖動';aidHandle.setAttribute('aria-label','地圖輔助，可上下拖動');page.append(aidHandle);
  let aidDrag=null,aidDragged=false;
  aidHandle.addEventListener('pointerdown',e=>{aidDragged=false;aidDrag={id:e.pointerId,y:e.clientY,top:aidHandle.offsetTop};aidHandle.setPointerCapture?.(e.pointerId)});
  aidHandle.addEventListener('pointermove',e=>{if(!aidDrag||aidDrag.id!==e.pointerId)return;if(Math.abs(e.clientY-aidDrag.y)>5)aidDragged=true;if(aidDragged){e.preventDefault();aidHandle.style.top=Math.max(12,Math.min(page.clientHeight-56,aidDrag.top+e.clientY-aidDrag.y))+'px'}});
  aidHandle.addEventListener('pointerup',()=>{aidDrag=null});aidHandle.addEventListener('pointercancel',()=>{aidDrag=null;aidDragged=true});
  aidHandle.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();aidHandle.style.top=Math.max(12,Math.min(page.clientHeight-56,aidHandle.offsetTop+(e.key==='ArrowUp'?-24:24)))+'px'}else aidDragged=false});

  // Keep all original route fields and handlers, in a small in-map form.
  const route=$('routeDraftCard'),body=$('mapSidebar').querySelector('.g6-panel-body');
  const menuCard=document.createElement('div');menuCard.className='card';const routeTitle=document.createElement('h3');routeTitle.textContent='導航路線';
  const start=button('導航路線 · 按住拖曳',()=>{$('routeDraftStart').click();space.closePanel();tick()},'g6-start-route primary');
  menuCard.append(routeTitle,start);body.prepend(menuCard);
  // Older enhancements move layer toggles into an always-visible dock.
  // Return the same controls to the radial menu's layer category.
  function moveMapAid(){
    const dock=$('v35MapAidDock'),panel=$('v35MapAidDockPanel');
    if(!dock||!panel||dock.dataset.g6Moved)return;
    const card=document.createElement('div');card.className='card g6-map-aids';card.dataset.g6Group='圖層';const h=document.createElement('h3');h.textContent='地圖輔助';
    panel.classList.remove('hidden');panel.style.display='block';card.append(h,panel);body.append(card);
    const cameraLabel=document.createElement('label'),cameraToggle=document.createElement('input'),cameraStatus=document.createElement('p');
    cameraToggle.type='checkbox';cameraToggle.id='g6CameraToggle';cameraLabel.append(cameraToggle,document.createTextNode(' 📷 道路即時影像'));cameraStatus.className='muted';cameraStatus.textContent='勾選後顯示 twipcam 全台公開影像';panel.prepend(cameraLabel,cameraStatus);
    let cameraUi=null,cameraModule=null;
    cameraToggle.onchange=async()=>{
      if(cameraUi){cameraUi.setEnabled(cameraToggle.checked);return}
      if(!cameraToggle.checked){cameraStatus.textContent='勾選後顯示 twipcam 全台公開影像';return}
      cameraStatus.textContent='正在載入攝影機工具…';
      try{cameraModule??=import('__CCTV_MODULE__').catch(error=>{cameraModule=null;throw error});const module=await cameraModule;
        cameraUi??=module.createCameras({map:window.__KTAK35_CORE.map,toggle:cameraToggle,status:cameraStatus,closeTools:()=>space.closePanel()});cameraUi.setEnabled(cameraToggle.checked);
      }catch{cameraToggle.checked=false;cameraStatus.textContent='無法載入，請重新勾選重試。'}
    };

    dock.dataset.g6Moved='1';dock.classList.add('hidden');
  }
  const sharedCard=document.createElement('div');sharedCard.className='card';const sh=document.createElement('h3');sh.textContent='共享路線';sharedCard.append(sh,$('routeSharedList'));body.append(sharedCard);
  route.classList.remove('g6-filtered');route.classList.add('g6-route-float','hidden');page.append(route);
  route.querySelector(':scope>.muted').textContent='按住拖曳畫一段；按住末端節點接續。';
  route.querySelector(':scope>.muted').classList.add('g6-route-help');
  $('routeDraftStart').classList.add('hidden');$('routeDraftSave').textContent='開始分享';$('routeDraftClear').textContent='取消';$('routeDraftUndo').textContent='↶ 上一段';
  const routeName=$('routeDraftName');routeName.classList.add('hidden');
  const rename=button('命名',()=>{const hidden=routeName.classList.toggle('hidden');rename.setAttribute('aria-expanded',String(!hidden));if(!hidden)routeName.focus()});rename.setAttribute('aria-expanded','false');rename.setAttribute('aria-controls','routeDraftName');route.querySelector('.flexBetween').append(rename);
  $('routeDraftClear').addEventListener('click',tick);$('routeDraftSave').addEventListener('click',()=>queueMicrotask(tick));
  const options=document.createElement('div');options.className='g6-route-options';options.append($('routeDraftColor').parentElement,$('routeDraftSpeed').parentElement,rename);$('routeDraftName').after(options);
  route.setAttribute('role','group');route.setAttribute('aria-label','導航路線繪製與分享');
  $('routeDraftSpeed').setAttribute('aria-label','路線時速 km/h');$('routeDraftName').setAttribute('aria-label','路線名稱');$('routeDraftColor').setAttribute('aria-label','路線顏色');
  route.querySelectorAll(':scope>.label,.routeLegend').forEach(n=>n.classList.add('hidden'));
  const stats=route.querySelector('.routeDraftStats');stats.setAttribute('aria-live','polite');route.querySelector('.flexBetween').after(stats);
  const thumbnails=document.createElement('div');thumbnails.className='g6-route-thumbnails';thumbnails.setAttribute('aria-label','房間共享路線');page.append(thumbnails);
  let routeKey='',memberKey='',wasDrawing=false;
  function tick(){
    moveMapAid();
    const drawing=engine.mapMode==='route';route.classList.toggle('hidden',!drawing);page.classList.toggle('g6-routing',drawing);engine.refreshRouteNodes();
    if(drawing!==wasDrawing){wasDrawing=drawing;chrome.classList.remove('g6-search-expanded');searchToggle.setAttribute('aria-expanded','false');members.open=false}
    const online=engine.onlineMembers();summary.textContent=`在線隊員 · ${online.length} 人`;
    const mk=JSON.stringify(online);if(mk!==memberKey){memberKey=mk;memberList.replaceChildren();
      if(!online.length){const p=document.createElement('p');p.textContent='目前沒有在線隊員';memberList.append(p)}
      for(const u of online){const b=button(u.name+' · '+(u.location?u.age+' 秒前':'尚未分享位置'),()=>engine.jumpMember(u.id));b.disabled=!u.location;memberList.append(b)}
    }
    const routes=engine.routes,rk=JSON.stringify(routes.map(r=>[r.id,r.label,r.color,r.points,r.speedKmh]));
    if(rk!==routeKey){routeKey=rk;thumbnails.replaceChildren();for(const r of routes){
      const points=(r.points||[]).filter(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite));if(points.length<2)continue;
      const b=button('',()=>engine.fitRoute(r.id),'g6-route-thumb');b.title='前往路線：'+(r.label||'導航路線');b.setAttribute('aria-label',b.title);
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 88 48');svg.setAttribute('aria-hidden','true');
      const path=document.createElementNS(svg.namespaceURI,'polyline'),xs=points.map(p=>p[1]),ys=points.map(p=>p[0]);
      const minX=Math.min(...xs),maxY=Math.max(...ys),spanX=Math.max(...xs)-minX,spanY=maxY-Math.min(...ys),scale=Math.min(72/(spanX||.000001),32/(spanY||.000001));
      path.setAttribute('points',points.map(p=>[44+(p[1]-minX-spanX/2)*scale,24+(maxY-p[0]-spanY/2)*scale].join(',')).join(' '));path.setAttribute('fill','none');path.setAttribute('stroke',/^#[0-9a-f]{6}$/i.test(r.color)?r.color:'#ffb300');path.setAttribute('stroke-width','3');svg.append(path);
      const label=document.createElement('span');label.textContent=r.label||'導航路線';b.append(svg,label);thumbnails.append(b);
    }}
    document.dispatchEvent(new Event('g6:canvas-tick'));
  }
  const timer=setInterval(tick,900);tick();
  window.addEventListener('pagehide',e=>{if(!e.persisted)clearInterval(timer)});
})();
