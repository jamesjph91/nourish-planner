/* Nourish Health Hub: combined nutrition, strength, weight and optional wearable activity. */
(function(){
'use strict';
const keys=['steps','activeKcal','sleepMinutes','restingBpm'];
const dateLocal=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const today=()=>dateLocal(new Date());
const isDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T12:00:00'))&&new Date(x+'T12:00:00').toISOString().slice(0,10)===x;
const shift=(date,offset)=>new Date(Date.parse(date+'T12:00:00')+offset*86400000).toISOString().slice(0,10);
const fmt=(n,d=0)=>n===null||n===undefined?'—':Number(n).toLocaleString('en-GB',{maximumFractionDigits:d});
let selected=today(),importMessage='',manualMessage='',importBusy=false,importSerial=0;
const clamp=(v,lo,hi,decimals=0)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=lo&&n<=hi?Number(n.toFixed(decimals)):null};
const normNumber=(value,min,max,decimals)=>clamp(value,min,max,decimals);
function validateHealthActivity(input){
 const val=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 const out={daily:[],goals:{steps:8000,sleepMinutes:480}};
 if(val.goals&&typeof val.goals==='object'){
  const steps=normNumber(val.goals.steps,1000,50000,0),sleep=normNumber(val.goals.sleepMinutes,240,720,0);
  if(steps!==null)out.goals.steps=steps;
  if(sleep!==null)out.goals.sleepMinutes=sleep;
 }
 const map=new Map();
 if(Array.isArray(val.daily))for(const row of val.daily.slice(-730)){
  if(!row||typeof row!=='object'||!isDate(row.date))continue;
  const item={date:row.date};
  const ranges={steps:[0,150000,0],activeKcal:[0,12000,1],sleepMinutes:[0,1440,0],restingBpm:[25,220,0]};
  for(const [k,args] of Object.entries(ranges)){
   const n=normNumber(row[k],...args);
   if(n!==null)item[k]=n;
  }
  if(Object.keys(item).length===1)continue;
  item.source=['manual','health-connect','samsung-export','imported'].includes(row.source)?row.source:'imported';
  if(typeof row.updatedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(row.updatedAt))item.updatedAt=row.updatedAt.slice(0,35);
  map.set(item.date,item);
 }
 out.daily=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-400);
 return out;
}
function data(){s.healthActivity=validateHealthActivity(s.healthActivity);return s.healthActivity;}
function findDay(date){return data().daily.find(x=>x.date===date)||null;}
function activitySave(){
 const date=document.getElementById('hub-date')?.value;
 if(!isDate(date)){alert('Choose a valid calendar date.');return;}
 const row={date,source:'manual',updatedAt:new Date().toISOString()};
 const fields={steps:[0,150000,0],activeKcal:[0,12000,1],sleepMinutes:[0,1440,0],restingBpm:[25,220,0]};
 let count=0;
 for(const [k,rng] of Object.entries(fields)){
  const value=(document.getElementById('hub-'+k)?.value||'').trim();
  if(!value)continue;
  const number=normNumber(value,...rng);
  if(number===null){alert('Check the '+k+' value. It must be a realistic positive number.');return;}
  row[k]=number;count++;
 }
 if(count===0){alert('Enter at least one health measurement.');return;}
 const a=data(),old=a.daily.find(x=>x.date===date);
 const next={...old,...row};
 if(old&&old.source==='health-connect'&&!confirm('Replace or update imported activity for this day with your manual values?'))return;
 a.daily=a.daily.filter(x=>x.date!==date);
 a.daily.push(next);s.healthActivity=validateHealthActivity(a);
 selected=date;manualMessage='Saved your activity for '+date+'.';
 save();renderCurrent();notify('Activity saved privately.');
}
function removeDay(date){
 const old=findDay(date);if(!old||!confirm('Delete activity for '+date+'? This does not delete the original record from Samsung Health.'))return;
 const a=data();a.daily=a.daily.filter(x=>x.date!==date);s.healthActivity=a;save();renderCurrent();notify('Activity entry deleted.');
}
function selectDate(date){if(!isDate(date))return;selected=date;renderCurrent();}
function setGoal(){
 const rawSteps=document.getElementById('hub-goal-steps')?.value,rawSleep=document.getElementById('hub-goal-sleep')?.value;
 const steps=normNumber(rawSteps,1000,50000,0),hours=normNumber(rawSleep,4,12,1);
 if(steps===null||hours===null){alert('Steps goal: 1,000–50,000. Sleep goal: 4–12 hours.');return;}
 const a=data();a.goals={steps,sleepMinutes:Math.round(hours*60)};
 s.healthActivity=a;save();renderCurrent();notify('Daily activity goals updated.');
}
function sniffDelimiter(line){return (line.match(/\t/g)||[]).length>(line.match(/,/g)||[]).length?'\t':',';}
function csvRows(text,delimiter=','){
 const rows=[];let row=[],field='',quoted=false;
 const s=String(text||'').replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(ch==='"'){if(quoted&&s[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(ch===delimiter&&!quoted){row.push(field);field='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&s[i+1]==='\n')i++;
   row.push(field);field='';if(row.some(Boolean))rows.push(row);row=[];
  }else field+=ch;
  if(rows.length>800)throw Error('Import is limited to 800 rows.');
 }
 if(quoted)throw Error('CSV has an unfinished quoted value.');
 row.push(field);if(row.some(Boolean))rows.push(row);
 return rows;
}
function importValues(text,ext=''){
 let list=[],source='imported';
 const input=text.trim().replace(/^\uFEFF/,'');
 if(input.startsWith('{')||input.startsWith('[')){
  const parsed=JSON.parse(input);
  if(Array.isArray(parsed))list=parsed;
  else if(parsed&&typeof parsed==='object'){
   if(parsed.app==='nourish-health-connect-bridge'&&Number(parsed.version)===1){
    source='health-connect';list=parsed.daily;
   }else if(Array.isArray(parsed.daily))list=parsed.daily;
   else if(Array.isArray(parsed.records))list=parsed.records;
   else throw Error('JSON must contain a daily or records array.');
  }
 }else{
  const lines=csvRows(input,sniffDelimiter(input.split(/\r?\n/,1)[0]||''));
  if(lines.length<2)throw Error('CSV must contain column headings and at least one daily record.');
  const header=lines.shift().map(x=>x.trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const aliases={
   date:['date','day','calendarDate','startdate'].map(v=>v.toLowerCase()),
   steps:['steps','stepcount','totalsteps','dailysteps'],
   activeKcal:['activekcal','activecalories','activecalorieskcal','caloriesburned','activeenergykcal'],
   sleepMinutes:['sleepminutes','sleepdurationminutes','totalsleepminutes'],
   restingBpm:['restingbpm','restingheart','restingheartrate','restingheartratebpm']
  };
  const positions={};
  for(const [key,arr] of Object.entries(aliases)){
   const index=header.findIndex(h=>arr.includes(h));if(index>=0)positions[key]=index;
  }
  if(positions.date===undefined||!keys.some(k=>positions[k]!==undefined))
   throw Error('CSV needs a date column and at least one of: steps, active_kcal, sleep_minutes, resting_bpm.');
  list=lines.map(row=>Object.fromEntries(Object.entries(positions).map(([k,i])=>[k,row[i]?.trim()||''])));
 }
 if(!Array.isArray(list)||list.length===0||list.length>730)throw Error('Import must contain 1–730 daily records.');
 const prepared=[],rejected=[];
 for(const item of list){
  if(!item||!isDate(item.date)){rejected.push('Invalid date');continue;}
  const validated=validateHealthActivity({daily:[{...item,source:source==='health-connect'?'health-connect':item.source||source}]}).daily[0];
  if(!validated){rejected.push(item.date);continue;}
  prepared.push(validated);
 }
 if(!prepared.length)throw Error('No usable daily activity values were found.');
 return {rows:prepared,rejected:rejected.length,source};
}
async function importFile(file){
 if(!file)return;
 if(importBusy)return;
 if(file.size>1024*1024){importMessage='File is over 1 MB; please export only daily summaries.';renderCurrent();return;}
 const serial=++importSerial;importBusy=true;
 try{
  const body=await file.text();if(serial!==importSerial)return;
  const parsed=importValues(body,file.name||'');
  const a=data(),map=new Map(a.daily.map(item=>[item.date,item]));
  let updated=0;
  for(const entry of parsed.rows){
   const old=map.get(entry.date)||{};
   // Merge fields instead of silently dropping previously entered activity.
   map.set(entry.date,{...old,...entry});
   updated++;
  }
  if(serial!==importSerial)return;
  a.daily=[...map.values()].sort((x,y)=>x.date.localeCompare(y.date)).slice(-400);
  s.healthActivity=validateHealthActivity(a);
  selected=parsed.rows[parsed.rows.length-1].date;
  importMessage='Imported '+updated+' daily record'+(updated===1?'':'s')+(parsed.rejected?' ('+parsed.rejected+' invalid rows skipped).':'.')+' Data stays in your private FORGE account.';
  save();renderCurrent();notify('Health activity imported successfully.');
 }catch(e){
  importMessage='Import failed: '+(e?.message||'Invalid file')+'. Your existing activity has not been changed.';
  renderCurrent();
 }finally{if(serial===importSerial)importBusy=false}
}
function importChange(input){void importFile(input?.files?.[0]);}
function cancelPendingImport(){importSerial++;importBusy=false;importMessage='';manualMessage='';}
function nutrition(date){
 const entries=validateFoodDiary(s.foodDiary).entries.filter(x=>x.date===date);
 const n={kcal:0,protein:0,carbs:0,fat:0,fibre:0};
 for(const e of entries)for(const k of Object.keys(n))n[k]+=Number(e.totals?.[k])||0;
 return {n,count:entries.length};
}
function goalFor(date){
 const anchor=s.workouts?.startDate;
 if(isDate(anchor)){
  const offset=Math.round((Date.parse(date+'T12:00:00')-Date.parse(anchor+'T12:00:00'))/86400000);
  if(offset>=0&&offset<28)return goal(days()[offset]);
 }
 return s.settings.restCal;
}
function workouts(date){return s.workouts?.sessions?.[date]||null;}
function period(){return Array.from({length:7},(_,i)=>shift(today(),i-6));}
function seriesData(){
 const dates=period(),a=data(),food=validateFoodDiary(s.foodDiary).entries,work=s.workouts?.sessions||{},weights=validateMeasurements(s.measurements);
 const weekly=dates.map(date=>{
  const list=food.filter(x=>x.date===date),entry=a.daily.find(x=>x.date===date)||null;
  const calories=list.reduce((acc,x)=>acc+(Number(x.totals?.kcal)||0),0);
  return {date,foodCount:list.length,calories,activity:entry,completed:!!work[date]?.completed,weight:weights.find(x=>x.date===date)?.weightKg??null};
 });
 return weekly;
}
function weightSummary(){
 const rows=validateMeasurements(s.measurements).filter(x=>x.weightKg!==undefined);
 const recent=rows.at(-1),first=rows[0],goalWeight=validateProfile(s.profile).goalWeightKg;
 return {weight:recent?.weightKg??null,date:recent?.date??'',change:recent&&first&&recent.date!==first.date?Number((recent.weightKg-first.weightKg).toFixed(1)):null,goal:goalWeight};
}
function strengthSummary(){
 const dates=Object.entries(s.workouts?.sessions||{}).sort((a,b)=>a[0].localeCompare(b[0]));
 const exerciseMap=new Map(),all=[];
 for(const [date,session] of dates){
  for(const [id,sets] of Object.entries(session.sets||{})){
   if(!Array.isArray(sets))continue;
   const done=sets.filter(x=>x&&x.done&&x.kg!==''&&x.kg!==undefined&&x.reps!==''&&x.reps!==undefined);
   if(!done.length)continue;
   const best=Math.max(...done.map(x=>Number(x.kg)||0));
   if(best<=0)continue;
   const record={id,date,best};
   const prev=exerciseMap.get(id);exerciseMap.set(id,{...record,previous:prev?.best??null});
   all.push(record);
  }
 }
 const recent=[...exerciseMap.values()].sort((a,b)=>b.date.localeCompare(a.date));
 const names=window.nourishGymExerciseName||((id)=>id);
 return recent.slice(0,5).map(x=>({...x,name:names(x.id)}));
}
const progress=(val,max)=>Math.min(100,Math.max(0,Math.round((max>0?val/max:0)*100)));
const ariaBar=(label,actual,max,unit='')=>'<div class="hub-bar"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><span>'+esc(label)+'</span><strong>'+fmt(actual)+' / '+fmt(max)+' '+unit+'</strong></div><div class="hub-track" role="progressbar" aria-label="'+esc(label)+'" aria-valuemin="0" aria-valuenow="'+Math.max(0,Math.round(actual))+'" aria-valuemax="'+Math.max(1,Math.round(max))+'"><span style="width:'+progress(actual,max)+'%"></span></div></div>';
const card=(caption,value,note)=>'<div class="hub-kpi"><small>'+esc(caption)+'</small><strong>'+value+'</strong><span>'+esc(note)+'</span></div>';
function dashboard(){
 const current=today(),n=nutrition(current),goal=goalFor(current),watch=findDay(current),goals=data().goals,week=seriesData(),weight=weightSummary();
 const weekSessions=week.filter(x=>x.completed).length;
 const selectedEntries=week.filter(x=>x.foodCount>0),sumFood=selectedEntries.reduce((a,x)=>a+x.calories,0);
 const lifts=strengthSummary();
 const steps=watch?.steps,activityKcal=watch?.activeKcal,sleep=watch?.sleepMinutes;
 const watchNote=watch?'Activity '+(watch.source==='manual'?'entered manually':watch.source==='health-connect'?'imported from Health Connect':'imported'):'No activity entered for today';
 return '<div class="hub-dashboard"><div class="sectionhead"><div><div class="eyebrow">FORGE · HEALTH HUB</div><h2>Your daily health overview</h2></div><span class="pill">'+esc(current)+'</span></div>'+
 '<div class="hub-kpis">'+
 card('CALORIES LOGGED',n.count?fmt(n.n.kcal)+' kcal':'Not logged',n.count?'From '+n.count+' food item'+(n.count===1?'':'s'):'Your meal plan is not counted until you log it')+
 card('PROTEIN',n.count?fmt(n.n.protein,1)+' g':'—',n.count?'Your daily reference is '+s.settings.prot+' g':'Log a food to see your intake')+
 card('STEPS',steps!==undefined?fmt(steps):'Not synced',watchNote)+
 card('GYM THIS WEEK',weekSessions+' session'+(weekSessions===1?'':'s'),'Completed workouts, not watch exercise duplicates')+
 '</div>'+
 '<div class="hub-insights"><div class="card"><h3>Today’s targets</h3>'+
 (n.count?ariaBar('Energy intake',n.n.kcal,goal,'kcal')+ariaBar('Protein',n.n.protein,s.settings.prot,'g'):'<p class="short">No food logged today. Your planned meals are not counted as eaten.</p>')+
 (steps!==undefined?ariaBar('Steps',steps,goals.steps,'steps'):'<p class="short">No steps recorded today. Add a watch reading or import a daily summary.</p>')+
 '<p class="short">Activity energy'+(activityKcal!==undefined?': '+fmt(activityKcal)+' kcal (device estimate).':': not recorded.')+' We do not automatically add watch calories to your food allowance.</p></div>'+
 '<div class="card"><h3>Body & recovery</h3><div class="hub-details">'+
 '<div><small>Latest weight</small><b>'+(weight.weight!==null?fmt(weight.weight,1)+' kg':'Not recorded')+'</b></div>'+
 '<div><small>Weight change</small><b>'+(weight.change!==null?(weight.change>0?'+':'')+fmt(weight.change,1)+' kg':'Need two weigh-ins')+'</b></div>'+
 '<div><small>Sleep last recorded today</small><b>'+(sleep!==undefined?fmt(sleep/60,1)+' h':'Not recorded')+'</b></div>'+
 '<div><small>Resting heart rate</small><b>'+(watch?.restingBpm!==undefined?fmt(watch.restingBpm)+' bpm':'Not recorded')+'</b></div>'+
 '</div><p class="short">Weight fluctuations are normal. Wearable recovery data is context, not a diagnosis.</p></div></div>'+
 '<div class="hub-insights"><div class="card"><h3>Last seven days</h3><p class="short">Only days you logged are shown as intake. Missing data is not assumed to be zero.</p>'+
 '<div class="hub-week">'+week.map(x=>{
  const pct=x.foodCount?progress(x.calories,goalFor(x.date)):0;
  return '<div class="hub-week-day"><small>'+esc(x.date.slice(5))+'</small><div class="hub-week-track"><span style="height:'+pct+'%"></span></div><b>'+(x.foodCount?fmt(Math.round(x.calories)):'—')+'</b></div>';
 }).join('')+'</div>'+
 '<p class="short">'+selectedEntries.length+' logged day'+(selectedEntries.length===1?'':'s')+' · '+(selectedEntries.length?fmt(Math.round(sumFood/selectedEntries.length))+' kcal average on logged days':'No food totals yet')+'</p></div>'+
 '<div class="card"><h3>Strength progression</h3>'+
 (lifts.length?lifts.map(x=>'<div class="hub-lift"><div><b>'+esc(x.name)+'</b><small>'+esc(x.date)+' · best logged load</small></div><div><strong>'+fmt(x.best,1)+' kg</strong><small>'+(x.previous===null?'First logged record':x.best>x.previous?'↑ '+fmt(x.best-x.previous,1)+' kg vs prior':x.best<x.previous?'↓ '+fmt(x.previous-x.best,1)+' kg vs prior':'Same as previous')+'</small></div></div>').join(''):'<p class="short">Complete and tick weighted exercise sets in Gym Lab to see strength comparisons here.</p>')+
 '</div></div><div class="actions"><button class="btn dark" onclick="navigate(\'diary\')">Log food</button><button class="btn" onclick="navigate(\'workouts\')">Gym Lab</button><button class="btn" onclick="navigate(\'progress\')">Record weight</button><button class="btn" onclick="navigate(\'health\')">Watch activity & imports</button></div></div>';
}
function healthPage(){
 const current=data(),old=findDay(selected),goals=current.goals,days=seriesData().slice().reverse();
 const inp=(key,label,value,min,max,step)=>'<label>'+label+'<input id="hub-'+key+'" type="number" inputmode="decimal" min="'+min+'" max="'+max+'" step="'+step+'" value="'+(value??'')+'" placeholder="Optional"></label>';
 return '<div class="sectionhead"><div><div class="eyebrow">FORGE · ACTIVITY & WEARABLES</div><h2>Watch activity & goals</h2></div><span class="pill">Private to your account</span></div>'+
 '<div class="notice">Samsung Health can share activity via Health Connect on supported Android phones. A web app cannot directly read Health Connect. This screen accepts manual readings or a daily-summary CSV/JSON import; automatic watch syncing is not enabled yet.</div>'+
 '<div class="card"><h3>Personal activity targets</h3><div class="hub-form">'+inp('goal-steps','Steps per day',goals.steps,1000,50000,1000)+inp('goal-sleep','Sleep reference (hours)',goals.sleepMinutes/60,4,12,.5)+'</div><button class="btn dark" onclick="hubSetGoal()">Save activity targets</button></div>'+
 '<div class="hub-insights"><div class="card"><h3>Enter a watch reading</h3><p class="short">Use the day’s totals in Samsung Health; leave any metric you do not have blank. Values replace the same field for that date without duplicating it.</p>'+
 '<div class="hub-form"><label>Date<input type="date" id="hub-date" value="'+esc(selected)+'" onchange="hubSelectDate(this.value)"></label>'+
 inp('steps','Steps',old?.steps,0,150000,1)+
 inp('activeKcal','Active calories (kcal, estimate)',old?.activeKcal,0,12000,1)+
 inp('sleepMinutes','Sleep (minutes)',old?.sleepMinutes,0,1440,1)+
 inp('restingBpm','Resting heart rate (bpm)',old?.restingBpm,25,220,1)+'</div>'+
 '<button class="btn dark" onclick="hubSaveReading()">Save activity</button><p class="short" role="status">'+esc(manualMessage)+'</p></div>'+
 '<div class="card"><h3>Import Samsung / Health Connect activity</h3><p class="short">Import an agreed daily-summary export, not an arbitrary Samsung Health database ZIP. Files need columns for <b>date</b> and one of <b>steps, active_kcal, sleep_minutes, resting_bpm</b>. Compatible JSON can also be imported.</p>'+
 '<label class="hub-upload">Choose CSV or JSON file<input id="hub-file" type="file" accept=".csv,.tsv,.json,text/csv,application/json" onchange="hubImportChange(this)"></label>'+
 '<p class="short" role="status">'+esc(importMessage)+'</p><p class="short">Data is validated, combined by calendar date and saved to your own FORGE account. Importing again updates the same dates instead of duplicating totals.</p>'+
 '<p class="short">This does <b>not</b> connect your watch automatically or infer burn from step count. See <a href="https://developer.samsung.com/health/health-connect-faq.html" target="_blank" rel="noopener noreferrer">Samsung Health Connect guidance ↗</a>.</p></div></div>'+
 '<div class="card"><h3>Recent recorded activity</h3>'+
 (current.daily.length?current.daily.slice().reverse().slice(0,14).map(x=>
 '<div class="hub-lift"><div><b>'+esc(x.date)+'</b><small>'+esc(x.source==='health-connect'?'Health Connect import':x.source==='manual'?'Manually entered':x.source==='samsung-export'?'Samsung export':'Imported summary')+'</small><small>'+
 [x.steps!==undefined?fmt(x.steps)+' steps':'',x.activeKcal!==undefined?fmt(x.activeKcal)+' active kcal':'',x.sleepMinutes!==undefined?fmt(x.sleepMinutes/60,1)+' h sleep':'',x.restingBpm!==undefined?fmt(x.restingBpm)+' resting bpm':''].filter(Boolean).join(' · ')+'</small></div><button class="btn sm" onclick="hubDeleteDay(\''+x.date+'\')">Remove</button></div>').join(''):'<p class="short">No wearable activity stored yet. Enter a day above or import a supported daily summary.</p>')+'</div>';
}
const css=document.createElement('style');
css.textContent='.hub-dashboard{margin:16px 0}.hub-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:13px 0 18px}.hub-kpi{padding:15px;border:1px solid var(--line);border-radius:13px;background:#fff;min-width:0;display:flex;flex-direction:column;gap:7px}.hub-kpi small{color:var(--muted);font-size:11px;font-weight:700}.hub-kpi strong{font-size:24px;line-height:1.2;overflow-wrap:anywhere}.hub-kpi>span{font-size:12px;color:var(--muted)}.hub-insights{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px;margin:15px 0}.hub-insights .card{margin:0;min-width:0}.hub-insights h3{margin-top:0}.hub-bar{margin:12px 0;font-size:13px}.hub-track{height:9px;background:#e6eee8;border-radius:50px;margin-top:8px;overflow:hidden}.hub-track span{height:100%;display:block;background:#3b8562;border-radius:50px}.hub-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.hub-details div{display:flex;flex-direction:column;gap:5px}.hub-details small{color:var(--muted)}.hub-details b{font-size:20px}.hub-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;align-items:end;margin:15px 0}.hub-week-day{text-align:center;min-width:0;display:flex;flex-direction:column;gap:6px;align-items:center}.hub-week-day small{font-size:11px}.hub-week-day b{font-size:10px;white-space:nowrap}.hub-week-track{height:84px;width:100%;max-width:28px;background:#eef4ef;border-radius:6px;position:relative;overflow:hidden}.hub-week-track span{position:absolute;bottom:0;left:0;right:0;background:#3b8562;border-radius:5px;min-height:0}.hub-lift{display:flex;justify-content:space-between;gap:12px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0;flex-wrap:wrap}.hub-lift div{min-width:0}.hub-lift small{display:block;color:var(--muted);font-size:12px;margin-top:4px}.hub-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:15px 0}.hub-form label,.hub-upload{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700}.hub-form input,.hub-upload input{width:100%;min-width:0;padding:11px;border:1px solid var(--line);border-radius:9px;background:#fff;color:var(--ink);font:inherit;font-size:16px}.hub-upload{padding:12px;border:1px dashed var(--line);border-radius:10px;margin:10px 0}@media(max-width:800px){.hub-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.hub-insights{grid-template-columns:1fr}}@media(max-width:420px){.hub-kpis{grid-template-columns:1fr 1fr}.hub-kpi strong{font-size:19px}.hub-form{grid-template-columns:1fr}.hub-details b{font-size:17px}}';
document.head.append(css);
window.nourishHealthDashboard=dashboard;
window.nourishHealthPage=healthPage;
window.nourishHealthAPI={validate:validateHealthActivity,summary:()=>({today:today(),weight:weightSummary(),nutrition:nutrition(today()),activity:findDay(today()),strength:strengthSummary()})};
window.hubSaveReading=activitySave;window.hubDeleteDay=removeDay;window.hubSelectDate=selectDate;window.hubSetGoal=setGoal;window.hubImportChange=importChange;window.hubImportFile=importFile;
window.hubCancelPending=cancelPendingImport;
if(s.tab==='overview'||s.tab==='health')renderCurrent();
})();