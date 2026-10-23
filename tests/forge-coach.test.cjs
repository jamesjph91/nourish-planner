'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('forge-coach.js','utf8');
function boot(){
 const listeners={},window={addEventListener(n,fn){(listeners[n]??=[]).push(fn)}};
 const document={addEventListener(n,fn){(listeners[n]??=[]).push(fn)},querySelector(){return null},getElementById(){return null}};
 const store={getItem(){return null}};const ctx={window,document,localStorage:store,console,Date,Intl,Math,Number,Event:class{}};
 vm.createContext(ctx);vm.runInContext(code,ctx,{filename:'forge-coach.js'});
 return window.ForgeCoach;
}
test('Week report uses recorded days only; never represents missing diary, steps or sleep as zero',()=>{
 const app=boot();
 const s={foodDiary:{entries:[{date:'2026-10-19',totals:{kcal:1800,protein:140}},{date:'2026-10-19',totals:{kcal:300,protein:20}},{date:'2026-10-20',totals:{kcal:1500,protein:100}}]},
 workouts:{sessions:{'2026-10-20':{completed:true,sets:{press:[{done:true,kg:30,reps:12}]}},'2026-10-21':{completed:false,sets:{press:[{done:true,kg:80,reps:3}]}}}},
 healthActivity:{daily:[{date:'2026-10-20',steps:8000,sleepMinutes:420},{date:'2026-10-21',steps:10000}]},measurements:[{date:'2026-10-19',weightKg:78.5},{date:'2026-10-21',weightKg:78}]};
 const r=app.review(s,'2026-10-23');
 assert.equal(r.from,'2026-10-17');assert.equal(r.to,'2026-10-23');
 assert.equal(r.intakeDays,2);assert.equal(r.mealEntries,3);assert.equal(r.avgKcal,1800);assert.equal(r.avgProtein,130);
 assert.equal(r.workouts,1);assert.equal(r.sets,1);assert.equal(r.volume,360);assert.equal(r.avgSteps,9000);
 assert.equal(r.stepsDays,2);assert.equal(r.sleepDays,1);assert.equal(r.avgSleepHours,7);
 assert.equal(r.weightReadings,2);assert.equal(r.weightChange,-0.5);
 assert.match(app.summaryMarkup(r),/Days with entries/);
});
test('No measurements or food logged must show absence instead of fabricated metrics',()=>{
 const app=boot();const r=app.review({},'2026-10-23');
 assert.equal(r.avgKcal,null);assert.equal(r.avgProtein,null);assert.equal(r.avgSteps,null);
 assert.equal(r.avgSleepHours,null);assert.equal(r.weightChange,null);assert.equal(r.workouts,0);
 const html=app.summaryMarkup(r);
 assert.match(html,/—/);assert.match(html,/Missing food/);assert.doesNotMatch(html,/ON TRACK/);
});
test('Training highlights only completed weighted sets and returns heaviest kilograms per exercise',()=>{
 const app=boot(),s={workouts:{sessions:{
 '2026-10-20':{completed:true,sets:{row:[{kg:45,reps:10,done:true},{kg:55,reps:8,done:false}],pushups:[{kg:0,reps:20,done:true}]}},
 '2026-10-21':{completed:true,sets:{row:[{kg:45,reps:12,done:true},{kg:50,reps:6,done:true}],bench:[{kg:60,reps:8,done:true}]}},
 '2026-10-22':{completed:false,sets:{bench:[{kg:100,reps:3,done:true}]}}
 }}};
 const best=app.bests(s);
 const row=best.find(x=>x.id==='row'),bench=best.find(x=>x.id==='bench');
 assert.equal(row.kg,50);assert.equal(row.reps,6);assert.equal(bench.kg,60);
 assert.equal(best.length,2);assert.equal(best.some(x=>x.id==='pushups'),false);
 assert.match(app.trainMarkup(best),/heaviest completed sets/i);
});
test('Backup panel reflects genuine locally stored counts and warns that photos are excluded',()=>{
 const app=boot(),html=app.integrityMarkup({foodDiary:{entries:[{},{}],savedFoods:[{}]},workouts:{sessions:{'2026-10-23':{completed:true}}},measurements:[{}],healthActivity:{daily:[{},{}]}});
 assert.match(html,/FOOD LOGS/);assert.match(html,/Download FORGE backup/);assert.match(html,/not included/);
 assert.match(html,/cloud sync/);
});
test('Quick food amounts adapt to per-portion vs per-gram units',()=>{
 const app=boot();
 assert.match(app.portionMarkup(),/100 g/);
});
test('Coach source does not modify private storage keys or implement unsupported syncing',()=>{
 assert.match(code,/nourishHigherDeficitV1/);
 assert.doesNotMatch(code,/localStorage\.setItem/);
 assert.doesNotMatch(code,/navigator\.healthConnect|Bluetooth\.requestDevice/);
});
