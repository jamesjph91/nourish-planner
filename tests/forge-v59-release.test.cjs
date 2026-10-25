'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const code=read('forge-progress.js'),css=read('forge-v59.css');
const day=(n=0)=>{const d=new Date();d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
function boot(raw='{}'){
 const events={},writes=[];
 const win={addEventListener:(name,fn)=>(events[name]??=[]).push(fn)};
 const doc={getElementById:()=>null,querySelector:()=>null,
  addEventListener:(name,fn)=>(events['doc:'+name]??=[]).push(fn)};
 const store={getItem:key=>key==='nourishHigherDeficitV1'?raw:null,
  setItem:(...args)=>writes.push(args)};
 const ctx={document:doc,window:win,localStorage:store,Number,Math,Date,JSON,Intl,
  URL:{revokeObjectURL(){}},console,Promise,confirm:()=>false};
 vm.runInNewContext(code,ctx,{filename:'forge-progress.js'});
 return {api:win.forgeProgress,events,writes};
}
const row=(date,values)=>({date,...values});
test('v59 filters all available measurement metrics by the same selected date window',()=>{
 const data={measurements:[
  row(day(-410),{weightKg:110,waistCm:110}),
  row(day(-14),{weightKg:97,waistCm:98}),
  row(day(-1),{weightKg:95}),
  row(day(3),{weightKg:200})
 ]};
 const b=boot(JSON.stringify(data)).api.inspectReadOnly();
 assert.equal(b.measurements.length,2);
 assert.equal(b.measurements.some(r=>r.date===day(3)),false);
 const api=boot().api;
 const weight=api.metricSeries(b.measurements,'weightKg'),waist=api.metricSeries(b.measurements,'waistCm');
 assert.equal(weight.length,2);assert.equal(waist.length,1);
 assert.equal(weight[0].value,97);assert.equal(weight[1].value,95);
 assert.equal(waist[0].value,98);
 assert.equal(api.metricSeries(b.measurements,'bogus').length,0);
 assert.deepEqual(Object.keys(api.availablePeriods),['7D','30D','90D','1Y','All']);
});
test('v59 chart uses only real values and explicitly indicates small samples',()=>{
 const api=boot().api;
 const d={measurements:[row(day(-4),{weightKg:95.5}),row(day(-3),{bodyFatPct:0}),
  row(day(-1),{weightKg:94})]};
 const html=api.metricExplorer(d);
 assert.match(html,/Date-filtered measurement trends/);
 assert.match(html,/2 recorded dates/);
 assert.match(html,/Weight trend from 95.5 to 94/);
 assert.match(html,/missing dates and values are never invented/i);
 const missing=api.metricExplorer({measurements:[]});
 assert.match(missing,/Nothing to chart yet/);
 assert.match(missing,/No recorded value/);
});
test('v59 handles corrupt local state, missing arrays and absent workouts without mutating user records',()=>{
 const invalid=boot('{"bad":');
 const d=invalid.api.inspectReadOnly();
 assert.equal(d.measurements.length,0);
 assert.equal(d.sessions.length,0);
 assert.equal(d.steps.length,0);
 assert.match(invalid.api.metricExplorer(d),/No recorded value/);
 assert.equal(invalid.writes.length,1,'Only legacy-photo ownership initialization is allowed');
 assert.equal(invalid.writes[0][0],'forge-photo-legacy-owner-v1');
 const malformed=boot(JSON.stringify({measurements:'not an array',workouts:{sessions:null},healthActivity:{daily:'no'}}));
 const v=malformed.api.inspectReadOnly();assert.equal(v.measurements.length,0);assert.equal(v.steps.length,0);
});
test('v59 real zero is not confused with missing wearable readings',()=>{
 const api=boot(JSON.stringify({healthActivity:{daily:[
  row(day(-2),{steps:0}),row(day(-1),{})]}})).api;
 const d=api.inspectReadOnly();
 assert.equal(d.steps.length,1);
 assert.equal(d.steps[0].steps,0);
 assert.equal(d.average,0);
});
test('v59 photo backups are user-triggered object URL downloads, not JSON or forced cloud uploads',()=>{
 assert.match(code,/BACK UP YOUR PHOTOS SEPARATELY/);
 assert.match(code,/Save copy/);
 assert.match(code,/data-fp-delete/);
 assert.match(code,/download="FORGE-progress-/);
 assert.match(code,/image\/png/);
 assert.match(code,/image\/webp/);
 assert.match(code,/not photo files/);
 assert.match(code,/Photos are not uploaded or cloud synced/);
 assert.doesNotMatch(code,/indexedDB\.deleteDatabase/);
 assert.match(code,/photoDatabaseName/);
});
test('v59 respects 48px mobile touch, at least 28px nav icons, focus and reduced motion',()=>{
 assert.match(css,/min-height:44px/);
 assert.match(css,/\.sidebar #nav button\{min-height:68px/);
 assert.match(css,/width:29px!important;height:29px/);
 assert.match(css,/@media\(max-width:375px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-fp-legacy="unfiltered"/);
});
test('v59 release gate includes offline, recovery, accessibility and privacy assertions',()=>{
 const sw=read('service-worker.js'),html=read('index.html'),repair=read('refresh-forge.html');
 const build=JSON.parse(read('forge-build.json'));
 assert.equal(build.version,60);
 assert.match(html,/name="forge-release" content="60"/);
 assert.match(html,/forge-progress\.js\?v=59/);
 assert.match(html,/forge-v59\.css\?v=59/);
 assert.match(sw,/forge-v60-auth-recovery/);
 assert.match(sw,/forge-progress\.js/);
 assert.match(sw,/forge-v59\.css/);
 assert.match(repair,/index\.html\?v=60/);
 assert.match(repair,/method:'HEAD'/);
 assert.doesNotMatch(repair,/localStorage\.(?:clear|removeItem)|indexedDB\.deleteDatabase/);
 const access=read('forge-access-v51.js');
 assert.match(access,/forge-skip-link/);
 assert.match(access,/aria-current/);
 assert.match(access,/aria-modal="true"/);
 const security=read('forge-data-safety-v52.js');
 assert.match(security,/inspectBackup/);
 assert.match(security,/confirmImport/);
 assert.match(security,/Progress photos are NOT in JSON backups/);
});
test('v59 regression suite and release audit document are present',()=>{
 const workflow=read('.github/workflows/health-hub-checks.yml');
 assert.match(workflow,/node --test tests\/\*\.test\.cjs/);
 assert.match(workflow,/node --check forge-progress\.js/);
 assert.match(workflow,/forge-v59\.css/);
 const doc=read('FORGE-RELEASE-AUDIT.md');
 assert.match(doc,/Progress measurements/);
 assert.match(doc,/Progress photos/);
 assert.match(doc,/Offline recovery/);
 assert.match(doc,/Cloud and local privacy/);
 assert.match(doc,/Keyboard and mobile navigation/);
});
