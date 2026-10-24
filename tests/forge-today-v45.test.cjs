'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('forge-today-v45.js','utf8');
function boot(state={}){
 const events={};
 const document={getElementById:()=>null,querySelector:()=>null,addEventListener:(name,cb)=>(events[name]??=[]).push(cb)};
 const window={addEventListener:(name,cb)=>(events[name]??=[]).push(cb)};
 const localStorage={getItem:key=>key==='nourishHigherDeficitV1'?JSON.stringify(state):null,
  setItem(){throw Error('Today intelligence must remain read only')}};
 vm.runInNewContext(code,{document,window,localStorage,Date,Intl,Math,Number,console},{filename:'forge-today-v45.js'});
 return window.forgeTodayInsights;
}
test('Seven-day overview only averages days with actual food and watch readings',()=>{
 const app=boot(),state={
  settings:{prot:120},healthActivity:{goals:{steps:9000},daily:[
   {date:'2026-10-20',steps:0,sleepMinutes:0},{date:'2026-10-24',steps:11000,sleepMinutes:420}]},
  foodDiary:{entries:[{date:'2026-10-23',totals:{kcal:500,protein:40}},
   {date:'2026-10-24',totals:{kcal:800,protein:70}},{date:'2026-10-24',totals:{kcal:250,protein:60}}]},
  workouts:{sessions:{
   '2026-10-22':{completed:true,sets:{row:[{done:true},{done:true},{done:false}]}},
   '2026-10-24':{completed:false,sets:{bench:[{done:true}]}}
  }},
  measurements:[{date:'2026-10-05',weightKg:85.1},{date:'2026-10-24',weightKg:84.2}]
 };
 const m=app.model(state,'2026-10-24');
 assert.equal(m.week.length,7);
 assert.equal(m.kcal.days,2);
 assert.equal(m.kcal.mean,775);
 assert.equal(m.protein.days,2);
 assert.equal(m.proteinDays,1);
 assert.equal(m.steps.days,2);
 assert.equal(m.steps.mean,5500);
 assert.equal(m.stepDays,1);
 assert.equal(m.workoutDays,1);
 assert.equal(m.setCount,3);
 assert.equal(m.weight,84.2);
 assert.ok(Math.abs(m.weightDelta+0.9)<0.00001);
 assert.match(app.panel(m),/Know your progress/);
 assert.match(app.panel(m),/DATA SOURCE|YOUR DATA/);
});
test('Missing days, zero readings and absent weigh-ins remain distinguishable',()=>{
 const app=boot(),m=app.model({healthActivity:{daily:[{date:'2026-10-24',steps:0}]},foodDiary:{entries:[]}},'2026-10-24');
 assert.equal(m.kcal.days,0);
 assert.equal(m.kcal.mean,null);
 assert.equal(m.steps.days,1);
 assert.equal(m.steps.mean,0);
 assert.equal(m.weight,null);
 assert.equal(m.weightDelta,null);
 const plot=app.graph(m,'steps');
 assert.match(plot,/0 steps/);
 assert.match(plot,/Not recorded/);
 assert.match(plot,/1 recorded day/);
 assert.match(app.panel(m),/Two dated weigh-ins needed|No weigh-in recorded/);
});
test('Only dated, actual workouts and consumed meals enter history',()=>{
 const app=boot();
 const state={foodDiary:{entries:[{date:'2026-10-25',totals:{kcal:2000,protein:180}}]},
  workouts:{sessions:{'2026-10-25':{completed:true},'2026-10-17':{completed:true}}},
  measurements:[{date:'2026-10-26',weightKg:65},{date:'2026-10-24',weightKg:80}]};
 const m=app.model(state,'2026-10-24');
 assert.equal(m.foodDays,0);
 assert.equal(m.workoutDays,0);
 assert.equal(m.weight,80);
 assert.equal(m.weightDelta,null);
});
test('Dashboard layer offers metric tabs and existing navigation, never changes private state',()=>{
 new vm.Script(code);
 const app=boot();
 const html=app.panel(app.model({},'2026-10-24'));
 assert.match(html,/data-fg45-metric="protein"/);
 assert.match(html,/data-fg45-metric="steps"/);
 assert.match(html,/data-fg26-tab="diary"/);
 assert.match(html,/data-fg26-tab="workouts"/);
 assert.match(html,/data-fg26-tab="progress"/);
 assert.match(code,/forge:view-rendered/);
 assert.doesNotMatch(code,/localStorage\.(?:setItem|removeItem|clear)/);
 assert.doesNotMatch(code,/exercise.*energy\s*\+=|steps\s*\/\s*130/);
});
