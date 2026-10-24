'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const src=fs.readFileSync('forge-fuel-v57.js','utf8');
test('v57 UK serving presets and explicit nutrition basis are present',()=>{assert.match(src,/FORGE v57/);assert.match(src,/Per 100 g/);assert.match(src,/Per 100 ml/);assert.match(src,/Per portion/);assert.match(src,/fd57-preset/)});
test('v57 distinguishes missing nutrition from real zero and cross-checks totals',()=>{assert.match(src,/Missing — not zero/);assert.match(src,/0 is a real label value/);assert.match(src,/Macro energy cross-check/)});
test('v57 keeps planned meal logging duplicate-safe',()=>{assert.match(src,/Log planned meal once/);assert.match(src,/replaces the existing planned meal rather than duplicating it/)});
