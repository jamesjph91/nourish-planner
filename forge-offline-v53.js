/* FORGE v53 — read-only offline readiness, version checks and safe recovery guidance. */
(()=>{'use strict';
const CRITICAL=['./index.html','./forge-native.css','./gym.js','./food-diary.js',
 './health-hub.js','./progress.js','./forge-master-ui.js','./forge-dashboard.js',
 './forge-accounts.js','./forge-offline-v53.js'];
const CACHE_NAME='forge-v58-activity-import';
const byId=id=>document.getElementById(id);
const installed=()=>{
 const n=Number(document.querySelector('meta[name="forge-release"]')?.content);
 return Number.isSafeInteger(n)&&n>0?n:null;
};
const safe=n=>String(n??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let report={state:'unchecked',missing:[],ready:0,total:CRITICAL.length,cacheName:CACHE_NAME},release={state:'unchecked',number:null};
async function inspect(){
 const result={state:'unchecked',missing:[],ready:0,total:CRITICAL.length,cacheName:CACHE_NAME};
 if(!('caches' in window)||!('serviceWorker' in navigator)){result.state='unsupported';report=result;render();return result}
 try{
  const keys=await caches.keys();
  if(!keys.includes(CACHE_NAME)){result.state='not-ready';result.missing=[...CRITICAL];report=result;render();return result}
  const cache=await caches.open(CACHE_NAME);
  for(const file of CRITICAL){
   const url=new URL(file,location.href).href;
   const hit=await cache.match(url,{ignoreSearch:true});
   if(hit?.ok)result.ready++;
   else result.missing.push(file);
  }
  result.state=result.missing.length?'partial':'ready';
 }catch{result.state='error';result.missing=[...CRITICAL]}
 report=result;render();return result;
}
async function latest(){
 const outcome={state:'checking',number:null};
 release=outcome;render();
 try{
  const response=await fetch('./forge-build.json?check='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('unavailable');
  // A cached response may be served offline by a previous worker, so do not claim live
  // verification when the browser reports no connectivity.
  if(navigator.onLine===false)throw Error('offline');
  const meta=await response.json(),n=Number(meta.version);
  if(!Number.isSafeInteger(n)||n<1)throw Error('invalid version');
  outcome.number=n;
  outcome.state='verified';
 }catch{outcome.state='unavailable'}
 release=outcome;render();return outcome;
}
function model(){
 const version=installed();
 const offline=report.state==='ready'?'Core files cached for offline opening':
  report.state==='partial'?'Some essential files are missing from this app cache':
  report.state==='not-ready'?'This release has not finished caching essential files':
  report.state==='unsupported'?'Offline cache information is unavailable in this browser':
  report.state==='error'?'Could not inspect offline app files':
  'Offline readiness has not been checked';
 const online=release.state==='verified'?
  'Latest checked release: v'+release.number+(version&&release.number>version?' · update available':version&&release.number===version?' · matches installed version':' · installed version differs'):
  release.state==='checking'?'Checking the published release…':
  release.state==='unavailable'?'Could not verify the latest published version · no update claim':'Not checked against the published release';
 return {version,offline,online,report,release};
}
function markup(){
 const m=model();
 const missing=m.report.missing.map(x=>safe(x.replace('./',''))).join(', ');
 return '<section class="fo53" id="forge-offline-v53" aria-label="FORGE offline and recovery status">'+
 '<header><div><small>FORGE / OFFLINE & RECOVERY</small><h2>Ready when you are.</h2></div><span class="fo53-version">v'+(m.version??'—')+'</span></header>'+
 '<div class="fo53-grid"><div><small>INSTALLED APP</small><strong>v'+(m.version??'—')+'</strong><span>Version open in this window</span></div>'+
 '<div><small>DEPLOYED RELEASE</small><strong>'+(m.release.state==='verified'?'v'+m.release.number:'Not verified')+'</strong><span>'+safe(m.online)+'</span></div></div>'+
 '<div class="fo53-status" role="status" aria-live="polite"><b>'+safe(m.offline)+'</b>'+
 '<p>'+m.report.ready+' of '+m.report.total+' essential app files found in this release’s offline cache.</p>'+
 (missing?'<p class="fo53-missing">Missing: '+missing+'</p>':'')+
 '<p>Only the local app shell is checked. Google sign-in/sync, cloud documents, online food databases, barcode lookups and external imagery still require a connection.</p></div>'+
 '<div class="fo53-actions"><button type="button" data-fo53-check>Check offline files</button><button type="button" data-fo53-version>Check published version</button></div>'+
 '<div class="fo53-recovery"><strong>ANDROID / INSTALLED FORGE RECOVERY</strong>'+
 '<ol><li>Reconnect to Wi-Fi or mobile data before fixing an old app.</li>'+
 '<li>Open FORGE in Chrome and check the version and offline files above.</li>'+
 '<li>If the installed icon still shows an older version, use Safe app refresh below.</li>'+
 '<li>Reopen FORGE from your home-screen icon after the refresh has loaded.</li></ol>'+
 '<p>The safe refresh resets downloaded website caches and service-worker registrations only. <b>Do not clear Chrome site storage, uninstall the PWA or delete app data</b> without separate JSON and photo backups.</p>'+
 '<a class="fo53-link" href="./refresh-forge.html?from=offline">Open safe app refresh ↗</a></div></section>';
}
function render(){
 const settings=byId('settings');if(!settings)return;
 const existing=byId('forge-offline-v53');
 if(existing)existing.outerHTML=markup();
 else settings.insertAdjacentHTML('beforeend',markup());
}
document.addEventListener('click',event=>{
 if(event.target?.closest?.('[data-fo53-check]')){void inspect();return}
 if(event.target?.closest?.('[data-fo53-version]')){void latest();return}
});
window.addEventListener('forge:view-rendered',event=>{
 if(event.detail?.tab==='settings'){render();void inspect()}
});
window.addEventListener('online',()=>{if(byId('forge-offline-v53')){void inspect()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
 if(byId('settings')&&!byId('settings').classList.contains('hidden')){render();void inspect()}
},{once:true});
window.forgeOfflineV53={CRITICAL,CACHE_NAME,installed,inspect,latest,model,markup,render};
})();