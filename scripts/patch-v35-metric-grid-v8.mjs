import fs from 'node:fs';
const commandPath='dist/ktak-v35-command.js';
const usabilityPath='dist/ktak-v35-usability.js';
const htmlPath='dist/index.html';
let command=fs.readFileSync(commandPath,'utf8');
let usability=fs.readFileSync(usabilityPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');
const rr=(text,re,repl,label)=>{if(!re.test(text))throw new Error('metric-grid-v8 missing: '+label);re.lastIndex=0;return text.replace(re,repl)};

// The usability layer owns the visible grid. Keep the older command grid layer empty
// so V3.5 never draws two overlapping grid systems.
command=rr(command,/function renderGrid\(\)\{[\s\S]*?\}\nfunction setMapBearing/,`function renderGrid(){if(!gridLayer||!core.map)return;gridLayer.clearLayers();if(core.map.hasLayer(gridLayer))core.map.removeLayer(gridLayer)}
function setMapBearing`,'disable legacy coordinate grid');

// Feedback-v7 inserts the radar playback state immediately after renderMajorGrid,
// so use that stable boundary rather than the old installRadarTools boundary.
usability=rr(usability,/function gridStep\(z\)\{[\s\S]*?(?=let radarPlayTimer=)/,`function metricGridStep(z){if(z>=19)return 50;if(z>=17)return 100;if(z>=16)return 200;if(z>=15)return 250;if(z>=13)return 500;if(z>=11)return 1000;if(z>=9)return 2000;return 5000}
function metricGridText(m){return m>=1000?(m/1000).toLocaleString('zh-TW',{maximumFractionDigits:m%1000?1:0})+' km':m+' m'}
function ensureMetricGridLabel(){let e=$('v35MetricGridLabel');if(e)return e;e=document.createElement('div');e.id='v35MetricGridLabel';e.className='v35MetricGridLabel';const host=$('v35GridToggle')?.closest('.v35MapAid')?.parentElement;if(host)host.insertBefore(e,host.querySelector('.v35RadarTools')||null);return e}
function renderMajorGrid(){
  const map=core.map;if(!map||!window.L)return;if(!majorGridLayer)majorGridLayer=L.layerGroup();majorGridLayer.clearLayers();const label=ensureMetricGridLabel();
  if(!$('v35GridToggle')?.checked){if(map.hasLayer(majorGridLayer))map.removeLayer(majorGridLayer);if(label)label.classList.add('hidden');return}
  if(!map.hasLayer(majorGridLayer))majorGridLayer.addTo(map);if(label)label.classList.remove('hidden');
  const groundStep=metricGridStep(map.getZoom()),center=map.getCenter(),cos=Math.max(.2,Math.cos(center.lat*Math.PI/180)),projectedStep=groundStep/cos,crs=L.CRS.EPSG3857,b=map.getBounds(),sw=crs.project(b.getSouthWest()),ne=crs.project(b.getNorthEast());
  const minX=Math.floor(sw.x/projectedStep)*projectedStep,maxX=Math.ceil(ne.x/projectedStep)*projectedStep,minY=Math.floor(sw.y/projectedStep)*projectedStep,maxY=Math.ceil(ne.y/projectedStep)*projectedStep;
  const style={weight:1.35,opacity:.58,interactive:false,dashArray:'3,4'};let count=0;
  for(let x=minX;x<=maxX&&count<80;x+=projectedStep,count++){const a=crs.unproject(L.point(x,minY)),c=crs.unproject(L.point(x,maxY));L.polyline([[a.lat,a.lng],[c.lat,c.lng]],style).addTo(majorGridLayer)}
  count=0;for(let y=minY;y<=maxY&&count<80;y+=projectedStep,count++){const a=crs.unproject(L.point(minX,y)),c=crs.unproject(L.point(maxX,y));L.polyline([[a.lat,a.lng],[c.lat,c.lng]],style).addTo(majorGridLayer)}
  if(label)label.innerHTML='<b>▦ 網格 '+metricGridText(groundStep)+'</b><span>每格約 '+metricGridText(groundStep)+' × '+metricGridText(groundStep)+'；右下角比例尺是目前地圖距離參考。</span>';
}

`,'metric usability grid');

html=html.replace('▦ 經緯網格','▦ 公尺網格');
html=html.replace('右下角顯示公制比例尺；右上角指北針固定指向北方。','網格會依縮放自動切換 50m／100m／250m／500m／1km 等級；右下角另顯示當前公制比例尺。右上角指北針固定指向北方。');
html=html.replace('</style>',`\n/* ktak-v35-metric-grid-v8 */\n.v35MetricGridLabel{margin-top:6px;padding:6px 8px;border:1px solid #35515e;border-radius:8px;background:#0b151a;font-size:9px;line-height:1.45;color:#a9bec8}.v35MetricGridLabel b{display:block;color:#d5e7ef;font-size:10px}.v35MetricGridLabel span{display:block;margin-top:2px}\n</style>`);
command='// ktak-v35-metric-grid-v8\n'+command;usability='// ktak-v35-metric-grid-v8\n'+usability;
if(!command.includes('ktak-v35-metric-grid-v8')||!usability.includes('metricGridStep')||!usability.includes('projectedStep=groundStep/cos')||!html.includes('▦ 公尺網格'))throw new Error('metric-grid-v8 self-check failed');
fs.writeFileSync(commandPath,command);fs.writeFileSync(usabilityPath,usability);fs.writeFileSync(htmlPath,html);
console.log('KTAK V3.5 metric grid v8 applied: adaptive 50m–5km tactical squares with explicit grid-size label.');

// V9 runs after V8 so it can safely patch the final radar bridge and append the
// direct assignment-action runtime without altering the Stable/full DEV source.
await import('./patch-v35-field-feedback-v9.mjs');

