'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=name=>fs.readFileSync(name,'utf8');
test('FORGE mobile tab bar clears the iPhone bottom safe area',()=>{
 const css=read('forge-native.css');
 assert.match(css,/height:calc\(78px \+ env\(safe-area-inset-bottom, 0px\)\)/);
 assert.match(css,/padding:0 0 calc\(90px \+ env\(safe-area-inset-bottom, 0px\)\)/);
 assert.match(css,/\.nav button\[data-tab="overview"\]/);
 assert.match(css,/\.nav button\[data-tab="progress"\]/);
});
test('All five main navigation icons use inline SVG, not platform font glyphs',()=>{
 const src=read('forge-master-ui.js');
 new vm.Script(src);
 const doc=read('index.html');
 assert.match(doc,/forge-master-ui\.js\?v=38/);
 assert.match(doc,/forge-native\.css\?v=38/);
 for(const tab of ['overview','workouts','diary','health','progress']) {
  assert.match(src,new RegExp(' '+tab+':\\['));
  assert.match(doc,new RegExp('data-tab="'+tab+'"'));
 }
 assert.match(src,/createElementNS/);
 assert.match(src,/installForgeNavIcons/);
});
