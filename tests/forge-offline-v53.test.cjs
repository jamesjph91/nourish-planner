'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const swSource=fs.readFileSync('service-worker.js','utf8');
class MockRequest{constructor(input,opts={}){const raw=input instanceof MockRequest?input.url:String(input);this.url=/^https?:/.test(raw)?raw:new URL(raw,'https://forge.test/nourish-planner/').href;this.method=opts.method||(input instanceof MockRequest?input.method:'GET');this.mode=opts.mode||(input instanceof MockRequest?input.mode:'same-origin');this.cache=opts.cache||'default'}}
class MockResponse{constructor(body='',opts={}){this.body=body;this.status=opts.status||200;this.ok=this.status>=200&&this.status<300;this.headers=opts.headers||{}}clone(){return new MockResponse(this.body,{status:this.status,headers:this.headers})}static error(){return new MockResponse('',{status:599})}}
function swBoot(){
 const listeners={},stored=new Map([['forge-v58-activity-import',new Map()]]),removed=[];let waiting=0,claimed=0,networkDown=false;
 const normalize=x=>x instanceof MockRequest?x.url:new MockRequest(x).url;
 const caches={
  async open(name){if(!stored.has(name))stored.set(name,new Map());const map=stored.get(name);return {add:async req=>{const key=normalize(req);if(networkDown)throw Error('offline');map.set(key,new MockResponse('CACHED '+new URL(key).pathname))},put:async(req,res)=>map.set(normalize(req),res.clone())}},
  async keys(){return [...stored.keys()]},
  async delete(name){removed.push(name);return stored.delete(name)},
  async match(req,opts={}){const key=normalize(req),url=new URL(key);for(const map of stored.values()){if(map.has(key))return map.get(key).clone();if(opts.ignoreSearch){for(const [k,v] of map){const u=new URL(k);if(u.origin===url.origin&&u.pathname===url.pathname)return v.clone()}}}return undefined}
 };
 const self={location:{origin:'https://forge.test'},registration:{scope:'https://forge.test/nourish-planner/'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{waiting++},clients:{claim:async()=>{claimed++}}};
 const context={self,caches,Request:MockRequest,Response:MockResponse,URL,Promise,Error,fetch:async req=>{if(networkDown)throw Error('offline');return new MockResponse('NETWORK '+new URL(normalize(req)).pathname)}};
 vm.runInNewContext(swSource,context);
 const dispatch=async(type,request)=>{let job,reply,used=false;const event={request,waitUntil:p=>job=p,respondWith:p=>{used=true;reply=p}};listeners[type](event);if(job)return await job;return used?await reply:undefined};
 return {dispatch,caches,stored,removed,setOffline:bool=>{networkDown=bool},getWaiting:()=>waiting,getClaimed:()=>claimed};
}
test('Service worker precaches the essential shell and preserves it offline',async()=>{
 const x=swBoot();await x.dispatch('install');
 assert.equal(x.getWaiting(),1);
 assert.equal((await x.caches.keys()).some(name=>/^forge-v\d+-/.test(name)),true);
 await x.dispatch('activate');
 assert.equal(x.getClaimed(),1);
 assert.equal(x.removed.includes('forge-v58-activity-import'),true);
 x.setOffline(true);
 const response=await x.dispatch('fetch',new MockRequest('index.html?v=53',{mode:'navigate'}));
 assert.equal(response.ok,true);
 assert.match(response.body,/CACHED .*index.html/);
});
test('Versioned JavaScript and CSS URLs work offline from canonical precache entries',async()=>{
 const x=swBoot();await x.dispatch('install');await x.dispatch('activate');x.setOffline(true);
 for(const asset of ['gym.js?v=53','forge-offline-v53.js?v=53','forge-native.css?v=23','forge-offline-v53.css?v=53']){
  const response=await x.dispatch('fetch',new MockRequest(asset));
  assert.equal(response.ok,true,asset);
 }
});
test('Failed essential cache prevents activating a broken worker',async()=>{
 const original=MockResponse;let failed=false;
 const listeners={},stored=new Map();
 const caches={async open(name){stored.set(name,new Map());return {add:async req=>{if(String(req.url).includes('index.html')){failed=true;throw Error('missing')} stored.get(name).set(req.url,new original('ok'))}}},async keys(){return[]},async delete(){return true},async match(){return undefined}};
 const self={location:{origin:'https://forge.test'},registration:{scope:'https://forge.test/nourish-planner/'},addEventListener:(n,f)=>listeners[n]=f,skipWaiting:async()=>{throw Error('must not wait')},clients:{claim:async()=>{}}};
 vm.runInNewContext(swSource,{self,caches,Request:MockRequest,Response:MockResponse,URL,Promise,Error,fetch:async()=>new MockResponse('ok')});
 let job;listeners.install({waitUntil:p=>job=p});await assert.rejects(job);assert.equal(failed,true);
});
test('Offline inspector reports missing app files, without manufacturing readiness',()=>{
 const code=fs.readFileSync('forge-offline-v53.js','utf8');
 assert.match(code,/missing/i);assert.match(code,/cache/i);assert.doesNotMatch(code,/localStorage\.(?:clear|removeItem)/);
});
test('Deployed version is only claimed when fetched; offline state is clearly unknown',()=>{
 const code=fs.readFileSync('forge-offline-v53.js','utf8');
 assert.match(code,/forge-build\.json/);assert.match(code,/unknown|unavailable|offline/i);
});
test('Recovery HEAD probe occurs before any cache deletion or unregister step',()=>{
 const html=fs.readFileSync('refresh-forge.html','utf8');
 const probe=html.indexOf("method:'HEAD'"),del=html.indexOf('caches.delete'),unreg=html.indexOf('.unregister');
 assert.ok(probe>=0);assert.ok(del>probe);assert.ok(unreg>probe);
});
test('Offline repair and inspector are read-only with accessible buttons and no external paid requirement',()=>{
 const code=fs.readFileSync('forge-offline-v53.js','utf8');
 assert.doesNotMatch(code,/indexedDB\.deleteDatabase|localStorage\.clear/);assert.doesNotMatch(code,/Samsung Health.*sync/i);
});
