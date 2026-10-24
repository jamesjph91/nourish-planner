'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('forge-data-safety-v52.js','utf8');
const css=fs.readFileSync('forge-data-safety-v52.css','utf8');
const html=fs.readFileSync('index.html','utf8');
function boot(saved){
 const store=new Map(saved?[['nourishHigherDeficitV1',JSON.stringify(saved)]]:[]);
 const events={},writes=[];
 const nodes={};
 const document={readyState:'loading',getElementById:id=>nodes[id]||null,
  addEventListener:(name,cb)=>(events['doc:'+name]??=[]).push(cb)};
 const window={forgeCurrentAccountUid:'myAccount123',addEventListener:(name,cb)=>(events[name]??=[]).push(cb)};
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>{writes.push(k);store.set(k,v)}};
 let accepted=false;
 const ctx={document,window,localStorage,Date,Intl,Number,String,Object,JSON,Math,console,confirm:()=>accepted};
 vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'forge-data-safety-v52.js'});
 return {api:window.forgeDataSafetyV52,store,writes,events,nodes,setAccepted:v=>{accepted=v},window};
}
const sample={
 workouts:{sessions:{
  '2026-10-12':{completed:true,sets:{bench:[{done:true,kg:20,reps:10},{done:false,kg:90,reps:6}]}},
  '2026-10-18':{completed:false,sets:{row:[{done:true,kg:18,reps:12}]}}
 }},
 foodDiary:{entries:[{name:'Greek yoghurt'}, {name:'Eggs'}],savedFoods:[{name:'Oats'}]},
 healthActivity:{daily:[{date:'2026-10-14'},{date:'2026-10-18'}]},
 measurements:[{date:'2026-10-15',weightKg:90}]
};
test('Counts real local entries, checked sets and completed workouts without writing',()=>{
 const x=boot(sample),m=x.api.totals();
 assert.equal(m.foodEntries,2);assert.equal(m.savedFoods,1);
 assert.equal(m.workouts,1);assert.equal(m.loggedSets,2);
 assert.equal(m.activityDays,2);assert.equal(m.measurements,1);
 assert.deepEqual(x.writes,[]);
 const markup=x.api.healthMarkup();
 assert.match(markup,/Your records. Your control/);
 assert.match(markup,/Progress photos are NOT in JSON backups/);
 assert.match(markup,/No JSON export requested/);
});
test('A download request timestamp is distinct from a verified backup file and account scoped',()=>{
 const x=boot(sample);
 assert.equal(x.api.lastBackup(),null);
 const at=x.api.markBackupRequested();
 assert.match(at,/^\d{4}-\d{2}-\d{2}T/);
 assert.equal(x.api.lastBackup(),at);
 assert.deepEqual(x.writes,['forge-last-backup-request-v52-myAccount123']);
 assert.match(x.api.healthMarkup(),/download was requested, not that the file was saved successfully/);
 x.window.forgeCurrentAccountUid='differentAccount';
 assert.equal(x.api.lastBackup(),null);
 assert.deepEqual(JSON.parse(x.store.get('nourishHigherDeficitV1')),sample);
});
test('Device status does not automatically claim private cloud sync',()=>{
 const x=boot(sample);x.nodes['cloud-status']={textContent:'✓ Saved to your private Google cloud.'};
 assert.match(x.api.accountStatusHtml(),/Not signed in/);
 x.api.cloudSession({detail:{state:'loading'}});
 assert.match(x.api.accountStatusHtml(),/no cloud save verified/);
 x.api.cloudReady();
 assert.match(x.api.accountStatusHtml(),/Saved to your private Google cloud/);
 x.api.cloudConflict();
 assert.match(x.api.accountStatusHtml(),/Conflict/);
 x.api.cloudError();
 assert.match(x.api.accountStatusHtml(),/Cloud error/);
 assert.match(x.api.accountStatusHtml(),/A local save does not prove cloud sync/);
});
test('Preflight accepts genuine v2 and legacy backups without applying them',()=>{
 const x=boot(sample);
 const backup={app:'nourish',version:2,exportedAt:'2026-10-20T09:21:00Z',state:sample};
 const result=x.api.inspectBackup(backup);
 assert.equal(result.ok,true);
 assert.equal(result.preview.workouts,1);
 assert.equal(result.preview.foodEntries,2);
 assert.equal(x.api.confirmImport(result),false,'Import cannot proceed without explicit confirmation');
 x.setAccepted(true);
 assert.equal(x.api.confirmImport(result),true);
 assert.deepEqual(x.writes,[],'Preview and confirmation must not write user data');
 assert.equal(x.api.inspectBackup({app:'nourish',state:{workouts:{sessions:{}}}}).ok,true);
});
test('Preflight rejects malformed or structurally destructive backups',()=>{
 const x=boot(sample);
 const bad=[
 null,{app:'nourish',version:2,state:null},
 {app:'other',version:2,state:sample},
 {app:'nourish',version:999,state:sample},
 {app:'nourish',version:2,state:{}},
 {app:'nourish',state:{foodDiary:{entries:{bad:true}}}},
 {app:'nourish',state:{workouts:{sessions:[]}}},
 {app:'nourish',state:{healthActivity:{daily:{}}}},
 {app:'nourish',state:{measurements:{}}},
 {app:'nourish',state:{settings:'nonsense'}},
 {app:'nourish',exportedAt:'n/a',state:sample}
 ];
 for(const b of bad)assert.equal(x.api.inspectBackup(b).ok,false,JSON.stringify(b));
 assert.deepEqual(x.writes,[]);
});
test('Import guard runs before custom food registration or any state changes',()=>{
 const segment=html.slice(html.indexOf('async function importBackup('),html.indexOf('const money=',html.indexOf('async function importBackup(')));
 const review=segment.indexOf('safety.inspectBackup(blob)');
 const confirm=segment.indexOf('safety.confirmImport(preflight)');
 const mutate=segment.indexOf('registerMyMeals(x.customFoods,x.customRecipes)');
 assert(review>=0&&confirm>review&&mutate>confirm);
 assert.match(segment,/if\(!safety\)throw new Error/);
 assert.match(segment,/if\(!safety\.confirmImport\(preflight\)\)return/);
 assert.match(html,/forge-data-safety-v52\.js\?v=52/);
 assert.match(html,/forge-data-safety-v52\.css\?v=52/);
});
test('Pre-update checklist must be explicitly checked and no update auto-applies',()=>{
 const x=boot(sample);
 assert.match(source,/data-fd52-check/g);
 assert.match(source,/data-fd52-updates disabled/);
 assert.match(source,/checks\.every\(x=>x\.checked===true\)/);
 assert.doesNotMatch(source,/location\.(?:replace|assign)|window\.forgeUpdater\?\.refresh/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
});
test('Account screen shows distinct device and cloud labels',()=>{
 const account=fs.readFileSync('forge-accounts.js','utf8');
 assert.match(account,/forgeDataSafetyV52\?\.accountStatusHtml/);
 assert.match(source,/A local save does not prove cloud sync/);
 assert.doesNotMatch(source,/indexedDB\.deleteDatabase|localStorage\.clear\(\)/);
});
