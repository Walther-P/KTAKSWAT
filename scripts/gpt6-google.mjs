// Google Maps remains the preferred basemap, using the preserved 3.5 engine.
// All usage claims go to GPT6's isolated backend. A Maps Demo Key is configured
// once by the site owner; room members never enter keys or sign in to Google.
export function patchGoogleMaps(html){
  const swap=(from,to)=>{if(!html.includes(from))throw Error('Google anchor missing: '+from.slice(0,90));html=html.replace(from,to)};
  swap("L.map('map',{zoomControl:true,", "L.map('map',{maxZoom:22,minZoom:2,zoomControl:true,");
  swap('  googleMap.setCenter({lat:c.lat,lng:c.lng});\n  googleMap.setZoom(map.getZoom());', `  const requested=map.getZoom();
  googleMap.moveCamera({center:{lat:c.lat,lng:c.lng},zoom:requested,tilt:0,heading:0});
  reconcileGoogleMagnification();`);
  swap('  if(googleActive){\n', '  map.setMaxZoom(googleActive?22:19);\n  if(googleActive){\n');
  swap('    googleMapGateDenied=true;\n    googleMapGateInfo={used:null,limit:GOOGLE_MAPS_MONTHLY_SAFE_LIMIT,reason:"尚未登入"};', '    googleMapGateInfo={used:null,limit:GOOGLE_MAPS_MONTHLY_SAFE_LIMIT,reason:"尚未加入任務"};');
  swap('    googleMapGateDenied=true;\n    googleMapGateInfo={used:null,limit:GOOGLE_MAPS_MONTHLY_SAFE_LIMIT,reason:err.message||"額度檢查失敗"};', '    googleMapGateDenied=false;\n    googleMapGateInfo={used:null,limit:GOOGLE_MAPS_MONTHLY_SAFE_LIMIT,reason:"連線暫時中斷，請重試"};');
  const start=html.indexOf('function loadGoogleMaps(){');
  const end=html.indexOf('$("mapProviderBtn").onclick',start);
  if(start<0||end<0)throw Error('Google loader boundary missing');
  html=html.slice(0,start)+`
let gpt6GoogleInitPromise=null,gpt6GoogleAuthFailed=false;
let gpt6GoogleScale=1;
function reconcileGoogleMagnification(){
  if(!googleMap||mapProvider!=='google'||!googleMapsReady)return;
  const actual=googleMap.getZoom(),requested=map.getZoom();
  if(!Number.isFinite(actual))return;
  // Permit one extra level of optical enlargement beyond available imagery.
  // The ENTIRE Google viewport (including its attribution) stays intact.
  // Shrink its layout viewport then scale it back around the same map center.
  // Leaflet continues using real geographic coordinates at the displayed zoom.
  const ceiling=Math.min(22,actual+1);
  if(requested>ceiling){map.setMaxZoom(ceiling);map.setZoom(ceiling,{animate:false})}
  if(actual<requested-.01)map.setMaxZoom(ceiling);
  const scale=Math.pow(2,Math.max(0,map.getZoom()-actual));
  if(Math.abs(scale-gpt6GoogleScale)<.00001)return;
  gpt6GoogleScale=scale;
  const base=$('googleMapBase');
  Object.assign(base.style,{width:(100/scale)+'%',height:(100/scale)+'%',
    right:'auto',bottom:'auto',transformOrigin:'0 0',transform:'scale('+scale+')'});
  window.google?.maps?.event?.trigger(googleMap,'resize');
  const c=map.getCenter();
  googleMap.moveCamera({center:{lat:c.lat,lng:c.lng},zoom:actual,tilt:0,heading:0});
}
window.__KTAK6_GOOGLE_FAILURE=()=>{
  if(gpt6GoogleAuthFailed)return;
  gpt6GoogleAuthFailed=true;googleMapsReady=false;mapProvider='osm';applyBasemapState();
  setProviderBadge('Google 授權或額度異常 · 暫用 OSM');
  toast('Google 地圖暫停服務，請站主管理者確認金鑰及額度');
};
function loadGoogleMaps(){
  if(window.google?.maps?.Map)return Promise.resolve(window.google.maps);
  if(googleMapsLoadPromise)return googleMapsLoadPromise;
  if(!googleMapsConfigured)return Promise.reject(Error('Google 地圖尚未完成站端設定'));
  googleMapsLoadPromise=new Promise((resolve,reject)=>{
    const callback='ktakGoogleMapsReady_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    let settled=false;
    const finish=(error)=>{
      if(settled)return;settled=true;clearTimeout(timer);delete window[callback];
      if(error){script.remove();reject(error)}else resolve(window.google.maps);
    };
    const timer=setTimeout(()=>finish(Error('Google 地圖載入逾時，請重試')),20000);
    window[callback]=()=>finish(window.google?.maps?.Map?null:Error('Google 地圖初始化失敗'));
    script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(cfg.GOOGLE_MAPS_API_KEY)+'&callback='+callback+'&v=weekly&loading=async&language=zh-TW&region=TW';
    script.async=true;script.defer=true;
    script.onerror=()=>finish(Error('Google 地圖連線失敗，請重試'));
    document.head.appendChild(script);
  }).catch(error=>{googleMapsLoadPromise=null;throw error});
  return googleMapsLoadPromise;
}
function initGoogleBasemap(){
  if(gpt6GoogleAuthFailed){setProviderBadge('Google 授權或額度異常 · 暫用 OSM');return Promise.resolve()}
  if(googleMapsReady&&googleMap){mapProvider='google';applyBasemapState();return Promise.resolve()}
  if(gpt6GoogleInitPromise)return gpt6GoogleInitPromise;
  gpt6GoogleInitPromise=initializeGpt6GoogleMap().finally(()=>{gpt6GoogleInitPromise=null});
  return gpt6GoogleInitPromise;
}
async function initializeGpt6GoogleMap(){
  if(!currentRoomUuid||!currentUserId)return;
  if(!googleMapsConfigured){
    mapProvider='osm';applyBasemapState();
    setProviderBadge('Google 地圖待站端設定 · 暫用 OSM');return;
  }
  if(googleMapGateDenied){mapProvider='osm';applyBasemapState();setProviderBadge('Google 使用額度已滿 · 暫用 OSM');return}
  const enteringRoom=currentRoomUuid;
  setProviderBadge('正在連線 Google 地圖…');
  if(!await claimGoogleMapLoadSlot()){
    mapProvider='osm';applyBasemapState();
    setProviderBadge(googleMapGateDenied?'Google 使用額度已滿 · 暫用 OSM':'Google 連線中斷 · 可按 Google 重試');return;
  }
  try{
    const maps=await loadGoogleMaps();
    if(!currentRoomUuid||enteringRoom!==currentRoomUuid||gpt6GoogleAuthFailed)return;
    if(!googleMap){
      const center=map.getCenter();
      googleMap=new maps.Map($('googleMapBase'),{
        center:{lat:center.lat,lng:center.lng},zoom:map.getZoom(),
        mapTypeId:satelliteOn?'satellite':'roadmap',disableDefaultUI:true,
        clickableIcons:false,keyboardShortcuts:false,gestureHandling:'none',
        minZoom:2,maxZoom:22,tilt:0,heading:0,isFractionalZoomEnabled:false,
        colorScheme:maps.ColorScheme?.DARK||'DARK',backgroundColor:'#0e1519'
      });
      // SDK clamps may be asynchronous, or may omit idle altogether.
      // Both this listener and the synchronous move path reconcile the scale.
      googleMap.addListener('idle',()=>{
        if(mapProvider!=='google'||!googleMapsReady)return;
        reconcileGoogleMagnification();
      });
    }
    if(gpt6GoogleAuthFailed)return;
    googleMapsReady=true;mapProvider='google';applyBasemapState();
  }catch(error){
    googleMapsReady=false;mapProvider='osm';applyBasemapState();
    setProviderBadge('Google 連線中斷 · 可按 Google 重試');
    toast('Google 地圖暫時無法連線，可按 Google 重試');
  }
}

`+html.slice(end);
  swap("googleMapsReady?'G 切換 Google':'G Google 不可用'", "googleMapsReady?'G 切換 Google':'G Google 地圖'");
  return html;
}
