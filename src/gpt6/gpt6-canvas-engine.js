/* Injected inside the preserved room engine; never writes outside publish(). */
(() => {
  const drawingTools=new Set(['line','rect','circle','route']);
  const surface=map.getContainer(), pointers=new Set();
  let stroke=null, frame=0, suppressClickUntil=0, routeNodeKey='';
  const routeNodes=L.layerGroup().addTo(map);
  const pair=p=>[p.lat,p.lng];
  const validPoint=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng);
  function refreshRouteNodes(){
    const key=JSON.stringify([mapTool,window.__ktakRoute?.points,$('routeDraftColor')?.value]);
    if(key===routeNodeKey)return;routeNodeKey=key;
    routeNodes.clearLayers();
    if(mapTool!=='route')return;
    const points=window.__ktakRoute?.points||[];
    points.forEach((p,i)=>{
      const last=i===points.length-1;
      const node=L.circleMarker(p,{radius:last?11:5,color:$('routeDraftColor')?.value||'#ffb300',fillColor:'#f4fbff',fillOpacity:1,weight:3,interactive:false}).addTo(routeNodes);
      if(last)node.bindTooltip('按住此點接續',{permanent:true,direction:'top',offset:[0,-15],className:'g6-endpoint-tip'});
    });
  }
  function clean(){
    cancelAnimationFrame(frame);frame=0;
    clearPreview();window.__ktakRoute?.clearPreview();
    if(stroke?.dragging)map.dragging.enable();
    if(stroke){try{surface.releasePointerCapture(stroke.id)}catch{}}
    stroke=null;
  }
  function previewStroke(){
    frame=0;if(!stroke)return;
    const {start:a,end:b,tool}=stroke;
    if(tool==='route'){window.__ktakRoute?.previewSegment(a,b);return}
    clearPreview();
    const options={color:currentColor,dashArray:'6,5',weight:4,fillOpacity:.08,interactive:false};
    if(tool==='line'){
      preview=L.polyline([pair(a),pair(b)],options).addTo(map);
      window.__ktakEnhance?.labelLinePreview(preview,a,b);
    }else if(tool==='rect')preview=L.rectangle([pair(a),pair(b)],options).addTo(map);
    else preview=L.circle(pair(a),{...options,radius:map.distance(a,b)}).addTo(map);
  }
  function down(e){
    if(e.button!==0)return;
    pointers.add(e.pointerId);
    if(pointers.size>1){clean();return}
    if(!drawingTools.has(mapTool)||fanTargetId||!can('map')||!currentRoomUuid||!currentUserId)return;
    const point=map.mouseEventToLatLng(e);if(!validPoint(point))return;
    let start=point;
    if(mapTool==='route'){
      const points=window.__ktakRoute.points;
      if(points.length){
        start=L.latLng(points.at(-1));
        if(map.latLngToContainerPoint(start).distanceTo(map.latLngToContainerPoint(point))>28)return;
      }
    }
    e.preventDefault();e.stopImmediatePropagation();
    stroke={id:e.pointerId,tool:mapTool,start,end:start,x:e.clientX,y:e.clientY,moved:false,room:currentRoomUuid,user:currentUserId,dragging:map.dragging.enabled()};
    map.dragging.disable();surface.setPointerCapture?.(e.pointerId);
  }
  function move(e){
    if(!stroke||stroke.id!==e.pointerId)return;
    e.preventDefault();e.stopImmediatePropagation();
    const point=map.mouseEventToLatLng(e);if(!validPoint(point))return;
    stroke.end=point;
    stroke.moved ||= Math.hypot(e.clientX-stroke.x,e.clientY-stroke.y)>=6;
    if(!frame)frame=requestAnimationFrame(previewStroke);
  }
  function end(e){
    pointers.delete(e.pointerId);
    if(!stroke||stroke.id!==e.pointerId)return;
    e.preventDefault();e.stopImmediatePropagation();
    const s=stroke,point=map.mouseEventToLatLng(e);
    const commit=e.type==='pointerup'&&s.moved&&validPoint(point)&&s.tool===mapTool&&s.room===currentRoomUuid&&s.user===currentUserId&&can('map');
    suppressClickUntil=Date.now()+500;clean();
    if(!commit)return;
    const a=s.start,b=point;
    if(map.distance(a,b)<.1)return;
    if(s.tool==='route'){window.__ktakRoute.commitSegment(a,b);return}
    const item={id:uid(),type:s.tool,rotation:0,color:currentColor,ownerId:currentUserId,ownerName:displayName()};
    if(s.tool==='line'){item.points=[pair(a),pair(b)];item.distanceM=Math.round(map.distance(a,b))}
    if(s.tool==='rect')item.points=[pair(a),[a.lat,b.lng],pair(b),[b.lat,a.lng]];
    if(s.tool==='circle'){item.center=pair(a);item.radius=map.distance(a,b)}
    pushMapHistory();state.map.items.push(item);publish();renderMapItems();
  }
  surface.addEventListener('pointerdown',down,true);
  surface.addEventListener('pointermove',move,true);
  surface.addEventListener('pointerup',end,true);
  surface.addEventListener('pointercancel',end,true);
  surface.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  window.addEventListener('pointerup',e=>pointers.delete(e.pointerId));
  window.addEventListener('pointercancel',e=>pointers.delete(e.pointerId));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clean();pointers.clear()}});
  document.querySelector('#app>nav')?.addEventListener('click',clean);
  window.__KTAK6_CANVAS={
    handles:tool=>drawingTools.has(tool),cancelStroke:clean,refreshRouteNodes,
    get mapMode(){return mapTool},get boardMode(){return boardTool},
    get color(){return currentColor},set color(value){if(/^#[0-9a-f]{6}$/i.test(value))currentColor=value},
    get routes(){return (state?.map?.items||[]).filter(i=>i.type==='route')},
    fitRoute(id){const item=itemById(id);if(item?.type==='route'&&item.points?.length>1)map.fitBounds(L.latLngBounds(item.points),{paddingTopLeft:[40,160],paddingBottomRight:[90,80],maxZoom:18})},
    onlineMembers(){
      return Object.values(state?.users||{}).filter(u=>u.approved!==false&&(u.id===currentUserId||presence?.[u.id])).map(u=>{
        const loc=memberLocations[u.id],age=loc?Date.now()-new Date(loc.updatedAt).getTime():Infinity;
        return {id:u.id,name:u.nick||u.name||'隊員',location:loc&&age<=30000?{lat:Number(loc.lat),lng:Number(loc.lng)}:null,age:Math.max(0,Math.round(age/1000))};
      });
    },
    jumpMember(id){const member=this.onlineMembers().find(u=>u.id===id);if(member?.location){map.setView([member.location.lat,member.location.lng],18);return true}toast('這位隊員尚未分享有效位置');return false},
    canOpenMenu(board,e){
      if(board)return boardTool==='select'&&!boardDrawing&&!findBoardAt(boardPoint(e));
      return mapTool==='pan'&&!fanTargetId&&!e.target.closest('.leaflet-interactive,.leaflet-marker-icon,.leaflet-control,.map-transform-handle');
    },
    stopBoardPan(){boardPanGesture=null;boardStage.classList.remove('board-panning')},
  };
})();
