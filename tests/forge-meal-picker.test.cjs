'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'FORGE main planner script should be available');
function boot(){
 const nodes=new Map(),store=new Map();
 function el(id){if(!nodes.has(id))nodes.set(id,{id,innerHTML:'',value:'',textContent:'',style:{},
 classList:{add(){},remove(){},toggle(){},contains(){return false}},
 setAttribute(){},addEventListener(){},focus(){},scrollIntoView(){}});return nodes.get(id)}
 const doc={getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,head:{append(){}},body:{append(){}}};
 const ctx={document:doc,localStorage:{setItem:(k,v)=>store.set(k,v),getItem:k=>store.get(k)||null},
 location:{protocol:'file:',hostname:'localhost'},navigator:{},Date,Math,JSON,Intl,
 alert(){},confirm:()=>true,console,setTimeout,clearTimeout,
 CustomEvent:class{constructor(t){this.type=t}},addEventListener(){},dispatchEvent(){},scrollTo(){}};
 ctx.window=ctx;
 vm.createContext(ctx);vm.runInContext(script,ctx);
 return {eval:x=>vm.runInContext(x,ctx),element:el,store};
}
test('Each planned meal has a Change meal action opening its matching recipe category',()=>{
 const b=boot();b.eval("navigate('planner')");
 const planner=b.element('planner').innerHTML;
 assert.match(planner,/Change meal/);
 assert.match(planner,/openMealPicker\(1,'breakfast'\)/);
 assert.match(planner,/openMealPicker\(1,'lunch'\)/);
 assert.match(planner,/openMealPicker\(1,'dinner'\)/);
 assert.match(planner,/Browse full meal library/);
 b.eval("openMealPicker(1,'breakfast')");
 const modal=b.element('modalinner').innerHTML;
 assert.match(modal,/FORGE · MEAL LIBRARY/);
 assert.match(modal,/Choose breakfast/);
 assert.match(modal,/35g\+ protein/);
 assert.match(modal,/Under 600 kcal/);
 const choices=JSON.parse(JSON.stringify(b.eval("mealPickerValues().map(x=>({id:x.id,cat:x.cat}))")));
 assert.ok(choices.length>1);
 assert.ok(choices.every(x=>x.cat==='breakfast'));
});
test('Choosing another meal changes just that slot, recalculates the plan and shopping, and persists safely',()=>{
 const b=boot(),before=b.eval("days()[0].ids[0]");
 const alternative=b.eval("Object.values(rs).find(r=>r.cat==='breakfast'&&r.id!==days()[0].ids[0]).id");
 const oldDinner=b.eval("days()[0].ids[2]");
 const initialN=b.eval("days()[0].n.kcal");
 const oldBasket=JSON.stringify(b.eval("aggregate('all')"));
 b.eval("openMealPicker(1,'breakfast')");
 const success=b.eval("replaceMealFromPicker("+JSON.stringify(alternative)+")");
 assert.equal(success,true);
 assert.equal(b.eval("days()[0].ids[0]"),alternative);
 assert.equal(b.eval("days()[0].ids[2]"),oldDinner);
 assert.equal(b.eval("s.week"),1);
 assert.equal(b.eval("s.shopDirty"),true);
 assert.equal(b.eval("s.tab"),'planner');
 assert.notEqual(b.eval("days()[0].n.kcal"),initialN);
 assert.notEqual(JSON.stringify(b.eval("aggregate('all')")),oldBasket);
 assert.ok(JSON.parse(b.store.get('nourishHigherDeficitV1')).swaps['1:breakfast']===alternative);
 assert.notEqual(before,alternative);
});
test('Meal picker rejects incompatible recipes and protects all saved plan slots',()=>{
 const b=boot(),before=b.eval("JSON.stringify(days().map(x=>x.ids))");
 const lunch=b.eval("Object.values(rs).find(r=>r.cat==='lunch').id");
 b.eval("openMealPicker(1,'breakfast')");
 assert.equal(b.eval("replaceMealFromPicker("+JSON.stringify(lunch)+")"),false);
 assert.equal(b.eval("replaceMealFromPicker('missing_recipe')"),false);
 assert.equal(b.eval("JSON.stringify(days().map(x=>x.ids))"),before);
 b.eval("openMealPicker(1,'wrongcat')");
 assert.equal(b.eval("window.forgeMealPick.cat"),'breakfast');
 b.eval("mealPickerFilter('favorites')");
 assert.match(b.element('modalinner').innerHTML,/No meals match|Favourites/);
});
test('Filtered suggestions reflect gym-day portions and favourites',()=>{
 const b=boot();
 b.eval("openMealPicker(1,'breakfast')");
 b.eval("mealPickerFilter('protein')");
 const names=JSON.parse(JSON.stringify(b.eval("mealPickerValues().map(x=>x.name)")));
 assert.ok(names.every(Boolean));
 const ok=b.eval("mealPickerValues().every(r=>portion(r.id,days()[0].gym).n.protein>=35)");
 assert.equal(ok,true);
 b.eval("mealPickerQuery('eggs')");
 const matched=JSON.parse(JSON.stringify(b.eval("mealPickerValues().map(x=>x.name)")));
 assert.ok(matched.every(x=>/eggs/i.test(x)));
});
