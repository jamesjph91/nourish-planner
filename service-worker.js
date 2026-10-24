/* FORGE v55. Versioned offline asset fallback and verified core shell precache. */
const CACHE='forge-v55-strength-evidence';
const CORE=['./','./index.html','./manifest.webmanifest','./forge-icon.svg','./forge-native.css','./forge-visual-v40.css','./forge-visual-v47.css','./forge-art-hero.svg','./forge-art-train.svg','./forge-art-fuel.svg','./forge-art-activity.svg','./forge-art-progress.svg','./gym.js','./forge-train-v48.css','./forge-train-v49.css','./food-diary.js','./health-hub.js','./progress.js','./compare.js','./cloud-sync.js','./firebase-config.js','./forge-dashboard.js','./forge-today-v45.js','./forge-today-v45.css','./forge-master-ui.js','./forge-train.js','./forge-fuel.js','./forge-activity.js','./forge-activity-explorer.js','./forge-activity-explorer.css','./forge-progress.js','./forge-progress.css','./forge-v26.css','./forge-fuel-insights.js','./forge-train-coach.js','./forge-strength-insights.js','./forge-strength-v50.js','./forge-strength-v50.css','./forge-access-v51.js','./forge-access-v51.css','./forge-data-safety-v52.js','./forge-data-safety-v52.css','./forge-offline-v53.js','./forge-offline-v53.css','./forge-gym-v54.js','./forge-gym-v54.css','./forge-strength-v55.js','./forge-strength-v55.css','./forge-strength-insights.css','./forge-fuel-v44.css','./forge-fuel-v46.css','./forge-v27-train.css','./forge-updater.js','./forge-updater.css','./forge-food-navigation.js','./forge-food-navigation.css','./forge-meal-library-data.js','./forge-meal-library.css','./forge-meal-library-plus.js','./forge-v32-smart.css','./forge-meal-cuisines.js','./forge-dietary.js','./forge-v33-dietary.css','./forge-coach.js','./forge-v34-coach.css','./forge-v35-week.css','./forge-reliability.js','./forge-v36-reliability.css','./forge-accounts.js','./forge-v37-accounts.css','./forge-build.json','./refresh-forge.html'];
/* Keep the installed offline app working when version query parameters change.
   Never strip queries for arbitrary origins or non-core assets. */
const ESSENTIAL=['./index.html','./forge-native.css','./gym.js','./food-diary.js',
 './health-hub.js','./progress.js','./forge-master-ui.js','./forge-dashboard.js',
 './forge-accounts.js','./forge-offline-v53.js'];
const scopeBase=new URL('./',self.registration.scope);
const scopedPath=path=>new URL(path,scopeBase).pathname;
const corePaths=new Set(CORE.map(scopedPath));
const keyFor=request=>{
 const url=new URL(request.url);
 if(url.origin!==scopeBase.origin||!url.pathname.startsWith(scopeBase.pathname)||!corePaths.has(url.pathname))return null;
 return scopeBase.origin+url.pathname;
};
async function cacheFallback(request){
 const direct=await caches.match(request);
 if(direct)return direct;
 const key=keyFor(request);
 return key?await caches.match(key,{ignoreSearch:true})||null:null;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const results=await Promise.allSettled(CORE.map(url=>cache.add(new Request(url,{cache:'reload'}))));
 // Abort activation if the essentials are not downloadable: preserve the prior worker.
 const failures=ESSENTIAL.filter(path=>{
  const i=CORE.indexOf(path);
  return i<0||results[i]?.status!=='fulfilled';
 });
 if(failures.length)throw Error('Required offline app files could not be cached: '+failures.join(', '));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(x=>x!==CACHE&&/^(forge|nourish)[-_]/i.test(x)).map(x=>caches.delete(x)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(!url.pathname.startsWith(scopeBase.pathname))return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const res=await fetch(req,{cache:'no-store'});
    if(res.ok){
     const cache=await caches.open(CACHE);
     await cache.put('./index.html',res.clone());
    }
    return res;
   }catch{
    return (await cacheFallback(new Request('./index.html', {method:'GET'})))||
       (await caches.match('./index.html'))||
       new Response('FORGE is offline and its app shell is missing. Reconnect and use the safe refresh page.',{
        status:503,headers:{'Content-Type':'text/plain'}
       });
   }
  })());return;
 }
 event.respondWith((async()=>{
  try{
   const res=await fetch(req,{cache:'no-cache'});
   if(res.ok){
    const current=await caches.open(CACHE);
    // Do not let a response for a versioned URL evict or replace a different asset.
    await current.put(req,res.clone());
   }
   return res;
  }catch{
   return await cacheFallback(req)||Response.error();
  }
 })());
});
