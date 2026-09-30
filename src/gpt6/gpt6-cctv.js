// Loaded only after the user enables road cameras. No room coordinates leave this module.
export function clusterCameras(cameras,map){
  const groups=new Map(),bounds=map.getBounds(),size=map.getSize(),cell=Math.max(64,Math.sqrt(size.x*size.y/80));
  for(const camera of cameras){
    if(!bounds.contains([camera.lat,camera.lng]))continue;
    const p=map.latLngToContainerPoint([camera.lat,camera.lng]),key=Math.floor(p.x/cell)+':'+Math.floor(p.y/cell);
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(camera);
  }
  return [...groups.values()];
}
export function validCamera(c){
  try{const u=new URL(c.image),portOk=!u.port||u.port==='443'||(u.hostname==='stspcctv.stsp.gov.tw'&&['5004','5005','5006'].includes(u.port));return Number.isFinite(c.lat)&&Number.isFinite(c.lng)&&u.protocol==='https:'&&!u.username&&!u.password&&portOk&&(/\.gov\.tw$/.test(u.hostname)||/^heocctv[1-4]\.gov\.taipei$/.test(u.hostname)||['c01.twipcam.com','www.twipcam.com','c01.hicdn.org','i.ytimg.com','ctspvss.zerosum.com.tw'].includes(u.hostname))}catch{return false}
}
export function createCameras({map,toggle,status,closeTools}){
  const L=window.L,page=document.getElementById('mapPage'),entry=document.getElementById('entryOverlay');
  const layer=L.layerGroup(),box=document.createElement('section');box.className='g6-cctv-view hidden';box.setAttribute('aria-label','道路即時影像');
  const head=document.createElement('header'),title=document.createElement('strong'),close=document.createElement('button');close.textContent='關閉 ×';head.append(title,close);
  const content=document.createElement('div'),note=document.createElement('p'),source=document.createElement('p'),expand=document.createElement('button');expand.textContent='放大影像';
  const original=document.createElement('a');original.textContent='原站觀看 ↗';original.target='_blank';original.rel='noopener noreferrer';original.referrerPolicy='no-referrer';original.hidden=true;
  box.append(head,content,note,source,original,expand);page.append(box);
  const others=document.createElement('button');others.type='button';others.textContent='其他影像／天氣圖';others.hidden=true;status.after(others);
  others.onclick=()=>{if(!visible()||!manifest)return;closeView();title.textContent='其他影像／天氣圖';content.replaceChildren();note.textContent='來源未提供地圖座標的項目';source.textContent='';expand.hidden=true;for(const c of manifest.unlocated||[]){const b=document.createElement('button');b.textContent=c.name;b.onclick=()=>show(c);content.append(b)}box.classList.remove('hidden');closeTools()};
  let manifest=null,cameras=null,loading=null,enabled=false,timer=0,watchdog=0,image=null,selected=null,version=0,disposed=false;
  let regionVersion=0;const cache=new Map(),requests=new Set();
  const visible=()=>enabled&&!document.hidden&&page.classList.contains('active')&&entry.classList.contains('hidden');
  function stopImage(){clearTimeout(timer);clearTimeout(watchdog);timer=watchdog=0;if(image){image.onload=image.onerror=null;image.src='data:,';image.remove();image=null}}
  function closeView(){original.hidden=true;original.removeAttribute('href');version++;stopImage();selected=null;box.classList.add('hidden');box.classList.remove('g6-cctv-large');expand.textContent='放大影像'}
  close.onclick=closeView;
  expand.onclick=()=>{box.classList.toggle('g6-cctv-large');expand.textContent=box.classList.contains('g6-cctv-large')?'縮小影像':'放大影像'};
  function loadImage(camera){
    stopImage();if(!visible()||selected!==camera)return;
    const token=++version;image=document.createElement('img');image.alt=camera.name+' 道路影像';image.referrerPolicy='no-referrer';
    const current=image;content.replaceChildren(current);note.textContent='正在連接影像…';
    const failed=()=>{if(token!==version)return;stopImage();note.textContent='影像暫時無法內嵌，請點「原站觀看」或稍後重試。'};
    current.onerror=failed;
    current.onload=()=>{if(token!==version)return;clearTimeout(watchdog);note.textContent=camera.thumbnail?'直播預覽圖片 · 點「前往原站播放直播」觀看影片。':camera.snapshot?'接收時間 '+new Date().toLocaleTimeString('zh-TW')+' · 拍攝時間以畫面為準；每 60 秒更新。':'即時串流 · 拍攝時間以影像中的時間為準。';if(camera.snapshot)timer=setTimeout(()=>loadImage(camera),60000)};
    const url=new URL(camera.image);if(camera.snapshot)url.searchParams.set('_ktak',Math.floor(Date.now()/60000));current.src=url.href;
    watchdog=setTimeout(()=>{if(token!==version)return;if(current.naturalWidth>0){note.textContent='即時串流 · 拍攝時間以影像中的時間為準。'}else failed()},15000);
  }
  function show(camera){
    if(!visible())return;closeView();selected=camera;title.textContent=camera.name;source.textContent='資料來源：'+camera.agency;expand.hidden=false;
    if(/^https:\/\/www\.twipcam\.com\/cam\/[a-zA-Z0-9_-]+$/.test(camera.source||'')){original.href=camera.source;original.hidden=false;original.textContent=camera.thumbnail?'前往原站播放直播 ↗':'原站觀看 ↗'}
    box.classList.remove('hidden');closeTools();loadImage(camera);
  }
  function render(){
    layer.clearLayers();if(!visible()||!cameras)return;
    const groups=cameras.some(c=>c.region)?cameras.map(c=>[c]):clusterCameras(cameras,map);let count=0;
    for(const group of groups){
      const camera=group[0],total=group.reduce((n,c)=>n+(c.count||1),0),many=total>1||!!camera.region;count+=total;
      const marker=L.marker([camera.lat,camera.lng],{icon:L.divIcon({className:'g6-camera-marker',html:many?String(total):'📷',iconSize:[34,34],iconAnchor:[17,17]}),title:many?total+' 支攝影機，點選放大':camera.name,keyboard:true});
      marker.on('click',()=>{
        if(camera.region){map.fitBounds(camera.region.bounds,{maxZoom:14,padding:[30,30]});return}
        if(!many){show(camera);return}
        if(map.getZoom()<18){map.fitBounds(group.map(c=>[c.lat,c.lng]),{maxZoom:18,padding:[50,50]});return}
        closeView();title.textContent='選擇道路影像';content.replaceChildren();note.textContent='';source.textContent='';expand.hidden=true;
        for(const c of group){const b=document.createElement('button');b.textContent=c.name;b.onclick=()=>show(c);content.append(b)}
        box.classList.remove('hidden');closeTools();
      });marker.addTo(layer);marker.getElement?.()?.setAttribute('aria-label',many?total+' 支攝影機，點選放大':camera.name);
    }
    status.textContent=count?'目前範圍 '+count+' 支 · 點攝影機看影像':'此範圍沒有公開攝影機，請縮小或移動地圖。';
  }
  function cancelRegions(){regionVersion++;for(const controller of requests)controller.abort();requests.clear()}
  async function json(url,controller){
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{const r=await fetch(url,{credentials:'omit',signal:controller.signal});if(!r.ok)throw Error('catalog');return await r.json()}finally{clearTimeout(timeout)}
  }
  async function refresh(){
    cancelRegions();const token=regionVersion;if(!visible()||!manifest)return;
    const regions=manifest.regions.filter(r=>map.getBounds().intersects(r.bounds));
    if(map.getZoom()<10||regions.length>12){
      cameras=regions.map(r=>({lat:r.lat,lng:r.lng,count:r.count,region:r}));render();
      status.textContent=regions.length?'點數字放大，載入該區攝影機':'此範圍沒有公開攝影機。';return;
    }
    cameras=[];render();status.textContent='正在載入附近攝影機…';
    let cursor=0;
    try{
      await Promise.all(Array.from({length:Math.min(3,regions.length)},async()=>{
        while(cursor<regions.length&&token===regionVersion&&visible()){
          const r=regions[cursor++];if(cache.has(r.id))continue;
          if(!/^gpt6-cctv-[\d-]+-[a-f0-9]{12}\.json$/.test(r.file))throw Error('region');
          const controller=new AbortController();requests.add(controller);
          try{const data=await json(new URL(r.file,new URL('__CCTV_CATALOG__',document.baseURI)).href,controller);
            if(token!==regionVersion)return;cache.set(r.id,data.cameras.filter(validCamera));
          }finally{requests.delete(controller)}
        }
      }));
      if(token!==regionVersion||!visible())return;
      cameras=regions.flatMap(r=>cache.get(r.id)||[]);render();
      const keep=new Set(regions.map(r=>r.id));for(const key of cache.keys()){if(cache.size<=24)break;if(!keep.has(key))cache.delete(key)}
    }catch(error){if(token===regionVersion&&visible()){cancelRegions();status.textContent='附近位置載入失敗，移動地圖或重新勾選即可重試。'}}
  }
  async function setEnabled(value){
    enabled=value;toggle.checked=value;
    if(!value){others.hidden=true;cancelRegions();closeView();layer.clearLayers();map.removeLayer(layer);status.textContent='勾選後顯示 twipcam 全台公開影像';return}
    layer.addTo(map);status.textContent='正在載入攝影機位置…';
    try{
      if(!manifest){if(!loading){loading=json('__CCTV_CATALOG__',new AbortController()).then(data=>{manifest=data;return data}).finally(()=>{loading=null})}await loading}
      if(enabled&&!disposed){others.hidden=!(manifest.unlocated?.length);await refresh();}
    }catch{if(enabled&&!disposed){setEnabled(false);status.textContent='位置資料載入失敗，請重新勾選重試。'}}
  }
  function syncVisibility(){if(!entry.classList.contains('hidden')){setEnabled(false);return}if(!visible()){cancelRegions();closeView();layer.clearLayers()}else refresh()}
  const observer=new MutationObserver(syncVisibility);observer.observe(page,{attributes:true,attributeFilter:['class']});observer.observe(entry,{attributes:true,attributeFilter:['class']});
  map.on('moveend',refresh);document.addEventListener('visibilitychange',syncVisibility);
  window.addEventListener('pagehide',closeView);
  return {setEnabled,close:closeView,destroy(){disposed=true;setEnabled(false);observer.disconnect();map.off('moveend',refresh);document.removeEventListener('visibilitychange',syncVisibility);window.removeEventListener('pagehide',closeView);box.remove();others.remove()}};
}
