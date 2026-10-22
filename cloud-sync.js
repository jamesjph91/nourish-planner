// Nourish — Firebase sync. No account data is written to the public repository.
const message = document.getElementById('cloud-status');
const controls = document.getElementById('cloud-actions');
const bridge = window.nourishCloudBridge;
const config = window.NOURISH_FIREBASE_CONFIG;
const configured = config && typeof config === 'object' &&
  ['apiKey','authDomain','projectId','appId'].every(k => typeof config[k] === 'string' && config[k].length > 3);
function show(msg, actions = []) {
  message.textContent = msg;
  controls.replaceChildren();
  for (const {label, callback, kind} of actions) {
    const button = document.createElement('button');
    button.className = kind === 'primary' ? 'btn dark' : 'btn';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', callback);
    controls.append(button);
  }
}
if (!configured) {
  show('Website ready. Your edits save in this browser. Cross-device sync starts after Firebase is connected.');
} else {
  try { await enableCloud(); } catch (error) { show('Cloud setup error: ' + String(error.message || error)); }
}
async function enableCloud() {
  const sdk='https://www.gstatic.com/firebasejs/13.1.0/';
  const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut},{getFirestore,doc,onSnapshot,setDoc,serverTimestamp}] =
    await Promise.all([import(sdk+'firebase-app.js'),import(sdk+'firebase-auth.js'),import(sdk+'firebase-firestore.js')]);
  const app=initializeApp(config), auth=getAuth(app), db=getFirestore(app);
  const idKey='nourish-device-id-v3';
  let deviceId=sessionStorage.getItem(idKey);
  if (!deviceId) {
    deviceId=globalThis.crypto?.randomUUID?.() || String(Date.now())+Math.random().toString(36).slice(2);
    sessionStorage.setItem(idKey,deviceId);
  }
  let user=null, ref=null, unsubscribe=null, ready=false, conflict=false, lastHash='', dirty=false, sending=false, scheduled=null;
  function normalize(value) {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value==='object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));
    return value;
  }
  const encode=value=>JSON.stringify(normalize(value));
  const local=()=>bridge.getData();
  const changed=()=>encode(local())!==lastHash;
  const actions=()=>[{label:'Sign out',callback:()=>signOut(auth)}];
  const status=txt=>show(txt,actions());
  function cleanup() {
    if (unsubscribe) unsubscribe();
    unsubscribe=null;
    if (scheduled) clearTimeout(scheduled);
    scheduled=null;ready=false;dirty=false;sending=false;conflict=false;lastHash='';
  }
  function chooseConflict(remote,reason) {
    ready=false;conflict=true;
    show(reason+' Choose which plan to keep. Export a backup from Settings first if needed.',[
      {label:'Use cloud plan',kind:'primary',callback:()=>{
        bridge.applyData(remote);lastHash=encode(local());dirty=false;conflict=false;ready=true;
        status('✓ Cloud plan loaded. Changes will sync.');
      }},
      {label:'Upload this device',callback:async()=>{
        if(!confirm('Replace the cloud plan with this device’s plan? Other signed-in devices will receive the change.'))return;
        conflict=false;ready=true;dirty=true;await writeNow(true);
      }}
    ]);
  }
  async function writeNow(force=false) {
    if(!user||!ready||conflict||sending||!ref)return;
    if(!force&&!changed()){dirty=false;return;}
    if(scheduled){clearTimeout(scheduled);scheduled=null;}
    const payload=local(), serialized=encode(payload);
    sending=true;
    status('Saving changes to your private cloud…');
    try {
      await setDoc(ref,{state:payload,updatedAt:serverTimestamp(),updatedBy:deviceId});
      lastHash=serialized;
      dirty=encode(local())!==serialized;
      status(dirty?'More edits to sync…':'✓ All changes saved to your private cloud.');
    } catch(e) {
      dirty=true;
      show('Cloud save failed ('+(e.code||e.message||'network error')+'). Changes stay on this device.',[
        {label:'Retry save',kind:'primary',callback:()=>writeNow(true)},...actions()
      ]);
    } finally {
      sending=false;
      if(dirty&&ready&&!conflict)queueSave();
    }
  }
  function queueSave() {
    if(!ready||conflict||!user)return;
    dirty=changed();
    if(!dirty)return;
    if(scheduled)clearTimeout(scheduled);
    scheduled=setTimeout(()=>{scheduled=null;writeNow();},800);
    if(!sending)status('Unsaved edits — syncing shortly…');
  }
  window.addEventListener('nourish:changed',queueSave);
  onAuthStateChanged(auth,nextUser=>{
    cleanup();user=nextUser;
    if(!user){
      show('Cloud sync is available. Sign in with the same Google account on Chromebook and phone.',[
        {label:'Sign in with Google',kind:'primary',callback:async()=>{
          try { await signInWithPopup(auth,new GoogleAuthProvider()); }
          catch(e) {
            show('Could not sign in: '+(e.code||e.message)+'. Check authorised domains and allow popups.',[
              {label:'Try again',kind:'primary',callback:()=>signInWithPopup(auth,new GoogleAuthProvider())}
            ]);
          }
        }}
      ]);
      return;
    }
    ref=doc(db,'users',user.uid,'private','nourish-plan');
    status('Signed in. Loading your private plan…');
    let first=true;
    unsubscribe=onSnapshot(ref,snap=>{
      if(snap.metadata.hasPendingWrites)return;
      if(first && snap.metadata.fromCache){
        status('Checking your cloud plan… Your local changes remain available.');
        return;
      }
      if(!snap.exists()){
        if(first){
          first=false;ready=true;lastHash='';dirty=true;
          status('First cloud save — uploading your local plan…');writeNow(true);
        }
        return;
      }
      const value=snap.data(), remote=value?.state;
      if(!remote||typeof remote!=='object')return;
      const remoteHash=encode(remote);
      if(first){
        first=false;
        if(bridge.isLocalCustom() && encode(local())!==remoteHash){
          chooseConflict(remote,'A different cloud plan already exists.');return;
        }
        bridge.applyData(remote);lastHash=encode(local());ready=true;dirty=false;
        status('✓ Cloud plan loaded for '+(user.email||'your account')+'.');return;
      }
      if(conflict)return;
      if(value.updatedBy===deviceId){
        lastHash=remoteHash;
        return;
      }
      if(remoteHash===lastHash)return;
      if(ready&&(dirty||sending||changed())){
        if(remoteHash===encode(local())){lastHash=remoteHash;dirty=false;return;}
        chooseConflict(remote,'Another device updated your plan while you had local edits.');return;
      }
      bridge.applyData(remote);lastHash=encode(local());ready=true;dirty=false;
      status('✓ Updated from your other device.');
    },e=>{
      ready=false;
      show('Cloud cannot load ('+(e.code||e.message)+'). Local edits remain on this device.',actions());
    });
  });
}