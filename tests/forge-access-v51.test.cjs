'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('forge-access-v51.js','utf8');
const css=fs.readFileSync('forge-access-v51.css','utf8');
function boot(){
 let active='overview',clicks=0,prevented=0;
 const elements=new Map(),events={};
 const make=tag=>({tagName:tag.toUpperCase(),attrs:{},className:'',innerHTML:'',textContent:'',hidden:true,
  dataset:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},
  querySelector:()=>null,querySelectorAll:()=>[],focus(){this.focused=true}});
 const nav=make('nav');const buttons=['overview','workouts','diary','health','progress','settings'].map(id=>{
  const obj=make('button');obj.dataset.tab=id;obj.click=()=>{active=id;clicks++};return obj;
 });
 nav.querySelector=sel=>{
  if(sel==='[data-tab].on')return buttons.find(x=>x.dataset.tab===active);
  const match=/\[data-tab="([^"]+)"\]/.exec(sel);
  return match?buttons.find(x=>x.dataset.tab===match[1]):null;
 };
 nav.querySelectorAll=()=>buttons;
 elements.set('nav',nav);
 const main=make('main');
 const document={readyState:'loading',activeElement:make('button'),
  addEventListener(name,cb){(events[name]??=[]).push(cb)},
  getElementById:id=>elements.get(id)||null,
  querySelector:sel=>sel==='main'?main:null,
  createElement:make,body:{append(x){if(x.id)elements.set(x.id,x)},prepend(x){if(x.id)elements.set(x.id,x)}}};
 const window={addEventListener(name,cb){(events[name]??=[]).push(cb)}};
 vm.runInNewContext(source,{document,window,console,Date,Number,Math},{filename:'forge-access-v51.js'});
 return {api:window.forgeAccessV51,main,buttons,nav,elements,events,
  setActive:x=>active=x,get clicks(){return clicks},
  shortcut:(key,extra={})=>{let blocked=false;window.forgeAccessV51.keydown({
   key,altKey:true,ctrlKey:false,metaKey:false,shiftKey:false,defaultPrevented:false,target:document.activeElement,
   preventDefault(){blocked=true;prevented++},...extra
  });return blocked}};
}
test('New milestone includes accessible main and a keyboard skip link',()=>{
 const x=boot();const m=x.api.main();
 assert.equal(m.id,'forge-main-content');
 assert.equal(m.attrs.tabindex,'-1');
 assert.equal(m.attrs.role,'main');
 const a=x.api.skipLink();
 assert.equal(a.href,'#forge-main-content');
 assert.equal(a.textContent,'Skip to FORGE content');
 assert.equal(x.api.skipLink(),a);
 assert.match(css,/\.fa51-skip:focus/);
});
test('Navigation names, page state and shortcut hints update without rewriting the nav engine',()=>{
 const x=boot();x.api.sync();
 const today=x.buttons.find(z=>z.dataset.tab==='overview');
 const train=x.buttons.find(z=>z.dataset.tab==='workouts');
 assert.equal(today.attrs['aria-current'],'page');
 assert.equal(today.attrs['aria-pressed'],'true');
 assert.equal(train.attrs['aria-pressed'],'false');
 assert.equal(train.attrs['aria-label'],'Train workouts');
 assert.equal(train.attrs['aria-keyshortcuts'],'Alt+2');
 x.setActive('workouts');x.api.sync();
 assert.equal(train.attrs['aria-current'],'page');
 assert.equal(today.attrs['aria-current'],undefined);
 assert.equal(x.elements.get('forge-nav-announcement').textContent,'Train workouts selected');
});
test('Alt+number changes to the matching real tab; typing and other shortcuts are respected',()=>{
 const x=boot();
 assert.equal(x.shortcut('3'),true);
 assert.equal(x.clicks,1);
 assert.equal(x.api.activeTab(),'diary');
 assert.equal(x.shortcut('7'),false);
 assert.equal(x.clicks,1);
 assert.equal(x.shortcut('2',{target:{tagName:'INPUT',isContentEditable:false}}),false);
 assert.equal(x.clicks,1);
 assert.equal(x.shortcut('4',{ctrlKey:true}),false);
 assert.equal(x.clicks,1);
});
test('Help is dismissible, focus-contained and does not trap Escape if absent',()=>{
 const x=boot();
 assert.match(source,/role="dialog" aria-modal="true"/);
 assert.match(source,/data-fa51-close/);
 assert.match(source,/key==='Escape'&&byId\('forge-help-backdrop'\)\?\.hidden===false/);
 assert.match(source,/document\.activeElement===first/);
 assert.match(source,/document\.activeElement===last/);
 assert.match(source,/returnFocus/);
 let prevented=false;
 x.api.keydown({key:'Escape',defaultPrevented:false,ctrlKey:false,metaKey:false,preventDefault(){prevented=true}});
 assert.equal(prevented,false);
});
test('Visual UI respects large touch controls and reduced motion',()=>{
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/focus-visible/);
 assert.match(css,/\.fa51-help-backdrop\[hidden\]/);
});
test('Module does not modify user storage, workout sets, auth or indexed photos',()=>{
 new vm.Script(source);
 assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem|clear)|indexedDB\.deleteDatabase/);
 assert.doesNotMatch(source,/gymTick|gymSetValue|fdSaveManual/);
 assert.doesNotMatch(source,/fetch\(/);
});
