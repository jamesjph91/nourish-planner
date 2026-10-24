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
// The current date may be a rest day; select the Monday workout before checking exercise controls.
vm.runInContext('gymSelectDay(s.workouts.startDate)',ctx);
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


// Flexible routines: searching, replacing, removing, custom exercises, and cloud persistence.
assert(element('workouts').innerHTML.includes('Add exercise'),'Add exercise control renders');
vm.runInContext('gymLibrary("'+day+'")',ctx);
assert(element('modalinner').innerHTML.includes('Create a custom exercise'),'Exercise picker opens');
vm.runInContext('gymFilter("lateral")',ctx);
assert(element('gym-library-list').innerHTML.includes('Dumbbell lateral raise'),'Search finds movement');
vm.runInContext('gymChoose("lateral")',ctx);
assert(vm.runInContext('s.workouts.sessions["'+day+'"].exerciseIds.includes("lateral")',ctx),'Exercise added');
vm.runInContext('gymMoveExercise("'+day+'","lateral",-1)',ctx);
assert.equal(vm.runInContext('s.workouts.sessions["'+day+'"].exerciseIds.indexOf("lateral")',ctx),4,'Exercises can move up');
vm.runInContext('gymSaveRoutine("'+day+'")',ctx);
assert(vm.runInContext('s.workouts.templates.A.includes("lateral")',ctx),'Routine template saved');
const nextDay=new Date(day+'T12:00:00');
nextDay.setDate(nextDay.getDate()+7);
const nextDate=[nextDay.getFullYear(),String(nextDay.getMonth()+1).padStart(2,'0'),String(nextDay.getDate()).padStart(2,'0')].join('-');
vm.runInContext('gymSelectDay("'+nextDate+'")',ctx);
assert(vm.runInContext('s.workouts.sessions["'+nextDate+'"].exerciseIds.includes("lateral")',ctx),'Future session inherits saved routine');
vm.runInContext('gymLibrary("'+nextDate+'","lateral")',ctx);
vm.runInContext('gymChoose("curlbiceps")',ctx);
assert(vm.runInContext('s.workouts.sessions["'+nextDate+'"].exerciseIds.includes("curlbiceps")',ctx),'Replace exercise works');
vm.runInContext('gymSetValue("'+nextDate+'","curlbiceps",0,"kg","12.5")',ctx);
vm.runInContext('gymSetValue("'+nextDate+'","curlbiceps",0,"reps","10")',ctx);
vm.runInContext('gymTick("'+nextDate+'","curlbiceps",0,true)',ctx);
vm.runInContext('gymRemoveExercise("'+nextDate+'","curlbiceps")',ctx);
assert(vm.runInContext('!s.workouts.sessions["'+nextDate+'"].exerciseIds.includes("curlbiceps")',ctx),'Exercise removed from active day');
assert(vm.runInContext('s.workouts.sessions["'+nextDate+'"].sets.curlbiceps[0].done',ctx),'Removed exercise history retained');
const flexible=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
assert(flexible.workouts.templates.A.includes('lateral'),'Saved template included in cloud state');
assert(flexible.workouts.sessions[nextDate].sets.curlbiceps[0].done,'Past sets remain in cloud state');
vm.runInContext('window.nourishCloudBridge.applyData('+JSON.stringify(flexible)+')',ctx);
const restoredFlexible=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
assert.deepEqual(JSON.parse(JSON.stringify(restoredFlexible.workouts.templates)),JSON.parse(JSON.stringify(flexible.workouts.templates)),'Saved templates round trip');
assert.deepEqual(JSON.parse(JSON.stringify(restoredFlexible.workouts.sessions[nextDate].sets)),JSON.parse(JSON.stringify(flexible.workouts.sessions[nextDate].sets)),'All set history round trips');
console.log('PASS Gym Lab Flex: search, add, reorder, save routine, future reuse, replace, remove, history, cloud');


// Personal exercise definitions can be created and remain private in the saved workout state.
vm.runInContext('gymLibrary("'+nextDate+'")',ctx);
element('gym-own-name').value='Custom machine movement';
element('gym-own-focus').value='Back';
element('gym-own-equip').value='Machine';
element('gym-own-unit').value='reps';
element('gym-own-load').checked=true;
vm.runInContext('gymCreateOwn()',ctx);
const own=vm.runInContext('s.workouts.sessions["'+nextDate+'"].exerciseIds.find(id=>id.startsWith("own_"))',ctx);
assert(own,'Custom exercise added');
const ownSaved=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
assert(ownSaved.workouts.customExercises[own],'Custom exercise definition synced');
vm.runInContext('window.nourishCloudBridge.applyData('+JSON.stringify(ownSaved)+')',ctx);
assert(vm.runInContext('s.workouts.customExercises["'+own+'"].name',ctx)==='Custom machine movement','Custom definition restored');
console.log('PASS User-defined movements: add, cloud save, restore');


// v48: Named reusable lineups, filtered gym picker and previous-set recall.
const last=vm.runInContext('window.forgePreviousSet("'+nextDate+'","goblet")',ctx);
assert.equal(last.kg,20,'Last completed load comes from earlier recorded workout');
assert.equal(last.reps,10);
assert.equal(last.date,day);
assert.equal(vm.runInContext('window.forgePreviousSet("'+day+'","goblet")',ctx),null,'Future logs cannot become previous results');
vm.runInContext('gymLibrary("'+nextDate+'")',ctx);
assert(element('modalinner').innerHTML.includes('Filter by muscle group'),'Picker has muscle filter');
assert(element('modalinner').innerHTML.includes('Filter by equipment'),'Picker has equipment filter');
vm.runInContext('gymFilterFocus("Back")',ctx);
vm.runInContext('gymFilterEquip("Machine")',ctx);
vm.runInContext('gymFilter("")',ctx);
assert(element('gym-library-list').innerHTML.includes('Chest-supported machine row'),'Combined filters find machines for back');
assert(!element('gym-library-list').innerHTML.includes('Dumbbell biceps curl'),'Filter hides unrelated movements');
vm.runInContext('gymFilterEquip("All")',ctx);
vm.runInContext('gymFilterFocus("All")',ctx);
element('gym-routine-name').value='My reusable upper day';
vm.runInContext('gymSavePreset("'+nextDate+'")',ctx);
const storedRoutine=vm.runInContext('Object.keys(s.workouts.savedRoutines)[0]',ctx);
assert(storedRoutine?.startsWith('routine_'),'A named routine is saved under a validated ID');
assert.equal(vm.runInContext('s.workouts.savedRoutines["'+storedRoutine+'"].name',ctx),'My reusable upper day');
const workoutBefore=vm.runInContext('s.workouts.sessions["'+nextDate+'"].sets.curlbiceps[0].done',ctx);
assert(workoutBefore,'Historic removed-set log remains intact');
const third=new Date(day+'T12:00:00');third.setDate(third.getDate()+14);
const thirdDate=[third.getFullYear(),String(third.getMonth()+1).padStart(2,'0'),String(third.getDate()).padStart(2,'0')].join('-');
vm.runInContext('gymSelectDay("'+thirdDate+'")',ctx);
vm.runInContext('gymApplyPreset("'+thirdDate+'","'+storedRoutine+'")',ctx);
const applied=vm.runInContext('s.workouts.sessions["'+thirdDate+'"].exerciseIds',ctx);
assert.deepEqual(JSON.parse(JSON.stringify(applied)),JSON.parse(JSON.stringify(vm.runInContext('s.workouts.savedRoutines["'+storedRoutine+'"].exerciseIds',ctx))), 'Saved lineup applied to a different training day');
assert.equal(vm.runInContext('s.workouts.sessions["'+nextDate+'"].sets.curlbiceps[0].done',ctx),true,'Applying a preset never deletes earlier set records');
const afterCloud=vm.runInContext('window.nourishCloudBridge.getData()',ctx);
assert(afterCloud.workouts.savedRoutines[storedRoutine],'Reusable named routines included in cloud data');
vm.runInContext('window.nourishCloudBridge.applyData('+JSON.stringify(afterCloud)+')',ctx);
assert.equal(vm.runInContext('s.workouts.savedRoutines["'+storedRoutine+'"].name',ctx),'My reusable upper day','Saved routines survive a cloud restore');
vm.runInContext('gymDeletePreset("'+storedRoutine+'")',ctx);
assert.equal(vm.runInContext('Object.keys(s.workouts.savedRoutines).length',ctx),0,'User can delete only the saved lineup');
assert.equal(vm.runInContext('s.workouts.sessions["'+thirdDate+'"].exerciseIds.length',ctx),applied.length,'Deleting a preset does not alter existing workouts');
const malformed={savedRoutines:{'evil':{name:'Bad ID',exerciseIds:['goblet']},'routine_good123':{name:'Valid preset',exerciseIds:['goblet','goblet','!!!']}}};
const validTest=vm.runInContext('validateWorkouts('+JSON.stringify(malformed)+')',ctx);
assert.equal(Object.keys(validTest.savedRoutines).length,1,'Malformed saved routine IDs are rejected on restore');
assert.equal(validTest.savedRoutines.routine_good123.exerciseIds.length,1,'Duplicate and unsafe exercise IDs are filtered');
console.log('PASS FORGE v48: named splits, exercise filters, previous performance, sync, safe validation and history retention');
