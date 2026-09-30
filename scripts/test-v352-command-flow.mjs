import fs from 'node:fs';

const html=fs.readFileSync('dist/index.html','utf8');
const runtime=fs.readFileSync('dist/ktak-v35-flow-v352.js','utf8');
new Function(runtime);
const need=(ok,msg)=>{if(!ok)throw new Error('V3.5.2 flow test failed: '+msg)};

need(html.includes('ktak-v35-flow-v352'),'V3.5.2 CSS marker');
need(html.includes('./ktak-v35-flow-v352.js?v=3.5.2'),'V3.5.2 runtime cache key');
need(html.includes('.v35OfflineBanner:not(.offline):not(.pending){display:none!important}'),'healthy network status is silent while abnormal states remain class-addressable');
need(html.includes('#commandPage .v35ModeFields{display:none!important}'),'legacy mission-mode duplicate fields hidden');
need(runtime.includes("window.__KTAK35_V352={version:'3.5.2'"),'runtime version marker');
need(runtime.includes('主任務 · 來源：任務簡報'),'mission brief is explicitly primary');
need(runtime.includes('id="v352BriefDispatch"')&&runtime.includes('v352BriefDispatchTop'),'brief-to-dispatch actions');
need(runtime.includes("請先儲存任務簡報，再建立派遣"),'unsaved brief is protected');
need(runtime.includes("h.textContent='🧩 工具預設組'"),'mission mode renamed as tool preset');
need(runtime.includes("panel.querySelector('.v35ModePanelTitle')"),'mission-mode panel adapted rather than removed');
need(runtime.includes("form.id='v352DispatchForm'")&&runtime.includes('派給誰')&&runtime.includes('補充說明（選填）'),'simplified dispatch form');
need(runtime.includes("LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')"),'A-Z group codes');
need(runtime.includes("type:String(g?.type||'攻擊隊')"),'team type independent from code');
need(runtime.includes('data={...(profile?.data||{}),groups:'),'groups merge into existing mission profile data');
need(runtime.includes("select.dataset.v352GroupGuard='1'")&&runtime.includes('setTimeout(()=>saveGroupsNow(),900)'),'tool-preset changes preserve groups');
need(runtime.includes('groups.forEach(other=>{if(other.id!==g.id)other.memberIds=other.memberIds.filter'),'member belongs to at most one group');
need(runtime.includes('v352GroupAssigneeShortcuts')&&runtime.includes('可先點整隊，再個別增減隊員'),'whole-team shortcut with individual adjustment');
need(runtime.includes('整體：(已完成|已取消)')&&runtime.includes('v352AssignmentArchiveBody'),'completed/cancelled dispatch archive');
need(runtime.includes('目前沒有進行中的派遣'),'active list empty state');
need(!runtime.includes("from('ktak35_groups')"),'no new group table dependency');

console.log('V3.5.2 command-flow tests passed: brief-primary workflow, archived completed dispatches, tool-preset mission modes, simplified dispatch, brief-to-dispatch, A-Z groups and silent healthy network status are guarded.');

// Apply the map-integration layer only after every V3.5.2 invariant above is
// proven, so brief/group map features cannot mask a V3.5.2 regression.
await import('./patch-v353-brief-map-groups.mjs');

