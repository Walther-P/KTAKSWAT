/// <reference path="./contracts.d.ts" />
(() => {
'use strict';
const core=window.__KTAK35_CORE,editor=window.__KTAK6_EDITOR;
if(!core||!editor)return;
document.body.classList.add('g6-workspace');
/** @param {string} selector @param {ParentNode} [root] @returns {HTMLElement} */
function required(selector,root=document){const node=root.querySelector(selector);if(!(node instanceof HTMLElement))throw new Error('Missing workspace element '+selector);return node}
/** @param {string} id */
const $=id=>required('#'+id);
/** @param {string} label @param {()=>unknown} fn @param {string} [cls] */
function button(label,fn,cls=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=()=>{fn()};return b}
const nav=required('#app>nav'),header=required('#app>header');
/** @type {Record<string,string>} */
const labels={briefPage:'任務',mapPage:'地圖',boardPage:'戰術板',commandPage:'指揮',chatPage:'通訊',permissionPage:'設定'};
nav.querySelectorAll('button[data-page]').forEach(node=>{const b=/** @type {HTMLButtonElement} */(node);b.textContent=labels[b.dataset.page||'']||b.textContent;b.title=b.textContent||''});
const brand=required('.brandText');required('b',brand).textContent='KTAK GPT-6';required('small',brand).textContent='獨立測試 · 僅供演練';
const entry=$('entryHome');required('h1',entry).textContent='KTAK GPT-6';required('p',entry).textContent='建立任務，或輸入房名與密碼直接加入。';
const kicker=document.createElement('div');kicker.className='g6-kicker';kicker.textContent='FIELD WORKSPACE / 獨立實驗版';entry.prepend(kicker);
$('showCreateBtn').textContent='建立任務';$('showJoinBtn').textContent='加入任務';$('showRecoverBtn').textContent='恢復指揮權';
const hint=document.createElement('p');hint.className='g6-test-note';hint.textContent='只使用虛構資料。本版本不連接現用 KTAK 的任務。';entry.append(hint);
/** @typedef {{aside:HTMLElement,open:(group?:string)=>void}} ToolPanel */
/** @type {ToolPanel|null} */let activePanel=null;
/** @type {HTMLElement|null} */let returnFocus=null;
function closePanel(){if(activePanel){activePanel.aside.classList.remove('g6-open');activePanel.aside.setAttribute('aria-hidden','true');activePanel=null;returnFocus?.focus()}document.body.classList.remove('g6-panel-open')}
/** @param {Element} card @param {boolean} board */
function classify(card,board){if(card instanceof HTMLElement&&card.dataset.g6Group)return card.dataset.g6Group;if(card.querySelector('#mapTacticalList,#boardTacticalList,#mapShapePlaceBtn,#boardShapePlaceBtn'))return '標記';const t=card.querySelector('h2,h3,summary')?.textContent||card.textContent?.slice(0,70)||'';if(board){if(/樓層|頁面|底圖|平面圖|背景|格局|畫布/.test(t))return '平面圖';return /圖樣|標記/.test(t)?'標記':'繪圖'}if(/定位|隊員|成員/.test(t))return '隊員';if(/搜尋|地址/.test(t))return '搜尋';if(/照片/.test(t))return '照片';if(/圖樣|形狀|標記/.test(t))return '標記';if(/操作|繪圖|路線/.test(t))return '繪圖';return '圖層'}
/** @param {boolean} board */
function makePanel(board){
 const aside=$(board?'boardSidebar':'mapSidebar'),page=$(board?'boardPage':'mapPage');
 aside.classList.add('g6-panel');aside.setAttribute('aria-hidden','true');aside.setAttribute('aria-label',board?'戰術板工具':'地圖工具');
 const head=document.createElement('div');head.className='g6-panel-head';
 const title=document.createElement('strong');title.textContent=board?'戰術板工具':'地圖工具';
 const close=button('關閉 ×',closePanel);head.append(title,close);
 const body=document.createElement('div');body.className='g6-panel-body';
 while(aside.firstChild)body.append(aside.firstChild);aside.append(head,body);
 /** @param {string} group */
 const filter=group=>{title.textContent=group==='圖層'?'地圖輔助':group;for(const n of body.children)n.classList.toggle('g6-filtered',group!=='全部'&&classify(n,board)!==group);body.scrollTop=0};
 /** @type {ToolPanel} */
 const panel={aside,open(group='標記'){closePanel();activePanel=panel;returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;aside.classList.add('g6-open');aside.setAttribute('aria-hidden','false');document.body.classList.add('g6-panel-open');filter(group);close.focus()}};
 const old=document.getElementById(board?'boardToolsMobile':'mapToolsMobile');if(old)old.onclick=()=>panel.open();
 // Move existing controls without replacing their listeners or access checks.
 body.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('.tacticalPickBtn,.v353MapGroupPick,.boardTool,.mapTool,#mapShapePlaceBtn,#boardShapePlaceBtn,#photoPlaceBtn,#routeDraftStart,.g6-start-route'))closePanel()});
 return panel;
}
const panels=[makePanel(false),makePanel(true)];$('boardPage').append($('floorTabs'));$('boardPage').append($('boardZoomBadge'));
for(const id of ['mapTacticalList','boardTacticalList']){const card=$(id).closest('.card');if(card){required('h3',card).textContent='戰術標記';required('.muted',card).textContent='選擇標記，再點畫面放置。'}}
required('#permissionPage .sectionTitle').textContent='設定';
const selection=document.createElement('div');selection.className='g6-selection hidden';selection.setAttribute('aria-label','已選物件操作');
const name=document.createElement('strong');selection.append(name,button('↶ 15°',()=>editor.transform(-15,1)),button('↷ 15°',()=>editor.transform(15,1)),button('縮小',()=>editor.transform(0,.85)),button('放大',()=>editor.transform(0,1.15)),button('詳細',()=>editor.details()),button('刪除',()=>editor.remove(),'danger'),button('完成',()=>editor.cancel()));required('#app>main').append(selection);
const objects=document.createElement('dialog');objects.className='g6-object-dialog';
const objectTitle=document.createElement('h2');objectTitle.textContent='選取物件';
const list=document.createElement('div');objects.append(objectTitle,list,button('關閉',()=>objects.close()));document.body.append(objects);
/** @param {boolean} board */
function openObjectList(board){list.replaceChildren();const items=editor.list(board);if(!items.length){const p=document.createElement('p');p.textContent='尚無物件。長按畫布或點「＋工具」新增。';list.append(p)}for(const item of items)list.append(button((item.label||item.text||item.type||'物件')+' · '+(item.ownerName||''),()=>{editor.select(item.id,board);objects.close()}));objects.showModal()}
const share=button('位置未分享',()=>$('locationShareBtn').click(),'g6-share');header.append(share);
const syncRetry=button('尚未同步 · 重試',()=>editor.retry(),'g6-retry hidden');header.append(syncRetry);
const locationNote=document.createElement('p');locationNote.className='muted';locationNote.textContent='網頁版請保持前景。切換 App 或鎖定螢幕後，位置可能停止更新。';document.getElementById('locationStatus')?.parentElement?.append(locationNote);
const roomDialog=document.createElement('dialog');roomDialog.className='g6-object-dialog g6-room-dialog';
const roomHeading=document.createElement('h2');roomHeading.textContent='任務房間';
const adminLink=document.createElement('a');adminLink.href='/owner-admin-v3/';adminLink.textContent='管理測試環境';adminLink.className='g6-admin-link';
const roomSummary=document.createElement('p');roomSummary.className='g6-room-summary';
roomDialog.append(roomHeading,roomSummary,$('leaveBtn'),adminLink,button('關閉',()=>roomDialog.close()));document.body.append(roomDialog);
function moveRoomSwitcher(){const bar=document.getElementById('roomSwitcherBar');if(bar&&bar.parentElement!==roomDialog){roomDialog.insertBefore(bar,adminLink);bar.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('button'))roomDialog.close()})}}
moveRoomSwitcher();const roomObserver=new MutationObserver(moveRoomSwitcher);roomObserver.observe($('app'),{childList:true});
header.append(button('房間',()=>{moveRoomSwitcher();roomSummary.textContent=$('headerRoom').textContent+' · '+$('headerNick').textContent+' · '+$('headerRole').textContent;roomDialog.showModal()},'g6-rooms'));
nav.addEventListener('click',closePanel);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){closePanel();editor.cancel()}
 if(e.key==='Tab'&&activePanel){const items=[...activePanel.aside.querySelectorAll('button,input,select,textarea,[tabindex="0"]')].filter(n=>n instanceof HTMLElement&&n.getClientRects().length&&!n.hasAttribute('disabled'));const first=items[0],last=items.at(-1);if(!(first instanceof HTMLElement)||!(last instanceof HTMLElement))return;if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}}
});
let last='';const statusTimer=setInterval(()=>{
 const s=editor.selected,key=JSON.stringify(s);if(last!==key){last=key;selection.classList.toggle('hidden',!s);name.textContent=s?.label||'';selection.querySelectorAll('button').forEach(b=>b.disabled=!!s&&!s.editable&&!['詳細','完成'].includes(b.textContent||''))}
 share.textContent=editor.locating?'定位授權中 · 取消':editor.sharing?'● 分享中 · 停止':'◎ 開始分享位置';share.classList.toggle('sharing',editor.sharing);share.disabled=!core.roomUuid;
 syncRetry.classList.toggle('hidden',editor.sync==='saved');syncRetry.textContent=editor.sync==='pending'?'正在同步…':'尚未同步 · 重試';syncRetry.disabled=editor.sync==='pending';
},400);
const lifecycle=new AbortController();
window.addEventListener('pagehide',event=>{if(editor.sharing)editor.stop().catch(()=>{});if(!event.persisted){clearInterval(statusTimer);roomObserver.disconnect();lifecycle.abort()}});
window.__KTAK6={version:'0.2',closePanel,openTools:(board,group)=>panels[board?1:0].open(group),openObjectList};
// Only navigate existing UI. No task content or additional data access is exposed.
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'navigate_workspace',title:'切換 KTAK 工作頁',description:'Open an existing KTAK workspace page. Requires an active mission session; does not modify mission data.',inputSchema:{type:'object',properties:{page:{type:'string',enum:Object.keys(labels)}},required:['page'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input!=='object'||!('page' in input)||typeof input.page!=='string'||!Object.hasOwn(labels,input.page))throw Error('Invalid workspace page');if(!core.roomUuid)throw Error('Join a mission first');required('button[data-page="'+input.page+'"]',nav).click();return {page:input.page}}},{signal:lifecycle.signal})).catch(()=>{})}catch{}}
})();
