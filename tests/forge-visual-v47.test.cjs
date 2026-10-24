'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const assets=['hero','train','fuel','activity','progress'];

test('FORGE v47 includes original SVG scene art for all five main screens',()=>{
 const css=read('forge-visual-v47.css');
 for(const page of assets){
  const file='forge-art-'+page+'.svg',source=read(file);
  assert.match(source,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(source,/<\/svg>\s*$/);
  assert.match(source,/viewBox="0 0 1200 520"/);
  assert.match(css,new RegExp(file.replace('.','\\.')));
  assert.doesNotMatch(source,/<script|onload=|onclick=|foreignObject/i);
  assert.doesNotMatch(source,/<image[^>]+href="https?:/);
 }
 assert.match(css,/#overview \.fg26-hero/);
 assert.match(css,/#workouts\.forge-train-v27 \.fgt-heading/);
 assert.match(css,/#diary \.fgi-rings-panel/);
 assert.match(css,/#health \.fa42-hero/);
 assert.match(css,/#progress \.fp-header/);
});
test('Mobile bottom dock has larger SVGs, clear labels and OS safe-area clearance',()=>{
 const css=read('forge-visual-v47.css');
 assert.match(css,/\.sidebar #nav button \.fn-icon svg\{/);
 assert.match(css,/width:28px!important;height:28px!important/);
 assert.match(css,/\.sidebar #nav button\.on \.fn-icon:before/);
 assert.match(css,/height:calc\(94px \+ env\(safe-area-inset-bottom, 0px\)\)/);
 assert.match(css,/padding-bottom:calc\(116px \+ env\(safe-area-inset-bottom, 0px\)\)/);
 assert.match(css,/\.sidebar #nav button>span:last-child/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/focus-visible/);
 for(const tab of ['overview','workouts','diary','health','progress']){
  assert.match(css,new RegExp('button\\[data-tab="'+tab+'"\\]'));
 }
});
test('The live shell loads visual CSS and caches vector artwork for offline rendering',()=>{
 const html=read('index.html'),sw=read('service-worker.js');
 assert.match(html,/forge-visual-v47\.css\?v=47/);
 assert.match(sw,/forge-visual-v47\.css/);
 for(const page of assets)assert.match(sw,new RegExp('forge-art-'+page+'\\.svg'));
 const current=JSON.parse(read('forge-build.json')).version;
 assert.match(html,new RegExp('name="forge-release" content="'+current+'"'));
});
test('Visual upgrade only changes presentation, not food, health or user data',()=>{
 const css=read('forge-visual-v47.css');
 assert.doesNotMatch(css,/localStorage|indexedDB|clear\(\)|fetch\(|\.delete\(/);
 const sw=read('service-worker.js');
 assert.match(sw,/cache:'no-store'/);
});
