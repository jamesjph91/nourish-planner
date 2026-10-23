/* FORGE v28 update manager — no data reset, no uninstall. */
(()=>{'use strict';
const CURRENT=29;
let latest=CURRENT,checking=false,lastCheck=0;
const base='./';
const byId=id=>document.getElementById(id);
function status(message){const p=byId('forge-update-status');if(p)p.textContent=message}
function showNew(){const b=byId('forge-new-version');if(b)b.hidden=latest<=CURRENT}
async function check(force=false){
 if(checking||(!force&&Date.now()-lastCheck<600000))return;
 checking=true;lastCheck=Date.now();
 try{
  const response=await fetch(base+'forge-build.json?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('Could not reach update server');
  const data=await response.json(),version=Number(data.version);
  if(!Number.isSafeInteger(version)||version<1)throw Error('Unexpected release information');
  latest=Math.max(latest,version);
  status(latest>CURRENT?'FORGE v'+latest+' is ready to install.':'FORGE v'+CURRENT+' is up to date.');
  showNew();
 }catch(e){status('Unable to check online right now. Saved data is unchanged.')}
 finally{checking=false}
}
async function refresh(){
 status('Refreshing app files…');
 try{
  if('serviceWorker' in navigator){
   const reg=await navigator.serviceWorker.getRegistration('./');
   if(reg)try{await reg.update()}catch(e){}
  }
  // User data is deliberately never touched. Change URL to bypass HTTP caches.
  location.assign(base+'index.html?v='+Math.max(CURRENT,latest)+'&fresh='+Date.now());
 }catch(e){status('Update could not finish. Try opening the recovery link in Chrome.')}
}
function openPanel(){const p=byId('forge-update-panel');if(p){p.hidden=false;check(true)}}
function mount(){
 if(byId('forge-update-panel'))return;
 const panel=document.createElement('div');panel.id='forge-update-panel';panel.hidden=true;
 panel.innerHTML='<div class="forge-update-dialog" role="dialog" aria-label="FORGE update settings"><header><b>FORGE APP UPDATES</b><button type="button" data-close aria-label="Close">✕</button></header><p id="forge-update-status">Checking FORGE version…</p><div class="forge-update-buttons"><button type="button" data-check>Check again</button><button type="button" data-refresh>Refresh FORGE</button></div><small>Safe refresh: your saved workouts, meal diary, measurements and private photos are not deleted.</small></div>';
 document.body.append(panel);
 panel.querySelector('[data-close]').addEventListener('click',()=>panel.hidden=true);
 panel.querySelector('[data-check]').addEventListener('click',()=>check(true));
 panel.querySelector('[data-refresh]').addEventListener('click',refresh);
 const banner=document.createElement('div');banner.id='forge-new-version';banner.hidden=true;
 banner.innerHTML='<span>NEW FORGE VERSION AVAILABLE</span><button type="button">Update now ↗</button>';
 document.body.append(banner);banner.querySelector('button').addEventListener('click',refresh);
 const mobile=document.querySelector('.forge-mobile-header');
 if(mobile){
  const b=document.createElement('button');b.type='button';b.className='forge-version-btn';b.textContent='v'+CURRENT+' ↻';b.setAttribute('aria-label','Check for FORGE updates');b.addEventListener('click',openPanel);
  const gear=mobile.querySelector('button');mobile.insertBefore(b,gear);
 }
 const brand=document.querySelector('.sidebar>.brand');
 if(brand){
  const b=document.createElement('button');b.type='button';b.className='forge-version-btn';b.textContent='FORGE v'+CURRENT+' · Check updates ↻';b.addEventListener('click',openPanel);brand.after(b);
 }
 check(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
window.addEventListener('online',()=>check(true));
window.forgeUpdater={version:CURRENT,check,refresh};
})();