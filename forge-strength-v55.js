/* FORGE v55 — evidence-based strength analytics, read-only.
   Works with actual completed sets in existing local workout state.
   No exercise mutation, no projection or estimated one-rep-max. */
(()=>{'use strict';
 const safe=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const valid=(x,min,max)=>x!==''&&x!==null&&x!==undefined&&Number.isFinite(Number(x))&&Number(x)>=min&&Number(x)<=max?Number(x):null;
 const dateOK=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00'));
 const daysBetween=(a,b)=>Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/86400000);
 const fmt=(n,d=1)=>Number(n).toLocaleString('en-GB',{maximumFractionDigits:d});
 const rawState=()=>{try{return JSON.parse(localStorage.getItem('nourishHigherDeficitV1')||'{}')||{}}catch{return {}}};
 let metric='volume';
 function analyse(input={},id='',selected='',definition={}){
  const load=definition.load===true,unit=['reps','sec','min'].includes(definition.unit)?definition.unit:'reps';
  const name=String(definition.name||id),sessions=input?.workouts?.sessions;
  const records=Object.entries(sessions&&typeof sessions==='object'&&!Array.isArray(sessions)?sessions:{})
   .filter(([date])=>dateOK(date)&&(!dateOK(selected)||date<=selected))
   .sort((a,b)=>a[0].localeCompare(b[0])).flatMap(([date,day])=>{
     const raw=day?.sets?.[id];
     const checked=(Array.isArray(raw)?raw:[]).filter(s=>s?.done===true).map(s=>{
      const reps=valid(s.reps,1,1000),kg=load?valid(s.kg,0,600):null;
      return reps===null||(load&&kg===null)?null:{reps,kg};
     }).filter(Boolean);
     if(!checked.length)return [];
     const external=checked.filter(s=>s.kg!==null&&s.kg>0);
     const bestWeight=external.length?Math.max(...external.map(s=>s.kg)):null;
     const bestReps=Math.max(...checked.map(s=>s.reps));
     // Load volume is meaningful only for loaded repetition exercises, not timers.
     const volume=load&&unit==='reps'&&external.length?
       external.reduce((sum,s)=>sum+s.kg*s.reps,0):null;
     const atTop=valid(definition.max,1,1000);
     const topSets=atTop!==null&&checked.length>=2&&checked.every(s=>s.reps>=atTop);
     return [{date,sets:checked.length,bestWeight,bestReps,volume,topSets,checked}];
   });
  const withWeight=records.filter(r=>r.bestWeight!==null),weightBest=withWeight.length?Math.max(...withWeight.map(r=>r.bestWeight)):null;
  const repsBest=records.length?Math.max(...records.map(r=>r.bestReps)):null;
  const volumeBest=records.filter(r=>r.volume!==null).length?
   Math.max(...records.filter(r=>r.volume!==null).map(r=>r.volume)):null;
  const latest=records.at(-1)||null,prior=records.slice(0,-1);
  const prevWeight=prior.filter(r=>r.bestWeight!==null);
  const weightPR=!!(latest&&latest.bestWeight!==null&&prevWeight.length&&latest.bestWeight>Math.max(...prevWeight.map(r=>r.bestWeight)));
  const repPR=!!(latest&&prior.length&&latest.bestReps>Math.max(...prior.map(r=>r.bestReps)));
  return {id,name,unit,load,selected,records,latest,weightBest,repsBest,volumeBest,
   weightPR,repPR,validDays:records.length,latestGap:latest&&dateOK(selected)?daysBetween(latest.date,selected):null,
   chartableVolume:load&&unit==='reps'};
 }
 function guidance(model,def={}){
  const r=model.records,latest=model.latest;
  if(!latest)return 'Log completed sets first. No next-session target is available yet.';
  if(model.latestGap!==null&&model.latestGap>28)
   return 'Your latest completed entry is more than 28 days before this selected day. Resume with a comfortable workload and rebuild recent consistency before increasing difficulty.';
  if(r.length<3)
   return 'Only '+r.length+' completed session'+(r.length===1?'':'s')+' recorded. Repeat a comfortable working effort and gather at least three comparable sessions before increasing difficulty.';
  const previous=r[r.length-2],gap=daysBetween(previous.date,latest.date);
  if(gap>28)
   return 'There is a long gap between recent sessions. Repeat a comfortable working effort before considering harder targets.';
  if(model.load&&latest.bestWeight===null)
   return 'No positive external weight was logged. Keep practising controlled technique; weight-based targets are not available.';
  const top=valid(def.max,1,1000);
  if(model.load&&model.unit==='reps'&&top!==null&&latest.topSets&&previous.topSets&&latest.bestWeight!==null&&previous.bestWeight===latest.bestWeight)
   return 'The same working weight reached the top of the rep range across two recent sessions. If technique and recovery feel good, consider a small increase (often 1–2.5 kg); otherwise repeat the weight.';
  if(model.load&&latest.bestWeight!==null)
   return 'Repeat '+fmt(latest.bestWeight)+' kg with controlled form. Progress reps gradually if comfortable rather than increasing weight automatically.';
  if(top!==null&&latest.bestReps<top)
   return 'If comfortable, aim for up to '+fmt(Math.min(top,latest.bestReps+(model.unit==='sec'?5:1)),0)+' '+model.unit+' with consistent technique next time.';
  return 'Your recent completed sets reached the logged range. Repeat quality reps or duration before making exercise difficulty harder.';
 }
 function chart(model,mode){
  const key=mode==='volume'?'volume':mode==='weight'?'bestWeight':'bestReps';
  const eligible=model.records.filter(r=>r[key]!==null).slice(-10);
  const label=mode==='volume'?'External load volume (kg × reps)':mode==='weight'?'Working weight (kg)':
   (model.unit==='sec'?'Longest completed duration (seconds)':model.unit==='min'?'Longest completed duration (minutes)':'Most completed reps in a set');
  if(!eligible.length)return '<p class="fs55-no-chart">No comparable completed sets for this metric. Missing data is not treated as zero.</p>';
  const values=eligible.map(r=>r[key]),max=Math.max(...values,1),min=Math.min(0,...values),range=Math.max(1,max-min);
  const x=i=>eligible.length===1?160:20+i*280/(eligible.length-1),y=n=>101-(n-min)/range*76;
  const points=values.map((v,i)=>[x(i),y(v)]);
  const line=points.map(p=>p.join(',')).join(' ');
  const circles=points.map(([cx,cy],i)=>'<circle cx="'+cx.toFixed(2)+'" cy="'+cy.toFixed(2)+'" r="4"><title>'+safe(eligible[i].date)+' · '+safe(fmt(values[i]))+'</title></circle>').join('');
  const dates=eligible.map((r,i)=>'<text x="'+x(i).toFixed(2)+'" y="128" text-anchor="middle">'+safe(r.date.slice(5))+'</text>').join('');
  return '<svg class="fs55-chart" viewBox="0 0 320 142" role="img" aria-label="'+safe(label)+' across '+eligible.length+' recorded sessions">'+
   '<path d="M20 101H300 M20 63H300 M20 25H300" class="fs55-chart-grid"/>'+
   '<polyline points="'+line+'" fill="none" stroke="#c7ff17" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>'+circles+
   '<g class="fs55-chart-dates">'+dates+'</g></svg><p class="fs55-note">'+safe(label)+' · last '+eligible.length+' eligible sessions · recorded values only</p>';
 }
 function csvField(x){
  const str=x===null||x===undefined?'':String(x);
  const escaped=/^[\s]*[=+\-@]/.test(str)?"'"+str:str;
  return '"'+escaped.replace(/"/g,'""')+'"';
 }
 function csv(model){
  const rows=[['Date','Exercise ID','Exercise name','Unit','Completed sets','Best external weight kg','Best repetitions or duration','Load volume kg x reps','Data source']];
  for(const r of model.records)rows.push([r.date,model.id,model.name,model.unit,r.sets,r.bestWeight,r.bestReps,r.volume,'Completed logged sets']);
  return rows.map(row=>row.map(csvField).join(',')).join('\r\n')+'\r\n';
 }
 function markup(model,mode){
  const metricButtons=(model.chartableVolume?[['volume','Volume'],['weight','Working weight'],['reps',model.unit==='reps'?'Reps':'Duration']]:
   model.load?[['weight','Working weight'],['reps',model.unit==='reps'?'Reps':'Duration']]:
   [['reps',model.unit==='reps'?'Reps':'Duration']]);
  const picked=metricButtons.some(x=>x[0]===mode)?mode:metricButtons[0][0];
  const value=x=>x===null?'—':fmt(x);
  return '<section class="fs55-lab" aria-label="Strength evidence and history">'+
   '<div class="fs55-head"><div><small>FORGE / EVIDENCE LAB</small><h3>Progress backed by sets.</h3></div><span>VERIFIED LOGS</span></div>'+
   '<div class="fs55-stats">'+
   '<div><small>BEST WORKING WEIGHT</small><strong>'+(model.load?value(model.weightBest)+' '+(model.weightBest===null?'':'kg'):'Not applicable')+'</strong><span>'+(model.weightPR?'★ New load best this session':'External weight only')+'</span></div>'+
   '<div><small>BEST '+(model.unit==='reps'?'REPS':'DURATION')+'</small><strong>'+value(model.repsBest)+' '+(model.repsBest===null?'':safe(model.unit))+'</strong><span>'+(model.repPR?'★ New '+safe(model.unit)+' best this session':'Highest single completed set')+'</span></div>'+
   '<div><small>BEST LOAD VOLUME</small><strong>'+(model.chartableVolume?value(model.volumeBest):'Not applicable')+'</strong><span>'+(model.chartableVolume?'kg × reps; positive external load only':'Not compared across exercise types')+'</span></div>'+
   '</div><div class="fs55-graph"><div class="fs55-chart-bar"><strong>Recorded session trend</strong>'+
   '<div class="fs55-metrics">'+metricButtons.map(([id,name])=>'<button type="button" data-fs55-metric="'+id+'" aria-pressed="'+(picked===id)+'">'+safe(name)+'</button>').join('')+'</div></div>'+
   chart(model,picked)+'</div><div class="fs55-advice"><small>CONSERVATIVE NEXT-SESSION GUIDANCE</small><p>'+safe(guidance(model,typeof window.forgeGymDefinition==='function'?window.forgeGymDefinition(model.id)||{}:{}))+'</p>'+
   '<span>Advice uses only completed sets and does not change workout targets. Review technique, recovery and comfort before progressing.</span></div>'+
   '<div class="fs55-footer"><span>'+model.validDays+' eligible training day'+(model.validDays===1?'':'s')+' · '+(model.load?'Loaded exercise':'Bodyweight / no external load')+'</span>'+
   '<button type="button" data-fs55-export>↓ Export exercise CSV</button></div></section>';
 }
 function selected(){
  const root=document.getElementById('workouts'),pick=root?.querySelector('#fs50-exercise');
  const id=pick?.value||'';
  const s=rawState(),date=s.workouts?.selected||'';
  const def=typeof window.forgeGymDefinition==='function'?window.forgeGymDefinition(id):null;
  return id?analyse(s,id,date,def||{}):null;
 }
 function update(){
  const root=document.getElementById('workouts');
  if(!root||!document.querySelector('#nav [data-tab="workouts"].on'))return;
  const model=selected(),panel=root.querySelector('.fs50');
  if(!model||!panel){root.querySelector('.fs55-lab')?.remove();return}
  let holder=panel.querySelector('.fs55-lab');
  if(!holder){holder=document.createElement('div');holder.className='fs55-lab';panel.append(holder)}
  // Keep user-chosen chart metric during ordinary updates; select a compatible metric for new exercises.
  holder.outerHTML=markup(model,metric);
  // v50's generic suggestion must not contradict stronger v55 evidence rules.
  const prior=panel.querySelector('.fs50-target p');if(prior)prior.textContent=guidance(model,typeof window.forgeGymDefinition==='function'?window.forgeGymDefinition(model.id)||{}:{});
 }
 function exportSelected(){
  const model=selected();if(!model)return false;
  const data=csv(model),blob=new Blob(['\ufeff',data],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
   const a=document.createElement('a');
   a.href=url;a.download='forge-strength-'+model.id.replace(/[^a-z0-9_-]/gi,'').slice(0,40)+'.csv';
   document.body.append(a);a.click();a.remove();
  }finally{URL.revokeObjectURL(url)}
  return true;
 }
 document.addEventListener('click',event=>{
  const mode=event.target?.closest?.('[data-fs55-metric]')?.getAttribute('data-fs55-metric');
  if(mode&&['volume','weight','reps'].includes(mode)){metric=mode;update();return}
  if(event.target?.closest?.('[data-fs55-export]'))exportSelected();
 });
 document.addEventListener('change',event=>{if(event.target?.id==='fs50-exercise')Promise.resolve().then(()=>{metric='volume';update()})});
 window.addEventListener('forge:view-rendered',event=>{if(event.detail?.tab==='workouts')Promise.resolve().then(update)});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>Promise.resolve().then(update),{once:true});else Promise.resolve().then(update);
 window.forgeStrengthV55={analyse,guidance,chart,csv,markup,selected,update,exportSelected};
})();