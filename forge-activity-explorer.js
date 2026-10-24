/* FORGE Activity Explorer v42. Read-only presentation over validated Health Hub day summaries. */
(()=>{'use strict';
 const VIEWS=['steps','cardio','sleep','all'];
 let selected='steps';
 const root=()=>document.getElementById('health');
 const fmt=(n,d=0)=>Number(n).toLocaleString('en-GB',{minimumFractionDigits:0,maximumFractionDigits:d});
 const valid=(v,min=0,max=Infinity)=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max;
 const dateOf=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const shift=(iso,n)=>{const v=new Date(iso+'T12:00:00');v.setDate(v.getDate()+n);return dateOf(v)};
 const dateLabel=iso=>new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'});
 const read=()=>{try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}};
 const sourceLabel=x=>({'manual':'Manual reading','samsung-export':'Samsung export','health-connect':'Health Connect import','imported':'Imported daily summary'})[x]||'No activity reading today';
 function model(s={},today=dateOf(new Date())){
  const activity=s.healthActivity||{};
  const daily=Array.isArray(activity.daily)?activity.daily:[];
  const day=iso=>daily.find(x=>x&&x.date===iso)||{};
  const n=(entry,key,min=0,max=Infinity)=>valid(entry[key],min,max)?Number(entry[key]):null;
  const stepsGoal=valid(activity.goals?.steps,1000,50000)?Number(activity.goals.steps):8000;
  const sleepGoal=valid(activity.goals?.sleepMinutes,240,720)?Number(activity.goals.sleepMinutes):480;
  const a=day(today);
  const week=Array.from({length:7},(_,i)=>{const date=shift(today,i-6),r=day(date);return {date,steps:n(r,'steps',0,150000),activeKcal:n(r,'activeKcal',0,12000),sleepMinutes:n(r,'sleepMinutes',0,1440),restingBpm:n(r,'restingBpm',25,220)}});
  const summary=key=>{const items=week.map(x=>x[key]).filter(x=>x!==null);return {recorded:items.length,average:items.length?items.reduce((a,b)=>a+b,0)/items.length:null,total:items.reduce((a,b)=>a+b,0)}};
  return {today,steps:n(a,'steps',0,150000),activeKcal:n(a,'activeKcal',0,12000),sleepMinutes:n(a,'sleepMinutes',0,1440),restingBpm:n(a,'restingBpm',25,220),stepsGoal,sleepGoal,source:sourceLabel(a.source),updatedAt:a.updatedAt||'',week,stepsWeek:summary('steps'),cardioWeek:summary('activeKcal'),sleepWeek:summary('sleepMinutes')};
 }
 const display=(value,unit='',decimals=0)=>value===null?'—':fmt(value,decimals)+(unit?' '+unit:'');
 const hours=value=>value===null?'—':fmt(value/60,1)+' h';
 const percent=(x,goal)=>x===null?0:Math.max(0,Math.min(100,Math.round(x/goal*100)));
 function tabs(){return '<div class="fa42-tabs" role="tablist" aria-label="Activity views">'+VIEWS.map(v=>'<button type="button" role="tab" data-fa42-view="'+v+'" aria-selected="'+(selected===v)+'" class="'+(selected===v?'on':'')+'">'+({steps:'Steps',cardio:'Cardio',sleep:'Sleep',all:'All'})[v]+'</button>').join('')+'</div>'}
 function stat(label,value,detail){return '<article class="fa42-stat"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></article>'}
 function weekChart(m,key,label,unit){
  const values=m.week.map(x=>x[key]).filter(x=>x!==null),max=Math.max(1,...values);
  return '<section class="fa42-chart"><div class="fa42-chart-head"><div><small>LAST 7 DAYS</small><h3>'+label+'</h3></div><span>'+values.length+' recorded day'+(values.length===1?'':'s')+'</span></div>'+
  '<div class="fa42-bars">'+m.week.map(x=>{const value=x[key],recorded=value!==null,height=recorded?Math.max(3,Math.round(value/max*100)):0;
   const formatted=value===null?'Not recorded':key==='sleepMinutes'?hours(value):display(value,unit,key==='activeKcal'?1:0);
   return '<div class="fa42-day" role="img" aria-label="'+x.date+': '+formatted+'"><div class="fa42-bartrack"><i '+(recorded?'style="height:'+height+'%"':'class="missing"')+'></i></div><b>'+(!recorded?'—':key==='sleepMinutes'?fmt(value/60,1):value>=10000?fmt(value/1000,1)+'k':fmt(value,0))+'</b><small>'+dateLabel(x.date)+'</small></div>';
  }).join('')+'</div><p>Only recorded days contribute to averages. A dash means no reading, not zero.</p></section>';
 }
 function stepsView(m){
  return '<section class="fa42-hero fa42-step-hero"><div class="fa42-ring" style="--p:'+percent(m.steps,m.stepsGoal)*3.6+'deg"><div><strong>'+display(m.steps)+'</strong><small>STEPS TODAY</small></div></div><div class="fa42-hero-details"><small>DAILY MOVEMENT</small><h2>'+display(m.steps)+'</h2><p>of '+fmt(m.stepsGoal)+' step target</p><div class="fa42-meter"><i style="width:'+percent(m.steps,m.stepsGoal)+'%"></i></div><span>'+ (m.steps===null?'No step reading today':percent(m.steps,m.stepsGoal)+'% of target') +'</span></div></section>'+
  '<div class="fa42-stats">'+stat('7-DAY AVERAGE',display(m.stepsWeek.average,'steps',0),m.stepsWeek.recorded+' recorded days')+
  stat('GOAL DAYS',m.week.filter(x=>x.steps!==null&&x.steps>=m.stepsGoal).length+' / 7','Recorded goal completions')+'</div>'+
  weekChart(m,'steps','Daily steps','steps');
 }
 function cardioView(m){
  return '<section class="fa42-hero fa42-today"><small>ACTIVE ENERGY</small><strong>'+display(m.activeKcal,'kcal',1)+'</strong><span>Today’s recorded active calories · device estimate when imported</span></section>'+
   '<div class="fa42-stats">'+stat('7-DAY TOTAL',display(m.cardioWeek.recorded?m.cardioWeek.total:null,'kcal',1),'Recorded days only')+
   stat('DAILY AVERAGE',display(m.cardioWeek.average,'kcal',1),m.cardioWeek.recorded+' recorded days')+'</div>'+
   weekChart(m,'activeKcal','Active energy','kcal')+
   '<p class="fa42-disclaimer">FORGE does not calculate active minutes, distance or calories burned from steps. Those values require actual device records.</p>';
 }
 function sleepView(m){
  return '<section class="fa42-hero fa42-today"><small>RECOVERY · SLEEP</small><strong>'+hours(m.sleepMinutes)+'</strong><span>Today’s recorded sleep · reference '+hours(m.sleepGoal)+'</span><div class="fa42-meter"><i style="width:'+percent(m.sleepMinutes,m.sleepGoal)+'%"></i></div></section>'+
   '<div class="fa42-stats">'+stat('7-DAY AVERAGE',hours(m.sleepWeek.average),m.sleepWeek.recorded+' recorded days')+
   stat('REFERENCE DAYS',m.week.filter(x=>x.sleepMinutes!==null&&x.sleepMinutes>=m.sleepGoal).length+' / 7','Recorded days meeting reference')+'</div>'+
   weekChart(m,'sleepMinutes','Sleep duration','h');
 }
 function allView(m){
  return '<div class="fa42-all">'+stat('STEPS',display(m.steps),fmt(m.stepsGoal)+' daily target')+
   stat('ACTIVE ENERGY',display(m.activeKcal,'kcal',1),'Recorded estimate')+
   stat('SLEEP',hours(m.sleepMinutes),hours(m.sleepGoal)+' reference')+
   stat('RESTING HEART RATE',display(m.restingBpm,'bpm'),'Recorded measurement')+'</div>'+
   weekChart(m,'steps','Daily steps','steps')+
   '<p class="fa42-disclaimer">These values reflect what has been entered or imported, not a live watch connection.</p>';
 }
 function html(m){
  return '<div class="fa42-shell" data-active-view="'+selected+'">'+tabs()+
   (selected==='steps'?stepsView(m):selected==='cardio'?cardioView(m):selected==='sleep'?sleepView(m):allView(m))+
   '<section class="fa42-source"><div><small>DATA SOURCE · TODAY</small><strong>'+m.source+'</strong><span>'+ (m.updatedAt&&Number.isFinite(Date.parse(m.updatedAt))?'Last updated '+new Date(m.updatedAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'No automatic live sync') +'</span></div><span aria-hidden="true">◉</span></section>'+
   '<div class="fa42-actions"><button type="button" data-fa42-action="record">＋ Record reading</button><button type="button" data-fa42-action="import">⇪ Import watch data</button><button type="button" data-fa42-action="goals">◎ Edit targets</button></div>'+
   '<p class="fa42-disclaimer">Samsung Health / Health Connect daily summaries are imported or manually entered. Automatic wearable syncing is not enabled.</p></div>';
 }
 function mount(){
  const r=root();
  if(!r||document.body.dataset.forgeTab!=='health')return;
  let target=r.querySelector('.forge-activity-overview');
  if(!target){const head=r.querySelector('.sectionhead');if(!head)return;head.insertAdjacentHTML('afterend','<section class="forge-activity-overview"></section>');target=r.querySelector('.forge-activity-overview')}
  if(target)target.innerHTML=html(model(read()));
 }
 function setView(name){if(!VIEWS.includes(name))return false;selected=name;mount();return true}
 document.addEventListener('click',e=>{
  const btn=e.target.closest?.('[data-fa42-view],[data-fa42-action]');
  if(!btn||!root()?.contains(btn))return;
  if(btn.dataset.fa42View){setView(btn.dataset.fa42View);return}
  const key=btn.dataset.fa42Action;
  if(key==='import'){document.getElementById('hub-file')?.click();return}
  const field=document.getElementById(key==='record'?'hub-date':'hub-goal-steps');
  if(field){field.scrollIntoView?.({behavior:'smooth',block:'center'});field.focus?.({preventScroll:true})}
 });
 window.addEventListener('forge:view-rendered',mount);
 window.addEventListener('storage',()=>{if(document.body.dataset.forgeTab==='health')mount()});
 document.addEventListener('DOMContentLoaded',mount,{once:true});
 window.forgeActivityExplorer={model,html,setView,refresh:mount};
 mount();
})();
