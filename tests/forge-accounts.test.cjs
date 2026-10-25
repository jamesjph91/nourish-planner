'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const index=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('cloud-sync.js','utf8');
const account=fs.readFileSync('forge-accounts.js','utf8');
const photos=fs.readFileSync('forge-progress.js','utf8');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
function fakeCloud({uidOnDevice=null,custom=false}={}){
 const map=new Map(),messages=[],events=[],writes=[],subscriptions=[],local={profile:{},foodDiary:{entries:custom?[{name:'previous owner'}]:[]},workouts:{sessions:{}}};
 if(uidOnDevice)map.set('nourish-last-account-v1',uidOnDevice);
 let resetCount=0,handler=null;
 const bridge={
  getData(){return structuredClone(local)},
  isLocalCustom(){return local.foodDiary.entries.length>0||!!local.profile.nickname},
  resetPrivatePlan(){resetCount++;local.profile={};local.foodDiary={entries:[]};local.workouts={sessions:{}}},
  applyData(payload){for(const key of Object.keys(local))delete local[key];Object.assign(local,structuredClone(payload));return true}
 };
 const controls={replaceChildren(){},append(){}};
 const nodes={'cloud-status':{textContent:''},'cloud-actions':controls};
 const document={getElementById:id=>nodes[id],createElement(){return {textContent:'',className:'',type:'',addEventListener(name,fn){this.click=fn}}}};
 const window={nourishCloudBridge:bridge,NOURISH_FIREBASE_CONFIG:{apiKey:'public',authDomain:'test.local',projectId:'forge',appId:'1234'},
  addEventListener(){},dispatchEvent(event){events.push(event)}};
 const store={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const sessionStore=new Map(),sessionStorage={getItem:k=>sessionStore.get(k)||null,setItem:(k,v)=>sessionStore.set(k,v)};
 const firebaseAuth={getAuth:()=>({}),GoogleAuthProvider:class{},signInWithPopup:async()=>null,onAuthStateChanged:(auth,callback)=>{handler=callback},signOut:async()=>{handler(null)}};
 const imports={app:{initializeApp:()=>({})},auth:firebaseAuth,firestore:{
  getFirestore:()=>({}),doc:(db,...path)=>path.join('/'),serverTimestamp:()=>({timestamp:true}),
  onSnapshot:(ref,callback,err)=>{subscriptions.push({ref,callback,err});return ()=>{}},
  setDoc:async(ref,payload)=>{writes.push({ref,payload})}
 }};
 const transformed=script.replace("import(sdk+'firebase-app.js')","Promise.resolve(__imports.app)")
  .replace("import(sdk+'firebase-auth.js')","Promise.resolve(__imports.auth)")
  .replace("import(sdk+'firebase-firestore.js')","Promise.resolve(__imports.firestore)");
 const CustomEvent=class{constructor(type,options){this.type=type;this.detail=options?.detail}};
 const fn=new AsyncFunction('document','window','localStorage','sessionStorage','CustomEvent','__imports','confirm',transformed);
 const started=fn(document,window,store,sessionStorage,CustomEvent,imports,()=>true);
 return {started,emitUser:user=>handler(user),snapshot:(row=null)=>{const latest=subscriptions.at(-1);assert.ok(latest);latest.callback({metadata:{hasPendingWrites:false,fromCache:false},exists:()=>row!==null,data:()=>row})},local,events,writes,store,subscriptions,resetCount:()=>resetCount,window};
}
const user=(uid)=>({uid,email:uid+'@example.test',displayName:uid});
test('Every Firebase document write is scoped to the current authenticated UID',async()=>{
 const x=fakeCloud({uidOnDevice:'ownerA',custom:true});await x.started;
 x.emitUser(user('ownerB'));
 assert.equal(x.resetCount(),1);
 assert.equal(x.local.foodDiary.entries.length,0);
 x.snapshot();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(x.writes.length,1);
 assert.equal(x.writes[0].ref,'users/ownerB/private/nourish-plan');
 assert.deepEqual(x.writes[0].payload.state.foodDiary.entries,[]);
 assert.equal(x.store.getItem('nourish-last-account-v1'),'ownerB');
 assert.ok(x.events.some(e=>e.type==='forge:cloud-ready'));
});
test('Sign-out clears the previous account active records before offering guest mode',async()=>{
 const x=fakeCloud({uidOnDevice:'oldOwner',custom:true});await x.started;
 x.emitUser(null);
 assert.equal(x.resetCount(),1);
 assert.equal(x.store.getItem('nourish-last-account-v1'),null);
 assert.equal(x.local.foodDiary.entries.length,0);
 assert.equal(x.events.at(-1).detail.state,'guest');
 assert.equal(x.writes.length,0);
});
test('Anonymous local data is never uploaded silently to a new Google user',async()=>{
 const x=fakeCloud({custom:true});await x.started;
 x.emitUser(user('newOwner'));x.snapshot();
 assert.equal(x.writes.length,0);
 assert.ok(x.events.some(e=>e.type==='forge:cloud-conflict'));
 assert.equal(x.local.foodDiary.entries[0].name,'previous owner');
 assert.equal(x.window.forgeCloudResolveConflict('device'),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(x.writes.length,1);
 assert.equal(x.writes[0].ref,'users/newOwner/private/nourish-plan');
});
test('Importing cloud plan supersedes unclaimed local records without cross-account upload',async()=>{
 const x=fakeCloud({custom:true});await x.started;
 x.emitUser(user('newOwner'));
 x.snapshot({state:{profile:{nickname:'Remote Owner'},foodDiary:{entries:[{name:'my cloud diary'}]},workouts:{sessions:{}}},updatedBy:'anotherDevice'});
 assert.equal(x.writes.length,0);
 assert.ok(x.events.some(e=>e.type==='forge:cloud-conflict'));
 assert.equal(x.window.forgeCloudResolveConflict('cloud'),true);
 assert.equal(x.writes.length,0);
 assert.equal(x.local.foodDiary.entries[0].name,'my cloud diary');
 assert.ok(x.events.some(e=>e.type==='forge:cloud-ready'));
});
test('First guest session does not delete guest logs',async()=>{
 const x=fakeCloud({custom:true});await x.started;
 x.emitUser(null);
 assert.equal(x.resetCount(),0);assert.equal(x.local.foodDiary.entries.length,1);
 assert.equal(x.writes.length,0);
});
test('Account onboarding, app gating and photo storage are separate by account',()=>{
 new vm.Script(account);
 const css=fs.readFileSync('forge-v37-accounts.css','utf8');
 assert.match(index,/id="forge-auth-bootstrap"/);
 assert.match(index,/forge-accounts\.js\?v=60/);
 assert.match(index,/forge-v37-accounts\.css\?v=60/);
 assert.match(index,/window\.forgeOnboardProfile/);
 assert.match(account,/Create my FORGE profile/);
 assert.match(account,/forge:cloud-conflict/);
 assert.match(account,/data-fa-conflict="cloud"/);
 assert.match(css,/forge-account-locked \.shell/);
 assert.match(photos,/forge-progress-photos-account-/);
 assert.match(photos,/LEGACY_PHOTO_OWNER/);
 assert.match(photos,/owner!==photoOwner\(\)/);
 assert.doesNotMatch(photos,/indexedDB\.deleteDatabase/);
});
test('Source rules restrict personal plans to matching Firebase user IDs',()=>{
 const rules=fs.readFileSync('firestore.rules','utf8');
 assert.match(rules,/match \/users\/\{uid\}\/private\/nourish-plan/);
 assert.match(rules,/allow read, write: if request\.auth != null && request\.auth\.uid == uid/);
 assert.match(rules,/allow read, write: if false/);
});
