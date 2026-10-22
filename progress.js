/* Nourish progress records: per-user data stays in existing private cloud plan. */
(function(){
'use strict';
const METRICS=[
 ['weightKg','Weight','kg',30,350],
 ['waistCm','Waist','cm',35,250],
 ['chestCm','Chest','cm',35,250],
 ['hipsCm','Hips','cm',35,250],
 ['armCm','Upper arm','cm',15,100],
 ['thighCm','Thigh','cm',20,140],
 ['bodyFatPct','Body fat (device estimate)','%',2,70]
];
const fmt=n=>n===undefined||n===null?'—':one(n).toLocaleString('en-GB');
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const profile=()=>{s.profile=validateProfile(s.profile);return s.profile};
const measurements=()=>{s.measurements=validateMeasurements(s.measurements);return s.measurements};
function profileSave(){
 const name=document.getElementById('prog-name').value.trim(),goal=document.getElementById('prog-goal').value;
 s.profile={...profile(),nickname:name.slice(0,30),goalWeightKg:goal===''?null:Number(goal)};
 s.profile=validateProfile(s.profile);
 save();renderCurrent();notify('Your private profile was saved.');
}
function entrySave(){
 const date=document.getElementById('prog-date').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00'))){alert('Choose a valid date.');return}
 const out={date};
 for(const [id,label,unit,lo,hi] of METRICS){
  const v=document.getElementById('prog-'+id).value.trim();
  if(!v)continue;
  const n=Number(v);
  if(!Number.isFinite(n)||n<lo||n>hi){alert(label+' must be between '+lo+' and '+hi+' '+unit+'.');return}
  out[id]=Math.round(n*10)/10;
 }
 if(Object.keys(out).length===1){alert('Enter at least one measurement.');return}
 if(measurements().some(r=>r.date===date)&&!confirm('Replace measurements recorded for '+date+'?'))return;
 s.measurements=validateMeasurements([...s.measurements.filter(r=>r.date!==date),out]);
 save();renderCurrent();notify('Measurements saved privately and queued for cloud sync.');
}
function editEntry(date){
 const row=measurements().find(x=>x.date===date);if(!row)return;
 document.getElementById('prog-date').value=date;
 METRICS.forEach(([k])=>document.getElementById('prog-'+k).value=row[k]??'');
 document.getElementById('measurement-form').scrollIntoView({behavior:'smooth',block:'start'});
}
function deleteEntry(date){
 if(!confirm('Delete your measurement entry from '+date+'?'))return;
 s.measurements=measurements().filter(x=>x.date!==date);save();renderCurrent();
}
function shareToggle(type,v){
 if(!['shareWeight','shareWaist','shareWorkouts'].includes(type))return;
 s.profile={...profile(),[type]:!!v};save();
 const node=document.getElementById('sharing-explainer');if(node)node.textContent='Changes to sharing preferences are private until you press Publish my shared summary. To stop sharing immediately, use Hide my shared summary.';
}
function metricChange(id){window.nourishMetric=METRICS.some(x=>x[0]===id)?id:'weightKg';renderCurrent();}
function trend(metric){
 const series=measurements().filter(x=>x[metric]!==undefined),label=METRICS.find(x=>x[0]===metric)?.[1]||'Weight';
 if(series.length<2)return '<p class="short">Add measurements on at least two dates to see your trend.</p>';
 const vals=series.map(x=>x[metric]),lo=Math.min(...vals),hi=Math.max(...vals),range=Math.max(1,hi-lo),xSpan=650,ySpan=150;
 const pts=vals.map((v,i)=>(45+(i/(vals.length-1))*xSpan).toFixed(1)+','+(18+(1-(v-lo)/range)*ySpan).toFixed(1)).join(' ');
 return '<div class="prog-chart"><svg viewBox="0 0 740 212" role="img" aria-label="'+esc(label)+' trend from '+fmt(vals[0])+' to '+fmt(vals[vals.length-1])+'"><line x1="45" y1="180" x2="700" y2="180" stroke="#d4dfd8"/><polyline points="'+pts+'" fill="none" stroke="#245b46" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+pts.split(' ').map(p=>{const [x,y]=p.split(',');return '<circle cx="'+x+'" cy="'+y+'" r="4" fill="#245b46"/>'}).join('')+'<text x="45" y="203" font-size="13" fill="#68756b">'+esc(series[0].date)+'</text><text x="590" y="203" font-size="13" fill="#68756b">'+esc(series[series.length-1].date)+'</text></svg></div><p class="short">'+esc(label)+': '+fmt(vals[0])+' → '+fmt(vals[vals.length-1])+' '+(metric==='weightKg'?'kg':metric==='bodyFatPct'?'%':'cm')+' ('+(vals[vals.length-1]-vals[0]>0?'+':'')+fmt(vals[vals.length-1]-vals[0])+')</p>';
}
function summary(){
 const rows=measurements(),weights=rows.filter(x=>x.weightKg!==undefined),waists=rows.filter(x=>x.waistCm!==undefined),a=weights[0]?.weightKg,b=weights[weights.length-1]?.weightKg;
 const workouts=Object.values(s.workouts?.sessions||{}).filter(x=>x?.completed).length;
 const p=profile();
 return {displayName:p.nickname||'Gym partner',
  startWeightKg:p.shareWeight&&a!==undefined?a:null,
  latestWeightKg:p.shareWeight&&b!==undefined?b:null,
  weightChangeKg:p.shareWeight&&a!==undefined&&b!==undefined?one(b-a):null,
  weightPercentChange:p.shareWeight&&a!==undefined&&b!==undefined&&a>0?one((b-a)/a*100):null,
  waistChangeCm:p.shareWaist&&waists.length>=2?one(waists[waists.length-1].waistCm-waists[0].waistCm):null,
  workoutsCompleted:p.shareWorkouts?workouts:null,
  updatedAt:new Date().toISOString().slice(0,10)};
}
function stat(label,value,caption){
 return '<div class="stat"><div class="mini">'+esc(label)+'</div><strong>'+esc(value)+'</strong><small>'+esc(caption)+'</small></div>';
}
function history(){
 const rows=measurements(),wt=rows.filter(x=>x.weightKg!==undefined),wa=rows.filter(x=>x.waistCm!==undefined);
 const start=wt[0]?.weightKg,current=wt[wt.length-1]?.weightKg,goal=profile().goalWeightKg;
 const loss=(start!==undefined&&current!==undefined)?one(start-current):null;
 const dWaist=wa.length>=2?one(wa[0].waistCm-wa[wa.length-1].waistCm):null;
 const logs=Object.values(s.workouts?.sessions||{}).filter(v=>v?.completed).length;
 return '<div class="grid4">'+
 stat('CURRENT WEIGHT',current!==undefined?fmt(current)+' kg':'—','From your most recent weigh-in')+
 stat('WEIGHT CHANGE',loss!==null?(loss>0?'−':loss<0?'+':'')+fmt(Math.abs(loss))+' kg':'—','Change since your first entry')+
 stat('WAIST CHANGE',dWaist!==null?(dWaist>0?'−':dWaist<0?'+':'')+fmt(Math.abs(dWaist))+' cm':'—','First to latest waist measurement')+
 stat('COMPLETED WORKOUTS',String(logs),'From your private gym log')+
 '</div>'+(goal!==null&&current!==undefined?'<p class="notice">Your weight goal is <b>'+fmt(goal)+' kg</b>; current difference: <b>'+fmt(Math.abs(current-goal))+' kg</b>. Weight trends fluctuate with hydration and recovery — compare weekly averages over time.</p>':'');
}
function shareView(){
 const p=profile(),circle=p.circleCode,social=window.nourishSocial,state=window.nourishSocialState||{};
 const val=(o,k,u)=>o&&typeof o[k]==='number'?fmt(o[k])+(u||''):'Not shared';
 const stats=(o)=>'<div class="prog-sharecard"><b>'+esc(o?.displayName||'No shared summary yet')+'</b><div class="gym-history-row"><span>Weight change</span><b>'+val(o,'weightChangeKg',' kg')+'</b></div><div class="gym-history-row"><span>Weight change %</span><b>'+val(o,'weightPercentChange','%')+'</b></div><div class="gym-history-row"><span>Waist change</span><b>'+val(o,'waistChangeCm',' cm')+'</b></div><div class="gym-history-row"><span>Workouts completed</span><b>'+val(o,'workoutsCompleted')+'</b></div></div>';
 let content='';
 if(!circle){
  content='<p class="short">Create a private invite and give the code only to your gym partner, or enter an invite they have sent you. Neither person gets access to the other’s meal plan, measurements or workout details.</p><div class="actions"><button class="btn dark" onclick="nourishSocial.create()">Create invite code</button></div><div class="prog-invite"><label for="prog-join-code">Join your friend’s invite</label><input id="prog-join-code" maxlength="32" autocomplete="off" placeholder="32-character invite code" aria-label="Friend invite code"><button class="btn" onclick="nourishSocial.join(document.getElementById(\'prog-join-code\').value)">Join invitation</button></div>';
 }else{
  content='<p class="short">Your private group code (give this only to your friend):</p><div class="prog-code"><code>'+esc(circle)+'</code><button class="btn sm" onclick="nourishSocial.copyCode()">Copy code</button></div><div class="short">Invitation: <b>'+esc(state.memberUid?'Connected to your gym partner':'Waiting for your friend to join')+'</b></div><div class="actions"><button class="btn" onclick="nourishSocial.refresh()">↻ Refresh comparison</button><button class="btn" onclick="nourishSocial.leave()">Leave / remove connection</button></div>'+
 (state.memberUid?'<h3>Choose what to share</h3><div class="prog-checks"><label><input type="checkbox" '+(p.shareWeight?'checked':'')+' onchange="nourishShareToggle(\'shareWeight\',this.checked)"> Weight trend (starting and latest weight)</label><label><input type="checkbox" '+(p.shareWaist?'checked':'')+' onchange="nourishShareToggle(\'shareWaist\',this.checked)"> Waist change only</label><label><input type="checkbox" '+(p.shareWorkouts?'checked':'')+' onchange="nourishShareToggle(\'shareWorkouts\',this.checked)"> Number of completed workouts</label></div><p class="short" id="sharing-explainer">Your actual meal plans, daily measurements and exercise sets are never shared. Sharing is off until you press Publish.</p><div class="actions"><button class="btn dark" onclick="nourishSocial.publish()">Publish my shared summary</button><button class="btn" onclick="nourishSocial.hide()">Hide my shared summary</button></div><div class="prog-compare">'+stats(state.mine)+stats(state.theirs)+'</div>':'<p class="notice">Comparison becomes available once your friend joins, and both of you choose to share a summary.</p>');
 }
 return '<div class="sectionhead"><div><div class="eyebrow">OPT-IN • PRIVATE PARTNER SPACE</div><h2>Compare progress with a friend</h2></div></div><div class="card">'+content+'<p class="short" id="prog-social-status" style="margin-top:12px">'+esc(state.message||'Each person must sign into a different Google account. Progress is private unless explicitly published.')+'</p></div>';
}
function progressPage(){
 const p=profile(),rows=measurements(),metric=window.nourishMetric||'weightKg';
 const start=rows[rows.length-1];
 if(p.circleCode)window.nourishSocial?.ensure?.(p.circleCode);
 return '<div class="sectionhead"><div><div class="eyebrow">NOURISH • YOUR PRIVATE PROGRESS</div><h2>Measurements & gym progress</h2></div><span class="pill">Private to your Google account</span></div>'+
 '<p class="notice">Log weight and body measurements at your own pace. Body-fat readings from home scales are estimates, not direct measurements of muscle gain; use strength improvements and consistent measurements alongside your weight trend.</p>'+
 '<div class="card"><h2>Your profile</h2><div class="prog-fields"><label>Display name<input id="prog-name" maxlength="30" value="'+esc(p.nickname)+'" placeholder="Name shown in your friend comparison"></label><label>Goal weight (kg)<input id="prog-goal" type="number" min="35" max="350" step=".1" value="'+(p.goalWeightKg??'')+'" placeholder="Optional"></label></div><button class="btn dark" onclick="nourishProfileSave()">Save my profile</button><p class="short">Your nickname and weight goal do not change your calorie target automatically. Each account has its own adjustable meal plan and gym log.</p></div>'+
 '<div class="sectionhead"><h2>Your results</h2></div>'+history()+
 '<div class="card"><div class="row" style="flex-wrap:wrap"><h3 style="margin:0">Measurement trend</h3><label>Track <select class="select" onchange="nourishMetricChange(this.value)">'+METRICS.map(([id,name])=>'<option value="'+id+'" '+(metric===id?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label></div>'+trend(metric)+'</div>'+
 '<div class="sectionhead"><h2>Add a measurement</h2></div><div class="card" id="measurement-form"><p class="short">Record in kg and cm. You can update an existing date without duplicating it.</p><div class="prog-fields"><label>Date<input id="prog-date" type="date" value="'+today()+'"></label>'+METRICS.map(([id,label,unit,lo,hi])=>'<label>'+esc(label)+' ('+unit+')<input id="prog-'+id+'" type="number" inputmode="decimal" min="'+lo+'" max="'+hi+'" step=".1" placeholder="Optional"></label>').join('')+'</div><button class="btn dark" onclick="nourishEntrySave()">Save measurements</button></div>'+
 '<div class="card" style="margin-top:16px"><h3>Measurement history</h3>'+(rows.length?'<div class="prog-history">'+[...rows].reverse().slice(0,30).map(r=>'<div class="gym-history-row"><span><b>'+esc(r.date)+'</b><br><small>'+METRICS.filter(([k])=>r[k]!==undefined).map(([k,label,unit])=>esc(label)+': '+fmt(r[k])+unit).join(' · ')+'</small></span><div class="actions"><button class="btn sm" onclick="nourishEditEntry(\''+r.date+'\')">Edit</button><button class="btn sm" onclick="nourishDeleteEntry(\''+r.date+'\')">Delete</button></div></div>').join('')+'</div>':'<p class="short">No measurements yet. Your first entry becomes your baseline.</p>')+'</div>'+shareView();
}
const css=document.createElement('style');css.textContent='.prog-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:16px 0}.prog-fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700}.prog-fields input,.prog-invite input{border:1px solid var(--line);border-radius:9px;padding:11px;background:#fff;color:var(--ink);width:100%;font:inherit}.prog-chart svg{width:100%;max-height:250px}.prog-code{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:10px 0}.prog-code code{background:var(--mint);border-radius:8px;padding:9px;word-break:break-all}.prog-invite{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:14px 0}.prog-invite label{width:100%}.prog-invite input{max-width:350px}.prog-checks{display:grid;gap:10px;margin:16px 0}.prog-checks input{accent-color:var(--green)}.prog-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0}.prog-sharecard{border:1px solid var(--line);border-radius:12px;padding:14px;min-width:0}@media(max-width:620px){.prog-compare{grid-template-columns:1fr}}';document.head.append(css);
window.nourishProgressPage=progressPage;
window.nourishProfileSave=profileSave;window.nourishEntrySave=entrySave;window.nourishEditEntry=editEntry;window.nourishDeleteEntry=deleteEntry;window.nourishMetricChange=metricChange;window.nourishShareToggle=shareToggle;
window.nourishProgressAPI={summary,getCircle:()=>profile().circleCode,setCircle(code){s.profile={...profile(),circleCode:code};save();renderCurrent();},clearCircle(){s.profile={...profile(),circleCode:'',shareWeight:false,shareWaist:false,shareWorkouts:false};save();renderCurrent();}};
})();