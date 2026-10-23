'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const main=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const first=fs.readFileSync('forge-meal-library-data.js','utf8');
const extra=fs.readFileSync('forge-meal-library-plus.js','utf8');
const cuisine=fs.readFileSync('forge-meal-cuisines.js','utf8');
function boot(){
 const map=new Map(),stored=new Map();
 const el=id=>{if(!map.has(id))map.set(id,{id,innerHTML:'',value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},scrollIntoView(){},setAttribute(){}});return map.get(id)};
 const context={document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,body:{append(){}},head:{append(){}}},localStorage:{getItem:key=>stored.get(key)||null,setItem:(k,v)=>stored.set(k,v)},navigator:{},location:{hostname:'localhost',protocol:'file:'},Date,Intl,JSON,Math,Number,console,alert(){},confirm:()=>true,dispatchEvent(){},addEventListener(){},scrollTo(){},CustomEvent:class{constructor(x){this.type=x}},setTimeout,clearTimeout};
 context.window=context;vm.createContext(context);
 for(const [name,script] of [['base',first],['expanded',extra],['cuisine',cuisine],['main',main]])vm.runInContext(script,context,{filename:name});
 return {eval:x=>vm.runInContext(x,context),el,stored,context}
}
test('FORGE now supplies 210 meals, with 68 breakfasts, 70 lunches and 72 dinners',()=>{
 const b=boot();
 const counts=JSON.parse(JSON.stringify(b.eval("Object.values(rs).reduce((n,r)=>(n[r.cat]=(n[r.cat]||0)+1,n),{})")));
 assert.deepEqual(counts,{breakfast:68,lunch:70,dinner:72});
 assert.equal(b.eval("Object.keys(rs).length"),210);
 assert.match(b.eval("recipes()"),/210 balanced meal ideas/);
 assert.ok(b.eval("Object.values(rs).every(r=>r.name&&r.steps.length>=2&&r.time>0&&r.nutrition.kcal>0)"));
 assert.equal(b.eval("new Set(Object.values(rs).map(r=>r.name)).size"),210);
});
test('All new meals reference known measured ingredients and estimated nutrition matches original engine',()=>{
 const b=boot();
 assert.equal(b.eval("Object.values(window.FORGE_MEAL_RECIPES_PLUS).every(r=>Object.entries(r.items).every(([k,v])=>!!food[k]&&v>0)&&['breakfast','lunch','dinner'].includes(r.cat))"),true);
 assert.equal(b.eval("Object.values(window.FORGE_MEAL_RECIPES_PLUS).every(r=>Math.abs(portion(r.id,false).n.kcal-r.nutrition.kcal)<0.11)"),true);
});
test('Smart meal matching respects categories and sorts options by actual day-level target difference',()=>{
 const b=boot();b.eval("openMealPicker(1,'dinner')");
 const results=JSON.parse(JSON.stringify(b.eval("mealPickerValues().map(r=>({id:r.id,score:forgeSwapOutcome(days()[0],'dinner',r.id).score}))")));
 assert.ok(results.length>20);
 assert.equal(b.eval("mealPickerValues().every(x=>x.cat==='dinner')"),true);
 const sorted=results.filter(x=>x.id!==b.eval("getSlot(1,'dinner')"));
 assert.ok(sorted.every((x,i)=>i===0||sorted[i-1].score<=x.score+0.00001));
 assert.match(b.el('modalinner').innerHTML,/DAILY REFERENCES/);
 assert.match(b.el('modalinner').innerHTML,/Day after swap:/);
 assert.match(b.el('modalinner').innerHTML,/Closest to targets/);
});
test('Fast, meat-free, high-protein and calorie filters make the larger library navigable',()=>{
 const b=boot();b.eval("openMealPicker(1,'lunch')");
 b.eval("mealPickerFilter('quick')");
 assert.equal(b.eval("mealPickerValues().every(r=>r.time<=20)"),true);
 b.eval("mealPickerFilter('meatfree')");
 assert.equal(b.eval("mealPickerValues().every(r=>forgeNoMeatFish(r))"),true);
 b.eval("mealPickerFilter('protein')");
 assert.equal(b.eval("mealPickerValues().every(r=>portion(r.id,days()[0].gym).n.protein>=35)"),true);
 b.eval("mealPickerFilter('lighter')");
 assert.equal(b.eval("mealPickerValues().every(r=>portion(r.id,days()[0].gym).n.kcal<600)"),true);
 b.eval("mealPickerFilter('all')");
 b.eval("mealPickerSort('protein')");
 assert.equal(b.eval("mealPickerValues().every((r,i,a)=>i===0||portion(a[i-1].id,days()[0].gym).n.protein>=portion(r.id,days()[0].gym).n.protein)"),true);
 b.eval("mealPickerSort('name')");
 assert.ok(b.eval("mealPickerValues().length")>10);
});
test('Smart previews have no persistence side-effects until a user replaces a meal',()=>{
 const b=boot();
 const before=b.eval("JSON.stringify(s.swaps)"),saved=JSON.stringify([...b.stored]);
 b.eval("openMealPicker(1,'lunch')");
 b.eval("mealPickerFilter('meatfree')");
 b.eval("mealPickerSort('calories')");
 assert.equal(b.eval("JSON.stringify(s.swaps)"),before);
 assert.equal(JSON.stringify([...b.stored]),saved);
 const pick=b.eval("mealPickerValues()[0].id");
 assert.equal(b.eval("replaceMealFromPicker("+JSON.stringify(pick)+")"),true);
 assert.equal(b.eval("getSlot(1,'lunch')"),pick);
 assert.ok(Object.keys(JSON.parse(b.stored.get('nourishHigherDeficitV1')).swaps).length>0);
});
test('Weekly nutrition summary reflects actual changed recipes without making intake claims',()=>{
 const b=boot();
 const before=b.eval("forgeWeeklySummary(1).meanKcal");
 b.eval("assignSlot(1,'breakfast','forge_plus_b01')");
 const after=b.eval("forgeWeeklySummary(1).meanKcal");
 assert.notEqual(after,before);
 const planner=b.eval("planner()");
 assert.match(planner,/PLANNED NUTRITION/);
 assert.match(planner,/✦ Smart picks/);
 assert.match(planner,/kcal vs reference/);
 assert.match(planner,/Average planned energy/);
 assert.doesNotMatch(planner,/Calories consumed today/);
});
