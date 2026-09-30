// Device-local, per-room/per-member editor draft. Never publish before Save.
let g6BriefOwner='';
function g6BriefKey(){return currentRoomUuid&&currentUserId?'ktak-gpt6-brief-draft:'+currentRoomUuid+':'+currentUserId:''}
function g6RememberBrief(){
  const key=g6BriefKey();if(!briefEditing||!key||key!==g6BriefOwner||!can('brief'))return;
  const draft={values:Object.fromEntries(briefIds.map(id=>[id,$(id).value])),locations:g6LocationDraft,vehicles:vehicleDraft,equipment:equipmentDraft,
    custom:Object.fromEntries(['vehicleCustomName','vehicleCustomQty','vehicleCustomUnit','equipmentCustomName','equipmentCustomQty','equipmentCustomUnit'].map(id=>[id,$(id)?.value||'']))};
  try{sessionStorage.setItem(key,JSON.stringify(draft))}catch{}
}
function g6KeepBrief(){
  const key=g6BriefKey();
  if(g6BriefOwner!==key){briefEditing=false;g6BriefOwner=key;g6CancelLocationPick()}
  if(!can('brief')){briefEditing=false;return false}
  if(briefEditing)return true;
  let draft;try{draft=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
  if(!draft?.values)return false;
  briefEditing=true;
  g6LocationDraft=Array.isArray(draft.locations)?g6NormalizeLocations({executionLocations:draft.locations}):g6NormalizeLocations(state.brief);
  briefIds.forEach(id=>{$(id).value=draft.values[id]??''});
  vehicleDraft=normalizeQtyList(draft.vehicles,vehicleOptions,'台');
  equipmentDraft=normalizeQtyList(draft.equipment,equipmentOptions,'件');
  renderVehicleEditor();renderEquipmentEditor();
  Object.entries(draft.custom||{}).forEach(([id,value])=>{if($(id))$(id).value=value});
  setBriefEdit(true);return true;
}
function g6ClearBriefDraft(){try{sessionStorage.removeItem(g6BriefKey())}catch{}briefEditing=false}
document.addEventListener('input',e=>{if(e.target.closest?.('#briefPage'))g6RememberBrief()});
document.addEventListener('change',e=>{if(e.target.closest?.('#briefPage'))g6RememberBrief()});
document.addEventListener('click',e=>{if(e.target.closest?.('#briefPage'))queueMicrotask(g6RememberBrief)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)g6RememberBrief()});
window.addEventListener('pagehide',g6RememberBrief);
