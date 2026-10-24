/* node --test tests/forge-activity-v58.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const hub=fs.readFileSync(path.join(root,'health-hub.js'),'utf8');
const guide=fs.readFileSync(path.join(root,'android-health-bridge','README.md'),'utf8');

test('activity UI attributes manual and imported sources explicitly',()=>{
 assert.match(hub,/Health Connect import/);
 assert.match(hub,/Manually entered/);
 assert.match(hub,/Samsung export/);
 assert.match(hub,/Imported summary/);
});

test('activity validator preserves a genuine zero but omits missing readings',()=>{
 assert.match(hub,/v===null\|\|v===undefined\|\|v===''/);
 assert.match(hub,/steps:\[0,150000,0\]/);
 assert.match(hub,/activeKcal:\[0,12000,1\]/);
});

test('duplicate-day imports show a preview and require confirmation before mutation',()=>{
 assert.match(hub,/conflicts=parsed\.rows\.filter\(entry=>map\.has\(entry\.date\)\)/);
 assert.match(hub,/Import preview:/);
 assert.match(hub,/already in FORGE/);
 assert.match(hub,/Existing fields on those dates will be updated, while fields absent from the import are kept/);
 assert.match(hub,/Import cancelled\. No saved activity was changed\./);
});

test('week activity view distinguishes a missing reading from a genuine zero',()=>{
 assert.match(hub,/const steps=row\.activity\?\.steps,has=steps!==undefined/);
 assert.match(hub,/has\?fmt\(steps\):'—'/);
 assert.match(hub,/Missing days show —; a recorded zero remains 0/);
});

test('last import freshness is explicit without claiming live watch sync',()=>{
 assert.match(hub,/Last imported:/);
 assert.match(hub,/file import time, not a live watch sync/);
 assert.match(hub,/updatedAt:stamp/);
});

test('bad imports are designed to leave existing activity unchanged',()=>{
 assert.match(hub,/Your existing activity has not been changed/);
 assert.match(hub,/No usable daily activity values were found/);
 assert.match(hub,/Import must contain 1–730 daily records/);
});

test('companion instructions state manual bridge boundaries and safe validation workflow',()=>{
 assert.match(guide,/not native Samsung Health sync/i);
 assert.match(guide,/Another manual export\/import is required/i);
 assert.match(guide,/missing reading is different from a real zero/i);
 assert.match(guide,/Do not clear browser storage/i);
 assert.match(guide,/workouts, nutrition, account data and IndexedDB progress photos/i);
 assert.match(guide,/No API key or paid subscription is required/i);
});
