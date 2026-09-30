import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const host=process.env.KTAK_PREVIEW_HOST;
if(!host&&!process.env.KTAK_E2E_URL)throw new Error('KTAK_PREVIEW_HOST is required');
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();await page.setViewport({width:1280,height:900,deviceScaleFactor:1});page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
try{
  const url=process.env.KTAK_E2E_URL||`https://${host}/?v356e2e=${Date.now()}`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__KTAK35_V356?.version==='3.5.6',{timeout:15000});
  const out=await page.evaluate(async()=>{
    const host=document.createElement('div');host.innerHTML='<div class="v355TeamMarker"><svg class="v355TeamMarkerShape" viewBox="0 0 96 50"><path d="M4 5H66L92 25 66 45H4Z"></path></svg><span class="v355TeamMarkerLabel">A 攻擊隊</span></div>';document.body.append(host);
    const marker=host.querySelector('.v355TeamMarker'),path=host.querySelector('path'),label=host.querySelector('.v355TeamMarkerLabel');
    const ms=getComputedStyle(marker),ps=getComputedStyle(path),ls=getComputedStyle(label);
    const promptText=await fetch('./ktak-v35-assignment-prompt-v14.js?v=e2e-'+Date.now()).then(r=>r.text());
    const indexText=await fetch('./?source=v356-'+Date.now()).then(r=>r.text());
    const result={
      version:window.__KTAK35_V356?.version,
      pendingNew:window.__KTAK35_V356?.shouldAutoPrompt?.('pending',false),
      pendingSeen:window.__KTAK35_V356?.shouldAutoPrompt?.('pending',true),
      accepted:window.__KTAK35_V356?.shouldAutoPrompt?.('accepted',false),
      active:window.__KTAK35_V356?.shouldAutoPrompt?.('active',false),
      labelOpacity:ls.opacity,labelColor:ls.color,labelBackground:ls.backgroundColor,labelWeight:ls.fontWeight,
      markerFilter:ms.filter,pathFillOpacity:ps.fillOpacity,
      promptRevision:window.__KTAK35_ASSIGNMENT_PROMPT14?.revision||'',
      promptHasSeen:promptText.includes('promptSeenStorageKey'),
      promptPendingOnly:promptText.includes("if(!force&&a.status!=='pending')return"),
      promptNoForcedCurrent:!promptText.includes('renderPrompt(current,true)'),
      dragFast:indexText.includes("if(teamFast)layer.setLatLng([item.lat,item.lng]);else updateLeafletLayer(layer,item)"),
      dragNoSelection:indexText.includes('if(selectedMapId===item.id&&!teamFast)renderMapSelection()')
    };
    host.remove();return result;
  });
  if(out.version!=='3.5.6')throw new Error(`V3.5.6 runtime missing: ${JSON.stringify(out)}`);
  if(out.pendingNew!==true||out.pendingSeen!==false||out.accepted!==false||out.active!==false)throw new Error(`one-shot prompt rule invalid: ${JSON.stringify(out)}`);
  if(out.labelOpacity!=='1'||out.markerFilter!=='none'||Number(out.pathFillOpacity)<0.99)throw new Error(`team marker not fully opaque/lightweight: ${JSON.stringify(out)}`);
  if(!out.labelBackground||out.labelBackground==='rgba(0, 0, 0, 0)')throw new Error(`team label lacks contrast background: ${JSON.stringify(out)}`);
  if(out.promptRevision!=='14.2-v356'||!out.promptHasSeen||!out.promptPendingOnly||!out.promptNoForcedCurrent)throw new Error(`deployed prompt de-duplication missing: ${JSON.stringify(out)}`);
  if(!out.dragFast||!out.dragNoSelection)throw new Error(`team drag fast path missing: ${JSON.stringify(out)}`);
  const fatal=errors.filter(x=>!x.includes('Failed to load resource')&&!x.includes('net::ERR_'));
  if(fatal.length)throw new Error('browser console errors: '+fatal.join(' | '));
  console.log('V3.5.6 deployed runtime E2E passed: team labels are opaque/high-contrast, team dragging uses lat/lng-only movement, and full-screen assignment alerts are one-shot pending notifications only.');
} finally {await browser.close()}

