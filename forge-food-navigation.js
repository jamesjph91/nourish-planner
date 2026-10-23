/* FORGE Fuel navigation v29.
 * Keep Food Diary, Meal Plan, Recipes, Shopping and Meal Prep accessible
 * from the five-item mobile shell without duplicating or moving live forms.
 */
(()=>{'use strict';
const items=[['diary','Food Diary'],['planner','Meal Plan'],['recipes','Recipes'],['shopping','Shopping'],['prep','Meal Prep']];
const ids=new Set(items.map(x=>x[0]));
function htmlFor(active){
 return '<div class="forge-food-nav-caption"><span>FUEL · EAT SMARTER</span><small>Plan · Log · Cook</small></div>'+
 '<nav class="forge-food-nav" aria-label="Fuel tools">'+items.map(([id,name])=>
 '<button type="button" data-forge-food-target="'+id+'" class="'+(id===active?'on':'')+'"'+(id===active?' aria-current="page"':'')+'>'+name+'</button>').join('')+'</nav>';
}
function enhance(active){
 if(!ids.has(active))return;
 const section=document.getElementById(active);
 if(!section)return;
 // This was the three-item Fuel-only menu. The shared menu supersedes it.
 const old=section.querySelector('.forge-fuel-tabs');
 if(old)old.remove();
 let wrapper=section.querySelector('.forge-food-tools');
 if(!wrapper){
  wrapper=document.createElement('div');
  wrapper.className='forge-food-tools';
  const head=section.querySelector('.sectionhead');
  if(head&&typeof head.after==='function')head.after(wrapper);
  else section.prepend(wrapper);
 }
 wrapper.innerHTML=htmlFor(active);
 const fuelButton=document.querySelector('#nav [data-tab="diary"]');
 if(fuelButton)fuelButton.classList.toggle('forge-food-parent-active',active!=='diary');
 document.body.dataset.forgeFoodView=active;
}
function onView(tab){
 if(ids.has(tab)){enhance(tab);return}
 const fuelButton=document.querySelector('#nav [data-tab="diary"]');
 if(fuelButton)fuelButton.classList.remove('forge-food-parent-active');
 delete document.body.dataset.forgeFoodView;
}
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-forge-food-target]');
 if(!button)return;
 const target=button.dataset.forgeFoodTarget;
 if(!ids.has(target))return;
 const nav=document.querySelector('#nav [data-tab="'+target+'"]');
 if(nav)nav.click(); // Uses the same navigation and saved state as the original app.
});
window.addEventListener('forge:view-rendered',event=>onView(event.detail?.tab));
document.addEventListener('DOMContentLoaded',()=>{
 const on=document.querySelector('#nav [data-tab].on');
 if(on)onView(on.dataset.tab);
},{once:true});
window.forgeFoodNavigation={htmlFor,onView,items};
})();