/* FORGE v45 — seven-day performance intelligence over existing private FORGE state.
   Presentation only: workouts, food, health imports and measurements remain owned by existing engines. */
(()=>{'use strict';
const root=()=>document.getElementById('overview');
const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const shift=(date,delta)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+delta);return iso(d)};
const known=(v,min=0,max=1000000)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
const number=(v,min=0,max=1000000)=>known(v,min,max)?Number(v):null;
const fmt=(v,places=0)=>Number(v).toLocaleString('en-GB',{maximumFractionDigits:places});
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const datestr=val=>typeof val==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(val);
const state=()=>{try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}};
let selectedMetric='kcal';
const metrics={kcal:{label:'Calories',unit:'kcal',color:'lime'},protein:{label:'Protein',unit:'g',color:'cyan'},steps:{label:'Steps',unit:'steps',color:'purple'}};
function model(s=state(),today=iso(new Date())){
 const days=Array.from({length:7},(_,i)=>shift(today,i-6));
 const food=(Array.isArray(s.foodDiary?.entries)?s.foodDiary.entries:[]).filter(x=>x&&datestr(x.date));
 const activity=Array.isArray(s.healthActivity?.daily)?s.healthActivity.daily:[];
 const sessions=s.workouts?.sessions||{};
 const proteinGoal=number(s.settings?.prot,1,500)||160;
 const stepGoal=number(s.healthActivity?.goals?.steps,1000,50000)||8000;
 const week=days.map(date=>{
  const logged=food.filter(x=>x.date===date);
  const sum=k=>logged.reduce((n,x)=>n+(number(x.totals?.[k],0,k==='kcal'?5000:500)||0),0);
  const reading=activity.find(x=>x&&x.date===date)||{};
  const steps=number(reading.steps,0,150000);
  const sleep=number(reading.sleepMinutes,0,1440);
  const workout=sessions[date]||{};
  return {date,logged:logged.length,kcal:logged.length?Math.round(sum('kcal')*10)/10:null,
   protein:logged.length?Math.round(sum('protein')*10)/10:null,
   steps,sleep,completed:workout.completed===true,
   sets:Object.values(workout.sets||{}).reduce((n,v)=>n+(Array.isArray(v)?v.filter(z=>z?.done===true).length:0),0)};
 });
 const stats=key=>{
  const recorded=week.filter(x=>x[key]!==null);
  return {days:recorded.length,mean:recorded.length?recorded.reduce((n,x)=>n+x[key],0)/recorded.length:null,
   total:recorded.reduce((n,x)=>n+x[key],0)};
 };
 const weightRows=(Array.isArray(s.measurements)?s.measurements:[])
   .filter(x=>x&&datestr(x.date)&&x.date<=today&&number(x.weightKg,15,500)!==null)
   .slice().sort((a,b)=>a.date.localeCompare(b.date));
 const latest=weightRows.at(-1)||null;
 const periodStart=shift(today,-29);
 const inPeriod=weightRows.filter(x=>x.date>=periodStart);
 const weightDelta=inPeriod.length>=2&&inPeriod[0].date!==inPeriod.at(-1).date?
   Math.round((Number(inPeriod.at(-1).weightKg)-Number(inPeriod[0].weightKg))*10)/10:null;
 const workoutDays=week.filter(x=>x.completed).length;
 const setCount=week.reduce((n,x)=>n+x.sets,0);
 const proteinDays=week.filter(x=>x.protein!==null&&x.protein>=proteinGoal).length;
 const stepDays=week.filter(x=>x.steps!==null&&x.steps>=stepGoal).length;
 const foodDays=week.filter(x=>x.logged>0).length;
 return {today,week,kcal:stats('kcal'),protein:stats('protein'),steps:stats('steps'),sleep:stats('sleep'),
  foodDays,proteinDays,stepDays,workoutDays,setCount,proteinGoal,stepGoal,
  weight:latest?Number(latest.weightKg):null,weightDate:latest?.date||'',weightDelta};
}
function graph(m,key){
 const metric=metrics[key]||metrics.kcal;
 const nums=m.week.map(x=>x[key]).filter(v=>v!==null),max=Math.max(1,...nums);
 const avg=key==='kcal'?m.kcal:key==='protein'?m.protein:m.steps;
 const average=avg.mean===null?'No readings':fmt(avg.mean,key==='protein'?1:0)+' '+metric.unit;
 return '<div class="fg45-graph" role="group" aria-label="'+metric.label+' over seven days">'+
 m.week.map(day=>{
  const value=day[key],has=value!==null,height=has?Math.max(0,Math.round(value/max*100)):0;
  const label=has?(key==='steps'&&value>=10000?fmt(value/1000,1)+'k':fmt(value,0)):'—';
  const full=has?fmt(value,key==='protein'?1:0)+' '+metric.unit:'Not recorded';
  const weekday=new Date(day.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'}).slice(0,2);
  return '<div class="fg45-day" role="img" aria-label="'+escape(day.date+': '+full)+'"><div class="fg45-track"><i '+(has?'style="height:'+height+'%"':'class="fg45-empty"')+'></i></div><b>'+label+'</b><small>'+weekday+'</small></div>';
 }).join('')+'</div>'+
 '<p class="fg45-chart-note">Average on '+avg.days+' recorded day'+(avg.days===1?'':'s')+': <b>'+average+'</b>. Missing days are not counted as zero.</p>';
}
function panel(m){
 const weight=m.weight===null?'—':fmt(m.weight,1)+' kg';
 const weightNote=m.weight===null?'No weigh-in recorded':'Last measured '+m.weightDate;
 const change=m.weightDelta===null?'—':(m.weightDelta>0?'+':'')+fmt(m.weightDelta,1)+' kg';
 const next=m.foodDays===0?'Start by logging a meal.':m.proteinDays===0?'Log meals to check protein progress.':
  m.steps.days===0?'Add a watch reading to see your activity trend.':
  'Your recorded trends are ready to review.';
 return '<section class="fg45" aria-label="Your weekly performance"><div class="fg45-heading"><div><span>PERFORMANCE / LAST 7 DAYS</span><h2>Know your progress.</h2></div><span class="fg45-live">YOUR DATA</span></div>'+
 '<div class="fg45-cards">'+
 '<div class="fg45-card"><small>FOOD LOGGED</small><strong>'+m.foodDays+' <em>/ 7</em></strong><span>Days with recorded intake</span></div>'+
 '<div class="fg45-card"><small>TRAINING</small><strong>'+m.workoutDays+'</strong><span>Completed sessions · '+m.setCount+' checked sets</span></div>'+
 '<div class="fg45-card"><small>PROTEIN TARGET</small><strong>'+m.proteinDays+' <em>/ 7</em></strong><span>Recorded days meeting '+fmt(m.proteinGoal)+' g</span></div>'+
 '<div class="fg45-card"><small>STEP TARGET</small><strong>'+m.stepDays+' <em>/ 7</em></strong><span>Recorded days meeting '+fmt(m.stepGoal)+' steps</span></div>'+
 '</div>'+
 '<div class="fg45-chart"><div class="fg45-chart-top"><div><small>YOUR TRENDS</small><h3>Last seven days</h3></div><div class="fg45-tabs" role="tablist" aria-label="Select performance metric">'+
 Object.entries(metrics).map(([id,x])=>'<button type="button" role="tab" data-fg45-metric="'+id+'" aria-selected="'+(id===selectedMetric)+'" class="'+(id===selectedMetric?'on':'')+'">'+x.label+'</button>').join('')+
 '</div></div><div class="fg45-plot fg45-'+selectedMetric+'">'+graph(m,selectedMetric)+'</div></div>'+
 '<div class="fg45-weight"><div><small>BODYWEIGHT</small><strong>'+weight+'</strong><span>'+weightNote+'</span></div>'+
 '<div><small>LAST 30 DAYS</small><strong>'+change+'</strong><span>'+(m.weightDelta===null?'Two dated weigh-ins needed':'First to latest recorded weigh-in')+'</span></div>'+
 '<button type="button" data-fg26-tab="progress">Open progress ↗</button></div>'+
 '<div class="fg45-next"><span>YOUR NEXT STEP</span><p>'+escape(next)+'</p><div>'+
 '<button type="button" data-fg26-tab="diary">＋ Log food</button><button type="button" data-fg26-tab="workouts">⚒ Train</button>'+
 '<button type="button" data-fg26-tab="health">◇ Activity</button></div></div>'+
 '<p class="fg45-note">Only logged food, workouts and imported or manually recorded watch data are shown. This is not a live Samsung connection, and watch calories do not increase your food allowance.</p></section>';
}
function render(){
 const r=root();if(!r)return;
 const shell=r.querySelector('.fg26');if(!shell)return;
 let node=shell.querySelector('.fg45');
 if(!node){const hero=shell.querySelector('.fg26-hero');if(!hero)return;hero.insertAdjacentHTML('afterend','<div class="fg45"></div>');node=shell.querySelector('.fg45')}
 if(node)node.outerHTML=panel(model());
}
document.addEventListener('click',e=>{
 const button=e.target.closest?.('[data-fg45-metric]');
 if(!button||!root()?.contains(button))return;
 if(!metrics[button.dataset.fg45Metric])return;
 selectedMetric=button.dataset.fg45Metric;
 render();
});
document.addEventListener('DOMContentLoaded',render,{once:true});
window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='overview')render()});
window.addEventListener('storage',()=>{if(document.querySelector('#nav [data-tab="overview"].on'))render()});
window.forgeTodayInsights={model,graph,panel,render};
})();
