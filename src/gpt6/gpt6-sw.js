/* GPT6 PWA push: no open tab or foreground Realtime connection is required. */
const SHELL_CACHE='ktak-gpt6-shell-__SHELL_REVISION__';
const shellUrl=new URL('./index.html',self.registration.scope).href;
// Safari rejects a redirected Response reused for a navigation. Preserve the
// decoded body and headers, but never replay its internal redirect URL chain.
function navigationResponse(response){
  if(!response.redirected)return response;
  const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  // This is only the public program shell. Room data and authentication still come from the server.
  try{
  const response=await fetch(new Request(shellUrl,{cache:'reload'}));
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('App shell unavailable');
  const html=await response.clone().text();
  if(!html.includes('id="app"')||!html.includes('<title>KTAK GPT-6'))throw Error('Unexpected app shell');
  if(response.url&&new URL(response.url).origin!==new URL(shellUrl).origin)throw Error('Unexpected shell origin');
  await (await caches.open(SHELL_CACHE)).put(shellUrl,navigationResponse(response));
  }catch{} // A full cache or temporary network failure must not disable push.
  await self.skipWaiting();
})()));
const STATIC_CACHE='ktak-gpt6-static-v1';
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ktak-')&&k!==STATIC_CACHE&&k!==SHELL_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
// Public entry shell is release-pinned; room data, config and third-party responses are never cached.
self.addEventListener('fetch',event=>{
  const req=event.request,url=new URL(req.url);
  if(req.method==='GET'&&req.mode==='navigate'&&url.origin===new URL(self.registration.scope).origin&&['/','/index.html'].includes(url.pathname)){
    event.respondWith((async()=>{
      try{const hit=await (await caches.open(SHELL_CACHE)).match(shellUrl);if(hit)return navigationResponse(hit)}catch{}
      return navigationResponse(await fetch(req));
    })());return;
  }
  if(req.method!=='GET'||url.origin!==new URL(self.registration.scope).origin||!/^\/[\w/-]+\.(js|css)$/.test(url.pathname)||!/^\?v=[a-f0-9]{12}$/.test(url.search)||url.pathname==='/config.js')return;
  event.respondWith((async()=>{
    let cache;try{cache=await caches.open(STATIC_CACHE);const hit=await cache.match(req);if(hit)return hit}catch{}
    const response=await fetch(req);
    if(cache&&response.ok&&response.type!=='opaque'){
      try{await cache.put(req,response.clone());const keys=await cache.keys();await Promise.all(keys.slice(0,Math.max(0,keys.length-40)).map(key=>cache.delete(key)))}catch{}
    }
    return response;
  })());
});
function notificationTarget(value){
  const base=new URL(self.registration.scope),url=new URL('/',base);
  try{
    const candidate=new URL(value||'./',base);
    if(candidate.origin!==base.origin)return url.href;
    const page=candidate.searchParams.get('open');
    if(['chat','command','map','brief','board'].includes(page))url.searchParams.set('open',page);
  }catch{}
  return url.href;
}
self.addEventListener('push',event=>{
  let payload={};try{payload=event.data?.json()||{}}catch{}
  event.waitUntil(self.registration.showNotification(String(payload.title||'KTAK GPT-6').slice(0,120),{
    body:String(payload.body||'你有新的任務通知').slice(0,500),icon:'./icon-192.png',badge:'./icon-192.png',
    tag:String(payload.tag||'ktak-message').slice(0,160),renotify:true,timestamp:Date.now(),
    data:{url:notificationTarget(payload.url)}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=notificationTarget(event.notification?.data?.url);
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      if(new URL(client.url).origin!==new URL(self.registration.scope).origin)continue;
      try{if('navigate' in client&&client.url!==target)await client.navigate(target);return await client.focus()}catch{}
    }
    return self.clients.openWindow?.(target);
  })());
});
