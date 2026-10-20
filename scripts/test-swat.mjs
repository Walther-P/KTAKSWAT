import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const h=fs.readFileSync('dist/index.html','utf8'),sw=fs.readFileSync('dist/sw.js','utf8');
assert.match(h,/<title>KTAK SWAT/);
assert.match(h,/ktak_swat_create/);assert.match(h,/ktak_swat_join/);
assert.match(h,/storageKey:"ktak-swat-auth"/);
assert.match(h,/new URLSearchParams\(location.hash.slice\(1\)\)/);
assert.match(h,/swatBoot\(\);/);assert.ok(!h.includes('const backendOk=await initBackend();'));
assert.match(h,/#createPassword,#showRecoverBtn/);
assert.ok(!h.includes('href="/ktak-icons/'));
// Google 網站限制金鑰與 OSM 圖磚都需要 Referer；no-referrer 會讓兩者都失效。
assert.match(h,/<meta name="referrer" content="strict-origin-when-cross-origin">/);
assert.ok(!/<meta name="referrer" content="(no-referrer|same-origin)"/.test(h));
// 這個設定的前提：房間 token 只放在 # 後面，瀏覽器不會把它放進 Referer。
assert.match(h,/url\.hash='room='\+token/);
assert.ok(!fs.existsSync('dist/owner-admin-v3/index.html'));
const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
assert.ok(manifest.icons.every(x=>x.src.startsWith('./')));
assert.match(sw,/k.startsWith\('ktak-swat-'\)/);
assert.match(sw,/client.url.startsWith\(self.registration.scope\)/);
for(const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=/.test(m[1])&&m[2].trim())new vm.Script(m[2]);
// The functional feature surfaces are retained, including prior map zoom fix.
for(const id of ['mapPage','boardPage','chatPage','commandPage','briefPage','g6BriefLocations'])assert.ok(h.includes(id),id);
assert.match(h,/reconcileGoogleMagnification/);
assert.match(h,/嫌/);
console.log('PASS SWAT branding, link entry, equal-edit adapter, isolated auth storage, preserved feature surfaces, GitHub PWA scope and script syntax');
