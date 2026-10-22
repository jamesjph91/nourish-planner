/* node --test tests/food-diary.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(options={}){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(inline,'main app script present');
 const nodes={},store=new Map(),alerts=[];
 const element=id=>nodes[id]||(nodes[id]={id,value:'',checked:false,innerHTML:'',textContent:'',hidden:false,
  style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(){},scrollIntoView(){},focus(){},setAttribute(){},append(){}});
 const doc={getElementById:element,querySelectorAll:()=>[],createElement:()=>({style:{},append(){}}),head:{append(){}},body:{append(){}}};
 const context={document:doc,navigator:{},location:{protocol:'file:',hostname:'localhost'},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
  window:{addEventListener(){},dispatchEvent(){},scrollTo(){}},
  alert:message=>alerts.push(message),confirm:()=>true,CustomEvent:class{},
  setTimeout,clearTimeout,console,fetch:options.fetch||(()=>Promise.reject(Error('No mock response'))),AbortController,
  crypto:{randomUUID:()=>Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,12)}
 };
 context.globalThis=context;context.window.window=context.window;
 vm.createContext(context);
 vm.runInContext(inline,context,{filename:'index-inline.js'});
 for(const file of ['gym.js','food-diary.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
 return {context,nodes,store,alerts,element,evaluate:code=>vm.runInContext(code,context),cloud:()=>context.window.nourishCloudBridge.getData()};
}
function manualFill(e,{name='Protein yoghurt',quantity='150',category='snack',unit='g',code='',kcal='75',protein='10',carbs='5',fat='1',fibre='0',saveFood=true}={}){
 e('fd-name').value=name;e('fd-quantity').value=quantity;e('fd-category').value=category;e('fd-unit').value=unit;e('fd-barcode').value=code;
 for(const [k,v] of Object.entries({kcal,protein,carbs,fat,fibre}))e('fd-'+k).value=v;
 e('fd-save-food').checked=saveFood;
}
test('Food Diary loads in the existing navigation and daily dashboard',()=>{
 const b=boot();
 b.evaluate("navigate('diary')");
 assert.match(b.element('diary').innerHTML,/What you actually ate/);
 assert.match(b.element('diary').innerHTML,/Scan barcode/);
 b.evaluate("navigate('overview')");
 assert.match(b.element('overview').innerHTML,/TODAY’S ACTUAL INTAKE/);
 assert.match(b.element('overview').innerHTML,/Open today’s food diary/);
});
test('Manual food calculates macros, saves favourite, restores from private cloud',()=>{
 const b=boot();b.evaluate("navigate('diary')");b.context.window.fdBeginManual();
 manualFill(b.element);b.context.window.fdSaveManual();
 let state=b.cloud();
 assert.equal(state.foodDiary.entries.length,1);
 assert.equal(state.foodDiary.entries[0].totals.kcal,112.5);
 assert.equal(state.foodDiary.entries[0].totals.protein,15);
 assert.equal(state.foodDiary.savedFoods.length,1);
 assert.equal(b.context.window.nourishCloudBridge.isLocalCustom(),true);
 assert.equal(b.context.window.nourishCloudBridge.applyData(state),true);
 state=b.cloud();
 assert.equal(state.foodDiary.entries[0].totals.kcal,112.5);
 b.context.window.fdUseSaved(state.foodDiary.savedFoods[0].id);
 assert.match(b.element('diary').innerHTML,/Protein yoghurt/);
});
test('Planned food counted only after eaten, and portions change calories',()=>{
 const b=boot();b.evaluate("navigate('diary')");
 const start=b.evaluate("s.workouts.startDate");
 b.context.window.fdChangeDate(start);
 assert.equal(b.cloud().foodDiary.entries.length,0);
 const planned=b.evaluate('portion(days()[0].ids[0],days()[0].gym).n.kcal');
 b.context.window.fdAddPlanned('breakfast',0.5);
 const items=b.cloud().foodDiary.entries;
 assert.equal(items.length,1);
 assert.equal(items[0].source,'plan');
 assert.equal(items[0].quantity,0.5);
 assert.ok(Math.abs(items[0].totals.kcal-planned/2)<=0.1);
 b.context.window.fdAddPlanned('breakfast',2);
 assert.equal(b.cloud().foodDiary.entries.length,1,'existing planned breakfast replaced, not double counted');
 assert.ok(Math.abs(b.cloud().foodDiary.entries[0].totals.kcal-planned*2)<=0.1);
});
test('Validation blocks negative quantities and private reset clears diary',()=>{
 const b=boot();b.evaluate("navigate('diary')");b.context.window.fdBeginManual();
 manualFill(b.element,{quantity:'-100'});
 b.context.window.fdSaveManual();
 assert.equal(b.cloud().foodDiary.entries.length,0);
 assert.ok(b.alerts.some(x=>/quantity/.test(x)));
 b.element('fd-quantity').value='150';b.context.window.fdSaveManual();
 assert.equal(b.cloud().foodDiary.entries.length,1);
 b.context.window.nourishCloudBridge.resetPrivatePlan();
 assert.equal(b.cloud().foodDiary.entries.length,0);
 assert.equal(b.cloud().foodDiary.savedFoods.length,0);
});
test('Barcode lookup fills editable food form and computes serving quantity',async()=>{
 const b=boot({fetch:async(url)=>({
  ok:true,json:async()=>({status:1,product:{product_name:'Chocolate hazelnut spread',quantity:'400 g',
   nutriments:{'energy-kcal_100g':540,proteins_100g:6,carbohydrates_100g:55,fat_100g:31,fiber_100g:3}}})
 })});
 b.evaluate("navigate('diary')");
 await b.context.window.fdLookup('3017624010701');
 const pane=b.element('diary').innerHTML;
 assert.match(pane,/Chocolate hazelnut spread/);
 assert.match(pane,/3017624010701/);
 b.element('fd-name').value='Chocolate hazelnut spread';b.element('fd-quantity').value='50';b.element('fd-unit').value='g';b.element('fd-category').value='snack';b.element('fd-barcode').value='3017624010701';
 for(const [k,v] of Object.entries({kcal:'540',protein:'6',carbs:'55',fat:'31',fibre:'3'}))b.element('fd-'+k).value=v;
 b.element('fd-save-food').checked=true;b.context.window.fdSaveManual();
 const entry=b.cloud().foodDiary.entries[0];
 assert.equal(entry.source,'barcode');assert.equal(entry.totals.kcal,270);assert.equal(entry.totals.protein,3);
});
test('Untrusted backup record is bounded, escaped and malformed entries discarded',()=>{
 const b=boot();
 const bad={entries:[{id:'fd_abcdefghij',date:'2026-10-22',name:'<script>alert(1)</script>',category:'snack',
  source:'manual',unit:'g',quantity:100,perUnit:{kcal:100,protein:30,carbs:20,fat:10,fibre:2}},
 {id:'fd_abcdefghijk',date:'bad',name:'Bad entry',unit:'g',quantity:100,perUnit:{kcal:100}}],
 savedFoods:[]};
 const safe=b.evaluate('validateFoodDiary('+JSON.stringify(bad)+')');
 assert.equal(safe.entries.length,1);
 const round=JSON.parse(JSON.stringify(b.cloud()));round.foodDiary=bad;
 b.context.window.nourishCloudBridge.applyData(round);
 b.evaluate("navigate('diary')");
 assert.ok(!b.element('diary').innerHTML.includes('<script>alert(1)</script>'));
 assert.match(b.element('diary').innerHTML,/&lt;script&gt;/);
});


test('Current Open Food Facts v3 response populates nutrition and flags any missing value',async()=>{
 const calls=[];
 const b=boot({fetch:async url=>{
  calls.push(url);
  return {ok:true,status:200,json:async()=>({status:'success',result:{id:'product_found'},product:{
   product_name:'Example snack',nutriments:{'energy-kcal_100g':190,proteins_100g:13,carbohydrates_100g:12,fat_100g:8}
  }})};
 }});
 b.evaluate("navigate('diary')");
 await b.context.window.fdLookup('3017624010701');
 assert.equal(calls.length,1);assert.match(calls[0],/\/api\/v3\/product\//);
 assert.match(b.element('diary').innerHTML,/Example snack/);
 assert.match(b.element('diary').innerHTML,/value="190"/);
 assert.match(b.element('diary').innerHTML,/value="13"/);
 assert.match(b.element('fd-message').textContent,/fibre/);
 assert.match(b.element('diary').innerHTML,/fd-fibre[^>]+value=""/);
});
test('Falls back to the previous API when v3 is unavailable',async()=>{
 const calls=[];
 const b=boot({fetch:async url=>{
  calls.push(url);
  if(url.includes('/api/v3/'))return {ok:false,status:502};
  return {ok:true,status:200,json:async()=>({status:1,product:{
   product_name:'Example drink',quantity:'500ml',
   nutriments:{'energy-kcal_100g':45,proteins_100g:0,carbohydrates_100g:11,fat_100g:0,fiber_100g:0}
  }})};
 }});
 b.evaluate("navigate('diary')");await b.context.window.fdLookup('5012345678900');
 assert.equal(calls.length,2);
 assert.match(calls[1],/\/api\/v2\/product\//);
 assert.match(b.element('diary').innerHTML,/Example drink/);
 assert.match(b.element('diary').innerHTML,/<option value="ml" selected>/);
});
test('Unknown barcode remains usable, with no invented nutrition values',async()=>{
 const b=boot({fetch:async()=>({ok:false,status:404})});
 b.evaluate("navigate('diary')");await b.context.window.fdLookup('0000000000000');
 assert.match(b.element('diary').innerHTML,/value="0000000000000"/);
 assert.match(b.element('fd-message').textContent,/No matching product/);
 assert.match(b.element('diary').innerHTML,/fd-name/);
 b.context.window.fdSaveManual();
 assert.match(b.alerts.join(' '),/Enter a food name/);
});
test('Network error retains scanned barcode and offers manual values',async()=>{
 const b=boot({fetch:async()=>{throw Error('Failed to fetch')}});
 b.evaluate("navigate('diary')");await b.context.window.fdLookup('12345678');
 assert.match(b.element('diary').innerHTML,/value="12345678"/);
 assert.match(b.element('fd-message').textContent,/could not be reached/);
});
test('Account switch prevents pending barcode lookup from repopulating private form',async()=>{
 let release;
 const b=boot({fetch:()=>new Promise(resolve=>{release=resolve})});
 b.evaluate("navigate('diary')");
 const pending=b.context.window.fdLookup('3017624010701');
 b.context.window.nourishCloudBridge.resetPrivatePlan();
 release({ok:true,status:200,json:async()=>({status:'success',product:{product_name:'Other user food',nutriments:{'energy-kcal_100g':500}}})});
 await pending;
 b.evaluate("navigate('diary')");
 assert.doesNotMatch(b.element('diary').innerHTML,/Other user food/);
 assert.doesNotMatch(b.element('diary').innerHTML,/3017624010701/);
});
