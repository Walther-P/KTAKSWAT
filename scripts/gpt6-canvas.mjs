import fs from 'node:fs';

// These guarded adapters retain the 3.5 room model, undo stack and permission checks.
export function patchCanvas(html) {
  const swap=(from,to)=>{if(!html.includes(from))throw Error('Canvas anchor missing: '+from.slice(0,100));html=html.replace(from,to)};
  swap('window.__KTAK35_CORE={',fs.readFileSync('src/gpt6/gpt6-canvas-engine.js','utf8')+'\nwindow.__KTAK35_CORE={');
  swap("function setMapTool(t){", "function setMapTool(t){\n  window.__KTAK6_CANVAS?.cancelStroke();");
  swap("if(mapTool==='route'){window.__ktakRoute?.addPoint(e.latlng);return}","if(window.__KTAK6_CANVAS?.handles(mapTool))return;");
  swap("map.on('mousemove', e => previewRouteTo(e.latlng));", "// GPT6 routes preview only during an active press-drag gesture.");
  swap('function previewRouteTo(latlng) {','function previewRouteTo(latlng, origin) {');
  swap("if (mapTool !== 'route' || !routeDraftPoints.length || !latlng) return;", "if (mapTool !== 'route' || (!routeDraftPoints.length && !origin) || !latlng) return;");
  swap('const last = routeDraftPoints[routeDraftPoints.length - 1];','const last = origin || routeDraftPoints[routeDraftPoints.length - 1];');
  swap("    addPoint,\n    renderList,",`    addPoint,
    get points(){return routeDraftPoints.map(p=>p.slice());},
    previewSegment(a,b){previewRouteTo(b,[a.lat,a.lng]);},
    clearPreview:clearRoutePreview,
    commitSegment(a,b){
      if(!can('map')||mapTool!=='route')return;
      if(!routeDraftPoints.length)routeDraftPoints.push([a.lat,a.lng]);
      routeDraftPoints.push([b.lat,b.lng]);clearRoutePreview();redrawDraft();
    },
    renderList,`);
  swap("    updateUi();\n  }\n\n  function clearDraft()", "    updateUi();window.__KTAK6_CANVAS?.refreshRouteNodes();\n  }\n\n  function clearDraft()");
  swap("    routeDraftPoints = [];\n    updateUi();", "    routeDraftPoints = [];\n    updateUi();window.__KTAK6_CANVAS?.refreshRouteNodes();");
  html=html.replaceAll("line:'點起點再點終點畫直線',rect:'點第一角再點對角',circle:'點圓心再點邊界'", "line:'按住起點，拖曳後放開完成直線',rect:'按住第一角，拖到對角後放開',circle:'按住圓心，拖到邊界後放開'");
  html=html.replaceAll("route:'依序點地圖加入導航路線節點，完成後按「儲存並共享」'", "route:'按住拖曳畫一段；按住末端節點接續，完成後開始分享'");
  html=html.replaceAll("已開始畫導航路線：依序點地圖加入節點", "按住拖曳畫第一段；按住末端節點繼續畫");
  html=html.replaceAll('導航路線：請依序點選地圖節點','按住拖曳畫第一段；按住末端節點接續');
  return html;
}
