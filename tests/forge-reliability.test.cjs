'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const inline=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)?.[1];
const rel=fs.readFileSync('forge-reliability.js','utf8');
test('Core local save confirms success and announces browser storage failures',()=>{
 const begin=inline.indexOf('const save=()=>'),end=inline.indexOf('const portion=',begin);
 assert.ok(begin>0&&end>begin);
 const source=inline.slice(begin,end);const events=[];let fail=false,stored=null;
 const state={tab:'diary',foodDiary:{entries:[{name:'real data'}]}};
 const ctx={s:state,localStorage:{setItem(k,v){assert.equal(k,'nourishHigherDeficitV1');if(fail)throw Object.assign(new Error('storage full'),{name:'QuotaExceededError'});stored=v}},
 window:{dispatchEvent:e=>events.push(e)},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},Date};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 assert.equal(vm.runInContext('save()',ctx),true);
 assert.equal(JSON.parse(stored).foodDiary.entries[0].name,'real data');
 assert.equal(events[0].type,'forge:save-status');assert.equal(events[0].detail.ok,true);
 fail=true;
 assert.equal(vm.runInContext('save()',ctx),false);
 assert.equal(events.at(-2).type,'forge:save-status');
 assert.equal(events.at(-2).detail.ok,false);assert.equal(events.at(-2).detail.error,'QuotaExceededError');
 assert.equal(vm.runInContext('window.forgeRetryLocalSave()',ctx),false);
 assert.ok(events.some(e=>e.type==='nourish:changed'));
 assert.equal(JSON.parse(stored).tab,'diary','Failed save must not erase the previous stored state');
});
test('Android Back uses real history and does not create another history entry when returning',()=>{
 const start=inline.indexOf('const FORGE_NAV_TABS='),end=inline.indexOf('function setWeek(',start);
 assert.ok(start>0&&end>start);
 const code=inline.slice(start,end);const handlers={};const entries=[],calls=[],page={classList:{contains:x=>x==='tabpage'}},location={hash:''};
 const context={s:{tab:'overview'},document:{getElementById:()=>page,querySelectorAll:()=>[{id:'overview',dataset:{tab:'overview'},classList:{toggle(){} }},{id:'diary',dataset:{tab:'diary'},classList:{toggle(){} }}]},
 window:{addEventListener:(name,fn)=>handlers[name]=fn,scrollTo(opts){calls.push(opts)}},
 history:{pushState:(state,title,hash)=>{entries.push(state.forgeTab);location.hash=hash}},
 location,save:()=>true,renderCurrent(){calls.push('render')},CustomEvent:class{}};
 vm.createContext(context);vm.runInContext(code,context);
 vm.runInContext("navigate('diary')",context);
 assert.equal(context.s.tab,'diary');assert.deepEqual(entries,['diary']);
 handlers.popstate({state:{forgeTab:'overview'}});
 assert.equal(context.s.tab,'overview');assert.deepEqual(entries,['diary']);
 vm.runInContext("navigate('unknown')",context);
 assert.equal(context.s.tab,'overview');assert.deepEqual(entries,['diary']);
});
function boot(){
 const events={},nodes={},state=new Map();
 const document={readyState:'loading',getElementById:id=>nodes[id]||null,addEventListener:(name,fn)=>events['doc:'+name]=fn,querySelector:()=>null};
 const window={addEventListener:(name,fn)=>events[name]=fn};
 const navigator={onLine:true,storage:{persisted:async()=>false,persist:async()=>false}};
 const context={document,window,navigator,localStorage:{getItem:key=>key==='nourishHigherDeficitV1'?state.get(key)||null:null},Intl,Date,console};
 vm.createContext(context);vm.runInContext(rel,context,{filename:'forge-reliability.js'});
 return {api:window.forgeReliability,nodes,navigator,events,state};
}
test('Save badge never reports a failed write as successful or as cloud sync',()=>{
 const t=boot();
 t.api.saveEvent({detail:{ok:false,error:'QuotaExceededError'}});
 assert.match(t.api.label(),/Save failed/);
 t.api.saveEvent({detail:{ok:true,at:Date.now()}});
 assert.match(t.api.label(),/Saved on this device/);
 t.api.externalChange({key:'nourishHigherDeficitV1'});
 assert.match(t.api.label(),/Another tab changed/);
 t.api.saveEvent({detail:{ok:true,at:Date.now()}});
 assert.doesNotMatch(t.api.label(),/Another tab/);
 t.navigator.onLine=false;
 assert.match(t.api.connectionLabel(),/Offline/);
 assert.doesNotMatch(rel,/Cloud backup complete|Synced to cloud/);
});
test('Storage protection request tells the truth when permission is denied',async()=>{
 const t=boot();const node={textContent:''};t.nodes['forge-persistence-status']=node;
 await t.api.storageStatus();assert.match(node.textContent,/may remove site data/);
 await t.api.requestProtection();assert.match(node.textContent,/did not grant/);
 t.navigator.storage.persist=async()=>true;
 await t.api.requestProtection();assert.match(node.textContent,/granted persistent storage/);
});
test('Reliability layer preserves all personal data and avoids mutation observers',()=>{
 assert.match(rel,/nourishHigherDeficitV1/);
 assert.doesNotMatch(rel,/localStorage\.setItem|localStorage\.clear|localStorage\.removeItem|indexedDB\.deleteDatabase/);
 assert.doesNotMatch(rel,/MutationObserver|document\.write/);
 assert.match(rel,/not included/i);
 assert.match(fs.readFileSync('forge-v36-reliability.css','utf8'),/prefers-reduced-motion/);
});
