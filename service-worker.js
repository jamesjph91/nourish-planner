// Network-first strategy lets the same URL pick up new published app versions.
const CACHE='nourish-cloud-v4-gym';
const PRECACHE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./gym.js','./cloud-sync.js','./firebase-config.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(PRECACHE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(u.origin!==location.origin||r.method!=='GET')return;
 e.respondWith(fetch(r).then(resp=>{if(resp.ok){let copy=resp.clone();caches.open(CACHE).then(c=>c.put(r,copy));}return resp;}).catch(()=>caches.match(r)));});
