'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('forge-gym-v54.js','utf8');
const gym=fs.readFileSync('gym.js','utf8');
const inline=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)?.[1];
function ui(){
 const events={},window={addEventListener:(k,v)=>(events[k]??=[]).push(v)};
 const document={readyState:'loading',getElementById:()=>null,
  addEventListener:(k,v)=>(events['doc:'+k]??=[]).push(v)};
 vm.runInNewContext(source,{document,window,console,Number,Math,Promise,Date},{filename:'forge-gym-v54.js'});
 return window.forgeGymV54;
}
test('Progress always counts valid checked active sets, including first unchecked next target',()=>{
 const api=ui();
 const s={iso:'2026-10-24',completed:false,exercises:[
  {id:'bench',name:'Bench press',load:true,unit:'reps',sets:[
   {kg:40,reps:10,done:true},{kg:100,reps:12,done:false},{kg:'',reps:10,done:true}]},
  {id:'plank',name:'Plank',load:false,unit:'sec',sets:[
   {kg:'',reps:30,done:true},{kg:'',reps:'',done:false}]}
 ]};
 const out=api.summary(s);
 assert.equal(out.planned,5);
 assert.equal(out.completed,2);
 assert.equal(out.percent,40);
 assert.equal(out.next.id,'bench');
 assert.equal(out.next.index,1);
 assert.match(api.controls(out),/2 \/ 5 sets/);
 assert.match(api.controls(out),/Jump to next set/);
 assert.doesNotMatch(api.recap(out),/Session complete/);
});
test('Workout recap excludes unchecked/invalid sets and keeps real completed removed-exercise logs',()=>{
 const api=ui();
 const valid={id:'bench',name:'Bench press',load:true,unit:'reps',sets:[
  {kg:30,reps:10,done:true},{kg:999,reps:1,done:false},{kg:40,reps:8,done:true},
  {kg:'',reps:8,done:true}]};
 const removed={id:'old_row',name:'Older row',load:true,unit:'reps',sets:[
  {kg:20,reps:12,done:true},{kg:800,reps:10,done:true}]};
 const out=api.summary({iso:'2026-10-24',completed:true,exercises:[valid],history:[valid,removed]});
 assert.equal(out.allCompleted,3);
 assert.equal(out.recap.length,2);
 assert.equal(out.recap[0].sets,2);
 assert.equal(out.recap[0].bestWeight,40);
 assert.equal(out.recap[0].volume,30*10+40*8);
 assert.equal(out.recap[1].archived,true);
 assert.equal(out.recap[1].sets,1);
 const html=api.recap(out);
 assert.match(html,/Older row/);
 assert.match(html,/removed from current lineup/);
 assert.match(html,/3<\/b>/);
 assert.doesNotMatch(html,/999 kg/);
 assert.doesNotMatch(html,/800 kg/);
});
test('Empty workouts and finished workouts have safe non-invented indicators',()=>{
 const api=ui(),empty=api.summary({iso:'2026-10-24',exercises:[],completed:false});
 assert.equal(empty.planned,0);assert.equal(empty.percent,0);assert.equal(empty.next,null);
 assert.match(api.controls(empty),/Nothing left to jump to/);
 assert.equal(api.recap(empty),'');
 const done=api.summary({completed:true,exercises:[{id:'plank',name:'Plank',load:false,unit:'sec',
 sets:[{kg:'',reps:60,done:true},{kg:'',reps:100,done:false}]}]});
 assert.equal(done.completed,1);
 assert.equal(done.allCompleted,1);
 assert.match(api.recap(done),/60 sec/);
 assert.doesNotMatch(api.recap(done),/100 sec/);
 assert.doesNotMatch(api.recap(done),/ kg best/);
});
function gymBoot(){
 const store=new Map(),elems=new Map();
 const element=id=>{
  if(!elems.has(id))elems.set(id,{innerHTML:'',value:'',textContent:'',style:{},addEventListener(){},classList:{add(){},remove(){},toggle(){}}});
  return elems.get(id);
 };
 const ctx={console,Date,Math,JSON,Object,Array,Number,String,RegExp,Boolean,Promise,
  setTimeout,clearTimeout,Blob,URL,alert:()=>{},confirm:()=>true,
  CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  location:{protocol:'file:',hostname:'localhost'},
  navigator:{},document:{getElementById:element,querySelectorAll:()=>[],
  createElement:tag=>({tag,textContent:'',style:{},append(){},remove(){}}),head:{append(){}},
  body:{append(){}}},addEventListener(){},dispatchEvent(){},scrollTo(){}
 };
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(inline,ctx);vm.runInContext(gym,ctx);
 vm.runInContext('navigate("workouts")',ctx); // Mount the real Train view before testing its rendered controls.
 const date=vm.runInContext('s.workouts.startDate',ctx);
 vm.runInContext('gymSelectDay("'+date+'")',ctx);
 vm.runInContext('gymSetDayPlan("'+date+'","A")',ctx);
 return {ctx,date,store,element};
}
test('Added empty set can be undone without deleting other sets or leaving cloud changes',()=>{
 const x=gymBoot(),{ctx,date}=x;
 const original=vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length',ctx);
 vm.runInContext('gymAddSet("'+date+'","goblet")',ctx);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length',ctx),original+1);
 assert.match(x.element('workouts').innerHTML,/Undo add/);
 assert.equal(vm.runInContext('gymUndoLastSetChange("'+date+'","goblet")',ctx),true);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length',ctx),original);
 assert.equal(vm.runInContext('gymUndoLastSetChange("'+date+'","goblet")',ctx),false);
});
test('Removing completed sets requires confirmation, supports undo, preserves values and completion',()=>{
 const x=gymBoot(),{ctx,date}=x;
 vm.runInContext('gymSetValue("'+date+'","goblet",0,"kg","32.5")',ctx);
 vm.runInContext('gymSetValue("'+date+'","goblet",0,"reps","11")',ctx);
 vm.runInContext('gymTick("'+date+'","goblet",0,true)',ctx);
 const original=vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length',ctx);
 vm.runInContext('gymRemoveSet("'+date+'","goblet",0)',ctx);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length',ctx),original-1);
 assert.match(x.element('workouts').innerHTML,/Undo remove/);
 assert.equal(vm.runInContext('gymUndoLastSetChange("'+date+'","goblet")',ctx),true);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet[0].done',ctx),true);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet[0].kg',ctx),32.5);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet[0].reps',ctx),11);
 const snapshot=vm.runInContext('window.forgeGymV54Snapshot()',ctx);
 assert.equal(snapshot.exercises.find(e=>e.id==='goblet').sets[0].done,true);
});
test('Undo is disallowed after editing the new set, switching day or restoring cloud data',()=>{
 const x=gymBoot(),{ctx,date}=x;
 vm.runInContext('gymAddSet("'+date+'","goblet")',ctx);
 const idx=vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length-1',ctx);
 vm.runInContext('gymSetValue("'+date+'","goblet",'+idx+',"kg","20")',ctx);
 assert.equal(vm.runInContext('gymUndoLastSetChange("'+date+'","goblet")',ctx),false);
 assert.equal(vm.runInContext('s.workouts.sessions["'+date+'"].sets.goblet.length',ctx),idx+1);
 vm.runInContext('gymRemoveSet("'+date+'","goblet",'+idx+')',ctx);
 const backup=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
 vm.runInContext('window.nourishCloudBridge.applyData('+JSON.stringify(backup)+')',ctx);
 assert.equal(vm.runInContext('gymUndoLastSetChange("'+date+'","goblet")',ctx),false);
});
test('Styles and public APIs preserve v47 visuals while improving actual controls',()=>{
 assert.match(gym,/data-gym-exid=/);
 assert.match(gym,/data-gym-set-index=/);
 assert.match(gym,/window\.forgeGymV54Snapshot/);
 assert.match(gym,/window\.gymUndoLastSetChange/);
 const css=fs.readFileSync('forge-gym-v54.css','utf8');
 assert.match(css,/position:sticky/);
 assert.match(css,/gym54-current/);
 assert.match(css,/gym54-next-row/);
 assert.match(css,/gym54-undo/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(source,/localStorage\.setItem|indexedDB\.deleteDatabase/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-gym-v54\.js\?v=54/);
 assert.match(html,/forge-gym-v54\.css\?v=54/);
});
