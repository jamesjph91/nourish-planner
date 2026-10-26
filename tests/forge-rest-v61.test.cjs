'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('forge-rest-v61.js','utf8');
function boot({snapshot={iso:'2026-10-25',id:'A',exercises:[{id:'goblet',sets:[{done:false}]}]},currentTime=100000}={}){
 const docEvents={},events={};let time=currentTime,nextId=0,cleared=0,intervalCalls=0,vibrations=0,writes=0,view=snapshot;
 const FakeDate=class extends Date{static now(){return time}};
 const output={classList:{contains:()=>false},querySelector:()=>null};
 const document={readyState:'loading',visibilityState:'visible',getElementById:id=>id==='workouts'?output:null,
  addEventListener:(key,fn)=>(docEvents[key]??=[]).push(fn)};
 const window={forgeGymV54Snapshot:()=>view,addEventListener:(key,fn)=>(events[key]??=[]).push(fn)};
 const clock=setInterval=>{intervalCalls++;return ++nextId};
 const ctx={window,document,Date:FakeDate,Math,Number,String,console,
  navigator:{vibrate:()=>{vibrations++}},setInterval:clock,clearInterval:()=>{cleared++},
  localStorage:{setItem(){writes++;throw Error('Timer must be read only')}}};
 vm.createContext(ctx);vm.runInContext(source,ctx,{filename:'forge-rest-v61.js'});
 return {api:window.forgeRestV61,window,docEvents,events,advance:ms=>{time+=ms},
  change:next=>{view=next},getCleared:()=>cleared,getVibrations:()=>vibrations,
  getWrites:()=>writes,getIntervalCalls:()=>intervalCalls};
}
test('Presets provide 60/90/120 second rest without changing workout history',()=>{
 const x=boot(),t=x.api;
 assert.equal(t.sessionChanged(),true);
 assert.equal(t.getState().remaining,90);
 assert.equal(t.setPreset(60),true);
 assert.equal(t.getState().remaining,60);
 assert.equal(t.setPreset(120),true);
 assert.equal(t.getState().remaining,120);
 assert.equal(t.setPreset(600),false);
 assert.equal(t.getState().remaining,120);
 assert.equal(t.fmt(61),'01:01');
 assert.equal(x.getWrites(),0);
});
test('Uses absolute deadlines so delayed background ticks cannot drift or add fake seconds',()=>{
 const x=boot(),t=x.api;t.sessionChanged();t.setPreset(90);
 assert.equal(t.start(),true);
 assert.equal(t.getState().running,true);
 x.advance(30001);
 assert.equal(t.tick().remaining,60);
 x.advance(80000);
 const done=t.tick();
 assert.equal(done.remaining,0);
 assert.equal(done.running,false);
 assert.equal(done.finished,true);
 assert.equal(x.getVibrations(),1);
 assert.equal(x.getWrites(),0);
});
test('Pause, resume and +15 seconds are user-triggered, not auto-completion of a set',()=>{
 const x=boot(),t=x.api;t.sessionChanged();t.start();
 x.advance(32000);t.pause();
 assert.equal(t.getState().running,false);
 assert.equal(t.getState().remaining,58);
 x.advance(60000);
 assert.equal(t.getState().remaining,58);
 t.add15();assert.equal(t.getState().remaining,73);
 t.start();x.advance(10000);
 assert.equal(t.getState().remaining,63);
 t.add15();assert.equal(t.getState().remaining,78);
 assert.equal(x.getWrites(),0);
});
test('Timer is unavailable for rest days, empty sessions and auto-resets when selected session changes',()=>{
 const x=boot(),t=x.api;t.sessionChanged();t.setPreset(60);t.start();
 x.change({iso:'2026-10-26',id:'B',exercises:[{id:'bench'}]});t.sessionChanged();
 assert.equal(t.getState().running,false);
 assert.equal(t.getState().remaining,90);
 assert.equal(t.getState().sessionKey,'2026-10-26|B');
 x.change({iso:'2026-10-27',id:'rest',exercises:[]});assert.equal(t.sessionChanged(),false);
 assert.equal(t.start(),false);
 assert.equal(t.getState().sessionKey,'');
});
test('Account switch and cloud conflict reset timer without editing data',()=>{
 const x=boot(),t=x.api;t.sessionChanged();t.start();
 for(const fn of x.events['forge:cloud-session']||[])fn({detail:{state:'guest'}});
 assert.equal(t.getState().running,false);
 assert.equal(t.getState().sessionKey,'');
 t.sessionChanged();t.start();
 for(const fn of x.events['forge:cloud-conflict']||[])fn({detail:{reason:'different data'}});
 assert.equal(t.getState().running,false);
 assert.equal(x.getWrites(),0);
});
test('Timer has accessible manual controls and large mobile tap targets',()=>{
 new vm.Script(source);
 const x=boot(),t=x.api;t.sessionChanged();
 const html=t.view();
 assert.match(html,/aria-label="Workout rest timer"/);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/60 sec/);
 assert.match(html,/90 sec/);
 assert.match(html,/120 sec/);
 assert.match(html,/data-fg61-primary/);
 assert.match(html,/data-fg61-add/);
 assert.match(html,/does not send any data to the cloud/);
 assert.doesNotMatch(source,/localStorage\.setItem|indexedDB\.deleteDatabase/);
 const css=fs.readFileSync('forge-rest-v61.css','utf8');
 assert.match(css,/min-height:48px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('v61 is wired into the app and the new phase roadmap is separate from original 50-step work',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-rest-v61\.js\?v=61/);
 assert.match(html,/forge-rest-v61\.css\?v=61/);
 assert.match(html,/name="forge-release" content="6[1-9]"/);
 const p2=fs.readFileSync('FORGE-PHASE-2-ROADMAP.md','utf8');
 assert.match(p2,/v61/);
 assert.match(p2,/v62/);
 assert.match(p2,/v63/);
 assert.match(p2,/v64/);
});
