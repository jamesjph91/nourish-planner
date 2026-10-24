/* FORGE v37 — per-person onboarding and explicit account session UI.
   Google identity and server-side data ownership remain in Firebase; this is UI only. */
(()=>{'use strict';
const ACCOUNT='nourish-last-account-v1';
let status='checking',account=null,openedGuest=false,mode='welcome',notice='',conflictHasRemote=false;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const node=id=>document.getElementById(id);
const remembered=()=>{try{return !!localStorage.getItem(ACCOUNT)}catch{return true}};
const signed=()=>status==='ready'&&!!account;
const canGuest=()=>status==='guest'&&!remembered();
function badge(){
 const chip=node('forge-account-chip');
 if(!chip)return;
 const name=signed()?account?.displayName||account?.email||'My profile':openedGuest?'Guest · local only':remembered()?'Checking account…':'Your FORGE profile';
 chip.textContent='◉ '+String(name).slice(0,30);
 chip.title=signed()?'Manage this private FORGE account':'Open FORGE account sign-in';
 const mobile=node('forge-account-mobile-chip');
 if(mobile){
  mobile.textContent='◉';
  mobile.title=chip.title+(signed()?' · '+String(account?.email||''):'');
  mobile.setAttribute('aria-label','Manage your FORGE personal account');
 }
}
function show(msg=''){notice=msg;render()}
function profile(){
 try{return window.nourishCloudBridge?.getData()?.profile||{}}catch{return {}}
}
function close(){
 const modal=node('forge-account-gate');if(modal)modal.hidden=true;
 document.documentElement.classList.remove('forge-account-locked','forge-auth-pending');
}
function guard(){
 document.documentElement.classList.add('forge-account-locked');
 const modal=node('forge-account-gate');if(modal)modal.hidden=false;
}
function accountCard(){
 const name=escape(account?.displayName||account?.email||'Signed-in account');
 return '<div class="fa37-intro"><small>YOUR PRIVATE FORGE ACCOUNT</small><h2>'+name+'</h2><p>Workouts, meals and progress use this Google account. Other accounts cannot open its private cloud document when the published Firestore rules enforce ownership.</p></div>'+
 '<div class="fa37-buttons"><button type="button" data-fa-close>Return to FORGE</button><button type="button" data-fa-out>Sign out / switch account</button></div>'+
 '<p class="fa37-note">Before switching accounts, confirm cloud sync or export a backup. Locally stored progress photos are kept in account-specific storage.</p>'+
 (window.forgeDataSafetyV52?.accountStatusHtml?.()||'<p class="fa37-note">Browser saves and Google cloud saves are separate. Confirm cloud status before switching.</p>');
}
function signupForm(){
 return '<div class="fa37-intro"><small>SET UP YOUR PROFILE</small><h2>Make FORGE yours</h2><p>Only your own Google sign-in can access this cloud plan under the published per-user Firestore rules.</p></div>'+
 '<form id="fa37-form"><label>What should FORGE call you?<input id="fa37-name" maxlength="30" required minlength="2" placeholder="Your first name or nickname" autocomplete="nickname" value="'+escape(account?.displayName?.split(' ')[0]||'')+'"></label>'+
 '<label>Weight goal (kg) · optional<input id="fa37-goal" type="number" min="35" max="350" step="0.1" inputmode="decimal" placeholder="Add later if you prefer"></label>'+
 '<p class="fa37-note">You can edit your goal or personal details at any time under Progress. No measurements are shared with friends by default.</p>'+
 '<button type="submit">✓ Create my profile</button></form>'+
 '<button type="button" class="fa37-text" data-fa-out>Use a different Google account</button>';
}
function welcome(){
 if(status==='checking'||status==='loading')return '<div class="fa37-intro"><small>PRIVATE ACCOUNTS</small><h2>Restoring your account…</h2><p>Checking your Google sign-in and private plan before showing personal data.</p></div>'+
 '<div class="fa37-buttons"><button type="button" data-fa-out>Switch Google account</button></div>';
 if(status==='conflict')return '<div class="fa37-intro"><small>PRIVATE ACCOUNT DECISION</small><h2>Choose your FORGE data</h2><p>'+escape(notice||'This browser and Google account have different plans.')+'</p><p>Nothing will be uploaded until you choose. Only use the device plan if the records belong to you. If unsure, export a backup before continuing.</p></div>'+
 '<div class="fa37-buttons">'+(conflictHasRemote?'<button type="button" data-fa-conflict="cloud">Use my private cloud plan</button>':'')+
 '<button type="button" data-fa-conflict="device">Use this browser’s plan</button>'+
 '<button type="button" data-fa-conflict="fresh">Start with a fresh profile</button>'+
 '<button type="button" data-fa-out>Sign out</button></div>';
 if(status==='error')return '<div class="fa37-intro"><small>ACCOUNT CHECK REQUIRED</small><h2>We couldn’t verify your account</h2><p>Personal records stay hidden until sign-in succeeds. Check your internet connection and try again. Avoid clearing device storage.</p></div>'+
 '<div class="fa37-buttons"><button type="button" data-fa-retry>Retry sign-in check</button><button type="button" data-fa-out>Sign out safely</button></div>';
 if(status==='ready'&&mode==='manage')return accountCard();
 if(status==='ready'&&!profile().nickname)return signupForm();
 if(status==='ready')return '';
 return '<div class="fa37-intro"><small>TRAIN HARDER · EAT SMARTER · LIVE BETTER</small><h2>Your fitness. Your profile.</h2><p>Join FORGE with your own Google account. Your workouts, food diary, meal plan and measurements stay separate from other people’s accounts.</p></div>'+
 '<div class="fa37-benefits"><span>✓ Your own workout history</span><span>✓ Personal calorie and protein goals</span><span>✓ 210 recipes and custom meal plans</span><span>✓ Private progress records</span></div>'+
 '<div class="fa37-buttons"><button type="button" data-fa-in="create">Create my FORGE profile</button><button type="button" data-fa-in="signin">Sign in to my account</button>'+
 (canGuest()?'<button type="button" data-fa-guest>Use without an account · this device only</button>':'')+'</div>'+
 '<p class="fa37-note">A Google account is required for private cloud sync. Guest changes are saved only in this browser and are not protected by a login.</p>';
}
function render(){
 badge();
 const modal=node('forge-account-gate');if(!modal)return;
 const shouldShow=status!=='ready'||(signed()&&!profile().nickname)||mode==='manage';
 if(!shouldShow){close();return}
 guard();
 const body=node('fa37-content');if(body)body.innerHTML=welcome();
 const msg=node('fa37-message');if(msg){msg.textContent=notice;msg.hidden=!notice}
}
function onAuth(nextState,details){
 if(!['checking','guest','loading','ready','error'].includes(nextState))return;
 status=nextState;
 account=details?{uid:String(details.uid||''),displayName:String(details.displayName||''),email:String(details.email||'')}:null;
 if(status==='ready')mode='welcome';
 if(status==='guest')openedGuest=false;
 notice='';render();
}
function cloudReady(){
 if(status==='loading')status='ready';
 render();
}
function cloudError(message){
 if(status==='loading'||status==='checking'){status='error';notice=String(message||'Cloud sign-in unavailable');render()}
}
function hide(){
 if(!signed()||!profile().nickname)return;
 mode='welcome';render();
}
function showManage(){
 if(!signed()){mode='welcome';render();return}
 mode='manage';render();
}
function mount(){
 if(node('forge-account-gate'))return;
 const modal=document.createElement('div');modal.id='forge-account-gate';modal.className='fa37-gate';modal.setAttribute('role','region');modal.setAttribute('aria-label','FORGE account setup');
 modal.innerHTML='<div class="fa37-dialog"><div class="fa37-brand"><span>F</span><b>FORGE</b><small>PERSONAL ACCOUNTS</small></div><div id="fa37-content"></div><p class="fa37-message" id="fa37-message" aria-live="polite" hidden></p></div>';
 document.body.append(modal);
 const btn=document.createElement('button');btn.id='forge-account-chip';btn.className='fa37-chip';btn.type='button';btn.title='Open personal account';
 btn.addEventListener('click',showManage);
 const top=document.querySelector('.topline');
 if(top)top.append(btn);
 const mobile=document.querySelector('.forge-mobile-header');
 if(mobile){
  const compact=document.createElement('button');
  compact.type='button';compact.id='forge-account-mobile-chip';compact.className='fa37-mobile-chip';
  compact.setAttribute('aria-label','Manage your FORGE account');
  compact.textContent='◉';compact.addEventListener('click',showManage);
  const version=mobile.querySelector('.forge-version-btn');
  if(version)mobile.insertBefore(compact,version);else mobile.append(compact);
 }
 render();
}
document.addEventListener('click',event=>{
 const el=event.target.closest?.('[data-fa-in],[data-fa-out],[data-fa-retry],[data-fa-close],[data-fa-guest],[data-fa-conflict]');
 if(!el||!node('forge-account-gate')?.contains(el))return;
 if(el.hasAttribute('data-fa-conflict')){
  const decision=el.getAttribute('data-fa-conflict');if(window.forgeCloudResolveConflict?.(decision)){status='loading';show('Processing your selected account data…')}
 }else if(el.hasAttribute('data-fa-in')){
  const operation=el.getAttribute('data-fa-in');
  if(operation==='create'||operation==='signin'){
   mode=operation;
   if(typeof window.forgeCloudSignIn==='function'){show('Opening Google sign-in…');window.forgeCloudSignIn()}
   else show('Google sign-in is still loading or unavailable. Check your connection.');
  }
 }else if(el.hasAttribute('data-fa-out')){
  if(typeof window.forgeCloudSignOut==='function')window.forgeCloudSignOut();
  else show('Unable to switch accounts right now. Check your connection.');
 }else if(el.hasAttribute('data-fa-retry')){location.reload()}
 else if(el.hasAttribute('data-fa-close'))hide();
 else if(el.hasAttribute('data-fa-guest')&&canGuest()){
  openedGuest=true;mode='welcome';notice='';close();badge();
 }
});
document.addEventListener('submit',event=>{
 if(event.target?.id!=='fa37-form')return;event.preventDefault();
 if(!signed())return;
 const name=node('fa37-name')?.value.trim(),raw=node('fa37-goal')?.value.trim()||'';
 const goal=raw?Number(raw):null;
 if(!name||name.length<2||name.length>30||goal!==null&&(!Number.isFinite(goal)||goal<35||goal>350)){show('Please enter a name and an optional valid weight goal.');return}
 const success=window.forgeOnboardProfile?.(name,goal);
 if(success){notice='';mode='welcome';render()}
 else show('Could not save this profile on your device. Please check available storage and try again.');
});
window.addEventListener('forge:cloud-session',event=>onAuth(event.detail?.state,event.detail?.user));
window.addEventListener('forge:cloud-ready',cloudReady);
window.addEventListener('forge:cloud-conflict',event=>{status='conflict';conflictHasRemote=!!event.detail?.hasRemote;notice=String(event.detail?.reason||'Data selection required');render()});
window.addEventListener('forge:cloud-error',event=>cloudError(event.detail?.message));
window.addEventListener('storage',event=>{if(event.key==='nourish-last-account-v1'&&event.newValue!==event.oldValue){status='checking';guard();location.reload()}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.forgeAccounts={onAuth,cloudReady,cloudError,showManage,render,hide};
})();