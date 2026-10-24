'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('forge-strength-v55.js','utf8');
const loaded={
 workouts:{selected:'2026-10-24',sessions:{
  '2026-10-01':{sets:{bench:[{kg:30,reps:8,done:true},{kg:30,reps:10,done:true},
   {kg:180,reps:2,done:false}]}},
  '2026-10-08':{sets:{bench:[{kg:35,reps:8,done:true},{kg:35,reps:12,done:true}]}},
  '2026-10-24':{sets:{bench:[{kg:40,reps:9,done:true},{kg:40,reps:11,done:true},
   {kg:600,reps:1000,done:false},{kg:'',reps:6,done:true}]}},
  '2026-10-25':{sets:{bench:[{kg:190,reps:5,done:true}]}}
 }}
};
function boot(saved=loaded){
 const events={};
 const doc={readyState:'loading',getElementById:()=>null,querySelector:()=>null,
  addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
 const win={addEventListener:(name,fn)=>(events[name]??=[]).push(fn),
  forgeGymDefinition:id=>({name:id,load:true,unit:'reps',min:8,max:12})};
 const storage={getItem:()=>JSON.stringify(saved),setItem(){throw Error('Read-only analytics must not save data')}};
 vm.runInNewContext(code,{window:win,document:doc,localStorage:storage,Number,Math,JSON,
  Date,Intl,Promise,Blob,URL,console},{filename:'forge-strength-v55.js'});
 return win.forgeStrengthV55;
}
const def={name:'Bench press',load:true,unit:'reps',min:8,max:12};
test('Only valid checked sets at/before selected day count for training volume',()=>{
 const a=boot().analyse(loaded,'bench','2026-10-24',def);
 assert.equal(a.records.length,3);
 assert.equal(a.records[0].volume,30*8+30*10);
 assert.equal(a.records[1].volume,35*8+35*12);
 assert.equal(a.records[2].volume,40*9+40*11);
 assert.equal(a.volumeBest,40*9+40*11);
 assert.equal(a.records[2].sets,2);
 assert(!a.records.some(x=>x.date==='2026-10-25'));
 assert(!String(boot().chart(a,'volume')).includes('2026-10-25'));
});
test('Working-weight records do not become repetition records automatically',()=>{
 const api=boot(),a=api.analyse(loaded,'bench','2026-10-24',def);
 assert.equal(a.weightBest,40);
 assert.equal(a.repsBest,12);
 assert.equal(a.weightPR,true);
 assert.equal(a.repPR,false);
 assert.match(api.markup(a,'volume'),/BEST WORKING WEIGHT/);
 assert.match(api.markup(a,'volume'),/BEST REPS/);
 assert.match(api.markup(a,'volume'),/BEST LOAD VOLUME/);
 assert.match(api.markup(a,'reps'),/aria-pressed="true"/);
});
test('Bodyweight repetitions have their own trend without bogus kilograms or volume',()=>{
 const api=boot(),s={workouts:{sessions:{
  '2026-10-01':{sets:{pushups:[{kg:'',reps:12,done:true}]}},
  '2026-10-24':{sets:{pushups:[{kg:'',reps:16,done:true},{reps:50,done:false}]}}
 }}};
 const a=api.analyse(s,'pushups','2026-10-24',{name:'Press ups',load:false,unit:'reps',max:20});
 assert.equal(a.weightBest,null);assert.equal(a.volumeBest,null);assert.equal(a.repsBest,16);
 assert.match(api.chart(a,'reps'),/Most completed reps/);
 assert.doesNotMatch(api.markup(a,'volume'),/data-fs55-metric="volume"/);
 assert.match(api.markup(a,'volume'),/Not applicable/);
});
test('Timed work is never presented as a kg x reps volume comparison',()=>{
 const api=boot(),s={workouts:{sessions:{
 '2026-10-01':{sets:{plank:[{reps:30,kg:'',done:true}]}},
 '2026-10-24':{sets:{plank:[{reps:45,kg:'',done:true}]}}
 }}};
 const a=api.analyse(s,'plank','2026-10-24',{name:'Plank',load:false,unit:'sec',max:60});
 assert.equal(a.repsBest,45);assert.equal(a.volumeBest,null);
 assert.match(api.chart(a,'reps'),/Longest completed duration \(seconds\)/);
 assert.doesNotMatch(api.markup(a,'reps'),/data-fs55-metric="weight"/);
 assert.match(api.guidance(a,{max:60}),/Only 2 completed sessions/);
});
test('Low-sample and stale training history restricts progression advice',()=>{
 const api=boot(),a=api.analyse(loaded,'bench','2026-10-24',def);
 assert.match(api.guidance(a,def),/Repeat 40 kg/);
 const short=api.analyse({workouts:{sessions:{'2026-10-24':{sets:{bench:[{kg:40,reps:12,done:true}]}}}}},'bench','2026-10-24',def);
 assert.match(api.guidance(short,def),/gather at least three comparable sessions/);
 const stale=api.analyse(loaded,'bench','2026-12-24',def);
 assert.match(api.guidance(stale,def),/more than 28 days/);
});
test('Load increase requires three sessions and two comparable high-rep recent days',()=>{
 const api=boot(),s={workouts:{sessions:{
  '2026-10-01':{sets:{bench:[{kg:40,reps:10,done:true},{kg:40,reps:10,done:true}]}},
  '2026-10-08':{sets:{bench:[{kg:40,reps:12,done:true},{kg:40,reps:12,done:true}]}},
  '2026-10-15':{sets:{bench:[{kg:40,reps:12,done:true},{kg:40,reps:12,done:true}]}}
 }}};
 const a=api.analyse(s,'bench','2026-10-15',def);
 assert.match(api.guidance(a,def),/consider a small increase/);
 assert.match(api.guidance(a,def),/1–2.5 kg/);
});
test('CSV exports recorded session aggregates, blanks for unknowns and neutralizes formulas',()=>{
 const api=boot(),a=api.analyse(loaded,'bench','2026-10-24',def);
 const csv=api.csv(a);
 assert.match(csv,/Date.*Exercise ID.*Completed sets/);
 assert.match(csv,/2026-10-24/);
 assert.match(csv,/800/);
 assert.doesNotMatch(csv,/2026-10-25/);
 const evil=api.analyse({workouts:{sessions:{'2026-10-20':{sets:{foo:[{kg:'',reps:12,done:true}]}}}}},
 'foo','2026-10-24',{name:'=HYPERLINK("bad")',load:false,unit:'reps'});
 const sec=api.csv(evil);
 assert.match(sec,/'=HYPERLINK/);
 assert.match(sec,/""bad""/);
 assert.match(sec,/,"",/);
});
test('Module is read-only and wired to Train; retains premium styling and manual exports',()=>{
 new vm.Script(code);
 assert.doesNotMatch(code,/localStorage\.(?:setItem|removeItem|clear)|indexedDB\.deleteDatabase/);
 assert.match(code,/fs50-exercise/);
 assert.match(code,/forge:view-rendered/);
 assert.match(code,/data-fs55-export/);
 assert.match(code,/URL\.revokeObjectURL/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-strength-v55\.js\?v=55/);
 assert.match(html,/forge-strength-v55\.css\?v=55/);
 const css=fs.readFileSync('forge-strength-v55.css','utf8');
 assert.match(css,/fs55-stats/);
 assert.match(css,/focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
});
