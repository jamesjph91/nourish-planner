'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const scripts=['forge-meal-library-data.js','forge-meal-library-plus.js','forge-meal-cuisines.js'];
const diet=fs.readFileSync('forge-dietary.js','utf8');
function boot(stored){
 const elMap=new Map(),store=new Map();
 const el=id=>{if(!elMap.has(id))elMap.set(id,{innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){},toggle(){},contains(){return false}},style:{},addEventListener(){},scrollIntoView(){},setAttribute(){}});return elMap.get(id)};
 if(stored)store.set('nourishHigherDeficitV1',JSON.stringify(stored));
 const context={document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,head:{append(){}},body:{append(){}}},window:null,navigator:{},location:{protocol:'file:',hostname:'localhost'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},console,Math,Date,Number,Intl,JSON,alert(){},confirm(){return true},dispatchEvent(){},addEventListener(){},scrollTo(){},CustomEvent:class{},setTimeout,clearTimeout};
 context.window=context;vm.createContext(context);
 for(const filename of scripts)vm.runInContext(fs.readFileSync(filename,'utf8'),context,{filename});
 vm.runInContext(inline,context,{filename:'index.inline'});
 vm.runInContext(diet,context,{filename:'forge-dietary.js'});
 return {state:()=>JSON.parse(store.get('nourishHigherDeficitV1')||'{}'),eval:expression=>vm.runInContext(expression,context),context,el,store};
}
test('FORGE has 210 meals with cuisine inspiration and full cooking instructions',()=>{
 const b=boot();
 const summary=JSON.parse(JSON.stringify(b.eval("Object.values(rs).reduce((a,r)=>(a[r.cat]=(a[r.cat]||0)+1,a),{})")));
 assert.deepEqual(summary,{breakfast:68,lunch:70,dinner:72});
 assert.equal(b.eval('Object.keys(rs).length'),210);
 assert.equal(b.eval("Object.values(window.FORGE_MEAL_CUISINES).length"),30);
 assert.equal(b.eval("Object.values(window.FORGE_MEAL_CUISINES).every(r=>r.items&&r.steps.length>0&&r.nutrition.kcal>0&&r.videoSearch)"),true);
 assert.match(b.eval('recipes()'),/210 balanced meal ideas/);
});
test('Dietary styles screen meat, fish, eggs and dairy from suggested recipes',()=>{
 const b=boot();
 b.eval("forgeDiet.set('diet','vegetarian')");
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_23)"),false); // beef
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_02)"),true); // eggs and mushrooms
 b.eval("forgeDiet.set('diet','vegan')");
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_02)"),false);
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_27)"),true); // tofu, sesame, rice, broccoli
 b.eval("forgeDiet.set('diet','pescatarian')");
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_22)"),true); // cod
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_23)"),false);
});
test('Ingredient exclusions apply to the real ingredient IDs, not recipe-title keywords',()=>{
 const b=boot();
 b.eval("forgeDiet.exclude('peanuts',true)");
 assert.equal(b.eval("forgeDiet.matches(rs.forge_plus_l13)"),false); // contains pb
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_27)"),true); // has sesame, not peanuts
 b.eval("forgeDiet.exclude('sesame',true)");
 assert.equal(b.eval("forgeDiet.matches(rs.forge_cuisine_27)"),false);
 assert.match(b.eval("forgeDiet.panel()"),/NOT|not|hidden allergens/);
 const opts=b.eval("forgeDiet.get().excluded.length");
 assert.equal(opts,2);
});
test('Personal preferences filter the same meal picker and preserve unsuitable existing slots',()=>{
 const b=boot(),original=b.eval("getSlot(1,'dinner')");
 b.eval("forgeDiet.set('diet','vegan')");
 b.eval("openMealPicker(1,'dinner')");
 assert.equal(b.eval("mealPickerValues().every(r=>forgeDiet.matches(r))"),true);
 const result=b.eval("assignSlot(1,'dinner','forge_cuisine_23')");
 assert.equal(result,false);
 assert.equal(b.eval("getSlot(1,'dinner')"),original);
 assert.match(b.eval("forgeDiet.panel()"),/existing meal slots/);
});
test('Household portions multiply shopping ingredient quantities without altering personal targets',()=>{
 const b=boot();
 const previous=b.eval("aggregate('all').rice"),kcal=b.eval("days()[0].n.kcal");
 assert.equal(b.eval("forgeDiet.set('household','3')"),true);
 assert.equal(b.eval("aggregate('all').rice"),previous*3);
 assert.equal(b.eval("days()[0].n.kcal"),kcal);
 assert.equal(b.eval("forgeDiet.setServings(1,'dinner',2)"),true);
 const riceAmount=b.eval("days()[0].meals[2].items.rice||0");
 const after=b.eval("aggregate('all').rice");
 assert.ok(Math.abs(after-(previous*3-riceAmount))<0.000001);
 assert.equal(b.eval("forgeDiet.portions(1,'dinner')"),2);
 assert.match(b.eval('planner()'),/Household portions/);
 assert.match(b.eval('exportPlan.toString()'),/Household servings/);
});
test('Dietary and household choices round-trip through cloud sync and backups',()=>{
 const b=boot();
 b.eval("forgeDiet.set('diet','vegetarian')");
 b.eval("forgeDiet.set('cuisine','Mediterranean')");
 b.eval("forgeDiet.exclude('egg',true)");
 b.eval("forgeDiet.set('household','4')");
 b.eval("forgeDiet.setServings(1,'breakfast',2)");
 const data=JSON.parse(JSON.stringify(b.context.nourishCloudBridge.getData()));
 assert.equal(data.mealPrefs.diet,'vegetarian');
 assert.equal(data.mealPrefs.household,4);
 assert.equal(data.mealPrefs.servings['1:breakfast'],2);
 assert.equal(b.context.nourishCloudBridge.applyData(data),true);
 assert.equal(b.eval("forgeDiet.get().excluded.includes('egg')"),true);
 assert.equal(b.eval("forgeDiet.portions(1,'breakfast')"),2);
});
test('Invalid imported portion counts and unknown exclusions are rejected safely',()=>{
 const b=boot();
 const value=JSON.parse(JSON.stringify(b.eval("forgeDiet.valid({diet:'oops',household:99,excluded:['milk','hacking'],servings:{'1:dinner':30,'2:lunch':3,'30:lunch':2}})")));
 assert.equal(value.diet,'all');
 assert.equal(value.household,1);
 assert.deepEqual(value.excluded,['milk']);
 assert.deepEqual(value.servings,{'2:lunch':3});
});
