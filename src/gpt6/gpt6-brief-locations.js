let g6LocationDraft=[],g6LocationPick=null,g6LocationUiMode='';
function g6NormalizeLocations(brief){
  if(Array.isArray(brief.executionLocations))return brief.executionLocations.map(x=>({id:String(x.id||uid()),name:String(x.name||''),address:String(x.address||''),lat:g6ValidLocation(x)?Number(x.lat):null,lng:g6ValidLocation(x)?Number(x.lng):null}));
  const old=brief.missionLocation;
  return [{id:uid(),name:old?.label||'執行地點',address:brief.executionLocation||'',lat:g6ValidLocation(old)?Number(old.lat):null,lng:g6ValidLocation(old)?Number(old.lng):null}];
}
function g6ValidLocation(x){return x?.lat!=null&&x?.lng!=null&&Number.isFinite(Number(x.lat))&&Number.isFinite(Number(x.lng))&&Math.abs(Number(x.lat))<=90&&Math.abs(Number(x.lng))<=180}
function g6CancelLocationPick(){g6LocationPick=null;$('g6LocationPickHint')?.remove()}
function g6PickLocation(id){
  if(!can('brief')||!briefEditing)return;
  g6RememberBrief();g6CancelLocationPick();
  g6LocationPick={id,key:g6BriefKey()};setMapTool('pan');
  document.querySelector('[data-page="mapPage"]').click();
  const hint=document.createElement('div');hint.id='g6LocationPickHint';hint.className='g6-location-pick';
  const text=document.createElement('span');text.textContent='請點選此執行地點的位置';
  const cancel=document.createElement('button');cancel.textContent='取消';cancel.onclick=g6CancelLocationPick;
  hint.append(text,cancel);$('mapPage').append(hint);
}
function g6RenderLocations(force=false){
  let root=$('g6BriefLocations');
  if(!root){root=document.createElement('div');root.id='g6BriefLocations';$('executionLocation').parentElement.append(root)}
  const mode=g6BriefKey()+':'+briefEditing;
  if(!force&&mode===g6LocationUiMode)return;
  g6LocationUiMode=mode;root.replaceChildren();
  const rows=briefEditing?g6LocationDraft:g6NormalizeLocations(state.brief);
  const button=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b};
  rows.forEach((item,index)=>{
    const row=document.createElement('div');row.className='g6-brief-location';
    const title=document.createElement('strong');title.textContent=(index+1)+'. '+(briefEditing?'':item.name||'執行地點');row.append(title);
    if(briefEditing){
      for(const [key,label] of [['name','地點名稱'],['address','地址或地點說明']]){
        const input=document.createElement('input');input.value=item[key];input.placeholder=label;input.setAttribute('aria-label',`地點 ${index+1} ${label}`);
        input.oninput=()=>{item[key]=input.value;g6RememberBrief()};row.append(input);
      }
    }else{const text=document.createElement('div');text.textContent=item.address||'—';row.append(text)}
    const position=document.createElement('small');position.textContent=g6ValidLocation(item)?`${item.lat.toFixed(6)}, ${item.lng.toFixed(6)}`:'尚未選取地圖位置';row.append(position);
    const actions=document.createElement('div');actions.className='g6-location-actions';
    if(briefEditing)actions.append(button('地圖選點',()=>g6PickLocation(item.id)));
    if(g6ValidLocation(item))actions.append(button('查看地圖',()=>{document.querySelector('[data-page="mapPage"]').click();map.setView([item.lat,item.lng],Math.min(19,map.getMaxZoom()))}));
    if(briefEditing){
      if(g6ValidLocation(item))actions.append(button('清除座標',()=>{item.lat=null;item.lng=null;g6RememberBrief();g6RenderLocations(true)}));
      actions.append(button('移除',()=>{g6LocationDraft=g6LocationDraft.filter(x=>x.id!==item.id);g6RememberBrief();g6RenderLocations(true)}));
    }
    row.append(actions);root.append(row);
  });
  if(briefEditing)root.append(button('＋ 新增執行地點',()=>{g6LocationDraft.push({id:uid(),name:'',address:'',lat:null,lng:null});g6RememberBrief();g6RenderLocations(true)}));
  if(!rows.length&&!briefEditing){const text=document.createElement('p');text.textContent='尚未設定執行地點';root.append(text)}
}
function g6SaveLocations(){
  if(!can('brief'))return;
  const rows=g6LocationDraft.map(x=>({...x,name:x.name.trim(),address:x.address.trim()}));
  state.brief.executionLocations=rows;
  state.brief.executionLocation=rows.map((x,i)=>`${i+1}. ${x.name||'執行地點'}${x.address?'｜'+x.address:''}`).join('\n');
  const located=rows.filter(g6ValidLocation),first=located[0];
  if(first)state.brief.missionLocation={lat:first.lat,lng:first.lng,label:first.name||first.address||'執行地點'};
  else delete state.brief.missionLocation;
  const old=(state.map.items||[]).filter(x=>['mission-brief-location','g6-brief-location'].includes(x.ktakV353Kind));
  state.map.items=(state.map.items||[]).filter(x=>!old.includes(x));
  located.forEach((x,i)=>{
    const existing=old.find(m=>m.g6LocationId===x.id)||(i===0?old.find(m=>!m.g6LocationId&&m.ktakV353Kind==='mission-brief-location'):null);
    state.map.items.push({...existing,id:existing?.id||uid(),type:'symbol',icon:'objective',lat:x.lat,lng:x.lng,
      label:i===0?'主任務｜'+(x.name||x.address||'執行地點'):`${rows.indexOf(x)+1}. ${x.name||x.address||'執行地點'}`,
      rotation:existing?.rotation||0,scale:existing?.scale||1,fan:existing?.fan||null,note:x.address,color:'#ffc650',
      ownerId:existing?.ownerId||currentUserId,ownerName:existing?.ownerName||displayName(),
      ktakV353Kind:i===0?'mission-brief-location':'g6-brief-location',g6LocationId:x.id});
  });
  g6CancelLocationPick();renderMapItems();
}
function g6BindLocationMap(){
  map.on('click',e=>{
    const pick=g6LocationPick;if(!pick)return;
    g6CancelLocationPick();
    if(pick.key!==g6BriefKey()||!briefEditing||!can('brief'))return;
    const row=g6LocationDraft.find(x=>x.id===pick.id);if(!row)return;
    row.lat=e.latlng.lat;row.lng=e.latlng.lng;g6RememberBrief();g6RenderLocations(true);
    document.querySelector('[data-page="briefPage"]').click();
  });
}
