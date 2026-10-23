'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const inline=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)?.[1];
const extension=fs.readFileSync('forge-meal-library-data.js','utf8');
const extensionPlus=fs.readFileSync('forge-meal-library-plus.js','utf8');
const cuisine=fs.readFileSync('forge-meal-cuisines.js','utf8');
function boot(stored=null){
 const nodes=new Map(),store=new Map(),fields=new Map(),rows=[];
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',innerHTML:'',textContent:'',checked:false,style:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},setAttribute(){},addEventListener(){},focus(){},append(){},scrollIntoView(){}});return nodes.get(id)};
 const document={getElementById:element,querySelectorAll:sel=>sel==='#forge-custom-ingredients .forge-custom-ingredient'?rows:[],head:{append(){}},body:{append(){}},createElement:()=>({style:{},append(){}})};
 const context={document,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},console,Date,Intl,Math,JSON,Number,location:{protocol:'file:',hostname:'localhost'},navigator:{},alert(){},confirm:()=>true,CustomEvent:class{constructor(type){this.type=type}},dispatchEvent(){},addEventListener(){},scrollTo(){},setTimeout,clearTimeout};
 context.window=context;
 if(stored)store.set('nourishHigherDeficitV1',JSON.stringify(stored));
 vm.createContext(context);vm.runInContext(extension,context,{filename:'forge-meal-library-data.js'});vm.runInContext(extensionPlus,context,{filename:'forge-meal-library-plus.js'});vm.runInContext(cuisine,context,{filename:'forge-meal-cuisines.js'});vm.runInContext(inline,context,{filename:'index-inline.js'});
 const evaluate=code=>vm.runInContext(code,context);
 function ingredient(id,qty){rows.push({querySelector(sel){if(sel==='.forge-ingredient-select')return{value:id};if(sel==='.forge-ingredient-quantity')return{value:String(qty)}}})}
 return {context,store,element,evaluate,ingredient,rows,cloud:()=>context.window.nourishCloudBridge.getData()};
}
test('The expanded library has 210 individually named recipes across three categories',()=>{
 const b=boot();const counts=JSON.parse(JSON.stringify(b.evaluate("Object.values(rs).reduce((a,r)=>(a[r.cat]=(a[r.cat]||0)+1,a),{})")));
 assert.equal(counts.breakfast,68);
 assert.equal(counts.lunch,70);
 assert.equal(counts.dinner,72);
 assert.equal(b.evaluate("Object.values(rs).every(r=>r.name&&r.steps.length&&Object.keys(r.items).length&&r.nutrition.kcal>0)"),true);
 assert.match(b.evaluate("recipes()"),/210 balanced meal ideas/);
 assert.match(b.evaluate("recipes()"),/My Meals/);
});
test('Every extra meal is safe to add to the plan and has matching shopping ingredients',()=>{
 const b=boot();
 for(const cat of ['breakfast','lunch','dinner']){
  const id=b.evaluate("Object.keys(rs).find(id=>id.startsWith('forge_"+({breakfast:'b',lunch:'l',dinner:'d'}[cat])+"'))");
  const added=b.evaluate("assignSlot(1,'"+cat+"','"+id+"')");
  assert.equal(added,true);
  const totals=b.evaluate("days()[0].n.kcal");
  assert.ok(totals>400);
 }
 const shopping=b.evaluate("aggregate('all')");
 assert.ok(Object.keys(shopping).length>10);
});
test('Personal meal form stores per-serving quantities, affects shopping and survives cloud roundtrip',()=>{
 const b=boot();
 b.ingredient('chicken',400);b.ingredient('rice',160);b.ingredient('broccoli',320);
 b.element('forge-mymeal-name').value='Family chicken rice meal';
 b.element('forge-mymeal-cat').value='dinner';
 b.element('forge-mymeal-time').value='30';
 b.element('forge-mymeal-servings').value='2';
 b.element('forge-mymeal-steps').value='Cook chicken thoroughly.\nBoil rice and steam broccoli.';
 b.element('forge-mymeal-override').checked=false;
 assert.equal(b.evaluate('saveCustomMeal()'),true);
 const saved=b.cloud();
 assert.equal(Object.keys(saved.customRecipes).length,1);
 const recipe=Object.values(saved.customRecipes)[0];
 assert.equal(recipe.items.chicken,200);assert.equal(recipe.items.rice,80);assert.equal(recipe.items.broccoli,160);
 const original=JSON.stringify(b.evaluate("aggregate('all')"));
 b.evaluate("addRecipeForDay(1,'"+recipe.id+"')");
 assert.equal(b.evaluate("days()[0].ids[2]"),recipe.id);
 assert.notEqual(JSON.stringify(b.evaluate("aggregate('all')")),original);
 const synced=b.cloud();
 assert.equal(b.context.window.nourishCloudBridge.applyData(synced),true);
 assert.equal(b.evaluate("days()[0].ids[2]"),recipe.id);
 assert.equal(b.evaluate("portion('"+recipe.id+"',false).n.kcal"),recipe.nutrition.kcal);
});
test('Custom ingredients may be added with saved label nutrition and used in a meal',()=>{
 const b=boot();
 const loaded=JSON.parse(JSON.stringify(b.evaluate("validateCustomFoods({ownfood_12345678:{name:'Test custom pitta',unit:'each',store:'monthly',kcal:120,protein:4,carbs:22,fat:1,fibre:3}})")));
 assert.ok(loaded.ownfood_12345678);
 b.evaluate("s.customFoods=validateCustomFoods({ownfood_12345678:{name:'Test custom pitta',unit:'each',store:'monthly',kcal:120,protein:4,carbs:22,fat:1,fibre:3}});registerMyMeals(s.customFoods,s.customRecipes);save()");
 b.ingredient('ownfood_12345678',1);b.ingredient('tuna',110);
 b.element('forge-mymeal-name').value='My custom tuna pitta';
 b.element('forge-mymeal-cat').value='lunch';b.element('forge-mymeal-time').value='10';b.element('forge-mymeal-servings').value='1';
 b.element('forge-mymeal-steps').value='Mix and serve.';b.element('forge-mymeal-override').checked=false;
 assert.equal(b.evaluate('saveCustomMeal()'),true);
 const saved=b.cloud();
 assert.equal(saved.customFoods.ownfood_12345678.kcal,120);
 const meal=Object.values(saved.customRecipes)[0];
 assert.ok(meal.nutrition.kcal>120);
 assert.ok(meal.items.ownfood_12345678);
});
test('Manual nutrition override is explicit; malformed cloud recipes are discarded',()=>{
 const b=boot();
 const original=b.evaluate("portion('d1',false).n.kcal");
 const inVal=JSON.parse(JSON.stringify(b.evaluate("validateCustomRecipes({ownmeal_12345678:{name:'Low quality',cat:'dinner',items:{invalid:999},steps:[]}})")));
 assert.equal(Object.keys(inVal).length,0);
 b.evaluate("s.customRecipes={ownmeal_12345678:{name:'Manual labelled recipe',cat:'dinner',items:{chicken:150,rice:50},time:20,steps:['Cook'],manualNutrition:{kcal:555,protein:60,carbs:48,fat:12,fibre:6}}};const v=registerMyMeals(s.customFoods,s.customRecipes);s.customRecipes=v.recipes;save()");
 assert.equal(b.evaluate("portion('ownmeal_12345678',false).n.kcal"),555);
 assert.equal(b.evaluate("portion('d1',false).n.kcal"),original);
});
test('Deleting a personal recipe restores affected slots without touching logged history',()=>{
 const b=boot();
 b.evaluate("s.customRecipes={ownmeal_87654321:{id:'ownmeal_87654321',name:'My one-off dinner',cat:'dinner',items:{chicken:200,rice:75},time:20,steps:['Cook thoroughly']}};s.customRecipes=registerMyMeals(s.customFoods,s.customRecipes).recipes;assignSlot(1,'dinner','ownmeal_87654321');save()");
 assert.equal(b.evaluate("days()[0].ids[2]"),'ownmeal_87654321');
 assert.equal(b.evaluate("deleteCustomMeal('ownmeal_87654321')"),true);
 assert.equal(b.evaluate("days()[0].ids[2]"),b.evaluate("raw[0].dinner"));
 assert.equal(b.cloud().customRecipes.ownmeal_87654321,undefined);
});
test('A cloud account change drops obsolete custom meals before accepting validated incoming data',()=>{
 const b=boot();b.evaluate("s.customRecipes={ownmeal_12345678:{name:'Private meal',cat:'lunch',items:{tuna:110,bread:2},time:5,steps:['Mix']}};s.customRecipes=registerMyMeals(s.customFoods,s.customRecipes).recipes;save()");
 assert.equal(b.evaluate("!!rs.ownmeal_12345678"),true);
 assert.equal(b.context.window.nourishCloudBridge.applyData({}),true);
 assert.equal(b.evaluate("!!rs.ownmeal_12345678"),false);
 assert.equal(Object.keys(b.cloud().customRecipes).length,0);
});
