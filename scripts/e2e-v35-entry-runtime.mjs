import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const host=process.env.KTAK_PREVIEW_HOST;
if(!host&&!process.env.KTAK_E2E_URL)throw new Error('KTAK_PREVIEW_HOST is required');
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');

const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();
await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
page.setDefaultTimeout(15000);
const errors=[];
page.on('pageerror',e=>errors.push('pageerror: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});

try{
  const url=process.env.KTAK_E2E_URL||`https://${host}/?e2e=${Date.now()}`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__KTAK35_UX18?.version===18&&window.__KTAK35_UX18?.revision==='18.3',{timeout:12000});
  await page.waitForFunction(()=>window.__KTAK35_V352?.version==='3.5.2',{timeout:12000});
  await page.waitForSelector('#v35DisasterCounty',{timeout:12000});
  await page.waitForSelector('#v352MissionCard',{timeout:12000});
  await page.waitForSelector('#v352DispatchForm',{timeout:12000});

  // This reproduces the V18 regression: any child-list mutation caused the old
  // observer to rewrite the all-Taiwan option, which recursively triggered itself
  // and starved the app's room/auth recovery timers.
  await page.evaluate(()=>{
    window.__v18Heartbeat=0;
    window.__v18Timer=setInterval(()=>window.__v18Heartbeat++,50);
    const probe=document.createElement('span');
    probe.id='v18-e2e-mutation-probe';
    document.body.append(probe);
    probe.remove();
  });
  await page.waitForFunction(()=>window.__v18Heartbeat>=12,{timeout:5000});

  const state=await page.evaluate(()=>({
    heartbeat:window.__v18Heartbeat,
    allTaiwan:[...document.querySelectorAll('#v35DisasterCounty option')].find(o=>o.value==='')?.textContent||'',
    ux:document.documentElement.dataset.ktakV35Ux||'',
    revision:window.__KTAK35_UX18?.revision||'',
    v352:window.__KTAK35_V352?.version||'',
    dock:!!document.getElementById('v35MapAidDock'),
    locationReady:!!document.querySelector('.locationCard.v18Ready'),
    timelineCollapsed:document.getElementById('v35TimelineBody')?.classList.contains('hidden')||false,
    weatherCollapsed:document.getElementById('v35DisasterBody')?.classList.contains('hidden')||false,
  }));
  if(state.heartbeat<12)throw new Error('browser heartbeat stalled after V18 mutation');
  if(state.allTaiwan!=='全臺')throw new Error(`weather option unexpected: ${state.allTaiwan}`);
  if(state.ux!=='18'||state.revision!=='18.3')throw new Error(`V18.3 runtime marker missing: ${JSON.stringify(state)}`);
  if(state.v352!=='3.5.2')throw new Error(`V3.5.2 runtime marker missing: ${JSON.stringify(state)}`);
  if(!state.dock)throw new Error('map aid dock not installed');
  if(!state.locationReady)throw new Error('member location collapse not installed');
  if(!state.timelineCollapsed||!state.weatherCollapsed)throw new Error('weather/timeline did not start collapsed');

  // V3.5.2 command-flow guard: mission brief is primary, mission mode is only a
  // tool preset, the dispatch form is compact, grouping UI exists, and a healthy
  // sync badge is silent so it cannot cover the desktop leave button.
  const flow=await page.evaluate(()=>{
    window.__KTAK35_V352.ensureUi();
    const banner=document.getElementById('v35OfflineBanner');
    if(banner){banner.classList.remove('offline','pending');banner.textContent='● 網路已連線'}
    let modeFields=document.querySelector('#commandPage .v35ModeFields');
    let syntheticMode=false;
    if(!modeFields){modeFields=document.createElement('div');modeFields.className='v35ModeFields';document.getElementById('commandPage')?.append(modeFields);syntheticMode=true}
    const out={
      mission:document.getElementById('v352MissionCard')?.innerText||'',
      dispatch:!!document.getElementById('v352DispatchForm'),
      groupCard:!!document.getElementById('v352GroupCard'),
      groupShortcut:!!document.getElementById('v352GroupAssigneeShortcuts'),
      modeHeading:[...document.querySelectorAll('#commandPage .v35Card h3')].some(x=>x.textContent.includes('工具預設組')),
      modeFieldsDisplay:getComputedStyle(modeFields).display,
      healthyBannerDisplay:banner?getComputedStyle(banner).display:'missing',
    };
    if(syntheticMode)modeFields.remove();
    return out;
  });
  if(!flow.mission.includes('來源：任務簡報'))throw new Error(`mission brief is not primary in command UI: ${JSON.stringify(flow)}`);
  if(!flow.dispatch||!flow.groupCard||!flow.groupShortcut)throw new Error(`V3.5.2 dispatch/group UI missing: ${JSON.stringify(flow)}`);
  if(!flow.modeHeading||flow.modeFieldsDisplay!=='none')throw new Error(`mission mode is not tool-preset-only: ${JSON.stringify(flow)}`);
  if(flow.healthyBannerDisplay!=='none')throw new Error(`healthy network badge still visible on desktop: ${JSON.stringify(flow)}`);

  // Completed dispatches must leave the active list but remain available in a
  // collapsed history section. Use a synthetic card so this does not touch DEV DB.
  const archiveTest=await page.evaluate(()=>{
    const root=document.getElementById('v35AssignmentList');
    const card=document.createElement('div');card.className='v35Task';card.dataset.v352Synthetic='1';
    card.innerHTML='<div class="v35TaskHead"><b>測試完成任務</b><span>一般 · 整體：已完成</span></div><div class="v35TaskBody">synthetic</div>';
    root.append(card);window.__KTAK35_V352.organizeAssignments();
    const archive=document.getElementById('v352AssignmentArchive');
    const body=document.getElementById('v352AssignmentArchiveBody');
    const moved=body?.contains(card)||false;
    const activeStill=root.contains(card);
    const summary=archive?.querySelector('summary')?.textContent||'';
    card.remove();window.__KTAK35_V352.organizeAssignments();
    return {moved,activeStill,summary};
  });
  if(!archiveTest.moved||archiveTest.activeStill||!archiveTest.summary.includes('已完成 / 已結案'))throw new Error(`completed dispatch did not archive cleanly: ${JSON.stringify(archiveTest)}`);

  // Member-location regression guard: markup is allowed to change and not use H3.
  // The panel must never disappear. It should safely create/find a header, start
  // collapsed, and expand to reveal the original location contents.
  const locationCollapse=await page.evaluate(()=>{
    const card=document.createElement('section');card.className='locationCard v18LocationSynthetic';
    const title=document.createElement('div');title.textContent='房內位置狀態';
    const body=document.createElement('div');body.className='v18SyntheticLocationBody';body.textContent='白手機 · 在線';
    card.append(title,body);document.body.append(card);
    window.__KTAK35_UX18.installLocationCollapse();
    const button=card.querySelector('.v18CardToggle');
    const before={card:getComputedStyle(card).display,header:getComputedStyle(title).display,body:getComputedStyle(body).display,ready:card.classList.contains('v18Ready'),collapsed:card.classList.contains('v18Collapsed'),button:button?.textContent||''};
    button?.click();
    const after={body:getComputedStyle(body).display,collapsed:card.classList.contains('v18Collapsed'),button:button?.textContent||''};
    card.remove();
    return {before,after};
  });
  if(locationCollapse.before.card==='none'||locationCollapse.before.header==='none')throw new Error(`member location panel/header disappeared: ${JSON.stringify(locationCollapse)}`);
  if(!locationCollapse.before.ready||!locationCollapse.before.collapsed||locationCollapse.before.body!=='none'||locationCollapse.before.button!=='展開')throw new Error(`member location did not start safely collapsed: ${JSON.stringify(locationCollapse)}`);
  if(locationCollapse.after.collapsed||locationCollapse.after.body==='none'||locationCollapse.after.button!=='收合')throw new Error(`member location did not expand: ${JSON.stringify(locationCollapse)}`);

  // Desktop regression guard: open the floating map-aid dock and verify that the
  // radar start/end fields, latest/history controls and playback row occupy
  // distinct rectangles inside the panel. Use DOM click rather than Puppeteer's
  // physical clickability calculation because the dock can be off the current
  // headless viewport while still being a fully functional DOM control.
  await page.evaluate(()=>document.getElementById('v35MapAidDockToggle')?.click());
  await page.waitForFunction(()=>!document.getElementById('v35MapAidDockPanel')?.classList.contains('hidden'));
  const radarLayout=await page.evaluate(()=>{
    const panel=document.getElementById('v35MapAidDockPanel');
    const radar=document.getElementById('v35RadarTools');
    const els=[
      document.getElementById('v35RadarStart')?.closest('label'),
      document.getElementById('v35RadarEnd')?.closest('label'),
      document.getElementById('v35RadarNow'),
      radar?.querySelector(':scope > a'),
      radar?.querySelector('.v35RadarPlayback'),
    ].filter(Boolean);
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const panelRect=panel?rect(panel):null;
    const items=els.map((e,i)=>({i,tag:e.tagName,id:e.id||'',r:rect(e)}));
    const overlaps=[];
    for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
      const a=items[i].r,b=items[j].r;
      const x=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      const y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(x>1&&y>1)overlaps.push([items[i].id||items[i].tag,items[j].id||items[j].tag,x,y]);
    }
    const overflow=panelRect?items.filter(x=>x.r.left<panelRect.left-1||x.r.right>panelRect.right+1).map(x=>x.id||x.tag):['panel-missing'];
    return {count:items.length,overlaps,overflow,panelRect,items};
  });
  if(radarLayout.count!==5)throw new Error(`desktop radar layout controls missing: ${JSON.stringify(radarLayout)}`);
  if(radarLayout.overlaps.length)throw new Error(`desktop radar controls overlap: ${JSON.stringify(radarLayout.overlaps)}`);
  if(radarLayout.overflow.length)throw new Error(`desktop radar controls overflow panel: ${JSON.stringify(radarLayout.overflow)}`);

  // V19 regression guard: the latest-radar action must also refresh the visible
  // one-hour start/end window. Previously these inputs were only initialized once
  // at page load and stayed stale until a full browser refresh.
  const radarTimeRefresh=await page.evaluate(()=>{
    const start=document.getElementById('v35RadarStart');
    const end=document.getElementById('v35RadarEnd');
    const button=document.getElementById('v35RadarNow');
    const status=document.getElementById('v35RadarPlaybackStatus');
    if(!start||!end||!button)return {missing:true};
    start.value='01:23';end.value='04:56';
    button.click();
    const parse=v=>{const [h,m]=String(v||'').split(':').map(Number);return h*60+m};
    const now=new Date(),current=now.getHours()*60+now.getMinutes();
    const wrapDiff=(a,b)=>{let d=Math.abs(a-b)%1440;return Math.min(d,1440-d)};
    return {
      missing:false,
      start:start.value,
      end:end.value,
      endDiff:wrapDiff(parse(end.value),current),
      startDiff:wrapDiff(parse(start.value),(current+1380)%1440),
      status:status?.textContent||''
    };
  });
  if(radarTimeRefresh.missing)throw new Error('V19 radar time controls missing');
  if(radarTimeRefresh.endDiff>1||radarTimeRefresh.startDiff>1)throw new Error(`latest radar did not refresh one-hour time window: ${JSON.stringify(radarTimeRefresh)}`);
  if(!radarTimeRefresh.status.includes('最新回波已更新'))throw new Error(`latest radar status did not confirm refresh: ${JSON.stringify(radarTimeRefresh)}`);

  // A fresh browser must not remain blocked behind the room-recovery overlay.
  await page.waitForFunction(()=>!document.body.innerText.includes('正在恢復任務房間'),{timeout:12000}).catch(()=>{
    throw new Error('room recovery overlay remained visible for more than 12 seconds');
  });

  const fatal=errors.filter(x=>!x.includes('Failed to load resource')&&!x.includes('net::ERR_'));
  if(fatal.length)throw new Error('browser console errors: '+fatal.join(' | '));
  console.log('V3.5.2 browser E2E passed: mission brief stays primary, completed dispatches archive, mission mode is tool-preset-only, dispatch/group UI is present, healthy sync is silent, member location remains expandable, radar controls do not overlap, and latest radar refreshes its time window.');
} finally {
  await browser.close();
}

