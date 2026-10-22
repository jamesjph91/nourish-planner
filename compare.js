/* Nourish partner comparisons: invite code + deliberately published summary only. */
import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {getFirestore,doc,setDoc,getDoc,updateDoc,deleteDoc} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
const config=window.NOURISH_FIREBASE_CONFIG;
const state={message:'Sign in with Google to connect with your gym partner.',memberUid:'',mine:null,theirs:null};
window.nourishSocialState=state;
const ui=window.nourishProgressAPI;
let auth=null,db=null,me=null,lastEnsured='',busy=false;
function paint(msg){
 if(msg)state.message=msg;
 const page=document.getElementById('progress');
 if(page&&!page.classList.contains('hidden')&&window.nourishProgressPage)page.innerHTML=window.nourishProgressPage();
}
function fail(e){
 const code=e?.code||e?.message||String(e);
 paint(code==='permission-denied'||code==='firestore/permission-denied'?'Firebase permission denied: publish the updated firestore.rules from Nourish GitHub in Firebase Console → Firestore Database → Rules.':'Comparison could not update ('+code+'). Your private measurements and meal plan are unaffected.');
}
const group=id=>doc(db,'circles',id);
const shareDoc=(id,uid)=>doc(db,'circles',id,'snapshots',uid);
const validCode=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v.trim().toLowerCase());
function assertAuth(){if(!me||!db){paint('Please sign in with Google before using friend comparisons.');return false}return true}
function makeCode(){
 const bytes=new Uint8Array(16);
 crypto.getRandomValues(bytes);
 return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
}
function reset(){
 me=null;lastEnsured='';busy=false;
 state.message='Sign in with Google to connect with your gym partner.';
 state.memberUid='';state.mine=null;state.theirs=null;state.ownerUid='';
 paint();
}
async function create(){
 if(!assertAuth())return;
 if(ui.getCircle()){paint('Leave your existing comparison group before creating another.');return}
 try{
  const code=makeCode();
  await setDoc(group(code),{ownerUid:me.uid,memberUid:'',createdAt:new Date().toISOString()});
  ui.setCircle(code);
  await refresh();
  paint('Invite created. Copy the code and share it directly with your friend. Both accounts stay private.');
 }catch(e){fail(e)}
}
async function join(input){
 if(!assertAuth())return;
 if(ui.getCircle()){paint('Leave the current group before joining another.');return}
 const code=String(input||'').trim().toLowerCase();
 if(!validCode(code)){paint('Please enter the full 32-character invite code.');return}
 try{
  const snap=await getDoc(group(code));
  if(!snap.exists()){paint('Invitation not found. Ask your friend to copy their code again.');return}
  const data=snap.data();
  if(data.ownerUid===me.uid){paint('This is your own invite. Your friend must sign into their own Google account.');return}
  if(data.memberUid&&data.memberUid!==me.uid){paint('This invitation already has a partner. Ask for a new invite.');return}
  if(!data.memberUid)await updateDoc(group(code),{memberUid:me.uid});
  ui.setCircle(code);
  await refresh();
  paint('You are connected. No measurements are shared until you each press Publish my shared summary.');
 }catch(e){fail(e)}
}
async function refresh(){
 if(!assertAuth())return;
 const code=ui.getCircle();
 if(!validCode(code)||busy)return;
 busy=true;
 try{
  const snap=await getDoc(group(code));
  if(!snap.exists()){state.memberUid='';state.mine=null;state.theirs=null;paint('This invitation no longer exists. Use Leave / remove connection to disconnect.');return}
  const data=snap.data(),allowed=[data.ownerUid,data.memberUid];
  if(!allowed.includes(me.uid)){paint('This account is not a member of the invitation. Please sign into the account that joined.');return}
  state.ownerUid=data.ownerUid;
  state.memberUid=data.memberUid||'';
  const other=data.ownerUid===me.uid?data.memberUid:data.ownerUid;
  const snaps=await Promise.all([getDoc(shareDoc(code,me.uid)),other?getDoc(shareDoc(code,other)):Promise.resolve(null)]);
  state.mine=snaps[0].exists()?snaps[0].data():null;
  state.theirs=snaps[1]?.exists()?snaps[1].data():null;
  state.message=state.memberUid?'Connected. Only statistics each person has deliberately published appear below.':'Invite ready. Waiting for your friend to join.';
  paint();
 }catch(e){fail(e)}finally{busy=false}
}
function ensure(code){if(!me||!validCode(code)||lastEnsured===code)return;lastEnsured=code;void refresh();}
async function publish(){
 if(!assertAuth())return;
 if(!ui.getCircle()||!state.memberUid){paint('Wait until your friend has accepted the invitation.');return}
 if(!confirm('Publish only the statistics you selected to share with your gym partner? You can hide your summary at any time.'))return;
 try{
  await setDoc(shareDoc(ui.getCircle(),me.uid),ui.summary());
  await refresh();
  paint('Your selected comparison statistics are now visible to your gym partner.');
 }catch(e){fail(e)}
}
async function hide(){
 if(!assertAuth()||!ui.getCircle())return;
 try{await deleteDoc(shareDoc(ui.getCircle(),me.uid));state.mine=null;await refresh();paint('Your shared summary is hidden. Your private records remain saved.')}
 catch(e){fail(e)}
}
async function leave(){
 if(!assertAuth()||!ui.getCircle())return;
 if(!confirm('Disconnect from this friend comparison? Your private Nourish data will stay on your account.'))return;
 const code=ui.getCircle();
 try{
  await deleteDoc(shareDoc(code,me.uid));
  const snap=await getDoc(group(code));
  if(snap.exists()){
   if(snap.data().ownerUid===me.uid)await deleteDoc(group(code));
   else if(snap.data().memberUid===me.uid)await updateDoc(group(code),{memberUid:''});
  }
  ui.clearCircle();lastEnsured='';state.mine=null;state.theirs=null;state.memberUid='';
  paint('Disconnected. Your meal plan, workout sets and measurements are still private.');
 }catch(e){fail(e)}
}
async function copyCode(){
 const code=ui.getCircle();if(!code)return;
 try{await navigator.clipboard.writeText(code);paint('Invite code copied. Send it privately to your gym partner.')}
 catch(e){paint('Select and copy the invite code shown above.')}
}
window.nourishSocial={create,join,refresh,ensure,publish,hide,leave,copyCode};
try{
 if(!config)throw Error('Firebase has not been configured.');
 const app=getApps().length?getApps()[0]:initializeApp(config);
 auth=getAuth(app);db=getFirestore(app);
 onAuthStateChanged(auth,u=>{
  if(!u){reset();return}
  if(me?.uid!==u.uid){state.mine=null;state.theirs=null;state.memberUid='';lastEnsured=''}
  me=u;state.message='Connected to your private Google account.';
  if(ui.getCircle())ensure(ui.getCircle());else paint();
 });
}catch(e){fail(e)}
