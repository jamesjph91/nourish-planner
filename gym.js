/* Nourish Gym Lab — strength training planner and logging. */
(function(){
'use strict';
const EX={
 goblet:{name:'Goblet squat',focus:'Legs',equip:'Dumbbell',sets:3,min:8,max:12,cue:'Keep chest tall, brace your midsection, sit between your hips and push through your whole foot.',alt:'Bodyweight box squat',load:true},
 chest:{name:'Machine chest press',focus:'Chest / triceps',equip:'Machine',sets:3,min:8,max:12,cue:'Set the handles around mid-chest, keep shoulders down, and control the return.',alt:'Incline press-up',load:true},
 row:{name:'Seated cable row',focus:'Back',equip:'Cable',sets:3,min:8,max:12,cue:'Sit upright, pull elbows back, avoid swinging your torso, and return slowly.',alt:'Resistance-band row',load:true},
 rdl:{name:'Dumbbell Romanian deadlift',focus:'Hamstrings / glutes',equip:'Dumbbells',sets:2,min:8,max:10,cue:'Soften knees, hinge hips back with a neutral back, and stop when hamstrings tighten.',alt:'Bodyweight hip hinge',load:true},
 plank:{name:'Forearm plank',focus:'Core',equip:'Mat',sets:2,min:20,max:40,unit:'sec',cue:'Brace your abs, keep a straight line, and breathe normally.',alt:'Knee plank',load:false},
 legpress:{name:'Leg press',focus:'Legs',equip:'Machine',sets:3,min:10,max:12,cue:'Keep back against pad, lower with control and avoid locking knees hard.',alt:'Supported squat',load:true},
 pulldown:{name:'Lat pulldown',focus:'Back',equip:'Machine',sets:3,min:8,max:12,cue:'Pull bar toward upper chest while keeping shoulders down and avoiding a backward swing.',alt:'Assisted pull-up',load:true},
 shoulder:{name:'Seated dumbbell shoulder press',focus:'Shoulders',equip:'Dumbbells',sets:2,min:8,max:12,cue:'Brace your trunk, press without arching your lower back, lower under control.',alt:'Machine shoulder press',load:true},
 hipthrust:{name:'Hip thrust',focus:'Glutes',equip:'Bench / machine',sets:3,min:10,max:12,cue:'Keep ribs down, push through heels, and finish with glutes rather than lower-back arch.',alt:'Glute bridge',load:true},
 deadbug:{name:'Dead bug (each side)',focus:'Core',equip:'Mat',sets:2,min:8,max:12,cue:'Keep lower back gently against floor while slowly extending opposite arm and leg.',alt:'Heel taps',load:false},
 split:{name:'Supported split squat (each leg)',focus:'Legs / balance',equip:'Bodyweight or dumbbells',sets:2,min:8,max:10,cue:'Use a rail for balance; lower vertically, keep front knee tracking toes.',alt:'Step-up to low step',load:true},
 incline:{name:'Incline dumbbell press',focus:'Chest',equip:'Dumbbells',sets:3,min:8,max:12,cue:'Use a shallow incline, control the weights and avoid flaring elbows excessively.',alt:'Incline machine press',load:true},
 cablerow:{name:'Single-arm cable row (each side)',focus:'Back',equip:'Cable',sets:3,min:10,max:12,cue:'Keep hips square, draw elbow back without twisting and pause briefly.',alt:'One-arm supported dumbbell row',load:true},
 curl:{name:'Seated leg curl',focus:'Hamstrings',equip:'Machine',sets:2,min:10,max:15,cue:'Adjust machine to your leg length and keep hips still throughout each rep.',alt:'Slider leg curl',load:true},
 carry:{name:'Farmer carry',focus:'Grip / core',equip:'Dumbbells',sets:3,min:20,max:40,unit:'sec',cue:'Walk tall with controlled steps, level shoulders and slow breathing.',alt:'Suitcase carry',load:true},
 cardio:{name:'Easy bike / brisk treadmill',focus:'Cardio',equip:'Bike or treadmill',sets:1,min:20,max:30,unit:'min',cue:'Use a conversational pace; breathing deeper is fine but you should still be able to talk.',alt:'Comfortable outdoor walk',load:false},
 mobility:{name:'Mobility circuit',focus:'Mobility',equip:'Mat',sets:1,min:8,max:12,unit:'min',cue:'Gentle hip, ankle and shoulder movements; stay in comfortable ranges without forcing stretches.',alt:'Gentle yoga routine',load:false}
};
const PLANS={
 A:{name:'Full Body A',tag:'Squat • push • pull',ids:['goblet','chest','row','rdl','plank']},
 B:{name:'Full Body B',tag:'Legs • back • shoulders',ids:['legpress','pulldown','shoulder','hipthrust','deadbug']},
 C:{name:'Full Body C',tag:'Single-leg • push • pull',ids:['split','incline','cablerow','curl','carry']},
 D:{name:'Optional recovery + cardio',tag:'Low-impact fourth session',ids:['cardio','mobility']}
};
const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const dateLocal=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const plus=(day,delta)=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+delta);return dateLocal(d);};
const monday=()=>{const today=new Date(),day=today.getDay();today.setDate(today.getDate()-((day+6)%7));return dateLocal(today);};
function work(){
 if(!s.workouts||typeof s.workouts!=='object')s.workouts={};
 const w=s.workouts;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(w.startDate||''))w.startDate=monday();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(w.selected||''))w.selected=dateLocal(new Date());
 if(!w.schedule||typeof w.schedule!=='object')w.schedule={};
 if(!w.sessions||typeof w.sessions!=='object')w.sessions={};
 if(!Number.isInteger(w.week)||w.week<1||w.week>4)w.week=1;
 return w;
}
function dayNum(iso){
 const diff=(new Date(iso+'T12:00:00')-new Date(work().startDate+'T12:00:00'))/86400000;
 return Number.isInteger(diff)&&diff>=0&&diff<28?diff+1:null;
}
function defaultPlan(iso){
 const n=(new Date(iso+'T12:00:00')).getDay(), base={1:'A',3:'B',5:'C',6:s.settings.extraGym?'D':'rest'}[n]||'rest';
 const day=dayNum(iso);
 if(day&&s.gym[day]===false)return 'rest';
 if(day&&s.gym[day]===true&&base==='rest')return 'A';
 return base;
}
function planFor(iso){return work().schedule[iso]||defaultPlan(iso);}
function setDayPlan(iso,id){
 if(!['A','B','C','D','rest'].includes(id))return;
 const w=work(),prior=planFor(iso);
 if(prior===id)return;
 if(w.sessions[iso]&&Object.values(w.sessions[iso].sets||{}).some(v=>v.some(z=>z.done||z.reps||z.kg))){
   if(!confirm('Changing this session will hide its previous exercise log. Continue?'))return;
 }
 w.schedule[iso]=id;delete w.sessions[iso];
 const num=dayNum(iso);
 if(num){s.gym[num]=id!=='rest';s.shopDirty=true;}
 save();renderCurrent();notify('Workout schedule and meal-day nutrition updated.');
}
function selectDay(iso){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return;work().selected=iso;save();renderCurrent();}
function selectWeek(week){if(week<1||week>4)return;work().week=week;work().selected=plus(work().startDate,(week-1)*7);save();renderCurrent();}
function resetAnchor(){
 const w=work(),value=document.getElementById('gym-start').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return;
 const d=new Date(value+'T12:00:00');
 if(d.getDay()!==1){alert('Please choose a Monday so it lines up with your 28-day meal plan.');return;}
 if(Object.keys(w.sessions).length&&!confirm('Changing the calendar start keeps previous workout logs by date, but changes which dates correspond to meal-plan gym days. Continue?'))return;
 w.startDate=value;w.week=1;w.selected=value;save();renderCurrent();
}
function newSession(iso,id){
 const sets={};
 for(const exid of PLANS[id].ids){const x=EX[exid];sets[exid]=Array.from({length:x.sets},()=>({kg:'',reps:'',done:false}));}
 return {id,sets,notes:'',completed:false,updatedAt:''};
}
function getSession(iso,id){
 const w=work();
 if(!w.sessions[iso]||w.sessions[iso].id!==id)w.sessions[iso]=newSession(iso,id);
 return w.sessions[iso];
}
function setValue(iso,exid,idx,field,value){
 if(!EX[exid]||!['kg','reps'].includes(field))return;
 const id=planFor(iso);if(id==='rest')return;
 const session=getSession(iso,id),set=session.sets[exid]?.[idx];if(!set)return;
 const n=value===''?'':Number(value),max=field==='kg'?600:1000;
 if(n!==''&&(!Number.isFinite(n)||n<0||n>max))return;
 set[field]=n;session.updatedAt=new Date().toISOString();save();
}
function tick(iso,exid,idx,checked){
 const id=planFor(iso),session=getSession(iso,id),set=session.sets[exid]?.[idx];
 if(!set)return;
 if(checked&&(set.reps===''|| (EX[exid].load&&set.kg===''))){alert('Enter reps/time and weight (0 for bodyweight) before ticking this set.');renderCurrent();return;}
 set.done=checked;session.updatedAt=new Date().toISOString();save();renderCurrent();
}
function setNote(iso,v){const id=planFor(iso);if(id==='rest')return;const session=getSession(iso,id);session.notes=String(v).slice(0,750);save();}
function complete(iso,yes){
 const id=planFor(iso);if(id==='rest')return;
 const session=getSession(iso,id);
 if(yes&&!Object.values(session.sets).some(arr=>arr.some(set=>set.done))){alert('Tick at least one completed set first.');return;}
 session.completed=yes;session.updatedAt=new Date().toISOString();save();renderCurrent();notify(yes?'Workout completed — great work!':'Workout returned to in progress.');
}
function addSet(iso,exid){
 const id=planFor(iso),session=getSession(iso,id);
 if(!EX[exid]||!PLANS[id]?.ids.includes(exid)||session.sets[exid].length>=8)return;
 session.sets[exid].push({kg:'',reps:'',done:false});save();renderCurrent();
}
function removeSet(iso,exid,idx){
 const id=planFor(iso),session=getSession(iso,id);
 if(!EX[exid]||!PLANS[id]?.ids.includes(exid)||session.sets[exid].length<=1)return;
 session.sets[exid].splice(idx,1);save();renderCurrent();
}
function openGuide(exid){
 const x=EX[exid];if(!x)return;
 document.getElementById('modalinner').innerHTML='<div class="eyebrow">EXERCISE LIBRARY • '+esc(x.focus)+'</div><h2>'+esc(x.name)+'</h2><p class="short"><b>Equipment:</b> '+esc(x.equip)+'<br><b>Suggested sets:</b> '+x.sets+' × '+x.min+'–'+x.max+' '+(x.unit||'reps')+'</p><h3>Technique</h3><p class="short">'+esc(x.cue)+'</p><h3>Easier alternative</h3><p class="short">'+esc(x.alt)+'</p><a class="btn dark" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query='+encodeURIComponent(x.name+' exercise form beginner tutorial')+'">▶ Find technique videos ↗</a><p class="short">Videos are external demonstrations, not individual coaching. Stop if pain or dizziness occurs; seek qualified guidance for unfamiliar movements.</p>';
 document.getElementById('modalback').classList.add('open');
}
function safeDate(iso){return new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function history(){
 const rows=[];
 for(const [date,session] of Object.entries(work().sessions)){
  if(!session||!session.sets)continue;
  for(const [id,sets] of Object.entries(session.sets))if(EX[id]&&Array.isArray(sets)){
   const done=sets.filter(v=>v.done&&v.reps!==''&&(!EX[id].load||v.kg!==''));
   if(done.length)rows.push({date,id,count:done.length,best:Math.max(...done.map(v=>Number(v.kg)||0)),total:done.reduce((a,v)=>a+(EX[id].load?Number(v.kg)*Number(v.reps):0),0)});
  }
 }
 return rows.sort((a,b)=>b.date.localeCompare(a.date));
}
function logsCsv(){
 const rows=[['Date','Workout','Completed workout','Exercise','Set','Reps or time','Unit','Weight kg','Set completed']];
 for(const [date,v] of Object.entries(work().sessions).sort())if(PLANS[v.id]){
  for(const [id,sets] of Object.entries(v.sets||{}))if(EX[id])sets.forEach((z,i)=>rows.push([date,v.id,v.completed?'yes':'no',EX[id].name,i+1,z.reps,EX[id].unit||'reps',z.kg,z.done?'yes':'no']));
 }
 download('nourish-workout-log.csv',rows.map(row=>row.map(csvCell).join(',')).join('\r\n'));
}
function calendar(){
 const w=work(),from=plus(w.startDate,(w.week-1)*7);
 return '<div class="card"><div class="row" style="flex-wrap:wrap"><div><div class="eyebrow">4-WEEK WORKOUT CALENDAR</div><h2 style="margin:7px 0 0">Your training week</h2></div><div class="weeks">'+[1,2,3,4].map(i=>'<button class="weekbtn '+(w.week===i?'on':'')+'" onclick="gymSelectWeek('+i+')">Week '+i+'</button>').join('')+'</div></div><div class="gym-calendar">'+Array.from({length:7},(_,i)=>{const iso=plus(from,i),id=planFor(iso),log=w.sessions[iso];return '<button class="gym-day '+(w.selected===iso?'sel':'')+'" onclick="gymSelectDay(\''+iso+'\')"><b>'+safeDate(iso)+'</b><span>'+(id==='rest'?'○ Rest':esc(PLANS[id].name))+'</span><small>'+(log?.completed?'✓ Completed':id==='rest'?'Recovery':log?'● In progress':'Planned')+'</small></button>'}).join('')+'</div><p class="short" style="margin-bottom:0">The starting date anchors these four weeks to your meal calendar. Assign a workout or Rest to any day. Changes to training days also update meal portions and grocery calculations for these 28 days.</p></div>';
}
function exerciseRows(iso,exid){
 const x=EX[exid],ses=getSession(iso,planFor(iso)),list=ses.sets[exid]||[];
 const unit=x.unit||'reps';
 return '<div class="gym-exercise"><div class="row" style="flex-wrap:wrap"><div><strong>'+esc(x.name)+'</strong><div class="short">'+x.sets+' sets · '+x.min+'–'+x.max+' '+unit+' · '+esc(x.focus)+'</div></div><button class="btn sm" onclick="gymOpenGuide(\''+exid+'\')">How to do it ↗</button></div><div class="gym-sethead"><span>Set</span><span>'+(x.load?'Weight (kg)':'Bodyweight')+'</span><span>'+ (unit==='reps'?'Reps':unit==='sec'?'Seconds':'Minutes')+'</span><span>Done</span><span></span></div>'+list.map((set,i)=>'<div class="gym-setrow"><b>'+ (i+1)+'</b>'+(x.load?'<input inputmode="decimal" aria-label="'+esc(x.name)+' set '+(i+1)+' weight in kilograms" type="number" min="0" step="0.5" max="600" value="'+esc(set.kg??'')+'" placeholder="kg" onchange="gymSetValue(\''+iso+'\',\''+exid+'\','+i+',\'kg\',this.value)">':'<span class="gym-bodyweight">—</span>')+'<input inputmode="numeric" aria-label="'+esc(x.name)+' set '+(i+1)+' reps or time" type="number" min="0" max="1000" step="1" value="'+esc(set.reps??'')+'" placeholder="'+x.min+'–'+x.max+'" onchange="gymSetValue(\''+iso+'\',\''+exid+'\','+i+',\'reps\',this.value)"><input type="checkbox" aria-label="Completed '+esc(x.name)+' set '+(i+1)+'" '+(set.done?'checked':'')+' onchange="gymTick(\''+iso+'\',\''+exid+'\','+i+',this.checked)"><button class="btn sm" aria-label="Remove set" onclick="gymRemoveSet(\''+iso+'\',\''+exid+'\','+i+')">−</button></div>').join('')+'<div style="margin-top:9px"><button class="btn sm" onclick="gymAddSet(\''+iso+'\',\''+exid+'\')">＋ Add set</button></div></div>';
}
function selectedSession(){
 const w=work(),iso=w.selected,id=planFor(iso),label=safeDate(iso);
 return '<div class="card"><div class="eyebrow">YOUR SESSION · '+esc(label)+'</div><div class="row" style="flex-wrap:wrap;align-items:flex-end"><div><h2 style="margin:8px 0 6px">'+(id==='rest'?'Recovery day':esc(PLANS[id].name))+'</h2><p class="short">'+(id==='rest'?'Choose a workout below if you would like to train this day.':'Start with 5–10 minutes of comfortable movement and lighter warm-up sets; work at a controlled effort.')+'</p></div><label class="short">Assign workout<br><select class="select" aria-label="Assign workout" onchange="gymSetDayPlan(\''+iso+'\',this.value)">'+[['rest','Rest day'],...Object.entries(PLANS).map(([k,p])=>[k,p.name])].map(([k,name])=>'<option value="'+k+'" '+(id===k?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label></div>'+
 (id==='rest'?'<div class="notice">Rest is part of training. A dog walk or gentle mobility is enough today.</div>':
 '<div class="notice">Choose a weight that leaves about 2–3 good repetitions in reserve. Rest 1–3 minutes between harder sets. When all sets reach the top of the range with controlled technique, add a small amount of weight next time. No need to train to failure.</div>'+
 PLANS[id].ids.map(exid=>exerciseRows(iso,exid)).join('')+
 '<label class="short" for="gym-note">Workout notes</label><textarea id="gym-note" rows="2" maxlength="750" class="gym-notes" placeholder="Energy, exercise substitutions, anything to remember…" onchange="gymSetNote(\''+iso+'\',this.value)">'+esc(getSession(iso,id).notes||'')+'</textarea><div class="actions" style="margin-top:14px"><button class="btn '+(getSession(iso,id).completed?'':'dark')+'" onclick="gymComplete(\''+iso+'\','+(!getSession(iso,id).completed)+')">'+(getSession(iso,id).completed?'↶ Mark in progress':'✓ Finish workout')+'</button></div>')+'</div>';
}
function progress(){
 const w=work(),hist=history(),done=Object.values(w.sessions).filter(x=>x.completed).length,sets=hist.reduce((sum,x)=>sum+x.count,0);
 const unique=[...new Set(hist.map(x=>x.id))];
 return '<div class="grid4"><div class="stat"><div class="mini">WORKOUTS COMPLETED</div><strong>'+done+'</strong><small>Logged in your training history</small></div><div class="stat"><div class="mini">COMPLETED EXERCISE SETS</div><strong>'+sets+'</strong><small>Across all sessions</small></div><div class="stat"><div class="mini">EXERCISES LOGGED</div><strong>'+unique.length+'</strong><small>Different movements</small></div><div class="stat"><div class="mini">WEEKS IN ROTATION</div><strong>4</strong><small>Three strength days; optional fourth</small></div></div><div class="card"><div class="row" style="flex-wrap:wrap"><div><div class="eyebrow">PROGRESS & HISTORY</div><h2 style="margin:8px 0">Your recent exercise results</h2></div><button class="btn" onclick="gymExport()">↓ Export workout CSV</button></div>'+(hist.length?'<div class="gym-history">'+hist.slice(0,16).map(x=>'<div class="gym-history-row"><span><b>'+esc(EX[x.id].name)+'</b><br><small>'+esc(safeDate(x.date))+' · '+x.count+' sets</small></span><span>'+ (EX[x.id].load?x.best+' kg best logged':'Bodyweight / time')+'</span></div>').join('')+'</div>':'<p class="short">Your progress appears here as soon as you tick completed sets. Compare the same exercise over time rather than comparing different machines.</p>')+'</div>';
}
function gymPlanner(){
 const w=work();
 return '<div class="sectionhead"><div><div class="eyebrow">NOURISH • GYM LAB</div><h2>Workout planner & strength tracker</h2></div><span class="pill">Your existing cloud account</span></div>'+
 '<div class="notice">Starter routine: <b>Monday A · Wednesday B · Friday C</b>; Saturday is an optional lighter session. If you are new to lifting, start conservatively and learn each movement’s technique. Modify around your fitness, injuries and equipment availability.</div>'+
 '<div class="card" style="margin:16px 0"><div class="row" style="flex-wrap:wrap"><label class="short">Plan starts on Monday<br><input type="date" id="gym-start" value="'+esc(w.startDate)+'" class="select"></label><button class="btn" onclick="gymResetAnchor()">Change calendar start</button><span class="short">Keep the same 28-day period as your meal plan.</span></div></div>'+
 calendar()+'<div style="height:16px"></div>'+selectedSession()+'<div class="sectionhead"><h2>Progress</h2></div>'+progress();
}
const style=document.createElement('style');style.textContent='.gym-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px;margin:16px 0}.gym-day{display:flex;flex-direction:column;text-align:left;gap:7px;min-width:0;background:#f7faf7;border:1px solid var(--line);border-radius:12px;padding:12px;color:var(--ink);cursor:pointer}.gym-day.sel{border:2px solid var(--green);background:var(--mint)}.gym-day span{font-size:12px;font-weight:700}.gym-day small{color:var(--muted)}.gym-exercise{margin:15px 0;border:1px solid var(--line);border-radius:14px;padding:15px;background:#fcfdfa}.gym-sethead,.gym-setrow{display:grid;grid-template-columns:40px minmax(72px,1fr) minmax(72px,1fr) 54px 42px;gap:8px;align-items:center;margin-top:10px}.gym-sethead{font-size:11px;color:var(--muted);font-weight:700}.gym-setrow input[type=number]{width:100%;padding:9px 7px;background:white;border:1px solid var(--line);border-radius:8px}.gym-setrow input[type=checkbox]{width:20px;height:20px;justify-self:center;accent-color:var(--green)}.gym-setrow .btn{justify-content:center}.gym-bodyweight{text-align:center;color:var(--muted)}.gym-notes{display:block;max-width:100%;width:100%;margin-top:8px;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit}.gym-history-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:10px 0}.gym-history-row small{color:var(--muted)}@media(max-width:900px){.gym-calendar{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.gym-calendar{grid-template-columns:repeat(2,minmax(0,1fr))}.gym-sethead,.gym-setrow{grid-template-columns:25px minmax(55px,1fr) minmax(55px,1fr) 42px 32px;gap:5px}.gym-exercise{padding:10px}.gym-setrow input[type=number]{font-size:14px}.gym-setrow .btn{padding:7px 5px}.gym-day{padding:9px}}';
document.head.append(style);
work();
window.nourishWorkoutsPage=gymPlanner;
window.gymSelectDay=selectDay;window.gymSelectWeek=selectWeek;window.gymSetDayPlan=setDayPlan;
window.gymResetAnchor=resetAnchor;window.gymSetValue=setValue;window.gymTick=tick;
window.gymSetNote=setNote;window.gymComplete=complete;window.gymAddSet=addSet;window.gymRemoveSet=removeSet;
window.gymOpenGuide=openGuide;window.gymExport=logsCsv;
if(s.tab==='workouts')renderCurrent();
})();