import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('src/gpt6/gpt6-brief-draft.js','utf8');
const storage=new Map(),events={};
const fields=Object.fromEntries(['missionNotes','vehicleCustomName','vehicleCustomQty','vehicleCustomUnit','equipmentCustomName','equipmentCustomQty','equipmentCustomUnit'].map(id=>[id,{value:''}]));
const c={g6LocationDraft:[],g6NormalizeLocations:()=>[],g6CancelLocationPick(){},state:{brief:{}},currentRoomUuid:'a',currentUserId:'u',briefEditing:false,briefIds:['missionNotes'],vehicleDraft:[],equipmentDraft:[],vehicleOptions:[],equipmentOptions:[],allowed:true,
  $:id=>fields[id],can:()=>c.allowed,normalizeQtyList:x=>structuredClone(x),renderVehicleEditor(){},renderEquipmentEditor(){},setBriefEdit:on=>c.briefEditing=on,
  sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},document:{addEventListener:(k,f)=>events[k]=f},window:{addEventListener(){}},queueMicrotask};
vm.createContext(c);vm.runInContext(source,c);
assert.equal(c.g6KeepBrief(),false);c.briefEditing=true;fields.missionNotes.value='未存檔內容';fields.vehicleCustomName.value='待加入車輛';c.vehicleDraft=[{name:'警車',qty:2,unit:'台'}];c.g6RememberBrief();
assert.equal(c.g6KeepBrief(),true);assert.equal(fields.missionNotes.value,'未存檔內容');
c.briefEditing=false;fields.missionNotes.value='伺服器舊資料';c.vehicleDraft=[];
assert.equal(c.g6KeepBrief(),true);assert.equal(fields.missionNotes.value,'未存檔內容');assert.equal(c.vehicleDraft[0].qty,2);assert.equal(fields.vehicleCustomName.value,'待加入車輛');
c.currentRoomUuid='b';assert.equal(c.g6KeepBrief(),false);assert.equal(c.briefEditing,false);
c.currentRoomUuid='a';c.currentUserId='other';assert.equal(c.g6KeepBrief(),false);
c.currentUserId='u';assert.equal(c.g6KeepBrief(),true);c.allowed=false;assert.equal(c.g6KeepBrief(),false);assert.equal(c.briefEditing,false);
c.allowed=true;assert.equal(c.g6KeepBrief(),true);c.g6ClearBriefDraft();assert.equal(c.g6KeepBrief(),false);assert.equal(storage.size,0);
const html=fs.readFileSync('dist/index.html','utf8');assert.ok(html.includes('if(g6KeepBrief())return;'));assert.ok(html.includes('g6ClearBriefDraft();fillBrief();setBriefEdit(false);publish();'));assert.ok(html.includes('fillBrief();setBriefEdit(briefEditing&&can("brief"));renderMapItems();'));
console.log('PASS: unsaved text/quantities/custom fields survive refresh; room/user isolation, permission loss, save cleanup and production hooks.');
