/* node --test tests/health-hub.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline);
 const nodes={},store=new Map(),alerts=[],events=[];
 const element=id=>nodes[id]||(nodes[id]={id,innerHTML:'',textContent:'',value:'',checked:false,hidden:false,style:{},
  classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},focus(){},scrollIntoView(){},setAttribute(){},append(){}});
 const document={getElementById:element,querySelectorAll:()=>[],createElement:()=>({style:{},append(){}}),head:{append(){}},body:{append(){}}};
 const context={document,window:{dispatchEvent:x=>events.push(x),addEventListener(){},scrollTo(){}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  alert:x=>alerts.push(x),confirm:()=>true,CustomEvent:class{},
  navigator:{},location:{protocol:'file:',hostname:'localhost'},setTimeout,clearTimeout,console,
  fetch:()=>Promise.reject(Error('No network mock needed'))};
 context.globalThis=context;
 vm.createContext(context);
 vm.runInContext(inline,context,{filename:'index.html'});
 for(const file of ['gym.js','food-diary.js','progress.js','health-hub.js'])
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 const evaluate=code=>vm.runInContext(code,context);
 return {context,element,store,alerts,evaluate,data:()=>context.window.nourishCloudBridge.getData()};
}
test('Combined Health Hub loads alongside existing food, gym and progress pages',()=>{
 const b=boot();
 b.evaluate("navigate('overview')");
 assert.match(b.element('overview').innerHTML,/Your daily health overview/);
 assert.match(b.element('overview').innerHTML,/CALORIES LOGGED/);
 assert.match(b.element('overview').innerHTML,/Strength progression/);
 b.evaluate("navigate('health')");
 assert.match(b.element('health').innerHTML,/Watch activity & goals/);
 assert.match(b.element('health').innerHTML,/Import Samsung/);
 b.evaluate("navigate('workouts')");
 assert.match(b.element('workouts').innerHTML,/Workout planner & strength tracker/);
 b.evaluate("navigate('diary')");
 assert.match(b.element('diary').innerHTML,/FOOD DIARY/);
 b.evaluate("navigate('progress')");
 assert.match(b.element('progress').innerHTML,/Measurements & gym progress/);
});
test('Health activity input validates, aggregates and syncs to private cloud',()=>{
 const b=boot();b.evaluate("navigate('health')");
 const date=b.evaluate("new Date().toLocaleDateString('en-CA')"); // override with explicit safe ISO
 b.element('hub-date').value='2026-10-22';
 b.element('hub-steps').value='10452';
 b.element('hub-activeKcal').value='385';
 b.element('hub-sleepMinutes').value='420';
 b.element('hub-restingBpm').value='58';
 b.context.window.hubSaveReading();
 let state=b.data();
 assert.equal(state.healthActivity.daily.length,1);
 assert.equal(state.healthActivity.daily[0].steps,10452);
 assert.equal(state.healthActivity.daily[0].activeKcal,385);
 assert.equal(state.healthActivity.daily[0].sleepMinutes,420);
 assert.equal(state.healthActivity.daily[0].restingBpm,58);
 assert.equal(b.context.window.nourishCloudBridge.isLocalCustom(),true);
 assert.equal(b.context.window.nourishCloudBridge.applyData(state),true);
 assert.equal(b.data().healthActivity.daily[0].steps,10452);
});
test('CSV import accepts daily aggregates and repeated imports are idempotent',async()=>{
 const b=boot();b.evaluate("navigate('health')");
 const csv='date,steps,active_kcal,sleep_minutes,resting_bpm\r\n2026-10-20,8521,340,420,59\r\n2026-10-21,10001,411,456,57';
 const file={name:'watch.csv',size:csv.length,text:async()=>csv};
 await b.context.window.hubImportFile(file);
 assert.equal(b.data().healthActivity.daily.length,2);
 assert.equal(b.data().healthActivity.daily[1].steps,10001);
 await b.context.window.hubImportFile(file);
 assert.equal(b.data().healthActivity.daily.length,2);
 assert.match(b.element('health').innerHTML,/Imported 2 daily records/);
});
test('Health Connect companion JSON schema is accepted as imported data, not live sync',async()=>{
 const b=boot();b.evaluate("navigate('health')");
 const json=JSON.stringify({app:'nourish-health-connect-bridge',version:1,daily:[
  {date:'2026-10-21',steps:12800,activeKcal:610,sleepMinutes:433,source:'health-connect'},
  {date:'2026-10-22',steps:14009,source:'health-connect'}
 ]});
 await b.context.window.hubImportFile({size:json.length,name:'nourish-health-connect.json',text:async()=>json});
 assert.equal(b.data().healthActivity.daily.length,2);
 assert.equal(b.data().healthActivity.daily[0].source,'health-connect');
 assert.equal(b.data().healthActivity.daily[1].steps,14009);
 assert.match(b.element('health').innerHTML,/Health Connect import/);
});
test('Bad imports never overwrite saved entries',async()=>{
 const b=boot();b.evaluate("navigate('health')");
 b.context.window.nourishCloudBridge.applyData({
  ...b.data(),healthActivity:{daily:[{date:'2026-10-22',steps:11000,source:'manual'}]}
 });
 const csv='date,steps\nnot-a-date,9999999\n';
 await b.context.window.hubImportFile({size:csv.length,name:'bad.csv',text:async()=>csv});
 assert.equal(b.data().healthActivity.daily.length,1);
 assert.equal(b.data().healthActivity.daily[0].steps,11000);
 assert.match(b.element('health').innerHTML,/Import failed/);
});
test('Untrusted activity data is bounded; unknown metrics and future invalid values ignored',()=>{
 const b=boot();
 const result=b.evaluate('validateHealthActivity('+JSON.stringify({goals:{steps:900000,sleepMinutes:480},daily:[
  {date:'2026-10-21',steps:-40,activeKcal:999999,restingBpm:'not a number'},
  {date:'2026-10-22',steps:8000,extra:"secret",source:'manual'}
 ]})+')');
 assert.equal(result.daily.length,1);
 assert.equal(result.daily[0].steps,8000);
 assert.equal(result.goals.steps,8000);
 assert.equal(result.goals.sleepMinutes,480);
 assert.equal(result.daily[0].extra,undefined);
});
test('Nutrition counts actual logged food only and watch kcal do not increase dietary target',()=>{
 const b=boot();
 const date=b.evaluate("(() => {const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})()");
 const state=b.data();
 state.healthActivity={daily:[{date,steps:9000,activeKcal:900,source:'manual'}]};
 b.context.window.nourishCloudBridge.applyData(state);
 b.evaluate("navigate('overview')");
 const page=b.element('overview').innerHTML;
 assert.match(page,/Not logged/);
 assert.match(page,/Activity energy: 900 kcal/);
 assert.match(page,/do not automatically add watch calories to your food allowance/);
 const summary=b.context.window.nourishHealthAPI.summary();
 assert.equal(summary.nutrition.count,0);
});
test('Activity never leaks across account reset and pending file import is discarded',async()=>{
 const b=boot();
 b.evaluate("navigate('health')");
 let release;
 const file={name:'watch.csv',size:90,text:()=>new Promise(resolve=>{release=resolve})};
 const task=b.context.window.hubImportFile(file);
 b.context.window.nourishCloudBridge.resetPrivatePlan();
 release('date,steps\n2026-10-22,13500');
 await task;
 assert.equal(b.data().healthActivity.daily.length,0);
 assert.equal(b.data().healthActivity.goals.steps,8000);
 assert.match(b.element('overview').innerHTML,/Your daily health overview/);
});
