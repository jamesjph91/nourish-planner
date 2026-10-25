'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('forge-accounts.js','utf8');
function boot({stored='accountA',nickname='Alex',sameAccount=true}={}){
 const listeners={},docListeners={},seen=new Set(),store=new Map(stored?[['nourish-last-account-v1',stored]]:[]);
 const classList={add:key=>seen.add(key),remove:key=>seen.delete(key)};
 const nodes={
  'forge-account-gate':{hidden:true,contains:()=>true},
  'fa37-content':{innerHTML:''},
  'fa37-message':{hidden:true,textContent:''},
  'forge-account-chip':{textContent:'',title:''},
  'cloud-status':{textContent:''}
 };
 const window={
  addEventListener:(event,callback)=>{listeners[event]??=[];listeners[event].push(callback)},
  nourishCloudBridge:{getData:()=>({profile:{nickname}})},
  forgeCurrentAccountUid:stored,
  forgeCloudRedirectSignIn:()=>{window.redirects++},redirects:0
 };
 const document={readyState:'loading',getElementById:id=>nodes[id]||null,
  documentElement:null,
  addEventListener:(event,cb)=>{docListeners[event]??=[];docListeners[event].push(cb)}};
 const html={classList};
 const context={window,document,localStorage:{getItem:key=>store.get(key)||null},
  console,location:{reload(){}},Number,String,Date};
 document.documentElement=html;
 vm.runInNewContext(code,context,{filename:'forge-accounts.js'});
 const fire=(key,detail)=>{for(const fn of listeners[key]||[])fn({detail})};
 const click=attr=>{
  const target={hasAttribute:key=>key===attr,getAttribute:key=>key===attr?null:undefined,
   closest:sel=>sel.includes('['+attr+']')?target:null};
  for(const callback of docListeners.click||[])callback({target});
 };
 const user=uid=>({uid:uid||stored,email:'user@example.test',displayName:'Your account'});
 return {window,docListeners,nodes,seen,store,fire,click,user};
}
test('Account sign-in includes visible Android recovery and safe-refresh link',()=>{
 const x=boot();
 assert.match(x.nodes['fa37-content'].innerHTML,/^\s*$/);
 x.window.forgeAccounts.render();
 const html=x.nodes['fa37-content'].innerHTML;
 assert.match(html,/Try Google redirect sign-in/);
 assert.match(html,/Safe app refresh/);
 assert.match(html,/Do not uninstall FORGE/);
 assert.doesNotMatch(html,/data-fa-device/,'No authenticated user has been verified yet');
});
test('An authenticated account can explicitly open matching local saved data while cloud is pending',()=>{
 const x=boot({stored:'accountA',nickname:'Alex'});
 x.window.forgeAccounts.onAuth('loading',x.user('accountA'));
 assert.equal(x.window.forgeAccounts.savedDeviceReady(),true);
 assert.match(x.nodes['fa37-content'].innerHTML,/Open saved data on this device/);
 x.click('data-fa-device');
 assert.equal(x.window.forgeAccounts.getState().openedDevice,true);
 assert.equal(x.nodes['forge-account-gate'].hidden,true);
 assert.ok(!x.seen.has('forge-account-locked'));
 assert.match(x.nodes['cloud-status'].textContent,/Cloud sync is not confirmed/);
 x.fire('forge:cloud-conflict',{reason:'A different plan exists',hasRemote:true});
 assert.equal(x.nodes['forge-account-gate'].hidden,false,'A conflict re-locks the gate for explicit data choice');
 assert.equal(x.window.forgeAccounts.getState().openedDevice,false);
});
test('Never bypass gate for a different UID, unsigned guest, or unsaved profile',()=>{
 const x=boot({stored:'accountA',nickname:'Alex'});
 x.window.forgeAccounts.onAuth('loading',x.user('accountB'));
 assert.equal(x.window.forgeAccounts.savedDeviceReady(),false);
 x.click('data-fa-device');
 assert.equal(x.nodes['forge-account-gate'].hidden,false);
 x.window.forgeAccounts.onAuth('guest');
 assert.equal(x.window.forgeAccounts.savedDeviceReady(),false);
 const missing=boot({stored:'accountA',nickname:''});
 missing.window.forgeAccounts.onAuth('loading',missing.user('accountA'));
 assert.equal(missing.window.forgeAccounts.savedDeviceReady(),false);
});
test('Redirect action calls real provider route without clearing browser records',()=>{
 const x=boot();
 x.window.forgeAccounts.render();
 x.click('data-fa-redirect');
 assert.equal(x.window.redirects,1);
 assert.doesNotMatch(code,/localStorage\.(?:removeItem|clear)\(/);
 assert.doesNotMatch(code,/indexedDB\.deleteDatabase/);
});
test('Recovering from cloud error can reopen the matching previously signed-in profile',()=>{
 const x=boot({stored:'accountA',nickname:'Alex'});
 x.window.forgeAccounts.onAuth('loading',x.user('accountA'));
 x.window.forgeAccounts.cloudError('Network unavailable');
 assert.match(x.nodes['fa37-content'].innerHTML,/Open saved data on this device/);
 x.click('data-fa-device');
 assert.equal(x.window.forgeAccounts.getState().openedDevice,true);
 x.fire('forge:cloud-ready',{uid:'accountA'});
 assert.equal(x.window.forgeAccounts.getState().openedDevice,false);
});
test('Recovery panel remains keyboard accessible and touch friendly',()=>{
 const css=fs.readFileSync('forge-v37-accounts.css','utf8');
 assert.match(css,/fa60-recovery-actions button:focus-visible/);
 assert.match(css,/min-height:48px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/forge-accounts\.js\?v=60/);
 assert.match(html,/cloud-sync\.js\?v=60/);
 assert.match(html,/forge-v37-accounts\.css\?v=60/);
});
