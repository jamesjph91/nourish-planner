/* FORGE Progress. Visual dashboard reads the existing private tracker state.
   Existing measurement, goal, history and sharing controls remain the engine. */
(()=>{'use strict';
const section=()=>document.getElementById('progress');
const TABS=['Overview','Stats','Photos','Goals'];
const PERIODS={'7D':7,'30D':30,'90D':90,'1Y':365,'All':0};
let tab='Overview',range='30D',metricId='weightKg',photos=[],photoStatus='',photoBusy=false,urls=[],photoGeneration=0;
const LEGACY_PHOTO_OWNER='forge-photo-legacy-owner-v1',LEGACY_PHOTO_IMPORTED='forge-photo-legacy-imported-v1';
try{
 if(!localStorage.getItem(LEGACY_PHOTO_OWNER)){
  const previous=localStorage.getItem('nourish-last-account-v1');
  localStorage.setItem(LEGACY_PHOTO_OWNER,previous||'guest');
 }
}catch(e){}
const photoOwner=()=>window.forgeCurrentAccountUid||'guest';
const photoDatabaseName=()=> 'forge-progress-photos-account-'+String(photoOwner()).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,128);
function legacyAllowed(){
 try{return !!photoOwner()&&photoOwner()===localStorage.getItem(LEGACY_PHOTO_OWNER)&&localStorage.getItem(LEGACY_PHOTO_IMPORTED)!==photoOwner()}catch{return false}
}
const finite=v=>v!==undefined&&v!==null&&v!==''&&Number.isFinite(Number(v));
const fmt=(n,d=0)=>finite(n)?Number(n).toLocaleString('en-GB',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
const signed=n=>finite(n)?(n>0?'+':n<0?'−':'')+fmt(Math.abs(n),1):'—';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00'));
function currentState(){try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}}
function start(){if(!PERIODS[range])return '';const d=new Date();d.setDate(d.getDate()-PERIODS[range]+1);return stamp(d)}
function data(){
 const s=currentState(),min=start(),max=stamp(new Date()),valid=d=>dateOK(d)&&d<=max&&(!min||d>=min);
 const all=(Array.isArray(s.measurements)?s.measurements:[]).filter(x=>x&&dateOK(x.date)&&x.date<=max).sort((a,b)=>a.date.localeCompare(b.date));
 const measurements=all.filter(x=>valid(x.date));
 const activity=(Array.isArray(s.healthActivity?.daily)?s.healthActivity.daily:[]).filter(x=>x&&valid(x.date)).sort((a,b)=>a.date.localeCompare(b.date));
 const sessions=Object.entries(s.workouts?.sessions||{}).filter(([day,entry])=>valid(day)&&entry?.completed);
 const completedSets=sessions.flatMap(([,entry])=>Object.values(entry.sets||{}).flatMap(rows=>Array.isArray(rows)?rows.filter(x=>x?.done):[]));
 const volume=completedSets.reduce((n,row)=>n+(finite(row.kg)&&finite(row.reps)&&Number(row.kg)>0&&Number(row.reps)>0?Number(row.kg)*Number(row.reps):0),0);
 const steps=activity.filter(row=>finite(row.steps)&&Number(row.steps)>=0);
 const average=steps.length?steps.reduce((n,row)=>n+Number(row.steps),0)/steps.length:null;
 return {s,all,measurements,sessions,completedSets,volume,steps,average};
}
function series(rows,key){return rows.filter(x=>finite(x[key])).map(x=>({date:x.date,value:Number(x[key])}))}
const METRIC_FIELDS=[
 ['weightKg','Weight','kg'],['waistCm','Waist','cm'],
 ['chestCm','Chest','cm'],['hipsCm','Hips','cm'],
 ['armCm','Upper arm','cm'],['thighCm','Thigh','cm'],
 ['bodyFatPct','Body fat · device estimate','%']
];
function metricSeries(rows,key){
 if(!METRIC_FIELDS.some(m=>m[0]===key))return [];
 return series(Array.isArray(rows)?rows:[],key).filter(x=>dateOK(x.date)&&Number.isFinite(x.value)).sort((a,b)=>a.date.localeCompare(b.date));
}
function metricExplorer(d){
 const meta=METRIC_FIELDS.find(m=>m[0]===metricId)||METRIC_FIELDS[0],
  points=metricSeries(d.measurements,meta[0]),last=points.at(-1),first=points[0];
 const since=range==='All'?'all recorded dates':'the selected '+range+' range';
 const change=points.length>=2?signed(last.value-first.value)+' '+meta[2]:'Need two distinct dates';
 return '<article class="fp-panel fp59-metrics" aria-label="Date-filtered measurement trends">'+
  '<div class="fp-heading"><div><small>FORGE / YOUR EVIDENCE</small><h3>Measurements by date</h3></div>'+
  '<label class="fp59-metric-label">Metric<select aria-label="Measurement trend metric" data-fp59-metric>'+
  METRIC_FIELDS.map(([id,name])=>'<option value="'+id+'" '+(metricId===id?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label></div>'+
  '<div class="fp59-meta"><strong>'+points.length+' recorded date'+(points.length===1?'':'s')+'</strong>'+
  '<span>'+esc(since)+' · '+(last?fmt(last.value,1)+' '+esc(meta[2])+' latest':'No recorded value')+'</span></div>'+
  lineChart(points,meta[1],meta[2])+
  '<p class="fp-help">Change in selected period: '+esc(change)+'. Only dated entries containing this measurement are plotted; missing dates and values are never invented or treated as zero. '+(meta[0]==='bodyFatPct'?'Body-fat scale readings are estimates.':'')+'</p></article>';
}
function stat(label,value,unit,sub,note){
 return '<article class="fp-stat"><span>'+esc(label)+'</span><strong>'+esc(value)+' <small>'+esc(unit)+'</small></strong><footer><b>'+esc(sub)+'</b><small>'+esc(note)+'</small></footer></article>';
}
function lineChart(rows,name,unit){
 if(rows.length<2)return '<div class="fp-empty"><b>Nothing to chart yet</b><p>Log '+esc(name.toLowerCase())+' on at least two dates to show a real trend.</p></div>';
 const vals=rows.map(x=>x.value),lo=Math.min(...vals),hi=Math.max(...vals),extent=Math.max(1,hi-lo),d0=Date.parse(rows[0].date+'T12:00:00'),span=Math.max(86400000,Date.parse(rows.at(-1).date+'T12:00:00')-d0);
 const pts=rows.map(r=>({x:25+(Date.parse(r.date+'T12:00:00')-d0)/span*650,y:172-(r.value-lo)/extent*135}));
 return '<svg viewBox="0 0 700 215" class="fp-chart" role="img" aria-label="'+esc(name)+' trend from '+fmt(vals[0],1)+' to '+fmt(vals.at(-1),1)+' '+esc(unit)+'"><path d="M25 37 H675 M25 104 H675 M25 172 H675" fill="none" stroke="#243329"/><polyline points="'+pts.map(v=>v.x.toFixed(1)+','+v.y.toFixed(1)).join(' ')+'" stroke="#b9ff16" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+pts.map(v=>'<circle cx="'+v.x.toFixed(1)+'" cy="'+v.y.toFixed(1)+'" r="3" fill="#b9ff16"/>').join('')+'<text x="25" y="204" font-size="12" fill="#819084">'+esc(rows[0].date)+'</text><text x="553" y="204" font-size="12" fill="#819084">'+esc(rows.at(-1).date)+'</text></svg>';
}
function barChart(steps){
 if(!steps.length)return '<p class="fp-help">There are no recorded steps for this period. Import watch data or log activity to populate the chart.</p>';
 const rows=steps.length>20?steps.filter((_,i)=>i%Math.ceil(steps.length/20)===0||i===steps.length-1):steps;
 const max=Math.max(1,...rows.map(x=>Number(x.steps)));
 return '<div class="fp-bars">'+rows.map(x=>'<span title="'+esc(x.date)+': '+fmt(x.steps)+' steps"><i style="height:'+Math.max(2,Number(x.steps)/max*100).toFixed(1)+'%"></i></span>').join('')+'</div><p class="fp-help">Recorded days only. Missing days are not treated as zero.</p>';
}
function overview(d){
 const weight=series(d.measurements,'weightKg'),bodyFat=series(d.measurements,'bodyFatPct');
 const w=weight.at(-1),f=bodyFat.at(-1),weightDelta=weight.length>1?signed(w.value-weight[0].value)+' kg':'Need 2 readings',fatDelta=bodyFat.length>1?signed(f.value-bodyFat[0].value)+'%':'Need 2 readings';
 return '<div class="fp-stats">'+stat('WEIGHT',w?fmt(w.value,1):'—','kg',weightDelta,w?'Selected period':'No reading in period')+
 stat('BODY FAT · EST.',f?fmt(f.value,1):'—','%',fatDelta,f?'Device estimate':'No reading in period')+
 stat('WORKOUTS',fmt(d.sessions.length),'completed',fmt(d.completedSets.length)+' sets','Selected period')+
 stat('AVERAGE STEPS',d.average===null?'—':fmt(d.average),'daily',fmt(d.steps.length)+' recorded days','Recorded days only')+'</div>'+
 metricExplorer(d)+
 '<div class="fp-two"><article class="fp-panel"><div class="fp-heading"><div><small>TRAINING</small><h3>Workout consistency</h3></div></div><div class="fp-numbers"><div><b>'+fmt(d.sessions.length)+'</b><span>Sessions</span></div><div><b>'+fmt(d.completedSets.length)+'</b><span>Sets</span></div><div><b>'+fmt(d.volume)+'</b><span>kg × reps</span></div></div><p class="fp-help">Training volume only includes completed weighted sets. It is not a percentage strength-gain claim.</p></article>'+
 '<article class="fp-panel"><div class="fp-heading"><div><small>ACTIVITY</small><h3>Steps recorded</h3></div></div>'+barChart(d.steps)+'</article></div>'+
 '<div class="fp-shortcuts"><button data-fp-tab="Stats">＋ Log measurement</button><button data-fp-tab="Photos">▧ Progress photos</button><button data-fp-tab="Goals">◎ Review goals</button></div>';
}
function goals(d){
 const goal=d.s.profile?.goalWeightKg,latest=series(d.all,'weightKg').at(-1),diff=finite(goal)&&latest?latest.value-Number(goal):null,stepGoal=d.s.healthActivity?.goals?.steps??8000;
 return '<div class="fp-two"><article class="fp-panel"><small>WEIGHT GOAL</small><h3>'+(finite(goal)?fmt(goal,1)+' kg':'Not set')+'</h3><p class="fp-help">'+(diff===null?'Save a weight goal and a measurement to view the difference.':Math.abs(diff)<.05?'Latest reading matches your target.':fmt(Math.abs(diff),1)+' kg '+(diff>0?'above':'below')+' your goal.')+'</p></article>'+
 '<article class="fp-panel"><small>STEP GOAL</small><h3>'+fmt(stepGoal)+' steps</h3><p class="fp-help">Your Activity screen controls this daily step target.</p><button data-fp-go="health">Change step goal ↗</button></article></div><p class="fp-help">Update your weight goal and manage opt-in friend comparisons below. Changing a weight goal does not automatically change calorie targets.</p>';
}
function photoView(){
 return '<article class="fp-panel"><div class="fp-heading"><div><small>PRIVATE PHOTO JOURNAL</small><h3>Progress photos</h3></div><span>'+photos.length+' saved</span></div><p class="fp-help"><b>Stored on this device only.</b> Photos are not uploaded or cloud synced. Clearing browser data or changing devices can permanently remove them.</p>'+
 '<div class="fp59-photo-guide"><strong>BACK UP YOUR PHOTOS SEPARATELY</strong><p>1. Use <b>Save copy</b> beneath each photo you want to keep. Check that it appears in Downloads, Files or your chosen photo folder.</p>'+
 '<p>2. Move those copies to another safe location before switching phones, uninstalling FORGE or clearing site storage.</p>'+
 '<p>3. The Settings JSON backup covers plan records, <b>not photo files</b>. FORGE cannot verify that a downloaded file was saved. Photos are only accessible to the current browser profile.</p></div>'+
 (legacyAllowed()?'<div class="fp-legacy-note"><b>Older local photos found?</b> They remain in the original on-device photo database. To copy them into this verified profile only, press <button type="button" data-fp-legacy>Import my older photos</button>. Nothing is deleted from the original database.</div>':'')+
 '<label class="fp-upload"><b>＋ Add a progress photo</b><small>JPG, PNG or WebP · 8 MB maximum</small><input type="file" accept="image/jpeg,image/png,image/webp" data-fp-upload '+(photoBusy?'disabled':'')+'></label><p class="fp-help" role="status">'+esc(photoStatus)+'</p>'+
 '<div class="fp-gallery">'+(photos.length?photos.map(x=>'<article class="fp-photo"><img src="'+esc(x.url)+'" alt="Progress photo '+esc(x.date)+'"><div><span>'+esc(x.date)+'</span><a class="fp59-download" href="'+esc(x.url)+'" download="FORGE-progress-'+esc(x.date)+'-'+x.id+'.'+(x.type==='image/png'?'png':x.type==='image/webp'?'webp':'jpg')+'">↓ Save copy</a><button data-fp-delete="'+x.id+'">Delete</button></div></article>').join(''):'<div class="fp-empty">Your first progress photo will appear here.</div>')+'</div></article>';
}
function classify(r){
 const children=[...r.children].filter(x=>!x.classList.contains('forge-progress-app'));
 children.forEach(x=>{let kind='other';const t=(x.querySelector('h2,h3')?.textContent||'').toLowerCase();
 if(x.id==='measurement-form'||t.includes('add a measurement')||t.includes('measurement history')||t.includes('measurement trend')||t.includes('your results'))kind='stats';
 if(t.includes('your profile')||t.includes('compare progress'))kind='goals';
 if(t.includes('measurement trend'))kind='unfiltered'; // v59 replaces this unfiltered chart with the date-filtered explorer.
 x.dataset.fpLegacy=kind;
 });
 const shareHeading=children.find(x=>x.dataset.fpLegacy==='goals'&&/compare progress/i.test(x.textContent||''));
 if(shareHeading?.nextElementSibling&&children.includes(shareHeading.nextElementSibling))shareHeading.nextElementSibling.dataset.fpLegacy='goals';
}
function render(){
 const r=section(),mount=r?.querySelector('.forge-progress-app');if(!mount)return;
 const d=data();
 mount.innerHTML='<header class="fp-header"><div><small>PROGRESS · SEE RESULTS</small><h2>Progress</h2><p>Consistency. Growth. Results.</p></div><span class="fp-private">◈ PRIVATE</span></header>'+
 '<nav class="fp-tabs" aria-label="Progress sections">'+TABS.map(x=>'<button data-fp-tab="'+x+'" class="'+(tab===x?'on':'')+'" aria-pressed="'+(tab===x)+'">'+x+'</button>').join('')+'</nav>'+
 (tab==='Overview'||tab==='Stats'?'<div class="fp-periods" aria-label="Chart period">'+Object.keys(PERIODS).map(x=>'<button data-fp-period="'+x+'" class="'+(range===x?'on':'')+'" aria-pressed="'+(range===x)+'">'+x+'</button>').join('')+'</div>':'')+
 (tab==='Overview'?overview(d):tab==='Goals'?goals(d):tab==='Photos'?photoView():metricExplorer(d)+'<article class="fp-panel fp-info"><h3>Measurements & history</h3><p class="fp-help">Record weight, body measurements and body-fat estimates below. The existing private tracker handles saving, editing and synchronisation.</p></article>');
 r.dataset.fpTab=tab.toLowerCase();r.classList.add('forge-progress-ready');
}
function enhance(){
 const r=section();if(!r||!document.querySelector('#nav [data-tab="progress"].on'))return;
 if(!r.querySelector('.forge-progress-app')){const mount=document.createElement('div');mount.className='forge-progress-app';r.prepend(mount)}
 classify(r);render();
}
function db(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(Error('Photo storage unavailable'));return}const req=indexedDB.open(photoDatabaseName(),1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('items'))req.result.createObjectStore('items',{keyPath:'id',autoIncrement:true})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Storage error'))})}
async function operation(type,fn){const database=await db();try{return await new Promise((resolve,reject)=>{const tx=database.transaction('items',type),req=fn(tx.objectStore('items'));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Operation failed'));tx.onabort=()=>reject(tx.error||Error('Storage interrupted'))})}finally{database.close()}}
async function migrateOldPhotos(){
 if(!legacyAllowed()){photoStatus='These older photos cannot be claimed by a different account.';render();return false}
 if(!confirm('Copy photos from the older FORGE browser journal into your signed-in profile? The originals will remain on this device.'))return false;
 try{
  const old=await new Promise((resolve,reject)=>{
   const request=indexedDB.open('forge-progress-photos',1);
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  let list=[];
  try{
   if(old.objectStoreNames.contains('items'))list=await new Promise((resolve,reject)=>{
    const transaction=old.transaction('items','readonly'),request=transaction.objectStore('items').getAll();
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
   });
  }finally{old.close()}
  const owner=photoOwner();
  for(const item of list.slice(0,100)){
   if(owner!==photoOwner())throw Error('Account changed; migration stopped');
   await operation('readwrite',store=>store.add({date:item.date,blob:item.blob}));
  }
  if(owner!==photoOwner())throw Error('Account changed; migration stopped');
  localStorage.setItem(LEGACY_PHOTO_IMPORTED,owner);
  photoStatus=list.length+' older photos copied to this account. Existing originals were not deleted.';
  await fetchPhotos();return true;
 }catch(e){photoStatus='Could not finish copying old photos. No originals were deleted.';render();return false}
}
async function fetchPhotos(){const token=++photoGeneration;try{const items=await operation('readonly',s=>s.getAll());if(token!==photoGeneration)return;urls.forEach(URL.revokeObjectURL);urls=[];photos=items.sort((a,b)=>b.id-a.id).slice(0,40).map(x=>{const url=URL.createObjectURL(x.blob);urls.push(url);return {id:x.id,url,date:x.date,type:x.blob?.type||'image/jpeg'}})}catch(e){photoStatus=e.message||'Could not read photos';photos=[]}if(tab==='Photos')render()}
async function savePhoto(file){if(photoBusy||!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024||!file.size){photoStatus='Choose a JPG, PNG or WebP image under 8 MB.';render();return}photoBusy=true;photoStatus='Saving to this device…';render();try{await operation('readwrite',s=>s.add({date:stamp(new Date()),blob:file}));await fetchPhotos();photoStatus='Photo saved on this device.'}catch(e){photoStatus=e.message||'Could not save photo'}photoBusy=false;if(tab==='Photos')render()}
async function deletePhoto(id){if(!Number.isSafeInteger(id)||!confirm('Delete this photo from this browser?'))return;try{await operation('readwrite',s=>s.delete(id));await fetchPhotos();photoStatus='Photo deleted.'}catch(e){photoStatus=e.message||'Could not delete photo'}if(tab==='Photos')render()}
document.addEventListener('click',e=>{
 const r=section(),mount=r?.querySelector('.forge-progress-app');if(!mount?.contains(e.target))return;
 const t=e.target.closest('[data-fp-tab]');if(t){tab=t.dataset.fpTab;render();if(tab==='Photos')fetchPhotos();return}
 const p=e.target.closest('[data-fp-period]');if(p){range=p.dataset.fpPeriod;render();return}
 const g=e.target.closest('[data-fp-go]');if(g){document.querySelector('#nav [data-tab="'+g.dataset.fpGo+'"]')?.click();return}
 const legacy=e.target.closest('[data-fp-legacy]');if(legacy){void migrateOldPhotos();return}
 const b=e.target.closest('[data-fp-delete]');if(b)deletePhoto(Number(b.dataset.fpDelete));
});
document.addEventListener('change',e=>{if(e.target.matches?.('[data-fp59-metric]')){metricId=e.target.value;render();return}if(e.target.matches?.('[data-fp-upload]')&&e.target.files?.[0])savePhoto(e.target.files[0])});
window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='progress')enhance()});
window.addEventListener('forge:cloud-session',()=>{photoGeneration++;urls.forEach(URL.revokeObjectURL);urls=[];photos=[];photoStatus='';if(tab==='Photos')render()});
document.addEventListener('DOMContentLoaded',enhance,{once:true});
window.forgeProgress={enhance,render,photoDatabaseName,legacyAllowed,migrateOldPhotos,metricSeries,metricExplorer,inspectReadOnly:data,availablePeriods:PERIODS};
})();