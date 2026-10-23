/* FORGE v36 — data-save truthfulness, connectivity, multi-tab safety & storage controls.
   No background observers or polling. Never deletes user storage. */
(()=>{'use strict';
const KEY='nourishHigherDeficitV1';
let savedAt=null,failed=false,otherTab=false,error='';let root=null;
const byId=id=>document.getElementById(id);
const localTime=t=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date(t));
function localExists(){try{return !!localStorage.getItem(KEY)}catch{return false}}
function online(){return typeof navigator==='undefined'||navigator.onLine!==false}
function label(){
 if(failed)return 'Save failed — attention needed';
 if(otherTab)return 'Another tab changed your data';
 if(savedAt)return 'Saved on this device · '+localTime(savedAt);
 return localExists()?'Data stored on this device':'Local save not yet confirmed';
}
function connectionLabel(){return online()?'Online':'Offline · local features only'}
function render(){
 const chip=byId('forge-local-save');
 if(chip){chip.textContent=label();chip.classList.toggle('error',failed||otherTab);chip.setAttribute('aria-label',label())}
 const connection=byId('forge-connectivity');
 if(connection){connection.textContent=connectionLabel();connection.classList.toggle('offline',!online())}
 const warning=byId('forge-storage-warning');
 if(warning){warning.hidden=!(failed||otherTab);const msg=warning.querySelector('[data-fs-warning-text]');
  if(msg)msg.textContent=failed?'FORGE could not save your last change on this device'+(error?' ('+error+')':'')+'. Avoid closing this page until saving succeeds.': 'FORGE data changed in another open tab. Reload this tab before editing to prevent overwriting those changes.';
  const retry=warning.querySelector('[data-fs-retry]'),reload=warning.querySelector('[data-fs-reload]');
  if(retry)retry.hidden=!failed;if(reload)reload.hidden=!otherTab||failed;
 }
 const settings=byId('forge-storage-details');
 if(settings){
  const line=settings.querySelector('[data-fs-state]');if(line)line.textContent=label()+' · '+connectionLabel();
 }
}
function saveEvent(event){
 const d=event?.detail||{};
 failed=d.ok===false;error=failed?String(d.error||'browser storage unavailable').slice(0,70):'';
 if(d.ok===true){savedAt=Number(d.at)||Date.now();otherTab=false}
 render();
}
function externalChange(event){
 if(event.key!==KEY&&event.key!==null)return;
 otherTab=true;render();
}
async function storageStatus(){
 const msg=byId('forge-persistence-status');
 if(!msg)return;
 try{
  if(!navigator.storage?.persisted){msg.textContent='Your browser does not expose a storage-protection status. Keep periodic backups.';return}
  const approved=await navigator.storage.persisted();
  msg.textContent=approved?'Browser reports persistent site storage is enabled. This does not replace backups.':
   'Browser may remove site data when storage is low. You can request additional protection below.';
 }catch{msg.textContent='Unable to check device storage protection. Back up your data regularly.'}
}
async function requestProtection(){
 const msg=byId('forge-persistence-status');if(!msg)return;
 try{
  if(!navigator.storage?.persist){msg.textContent='Storage protection requests are unsupported on this browser. Backup exports still work.';return}
  msg.textContent='Requesting device storage protection…';
  const granted=await navigator.storage.persist();
  msg.textContent=granted?'Your browser granted persistent storage. Keep backups as well.':
   'Your browser did not grant persistent storage. No data has been deleted; download a backup regularly.';
 }catch{msg.textContent='The protection request could not be completed. Existing app data was not changed.'}
}
function settingsCard(){
 return '<section class="fs36-card" id="forge-storage-details" aria-label="Local data reliability">'+
 '<div><span>FORGE · DEVICE STORAGE</span><h3>Keep your progress safe</h3><p data-fs-state>'+label()+'</p></div>'+
 '<p id="forge-persistence-status" aria-live="polite">Checking storage protection…</p>'+
 '<div class="fs36-buttons"><button type="button" data-fs-protect>Request device storage protection</button><button type="button" data-fs-export>Export data backup</button></div>'+
 '<small>Storage protection is browser-dependent. JSON backups include the planner, workouts, food diary and imported activity, but NOT local IndexedDB progress photos. They must be backed up separately.</small></section>';
}
function enhanceSettings(){
 const section=byId('settings');if(!section)return;
 if(!section.querySelector('#forge-storage-details'))section.insertAdjacentHTML('beforeend',settingsCard());
 storageStatus();render();
}
function mount(){
 if(byId('forge-reliability-strip'))return;
 const strip=document.createElement('div');strip.id='forge-reliability-strip';strip.className='fs36-strip';
 strip.setAttribute('aria-label','FORGE device status');
 strip.innerHTML='<span id="forge-local-save" class="fs36-saved"></span><span id="forge-connectivity" class="fs36-network"></span>';
 const main=document.querySelector('main');
 if(main){
  const cloud=byId('cloud-banner');
  if(cloud)cloud.before(strip);else main.prepend(strip);
 }
 const warning=document.createElement('section');warning.id='forge-storage-warning';warning.className='fs36-warning';warning.hidden=true;warning.setAttribute('role','alert');
 warning.innerHTML='<p data-fs-warning-text></p><div><button data-fs-retry type="button">Retry saving</button><button data-fs-reload type="button">Reload saved version</button><button data-fs-backup type="button">Download backup</button></div>';
 document.body.append(warning);
 if(document.querySelector('#nav [data-tab="settings"].on'))enhanceSettings();
 render();
}
document.addEventListener('click',event=>{
 if(event.target.closest?.('[data-fs-retry]')){window.forgeRetryLocalSave?.();return}
 if(event.target.closest?.('[data-fs-reload]')){location.reload();return}
 if(event.target.closest?.('[data-fs-protect]')){requestProtection();return}
 if(event.target.closest?.('[data-fs-export],[data-fs-backup]')){if(typeof window.exportBackup==='function')window.exportBackup();return}
});
window.addEventListener('forge:save-status',saveEvent);
window.addEventListener('storage',externalChange);
window.addEventListener('online',render);
window.addEventListener('offline',render);
window.addEventListener('forge:view-rendered',event=>{if(event.detail?.tab==='settings')enhanceSettings()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.forgeReliability={saveEvent,externalChange,render,label,connectionLabel,storageStatus,requestProtection,enhanceSettings};
})();