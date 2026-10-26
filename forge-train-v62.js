/* FORGE Phase 2 · v62 — in-gym set context and optional local rest preferences.
 * Does not change completed sets, workout completion, or the cloud plan.
 * Preferences are kept per verified account (or a separate guest space), on this device only. */
(()=>{'use strict';
 const DURATIONS=[60,90,120],STORE='forge-rest-preferences-v62:',fmt=n=>String(n)+' sec';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const session=()=>{try{return window.forgeGymV54Snapshot?.()||null}catch{return null}};
 const root=()=>document.getElementById('workouts');
 const legalId=id=>typeof id==='string'&&id.length>0&&id.length<=90&&/^[\w:-]+$/.test(id);
 const validNumber=(n,min,max)=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n))&&Number(n)>=min&&Number(n)<=max;
 let signature='',paused=false,pausedAt='',note='',ephemeral=Object.create(null);
 function owner(){
  try{
   const s=window.forgeAccounts?.getState?.();
   if(s?.status==='ready'&&legalId(s.verifiedUid))return 'user:'+s.verifiedUid;
   if(s?.status==='guest'&&!localStorage.getItem('nourish-last-account-v1'))return 'guest';
  }catch{}
  return '';
 }
 function prefsFor(who=owner()){
  const fresh=Object.create(null);
  if(!who)return fresh;
  try{
   const parsed=JSON.parse(localStorage.getItem(STORE+who)||'{}');
   if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){
    for(const [key,value] of Object.entries(parsed)){
     if(legalId(key)&&DURATIONS.includes(value))fresh[key]=value;
    }
   }
  }catch{}
  return {...fresh,...(ephemeral[who]||{})};
 }
 function setPreference(id,secs){
  const s=session(),who=owner(),n=Number(secs);
  if(!who||!legalId(id)||!DURATIONS.includes(n)||!s?.exercises?.some(ex=>ex.id===id))return false;
  const prefs=prefsFor(who);prefs[id]=n;
  try{localStorage.setItem(STORE+who,JSON.stringify(prefs));note='Rest preference saved on this device.'}
  catch{(ephemeral[who]??=Object.create(null))[id]=n;note='Rest preference set for this open page only; device storage is unavailable.'}
  render();return true;
 }
 function validSet(set,ex){
  return set?.done===true&&validNumber(set.reps,1,1000)&&(!ex.load||validNumber(set.kg,0,600));
 }
 function nextSet(s){
  if(!s||!Array.isArray(s.exercises))return null;
  for(const ex of s.exercises){
   const sets=Array.isArray(ex.sets)?ex.sets:[];
   const idx=sets.findIndex(set=>!validSet(set,ex));
   if(idx>=0)return {exercise:ex,index:idx};
  }
  return null;
 }
 function previousCompleted(s,ex){
  const current=Array.isArray(ex.sets)?ex.sets.filter(set=>validSet(set,ex)):[];
  if(current.length)return {source:'Earlier this session',set:current[current.length-1]};
  const data=(()=>{try{return window.nourishCloudBridge?.getData?.()}catch{return null}})();
  const sessions=data?.workouts?.sessions;
  if(!sessions||typeof sessions!=='object'||!s?.iso||!/^\d{4}-\d{2}-\d{2}$/.test(s.iso))return null;
  for(const date of Object.keys(sessions).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<s.iso).sort().reverse()){
   const sets=sessions[date]?.sets?.[ex.id];
   if(!Array.isArray(sets))continue;
   const checked=sets.filter(set=>validSet(set,ex));
   if(checked.length)return {source:'Last completed '+date,set:checked[checked.length-1]};
  }
  return null;
 }
 function context(s){
  const next=nextSet(s);
  if(!next)return {title:s?.completed?'Workout marked complete':'No pending sets',detail:'No incomplete sets are available in this session.',next:null};
  const ex=next.exercise,last=previousCompleted(s,ex),unit=['sec','min'].includes(ex.unit)?ex.unit:'reps';
  const effort=last?(ex.load?String(Number(last.set.kg))+' kg × ':'')+String(Number(last.set.reps))+' '+unit:'';
  return {title:'Next: '+String(ex.name||ex.id)+' · set '+(next.index+1),
   detail:last?last.source+': '+effort:'No earlier completed effort available for this exercise.',next};
 }
 function currentSignature(s=session()){
  const who=owner();
  return who&&s&&s.id!=='rest'&&Array.isArray(s.exercises)&&s.exercises.length?
   who+'|'+s.iso+'|'+s.id+'|'+s.exercises.map(x=>x.id).join(','):'';
 }
 function syncSession(s=session()){
  const next=currentSignature(s);
  if(next!==signature){signature=next;paused=false;pausedAt='';note=''}
  return !!next;
 }
 function togglePause(value){
  if(!syncSession()||paused===value)return false;
  paused=value;
  pausedAt=value?new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
  note=value?'Session marked paused. Your sets are untouched.':'Session resumed. No sets were changed.';
  render();return true;
 }
 function applyPreference(id,ask=typeof confirm==='function'?confirm:()=>false){
  if(!syncSession())return false;
  const who=owner(),pref=prefsFor(who)[id],s=session();
  if(!s?.exercises?.some(ex=>ex.id===id)||!DURATIONS.includes(pref))return false;
  const timer=window.forgeRestV61,active=timer?.getState?.();
  if(!timer?.setPreset)return false;
  if(active?.running&&!ask('Applying a rest preference will reset the current countdown. Continue?'))return false;
  const ok=timer.setPreset(pref);
  if(ok){note='Rest timer set to '+fmt(pref)+' for this exercise. Start it manually when ready.';render()}
  return !!ok;
 }
 function markup(s=session()){
  if(!syncSession(s))return '';
  const info=context(s);
  return '<section class="fg62-session" role="region" aria-label="Training session controls">'+
   '<div class="fg62-heading"><div><small>FORGE / TRAIN · SESSION FLOW</small><h3>Next set & session status</h3></div>'+
   '<span class="fg62-state" aria-live="polite">'+(paused?'SESSION PAUSED':s.completed?'WORKOUT COMPLETE':'SESSION AVAILABLE')+'</span></div>'+
   '<div class="fg62-next"><strong>'+escape(info.title)+'</strong><p>'+escape(info.detail)+'</p></div>'+
   '<div class="fg62-control"><p>'+(paused?'Paused at '+escape(pausedAt)+'. This is a session note only, not workout completion.':
    'Pause your session when taking a longer break. Your logged sets and completion status will not change.')+'</p>'+
   '<button type="button" data-fg62-pause aria-pressed="'+paused+'">'+(paused?'Resume session':'Pause session')+'</button></div>'+
   '<p class="fg62-footnote">Session pause is a note for this open app, not a saved workout event. Rest choices below are stored only on this device, separately per account. Your sets remain editable.</p>'+
   (note?'<p class="fg62-message" role="status">'+escape(note)+'</p>':'')+'</section>';
 }
 function render(){
  const r=root();if(!r||r.classList?.contains('hidden'))return;
  const s=session(),active=syncSession(s);
  if(!active){r.querySelector('.fg62-session')?.remove();r.querySelectorAll('.fg62-exercise').forEach(el=>el.remove());return}
  const first=r.querySelector('.gym-exercise[data-gym-exid]'),card=first?.closest('.card');
  if(!card)return;
  let panel=card.querySelector('.fg62-session');
  if(!panel){panel=document.createElement('div');panel.className='fg62-session';
   const timer=card.querySelector('.fg61-timer'),progress=card.querySelector('.gym54-progress');
   if(timer)timer.insertAdjacentElement('afterend',panel);
   else if(progress)progress.insertAdjacentElement('afterend',panel);
   else card.insertBefore(panel,card.firstChild);
  }
  panel.outerHTML=markup(s);
  const preferences=prefsFor();
  for(const el of r.querySelectorAll('.gym-exercise[data-gym-exid]')){
   const id=el.getAttribute('data-gym-exid'),ex=s.exercises.find(x=>x.id===id);
   if(!legalId(id)||!ex)continue;
   let row=el.querySelector('.fg62-exercise');
   if(!row){row=document.createElement('div');row.className='fg62-exercise';
    const head=el.querySelector('.row');if(head)head.insertAdjacentElement('afterend',row);else el.prepend(row);
   }
   const pref=preferences[id]||0;
   row.innerHTML='<label>Rest after '+escape(ex.name)+'<select data-fg62-exercise="'+escape(id)+'" aria-label="Rest preference for '+escape(ex.name)+'">'+
    '<option value="0" '+(!pref?'selected':'')+'>Not set</option>'+
    DURATIONS.map(n=>'<option value="'+n+'" '+(n===pref?'selected':'')+'>'+fmt(n)+'</option>').join('')+'</select></label>'+
    '<button type="button" data-fg62-apply="'+escape(id)+'" '+(!pref?'disabled':'')+'>Use in rest timer</button>';
  }
 }
 document.addEventListener('change',event=>{
  const el=event.target?.closest?.('[data-fg62-exercise]');
  if(!el||!root()?.contains(el))return;
  const id=el.getAttribute('data-fg62-exercise'),v=Number(el.value);
  if(v===0){
   const who=owner();if(!who)return;
   const prefs=prefsFor(who);delete prefs[id];if(ephemeral[who])delete ephemeral[who][id];
   try{localStorage.setItem(STORE+who,JSON.stringify(prefs));note='Rest preference cleared.'}
   catch{note='Device storage unavailable; preference may return when this page reloads.'}
   render();
  }else setPreference(id,v);
 });
 document.addEventListener('click',event=>{
  const el=event.target?.closest?.('[data-fg62-pause],[data-fg62-apply]');
  if(!el||!root()?.contains(el))return;
  if(el.hasAttribute('data-fg62-pause'))togglePause(!paused);
  else applyPreference(el.getAttribute('data-fg62-apply'));
 });
 window.addEventListener('forge:view-rendered',event=>{if(event.detail?.tab==='workouts')render()});
 window.addEventListener('forge:cloud-session',()=>{signature='';paused=false;pausedAt='';note='';render()});
 window.addEventListener('forge:cloud-conflict',()=>{signature='';paused=false;pausedAt='';note='';render()});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
 window.forgeTrainV62={prefsFor,setPreference,validSet,nextSet,previousCompleted,context,markup,render,applyPreference,togglePause,syncSession,getState:()=>({signature,paused,pausedAt,note})};
})();
