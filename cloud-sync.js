// FORGE v37 private cloud session: Google auth, UID-owned Firestore documents,
// and explicit decisions before claiming pre-existing device records.
const message=document.getElementById('cloud-status');
const controls=document.getElementById('cloud-actions');
const bridge=window.nourishCloudBridge;
const config=window.NOURISH_FIREBASE_CONFIG;
const configured=config&&typeof config==='object'&&
 ['apiKey','authDomain','projectId','appId'].every(k=>typeof config[k]==='string'&&config[k].length>3);
function show(msg,actions=[]){
 message.textContent=msg;
 controls.replaceChildren();
 for(const {label,callback,kind} of actions){
  const button=document.createElement('button');button.className=kind==='primary'?'btn dark':'btn';button.type='button';button.textContent=label;button.addEventListener('click',callback);controls.append(button);
 }
}
const event=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
function session(state,user=null){event('forge:cloud-session',{state,user:user?{uid:user.uid,email:user.email||'',displayName:user.displayName||''}:null})}
function ready(user){event('forge:cloud-ready',{uid:user?.uid||''})}
function error(message){event('forge:cloud-error',{message:String(message)})}
if(!configured){
 show('Google cloud sign-in is not configured. Your data can still save in this browser.');
 if(localStorage.getItem('nourish-last-account-v1'))error('Google sign-in configuration is unavailable.');else session('guest');
}else{
 try{await enableCloud()}catch(e){
  const msg='Cloud setup error: '+String(e?.message||e);
  show(msg);if(localStorage.getItem('nourish-last-account-v1'))error(msg);else session('guest');
 }
}
async function enableCloud(){
 const sdk='https://www.gstatic.com/firebasejs/13.1.0/';
 const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut},{getFirestore,doc,onSnapshot,setDoc,serverTimestamp}]=
  await Promise.all([import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js'),import(sdk+'firebase-firestore.js')]);
 const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
 const idKey='nourish-device-id-v3',uidKey='nourish-last-account-v1';
 let deviceId=sessionStorage.getItem(idKey);
 if(!deviceId){deviceId=globalThis.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2);sessionStorage.setItem(idKey,deviceId)}
 let user=null,ref=null,unsubscribe=null,readyState=false,conflict=false,lastHash='',dirty=false,sending=false,scheduled=null,generation=0;
 let seenAuth=false,lastUid=null;
 function normalize(value){
  if(Array.isArray(value))return value.map(normalize);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));
  return value;
 }
 const encode=value=>JSON.stringify(normalize(value));
 const local=()=>bridge.getData();
 const changed=()=>encode(local())!==lastHash;
 const actions=()=>[{label:'Sign out / switch account',callback:signOutSafely}];
 const status=text=>show(text,actions());
 function cleanup(){
  generation++;if(unsubscribe)unsubscribe();unsubscribe=null;
  if(scheduled)clearTimeout(scheduled);scheduled=null;
  readyState=false;dirty=false;sending=false;conflict=false;lastHash='';
 }
 async function signOutSafely(){
  if(!user){show('You are not signed in.');return}
  if((dirty||sending||(readyState&&changed()))&&!confirm('Some changes may not have reached your cloud account. Export a backup before switching. Sign out anyway?'))return;
  await signOut(auth);
 }
 async function signIn(){
  try{await signInWithPopup(auth,new GoogleAuthProvider())}
  catch(e){const txt='Google sign-in was not completed ('+(e?.code||e?.message||'popup failed')+'). Check authorised domains and allow popups.';
   if(user)status(txt);else show(txt,[{label:'Try Google sign-in',callback:signIn,kind:'primary'}]);
   if(!user)session('guest');
  }
 }
 window.forgeCloudSignIn=signIn;
 window.forgeCloudSignOut=signOutSafely;
 function chooseConflict(remote,reason,hasRemote){
  readyState=false;conflict=true;
  show(reason+' Choose the correct owner of the data. Export a backup from Settings before overwriting anything.',[
   ...(hasRemote?[{label:'Use my account’s cloud plan',kind:'primary',callback:()=>{
    if(!user)return;
    if(!bridge.applyData(remote)){status('The cloud plan could not be loaded.');return}
    lastHash=encode(local());dirty=false;conflict=false;readyState=true;status('✓ Your private cloud plan is loaded.');ready(user);
   }}]:[]),
   {label:'Use this device’s plan',kind:hasRemote?undefined:'primary',callback:async()=>{
    if(!user||!confirm('Upload data currently saved in this browser to '+(user.email||'your Google account')+'? Only continue if these are YOUR records.'))return;
    conflict=false;readyState=true;dirty=true;await writeNow(true,true);
   }},
   {label:'Start a fresh profile',callback:async()=>{
    if(!user||!confirm('Start with a new private plan on this account? Existing local records will be cleared from the active app. Export them first if needed.'))return;
    bridge.resetPrivatePlan();conflict=false;readyState=true;lastHash='';dirty=true;
    await writeNow(true,true);
   }},...actions()
  ]);
 }
 async function writeNow(force=false,firstUpload=false){
  if(!user||!readyState||conflict||sending||!ref)return;
  if(!force&&!changed()){dirty=false;return}
  if(scheduled){clearTimeout(scheduled);scheduled=null}
  const currentGeneration=generation,currentUser=user,currentRef=ref;
  const payload=local(),serialized=encode(payload);
  sending=true;status('Saving changes to your private cloud…');
  try{
   await setDoc(currentRef,{state:payload,updatedAt:serverTimestamp(),updatedBy:deviceId});
   if(currentGeneration!==generation||currentUser!==user)return;
   lastHash=serialized;dirty=encode(local())!==serialized;
   status(dirty?'More edits to sync…':'✓ Saved to your private Google cloud.');
   if(firstUpload)ready(currentUser);
  }catch(e){
   if(currentGeneration!==generation||currentUser!==user)return;
   dirty=true;show('Cloud save failed ('+(e.code||e.message||'network error')+'). Changes remain on this device.',[
    {label:'Retry save',kind:'primary',callback:()=>writeNow(true,firstUpload)},...actions()
   ]);
   if(firstUpload)error('Your first private cloud upload has not succeeded.');
  }finally{
   if(currentGeneration===generation&&currentUser===user){
    sending=false;
    if(dirty&&readyState&&!conflict&&!firstUpload)queueSave();
   }
  }
 }
 function queueSave(){
  if(!readyState||conflict||!user)return;
  dirty=changed();if(!dirty)return;
  if(scheduled)clearTimeout(scheduled);
  scheduled=setTimeout(()=>{scheduled=null;void writeNow()},800);
  if(!sending)status('Local edits pending cloud sync…');
 }
 window.addEventListener('nourish:changed',queueSave);
 onAuthStateChanged(auth,nextUser=>{
  const nextUid=nextUser?.uid||null;
  const oldStoredUid=localStorage.getItem(uidKey);
  const switching=!!(nextUid&&oldStoredUid&&nextUid!==oldStoredUid);
  const leaving=!!(!nextUid&&oldStoredUid);
  const liveSwitch=seenAuth&&lastUid!==nextUid&&!!lastUid;
  // Previously bound account data must never become another account's initial data.
  // This reset only affects the legacy active browser state, not Firebase cloud records.
  cleanup();
  if(switching||leaving||liveSwitch)bridge.resetPrivatePlan();
  seenAuth=true;lastUid=nextUid;user=nextUser;ref=null;
  if(!nextUser){
   localStorage.removeItem(uidKey);
   window.forgeCurrentAccountUid=null;
   show('Welcome to FORGE. Use your own Google account for private cloud sync.',[
    {label:'Sign in with Google',kind:'primary',callback:signIn}
   ]);
   session('guest');
   return;
  }
  const unclaimed=!oldStoredUid&&bridge.isLocalCustom();
  localStorage.setItem(uidKey,nextUid);
  window.forgeCurrentAccountUid=nextUid;
  session('loading',nextUser);
  ref=doc(db,'users',nextUid,'private','nourish-plan');
  status('Signed in as '+(nextUser.email||'your account')+'. Checking your private plan…');
  const epoch=generation;
  let first=true;
  unsubscribe=onSnapshot(ref,snap=>{
   if(epoch!==generation||user?.uid!==nextUid)return;
   if(snap.metadata.hasPendingWrites)return;
   if(first&&snap.metadata.fromCache){status('Waiting for a current cloud response before displaying private records…');return}
   if(!snap.exists()){
    if(first){
     first=false;
     if(unclaimed){chooseConflict(null,'This browser contains personal data from before your first sign-in.',false);return}
     readyState=true;lastHash='';dirty=true;status('Creating a fresh private cloud plan…');void writeNow(true,true);
    }
    return;
   }
   const value=snap.data(),remote=value?.state;
   if(!remote||typeof remote!=='object')return;
   const remoteHash=encode(remote);
   if(first){
    first=false;
    if(unclaimed&&encode(local())!==remoteHash){chooseConflict(remote,'This browser has personal records not yet linked to this account.',true);return}
    if(bridge.isLocalCustom()&&encode(local())!==remoteHash){
     chooseConflict(remote,'A different plan already exists in your cloud account.',true);return
    }
    if(!bridge.applyData(remote)){status('Could not open cloud records.');error('Cloud data could not be loaded.');return}
    lastHash=encode(local());readyState=true;dirty=false;
    status('✓ Private plan loaded for '+(nextUser.email||'your account')+'.');ready(nextUser);return;
   }
   if(conflict)return;
   if(value.updatedBy===deviceId){lastHash=remoteHash;return}
   if(remoteHash===lastHash)return;
   if(readyState&&(dirty||sending||changed())){
    if(remoteHash===encode(local())){lastHash=remoteHash;dirty=false;return}
    chooseConflict(remote,'Another device edited this account’s plan while you had local changes.',true);return;
   }
   if(!bridge.applyData(remote)){status('Could not apply updated cloud plan.');return}
   lastHash=encode(local());readyState=true;dirty=false;status('✓ Updated from your other device.');
  },e=>{
   if(epoch!==generation)return;
   readyState=false;const txt='Cloud cannot load ('+(e.code||e.message||'network error')+'). Your local records are preserved.';
   show(txt,actions());error(txt);
  });
 });
}