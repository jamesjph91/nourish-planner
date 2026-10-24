'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const insightSource=fs.readFileSync('forge-strength-insights.js','utf8');
const coachSource=fs.readFileSync('forge-train-coach.js','utf8');
function bootInsight(state){
 const events={};
 const window={addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
 const document={addEventListener:(name,fn)=>(events[name]??=[]).push(fn),getElementById:()=>null,querySelector:()=>null};
 const localStorage={getItem:()=>JSON.stringify(state),setItem(){throw Error('Insights must not change private training data')}};
 vm.runInNewContext(insightSource,{document,window,localStorage,Date,Intl,Math,Number,console});
 return window.forgeStrengthInsights;
}
test('Load-best insights count completed sets and compare earlier days only',()=>{
 const date='2026-10-24';
 const state={workouts:{selected:date,sessions:{
  '2026-10-01':{completed:true,sets:{bench:[{done:true,kg:45,reps:8},{done:false,kg:75,reps:1}],row:[{done:true,kg:55,reps:9}]}},
  '2026-10-25':{completed:true,sets:{bench:[{done:true,kg:150,reps:4}]}},
  [date]:{exerciseIds:['bench','row'],sets:{bench:[{done:true,kg:47.5,reps:7},{done:false,kg:60,reps:5}],row:[{done:true,kg:55,reps:10}]}}
 }}};
 const app=bootInsight(state),m=app.model();
 assert.equal(m.completed,2);
 assert.equal(m.exercised,2);
 assert.equal(m.loadBests,1);
 assert.equal(m.rows[0].priorLoad,45);
 assert.equal(m.rows[0].currentLoad,47.5);
 assert.equal(m.rows[0].isLoadBest,true);
 assert.equal(m.rows[1].isLoadBest,false);
 assert.match(app.exerciseNote(m.rows[0]),/New load best/);
 assert.match(app.summary(m),/1/);
});
test('First logged weights and unweighted sets are not inflated into personal records',()=>{
 const app=bootInsight({workouts:{selected:'2026-10-24',sessions:{'2026-10-24':{
  exerciseIds:['custom','plank'],sets:{custom:[{done:true,kg:20,reps:10}],plank:[{done:true,kg:'',reps:30}]}
 }}}});
 const m=app.model();
 assert.equal(m.loadBests,0);
 assert.equal(m.rows[0].firstWeightedLog,true);
 assert.equal(m.rows[1].done,1); // bodyweight sets count as completed
 assert.doesNotMatch(app.summary(m),/New load best ·/);
});
test('Invalid and unchecked records never trigger load best',()=>{
 const app=bootInsight({workouts:{selected:'2026-10-24',sessions:{
  '2026-10-20':{sets:{bench:[{kg:35,reps:7,done:true}]}},
  '2026-10-24':{exerciseIds:['bench'],sets:{bench:[{kg:120,reps:8,done:false},{kg:'',reps:10,done:true}]}}
 }}});
 const m=app.model();assert.equal(m.loadBests,0);assert.equal(m.completed,1); // A checked bodyweight/time set is completed even without a load.
});
test('Coach exposes automatic rest toggle and visible rest control for the main workout',()=>{
 new vm.Script(coachSource,{filename:'forge-train-coach.js'});
 assert.match(coachSource,/startTimer\(true\)/);
 assert.match(coachSource,/data-fgt-autorest/);
 assert.match(coachSource,/active!=='History'&&!rest/);
 assert.match(coachSource,/s\.selected===s\.today/);
 assert.match(coachSource,/restState/);
 assert.doesNotMatch(insightSource,/localStorage\.setItem/);
});
