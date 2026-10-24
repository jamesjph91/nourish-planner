'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('forge-strength-v50.js','utf8');

function boot(data={}){
 const events={};
 const document={getElementById:()=>null,querySelector:()=>null,addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
 const window={addEventListener:(name,fn)=>(events[name]??=[]).push(fn),forgeGymDefinition:id=>({name:id,load:true,unit:'reps',min:8,max:12})};
 const localStorage={getItem:()=>JSON.stringify(data),setItem(){throw Error('V50 may not modify user records')}};
 vm.runInNewContext(code,{document,window,localStorage,Date,Intl,Number,Math,console});
 return window.forgeStrengthV50;
}
const workout={
 workouts:{selected:'2026-10-24',sessions:{
 '2026-10-02':{exerciseIds:['bench'],sets:{bench:[{kg:40,reps:8,done:true},{kg:100,reps:2,done:false}]}},
 '2026-10-10':{exerciseIds:['bench'],sets:{bench:[{kg:45,reps:8,done:true},{kg:45,reps:8,done:false}]}},
 '2026-10-24':{exerciseIds:['bench'],sets:{bench:[{kg:47.5,reps:9,done:true},{kg:100,reps:12,done:false}]}},
 '2026-10-25':{exerciseIds:['bench'],sets:{bench:[{kg:180,reps:10,done:true}]}}
 }}};
test('Personal-best charts only include checked sets on or before selected workout date',()=>{
 const app=boot(workout);
 const m=app.analyse(workout,'2026-10-24','bench',{name:'Bench press',load:true,unit:'reps',min:8,max:12});
 assert.equal(m.sessions,3);
 assert.equal(m.peak,47.5);
 assert.equal(m.previousBest,45);
 assert.equal(m.newBest,true);
 assert.equal(m.latest.example.kg,47.5);
 assert.equal(m.latest.example.reps,9);
 assert.match(m.suggestion,/47.5 kg for 10 controlled reps/);
 assert.match(app.trend(m),/<svg/);
 assert.doesNotMatch(app.trend(m),/2026-10-25/);
 assert.match(app.markup(m),/New personal best/);
});
test('First session does not create a falsely compared personal-best badge',()=>{
 const app=boot();
 const s={workouts:{sessions:{'2026-10-24':{sets:{bench:[{kg:20,reps:8,done:true}]}}}}};
 const m=app.analyse(s,'2026-10-24','bench',{name:'Bench',load:true,unit:'reps',min:8,max:12});
 assert.equal(m.sessions,1);
 assert.equal(m.previousBest,null);
 assert.equal(m.newBest,false);
 assert.match(app.markup(m),/First recorded session/);
});
test('Range-top suggestion requires repeat evidence and at least two completed sets',()=>{
 const app=boot();
 const s={workouts:{sessions:{
 '2026-10-01':{sets:{bench:[{kg:25,reps:12,done:true},{kg:25,reps:12,done:true}]}},
 '2026-10-24':{sets:{bench:[{kg:25,reps:12,done:true},{kg:25,reps:12,done:true}]}}
 }}};
 const m=app.analyse(s,'2026-10-24','bench',{name:'Bench',load:true,unit:'reps',min:8,max:12});
 assert.equal(m.peak,25);
 assert.equal(m.newBest,false);
 assert.match(m.suggestion,/small load increase/);
 assert.match(m.suggestion,/1–2.5 kg/);
});
test('Bodyweight and timed exercises use repetitions or duration, not invented kilogram records',()=>{
 const app=boot();
 const s={workouts:{sessions:{
 '2026-10-04':{sets:{plank:[{reps:30,kg:'',done:true}]}},
 '2026-10-24':{sets:{plank:[{reps:45,kg:'',done:true}]}}
 }}};
 const m=app.analyse(s,'2026-10-24','plank',{name:'Plank',load:false,unit:'sec',min:20,max:60});
 assert.equal(m.peak,45);
 assert.equal(m.newBest,true);
 assert.match(m.suggestion,/50 sec/);
 assert.doesNotMatch(app.markup(m),/45 kg/);
});
test('Missing and unchecked entries remain missing and cannot produce a workout forecast',()=>{
 const app=boot();
 const s={workouts:{sessions:{
 '2026-10-21':{sets:{bench:[{reps:12,kg:60,done:false},{reps:'',kg:50,done:true}]}},
 '2026-10-24':{sets:{bench:[]}}
 }}};
 const m=app.analyse(s,'2026-10-24','bench',{name:'Bench',load:true,unit:'reps',min:8,max:12});
 assert.equal(m.sessions,0);
 assert.equal(m.peak,null);
 assert.equal(m.newBest,false);
 assert.match(m.suggestion,/Log a completed set/);
 assert.match(app.trend(m),/No eligible completed sets/);
});
test('Progression integration remains read only and retains the original five-tab navigation',()=>{
 new vm.Script(code,{filename:'forge-strength-v50.js'});
 assert.match(code,/forge:view-rendered/);
 assert.match(code,/data-tab="workouts"/);
 assert.match(code,/fs50-exercise/);
 assert.doesNotMatch(code,/localStorage\.(?:setItem|removeItem|clear)|indexedDB\.deleteDatabase/);
 const gym=fs.readFileSync('gym.js','utf8');
 assert.match(gym,/window\.forgeGymDefinition/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-strength-v50\.js\?v=50/);
 assert.match(html,/forge-strength-v50\.css\?v=50/);
});
