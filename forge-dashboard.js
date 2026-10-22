/* FORGE Today v26 — real-time visual command centre bound to the existing saved engine. */
(()=>{'use strict';
const root=()=>document.getElementById('overview');
const iso=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const num=v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):0;
const has=v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v));
const fmt=(v,d=0)=>Number(v||0).toLocaleString('en-GB',{maximumFractionDigits:d});
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function state(){try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}}
function data(){
 const s=state(),today=iso(),entries=(s.foodDiary?.entries||[]).filter(e=>e?.date===today);
 const totals=entries.reduce((a,e)=>{for(const k of ['kcal','protein','carbs','fat'])a[k]+=num(e.totals?.[k]);return a},{kcal:0,protein:0,carbs:0,fat:0});
 const activity=(Array.isArray(s.healthActivity?.daily)?s.healthActivity.daily:[]).find(x=>x.date===today)||{};
 const stepsGoal=Math.max(1000,num(s.healthActivity?.goals?.steps)||8000);
 const sleepGoal=Math.max(240,num(s.healthActivity?.goals?.sleepMinutes)||480);
 const proteinGoal=Math.max(1,num(s.settings?.prot)||160);
 const api=typeof window.nourishFoodTodaySummary==='function'?window.nourishFoodTodaySummary():null;
 const kcalGoal=num(api?.target)||num(s.settings?.restCal)||1800;
 const todaySession=s.workouts?.sessions?.[today];
 const completed=!!todaySession?.completed;
 const measurement=Array.isArray(s.measurements)&&s.measurements.some(x=>x.date===today);
 const steps=has(activity.steps)?num(activity.steps):null;
 const sleep=has(activity.sleepMinutes)?num(activity.sleepMinutes):null;
 const goals=[
  {text:'Record today’s food',done:entries.length>0,tab:'diary'},
  {text:'Reach protein target',done:entries.length>0&&totals.protein>=proteinGoal,tab:'diary'},
  {text:'Reach your step goal',done:steps!==null&&steps>=stepsGoal,tab:'health'},
  {text:'Complete a workout',done:completed,tab:'workouts'},
  {text:'Record a progress measurement',done:measurement,tab:'progress'}
 ];
 return {s,today,entries,totals,activity,stepsGoal,sleepGoal,proteinGoal,kcalGoal,todaySession,completed,goals,steps,sleep};
}
function ring(title,value,goal,unit,cls,display,sub){
 const known=value!==null&&value!==undefined;
 const progress=known&&goal>0?Math.max(0,Math.min(100,Number(value)/goal*100)):0;
 return '<div class="fg26-ringitem"><div class="fg26-ring '+cls+'" style="--fill:'+((progress*3.6).toFixed(1))+'deg"><div><b>'+escape(known?display:'—')+'</b><small>'+escape(title)+'</small></div></div><span>'+escape(known?sub:'Not recorded')+'</span></div>';
}
function render(){
 const el=root();if(!el)return;const d=data();
 const done=d.goals.filter(x=>x.done).length;
 const date=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 const status=done===5?'ALL GOALS MET':done?'IN PROGRESS':'READY WHEN YOU ARE';
 const calor=d.totals.kcal,protein=d.totals.protein;
 const source=d.activity.source==='health-connect'?'Health Connect':d.activity.source==='samsung-export'?'Samsung import':d.activity.source==='manual'?'Manual activity':'Activity';
 const sleepLabel=d.sleep===null?'Not recorded':fmt(d.sleep/60,1)+'h of '+fmt(d.sleepGoal/60,1)+'h';
 el.innerHTML='<div class="fg26"><header class="fg26-heading"><div><div class="fg26-eyebrow"><img alt="" src="./forge-icon.svg?v=24"> FORGE / YOUR DAY</div><h1>Today<span>.</span></h1><p>'+escape(date)+'</p></div><div class="fg26-status"><span class="fg26-spark">●</span>'+escape(status)+'</div></header>'+
 '<section class="fg26-hero"><div class="fg26-hero-top"><span>DAILY PERFORMANCE</span><b>'+done+' / 5 FOCUS POINTS</b></div><h2>Build strength.<br><em>Own your day.</em></h2><p>Your food, training and activity in one place — updated from what you actually log.</p><div class="fg26-rings">'+
 ring('KCAL',calor,d.kcalGoal,'kcal','fg26-orange',fmt(calor),fmt(calor)+' / '+fmt(d.kcalGoal)+' kcal')+
 ring('PROTEIN',protein,d.proteinGoal,'g','fg26-lime',fmt(protein)+'g',fmt(protein)+' / '+fmt(d.proteinGoal)+'g')+
 ring('STEPS',d.steps,d.stepsGoal,'steps','fg26-cyan',d.steps===null?'—':fmt(d.steps),(d.steps===null?'—':fmt(d.steps))+' / '+fmt(d.stepsGoal))+
 ring('SLEEP',d.sleep,d.sleepGoal,'minutes','fg26-purple',d.sleep===null?'—':fmt(d.sleep/60,1)+'h',sleepLabel)+
 '</div><p class="fg26-footnote">Activity: '+escape(source)+' · Calorie target follows your meal plan; exercise energy is not added automatically.</p></section>'+
 '<section class="fg26-motto"><div><span>THE FORGE MINDSET</span><strong>DISCIPLINE TODAY.<br>FREEDOM TOMORROW.</strong><i></i></div><div class="fg26-f-graphic" aria-hidden="true">F</div></section>'+
 '<section class="fg26-focus"><header><div><small>DAILY DISCIPLINE</small><h2>Today’s focus</h2></div><span>'+done+' of 5 complete</span></header><div class="fg26-focus-progress"><i style="width:'+(done*20)+'%"></i></div>'+
 d.goals.map(goal=>'<button type="button" data-fg26-tab="'+goal.tab+'"><span class="fg26-check '+(goal.done?'done':'')+'">'+(goal.done?'✓':'')+'</span><b>'+escape(goal.text)+'</b><span class="fg26-go-arrow">↗</span></button>').join('')+'</section>'+
 '<div class="fg26-actions"><button data-fg26-tab="workouts" class="primary">⚒ '+(d.completed?'View workout':'Open workout')+'</button><button data-fg26-tab="diary">＋ Log food</button></div>'+
 '<div class="fg26-bottom"><button data-fg26-tab="planner">▦ Meal plan <span>↗</span></button><button data-fg26-tab="health">◇ Activity <span>↗</span></button><button data-fg26-tab="progress">▥ Progress <span>↗</span></button></div>'+
 '<p class="fg26-data-note">Unrecorded activities show “—”. This dashboard does not assume missing data means zero activity.</p></div>';
}
document.addEventListener('click',e=>{const button=e.target.closest?.('[data-fg26-tab]');if(button&&root()?.contains(button)){document.querySelector('#nav [data-tab="'+button.dataset.fg26Tab+'"]')?.click()}});
document.addEventListener('DOMContentLoaded',render,{once:true});
window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='overview')render()});
window.addEventListener('storage',()=>{if(document.querySelector('#nav [data-tab="overview"].on'))render()});
window.forgeTodayRender=render;
window.forgeTodayData=data;
})();