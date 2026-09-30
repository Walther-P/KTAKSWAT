// CWA O-A0058-006: 3600×3600, longitude 118–124, latitude 20.5–26.5.
// Source rows are latitude-linear; Leaflet/Google use Web Mercator.
window.__KTAK6_RADAR=(()=>{
  const bounds=[[20.5,118],[26.5,124]];
  let latest=null;
  function sourceRow(latitude,height){return (26.5-latitude)/6*height}
  const Raster=L.GridLayer.extend({
    initialize(url){
      L.setOptions(this,{pane:"overlayPane",bounds,noWrap:true,opacity:.65,zIndex:350,tileSize:256,updateWhenIdle:true});
      this.image=new Image();this.image.decoding='async';
      this.ready=new Promise((resolve,reject)=>{this.image.onload=()=>resolve();this.image.onerror=()=>reject(Error('雷達影像載入失敗'))});
      this.ready.catch(()=>{});this.image.src=url;
    },
    createTile(coords,done){
      const tile=document.createElement('canvas'),size=this.getTileSize();tile.width=size.x;tile.height=size.y;
      this.ready.then(()=>{
        if(!this._map){done(null,tile);return}
        const ctx=tile.getContext('2d'),img=this.image,map=this._map;
        const left=map.unproject([coords.x*size.x,coords.y*size.y],coords.z).lng;
        const right=map.unproject([(coords.x+1)*size.x,coords.y*size.y],coords.z).lng;
        const west=Math.max(118,left),east=Math.min(124,right);
        if(east>west){
          const sx=(west-118)/6*img.naturalWidth,sw=(east-west)/6*img.naturalWidth;
          const dx=(west-left)/(right-left)*size.x,dw=(east-west)/(right-left)*size.x;
          for(let y=0;y<size.y;y++){
            const north=map.unproject([0,coords.y*size.y+y],coords.z).lat;
            const south=map.unproject([0,coords.y*size.y+y+1],coords.z).lat;
            const sy=Math.max(0,sourceRow(north,img.naturalHeight)),end=Math.min(img.naturalHeight,sourceRow(south,img.naturalHeight));
            if(end>sy)ctx.drawImage(img,sx,sy,sw,end-sy,dx,y,dw,1);
          }
        }
        done(null,tile);
      }).catch(error=>{done(error,tile);const status=document.getElementById('v35RadarPlaybackStatus');if(status)status.textContent='最新雷達載入失敗，請按更新重試'});
      return tile;
    }
  });
  return {bounds,sourceRow,create(url){latest=new Raster(url);return latest},hideLatest(){if(latest?.getContainer())latest.getContainer().style.display='none'},restoreLatest(){if(latest?.getContainer())latest.getContainer().style.display=''}};
})();
