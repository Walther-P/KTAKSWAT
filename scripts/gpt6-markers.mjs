import fs from 'node:fs';
export function patchBoardMarkers(html){
  const swap=(from,to)=>{if(html.split(from).length!==2)throw Error('Board markers anchor missing or duplicated: '+from.slice(0,70));html=html.replace(from,to)};
  const enemy=html.match(/ enemy:`([^`]+)`/);
  if(!enemy)throw Error('Missing enemy symbol');
  swap(enemy[0],enemy[0]+',\n suspect:`'+enemy[1].replace('>E</text>','>嫌</text>')+'`');
  swap("enemy:['enemy','敵軍'],", "enemy:['enemy','敵軍'],suspect:['suspect','嫌疑人'],");
  swap('keys:["friendly","enemy","civilian"','keys:["friendly","suspect","enemy","civilian"');
  swap('function drawBoardObject(o){',fs.readFileSync('src/gpt6/gpt6-board-markers.js','utf8')+"\nfunction drawBoardObject(o){\n  if(o.type==='symbol'&&String(o.icon||'').startsWith('v355team:')){gpt6DrawBoardTeam(o);return}");
  swap('function bbox(o){',"function bbox(o){\n  if(o.type==='symbol'&&String(o.icon||'').startsWith('v355team:'))return[-52,-29,48,29];");
  swap("  if(o.type==='symbol'||o.type==='shapeSymbol')return Math.abs(q.x)<=45&&Math.abs(q.y)<=50;", "  if(o.type==='symbol'&&String(o.icon||'').startsWith('v355team:'))return Math.abs(q.x)<=52&&Math.abs(q.y)<=32;\n  if(o.type==='symbol'||o.type==='shapeSymbol')return Math.abs(q.x)<=45&&Math.abs(q.y)<=50;");
  swap('icon:boardPlaceConfig.key,label:boardPlaceConfig.label,x:p.x', 'icon:boardPlaceConfig.key,label:boardPlaceConfig.label,color:boardPlaceConfig.color,x:p.x');
  swap('window.__KTAK35_CORE={', 'window.__KTAK6_MARKERS={chooseBoard:gpt6ChooseBoardMarker};\nwindow.__KTAK35_CORE={');
  return html;
}
