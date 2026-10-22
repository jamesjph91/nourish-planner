/* FORGE Train v27: in-gym control surface over the existing workout engine.
   No independent workout writes: gym.js remains the sole source of truth. */
(()=>{'use strict';
const tabNames=['Plan','Exercises','History'];
let active='Plan',restDuration=90,restRemaining=90,restDeadline=0,restInterval=null;
const root=()=>document.getElementById('workouts');
const iso=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const parse=()=>{try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}};
const integer=x=>Number.isFinite(Number(x))?Math.floor(Number(x)):0;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateNice=dt=>/^\d{4}-\d{2}-\d{2}$/.test(dt)?new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(dt+'T12:00:00')):'Select a training day';
function snapshot(s=parse()){
 const w=s.workouts||{},today=iso(),selected=w.selected||today,day=new Date(selected+'T12:00:00'),weekday=Number.isFinite(day.getTime())?day.getDay():-1;
 const dow={1:'A',3:'B',5:'C',6:s.settings?.extraGym?'D':'rest'};
 const dIndex=w.startDate&&/^\d{4}-\d{2}-\d{2}$/.test(w.startDate)?Math.round((new Date(selected+'T12:00:00')-new Date(w.startDate+'T12:00:00'))/86400000)+1:null;
 const planned=dow[weekday]||'rest';
 const scheduled=w.schedule?.[selected]||((dIndex>=1&&dIndex<=28&&s.gym?.[dIndex]===false)?'rest':((dIndex>=1&&dIndex<=28&&s.gym?.[dIndex]===true&&planned==='rest')?'A':planned));
 const session=w.sessions?.[selected]||null;
 const ids=Array.isArray(session?.exerciseIds)?session.exerciseIds:[];
 const activeSets=ids.flatMap(id=>Array.isArray(session?.sets?.[id])?session.sets[id]:[]);
 const completed=activeSets.filter(x=>x?.done).length;
 const completedSessions=Object.entries(w.sessions||{}).filter(([,v])=>v?.completed).length;
 const logCount=Object.values(w.sessions||{}).reduce((n,v)=>n+Object.values(v?.sets||{}).reduce((a,arr)=>a+(Array.isArray(arr)?arr.filter(row=>row?.done).length:0),0),0);
 const recordedSelected=Object.values(w.sessions||{}).filter(x=>x?.completed).length;
 return {selected,today,scheduled,session,ids,total:activeSets.length,completed,percent:activeSets.length?Math.min(100,Math.round(completed/activeSets.length*100)):0,finished:!!session?.completed,completedSessions,logCount,recordedSelected};
}
function ownData(){return snapshot()}
function timerLabel(seconds){const min=Math.floor(seconds/60),sec=seconds%60;return String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0')}
function stopTimer(){if(restInterval!==null){clearInterval(restInterval);restInterval=null}restDeadline=0}
function updateClock(){
 if(restDeadline){restRemaining=Math.max(0,Math.ceil((restDeadline-Date.now())/1000));if(restRemaining===0)stopTimer()}
 const label=root()?.querySelector('[data-fgt-clock]');if(label)label.textContent=timerLabel(restRemaining);
 const button=root()?.querySelector('[data-fgt-rest-toggle]');if(button)button.textContent=restDeadline?'Pause rest':'Start rest';
}
function changeTimer(next){
 if(![60,90,120,180].includes(next))return;
 restDuration=next;stopTimer();restRemaining=next;updateClock();
}
function toggleTimer(){
 if(restDeadline){updateClock();stopTimer();updateClock();return}
 if(restRemaining<=0)restRemaining=restDuration;
 restDeadline=Date.now()+restRemaining*1000;
 restInterval=setInterval(updateClock,250);updateClock();
}
function resetTimer(){stopTimer();restRemaining=restDuration;updateClock()}
function findParts(r){
 const cards=[...r.querySelectorAll(':scope > .card')];
 const calendar=cards.find(c=>!!c.querySelector('.gym-calendar'));
 const start=cards.find(c=>!!c.querySelector('#gym-start'));
 const session=cards.find(c=>!!c.querySelector('.gym-exercise')||/YOUR SESSION/.test(c.textContent||''));
 const stats=r.querySelector(':scope > .grid4');
 const history=cards.find(c=>!!c.querySelector('.gym-history')||/Your recent exercise results/.test(c.textContent||''));
 const heading=[...r.querySelectorAll(':scope > .sectionhead')].find(c=>/^Progress$/.test(c.textContent.trim()));
 return {calendar,start,session,stats,history,heading};
}
function improveExercise(session,s){
 if(!session)return;
 session.classList.add('fgt-session-card');
 const totalNodes=[...session.querySelectorAll('.gym-exercise')];
 const keys=Array.isArray(s.session?.exerciseIds)?s.session.exerciseIds:[];
 totalNodes.forEach((ex,i)=>{
  ex.classList.add('fgt-exercise-card');
  const ticks=[...ex.querySelectorAll('.gym-setrow input[type="checkbox"]')];
  const done=ticks.filter(x=>x.checked).length;
  ex.classList.toggle('fgt-exercise-done',ticks.length>0&&done===ticks.length);
  const first=ex.querySelector('.row strong');
  if(first&&!ex.querySelector('.fgt-ex-counter')){
   const badge=document.createElement('span');badge.className='fgt-ex-counter';
   badge.textContent=String(i+1).padStart(2,'0');first.before(badge);
  }
  const info=ex.querySelector(':scope > .row');
  if(info){
   let chip=info.querySelector('.fgt-ex-state');
   if(!chip){chip=document.createElement('span');chip.className='fgt-ex-state';info.append(chip)}
   chip.textContent=done+'/'+ticks.length+' sets';
   chip.classList.toggle('finished',ticks.length>0&&done===ticks.length);
  }
  ticks.forEach(t=>{t.style.accentColor='#b9ff16'});
 });
}
function panel(s){
 const rest=s.scheduled==='rest';
 const title=s.session?.id ? s.session.id.replace(/[^A-D]/g,'') : (rest?'REST':s.scheduled);
 return '<div class="fgt-command">'+
 '<div class="fgt-heading"><div><span class="fgt-kicker">TRAIN · GET STRONGER</span><h1>Train<span>.</span></h1><p>Adapt your workout. Track every rep.</p></div><span class="fgt-icon">⚒</span></div>'+
 '<nav class="fgt-tabs" aria-label="Train screen">'+tabNames.map(t=>'<button type="button" data-fgt-view="'+t+'" aria-pressed="'+(t===active)+'" class="'+(active===t?'on':'')+'">'+t+'</button>').join('')+'</nav>'+
 (active==='History'?'<section class="fgt-snapshot"><span>YOUR TRAINING HISTORY</span><h2>'+s.completedSessions+' completed sessions</h2><p>'+s.logCount+' completed sets recorded across your history. Review individual movements and export your log below.</p></section>':
 '<section class="fgt-snapshot"><div class="fgt-snapshot-top"><span>'+escape(dateNice(s.selected))+'</span><b>'+escape(s.scheduled==='rest'?'RECOVERY DAY':s.finished?'✓ COMPLETE':s.completed?'● SESSION IN PROGRESS':'WORKOUT PLANNED')+'</b></div>'+
 '<h2>'+escape(rest?'Recovery session':(s.session?.id?'Routine '+s.session.id:'Routine '+title))+'</h2>'+
 '<p>'+escape(rest?'Recovery is part of training. Assign a workout below if you want to train today.':'Record weight and repetitions, tick completed sets and swap exercises whenever you need to.')+'</p>'+
 (!rest?'<div class="fgt-progress-head"><span>SESSION PROGRESS</span><strong>'+s.completed+' / '+s.total+' sets</strong></div><div class="fgt-progress"><i style="width:'+s.percent+'%"></i></div>'+
 '<div class="fgt-quick-actions"><button type="button" class="primary" data-fgt-action="jump">▶ '+(s.finished?'View completed session':'Open session')+'</button><button type="button" data-fgt-action="library">＋ Add exercise</button></div>':
 '<div class="fgt-quick-actions"><button type="button" class="primary" data-fgt-action="assign">Choose a workout ↗</button></div>')+
 '</section>'+
 (active==='Exercises'&&!rest?'<section class="fgt-rest"><div><small>BETWEEN SETS</small><strong data-fgt-clock>'+timerLabel(restRemaining)+'</strong></div><label>Rest duration <select data-fgt-duration>'+[60,90,120,180].map(n=>'<option value="'+n+'" '+(n===restDuration?'selected':'')+'>'+n+' sec</option>').join('')+'</select></label><button data-fgt-rest-toggle type="button">'+(restDeadline?'Pause rest':'Start rest')+'</button><button data-fgt-action="reset-rest" type="button" aria-label="Reset rest timer">↻</button></section>':'')+
 (active==='Exercises'&&!rest?'<div class="fgt-explainer">The exercise list below is editable during your workout. <b>Replace, add, remove or reorder</b> without changing your permanent routine until you choose Save as my routine.</div>':'')
 )+'</div>';
}
function enhance(){
 const r=root();
 if(!r||!document.querySelector('#nav [data-tab="workouts"].on'))return;
 const s=snapshot(),parts=findParts(r);
 if(!r.querySelector('.fgt-command')){const holder=document.createElement('div');holder.className='fgt-command-mount';r.prepend(holder)}
 r.querySelector('.fgt-command-mount').innerHTML=panel(s);
 r.classList.add('forge-train-v27');
 r.dataset.fgtTab=active.toLowerCase();
 for(const [key,node] of Object.entries(parts))if(node)node.classList.add('fgt-original-'+key);
 improveExercise(parts.session,s);
 // Do not move or clone real form inputs: values, listeners and save handlers remain owned by gym.js.
 updateClock();
}
function goOriginal(target){
 const r=root();if(!r)return;
 const fn=target==='jump'?(r.querySelector('.gym-exercise')||r.querySelector('.fgt-original-session')):target==='assign'?r.querySelector('.fgt-original-session select[aria-label="Assign workout"]'):null;
 if(fn){fn.scrollIntoView?.({behavior:'smooth',block:'start'});if(target==='assign')fn.focus?.()}
}
document.addEventListener('click',event=>{
 const r=root();if(!r?.contains(event.target))return;
 const view=event.target.closest?.('[data-fgt-view]');
 if(view){if(!tabNames.includes(view.dataset.fgtView))return;active=view.dataset.fgtView;enhance();return}
 const action=event.target.closest?.('[data-fgt-action]');
 if(action){
  if(action.dataset.fgtAction==='jump'||action.dataset.fgtAction==='assign')goOriginal(action.dataset.fgtAction);
  else if(action.dataset.fgtAction==='library'){const s=snapshot();if(s.scheduled!=='rest'&&typeof window.gymLibrary==='function')window.gymLibrary(s.selected)}
  else if(action.dataset.fgtAction==='reset-rest')resetTimer();
  return;
 }
 if(event.target.closest?.('[data-fgt-rest-toggle]'))toggleTimer();
});
document.addEventListener('change',event=>{const v=event.target.closest?.('[data-fgt-duration]');if(v&&root()?.contains(v))changeTimer(Number(v.value))});
window.addEventListener('forge:view-rendered',event=>{if(event.detail?.tab==='workouts')enhance()});
document.addEventListener('DOMContentLoaded',enhance,{once:true});
window.forgeTrainCoach={enhance,snapshot,changeTimer,timerLabel};
})();