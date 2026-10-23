'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('forge-food-navigation.js','utf8');
function boot(){
 const listeners={};
 const state={activeFuel:false,navClicks:[],oldRemoved:false};
 const foodButton={classList:{toggle(cls,on){assert.equal(cls,'forge-food-parent-active');state.activeFuel=on},remove(cls){assert.equal(cls,'forge-food-parent-active');state.activeFuel=false}}};
 const sections={};
 for(const id of ['diary','planner','recipes','shopping','prep']){
   sections[id]={querySelector(sel){
      if(sel==='.forge-fuel-tabs'&&id==='diary'&&!state.oldRemoved)return{remove(){state.oldRemoved=true}};
      if(sel==='.forge-food-tools')return state[id+'Wrapper']||null;
      if(sel==='.sectionhead')return{after(node){state[id+'Wrapper']=node}};
      return null;
    },prepend(node){state[id+'Wrapper']=node}};
 }
 const document={body:{dataset:{}},getElementById:id=>sections[id]||null,
 querySelector(sel){
   if(sel==='#nav [data-tab="diary"]')return foodButton;
   const match=sel.match(/^#nav \[data-tab="(diary|planner|recipes|shopping|prep)"\]$/);
   if(match)return{click(){state.navClicks.push(match[1])}};
   return null;
 },createElement(){return{className:'',innerHTML:''}},addEventListener(name,fn){(listeners[name]??=[]).push(fn)}};
 const window={addEventListener(name,fn){(listeners[name]??=[]).push(fn)}};
 vm.runInNewContext(code,{document,window,console,Set},{filename:'forge-food-navigation.js'});
 return {state,sections,document,api:window.forgeFoodNavigation,emit(name,data){(listeners[name]||[]).forEach(fn=>fn(data))}};
}
test('Mobile Fuel navigator exposes all five existing tools including the meal planner',()=>{
 const x=boot();
 x.api.onView('diary');
 assert.equal(x.state.oldRemoved,true);
 assert.match(x.state.diaryWrapper.innerHTML,/Food Diary/);
 assert.match(x.state.diaryWrapper.innerHTML,/data-forge-food-target="planner"/);
 assert.match(x.state.diaryWrapper.innerHTML,/Meal Plan/);
 assert.match(x.state.diaryWrapper.innerHTML,/Meal Prep/);
 assert.match(x.state.diaryWrapper.innerHTML,/aria-current="page"/);
});
test('Tapping Meal Plan uses original hidden navigation button and persists through app engine',()=>{
 const x=boot();
 x.api.onView('diary');
 x.emit('click',{target:{closest(selector){return selector==='[data-forge-food-target]'?{dataset:{forgeFoodTarget:'planner'}}:null}}});
 assert.deepEqual(x.state.navClicks,['planner']);
 x.emit('forge:view-rendered',{detail:{tab:'planner'}});
 assert.match(x.state.plannerWrapper.innerHTML,/data-forge-food-target="diary"/);
 assert.match(x.state.plannerWrapper.innerHTML,/data-forge-food-target="planner" class="on" aria-current="page"/);
 assert.equal(x.state.activeFuel,true,'Fuel remains highlighted for a meal-planner subpage');
 assert.equal(x.document.body.dataset.forgeFoodView,'planner');
});
test('All related pages offer a return to Food Diary and unrelated tabs clear Fuel highlight',()=>{
 const x=boot();
 for(const id of ['recipes','shopping','prep']){
   x.api.onView(id);
   assert.match(x.state[id+'Wrapper'].innerHTML,/data-forge-food-target="diary"/);
   assert.equal(x.state.activeFuel,true);
 }
 x.api.onView('workouts');
 assert.equal(x.state.activeFuel,false);
 assert.equal(x.document.body.dataset.forgeFoodView,undefined);
});
test('Installed mobile index retains original planner and has FORGE navigation script',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const css=fs.readFileSync('forge-food-navigation.css','utf8');
 assert.match(html,/data-tab="planner"/);
 assert.match(html,/<section class="tabpage hidden" id="planner">/);
 assert.match(html,/forge-food-navigation\.js\?v=29/);
 assert.match(html,/forge-food-navigation\.css\?v=29/);
 assert.match(css,/\.forge-food-parent-active/);
 assert.match(css,/scroll-snap-type:x mandatory/);
});