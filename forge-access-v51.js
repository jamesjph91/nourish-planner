/* FORGE v51 — Accessible navigation and control guide.
   This module has no data writes and does not replace the existing navigation engine. */
(()=>{'use strict';
 const core=['overview','workouts','diary','health','progress'];
 const names={overview:'Today dashboard',workouts:'Train workouts',diary:'Fuel nutrition diary',
  health:'Activity tracker',progress:'Progress tracker',planner:'Meal planner',
  recipes:'Recipes',shopping:'Shopping list',prep:'Meal preparation',settings:'Settings'};
 let returnFocus=null;
 const byId=id=>document.getElementById(id);
 const nav=()=>byId('nav');
 function activeTab(){
  return nav()?.querySelector('[data-tab].on')?.dataset.tab||'overview';
 }
 function main(){
  const m=document.querySelector('main');
  if(m){m.id='forge-main-content';m.setAttribute('tabindex','-1');m.setAttribute('role','main')}
  return m;
 }
 function skipLink(){
  let skip=byId('forge-skip-link');
  if(skip)return skip;
  skip=document.createElement('a');
  skip.id='forge-skip-link';skip.className='fa51-skip';skip.href='#forge-main-content';
  skip.textContent='Skip to FORGE content';
  const shell=document.querySelector('.shell');
  if(shell?.parentNode)shell.parentNode.insertBefore(skip,shell);else document.body.prepend(skip);
  return skip;
 }
 function live(){
  let message=byId('forge-nav-announcement');
  if(message)return message;
  message=document.createElement('div');message.id='forge-nav-announcement';
  message.className='fa51-sr-only';message.setAttribute('aria-live','polite');
  message.setAttribute('aria-atomic','true');document.body.append(message);
  return message;
 }
 function sync(){
  const bar=nav();if(!bar)return;
  bar.setAttribute('aria-label','FORGE sections');
  const now=activeTab();
  for(const item of bar.querySelectorAll('button[data-tab]')){
   const id=item.dataset.tab,on=id===now;
   if(names[id])item.setAttribute('aria-label',names[id]);
   if(on)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
   item.setAttribute('aria-pressed',on?'true':'false');
   const digit=core.indexOf(id);
   if(digit>=0)item.setAttribute('aria-keyshortcuts','Alt+'+(digit+1));
  }
  const message=live();if(message)message.textContent=(names[now]||now)+' selected';
  const m=main();if(m)m.setAttribute('aria-label',(names[now]||'FORGE')+' content');
 }
 const helpContent='<div class="fa51-help-backdrop" id="forge-help-backdrop" hidden>'+
 '<section class="fa51-help-dialog" role="dialog" aria-modal="true" aria-label="FORGE navigation help">'+
 '<div class="fa51-help-heading"><div><small>FORGE / QUICK GUIDE</small><h2>Get around faster.</h2></div>'+
 '<button type="button" data-fa51-close aria-label="Close navigation help">✕</button></div>'+
 '<p>Use the five main tabs along the bottom on mobile, or the sidebar on desktop. These keyboard shortcuts work when using a keyboard:</p>'+
 '<div class="fa51-help-shortcuts">'+
 '<div><kbd>Alt</kbd> + <kbd>1</kbd><span>Today</span></div>'+
 '<div><kbd>Alt</kbd> + <kbd>2</kbd><span>Train</span></div>'+
 '<div><kbd>Alt</kbd> + <kbd>3</kbd><span>Fuel</span></div>'+
 '<div><kbd>Alt</kbd> + <kbd>4</kbd><span>Activity</span></div>'+
 '<div><kbd>Alt</kbd> + <kbd>5</kbd><span>Progress</span></div>'+
 '<div><kbd>?</kbd><span>Open this guide</span></div>'+
 '<div><kbd>Esc</kbd><span>Close this guide</span></div>'+
 '</div><p>For meals, shopping, app storage and backup tools, open Settings from the top-right menu or desktop sidebar. Your records stay on your device unless you have configured account sync.</p>'+
 '<div class="fa51-help-bottom"><button type="button" data-fa51-close>Got it</button></div>'+
 '</section></div>';
 function mountHelp(){
  if(!byId('forge-help-backdrop')){
   const host=document.createElement('div');host.innerHTML=helpContent;
   const overlay=host.firstElementChild;if(overlay)document.body.append(overlay);
  }
  const settings=byId('settings');
  if(settings&&!settings.querySelector('[data-fa51-open]')){
   const row=document.createElement('section');row.className='fa51-settings card';
   row.innerHTML='<div><span>FORGE · NAVIGATION</span><h3>Keyboard & accessibility</h3><p>Shortcuts, focus controls and mobile navigation tips.</p></div><button type="button" data-fa51-open>View shortcuts ↗</button>';
   settings.append(row);
  }
 }
 function openHelp(){
  mountHelp();const dialog=byId('forge-help-backdrop');if(!dialog)return;
  returnFocus=document.activeElement;
  dialog.hidden=false;
  dialog.querySelector('[data-fa51-close]')?.focus?.();
 }
 function closeHelp(){
  const dialog=byId('forge-help-backdrop');if(!dialog||dialog.hidden)return;
  dialog.hidden=true;
  const target=returnFocus;returnFocus=null;target?.focus?.();
 }
 function navigateShortcut(number){
  const id=core[number-1];if(!id)return false;
  const button=nav()?.querySelector('[data-tab="'+id+'"]');
  if(!button)return false;
  closeHelp();button.click();sync();return true;
 }
 function keydown(event){
  if(!event||event.defaultPrevented||event.ctrlKey||event.metaKey)return;
  const key=String(event.key||'');
  if(key==='Escape'&&byId('forge-help-backdrop')?.hidden===false){event.preventDefault();closeHelp();return}
  const target=event.target;
  const typing=!!target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||'');
  if(event.altKey&&/^[1-5]$/.test(key)&&!typing){
   if(navigateShortcut(Number(key)))event.preventDefault();
   return;
  }
  if(!typing&&!event.altKey&&(key==='?'||(key==='/'&&event.shiftKey))){
   if(byId('forge-help-backdrop')?.hidden===false)closeHelp();else openHelp();
   event.preventDefault();return;
  }
  if(byId('forge-help-backdrop')?.hidden===false&&key==='Tab'){
   const panel=byId('forge-help-backdrop'),items=[...panel.querySelectorAll('button:not([disabled])')];
   if(!items.length)return;
   const first=items[0],last=items[items.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }
 function mount(){
  main();skipLink();live();mountHelp();sync();
 }
 document.addEventListener('click',event=>{
  if(event.target.closest?.('[data-fa51-open]')){openHelp();return}
  if(event.target.closest?.('[data-fa51-close]')){closeHelp();return}
  if(event.target?.id==='forge-help-backdrop')closeHelp();
 });
 document.addEventListener('keydown',keydown);
 document.addEventListener('DOMContentLoaded',mount,{once:true});
 window.addEventListener('forge:view-rendered',event=>{
  sync();if(event.detail?.tab==='settings')mountHelp();
 });
 window.forgeAccessV51={activeTab,main,skipLink,live,sync,mountHelp,openHelp,closeHelp,navigateShortcut,keydown};
 if(document.readyState!=='loading')mount();
})();