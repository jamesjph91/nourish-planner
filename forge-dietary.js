/* FORGE v33: preferences and household portions.
 Ingredient-name exclusions are not allergen certification. */
(()=>{'use strict';
const groups={milk:['milk','skyr','greek','cottage','whey','feta','cheese','parmesan'],egg:['eggs','eggwhite'],fish:['salmon','smokedsalmon','cannedsalmon','mackerel','cod','tuna'],crustaceans:['prawns'],peanuts:['pb'],tree_nuts:['almonds'],soya:['soy','tofu','edamame'],wheat_gluten:['bread','bagel','wrap','pitta','pasta','couscous','noodles','oats'],sesame:['sesameoil','hummus']};
const names={milk:'Milk / dairy',egg:'Egg',fish:'Fish',crustaceans:'Crustaceans',peanuts:'Peanuts',tree_nuts:'Tree nuts',soya:'Soya',wheat_gluten:'Wheat / gluten sources',sesame:'Sesame / possible tahini'};
const meat=['chicken','turkey','beef'],fish=['salmon','smokedsalmon','cannedsalmon','mackerel','cod','tuna','prawns'],animal=[...meat,...fish,...groups.milk,...groups.egg];
const diets=['all','vegetarian','vegan','pescatarian'],cuisines=['all','Mediterranean','Asian-inspired','Mexican-inspired','Indian-inspired','British','Other'];
const valid=(input)=>{
 const x=input&&typeof input==='object'&&!Array.isArray(input)?input:{},n=Number(x.household),servings={};
 if(x.servings&&typeof x.servings==='object'&&!Array.isArray(x.servings))for(const [key,val] of Object.entries(x.servings).slice(0,84))
  if(/^([1-9]|1\d|2[0-8]):(breakfast|lunch|dinner)$/.test(key)&&Number.isInteger(val)&&val>=1&&val<=8)servings[key]=val;
 return {diet:diets.includes(x.diet)?x.diet:'all',cuisine:cuisines.includes(x.cuisine)?x.cuisine:'all',
  excluded:Array.isArray(x.excluded)?[...new Set(x.excluded.filter(v=>Object.hasOwn(groups,v)))].slice(0,9):[],
  blockedFoods:Array.isArray(x.blockedFoods)?[...new Set(x.blockedFoods.filter(v=>typeof v==='string'&&/^[a-z][a-z0-9_]{1,35}$/.test(v)))].slice(0,50):[],
  household:Number.isInteger(n)&&n>=1&&n<=8?n:1,servings};
};
const get=()=>valid(s.mealPrefs);
const portions=(day,cat)=>get().servings[day+':'+cat]||get().household;
function cuisine(r){
 if(cuisines.includes(r.cuisine)&&r.cuisine!=='all')return r.cuisine;
 const n=(r.name||'').toLowerCase();
 if(/fajita|burrito|chilli|black bean.*wrap/.test(n))return 'Mexican-inspired';
 if(/curry|spiced|turmeric/.test(n))return 'Indian-inspired';
 if(/stir.fry|soy|sesame|noodle|edamame/.test(n))return 'Asian-inspired';
 if(/mediterranean|greek|couscous|feta|lemon/.test(n))return 'Mediterranean';
 if(/jacket potato|roast potato|shepherd|porridge|toastie/.test(n))return 'British';
 return 'Other';
}
function matches(r){
 if(!r)return false;
 const p=get(),ingredients=Object.keys(r.items||{});
 if((p.excluded.length||p.diet!=='all')&&ingredients.some(id=>id.startsWith('ownfood_')))return false;
 if(p.blockedFoods.some(id=>ingredients.includes(id)))return false;
 if(p.excluded.some(g=>ingredients.some(id=>groups[g].includes(id))))return false;
 if(p.diet==='vegetarian'&&ingredients.some(id=>meat.includes(id)||fish.includes(id)))return false;
 if(p.diet==='pescatarian'&&ingredients.some(id=>meat.includes(id)))return false;
 if(p.diet==='vegan'&&ingredients.some(id=>animal.includes(id)))return false;
 if(p.cuisine!=='all'&&cuisine(r)!==p.cuisine)return false;
 return true;
}
function refresh(){s.shopDirty=true;save();renderCurrent()}
function set(key,value){
 const p=get();
 if(key==='diet'&&diets.includes(value))p.diet=value;
 else if(key==='cuisine'&&cuisines.includes(value))p.cuisine=value;
 else if(key==='household'&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=8){p.household=Number(value);p.servings={}}
 else return false;
 s.mealPrefs=p;refresh();return true;
}
function exclude(id,checked){
 if(!Object.hasOwn(groups,id))return false;
 const p=get();p.excluded=checked?[...new Set([...p.excluded,id])]:p.excluded.filter(x=>x!==id);
 s.mealPrefs=p;refresh();return true;
}
function ingredient(id,checked){
 if(!food[id])return false;
 const p=get();p.blockedFoods=checked?[...new Set([...p.blockedFoods,id])].slice(0,50):p.blockedFoods.filter(x=>x!==id);
 s.mealPrefs=p;refresh();return true;
}
function setServings(day,cat,count){
 const n=Number(count),p=get();
 if(!raw.some(d=>d.day===Number(day))||!['breakfast','lunch','dinner'].includes(cat)||!Number.isInteger(n)||n<1||n>8)return false;
 const key=day+':'+cat;if(n===p.household)delete p.servings[key];else p.servings[key]=n;
 s.mealPrefs=p;refresh();return true;
}
function option(list,value){return list.map(([id,label])=>'<option value="'+esc(String(id))+'"'+(id===value?' selected':'')+'>'+esc(label)+'</option>').join('')}
function panel(){
 const p=get(),review=days().reduce((n,d)=>n+d.ids.filter(id=>!matches(rs[id])).length,0);
 return '<section class="forge-dietary-panel" id="forge-dietary-panel"><div class="fdiet-head"><div><small>PERSONALISE YOUR MEAL PLAN</small><h3>Dietary preferences & household</h3></div><span>'+Object.keys(rs).length+' recipes</span></div>'+
 '<div class="fdiet-fields"><label>Eating style<select aria-label="Eating style" onchange="forgeDiet.set(\'diet\',this.value)">'+option([['all','Any'],['vegetarian','Vegetarian · ingredient-based'],['vegan','Vegan · ingredient-based'],['pescatarian','Pescatarian · ingredient-based']],p.diet)+'</select></label>'+
 '<label>Cuisine inspiration<select aria-label="Cuisine inspiration" onchange="forgeDiet.set(\'cuisine\',this.value)">'+option(cuisines.map(v=>[v,v==='all'?'All cuisines':v]),p.cuisine)+'</select></label>'+
 '<label>Default household portions<select aria-label="Default household portions" onchange="forgeDiet.set(\'household\',this.value)">'+option([1,2,3,4,5,6,7,8].map(x=>[String(x),x+(x===1?' person':' people')]),String(p.household))+'</select></label></div>'+
 '<details class="fdiet-exclusions"><summary>Exclude ingredients · '+p.excluded.length+' groups selected</summary><div class="fdiet-grid">'+Object.entries(names).map(([id,label])=>'<label><input type="checkbox"'+(p.excluded.includes(id)?' checked':'')+' onchange="forgeDiet.exclude(\''+id+'\',this.checked)"> '+esc(label)+'</label>').join('')+'</div>'+
 '<div class="fdiet-block"><select aria-label="Choose ingredient to exclude" id="fdiet-ingredient"><option value="">Select an ingredient…</option>'+Object.entries(food).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,item])=>'<option value="'+esc(id)+'">'+esc(item.name)+'</option>').join('')+'</select><button type="button" onclick="forgeDiet.ingredient(document.getElementById(\'fdiet-ingredient\').value,true)">Exclude</button></div>'+
 '<div class="fdiet-blocked">'+p.blockedFoods.map(id=>'<button type="button" onclick="forgeDiet.ingredient(\''+id+'\',false)">✕ '+esc(food[id]?.name||id)+'</button>').join('')+'</div></details>'+
 '<p class="fdiet-warning"><b>Allergy caution:</b> This only filters listed ingredient names; it does not check hidden allergens, packaging, traces or cross-contact. Custom ingredients have unverified allergen and dietary status. Never rely on this as a medical allergy safety check; verify labels separately.</p>'+
 (review?'<p class="fdiet-review">⚠ '+review+' existing meal slots fall outside your preferences. They have <b>not been automatically changed</b>; review them with Change meal.</p>':'<p class="fdiet-match">Planned meals match these ingredient-name filters. This does not establish allergen safety.</p>')+
 '<p class="fdiet-hint">Nutrition is calculated per person. Household portions only multiply shopping quantities; individual meal portion sizes and calorie targets stay unchanged.</p></section>';
}
window.forgeDiet={valid,get,portions,cuisine,matches,set,exclude,ingredient,setServings,panel,groups};
if(s.tab==='planner'||s.tab==='recipes')renderCurrent();
})();