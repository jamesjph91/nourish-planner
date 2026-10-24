/* FORGE v54 — faster gym flow. Read-only summary; explicit existing controls perform all writes. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const range=(value,min,max)=>value!==''&&value!==null&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>=min&&Number(value)<=max?Number(value):null;
function summary(snapshot={}){
 const active=Array.isArray(snapshot.exercises)?snapshot.exercises:[];
 const history=Array.isArray(snapshot.history)?snapshot.history:active;
 const validDone=(set,exercise)=>set?.done===true&&range(set.reps,1,1000)!==null&&(!exercise.load||range(set.kg,0,600)!==null);
 const planned=active.reduce((n,ex)=>n+(Array.isArray(ex.sets)?ex.sets.length:0),0);
 const completed=active.reduce((n,ex)=>n+(Array.isArray(ex.sets)?ex.sets.filter(x=>validDone(x,ex)).length:0),0);
 let next=null;
 for(const ex of active){
  const sets=Array.isArray(ex.sets)?ex.sets:[];
  const index=sets.findIndex(x=>!validDone(x,ex));
  if(index>=0){next={id:ex.id,name:ex.name,index};break}
 }
 const recap=history.map(ex=>{
  const sets=(Array.isArray(ex.sets)?ex.sets:[]).filter(s=>validDone(s,ex));
  if(!sets.length)return null;
  const weights=ex.load?sets.map(s=>Number(s.kg)):[];
  return {id:ex.id,name:String(ex.name),sets:sets.length,unit:ex.unit||'reps',loaded:!!ex.load,
   bestWeight:weights.length?Math.max(...weights):null,
   totalReps:sets.reduce((n,s)=>n+Number(s.reps),0),
   volume:ex.load?sets.reduce((n,s)=>n+Number(s.kg)*Number(s.reps),0):null,
   archived:!active.some(x=>x.id===ex.id)};
 }).filter(Boolean);
 const allCompleted=recap.reduce((n,ex)=>n+ex.sets,0);
 return {planned,completed,next,percent:planned?Math.round(completed/planned*100):0,
  finished:snapshot.completed===true,recap,allCompleted,date:snapshot.iso||''};
}
function controls(model){
 const next=model.next;
 return '<div class="gym54-progress" role="region" aria-label="In-gym workout progress">'+
 '<div class="gym54-progress-head"><span>FORGE / LIVE SESSION</span><strong>'+model.completed+' / '+model.planned+' sets</strong></div>'+
 '<div class="gym54-meter" role="progressbar" aria-label="Completed sets" aria-valuemin="0" aria-valuemax="'+model.planned+'" aria-valuenow="'+model.completed+'"><i style="width:'+model.percent+'%"></i></div>'+
 '<div class="gym54-quick-row"><div><b>'+(next?'Next: '+esc(next.name)+' · Set '+(next.index+1):model.planned?'All planned sets checked':'Add exercises to start')+'</b>'+
 '<small>'+(model.finished?'Workout marked finished · recap below':model.planned?'Completed sets only · no automatic ticks':'This session has no sets yet')+'</small></div>'+
 (next?'<button type="button" data-gym54-next>Jump to next set ↗</button>':'<button type="button" disabled>Nothing left to jump to</button>')+'</div></div>';
}
function recap(model){
 if(!model.finished)return '';
 return '<section class="gym54-recap" aria-label="Completed workout recap">'+
 '<div class="gym54-recap-top"><small>FORGE / WORKOUT RECAP</small><h3>Session complete.</h3><p>Results below come only from your checked, valid sets. Unchecked or incomplete entries are excluded.</p></div>'+
 '<div class="gym54-recap-total"><b>'+model.allCompleted+'</b><span>completed sets · '+model.recap.length+' exercised movement'+(model.recap.length===1?'':'s')+'</span></div>'+
 (model.recap.length?'<div class="gym54-recap-list">'+model.recap.map(x=>
 '<div class="gym54-recap-item"><div><strong>'+esc(x.name)+'</strong><small>'+x.sets+' completed sets'+(x.archived?' · removed from current lineup':'')+'</small></div>'+
 '<span>'+(x.loaded&&x.bestWeight!==null?esc(x.bestWeight)+' kg best · ':'')+esc(x.totalReps)+' '+esc(x.unit)+(x.loaded&&x.volume!==null?' · '+Math.round(x.volume*10)/10+' kg × reps':'')+'</span></div>').join('')+'</div>':
 '<p class="gym54-recap-empty">No valid completed set values were recorded. Your unfinished sets were not included.</p>')+
 '</section>';
}
function screen(){return document.getElementById('workouts')}
function workoutSnapshot(){try{return window.forgeGymV54Snapshot?.()||null}catch{return null}}
function update(){
 const root=screen();
 if(!root||root.classList?.contains('hidden')||typeof window.forgeGymV54Snapshot!=='function')return;
 const snap=workoutSnapshot();if(!snap)return;
 const model=summary(snap);
 const first=root.querySelector('.gym-exercise[data-gym-exid]');
 if(!first){root.querySelector('.gym54-progress')?.remove();root.querySelector('.gym54-recap')?.remove();return}
 const card=first.closest('.card');if(!card)return;
 let bar=card.querySelector('.gym54-progress');
 if(!bar){bar=document.createElement('div');card.insertBefore(bar,card.firstChild)}
 bar.outerHTML=controls(model);
 for(const node of card.querySelectorAll('.gym-exercise[data-gym-exid]')){
  const focused=!!model.next&&node.getAttribute('data-gym-exid')===model.next.id;
  node.classList.toggle('gym54-current',focused);
  node.setAttribute('aria-label',(focused?'Current exercise: ':'Exercise: ')+(node.querySelector('strong')?.textContent||node.getAttribute('data-gym-exid')));
  for(const row of node.querySelectorAll('.gym-setrow[data-gym-set-index]')){
   const on=focused&&Number(row.getAttribute('data-gym-set-index'))===model.next.index;
   row.classList.toggle('gym54-next-row',on);
  }
 }
 let panel=card.querySelector('.gym54-recap');
 if(model.finished){
  if(!panel){panel=document.createElement('div');card.append(panel)}
  panel.outerHTML=recap(model);
 }else panel?.remove();
}
function jump(){
 const root=screen(),model=summary(workoutSnapshot()||{});
 if(!model.next||!root)return false;
 const selector='.gym-exercise[data-gym-exid="'+model.next.id+'"] .gym-setrow[data-gym-set-index="'+model.next.index+'"]';
 const row=root.querySelector(selector);
 if(!row)return false;
 row.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 const control=row.querySelector('input[type="number"]')||row.querySelector('input[type="checkbox"]');
 try{control?.focus?.({preventScroll:true})}catch{control?.focus?.()}
 return true;
}
document.addEventListener('click',e=>{if(e.target?.closest?.('[data-gym54-next]'))jump()});
document.addEventListener('change',e=>{if(e.target?.closest?.('#workouts .gym-exercise'))Promise.resolve().then(update)});
window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='workouts')update()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update,{once:true});else update();
window.forgeGymV54={summary,controls,recap,update,jump};
})();