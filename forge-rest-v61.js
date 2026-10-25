/* FORGE Phase 2 · v61 — opt-in in-gym rest timer.
 * Read-only workout integration. No changes to workout sets, storage or cloud documents.
 * Uses absolute time deadlines so throttled background tabs cannot create fake seconds. */
(()=>{'use strict';
 const defaults=[60,90,120],fmt=v=>String(Math.floor(Math.max(0,v)/60)).padStart(2,'0')+':'+String(Math.max(0,v)%60).padStart(2,'0');

 let seconds=90,remaining=90,deadline=null,running=false,finished=false,sessionKey='',interval=null;
 const now=()=>Date.now();
 const workout=()=>{try{return window.forgeGymV54Snapshot?.()||null}catch{return null}};
 const output=()=>document.getElementById('workouts');
 const validSession=s=>!!s&&s.id!=='rest'&&Array.isArray(s.exercises)&&s.exercises.length>0;
 function clearTicker(){if(interval!==null){clearInterval(interval);interval=null}}
 function reset({clearSession=false}={}){
  clearTicker();seconds=90;remaining=90;deadline=null;running=false;finished=false;
  if(clearSession)sessionKey='';
  renderDisplay();return getState();
 }
 function getState(){
  const actual=running?Math.max(0,Math.ceil((deadline-now())/1000)):remaining;
  return {seconds,remaining:actual,running,finished,sessionKey};
 }
 function keepTicking(){
  clearTicker();if(running)interval=setInterval(tick,300);
 }
 function tick(){
  if(!running)return getState();
  remaining=Math.max(0,Math.ceil((deadline-now())/1000));
  if(remaining===0){
   running=false;finished=true;deadline=null;clearTicker();
   try{if(document.visibilityState!=='hidden'&&navigator.vibrate)navigator.vibrate([130,80,130])}catch{}
  }
  renderDisplay();return getState();
 }
 function setPreset(preset){
  if(!defaults.includes(Number(preset)))return false;
  seconds=Number(preset);remaining=seconds;deadline=null;running=false;finished=false;clearTicker();render();
  return true;
 }
 function start(){
  if(!validSession(workout()))return false;
  if(running)return true;
  if(remaining<=0)remaining=seconds;
  finished=false;running=true;deadline=now()+remaining*1000;
  keepTicking();render();return true;
 }
 function pause(){
  if(!running)return false;
  remaining=Math.max(0,Math.ceil((deadline-now())/1000));deadline=null;running=false;
  clearTicker();render();return true;
 }
 function add15(){
  if(running)deadline+=15000;
  else remaining=Math.min(900,remaining+15);
  if(!running)finished=false;
  renderDisplay();return true;
 }
 function sessionChanged(){
  const s=workout();const next=validSession(s)?s.iso+'|'+s.id:'';
  if(next!==sessionKey){reset();sessionKey=next;}
  return !!next;
 }
 function view(){
  const state=getState();
  const hint=state.finished?'Rest complete — continue when ready.':
   state.running?'Timer running · you control when to start your next set.':
   state.remaining!==state.seconds?'Timer paused · resume when ready.':
   'Choose a preset, then start when your set is done.';
  return '<section class="fg61-timer" role="group" aria-label="Workout rest timer">'+
   '<div class="fg61-top"><div><small>FORGE / TRAIN</small><h3>Rest & recover</h3></div>'+
   '<span class="fg61-status" data-fg61-status aria-live="polite">'+(state.finished?'REST COMPLETE':state.running?'COUNTING DOWN':'READY')+'</span></div>'+
   '<div class="fg61-display"><strong data-fg61-clock role="timer" aria-label="Remaining rest time">'+fmt(state.remaining)+'</strong>'+
   '<p data-fg61-hint>'+hint+'</p></div>'+
   '<div class="fg61-presets" role="group" aria-label="Rest duration">'+defaults.map(p=>'<button type="button" data-fg61-preset="'+p+'" aria-pressed="'+(state.seconds===p)+'">'+p+' sec</button>').join('')+'</div>'+
   '<div class="fg61-actions"><button type="button" data-fg61-primary class="fg61-primary">'+(state.running?'Pause rest':state.finished?'Start again':state.remaining!==state.seconds?'Resume rest':'Start rest')+'</button>'+
   '<button type="button" data-fg61-add>+15 sec</button><button type="button" data-fg61-reset>Reset</button></div>'+
   '<p class="fg61-note">Manual timer only · no sets are marked complete · does not send any data to the cloud.</p></section>';
 }
 function renderDisplay(){
  const root=output(),area=root?.querySelector('.fg61-timer');
  if(!area)return;
  const s=getState(),clock=area.querySelector('[data-fg61-clock]'),status=area.querySelector('[data-fg61-status]'),hint=area.querySelector('[data-fg61-hint]'),button=area.querySelector('[data-fg61-primary]');
  if(clock)clock.textContent=fmt(s.remaining);
  if(status)status.textContent=s.finished?'REST COMPLETE':s.running?'COUNTING DOWN':'READY';
  if(hint)hint.textContent=s.finished?'Rest complete — continue when ready.':s.running?'Timer running · you control when to start your next set.':s.remaining!==s.seconds?'Timer paused · resume when ready.':'Choose a preset, then start when your set is done.';
  if(button)button.textContent=s.running?'Pause rest':s.finished?'Start again':s.remaining!==s.seconds?'Resume rest':'Start rest';
  area.classList.toggle('fg61-done',s.finished);
 }
 function render(){
  const root=output();if(!root||root.classList?.contains('hidden'))return;
  if(!sessionChanged()){root.querySelector('.fg61-timer')?.remove();return}
  const first=root.querySelector('.gym-exercise[data-gym-exid]');
  const card=first?.closest('.card');if(!card)return;
  let timer=card.querySelector('.fg61-timer');
  if(!timer){
   timer=document.createElement('div');timer.className='fg61-timer';
   const progress=card.querySelector('.gym54-progress');
   if(progress?.parentNode===card)progress.insertAdjacentElement('afterend',timer);
   else card.insertBefore(timer,card.firstChild);
  }
  timer.outerHTML=view();
  renderDisplay();
 }
 document.addEventListener('click',e=>{
  const btn=e.target?.closest?.('[data-fg61-preset],[data-fg61-primary],[data-fg61-add],[data-fg61-reset]');
  if(!btn||!output()?.contains(btn))return;
  if(btn.hasAttribute('data-fg61-preset'))setPreset(btn.getAttribute('data-fg61-preset'));
  else if(btn.hasAttribute('data-fg61-primary'))(running?pause:start)();
  else if(btn.hasAttribute('data-fg61-add'))add15();
  else {reset();render();}
 });
 window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='workouts')render()});
 window.addEventListener('forge:cloud-session',e=>{if(e.detail?.state==='guest'||e.detail?.state==='checking')reset({clearSession:true})});
 window.addEventListener('forge:cloud-conflict',()=>reset({clearSession:true}));
 window.addEventListener('pagehide',clearTicker);
 window.addEventListener('pageshow',()=>{if(running){tick();keepTicking()}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
 window.forgeRestV61={getState,setPreset,start,pause,add15,tick,reset,sessionChanged,view,render,fmt};
})();