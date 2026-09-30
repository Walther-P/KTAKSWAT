import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');

function replaceOnce(marker, replacement, label) {
  if (!html.includes(marker)) throw new Error(`Board/route fix marker missing: ${label}`);
  html = html.replace(marker, replacement);
}
function replaceRegexOnce(regex, replacement, label) {
  if (!regex.test(html)) throw new Error(`Board/route fix regex missing: ${label}`);
  html = html.replace(regex, replacement);
}

const css = `
/* KTAK V3 board-route-fix-v1: desktop canvas-only zoom + route editor cleanup */
.boardDesktopZoom{display:none}
@media (min-width:821px){
  .boardLayout{position:relative}
  .boardStage{position:relative;overscroll-behavior:contain}
  .boardDesktopZoom{
    position:absolute;right:14px;top:12px;z-index:10060;
    display:flex;align-items:center;gap:5px;padding:6px;
    background:rgba(10,17,21,.94);border:1px solid #45606f;border-radius:11px;
    box-shadow:0 5px 18px #0009;backdrop-filter:blur(8px)
  }
  .boardDesktopZoom button{min-width:34px;height:32px;padding:4px 8px;border-radius:8px;font-size:12px}
  .boardDesktopZoom .boardZoomPct{min-width:52px;text-align:center;font-size:11px;font-weight:850;color:#e8f3f7}
  .boardDesktopZoom .boardZoomText{font-size:10px;color:#9fb2bc;padding:0 3px;white-space:nowrap}
}
`;
replaceOnce('</style>', css + '\n</style>', 'desktop board zoom css');

// When a whole shared route disappears (manual delete or realtime delete), its
// temporary red node-delete markers must disappear immediately too.
replaceRegexOnce(
  /function renderMapItems\(\)\s*\{/,
  "function renderMapItems(){window.__ktakRoute?.syncNodeEditor?.();",
  'route editor cleanup on map render',
);
replaceOnce(
  '    clearNodeEditor() { clearRouteNodeEditor(); },\n    onLongPressItem(item) {',
  `    clearNodeEditor() { clearRouteNodeEditor(); },
    syncNodeEditor() {
      if (!routeEditingId) return;
      const live = (state.map?.items || []).find(x => x.id === routeEditingId && x.type === 'route');
      if (!live) clearRouteNodeEditor();
    },
    onLongPressItem(item) {`,
  'route editor sync hook',
);
replaceRegexOnce(
  /function renderList\(\)\s*\{/,
  "function renderList(){if(routeEditingId&&!(state.map?.items||[]).some(x=>x.id===routeEditingId&&x.type==='route'))clearRouteNodeEditor();",
  'route editor cleanup on route list render',
);

const runtime = `
<script id="ktak-board-desktop-zoom-v1">
(()=>{
  const MIN=.35,MAX=2.5;
  let scale=1;
  const desktop=()=>window.matchMedia('(min-width:821px)').matches;
  const els=()=>({layout:document.querySelector('.boardLayout'),stage:document.querySelector('.boardStage'),wrap:document.getElementById('boardWrap')});
  const clamp=v=>Math.max(MIN,Math.min(MAX,v));
  const pct=()=>document.querySelector('.boardZoomPct');
  function apply(next){
    const {wrap}=els();if(!wrap)return;
    scale=clamp(next);
    if('zoom' in wrap.style){wrap.style.zoom=String(scale);wrap.style.transform='';}
    else{wrap.style.zoom='';wrap.style.transformOrigin='50% 50%';wrap.style.transform='scale('+scale+')';}
    wrap.dataset.ktakDesktopZoom=String(scale);
    const label=pct();if(label)label.textContent=Math.round(scale*100)+'%';
  }
  function fit(){
    const {stage,wrap}=els();if(!stage||!wrap)return;
    const old=scale;apply(1);
    requestAnimationFrame(()=>{
      const r=wrap.getBoundingClientRect();
      const w=r.width||wrap.offsetWidth||1,h=r.height||wrap.offsetHeight||1;
      const next=Math.min(1,(stage.clientWidth-54)/w,(stage.clientHeight-54)/h);
      apply(Number.isFinite(next)&&next>0?next:old);
      stage.scrollTo({left:Math.max(0,(stage.scrollWidth-stage.clientWidth)/2),top:Math.max(0,(stage.scrollHeight-stage.clientHeight)/2)});
    });
  }
  function build(){
    const {layout,stage}=els();if(!layout||!stage||document.querySelector('.boardDesktopZoom'))return;
    const box=document.createElement('div');box.className='boardDesktopZoom';
    box.innerHTML='<span class="boardZoomText">畫布</span><button type="button" data-board-zoom="out" title="縮小畫布">−</button><span class="boardZoomPct">100%</span><button type="button" data-board-zoom="in" title="放大畫布">＋</button><button type="button" data-board-zoom="fit" title="適合畫面">適合</button><button type="button" data-board-zoom="100" title="回到 100%">100%</button>';
    layout.appendChild(box);
    box.addEventListener('click',e=>{
      const action=e.target?.dataset?.boardZoom;if(!action)return;
      if(action==='in')apply(scale*1.15);
      else if(action==='out')apply(scale/1.15);
      else if(action==='fit')fit();
      else if(action==='100')apply(1);
    });
    stage.addEventListener('wheel',e=>{
      if(!desktop()||!e.ctrlKey)return;
      e.preventDefault();e.stopPropagation();
      const factor=Math.exp(-e.deltaY*0.0022);
      apply(scale*factor);
    },{passive:false,capture:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
  window.addEventListener('resize',()=>{if(desktop())build()});
  window.__ktakBoardDesktopZoom={apply,fit,getScale:()=>scale};
})();
</script>
`;
replaceOnce('</body>', runtime + '\n</body>', 'desktop board zoom runtime');

if (!html.includes('board-route-fix-v1') || !html.includes('ktak-board-desktop-zoom-v1') || !html.includes('syncNodeEditor()') || !html.includes('e.ctrlKey')) {
  throw new Error('KTAK board-route-fix-v1 self-check failed');
}

fs.writeFileSync(file, html);
console.log('KTAK board-route-fix-v1 applied: desktop canvas-only zoom and stale route-node cleanup.');

