'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),main=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const scripts=['forge-meal-library-data.js','forge-meal-library-plus.js','forge-meal-cuisines.js'];
function boot(){
 const map=new Map(),saved=new Map();let writes=0;
 const el=id=>{if(!map.has(id))map.set(id,{id,innerHTML:'',value:'',style:{},textContent:'',classList:{add(){},remove(){},contains(){return false}},addEventListener(){},scrollIntoView(){},setAttribute(){}});return map.get(id)};
 const ctx={document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,head:{append(){}},body:{append(){}}},localStorage:{getItem:k=>saved.get(k)||null,setItem(k,v){saved.set(k,v);writes++}},Date,Intl,Number,Math,console,navigator:{},location:{hostname:'localhost',protocol:'file:'},alert(){},confirm:()=>true,addEventListener(){},dispatchEvent(){},scrollTo(){},CustomEvent:class{constructor(){}},setTimeout,clearTimeout};
 ctx.window=ctx;vm.createContext(ctx);
 for(const file of scripts)vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
 vm.runInContext(main,ctx,{filename:'FORGE app'});
 return {eval:x=>vm.runInContext(x,ctx),state:()=>saved.get('nourishHigherDeficitV1'),writes:()=>writes,el,ctx};
}
test('Generator suggests seven days of category-correct meals without saving state',()=>{
 const b=boot(),before=b.state(),writes=b.writes(),week=JSON.parse(JSON.stringify(b.eval('forgeGenerateWeek(1)')));
 assert.equal(week.week,1);assert.equal(week.days.length,7);
 assert.equal(week.days.flatMap(d=>d.meals).length,21);
 assert.ok(week.days.every(d=>d.meals.map(m=>m.cat).join(',')==='breakfast,lunch,dinner'));
 const ids=week.days.flatMap(d=>d.meals.map(m=>m.id));
 assert.equal(new Set(ids).size,21);
 assert.ok(week.days.every(d=>d.kcal>0&&d.protein>0&&d.target>0));
 assert.equal(b.state(),before);assert.equal(b.writes(),writes);
});
test('Previewing is read-only and describes all 21 choices',()=>{
 const b=boot(),before=b.state(),writes=b.writes();
 b.eval('forgeAutoWeekPreview(2)');
 assert.equal(b.state(),before);assert.equal(b.writes(),writes);
 assert.match(b.el('modalinner').innerHTML,/Build week 2/);
 assert.match(b.el('modalinner').innerHTML,/Apply week 2/);
 assert.match(b.el('modalinner').innerHTML,/21 suggested meals/);
 assert.match(b.el('modalinner').innerHTML,/Check food labels/);
});
test('Applying a preview changes only the chosen week and preserves shopping calculations',()=>{
 const b=boot(),baseline=JSON.parse(JSON.stringify(b.eval("days().map(x=>x.ids)"))),other=JSON.stringify(baseline.slice(7));
 b.eval('forgeAutoWeekPreview(1)');
 assert.equal(b.eval('forgeApplyAutoWeek()'),true);
 const current=JSON.parse(JSON.stringify(b.eval("days().map(x=>x.ids)")));
 assert.notDeepEqual(current.slice(0,7),baseline.slice(0,7));
 assert.equal(JSON.stringify(current.slice(7)),other);
 assert.equal(b.eval('s.shopDirty'),true);
 assert.ok(Object.keys(JSON.parse(b.state()).swaps).length>0);
 assert.ok(Object.keys(b.eval("aggregate('all')")).length>5);
 assert.equal(b.eval('window.forgeAutoWeek'),null);
});
test('Undo restores exact previous week without changing any other weeks',()=>{
 const b=boot(),before=JSON.stringify(b.eval('days().map(x=>x.ids)'));
 b.eval('forgeAutoWeekPreview(3)');assert.equal(b.eval('forgeApplyAutoWeek()'),true);
 assert.notEqual(JSON.stringify(b.eval('days().map(x=>x.ids)')),before);
 assert.equal(b.eval('forgeUndoAutoWeek()'),true);
 assert.equal(JSON.stringify(b.eval('days().map(x=>x.ids)')),before);
 assert.equal(b.eval('forgeUndoAutoWeek()'),false);
});
test('Invalid week and insufficient dietary alternatives fail without modifying plan',()=>{
 const b=boot(),before=b.state();
 assert.equal(b.eval('forgeGenerateWeek(0)'),null);
 assert.equal(b.eval('forgeGenerateWeek(29)'),null);
 assert.equal(b.eval('forgeApplyAutoWeek()'),false);
 b.eval("window.forgeDiet={matches:()=>false}");
 const proposal=JSON.parse(JSON.stringify(b.eval('forgeGenerateWeek(1)')));
 assert.match(proposal.error,/No breakfast recipes/);
 assert.equal(b.state(),before);
});
