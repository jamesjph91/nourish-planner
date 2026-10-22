'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','forge-progress.js'),'utf8');
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
function dateAgo(days){const d=new Date();d.setDate(d.getDate()-days);return iso(d)}
function boot(state){
 const listeners={};
 const mount={className:'forge-progress-app',innerHTML:'',contains:()=>true};
 const root={children:[],dataset:{},classList:{add(){}},prepend(node){this.children.unshift(node)},querySelector(selector){return selector==='.forge-progress-app'?this.children.find(x=>x.className==='forge-progress-app')||null:null}};
 const win={addEventListener(name,fn){(listeners[name]??=[]).push(fn)}};
 const doc={head:{append(){}},getElementById(id){return id==='progress'?root:null},querySelector(selector){return selector==='#nav [data-tab="progress"].on'?{}:null},createElement(tag){if(tag==='div')return {...mount,classList:{contains(v){return v==='forge-progress-app'}}};if(tag==='style')return {textContent:'',id:''};throw Error(tag)},addEventListener(name,fn){(listeners[name]??=[]).push(fn)}};
 const store={getItem(key){assert.equal(key,'nourishHigherDeficitV1');return JSON.stringify(state)}};
 const context={window:win,document:doc,localStorage:store,Date,Intl,URL,console};
 vm.createContext(context);vm.runInContext(code,context,{filename:'forge-progress.js'});
 listeners['forge:view-rendered'][0]({detail:{tab:'progress'}});
 const current=()=>root.querySelector('.forge-progress-app').innerHTML;
 return {current,emit(name,event){(listeners[name]||[]).forEach(fn=>fn(event))},root,win};
}
test('FORGE Progress uses recorded measurements, workouts and activity',()=>{
 const now=dateAgo(0),prior=dateAgo(12);
 const v=boot({measurements:[{date:prior,weightKg:80,bodyFatPct:17},{date:now,weightKg:78.4,bodyFatPct:15.5}],healthActivity:{daily:[{date:now,steps:9000},{date:prior,steps:7000}],goals:{steps:10000}},workouts:{sessions:{[now]:{completed:true,sets:{squat:[{done:true,kg:80,reps:8},{done:false,kg:90,reps:8}]}}}}});
 const html=v.current();
 assert.match(html,/PROGRESS · SEE RESULTS/);
 assert.match(html,/78\.4/);
 assert.match(html,/15\.5/);
 assert.match(html,/8,000/);
 assert.match(html,/640/);
 assert.match(html,/Completed weighted sets|Training volume only includes completed weighted sets/);
 assert.match(html,/Weight progress/);
});
test('range switches are real filters, not cosmetic selections',()=>{
 const now=dateAgo(0),prior=dateAgo(28);
 const v=boot({measurements:[{date:prior,weightKg:82},{date:now,weightKg:80}],healthActivity:{daily:[]},workouts:{sessions:{}}});
 assert.match(v.current(),/−2\.0 kg/);
 const target={closest(selector){return selector==='[data-fp-period]'?{dataset:{fpPeriod:'7D'}}:null}};
 v.emit('click',{target});
 const html=v.current();
 assert.match(html,/Need 2 readings/);
 assert.match(html,/Nothing to chart yet/);
});
test('Progress photos clearly state that they are local and not cloud-synced',()=>{
 const v=boot({});
 const target={closest(selector){return selector==='[data-fp-tab]'?{dataset:{fpTab:'Photos'}}:null}};
 v.emit('click',{target});
 assert.match(v.current(),/Photos are not uploaded or cloud synced/);
 assert.match(v.current(),/JPG, PNG or WebP/);
});
test('Goals shows real saved targets without inventing progress',()=>{
 const v=boot({profile:{goalWeightKg:75},measurements:[{date:dateAgo(0),weightKg:78}],healthActivity:{daily:[],goals:{steps:10000}}});
 const target={closest(selector){return selector==='[data-fp-tab]'?{dataset:{fpTab:'Goals'}}:null}};
 v.emit('click',{target});
 assert.match(v.current(),/WEIGHT GOAL/);
 assert.match(v.current(),/75\.0 kg/);
 assert.match(v.current(),/3\.0 kg above your goal/);
 assert.match(v.current(),/STEP GOAL/);
 assert.match(v.current(),/10,000 steps/);
 assert.match(v.current(),/friend comparisons below/);
});
