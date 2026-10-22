'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','forge-dashboard.js'),'utf8');
const iso=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function boot(state,reference=1800){
 const listeners={}; const root={innerHTML:''};
 const document={getElementById:id=>id==='overview'?root:null,querySelector:sel=>sel==='#nav [data-tab="overview"].on'?{}:null,
  addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)};
 const window={addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),nourishFoodTodaySummary:()=>({target:reference})};
 const store={getItem:key=>key==='nourishHigherDeficitV1'?JSON.stringify(state):null};
 const context={document,window,localStorage:store,Date,Intl,Number,Math,console};
 vm.createContext(context); vm.runInContext(code,context,{filename:'forge-dashboard.js'});
 const render=()=>window.forgeTodayRender();
 render();
 return {root,window,render};
}
test('FORGE Today uses dated activity arrays and actual sleep minutes',()=>{
 const date=iso();
 const state={settings:{prot:160,restCal:1800},foodDiary:{entries:[{date,totals:{kcal:640,protein:50,carbs:42,fat:22}}]},healthActivity:{goals:{steps:10500,sleepMinutes:480},daily:[{date,steps:9000,sleepMinutes:420,source:'samsung-export'}]}};
 const b=boot(state,2000);
 const d=b.window.forgeTodayData();
 assert.equal(d.steps,9000);
 assert.equal(d.sleep,420);
 assert.equal(d.stepsGoal,10500);
 assert.equal(d.kcalGoal,2000);
 assert.equal(d.totals.kcal,640);
 assert.equal(d.goals.filter(x=>x.done).length,1);
 assert.match(b.root.innerHTML,/9,000/);
 assert.match(b.root.innerHTML,/10,500/);
 assert.match(b.root.innerHTML,/7h/);
 assert.match(b.root.innerHTML,/Samsung import/);
 assert.match(b.root.innerHTML,/1 of 5 complete/);
});
test('FORGE Today does not invent watch readings or workout completion',()=>{
 const d=boot({foodDiary:{entries:[]},healthActivity:{daily:[]},workouts:{sessions:{}}});
 assert.match(d.root.innerHTML,/READY WHEN YOU ARE/);
 assert.match(d.root.innerHTML,/Not recorded/);
 assert.match(d.root.innerHTML,/0 of 5 complete/);
 assert.doesNotMatch(d.root.innerHTML,/● ON TRACK/);
});
test('FORGE Today only celebrates completed, recorded focus items',()=>{
 const date=iso();
 const state={settings:{prot:120},foodDiary:{entries:[{date,totals:{kcal:500,protein:130}}]},healthActivity:{goals:{steps:8000,sleepMinutes:480},daily:[{date,steps:9000,sleepMinutes:480}]},workouts:{sessions:{[date]:{completed:true}}},measurements:[{date,weightKg:79}]};
 const d=boot(state);
 assert.equal(d.window.forgeTodayData().goals.filter(x=>x.done).length,5);
 assert.match(d.root.innerHTML,/ALL GOALS MET/);
 assert.match(d.root.innerHTML,/5 of 5 complete/);
});
