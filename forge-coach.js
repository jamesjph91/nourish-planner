/* FORGE v34 — integrated seven-day review, exercise bests and food-portion shortcuts.
   Read-only metrics over the existing validated diary, gym and activity state.
   Does not create a fictional smartwatch connection or alter private data. */
(()=>{'use strict';
const KEY='nourishHigherDeficitV1';
const number=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
const val=v=>number(v)?Number(v):0;
const fmt=(v,d=0)=>Number(v||0).toLocaleString('en-GB',{maximumFractionDigits:d,minimumFractionDigits:d});
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const shift=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return local(d)};
function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');return s&&typeof s==='object'&&!Array.isArray(s)?s:{}}catch{return {}}}
function review(state,reference=local(new Date())){
 const from=shift(reference,-6),within=x=>typeof x==='string'&&x>=from&&x<=reference;
 const logged=(Array.isArray(state.foodDiary?.entries)?state.foodDiary.entries:[]).filter(x=>x&&within(x.date));
 const sums=new Map();
 for(const entry of logged){const before=sums.get(entry.date)||{kcal:0,protein:0,items:0};before.kcal+=val(entry.totals?.kcal);before.protein+=val(entry.totals?.protein);before.items++;sums.set(entry.date,before)}
 const days=[...sums.values()],intakeDays=days.length;
 const completed=Object.entries(state.workouts?.sessions||{}).filter(([date,row])=>within(date)&&row?.completed);
 const sets=completed.flatMap(([date,row])=>Object.entries(row.sets||{}).flatMap(([id,list])=>Array.isArray(list)?list.filter(z=>z?.done).map(z=>({date,id,kg:val(z.kg),reps:val(z.reps)})):[]));
 const weighted=sets.filter(z=>z.kg>0&&z.reps>0);
 const activities=(Array.isArray(state.healthActivity?.daily)?state.healthActivity.daily:[]).filter(x=>x&&within(x.date));
 const steps=activities.filter(x=>number(x.steps));
 const sleep=activities.filter(x=>number(x.sleepMinutes));
 const last=state.measurements&&Array.isArray(state.measurements)?state.measurements.filter(x=>within(x?.date)&&number(x.weightKg)).sort((a,b)=>a.date.localeCompare(b.date)):[];
 const volume=weighted.reduce((a,x)=>a+x.kg*x.reps,0);
 return {from,to:reference,intakeDays,totalKcal:days.reduce((a,x)=>a+x.kcal,0),avgKcal:intakeDays?days.reduce((a,x)=>a+x.kcal,0)/intakeDays:null,avgProtein:intakeDays?days.reduce((a,x)=>a+x.protein,0)/intakeDays:null,
  mealEntries:logged.length,workouts:completed.length,sets:sets.length,volume,stepsDays:steps.length,avgSteps:steps.length?steps.reduce((a,x)=>a+val(x.steps),0)/steps.length:null,
  sleepDays:sleep.length,avgSleepHours:sleep.length?sleep.reduce((a,x)=>a+val(x.sleepMinutes),0)/sleep.length/60:null,
  weightChange:last.length>=2&&last.at(-1).date!==last[0].date?last.at(-1).weightKg-last[0].weightKg:null,weightReadings:last.length};
}
function bests(state){
 const records=new Map(),sessions=Object.entries(state.workouts?.sessions||{}).filter(([date,row])=>row?.completed&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date<=local(new Date()));
 for(const [date,session] of sessions)for(const [id,list] of Object.entries(session.sets||{})){
  if(!Array.isArray(list))continue;
  for(const set of list){if(!set?.done||!number(set.kg)||!number(set.reps)||Number(set.kg)<=0||Number(set.reps)<=0)continue;
   const kg=Number(set.kg),reps=Number(set.reps),previous=records.get(id);
   if(!previous||kg>previous.kg||(kg===previous.kg&&reps>previous.reps))records.set(id,{id,kg,reps,date});
  }
 }
 return [...records.values()].sort((a,b)=>b.date.localeCompare(a.date)||b.kg-a.kg);
}
function metric(label,value,note){return '<div class="fc34-stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(note)+'</span></div>'}
function summaryMarkup(r){
 return '<section class="fc34-panel fc34-weekly" aria-label="Your seven day FORGE review"><div class="fc34-heading"><div><small>FORGE · YOUR SEVEN-DAY REVIEW</small><h3>Consistency report</h3></div><span>'+esc(r.from)+' – '+esc(r.to)+'</span></div>'+
 '<div class="fc34-metrics">'+
 metric('FOOD RECORDED',r.intakeDays+' / 7','Days with entries, not assumed adherence')+
 metric('AVERAGE INTAKE',r.avgKcal===null?'—':fmt(r.avgKcal)+' kcal',r.intakeDays+' recorded day'+(r.intakeDays===1?'':'s'))+
 metric('AVERAGE PROTEIN',r.avgProtein===null?'—':fmt(r.avgProtein)+' g','Recorded days only')+
 metric('COMPLETED WORKOUTS',String(r.workouts),r.sets+' completed sets')+
 metric('AVERAGE STEPS',r.avgSteps===null?'—':fmt(r.avgSteps),r.stepsDays+' days recorded')+
 metric('AVERAGE SLEEP',r.avgSleepHours===null?'—':fmt(r.avgSleepHours,1)+' h',r.sleepDays+' days recorded')+
 '</div><p class="fc34-fineprint">Missing food, activity and sleep records are excluded from averages, not counted as zero. Workout counts come from sessions marked completed; this report does not prescribe calorie adjustments.</p></section>';
}
function trainMarkup(list){
 return '<section class="fc34-panel fc34-bests"><div class="fc34-heading"><div><small>TRAIN · EARNED, NOT ESTIMATED</small><h3>Your heaviest logged sets</h3></div><span>'+list.length+' movements</span></div>'+
 (list.length?'<div class="fc34-bests-grid">'+list.slice(0,8).map(x=>'<div class="fc34-best"><b>'+esc(typeof window.nourishGymExerciseName==='function'?window.nourishGymExerciseName(x.id):x.id)+'</b><strong>'+fmt(x.kg,1)+' kg <span>× '+fmt(x.reps)+' reps</span></strong><small>'+esc(x.date)+'</small></div>').join('')+'</div>':'<p class="fc34-empty">No completed weighted sets recorded yet. Mark your sets complete in Train and finish a session to populate this area.</p>')+
 '<p class="fc34-fineprint">These are the heaviest completed sets recorded per movement, not one-rep-max estimates or automatic weight prescriptions. Equipment and form can vary.</p></section>';
}
function integrityMarkup(s){
 const meals=Array.isArray(s.foodDiary?.entries)?s.foodDiary.entries.length:0,workouts=Object.values(s.workouts?.sessions||{}).filter(x=>x?.completed).length,measurements=Array.isArray(s.measurements)?s.measurements.length:0;
 const foods=Array.isArray(s.foodDiary?.savedFoods)?s.foodDiary.savedFoods.length:0,activity=Array.isArray(s.healthActivity?.daily)?s.healthActivity.daily.length:0;
 return '<section class="fc34-panel fc34-data" aria-label="FORGE data and backups"><div class="fc34-heading"><div><small>SETTINGS · YOUR DATA</small><h3>Data health & safety</h3></div><span>Private records</span></div>'+
 '<div class="fc34-metrics">'+metric('FOOD LOGS',String(meals),'Diary entries')+metric('SAVED FOODS',String(foods),'Reusable foods')+metric('WORKOUTS',String(workouts),'Completed')+metric('MEASUREMENTS',String(measurements),'Body metrics')+metric('ACTIVITY DAYS',String(activity),'Manual/imported')+'</div>'+
 '<div class="fc34-actions"><button type="button" data-fc34-backup>↓ Download FORGE backup</button><button type="button" data-fc34-help>Backup & restore guide</button></div>'+
 '<div class="fc34-guide" hidden><p>Your downloaded JSON backup includes your private planner, custom meals, workout history, diary and supported activity records. Photos stored locally in the separate photo journal are <b>not included</b> in the JSON export.</p><p>Keep the backup somewhere safe. To restore, use the existing <b>Import backup</b> control in Settings. Never clear your phone’s browser data before confirming your records are saved.</p><p>Watch syncing still requires Android-side Health Connect authorisation. Social sharing is not enabled by this panel.</p></div>'+
 '<p class="fc34-fineprint">These counts describe locally available records. They do not prove cloud sync has completed or that the downloaded file was safely backed up elsewhere.</p></section>';
}
function portionMarkup(){
 const unit=document.getElementById('fd-unit')?.value||'g';
 const values=unit==='portion'?[0.5,1,1.5,2]:[50,100,150,200,250];
 return '<div class="fc34-portion"><span>QUICK AMOUNT · '+(unit==='portion'?'PORTIONS':unit.toUpperCase())+'</span><div>'+values.map(x=>'<button type="button" data-fc34-quantity="'+x+'">'+x+(unit==='portion'?'×':' '+unit)+'</button>').join('')+'</div><small>Set how much you ate. Review the package nutrition per 100 g/ml or per portion before saving.</small></div>';
}
function enhance(tab){
 if(tab==='overview'){
  const area=document.getElementById('overview');if(!area)return;
  const old=area.querySelector('.fc34-weekly');if(old)old.remove();
  area.insertAdjacentHTML('beforeend',summaryMarkup(review(read())));
 }else if(tab==='workouts'){
  const area=document.getElementById('workouts');if(!area)return;
  const old=area.querySelector('.fc34-bests');if(old)old.remove();
  const anchor=area.querySelector('.fgt-command-mount');
  if(anchor)anchor.insertAdjacentHTML('afterend',trainMarkup(bests(read())));
  else area.insertAdjacentHTML('beforeend',trainMarkup(bests(read())));
 }else if(tab==='settings'){
  const area=document.getElementById('settings');if(!area)return;
  if(!area.querySelector('.fc34-data'))area.insertAdjacentHTML('beforeend',integrityMarkup(read()));
 }else if(tab==='diary'){
  const quantity=document.getElementById('fd-quantity');
  if(!quantity)return;
  const form=quantity.closest('label');
  if(!form||form.nextElementSibling?.classList?.contains('fc34-portion'))return;
  form.insertAdjacentHTML('afterend',portionMarkup());
 }
}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('[data-fc34-quantity]');
 if(btn&&document.getElementById('diary')?.contains(btn)){
  const input=document.getElementById('fd-quantity'),n=Number(btn.dataset.fc34Quantity);
  if(!input||!Number.isFinite(n)||n<=0)return;
  input.value=n;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();return;
 }
 if(e.target.closest?.('[data-fc34-backup]')&&document.getElementById('settings')?.contains(e.target)){
  if(typeof window.exportBackup==='function')window.exportBackup();return;
 }
 if(e.target.closest?.('[data-fc34-help]')&&document.getElementById('settings')?.contains(e.target)){
  const details=document.querySelector('#settings .fc34-guide');if(details)details.hidden=!details.hidden;
 }
});
document.addEventListener('change',e=>{
 if(e.target?.id==='fd-unit'&&document.getElementById('diary')?.contains(e.target)){
  const block=document.querySelector('#diary .fc34-portion');if(block)block.outerHTML=portionMarkup();
 }
});
window.addEventListener('forge:view-rendered',e=>{if(['overview','workouts','settings','diary'].includes(e.detail?.tab))enhance(e.detail.tab)});
document.addEventListener('DOMContentLoaded',()=>{const tab=document.querySelector('#nav [data-tab].on')?.dataset.tab;if(tab)enhance(tab)},{once:true});
window.ForgeCoach={review,bests,integrityMarkup,summaryMarkup,trainMarkup,portionMarkup,enhance};
})();