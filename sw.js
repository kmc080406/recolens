/* Only static same-origin application files are cached. Remote film media is not. */
const PREFIX = 'recolens:' + self.registration.scope + ':';
const VERSION = PREFIX + '7.0.0';
const STATIC_FILES = ['./','index.html','styles.css','data.js','metadata.js','engine.js','app.js'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(STATIC_FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope))return;
  // Network-first ensures replacement deployments do not stay on old HTML/JS.
  event.respondWith((async()=>{
    try {
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),3500);
      let response;
      try { response=await fetch(request,{signal:controller.signal}); }
      finally { clearTimeout(timer); }
      if(!response.ok) throw new Error('Application asset unavailable');
      if(response.ok && STATIC_FILES.some(file=>new URL(file,self.registration.scope).href===url.href)){
        const cache=await caches.open(VERSION);await cache.put(request,response.clone());
      }
      return response;
    }catch{
      const cache = await caches.open(VERSION);
      return (await cache.match(request)) || (request.mode==='navigate' ? await cache.match(new URL('index.html',self.registration.scope)) : undefined) || new Response('Offline',{status:503,statusText:'Offline'});
    }
  })());
});
