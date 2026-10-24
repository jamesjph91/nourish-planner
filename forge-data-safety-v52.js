/* FORGE v52 — Device, account and backup safety.
   All summaries are read-only. The only independent write is a per-account
   timestamp when the user explicitly requests a JSON download. */
(()=>{'use strict';
const KEY='nourishHigherDeficitV1';
const byId=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const objects=x=>x&&typeof x==='object'&&!Array.isArray(x);
const count=x=>Array.isArray(x)?x.length:objects(x)?Object.keys(x).length:0;
const goodDate=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const dateText=x=>{try{return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(x))}catch{return 'Unknown date'}};
const accountSuffix=()=>String(window.forgeCurrentAccountUid||'guest').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,128)||'guest';
const key=()=> 'forge-last-backup-request-v52-'+accountSuffix();
let cloud='Not signed in · browser-only data',cloudKind='guest';
function readState(){
 try{
  const txt=localStorage.getItem(KEY);
  if(!txt)return {found:false,valid:true,state:{}};
  const data=JSON.parse(txt);
  if(!objects(data))return {found:true,valid:false,state:{}};
  return {found:true,valid:true,state:data};
 }catch{return {found:true,valid:false,state:{}}}
}
function totals(data=readState()){
 const s=data.state||{},sessions=s.workouts?.sessions||{},workouts=objects(sessions)?Object.values(sessions):[];
 return {found:data.found,valid:data.valid,
  foodEntries:count(s.foodDiary?.entries),savedFoods:count(s.foodDiary?.savedFoods),
  workouts:workouts.filter(x=>x?.completed===true).length,
  loggedSets:workouts.reduce((sum,x)=>sum+(objects(x?.sets)?Object.values(x.sets).reduce((a,arr)=>a+(Array.isArray(arr)?arr.filter(y=>y?.done===true).length:0),0):0),0),
  activityDays:count(s.healthActivity?.daily),measurements:count(s.measurements)};
}
function lastBackup(){
 try{const raw=localStorage.getItem(key());return goodDate(raw)?raw:null}catch{return null}
}
function markBackupRequested(){
 // A browser-initiated download is NOT proof the file exists in Downloads.
 const at=new Date().toISOString();
 try{localStorage.setItem(key(),at)}catch{}
 render();return at;
}
function cloudText(){
 const real=byId('cloud-status')?.textContent?.trim();
 if(cloudKind==='guest')return 'Not signed in · cloud sync unavailable for this session';
 if(cloudKind==='checking')return 'Account check in progress · no cloud save verified';
 if(cloudKind==='conflict')return 'Conflict · choose the right plan before syncing';
 if(cloudKind==='error')return 'Cloud error · device data may not be uploaded';
 if(real)return real;
 return cloud;
}
function snapshot(){
 const t=totals(),last=lastBackup();
 return {...t,cloud:cloudText(),backupAt:last,account:accountSuffix()};
}
function accountStatusHtml(){
 const s=snapshot();
 return '<section class="fd52-account-status" aria-label="Device and cloud save status">'+
 '<div><strong>THIS DEVICE</strong><p>'+(s.found?(s.valid?'Personal plan stored in this browser':'Stored data could not be read safely'):'No saved plan found yet')+'</p></div>'+
 '<div><strong>GOOGLE CLOUD</strong><p>'+esc(s.cloud)+'</p></div>'+
 '<small>A local save does not prove cloud sync. Check the cloud status in Settings before changing account or browser.</small></section>';
}
function healthMarkup(s=snapshot()){
 const cell=(title,value,detail)=>'<div class="fd52-stat"><small>'+title+'</small><strong>'+value+'</strong><span>'+detail+'</span></div>';
 return '<section class="fd52-safety" id="forge-data-safety-v52" aria-label="FORGE data health">'+
 '<header><div><small>FORGE / DATA SAFETY</small><h2>Your records. Your control.</h2></div><span class="fd52-readonly">READ ONLY</span></header>'+
 (s.valid?'<p class="fd52-intro">These are counts of entries stored in this browser, not a cloud backup confirmation.</p>':
 '<p class="fd52-warning">Your browser plan could not be read safely. Do not clear storage. Export a backup if the app still allows it.</p>')+
 '<div class="fd52-grid">'+cell('FOOD DIARY',s.foodEntries,'Logged entries')+
 cell('WORKOUTS',s.workouts,'Finished sessions · '+s.loggedSets+' completed sets')+
 cell('ACTIVITY',s.activityDays,'Recorded days')+
 cell('MEASUREMENTS',s.measurements,'Recorded dates')+'</div>'+
 '<div class="fd52-source"><div><b>Device storage</b><span>'+(s.found?(s.valid?'Readable local plan':'Unreadable local plan'):'No local plan yet')+'</span></div>'+
 '<div><b>Cloud sync</b><span>'+esc(s.cloud)+'</span></div></div>'+
 '<div class="fd52-backup"><small>LAST BACKUP REQUEST</small><strong>'+(s.backupAt?esc(dateText(s.backupAt)):'No JSON export requested on this device for this account')+'</strong>'+
 '<p>The timestamp means a download was requested, not that the file was saved successfully. Check your Downloads and keep a separate copy.</p>'+
 '<p><b>Progress photos are NOT in JSON backups.</b> They are stored separately on this device. Save your photos separately before switching devices or clearing browser data.</p>'+
 '<button type="button" data-fd52-export>Download JSON backup</button></div>'+
 '<div class="fd52-checklist"><strong>PRE-UPDATE CHECKLIST</strong><p>These checks are for your protection. Nothing on this card deletes or replaces data.</p>'+
 '<label><input type="checkbox" data-fd52-check> I downloaded and checked a JSON backup.</label>'+
 '<label><input type="checkbox" data-fd52-check> I saved local progress photos separately, if needed.</label>'+
 '<label><input type="checkbox" data-fd52-check> I checked the cloud status and closed other editing tabs.</label>'+
 '<button type="button" data-fd52-updates disabled>Check for app updates</button></div>'+
 '</section>';
}
function updateChecklist(){
 const section=byId('forge-data-safety-v52');
 if(!section)return;
 const checks=[...section.querySelectorAll('[data-fd52-check]')];
 const button=section.querySelector('[data-fd52-updates]');
 if(button)button.disabled=checks.length!==3||!checks.every(x=>x.checked===true);
}
function render(){
 const section=byId('settings');
 if(!section)return;
 let existing=byId('forge-data-safety-v52');
 const html=healthMarkup();
 if(existing){
  // Preserve deliberately checked pre-update confirmations on normal re-renders.
  const checked=[...existing.querySelectorAll('[data-fd52-check]')].map(x=>x.checked);
  existing.outerHTML=html;
  existing=byId('forge-data-safety-v52');
  [...(existing?.querySelectorAll('[data-fd52-check]')||[])].forEach((x,i)=>{x.checked=!!checked[i]});
  updateChecklist();
 }else section.insertAdjacentHTML('beforeend',html);
}
function inspectBackup(blob){
 if(!objects(blob)||blob.app!=='nourish'||!objects(blob.state))return {ok:false,error:'This is not a recognised FORGE / Nourish JSON backup.'};
 if(blob.version!==undefined&&(!Number.isInteger(blob.version)||blob.version<1||blob.version>2))return {ok:false,error:'This backup uses an unsupported version.'};
 const s=blob.state;
 const recognised=['settings','mealPrefs','swaps','checked','gym','walks','workouts','profile','measurements','foodDiary','healthActivity','customFoods','customRecipes','favorites'];
 if(!recognised.some(k=>Object.prototype.hasOwnProperty.call(s,k)))return {ok:false,error:'The backup contains no recognisable FORGE plan data.'};
 const objKeys=['workouts','settings','swaps','favorites','profile','customFoods','customRecipes','healthActivity','foodDiary'];
 const arrayKeys=['measurements'];
 for(const k of objKeys)if(s[k]!==undefined&&!objects(s[k]))return {ok:false,error:'Invalid backup structure in '+k+'.'};
 for(const k of arrayKeys)if(s[k]!==undefined&&!Array.isArray(s[k]))return {ok:false,error:'Invalid backup structure in '+k+'.'};
 for(const k of ['entries','savedFoods'])if(s.foodDiary?.[k]!==undefined&&!Array.isArray(s.foodDiary[k]))return {ok:false,error:'Invalid food diary records in backup.'};
 if(s.workouts?.sessions!==undefined&&!objects(s.workouts.sessions))return {ok:false,error:'Invalid workout sessions in backup.'};
 if(s.healthActivity?.daily!==undefined&&!Array.isArray(s.healthActivity.daily))return {ok:false,error:'Invalid activity records in backup.'};
 if(blob.exportedAt!==undefined&&!goodDate(blob.exportedAt))return {ok:false,error:'Invalid backup export date.'};
 const parts=totals({found:true,valid:true,state:s});
 return {ok:true,preview:{...parts,exportedAt:blob.exportedAt||null}};
}
function confirmImport(result){
 if(!result?.ok)return false;
 const p=result.preview;
 return confirm('PREVIEW FORGE BACKUP\n'+
  'Exported: '+(p.exportedAt?dateText(p.exportedAt):'Legacy backup · date unavailable')+'\n'+
  'Food diary entries: '+p.foodEntries+'\n'+
  'Finished workouts: '+p.workouts+'\n'+
  'Activity days: '+p.activityDays+'\n'+
  'Measurements: '+p.measurements+'\n\n'+
  'Importing will REPLACE this browser’s active plan with the validated backup. If signed in, edits can sync to your account. This does not import, erase or restore progress photos.\n\n'+
  'Cancel to export your current plan first. Do you want to import this backup?');
}
function cloudSession(event){
 const status=event?.detail?.state;
 if(status==='guest'){cloudKind='guest';cloud='Not signed in · browser only'}
 else if(status==='ready'){cloudKind='ready';cloud='Account authenticated · check cloud save message'}
 else if(status==='loading'||status==='checking'){cloudKind='checking';cloud='Checking cloud account'}
 else if(status==='error'){cloudKind='error';cloud='Cloud connection error'}
 render();
}
function cloudReady(){cloudKind='ready';cloud='Account plan loaded; ongoing save state shown by cloud sync';render()}
function cloudConflict(){cloudKind='conflict';cloud='Account data choice needed before cloud save';render()}
function cloudError(){cloudKind='error';cloud='Cloud sync problem; local save is separate';render()}
document.addEventListener('click',e=>{
 if(e.target?.closest?.('[data-fd52-export]')){window.exportBackup?.();return}
 if(e.target?.closest?.('[data-fd52-updates]')){if(!e.target.disabled)window.forgeUpdater?.check?.(true);return}
});
document.addEventListener('change',e=>{if(e.target?.matches?.('[data-fd52-check]'))updateChecklist()});
window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='settings')render()});
window.addEventListener('forge:save-status',()=>{if(byId('forge-data-safety-v52'))render()});
window.addEventListener('forge:cloud-session',cloudSession);
window.addEventListener('forge:cloud-ready',cloudReady);
window.addEventListener('forge:cloud-conflict',cloudConflict);
window.addEventListener('forge:cloud-error',cloudError);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(byId('settings')&&!byId('settings').classList.contains('hidden'))render()},{once:true});
window.forgeDataSafetyV52={totals,snapshot,healthMarkup,inspectBackup,confirmImport,lastBackup,markBackupRequested,accountStatusHtml,render,updateChecklist,cloudSession,cloudReady,cloudConflict,cloudError};
})();