'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('forge-train-v62.js','utf8');
function boot({snapshot=null,historical=null}={}){
 const listeners={},windowEvents={},store=new Map(),presets=[];
 let account={status:'ready',verifiedUid:'personA'},running=false;
 let current=snapshot||{iso:'2026-10-26',id:'A',completed:false,exercises:[
  {id:'bench',name:'Bench press',load:true,unit:'reps',sets:[{kg:40,reps:8,done:true},{kg:'',reps:'',done:false}]},
  {id:'plank',name:'Plank',load:false,unit:'sec',sets:[{kg:'',reps:'',done:false}]}
 ]};
 let history=historical||{workouts:{sessions:{'2026-10-20':{sets:{bench:[{kg:35,reps:9,done:true}]}}}}};
 const root={classList:{contains:()=>false},querySelector:()=>null,querySelectorAll:()=>[]};
 const document={readyState:'loading',getElementById:id=>id==='workouts'?root:null,
  addEventListener:(type,fn)=>(listeners[type]??=[]).push(fn)};
 const window={forgeGymV54Snapshot:()=>current,
  forgeAccounts:{getState:()=>account},nourishCloudBridge:{getData:()=>history},
  forgeRestV61:{getState:()=>({running}),setPreset:n=>{presets.push(n);return true}},
  addEventListener:(type,fn)=>(windowEvents[type]??=[]).push(fn)};
 const localStorage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
 vm.runInNewContext(source,{window,document,localStorage,Date,Math,Number,String,JSON,Object,
  confirm:()=>true,console},{filename:'forge-train-v62.js'});
 return {api:window.forgeTrainV62,account,setAccount:v=>account=v,
  getSession:()=>current,setSession:v=>current=v,setRunning:v=>running=v,
  getHistory:()=>history,setHistory:v=>history=v,presets,store,windowEvents,listeners};
}
test('Next-set context is factual: it uses checked valid sets and never unread pending numbers',()=>{
 const x=boot(),data=x.getSession(),before=JSON.stringify(data);
 const c=x.api.context(data);
 assert.equal(c.title,'Next: Bench press · set 2');
 assert.equal(c.detail,'Earlier this session: 40 kg × 8 reps');
 assert.equal(x.api.nextSet(data).index,1);
 assert.equal(JSON.stringify(data),before);
 data.exercises[0].sets[0].done=false;
 data.exercises[0].sets[0].kg=999;
 assert.equal(x.api.context(data).detail,'Last completed 2026-10-20: 35 kg × 9 reps');
 assert.equal(x.api.context(data).title,'Next: Bench press · set 1');
});
test('History excludes unchecked, invalid, future and other exercise entries',()=>{
 const x=boot({historical:{workouts:{sessions:{
  '2026-10-30':{sets:{bench:[{kg:500,reps:10,done:true}]}},
  '2026-10-23':{sets:{bench:[{kg:60,reps:10,done:false},{kg:900,reps:12,done:true}]}},
  '2026-10-21':{sets:{plank:[{reps:45,done:true}],bench:[{kg:32.5,reps:7,done:true}]}},
 }}}});
 const s=x.getSession();s.exercises[0].sets[0].done=false;
 assert.match(x.api.context(s).detail,/32\.5 kg × 7 reps/);
 x.setHistory({workouts:{sessions:{}}});
 assert.equal(x.api.context(s).detail,'No earlier completed effort available for this exercise.');
 s.exercises[0].sets=[{kg:50,reps:8,done:true}];
 s.exercises[1].sets=[{kg:'',reps:45,done:true}];
 assert.equal(x.api.context(s).title,'No pending sets');
});
test('Explicit exercise rest choice stays device-local and separate for each verified account',()=>{
 const x=boot(),before=JSON.stringify(x.getSession());
 assert.equal(x.api.setPreference('bench',120),true);
 assert.equal(x.api.prefsFor().bench,120);
 assert.match(x.store.get('forge-rest-preferences-v62:user:personA'),/"bench":120/);
 assert.equal(x.api.setPreference('plank',60),true);
 assert.equal(x.api.setPreference('not-in-session',60),false);
 assert.equal(x.api.setPreference('bench',45),false);
 x.setAccount({status:'ready',verifiedUid:'personB'});
 assert.equal(x.api.prefsFor().bench,undefined);
 assert.equal(x.api.setPreference('bench',90),true);
 x.setAccount({status:'ready',verifiedUid:'personA'});
 assert.equal(x.api.prefsFor().bench,120);
 assert.equal(JSON.stringify(x.getSession()),before);
});
test('Preference only changes rest timer after deliberate apply, with confirmation if countdown active',()=>{
 const x=boot();
 assert.equal(x.api.setPreference('bench',90),true);
 assert.equal(x.presets.length,0);
 x.setRunning(true);
 assert.equal(x.api.applyPreference('bench',()=>false),false);
 assert.equal(x.presets.length,0);
 assert.equal(x.api.applyPreference('bench',()=>true),true);
 assert.deepEqual(x.presets,[90]);
});
test('Session pause is an ephemeral note; routine, day and account changes reset it without completing workout',()=>{
 const x=boot(),snap=x.getSession(),before=JSON.stringify(snap);
 assert.equal(x.api.togglePause(true),true);
 assert.equal(x.api.getState().paused,true);
 assert.equal(snap.completed,false);
 assert.equal(JSON.stringify(snap),before);
 assert.match(x.api.markup(snap),/This is a session note only/);
 assert.equal(x.api.togglePause(false),true);
 assert.equal(x.api.getState().paused,false);
 x.api.togglePause(true);
 x.setSession({...snap,iso:'2026-10-27'});
 assert.equal(x.api.syncSession(),true);
 assert.equal(x.api.getState().paused,false);
 x.api.togglePause(true);
 x.setSession({...snap,exercises:[snap.exercises[1]]});
 x.api.syncSession();
 assert.equal(x.api.getState().paused,false);
 x.api.togglePause(true);
 x.setAccount({status:'ready',verifiedUid:'personB'});
 x.api.syncSession();
 assert.equal(x.api.getState().paused,false);
 x.setAccount({status:'checking',verifiedUid:'personB'});
 assert.equal(x.api.syncSession(),false);
 assert.equal(x.api.togglePause(true),false);
});
test('Guest rest choices do not leak to a remembered signed-in account',()=>{
 const x=boot();
 x.setAccount({status:'guest'});
 assert.equal(x.api.setPreference('bench',60),true);
 assert.equal(x.api.prefsFor().bench,60);
 x.store.set('nourish-last-account-v1','other-account');
 assert.equal(x.api.prefsFor().bench,undefined);
 assert.equal(x.api.setPreference('bench',120),false);
});
test('Accessibility, build wiring and privacy invariants',()=>{
 new vm.Script(source);
 const x=boot();
 assert.match(x.api.markup(),/aria-label="Training session controls"/);
 assert.match(x.api.markup(),/aria-pressed="false"/);
 assert.match(x.api.markup(),/Next: Bench press/);
 assert.doesNotMatch(source,/resetPrivatePlan|\.applyData\(|\.completed\s*=|\.done\s*=/);
 assert.doesNotMatch(source,/indexedDB\.deleteDatabase/);
 const css=fs.readFileSync('forge-train-v62.css','utf8');
 assert.match(css,/min-height:48px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-train-v62\.js\?v=62/);
 assert.match(html,/forge-train-v62\.css\?v=62/);
 assert.match(html,/name="forge-release" content="62"/);
 const worker=fs.readFileSync('service-worker.js','utf8');
 assert.match(worker,/forge-train-v62\.js/);
 assert.match(worker,/forge-train-v62\.css/);
 const roadmap=fs.readFileSync('FORGE-PHASE-2-ROADMAP.md','utf8');
 assert.match(roadmap,/P2-05/);
 assert.match(roadmap,/v62/);
});
