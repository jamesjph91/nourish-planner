'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('forge-activity-explorer.js','utf8');
function boot(){
 const events={};
 const document={readyState:'loading',body:{dataset:{forgeTab:'overview'}},getElementById:()=>null,
  addEventListener:(type,fn)=>{(events[type]??=[]).push(fn)}};
 const window={addEventListener:(type,fn)=>{(events[type]??=[]).push(fn)}};
 const localStorage={getItem:()=>null};
 vm.runInNewContext(src,{document,window,localStorage,Date,Intl,Number,Math,console},{filename:'forge-activity-explorer.js'});
 return window.forgeActivityExplorer;
}
test('Activity Explorer offers real working sections and read-only model',()=>{
 const app=boot();
 for(const view of ['steps','cardio','sleep','all'])assert.equal(app.setView(view),true);
 assert.equal(app.setView('made-up'),false);
 assert.doesNotMatch(src,/localStorage\.(setItem|removeItem|clear)/);
 assert.match(src,/forge:view-rendered/);
});
test('Missing watch measurements stay missing; no invented distance or active time',()=>{
 const app=boot();
 const m=app.model({healthActivity:{daily:[]}},'2026-10-24');
 assert.equal(m.steps,null);
 assert.equal(m.activeKcal,null);
 assert.equal(m.sleepMinutes,null);
 assert.equal(m.stepsWeek.recorded,0);
 assert.equal(m.week.length,7);
 assert.match(app.html(m),/—/);
 assert.doesNotMatch(src,/\.00076|steps\s*\/\s*130|activeMinutes|distanceKm/);
});
test('Zero recorded steps count as a measurement, unlike missing days',()=>{
 const app=boot();
 const m=app.model({healthActivity:{goals:{steps:9000,sleepMinutes:480},daily:[
  {date:'2026-10-23',steps:0,activeKcal:123,source:'manual'},
  {date:'2026-10-24',steps:10210,sleepMinutes:450,activeKcal:331,restingBpm:61,source:'samsung-export'}
 ]}},'2026-10-24');
 assert.equal(m.steps,10210);
 assert.equal(m.stepsGoal,9000);
 assert.equal(m.stepsWeek.recorded,2);
 assert.equal(m.stepsWeek.average,5105);
 assert.equal(m.cardioWeek.total,454);
 assert.equal(m.sleepWeek.recorded,1);
 assert.equal(m.restingBpm,61);
 assert.equal(m.source,'Samsung export');
 app.setView('cardio');
 assert.match(app.html(m),/454 kcal/);
 app.setView('sleep');
 assert.match(app.html(m),/7.5 h/);
 app.setView('all');
 assert.match(app.html(m),/RESTING HEART RATE/);
});
test('Activity buttons open native reading form and existing importer',()=>{
 assert.match(src,/hub-date/);
 assert.match(src,/hub-goal-steps/);
 assert.match(src,/hub-file/);
 assert.match(src,/data-fa42-action="record"/);
 assert.match(src,/data-fa42-action="import"/);
});
