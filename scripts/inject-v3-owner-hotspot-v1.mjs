import fs from 'node:fs';

const file = 'dist/index.html';
let html = fs.readFileSync(file, 'utf8');
const marker = 'ktak-owner-hotspot-v1';

if (html.includes(marker)) {
  console.log('KTAK owner hotspot already present.');
  process.exit(0);
}
if (!html.includes('class="brand"')) throw new Error('KTAK brand block not found');
if (!html.includes('</body>')) throw new Error('Closing body tag not found');

const css = `\n<style id="${marker}-style">\n.brand{touch-action:manipulation;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}\n</style>\n`;

const script = `\n<script id="${marker}">\n(()=>{\n  let count=0,lastAt=0,resetTimer=0,lastPhysicalAt=0;\n  const go=()=>window.location.assign('/owner-admin-v3/');\n  const getBrand=(target,x,y)=>{\n    const direct=target?.closest?.('.brand');\n    if(direct)return direct;\n    const brand=document.querySelector('.brand');\n    if(!brand)return null;\n    const r=brand.getBoundingClientRect();\n    return Number.isFinite(x)&&Number.isFinite(y)&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom?brand:null;\n  };\n  const record=(event,x,y)=>{\n    const brand=getBrand(event?.target,x,y);\n    if(!brand)return;\n    const now=Date.now();\n    if(now-lastPhysicalAt<100)return;\n    lastPhysicalAt=now;\n    if(now-lastAt>5000)count=0;\n    lastAt=now;\n    count+=1;\n    brand.dataset.ownerTapCount=String(count);\n    clearTimeout(resetTimer);\n    resetTimer=setTimeout(()=>{count=0;delete brand.dataset.ownerTapCount},5200);\n    if(event?.cancelable)event.preventDefault();\n    event?.stopPropagation?.();\n    if(count>=7){\n      count=0;\n      clearTimeout(resetTimer);\n      brand.dataset.ownerTapCount='open';\n      go();\n    }\n  };\n  if(window.PointerEvent){\n    document.addEventListener('pointerup',event=>record(event,event.clientX,event.clientY),true);\n  }else{\n    document.addEventListener('touchend',event=>{\n      const t=event.changedTouches?.[0];\n      if(t)record(event,t.clientX,t.clientY);\n    },{capture:true,passive:false});\n    document.addEventListener('mouseup',event=>record(event,event.clientX,event.clientY),true);\n  }\n  document.addEventListener('dblclick',event=>{\n    if(event.target?.closest?.('.brand')){event.preventDefault();event.stopPropagation()}\n  },true);\n})();\n</script>\n`;

html = html.replace('</head>', `${css}</head>`);
html = html.replace('</body>', `${script}</body>`);

if (!html.includes(marker) || !html.includes("window.location.assign('/owner-admin-v3/')") || !html.includes("document.addEventListener('pointerup'")) {
  throw new Error('Owner hotspot self-check failed');
}

fs.writeFileSync(file, html);
console.log('KTAK owner hotspot v1 applied: seven taps anywhere on the brand block opens /owner-admin-v3/.');

