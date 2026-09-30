// Inserted into the command closure by the existing V7 build stage.
function renderAssignments(){
  const root=$('v35AssignmentList');if(!root)return;root.innerHTML='';
  const ops=window.__KTAK35_ASSIGNMENTS;
  for(const a of data.assignments){
    const mine=(a.assigned_to||[]).includes(me()),commander=role()==='commander';
    const own=ops.memberStatus(a,me()),pending=ops.pendingFor(a.id),sector=sectorById(a.search_sector_id);
    const d=document.createElement('div');d.className='v35Task priority-'+a.priority;
    const receipts=(a.assigned_to||[]).map(id=>{
      const receipt=a.member_states?.[id];
      return nameOf(id)+'：'+(receipt?.legacy?'舊版整體紀錄 · ':'')+(TASK_STATUS[ops.memberStatus(a,id)]||ops.memberStatus(a,id));
    }).join(' ／ ');
    d.innerHTML='<div class="v35TaskHead"><b>'+esc(a.title)+'</b><span>'+esc(PRIORITY[a.priority]||a.priority)+' · 整體：'+esc(TASK_STATUS[a.status]||a.status)+'</span></div>'+
      (TEMPLATES[a.mission_template]?'<div class="v35TaskMode">'+esc(TEMPLATES[a.mission_template])+'</div>':'')+'<div class="v35TaskBody">'+esc(a.details||'')+'</div><small>'+esc(receipts)+' · '+fmtTime(a.created_at)+'</small>'+
      (a.location_label?'<div class="v35TaskLocation">'+esc(a.location_label)+'</div>':'')+
      (pending?'<p role="status">⏳ '+esc(pending.error||'回報待送，尚未獲得伺服器確認')+'</p>':'')+'<div class="v35TaskActions"></div>';
    const ac=d.querySelector('.v35TaskActions');
    const btn=(txt,status,cls='',command=false)=>{
      const b=document.createElement('button');b.textContent=txt;b.className=cls;b.disabled=!!pending;
      b.onclick=async()=>{b.disabled=true;await updateAssignment(a.id,{status,commander:command});renderAssignments()};ac.append(b);
    };
    if(mine&&own==='pending'){btn('接受','accepted','primary');btn('無法執行','declined')}
    if(mine&&own==='accepted')btn('開始執行','active','primary');
    if(mine&&own==='active')btn('完成我的任務','completed','good');
    if(commander&&!['completed','cancelled'].includes(a.status)){
      btn('取消任務','cancelled','danger',true);btn('指揮官結案','completed','good',true);
    }
    if(sector||Number.isFinite(a.lat)&&Number.isFinite(a.lng)){
      const b=document.createElement('button');b.textContent=sector?'▦ 搜索區':'📍 任務位置';
      b.onclick=()=>sector?focusSectorOnMap(sector):core.openMapAt(a.lat,a.lng,18);ac.append(b);
    }
    root.append(d);
  }
  if(!data.assignments.length)root.innerHTML='<div class="muted">尚無派遣任務。</div>';
}

async function updateAssignment(id,patch,fromQueue=false){
  const item=data.assignments.find(x=>x.id===id),r=room(),u=me();
  try{
    if(fromQueue)throw new Error('舊版派遣回報需要確認目前任務狀態後重新送出');
    const out=await window.__KTAK35_ASSIGNMENTS.respond(item,patch.status,{commander:patch.commander===true});
    if(r!==room()||u!==me())return out;
    if(out.row){Object.assign(item,out.row);renderAssignments();renderSummary();}
    notify(out.queued?'回報已暫存，尚未送達；恢復連線後會重試':'任務回報已送達');
    if(!out.queued)await refreshAll();
    return out;
  }catch(e){notify('任務回報未送達：'+e.message);if(fromQueue)throw e;return {queued:true,error:e};}
}

