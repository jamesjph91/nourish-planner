const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
const gym=fs.readFileSync('gym.js','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/);
assert(inline,'Inline Nourish logic exists');
new vm.Script(inline[1],{filename:'nourish-inline.js'});
new vm.Script(gym,{filename:'gym.js'});
const nodes=new Map(),listeners=[],styles=[];
const element=id=>{
  if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){},toggle(){}},addEventListener(){},style:{}});
  return nodes.get(id);
};
const store=new Map();
const ctx={
 console,Date,Math,JSON,Object,Array,Number,String,RegExp,Boolean,Promise,
 setTimeout,clearTimeout,Blob,URL,alert:()=>{},confirm:()=>true,
 CustomEvent:class{constructor(type){this.type=type}},
 localStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null},
 location:{protocol:'file:',hostname:'localhost'},
 navigator:{},
 document:{getElementById:element,querySelectorAll:()=>[],createElement:tag=>({tag,textContent:'',style:{},append(){},remove(){}}),head:{append:e=>styles.push(e)},body:{append(){}}},
 addEventListener:(name,cb)=>listeners.push([name,cb]),dispatchEvent:()=>{},scrollTo:()=>{}
};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(inline[1],ctx,{filename:'nourish-inline.js'});
vm.runInContext(gym,ctx,{filename:'gym.js'});
assert(html.includes('data-tab="workouts"'),'Gym nav button');
assert(html.includes('src="./gym.js"'),'Gym script');
vm.runInContext('navigate("workouts")',ctx);
assert(element('workouts').innerHTML.includes('Workout planner'));
assert(element('workouts').innerHTML.includes('Your training week'));
assert(element('workouts').innerHTML.includes('How to do it'));
assert(styles.some(x=>x.textContent.includes('gym-calendar')),'Responsive gym CSS');
const day=vm.runInContext('s.workouts.startDate',ctx);
assert.equal(typeof day,'string');
vm.runInContext('gymSetDayPlan("'+day+'","rest")',ctx);
assert.equal(vm.runInContext('s.gym[1]',ctx),false,'Rest updates meal-day flag');
vm.runInContext('gymSetDayPlan("'+day+'","A")',ctx);
assert.equal(vm.runInContext('s.gym[1]',ctx),true,'Workout updates meal-day flag');
assert.equal(vm.runInContext('s.shopDirty',ctx),true,'Shopping review flag follows training changes');
vm.runInContext('gymSelectDay("'+day+'")',ctx);
vm.runInContext('gymSetValue("'+day+'","goblet",0,"kg","20")',ctx);
vm.runInContext('gymSetValue("'+day+'","goblet",0,"reps","10")',ctx);
vm.runInContext('gymTick("'+day+'","goblet",0,true)',ctx);
vm.runInContext('gymComplete("'+day+'",true)',ctx);
const data=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
assert(data.workouts.sessions[day].completed,'Workout completion in cloud payload');
assert.equal(data.workouts.sessions[day].sets.goblet[0].kg,20);
assert.equal(data.workouts.sessions[day].sets.goblet[0].reps,10);
assert(data.workouts.sessions[day].sets.goblet[0].done);
assert(vm.runInContext('window.nourishCloudBridge.isLocalCustom()',ctx),'Custom workout counts as data');
assert(store.has('nourishHigherDeficitV1'),'Local browser save updated');
vm.runInContext('window.nourishCloudBridge.applyData('+JSON.stringify(data)+')',ctx);
const restored=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
assert.deepEqual(JSON.parse(JSON.stringify(restored.workouts)),JSON.parse(JSON.stringify(data.workouts)),'Cloud round-trip preserves workout');
assert.equal(vm.runInContext('days()[0].gym',ctx),true,'Meal plan still computes after workout sync');
console.log('PASS Gym Lab: workout navigation, daily planning, logging, cloud persistence, restoration, mobile CSS, nutrition linkage');
