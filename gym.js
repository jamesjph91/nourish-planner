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

const EXTRA={
 smithsquat:{name:'Smith machine squat',focus:'Legs',equip:'Smith machine',sets:3,min:8,max:12,cue:'Control the lowering and keep foot pressure even.',alt:'Leg press',load:true},
 squat:{name:'Barbell back squat',focus:'Legs',equip:'Barbell',sets:3,min:6,max:10,cue:'Use safeties and learn technique with a light load.',alt:'Goblet squat',load:true},
 hack:{name:'Hack squat machine',focus:'Legs',equip:'Machine',sets:3,min:8,max:12,cue:'Keep your back supported and lower smoothly.',alt:'Leg press',load:true},
 lunge:{name:'Reverse dumbbell lunges',focus:'Legs',equip:'Dumbbells',sets:3,min:8,max:12,cue:'Step backward and maintain steady balance.',alt:'Supported split squat',load:true},
 extension:{name:'Leg extension machine',focus:'Legs',equip:'Machine',sets:3,min:10,max:15,cue:'Align your knees and avoid using momentum.',alt:'Bodyweight squat',load:true},
 calves:{name:'Standing calf raise',focus:'Legs',equip:'Machine',sets:3,min:12,max:20,cue:'Pause at the top and lower with control.',alt:'Bodyweight heel raise',load:true},
 bench:{name:'Barbell bench press',focus:'Chest',equip:'Barbell',sets:3,min:6,max:10,cue:'Use a spotter or safety arms; keep shoulders stable.',alt:'Machine chest press',load:true},
 dbbench:{name:'Flat dumbbell bench press',focus:'Chest',equip:'Dumbbells',sets:3,min:8,max:12,cue:'Lower in control and avoid flaring the elbows.',alt:'Machine chest press',load:true},
 fly:{name:'Pec deck chest fly',focus:'Chest',equip:'Machine',sets:2,min:10,max:15,cue:'Use a comfortable stretch and steady return.',alt:'Cable chest fly',load:true},
 cablefly:{name:'Cable chest fly',focus:'Chest',equip:'Cable',sets:3,min:10,max:15,cue:'Keep elbows slightly bent and avoid swinging.',alt:'Pec deck',load:true},
 pushups:{name:'Press-ups',focus:'Chest',equip:'Bodyweight',sets:3,min:6,max:15,cue:'Brace your body and lower chest between hands.',alt:'Incline press-up',load:false},
 assistedpull:{name:'Assisted pull-up',focus:'Back',equip:'Machine',sets:3,min:6,max:10,cue:'Select adequate assistance and pull steadily.',alt:'Lat pulldown',load:true},
 dbrow:{name:'One-arm dumbbell row',focus:'Back',equip:'Dumbbell',sets:3,min:8,max:12,cue:'Support one hand and pull elbow toward hip.',alt:'Seated cable row',load:true},
 chestrow:{name:'Chest-supported machine row',focus:'Back',equip:'Machine',sets:3,min:8,max:12,cue:'Keep chest against pad while pulling smoothly.',alt:'Cable row',load:true},
 rearfly:{name:'Reverse pec deck',focus:'Shoulders',equip:'Machine',sets:3,min:10,max:15,cue:'Keep neck relaxed and lead with upper arms.',alt:'Rear delt raise',load:true},
 lateral:{name:'Dumbbell lateral raise',focus:'Shoulders',equip:'Dumbbells',sets:3,min:12,max:15,cue:'Raise arms smoothly without shrugging.',alt:'Cable lateral raise',load:true},
 facepull:{name:'Cable face pull',focus:'Shoulders',equip:'Cable',sets:3,min:12,max:15,cue:'Pull rope toward forehead with control.',alt:'Band pull-aparts',load:true},
 curlbiceps:{name:'Dumbbell biceps curl',focus:'Arms',equip:'Dumbbells',sets:3,min:10,max:12,cue:'Keep elbows still; avoid body swing.',alt:'Cable biceps curl',load:true},
 hammercurl:{name:'Hammer curl',focus:'Arms',equip:'Dumbbells',sets:3,min:10,max:12,cue:'Palms face in and upper arms stay still.',alt:'Rope cable curl',load:true},
 triceps:{name:'Rope triceps pushdown',focus:'Arms',equip:'Cable',sets:3,min:10,max:15,cue:'Keep elbows by sides and straighten smoothly.',alt:'Machine triceps press',load:true},
 overheadtri:{name:'Overhead triceps extension',focus:'Arms',equip:'Cable',sets:3,min:10,max:15,cue:'Keep elbows stable without arching back.',alt:'Triceps pushdown',load:true},
 glute:{name:'Glute bridge',focus:'Glutes',equip:'Mat',sets:3,min:12,max:15,cue:'Push through heels without over-arching.',alt:'Hip thrust',load:false},
 kettlebell:{name:'Kettlebell deadlift',focus:'Glutes',equip:'Kettlebell',sets:3,min:8,max:12,cue:'Hinge at hips and keep weight close.',alt:'Dumbbell RDL',load:true},
 bike:{name:'Stationary bike',focus:'Cardio',equip:'Bike',sets:1,min:10,max:40,unit:'min',cue:'Find a conversational pace.',alt:'Treadmill walk',load:false},
 treadmill:{name:'Incline treadmill walk',focus:'Cardio',equip:'Treadmill',sets:1,min:10,max:40,unit:'min',cue:'Start with a gentle incline.',alt:'Stationary bike',load:false},
 rowing:{name:'Rowing machine',focus:'Cardio',equip:'Rower',sets:1,min:8,max:25,unit:'min',cue:'Push with legs first and finish with arms.',alt:'Stationary bike',load:false},
 crunch:{name:'Cable crunch',focus:'Core',equip:'Cable',sets:3,min:10,max:15,cue:'Curl ribs toward pelvis steadily.',alt:'Dead bug',load:true},
 sideplank:{name:'Side plank (each side)',focus:'Core',equip:'Mat',sets:2,min:15,max:35,unit:'sec',cue:'Keep hips level and breathe.',alt:'Knee side plank',load:false},
 pallof:{name:'Cable Pallof press (each side)',focus:'Core',equip:'Cable',sets:3,min:10,max:12,cue:'Press out without torso rotation.',alt:'Resistance-band Pallof press',load:true}
};
Object.assign(EX,EXTRA);
function definition(id){return EX[id]||work().customExercises?.[id];}
function validExercise(id){return typeof id==='string'&&!!definition(id);}
function routineIds(id){return (work().templates?.[id]||PLANS[id]?.ids||[]).filter(validExercise);}
function hasLog(session){return Object.values(session?.sets||{}).some(a=>Array.isArray(a)&&a.some(z=>z.done||z.reps!==''||z.kg!==''));}
function fillSets(session,ids){
 for(const exid of ids)if(!session.sets[exid]){
  const ex=definition(exid);if(ex)session.sets[exid]=Array.from({length:ex.sets},()=>({kg:'',reps:'',done:false}));
 }
}

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
 if(!w.templates||typeof w.templates!=='object')w.templates={};
 if(!w.customExercises||typeof w.customExercises!=='object')w.customExercises={};
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
 if(w.sessions[iso]&&hasLog(w.sessions[iso])&&!confirm('Change this routine? Previously logged sets remain in your history and CSV export.'))return;
 w.schedule[iso]=id;
 if(id!=='rest')getSession(iso,id);
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
 const exerciseIds=routineIds(id),session={id,exerciseIds,sets:{},notes:'',completed:false,customized:false,updatedAt:''};
 fillSets(session,exerciseIds);
 return session;
}
function getSession(iso,id){
 const w=work();let session=w.sessions[iso];
 if(!session){session=newSession(iso,id);w.sessions[iso]=session;}
 else if(session.id!==id){
  // Retain historic logged sets even if the workout assigned to this day changes.
  session.id=id;session.exerciseIds=routineIds(id);session.customized=false;session.completed=false;
  fillSets(session,session.exerciseIds);
 }else if(!Array.isArray(session.exerciseIds)){
  session.exerciseIds=(PLANS[id]?.ids||[]).filter(exid=>session.sets?.[exid]);
  if(!session.exerciseIds.length)session.exerciseIds=routineIds(id);
  session.customized=false;fillSets(session,session.exerciseIds);
 }else if(!session.customized&&!hasLog(session)){
  session.exerciseIds=routineIds(id);fillSets(session,session.exerciseIds);
 }
 return session;
}
function sessionIds(iso,id){return getSession(iso,id).exerciseIds.filter(validExercise);}
function setValue(iso,exid,idx,field,value){
 if(!validExercise(exid)||!['kg','reps'].includes(field))return;
 const id=planFor(iso);if(id==='rest')return;
 const session=getSession(iso,id),set=session.sets[exid]?.[idx];if(!set)return;
 const n=value===''?'':Number(value),max=field==='kg'?600:1000;
 if(n!==''&&(!Number.isFinite(n)||n<0||n>max))return;
 set[field]=n;session.updatedAt=new Date().toISOString();save();
}
function tick(iso,exid,idx,checked){
 const id=planFor(iso),session=getSession(iso,id),set=session.sets[exid]?.[idx];
 if(!set)return;
 if(checked&&(set.reps===''|| (definition(exid).load&&set.kg===''))){alert('Enter reps/time and weight (0 for bodyweight) before ticking this set.');renderCurrent();return;}
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
 if(!validExercise(exid)||!session.exerciseIds.includes(exid)||session.sets[exid].length>=8)return;
 session.sets[exid].push({kg:'',reps:'',done:false});save();renderCurrent();
}
function removeSet(iso,exid,idx){
 const id=planFor(iso),session=getSession(iso,id);
 if(!validExercise(exid)||!session.exerciseIds.includes(exid)||session.sets[exid].length<=1)return;
 session.sets[exid].splice(idx,1);save();renderCurrent();
}

function gymLibrary(iso,oldId=''){
 if(!PLANS[planFor(iso)])return;
 window.gymPicker={iso,oldId};window.gymQuery='';
 document.getElementById('modalinner').innerHTML=
 '<div class="eyebrow">FORGE · EXERCISE LIBRARY</div><h2>'+(oldId?'Replace exercise':'Add an exercise')+'</h2><p class="short">Search the library, or create your own exercise. Any already logged sets remain in your history.</p>'+
 '<input id="gym-library-search" aria-label="Search exercises" class="search" placeholder="Search muscle, equipment, exercise…" oninput="gymFilter(this.value)" style="width:100%;max-width:100%">'+
 '<div id="gym-library-list" class="gym-library-list">'+gymLibraryRows('')+'</div>'+
 '<div class="gym-own-box"><h3>Create a custom exercise</h3><div class="gym-own-grid">'+
 '<label class="short">Name<input id="gym-own-name" maxlength="48" placeholder="Exercise name"></label>'+
 '<label class="short">Muscle group<select id="gym-own-focus">'+['Legs','Chest','Back','Shoulders','Arms','Glutes','Core','Cardio','Other'].map(v=>'<option>'+v+'</option>').join('')+'</select></label>'+
 '<label class="short">Equipment<input id="gym-own-equip" maxlength="40" placeholder="Equipment"></label>'+
 '<label class="short">Count<select id="gym-own-unit"><option value="reps">Repetitions</option><option value="sec">Seconds</option><option value="min">Minutes</option></select></label></div>'+
 '<label class="short"><input type="checkbox" id="gym-own-load" checked> Also record weight (kg)</label><div><button class="btn dark" onclick="gymCreateOwn()">＋ Create & add exercise</button></div></div>';
 document.getElementById('modalback').classList.add('open');
}
function gymLibraryRows(query){
 const pick=window.gymPicker;if(!pick)return '';
 const q=String(query||'').toLowerCase().trim(),current=getSession(pick.iso,planFor(pick.iso)).exerciseIds;
 const all={...EX,...work().customExercises};
 const rows=Object.entries(all).filter(([id,x])=>(x.name+' '+x.focus+' '+x.equip).toLowerCase().includes(q)).sort((a,b)=>a[1].name.localeCompare(b[1].name));
 return rows.length?rows.map(([id,x])=>{
 const present=current.includes(id)&&id!==pick.oldId;
 return '<div class="gym-library-row"><span><b>'+esc(x.name)+'</b><small>'+esc(x.focus)+' · '+esc(x.equip)+'</small></span><button class="btn sm '+(present?'':'dark')+'" '+(present?'disabled':'')+' onclick="gymChoose(\''+id+'\')">'+(present?'Already in session':pick.oldId?'↔ Replace':'＋ Add')+'</button></div>';
 }).join(''):'<p class="short">No matches. Try another search or create an exercise below.</p>';
}
function gymFilter(v){
 window.gymQuery=String(v).slice(0,80);
 document.getElementById('gym-library-list').innerHTML=gymLibraryRows(window.gymQuery);
}
function gymChoose(id){
 const p=window.gymPicker;
 if(!p||!validExercise(id))return;
 const session=getSession(p.iso,planFor(p.iso)),arr=session.exerciseIds,index=arr.indexOf(p.oldId);
 if(arr.includes(id)&&id!==p.oldId){alert('Already in this session.');return;}
 if(index===-1&&arr.length>=20){alert('Limit: 20 exercises per session.');return;}
 if(index>=0&&p.oldId!==id&&gymHasSets(session,p.oldId)&&!confirm('Replace this exercise? Existing set records are kept in your history.'))return;
 if(index>=0)arr[index]=id;
 else if(!arr.includes(id))arr.push(id);
 fillSets(session,[id]);
 session.customized=true;session.completed=false;session.updatedAt=new Date().toISOString();
 save();closeModal();renderCurrent();notify('Exercise updated. Use Save as my routine to reuse this lineup.');
}
function gymHasSets(session,id){return (session.sets[id]||[]).some(x=>x.done||x.kg!==''||x.reps!=='');}
function gymCreateOwn(){
 const name=(document.getElementById('gym-own-name').value||'').trim();
 const focus=document.getElementById('gym-own-focus').value,equip=(document.getElementById('gym-own-equip').value||'').trim()||'Other';
 const unit=document.getElementById('gym-own-unit').value,load=document.getElementById('gym-own-load').checked;
 if(name.length<3||name.length>48){alert('Use an exercise name between 3 and 48 characters.');return;}
 if(!['Legs','Chest','Back','Shoulders','Arms','Glutes','Core','Cardio','Other'].includes(focus)||!['reps','sec','min'].includes(unit))return;
 const w=work();
 if(Object.keys(w.customExercises).length>=40){alert('Maximum 40 personal exercises.');return;}
 const duplicate=Object.entries({...EX,...w.customExercises}).find(([,v])=>v.name.toLowerCase()===name.toLowerCase());
 if(duplicate){gymChoose(duplicate[0]);return;}
 const id='own_'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 w.customExercises[id]={name,focus,equip:equip.slice(0,40),unit,load,sets:unit==='min'?1:3,min:unit==='reps'?8:unit==='sec'?20:10,max:unit==='reps'?12:unit==='sec'?40:30,cue:'Use manageable resistance and controlled technique.',alt:'Choose an easier variation'};
 gymChoose(id);
}
function gymRemoveExercise(iso,id){
 const session=getSession(iso,planFor(iso));
 if(!session.exerciseIds.includes(id))return;
 if(gymHasSets(session,id)&&!confirm('Remove this exercise from today? Its logged sets will remain in history.'))return;
 session.exerciseIds=session.exerciseIds.filter(x=>x!==id);
 session.customized=true;session.completed=false;save();renderCurrent();
}
function gymMoveExercise(iso,id,n){
 const session=getSession(iso,planFor(iso)),a=session.exerciseIds,i=a.indexOf(id),j=i+n;
 if(i<0||j<0||j>=a.length)return;
 [a[i],a[j]]=[a[j],a[i]];session.customized=true;save();renderCurrent();
}
function gymSaveRoutine(iso){
 const id=planFor(iso);if(!PLANS[id])return;
 const ids=[...sessionIds(iso,id)];
 if(!ids.length){alert('Add at least one exercise first.');return;}
 if(!confirm('Save these exercises as your personal '+PLANS[id].name+' routine for future days?'))return;
 work().templates[id]=ids;save();renderCurrent();notify('Saved your '+PLANS[id].name+' routine.');
}
function gymRestoreDay(iso){
 const id=planFor(iso);if(!PLANS[id])return;
 const session=getSession(iso,id);
 if(gymHasAnyLoggedSets(session)&&!confirm('Restore the selected session from your saved routine? Previous set records stay in history.'))return;
 session.exerciseIds=[...routineIds(id)];session.customized=false;session.completed=false;fillSets(session,session.exerciseIds);
 save();renderCurrent();
}
function gymHasAnyLoggedSets(session){return Object.keys(session.sets||{}).some(id=>gymHasSets(session,id));}
function gymResetTemplate(iso){
 const id=planFor(iso);if(!PLANS[id])return;
 if(!confirm('Reset '+PLANS[id].name+' to its original exercise lineup for future sessions?'))return;
 delete work().templates[id];save();renderCurrent();notify('Original routine restored.');
}

function openGuide(exid){
 const x=definition(exid);if(!x)return;
 document.getElementById('modalinner').innerHTML='<div class="eyebrow">EXERCISE LIBRARY • '+esc(x.focus)+'</div><h2>'+esc(x.name)+'</h2><p class="short"><b>Equipment:</b> '+esc(x.equip)+'<br><b>Suggested sets:</b> '+x.sets+' × '+x.min+'–'+x.max+' '+(x.unit||'reps')+'</p><h3>Technique</h3><p class="short">'+esc(x.cue)+'</p><h3>Easier alternative</h3><p class="short">'+esc(x.alt)+'</p><a class="btn dark" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query='+encodeURIComponent(x.name+' exercise form beginner tutorial')+'">▶ Find technique videos ↗</a><p class="short">Videos are external demonstrations, not individual coaching. Stop if pain or dizziness occurs; seek qualified guidance for unfamiliar movements.</p>';
 document.getElementById('modalback').classList.add('open');
}
function safeDate(iso){return new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function history(){
 const rows=[];
 for(const [date,session] of Object.entries(work().sessions)){
  if(!session||!session.sets)continue;
  for(const [id,sets] of Object.entries(session.sets))if(definition(id)&&Array.isArray(sets)){
   const done=sets.filter(v=>v.done&&v.reps!==''&&(!definition(id).load||v.kg!==''));
   if(done.length)rows.push({date,id,count:done.length,best:Math.max(...done.map(v=>Number(v.kg)||0)),total:done.reduce((a,v)=>a+(definition(id).load?Number(v.kg)*Number(v.reps):0),0)});
  }
 }
 return rows.sort((a,b)=>b.date.localeCompare(a.date));
}
function logsCsv(){
 const rows=[['Date','Workout','Completed workout','Exercise','Set','Reps or time','Unit','Weight kg','Set completed']];
 for(const [date,v] of Object.entries(work().sessions).sort())if(PLANS[v.id]){
  for(const [id,sets] of Object.entries(v.sets||{}))if(definition(id))sets.forEach((z,i)=>rows.push([date,v.id,v.completed?'yes':'no',definition(id).name,i+1,z.reps,definition(id).unit||'reps',z.kg,z.done?'yes':'no']));
 }
 download('forge-workout-log.csv',rows.map(row=>row.map(csvCell).join(',')).join('\r\n'));
}
function calendar(){
 const w=work(),from=plus(w.startDate,(w.week-1)*7);
 return '<div class="card"><div class="row" style="flex-wrap:wrap"><div><div class="eyebrow">4-WEEK WORKOUT CALENDAR</div><h2 style="margin:7px 0 0">Your training week</h2></div><div class="weeks">'+[1,2,3,4].map(i=>'<button class="weekbtn '+(w.week===i?'on':'')+'" onclick="gymSelectWeek('+i+')">Week '+i+'</button>').join('')+'</div></div><div class="gym-calendar">'+Array.from({length:7},(_,i)=>{const iso=plus(from,i),id=planFor(iso),log=w.sessions[iso];return '<button class="gym-day '+(w.selected===iso?'sel':'')+'" onclick="gymSelectDay(\''+iso+'\')"><b>'+safeDate(iso)+'</b><span>'+(id==='rest'?'○ Rest':esc(PLANS[id].name))+'</span><small>'+(log?.completed?'✓ Completed':id==='rest'?'Recovery':log?'● In progress':'Planned')+'</small></button>'}).join('')+'</div><p class="short" style="margin-bottom:0">The starting date anchors these four weeks to your meal calendar. Assign a workout or Rest to any day. Changes to training days also update meal portions and grocery calculations for these 28 days.</p></div>';
}
function exerciseRows(iso,exid){
 const x=definition(exid),ses=getSession(iso,planFor(iso)),list=ses.sets[exid]||[];
 const unit=x.unit||'reps';
 return '<div class="gym-exercise"><div class="row" style="flex-wrap:wrap"><div><strong>'+esc(x.name)+'</strong><div class="short">'+x.sets+' sets · '+x.min+'–'+x.max+' '+unit+' · '+esc(x.focus)+'</div></div><button class="btn sm" onclick="gymOpenGuide(\''+exid+'\')">How to do it ↗</button></div><div class="gym-sethead"><span>Set</span><span>'+(x.load?'Weight (kg)':'Bodyweight')+'</span><span>'+ (unit==='reps'?'Reps':unit==='sec'?'Seconds':'Minutes')+'</span><span>Done</span><span></span></div>'+list.map((set,i)=>'<div class="gym-setrow"><b>'+ (i+1)+'</b>'+(x.load?'<input inputmode="decimal" aria-label="'+esc(x.name)+' set '+(i+1)+' weight in kilograms" type="number" min="0" step="0.5" max="600" value="'+esc(set.kg??'')+'" placeholder="kg" onchange="gymSetValue(\''+iso+'\',\''+exid+'\','+i+',\'kg\',this.value)">':'<span class="gym-bodyweight">—</span>')+'<input inputmode="numeric" aria-label="'+esc(x.name)+' set '+(i+1)+' reps or time" type="number" min="0" max="1000" step="1" value="'+esc(set.reps??'')+'" placeholder="'+x.min+'–'+x.max+'" onchange="gymSetValue(\''+iso+'\',\''+exid+'\','+i+',\'reps\',this.value)"><input type="checkbox" aria-label="Completed '+esc(x.name)+' set '+(i+1)+'" '+(set.done?'checked':'')+' onchange="gymTick(\''+iso+'\',\''+exid+'\','+i+',this.checked)"><button class="btn sm" aria-label="Remove set" onclick="gymRemoveSet(\''+iso+'\',\''+exid+'\','+i+')">−</button></div>').join('')+'<div class="gym-ex-actions"><button class="btn sm" onclick="gymMoveExercise(\''+iso+'\',\''+exid+'\',-1)">↑ Up</button><button class="btn sm" onclick="gymMoveExercise(\''+iso+'\',\''+exid+'\',1)">↓ Down</button><button class="btn sm" onclick="gymLibrary(\''+iso+'\',\''+exid+'\')">↔ Replace</button><button class="btn sm" onclick="gymRemoveExercise(\''+iso+'\',\''+exid+'\')">Remove</button></div>'+'<div style="margin-top:9px"><button class="btn sm" onclick="gymAddSet(\''+iso+'\',\''+exid+'\')">＋ Add set</button></div></div>';
}
function selectedSession(){
 const w=work(),iso=w.selected,id=planFor(iso),label=safeDate(iso);
 return '<div class="card"><div class="eyebrow">YOUR SESSION · '+esc(label)+'</div><div class="row" style="flex-wrap:wrap;align-items:flex-end"><div><h2 style="margin:8px 0 6px">'+(id==='rest'?'Recovery day':esc(PLANS[id].name))+'</h2><p class="short">'+(id==='rest'?'Choose a workout below if you would like to train this day.':'Start with 5–10 minutes of comfortable movement and lighter warm-up sets; work at a controlled effort.')+'</p></div><label class="short">Assign workout<br><select class="select" aria-label="Assign workout" onchange="gymSetDayPlan(\''+iso+'\',this.value)">'+[['rest','Rest day'],...Object.entries(PLANS).map(([k,p])=>[k,p.name])].map(([k,name])=>'<option value="'+k+'" '+(id===k?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label></div>'+
 (id==='rest'?'<div class="notice">Rest is part of training. A dog walk or gentle mobility is enough today.</div>':
 '<div class="notice">Choose a weight that leaves about 2–3 good repetitions in reserve. Rest 1–3 minutes between harder sets. When all sets reach the top of the range with controlled technique, add a small amount of weight next time. No need to train to failure.</div>'+
 sessionIds(iso,id).map(exid=>exerciseRows(iso,exid)).join('')+
 '<div class="gym-edit-actions"><button class="btn dark" onclick="gymLibrary(\''+iso+'\')">＋ Add exercise</button><button class="btn" onclick="gymSaveRoutine(\''+iso+'\')">♡ Save as my routine</button><button class="btn" onclick="gymRestoreDay(\''+iso+'\')">↶ Restore session</button><button class="btn" onclick="gymResetTemplate(\''+iso+'\')">Reset original routine</button></div><p class="short">Changes affect only today unless you save this lineup as your routine. Your friend has their own independent workout plan.</p>'+
 '<label class="short" for="gym-note">Workout notes</label><textarea id="gym-note" rows="2" maxlength="750" class="gym-notes" placeholder="Energy, exercise substitutions, anything to remember…" onchange="gymSetNote(\''+iso+'\',this.value)">'+esc(getSession(iso,id).notes||'')+'</textarea><div class="actions" style="margin-top:14px"><button class="btn '+(getSession(iso,id).completed?'':'dark')+'" onclick="gymComplete(\''+iso+'\','+(!getSession(iso,id).completed)+')">'+(getSession(iso,id).completed?'↶ Mark in progress':'✓ Finish workout')+'</button></div>')+'</div>';
}
function progress(){
 const w=work(),hist=history(),done=Object.values(w.sessions).filter(x=>x.completed).length,sets=hist.reduce((sum,x)=>sum+x.count,0);
 const unique=[...new Set(hist.map(x=>x.id))];
 return '<div class="grid4"><div class="stat"><div class="mini">WORKOUTS COMPLETED</div><strong>'+done+'</strong><small>Logged in your training history</small></div><div class="stat"><div class="mini">COMPLETED EXERCISE SETS</div><strong>'+sets+'</strong><small>Across all sessions</small></div><div class="stat"><div class="mini">EXERCISES LOGGED</div><strong>'+unique.length+'</strong><small>Different movements</small></div><div class="stat"><div class="mini">WEEKS IN ROTATION</div><strong>4</strong><small>Three strength days; optional fourth</small></div></div><div class="card"><div class="row" style="flex-wrap:wrap"><div><div class="eyebrow">PROGRESS & HISTORY</div><h2 style="margin:8px 0">Your recent exercise results</h2></div><button class="btn" onclick="gymExport()">↓ Export workout CSV</button></div>'+(hist.length?'<div class="gym-history">'+hist.slice(0,16).map(x=>'<div class="gym-history-row"><span><b>'+esc(definition(x.id).name)+'</b><br><small>'+esc(safeDate(x.date))+' · '+x.count+' sets</small></span><span>'+ (definition(x.id).load?x.best+' kg best logged':'Bodyweight / time')+'</span></div>').join('')+'</div>':'<p class="short">Your progress appears here as soon as you tick completed sets. Compare the same exercise over time rather than comparing different machines.</p>')+'</div>';
}
function gymPlanner(){
 const w=work();
 return '<div class="sectionhead"><div><div class="eyebrow">FORGE · TRAIN</div><h2>Workout planner & strength tracker</h2></div><span class="pill">Your existing cloud account</span></div>'+
 '<div class="notice">Starter routine: <b>Monday A · Wednesday B · Friday C</b>; Saturday is an optional lighter session. If you are new to lifting, start conservatively and learn each movement’s technique. Modify around your fitness, injuries and equipment availability.</div>'+
 '<div class="card" style="margin:16px 0"><div class="row" style="flex-wrap:wrap"><label class="short">Plan starts on Monday<br><input type="date" id="gym-start" value="'+esc(w.startDate)+'" class="select"></label><button class="btn" onclick="gymResetAnchor()">Change calendar start</button><span class="short">Keep the same 28-day period as your meal plan.</span></div></div>'+
 calendar()+'<div style="height:16px"></div>'+selectedSession()+'<div class="sectionhead"><h2>Progress</h2></div>'+progress();
}
const style=document.createElement('style');style.textContent='.gym-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px;margin:16px 0}.gym-day{display:flex;flex-direction:column;text-align:left;gap:7px;min-width:0;background:#f7faf7;border:1px solid var(--line);border-radius:12px;padding:12px;color:var(--ink);cursor:pointer}.gym-day.sel{border:2px solid var(--green);background:var(--mint)}.gym-day span{font-size:12px;font-weight:700}.gym-day small{color:var(--muted)}.gym-exercise{margin:15px 0;border:1px solid var(--line);border-radius:14px;padding:15px;background:#fcfdfa}.gym-sethead,.gym-setrow{display:grid;grid-template-columns:40px minmax(72px,1fr) minmax(72px,1fr) 54px 42px;gap:8px;align-items:center;margin-top:10px}.gym-sethead{font-size:11px;color:var(--muted);font-weight:700}.gym-setrow input[type=number]{width:100%;padding:9px 7px;background:white;border:1px solid var(--line);border-radius:8px}.gym-setrow input[type=checkbox]{width:20px;height:20px;justify-self:center;accent-color:var(--green)}.gym-setrow .btn{justify-content:center}.gym-bodyweight{text-align:center;color:var(--muted)}.gym-notes{display:block;max-width:100%;width:100%;margin-top:8px;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit}.gym-history-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding:10px 0}.gym-history-row small{color:var(--muted)}@media(max-width:900px){.gym-calendar{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.gym-calendar{grid-template-columns:repeat(2,minmax(0,1fr))}.gym-sethead,.gym-setrow{grid-template-columns:25px minmax(55px,1fr) minmax(55px,1fr) 42px 32px;gap:5px}.gym-exercise{padding:10px}.gym-setrow input[type=number]{font-size:14px}.gym-setrow .btn{padding:7px 5px}.gym-day{padding:9px}}';
style.textContent+='.gym-edit-actions,.gym-ex-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.gym-library-list{max-height:45vh;overflow:auto;border:1px solid var(--line);border-radius:11px;margin:13px 0;padding:0 12px}.gym-library-row{display:flex;justify-content:space-between;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:10px 0}.gym-library-row span{min-width:0}.gym-library-row small{display:block;color:var(--muted);font-size:12px}.gym-own-box{margin-top:18px;padding-top:15px;border-top:1px solid var(--line)}.gym-own-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}.gym-own-grid label{display:flex;flex-direction:column;gap:5px}.gym-own-grid input,.gym-own-grid select{width:100%;min-width:0;border:1px solid var(--line);border-radius:8px;padding:9px;background:white;color:var(--ink)}@media(max-width:540px){.gym-own-grid{grid-template-columns:1fr}.gym-library-list{max-height:34vh}}';
document.head.append(style);
work();
window.nourishWorkoutsPage=gymPlanner;
window.nourishGymExerciseName=id=>definition(id)?.name||'Exercise '+String(id).slice(0,12);
window.gymSelectDay=selectDay;window.gymSelectWeek=selectWeek;window.gymSetDayPlan=setDayPlan;
window.gymResetAnchor=resetAnchor;window.gymSetValue=setValue;window.gymTick=tick;
window.gymSetNote=setNote;window.gymComplete=complete;window.gymAddSet=addSet;window.gymRemoveSet=removeSet;
window.gymOpenGuide=openGuide;window.gymExport=logsCsv;
window.gymLibrary=gymLibrary;window.gymFilter=gymFilter;window.gymChoose=gymChoose;window.gymCreateOwn=gymCreateOwn;window.gymRemoveExercise=gymRemoveExercise;window.gymMoveExercise=gymMoveExercise;window.gymSaveRoutine=gymSaveRoutine;window.gymRestoreDay=gymRestoreDay;window.gymResetTemplate=gymResetTemplate;
if(s.tab==='workouts')renderCurrent();
})();