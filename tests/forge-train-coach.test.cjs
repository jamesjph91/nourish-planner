'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','forge-train-coach.js'),'utf8');
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function boot(state){
 const callbacks={};let reads=0,writes=0;
 const doc={getElementById:()=>null,querySelector:()=>null,addEventListener:(name,callback)=>(callbacks[name]??=[]).push(callback)};
 const win={addEventListener:(name,callback)=>(callbacks[name]??=[]).push(callback)};
 const context={document:doc,window:win,localStorage:{getItem(key){assert.equal(key,'nourishHigherDeficitV1');reads++;return JSON.stringify(state)},setItem(){writes++}},Date,Intl,Number,Math,console,clearInterval,setInterval};
 vm.createContext(context);vm.runInContext(code,context,{filename:'forge-train-coach.js'});
 return {api:win.forgeTrainCoach,stats:()=>({reads,writes}),callbacks};
}
test('Train progress reflects actual completed sets for the selected session',()=>{
 const date=today();
 const state={settings:{extraGym:false},workouts:{selected:date,schedule:{[date]:'A'},sessions:{[date]:{id:'A',completed:false,exerciseIds:['goblet','row'],sets:{goblet:[{kg:20,reps:10,done:true},{kg:25,reps:8,done:false}],row:[{kg:30,reps:12,done:true}]}}}}};
 const b=boot(state);
 const data=b.api.snapshot();
 assert.equal(data.selected,date);
 assert.equal(data.scheduled,'A');
 assert.equal(data.total,3);
 assert.equal(data.completed,2);
 assert.equal(data.percent,67);
 assert.equal(data.finished,false);
 assert.equal(b.stats().writes,0,'Read-only visualizer never changes saved workout state');
 const html=b.api.panel(data);
 assert.match(html,/Train<span>/);
 assert.match(html,/2 \/ 3 sets/);
 assert.match(html,/data-fgt-view="Exercises"/);
 assert.match(html,/data-fgt-action="library"/);
});
test('Completed workouts and historical set count remain accurate',()=>{
 const date=today(),past='2026-08-02';
 const b=boot({workouts:{selected:date,schedule:{[date]:'A'},sessions:{[date]:{id:'A',completed:true,exerciseIds:['row'],sets:{row:[{done:true},{done:true}]}},[past]:{completed:true,exerciseIds:['press'],sets:{press:[{done:true},{done:false}]}}}}});
 const data=b.api.snapshot();
 assert.equal(data.completedSessions,2);
 assert.equal(data.logCount,3);
 assert.equal(data.finished,true);
 assert.match(b.api.panel(data),/COMPLETE/);
});
test('Rest day does not offer to add exercises and timer durations are formatted',()=>{
 const date=today(),b=boot({workouts:{selected:date,schedule:{[date]:'rest'},sessions:{}}});
 const data=b.api.snapshot();
 assert.equal(data.scheduled,'rest');
 assert.equal(data.total,0);
 assert.match(b.api.panel(data),/Choose a workout/);
 assert.doesNotMatch(b.api.panel(data),/data-fgt-action="library"/);
 assert.equal(b.api.timerLabel(90),'01:30');
 assert.equal(b.api.timerLabel(180),'03:00');
});

test('Main workout timer offers opt-in auto-rest and manual override',()=>{
 const b=boot({workouts:{sessions:{}}});
 const s=b.api.snapshot();
 assert.match(b.api.panel(s),/data-fgt-autorest/);
 assert.equal(b.api.restState().auto,true);
 assert.equal(b.api.restState().duration,90);
 b.api.changeTimer(120);
 assert.equal(b.api.restState().duration,120);
 b.api.resetTimer();
 assert.equal(b.api.restState().remaining,120);
 assert.equal(b.stats().writes,0);
});
