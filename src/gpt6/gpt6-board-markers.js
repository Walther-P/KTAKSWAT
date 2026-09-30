// Called inside the existing board engine: normal symbols and team markers share
// its placement, ownership, undo and room publishing paths.
function gpt6ChooseBoardMarker(key,label,color){
  if(!state||!currentRoomUuid||!can('board')){toast('目前角色只能觀看');return false}
  if(!allIconDefs[key]&&!String(key).startsWith('v355team:'))return false;
  setBoardTool('symbol');
  boardPlaceConfig={key,label:String(label||allIconDefs[key]?.[1]||'標記'),color:/^#[0-9a-f]{6}$/i.test(color||'')?color:undefined};
  toast(`點戰術板放置「${boardPlaceConfig.label}」`);return true;
}
function gpt6DrawBoardTeam(o){
  const color=/^#[0-9a-f]{6}$/i.test(o.color||'')?o.color:'#45aff2';
  ctx.save();ctx.translate(o.x||0,o.y||0);ctx.scale(o.scale||1,o.scale||1);
  ctx.save();ctx.rotate((o.rotation||0)*Math.PI/180);
  ctx.beginPath();ctx.moveTo(-48,-20);ctx.lineTo(14,-20);ctx.lineTo(40,0);ctx.lineTo(14,20);ctx.lineTo(-48,20);ctx.closePath();
  ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.lineJoin='round';ctx.stroke();ctx.restore();
  // Keep names readable when the arrow is rotated, just like the map marker.
  ctx.font='900 14px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineWidth=4;ctx.lineJoin='round';ctx.strokeStyle='#10222d';ctx.fillStyle='#fff';
  const label=String(o.label||'編組');ctx.strokeText(label,-6,0,76);ctx.fillText(label,-6,0,76);ctx.restore();
}
