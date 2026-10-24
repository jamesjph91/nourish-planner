/* FORGE v43 — live strength insights. Read only; gym.js owns all workout writes. */
(()=>{'use strict';
 const root=()=>document.getElementById('workouts');
 const fmt=(v,decimals=0)=>Number(v).toLocaleString('en-GB',{maximumFractionDigits:decimals});
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const validNumber=x=>x!==''&&x!==null&&x!==undefined&&Number.isFinite(Number(x))&&Number(x)>=0;
 function getData(){try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}}
 function completedSets(session,id){
  const sets=session?.sets?.[id];
  if(!Array.isArray(sets))return [];
  return sets.filter(x=>x&&x.done===true&&validNumber(x.reps)).map(x=>({kg:validNumber(x.kg)?Number(x.kg):null,reps:Number(x.reps)}));
 }
 function model(s=getData()){
  const w=s.workouts||{},selected=w.selected||'';
  const session=w.sessions?.[selected]||null;
  const ids=Array.isArray(session?.exerciseIds)?session.exerciseIds.filter(id=>typeof id==='string'):[];
  const earlier=Object.entries(w.sessions||{}).filter(([date])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<selected).sort((a,b)=>b[0].localeCompare(a[0]));
  const rows=ids.map(id=>{
   const current=completedSets(session,id),historical=earlier.flatMap(([date,entry])=>completedSets(entry,id).map(x=>({...x,date})));
   const priorLoad=historical.filter(x=>x.kg>0).reduce((best,x)=>Math.max(best,x.kg),0);
   const currentLoad=current.filter(x=>x.kg>0).reduce((best,x)=>Math.max(best,x.kg),0);
   const bestCurrent=current.filter(x=>x.kg===currentLoad).sort((a,b)=>b.reps-a.reps)[0]||null;
   const lastDay=earlier.find(([,entry])=>completedSets(entry,id).length>0);
   const last=lastDay?completedSets(lastDay[1],id).sort((a,b)=>b.kg-a.kg||b.reps-a.reps)[0]:null;
   const previousWeighted=historical.some(x=>x.kg>0);
   const isLoadBest=previousWeighted&&currentLoad>priorLoad;
   return {id,done:current.length,priorLoad:previousWeighted?priorLoad:null,currentLoad:currentLoad||null,
    bestCurrent,last,lastDate:lastDay?.[0]||null,isLoadBest,firstWeightedLog:!previousWeighted&&currentLoad>0};
  });
  return {selected,completed:rows.reduce((n,x)=>n+x.done,0),activeExercises:ids.length,
   exercised:rows.filter(x=>x.done>0).length,loadBests:rows.filter(x=>x.isLoadBest).length,
   priorSessions:earlier.filter(([,entry])=>entry?.completed).length,rows};
 }
 function summary(m){
  const stat=(label,value,sub)=>'<div class="fs43-stat"><small>'+label+'</small><strong>'+value+'</strong><span>'+sub+'</span></div>';
  return '<div class="fs43-heading"><div><small>SESSION INTELLIGENCE</small><h2>Your strength, tracked.</h2></div><span class="fs43-readonly">LIVE LOG</span></div>'+
   '<div class="fs43-grid">'+stat('COMPLETED SETS',m.completed,'Recorded in this session')+
   stat('EXERCISES TRAINED',m.exercised+' / '+m.activeExercises,'With checked sets')+
   stat('NEW LOAD BESTS',m.loadBests,'Compared with earlier dates')+'</div>'+
   '<p class="fs43-hint">'+(m.completed?'Comparisons update when you tick a set. Only recorded, completed sets count.':'Log your first completed set to see this session build.')+
   ' A new best requires a higher logged weight than a previous session; first-time logs are not treated as records.</p>';
 }
 function note(row){
  if(row.isLoadBest)return '<span class="fs43-record">★ New load best · '+fmt(row.currentLoad,1)+' kg</span>';
  if(row.firstWeightedLog)return '<span class="fs43-first">First weighted log recorded</span>';
  if(row.priorLoad!==null)return '<span class="fs43-prior">Previous best: '+fmt(row.priorLoad,1)+' kg</span>';
  return '<span class="fs43-prior">No previous weighted set logged</span>';
 }
 function exerciseNote(row){
  const last=row.last&&row.lastDate?'<span>Last completed: '+(row.last.kg===null?'Bodyweight':fmt(row.last.kg,1)+' kg')+' × '+fmt(row.last.reps)+' · '+escape(row.lastDate)+'</span>':'<span>No prior completed sets for comparison</span>';
  return '<div class="fs43-ex-note">'+last+note(row)+'</div>';
 }
 function enhance(){
  const r=root();
  if(!r||!document.querySelector('#nav [data-tab="workouts"].on'))return;
  const m=model(),parent=r.querySelector('.fgt-command-mount');
  if(!parent)return;
  let section=r.querySelector('.fs43-dashboard');
  if(!section){parent.insertAdjacentHTML('afterend','<section class="fs43-dashboard" aria-label="Live strength insights"></section>');section=r.querySelector('.fs43-dashboard')}
  if(section)section.innerHTML=summary(m);
  const exercises=[...r.querySelectorAll('.fgt-original-session .gym-exercise')];
  exercises.forEach((el,i)=>{
   const row=m.rows[i];
   const existing=el.querySelector('.fs43-ex-note');if(existing)existing.remove();
   if(!row)return;
   const heading=el.querySelector(':scope > .row');
   if(heading)heading.insertAdjacentHTML('afterend',exerciseNote(row));
  });
 }
 window.addEventListener('forge:view-rendered',event=>{if(event.detail?.tab==='workouts')enhance()});
 document.addEventListener('DOMContentLoaded',enhance,{once:true});
 window.forgeStrengthInsights={model,summary,exerciseNote,enhance};
 enhance();
})();
