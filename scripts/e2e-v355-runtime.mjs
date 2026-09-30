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
const errors=[];page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
try{
  const url=process.env.KTAK_E2E_URL||`https://${host}/?v355e2e=${Date.now()}`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.__KTAK35_V355?.version==='3.5.5',{timeout:15000});
  await page.waitForSelector('#v355TimelineExport',{timeout:15000});
  const out=await page.evaluate(()=>({
    version:window.__KTAK35_V355?.version,
    captureBriefDraft:typeof window.__KTAK35_CORE?.captureBriefDraft,
    restoreBriefDraft:typeof window.__KTAK35_CORE?.restoreBriefDraft,
    timelineButton:document.getElementById('v355TimelineExport')?.textContent||'',
    radarChecked:document.getElementById('v35RadarToggle')?.checked===true,
    teamMarkerCss:[...document.querySelectorAll('style')].some(s=>(s.textContent||'').includes('.v355TeamMarkerLabel')),
    state:window.__KTAK35_V355?.getState?.()
  }));
  if(out.version!=='3.5.5')throw new Error('V3.5.5 runtime marker missing');
  if(out.captureBriefDraft!=='function'||out.restoreBriefDraft!=='function')throw new Error(`brief draft bridge missing: ${JSON.stringify(out)}`);
  if(out.timelineButton!=='匯出 Timeline')throw new Error(`timeline export UI missing: ${JSON.stringify(out)}`);
  if(!out.teamMarkerCss)throw new Error('directional team marker CSS missing');
  // A fresh browser starts with radar off; V3.5.5 must preserve opt-in behavior.
  if(out.radarChecked)throw new Error('radar unexpectedly enabled on fresh startup');
  const fatal=errors.filter(x=>!x.includes('Failed to load resource')&&!x.includes('net::ERR_'));
  if(fatal.length)throw new Error('browser console errors: '+fatal.join(' | '));
  console.log('V3.5.5 deployed runtime E2E passed: maintenance runtime loads, brief draft bridge is available, Timeline export exists, directional-team CSS is active and radar starts opt-in/off.');
} finally {await browser.close()}

