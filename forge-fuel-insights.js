/* FORGE Fuel v26 rings; enhancement only — does not replace food/barcode logging. */
(()=>{'use strict';
function numeral(text){const m=String(text||'').match(/[\d,.]+/);return m?Number(m[0].replace(/,/g,'')):0}
function text(node){return node?.textContent||''}
function ring(label,amount,goal,unit,color){const ratio=goal>0?Math.max(0,Math.min(100,amount/goal*100)):0;
 const val=(Math.round(amount*10)/10).toLocaleString('en-GB',{maximumFractionDigits:1});
 return '<div class="fgi-ring-cell"><div class="fgi-ring" style="--ring-fill:'+(ratio*3.6).toFixed(1)+'deg;--ring-color:'+color+'"><div><b>'+val+(unit==='g'?'g':'')+'</b><small>'+label.toUpperCase()+'</small></div></div><span>of '+Number(goal).toLocaleString('en-GB')+(unit==='g'?'g':' kcal')+'</span></div>';
}
function enhance(){
 const root=document.getElementById('diary');
 if(!root||!document.querySelector('#nav [data-tab="diary"].on'))return;
 const summary=root.querySelector('.fd-summary');
 if(!summary||root.querySelector('.fgi-rings-panel'))return;
 const heading=text(summary.querySelector('h2'));
 const calorie=Number((heading.match(/([\d,.]+)\s*kcal/)||[])[1]?.replaceAll(',',''))||0;
 const calorieGoal=Number((heading.match(/\/\s*([\d,.]+)\s*kcal target/)||[])[1]?.replaceAll(',',''))||0;
 const nutrients=[...summary.querySelectorAll('.fd-stat')].map(row=>{
  const label=text(row.querySelector('span')).trim().toLowerCase();
  const match=text(row.querySelector('b')).match(/([\d,.]+)\s*\/\s*([\d,.]+)\s*g/);
  return {label,current:match?Number(match[1].replaceAll(',','')):0,goal:match?Number(match[2].replaceAll(',','')):0};
 });
 const lookup=label=>nutrients.find(x=>x.label===label)||{current:0,goal:0};
 const p=lookup('protein'),c=lookup('carbs'),f=lookup('fat');
 if(!(calorieGoal>0&&p.goal>0&&c.goal>0&&f.goal>0))return;
 const panel=document.createElement('section');
 panel.className='fgi-rings-panel';
 const diaryDate=root.querySelector('#fd-date')?.value||'';
 panel.innerHTML='<div class="fgi-panel-title"><span>YOUR NUTRITION</span><b>'+diaryDate+'</b></div><div class="fgi-rings">'+
 ring('Calories',calorie,calorieGoal,'kcal','#ff9d4b')+
 ring('Protein',p.current,p.goal,'g','#b9ff16')+
 ring('Carbs',c.current,c.goal,'g','#44d8d3')+
 ring('Fat',f.current,f.goal,'g','#ae8cff')+'</div>'+
 '<p class="fgi-note">Numbers come from your food diary for this date. Carbs and fat targets are illustrative splits; check the product label for scanned nutrition.</p>';
 summary.before(panel);
}
document.addEventListener('DOMContentLoaded',enhance,{once:true});
window.addEventListener('forge:view-rendered',e=>{if(e.detail?.tab==='diary')enhance()});
window.forgeFuelInsights={enhance};
})();