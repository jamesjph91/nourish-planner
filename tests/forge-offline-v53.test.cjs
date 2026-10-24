'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const sw=fs.readFileSync('service-worker.js','utf8');
const offline=fs.readFileSync('forge-offline-v53.js','utf8');
const refresh=fs.readFileSync('refresh-forge.html','utf8');
const ROOT='https://example.com/nourish-planner/';
class MockRequest{
 constructor(u,opts={}){this.url=new URL(u,ROOT).href;this.method=opts.method||'GET';this.mode=opts.mode||'cors'}
}
class MockResponse{
 constructor(body='',opts={}){this.body=body;this.status=opts.status??200;this.ok=this.status>=200&&this.status<300}
 clone(){return new MockResponse(this.body,{status:this.status})}
 static error(){return new MockResponse('',{status:0})}
}
function swBoot(failFiles=[]){
 const listeners={},stored=new Map(),removed=[];
 let networkDown=false,waiting=0,claimed=0;
 const oldName='forge-v53-offline-recovery';
 stored.set(oldName,new Map([['https://example.com/nourish-planner/index.html',new MockResponse('OLD')]]));
 const canonical=u=>new URL(u instanceof MockRequest?u.url:String(u),ROOT).href;
 function find(map,req,opts={}){
  const target=new URL(canonical(req));
  for(const [url,response] of map){
   const key=new URL(url);
   if(key.origin===target.origin&&key.pathname===target.pathname&&(opts.ignoreSearch||key.search===target.search))return response;
  }
  return undefined;
 }
 const caches={
  keys:async()=>[...stored.keys()],
  open:async name=>{
   if(!stored.has(name))stored.set(name,new Map());
   const map=stored.get(name);
   return {
    add:async request=>{
     const path=new URL(canonical(request)).pathname;
     if(failFiles.some(part=>path.endsWith(part)))throw Error('offline network');
     map.set(canonical(request),new MockResponse('CACHED '+path));
    },
    put:async(request,response)=>{map.set(canonical(request),response)},
    match:async(request,opts)=>find(map,request,opts)
   };
  },
  delete:async name=>{removed.push(name);return stored.delete(name)},
  match:async(request,opts)=>{
   for(const map of stored.values()){const res=find(map,request,opts);if(res)return res}
   return undefined;
  }
 };
 const self={
  registration:{scope:ROOT},location:{origin:new URL(ROOT).origin},
  addEventListener:(name,callback)=>listeners[name]=callback,
  skipWaiting:async()=>{waiting++},clients:{claim:async()=>{claimed++}}
 };
 const fetch=async request=>{
  if(networkDown)throw Error('network is down');
  return new MockResponse('LIVE '+canonical(request));
 };
 vm.runInNewContext(sw,{self,caches,Request:MockRequest,Response:MockResponse,URL,fetch,Set,Promise,console},{filename:'service-worker.js'});
 const dispatch=async(name,request)=>{
  let job,reply,used=false;
  listeners[name]({
   request,
   waitUntil(value){job=value},
   respondWith(value){used=true;reply=value}
  });
  if(job)return await job;
  return used?await reply:undefined;
 };
 return {dispatch,caches,stored,removed,setOffline:bool=>{networkDown=bool},getWaiting:()=>waiting,getClaimed:()=>claimed};
}
test('Service worker precaches the essential shell and preserves it offline',async()=>{
 const x=swBoot();await x.dispatch('install');
 assert.equal(x.getWaiting(),1);
 assert.equal((await x.caches.keys()).includes('forge-v54-gym-flow'),true);
 await x.dispatch('activate');
 assert.equal(x.getClaimed(),1);
 assert.equal(x.removed.includes('forge-v53-offline-recovery'),true);
 x.setOffline(true);
 const response=await x.dispatch('fetch',new MockRequest('index.html?v=53',{mode:'navigate'}));
 assert.equal(response.ok,true);
 assert.match(response.body,/CACHED .*index.html/);
});
test('Versioned JavaScript and CSS URLs work offline from canonical precache entries',async()=>{
 const x=swBoot();await x.dispatch('install');await x.dispatch('activate');x.setOffline(true);
 for(const asset of ['gym.js?v=53','forge-offline-v53.js?v=53','forge-native.css?v=23','forge-offline-v53.css?v=53']){
  const response=await x.dispatch('fetch',new MockRequest(asset));
  assert.equal(response.ok,true,'Cached offline asset '+asset);
  assert.match(response.body,/CACHED/);
 }
 const missing=await x.dispatch('fetch',new MockRequest('not-in-core.js?v=1'));
 assert.equal(missing.ok,false,'Unknown assets are not substituted by unrelated cache entries');
 const foreign=await x.dispatch('fetch',new MockRequest('https://another.example.com/missing.js'));
 assert.equal(foreign,undefined,'Never intercept assets from another origin');
});
test('Failed essential cache prevents activating a broken worker',async()=>{
 const x=swBoot(['gym.js']);
 await assert.rejects(x.dispatch('install'),/Required offline app files/);
 assert.equal(x.getWaiting(),0);
 assert.equal((await x.caches.keys()).includes('forge-v53-offline-recovery'),true);
});
function uiBoot(cached=true){
 const events={},cacheData=new Set(cached?['index.html','forge-native.css','gym.js','food-diary.js','health-hub.js','progress.js','forge-master-ui.js','forge-dashboard.js','forge-accounts.js','forge-offline-v53.js']:[]);
 let networkDown=false,remote=53;
 const document={readyState:'loading',addEventListener:(name,fn)=>events['doc:'+name]=fn,
  getElementById:()=>null,querySelector:s=>s==='meta[name="forge-release"]'?{content:'53'}:null};
 const window={addEventListener:(name,fn)=>events[name]=fn};
 const location={href:ROOT+'index.html'};
 const caches={
  keys:async()=>['forge-v54-gym-flow'],
  open:async()=>({
   match:async url=>{
    const name=new URL(url).pathname.split('/').at(-1);
    return cacheData.has(name)?new MockResponse():undefined;
   }
  })
 };
 window.caches=caches; // CacheStorage exists on window in browsers.
 const navigator={onLine:true,serviceWorker:{}};
 const fetch=async()=>{if(networkDown)throw Error('offline');return {ok:true,json:async()=>({version:remote})}};
 vm.runInNewContext(offline,{document,window,location,URL,caches,navigator,fetch,Date,Number,console},{filename:'forge-offline-v53.js'});
 return {api:window.forgeOfflineV53,cacheData,navigator,setNetwork:b=>{networkDown=b},setRemote:v=>{remote=v}};
}
test('Offline inspector reports missing app files, without manufacturing readiness',async()=>{
 const x=uiBoot();
 const ok=await x.api.inspect();
 assert.equal(ok.state,'ready');
 assert.equal(ok.ready,10);
 x.cacheData.delete('gym.js');
 const missing=await x.api.inspect();
 assert.equal(missing.state,'partial');
 assert.ok(missing.missing.includes('./gym.js'));
 assert.match(x.api.markup(),/safe app refresh/i);
});
test('Deployed version is only claimed when fetched; offline state is clearly unknown',async()=>{
 const x=uiBoot();x.setRemote(54);
 let status=await x.api.latest();
 assert.equal(status.state,'verified');
 assert.match(x.api.model().online,/update available/);
 x.setNetwork(true);status=await x.api.latest();
 assert.equal(status.state,'unavailable');
 assert.match(x.api.model().online,/Could not verify/);
 x.navigator.onLine=false;x.setNetwork(false);
 status=await x.api.latest();assert.equal(status.state,'unavailable');
});
test('Recovery HEAD probe occurs before any cache deletion or unregister step',()=>{
 const head=refresh.indexOf("method:'HEAD'");
 const clear=refresh.indexOf('caches.keys()'),unregister=refresh.indexOf('getRegistrations()');
 assert.ok(head>0&&clear>head&&unregister>head);
 assert.match(refresh,/navigator.onLine===false/);
 assert.match(refresh,/index.html\?v=53/);
 assert.doesNotMatch(refresh,/localStorage\.(?:clear|removeItem)|indexedDB\.deleteDatabase/);
});
test('Offline repair and inspector are read-only with accessible buttons and no external paid requirement',()=>{
 new vm.Script(offline);new vm.Script(sw);
 assert.match(offline,/data-fo53-check/);
 assert.match(offline,/data-fo53-version/);
 assert.match(offline,/Google sign-in\/sync/);
 assert.match(offline,/chrome/i);
 assert.match(offline,/refresh-forge\.html/);
 assert.doesNotMatch(offline,/localStorage\.(?:setItem|clear|removeItem)|indexedDB\.deleteDatabase/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-offline-v53\.js\?v=53/);
 assert.match(html,/forge-offline-v53\.css\?v=53/);
 const css=fs.readFileSync('forge-offline-v53.css','utf8');
 assert.match(css,/min-height:45px/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
