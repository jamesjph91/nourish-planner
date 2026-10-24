/* FORGE v50 — Strength Progression Lab.
   Pure read-only analytics over validated completed-set history.
   Never changes logged weights, sets or routines. */
(()=>{'use strict';
let chosen='';
const root=()=>document.getElementById('workouts');
const state=()=>{try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}};
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateOk=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00'));
const n=(v,lo=0,hi=1000)=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>=lo&&Number(v)<=hi?Number(v):null;
const fmt=(x,dec=1)=>Number(x).toLocaleString('en-GB',{maximumFractionDigits:dec});
function analyse(s={},date='',id='',def={}){
 const load=def?.load===true,unit=['reps','sec','min'].includes(def?.unit)?def.unit:'reps';
 const sessions=s?.workouts?.sessions||{};
 const timeline=Object.entries(sessions).filter(([d])=>dateOk(d)&&(!dateOk(date)||d<=date))
  .sort((a,b)=>a[0].localeCompare(b[0])).flatMap(([day,record])=>{
   const raw=Array.isArray(record?.sets?.[id])?record.sets[id]:[];
   const done=raw.filter(x=>x?.done===true&&n(x.reps,1,1000)!==null&&(!load||n(x.kg,0,600)!==null))
    .map(x=>({reps:n(x.reps,1,1000),kg:load?n(x.kg,0,600):null}));
   if(!done.length)return [];
   const weights=done.filter(x=>x.kg!==null&&x.kg>0);
   const bestLoad=weights.length?Math.max(...weights.map(x=>x.kg)):null;
   const bestSet=load&&bestLoad!==null?
    weights.filter(x=>x.kg===bestLoad).sort((a,b)=>b.reps-a.reps)[0]:
    done.slice().sort((a,b)=>b.reps-a.reps)[0];
   const volume=load&&weights.length?weights.reduce((sum,x)=>sum+x.kg*x.reps,0):null;
   return [{date:day,sets:done.length,bestLoad,maxReps:Math.max(...done.map(x=>x.reps)),
    volume,example:bestSet,allAtTop:done.length>=2&&done.every(x=>x.reps>=n(def.max,1,1000))}];
  });
 const last=timeline.at(-1)||null;
 const records=timeline.filter(x=>load?x.bestLoad!==null:true);
 const peak=records.length?Math.max(...records.map(x=>load?x.bestLoad:x.maxReps)):null;
 const previous=records.slice(0,-1);
 const prevBest=previous.length?Math.max(...previous.map(x=>load?x.bestLoad:x.maxReps)):null;
 const newBest=last!==null&&records.length>=2&&last===records.at(-1)&&prevBest!==null&&
   (load?last.bestLoad:last.maxReps)>prevBest;
 const top= n(def.max,1,1000);
 const low=n(def.min,1,1000);
 let suggestion='Log a completed set for this exercise to unlock a next-session target.';
 if(last){
  const example=last.example,quantity=load&&last.bestLoad!==null?last.bestLoad:null;
  if(load&&quantity===null){
   suggestion='Your recorded sets have no positive load yet. Log the actual working weight to unlock weight-based suggestions.';
  }else if(!load){
   const next=example.reps+(unit==='sec'?5:1);
   suggestion=top!==null&&example.reps>=top?
     'You reached the top of this movement’s logged range. Repeat it with good technique before changing the difficulty.':
     'If it feels controlled, aim for '+fmt(top!==null?Math.min(top,next):next,0)+' '+unit+' next session.';
  }else if(timeline.length>=2&&top!==null&&last.allAtTop){
   suggestion='You reached the top of the rep range in your last logged sets. If form stays controlled, consider a small load increase next time (typically 1–2.5 kg), with fewer reps if needed.';
  }else if(top!==null&&example.reps<top){
   suggestion='Try '+fmt(quantity)+' kg for '+fmt(Math.min(top,example.reps+1),0)+' controlled reps next session, if comfortable.';
  }else if(low!==null&&example.reps<low){
   suggestion='Repeat '+fmt(quantity)+' kg and focus on quality reps within your '+fmt(low,0)+'–'+fmt(top??low,0)+' rep range.';
  }else suggestion='Aim to repeat '+fmt(quantity)+' kg for '+fmt(example.reps,0)+' controlled reps before increasing the load.';
 }
 return {id,name:String(def?.name||id),load,unit,date,history:timeline.slice(-16),
  sessions:timeline.length,peak,previousBest:prevBest,newBest,latest:last,suggestion,
  max:top,min:low};
}
function trend(data){
 const history=data.history.filter(x=>data.load?x.bestLoad!==null:true);
 if(!history.length)return '<div class="fs50-empty">No eligible completed sets yet. Log your first set to start a trend.</div>';
 const last=history.slice(-10),values=last.map(x=>data.load?x.bestLoad:x.maxReps);
 const max=Math.max(1,...values),min=Math.min(0,...values),span=Math.max(1,max-min);
 const plotWidth=320,height=105,px=i=>last.length===1?160:20+i*(plotWidth-40)/(last.length-1);
 const py=v=>height-18-(v-min)/span*(height-37);
 const points=values.map((v,i)=>[px(i),py(v)]);
 const poly=points.map(p=>p.join(',')).join(' ');
 const labels=last.map((r,i)=>'<text x="'+px(i).toFixed(1)+'" y="131" text-anchor="middle">'+esc(r.date.slice(5))+'</text>').join('');
 const marks=points.map(([x,y],i)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.9"><title>'+esc(last[i].date+' · '+fmt(values[i])+(data.load?' kg':' '+data.unit))+'</title></circle>').join('');
 return '<svg class="fs50-plot" viewBox="0 0 320 140" role="img" aria-label="Logged '+(data.load?'best working weight':'best repetitions')+' by session, from '+esc(last[0].date)+' to '+esc(last.at(-1).date)+'">'+
 '<path d="M20 87H300 M20 56H300 M20 25H300" class="fs50-grid-lines"/>'+
 '<polyline points="'+poly+'" fill="none" stroke="#c7ff17" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+marks+
 '<g class="fs50-axis">'+labels+'</g></svg>'+
 '<p class="fs50-plot-caption">Showing up to 10 logged sessions · '+(data.load?'best completed load (kg)':'most completed '+data.unit)+' · no projected values</p>';
}
function markup(model){
 const latest=model.latest;
 const unit=model.load?'kg':model.unit;
 const best=model.peak===null?'—':fmt(model.peak)+(unit?' '+unit:'');
 const date=latest?.date||'No logged session';
 return '<div class="fs50-content">'+
 '<div class="fs50-overview"><div><small>PERSONAL BEST</small><strong>'+best+'</strong><span>'+(!latest?'Start with a completed set':model.newBest?'★ New personal best in the latest session':model.sessions===1?'First recorded session':'Best across recorded sessions')+'</span></div>'+
 '<div><small>RECORDED SESSIONS</small><strong>'+model.sessions+'</strong><span>Checked sets only</span></div>'+
 '<div><small>MOST RECENT</small><strong>'+(latest&&latest.example?esc((model.load&&latest.bestLoad!==null?fmt(latest.bestLoad)+' kg × ':'')+fmt(latest.example.reps,0)+' '+model.unit):'—')+'</strong><span>'+esc(date)+'</span></div></div>'+
 '<div class="fs50-chart">'+trend(model)+'</div>'+
 '<div class="fs50-target"><small>YOUR NEXT SESSION · GUIDANCE ONLY</small><p>'+esc(model.suggestion)+'</p>'+
 '<span>Based on completed entries, not automatic weight changes. Adjust for technique, recovery and how you feel.</span></div></div>';
}
function modelFor(s=state(),selected=''){
 const w=s.workouts||{},date=selected||w.selected||'';
 const ids=(Array.isArray(w.sessions?.[date]?.exerciseIds)?w.sessions[date].exerciseIds:[]).filter(id=>typeof id==='string');
 const unique=[...new Set(ids)];
 if(!unique.includes(chosen))chosen=unique[0]||'';
 const definition=typeof window.forgeGymDefinition==='function'?window.forgeGymDefinition(chosen):null;
 return {date,ids:unique,chosen,analysis:chosen?analyse(s,date,chosen,definition||{}):null};
}
function render(){
 const r=root();if(!r||!document.querySelector('#nav [data-tab="workouts"].on'))return;
 const m=modelFor();
 const mountPoint=r.querySelector('.fgt-command-mount');
 if(!mountPoint)return;
 let panel=r.querySelector('.fs50');
 if(!panel){panel=document.createElement('section');panel.className='fs50';panel.setAttribute('aria-label','Strength progression lab');mountPoint.insertAdjacentElement('afterend',panel)}
 if(!m.ids.length){panel.innerHTML='<p class="fs50-empty">Assign a workout and select an exercise to view strength progression.</p>';return}
 panel.innerHTML='<div class="fs50-heading"><div><small>FORGE / PROGRESSION LAB</small><h2>Built through consistency.</h2></div><span class="fs50-live">LOGGED DATA</span></div>'+
 '<label class="fs50-select-label" for="fs50-exercise">Exercise progress</label>'+
 '<select id="fs50-exercise" aria-label="Choose exercise for progression chart">'+m.ids.map(id=>{
  const def=typeof window.forgeGymDefinition==='function'?window.forgeGymDefinition(id):null;
  return '<option value="'+esc(id)+'" '+(id===m.chosen?'selected':'')+'>'+esc(def?.name||id)+'</option>';
 }).join('')+'</select>'+markup(m.analysis);
}
document.addEventListener('change',event=>{
 if(event.target?.id!=='fs50-exercise'||!root()?.contains(event.target))return;
 chosen=event.target.value;render();
});
window.addEventListener('forge:view-rendered',event=>{if(event.detail?.tab==='workouts')render()});
document.addEventListener('DOMContentLoaded',render,{once:true});
window.forgeStrengthV50={analyse,trend,markup,modelFor,render};
})();