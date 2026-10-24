/* FORGE v42. Revalidate online app files, safe offline cache fallback. */
const CACHE='forge-v42-activity-explorer';
const CORE=['./','./index.html','./manifest.webmanifest','./forge-icon.svg','./forge-native.css','./forge-visual-v40.css','./gym.js','./food-diary.js','./health-hub.js','./progress.js','./compare.js','./cloud-sync.js','./firebase-config.js','./forge-dashboard.js','./forge-master-ui.js','./forge-train.js','./forge-fuel.js','./forge-activity.js','./forge-activity-explorer.js','./forge-activity-explorer.css','./forge-progress.js','./forge-progress.css','./forge-v26.css','./forge-fuel-insights.js','./forge-train-coach.js','./forge-v27-train.css','./forge-updater.js','./forge-updater.css','./forge-food-navigation.js','./forge-food-navigation.css','./forge-meal-library-data.js','./forge-meal-library.css','./forge-meal-library-plus.js','./forge-v32-smart.css','./forge-meal-cuisines.js','./forge-dietary.js','./forge-v33-dietary.css','./forge-coach.js','./forge-v34-coach.css','./forge-v35-week.css','./forge-reliability.js','./forge-v36-reliability.css','./forge-accounts.js','./forge-v37-accounts.css','./forge-build.json','./refresh-forge.html'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(x=>x!==CACHE).map(x=>caches.delete(x)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{const res=await fetch(req,{cache:'no-store'});if(res.ok){const cache=await caches.open(CACHE);await cache.put('./index.html',res.clone())}return res}
   catch(e){return (await caches.match('./index.html'))||new Response('FORGE is offline. Reconnect and reload.',{status:503,headers:{'Content-Type':'text/plain'}})}
  })());return;
 }
 event.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{if(res.ok&&url.pathname.startsWith(new URL('./',self.registration.scope).pathname))caches.open(CACHE).then(c=>c.put(req,res.clone())).catch(()=>{});return res}).catch(async()=>await caches.match(req)||Response.error()));
});