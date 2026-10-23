'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');

test('FORGE v32 is wired into the installed app and remains on a stable start URL',()=>{
 const html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest')),build=JSON.parse(read('forge-build.json'));
 assert.equal(build.version,32);
 assert.equal(manifest.start_url,'./index.html');
 assert.match(html,/forge-updater\.js\?v=32/);
 assert.match(html,/forge-updater\.css\?v=28/);
 assert.match(html,/name="forge-release" content="32"/);
});
test('FORGE update worker revalidates navigations and carries recovery files',()=>{
 const sw=read('service-worker.js');
 new vm.Script(sw);
 assert.match(sw,/forge-v32-smart-planner/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/forge-build\.json/);
 assert.match(sw,/refresh-forge\.html/);
});
test('Recovery only resets caches and service workers, not local workouts or photos',()=>{
 const html=read('refresh-forge.html');
 assert.match(html,/caches\.keys\(\)/);
 assert.match(html,/\.unregister\(\)/);
 assert.match(html,/index\.html\?v=32/);
 assert.doesNotMatch(html,/localStorage\.(?:clear|removeItem)/);
 assert.doesNotMatch(html,/indexedDB\.deleteDatabase/);
 assert.doesNotMatch(html,/caches\.delete\([^)]*localStorage/);
});
test('Updater never clears personal app state',()=>{
 const code=read('forge-updater.js');
 new vm.Script(code);
 assert.match(code,/forge-build\.json/);
 assert.match(code,/getRegistration/);
 assert.doesNotMatch(code,/localStorage\.clear/);
 assert.doesNotMatch(code,/localStorage\.removeItem/);
 assert.doesNotMatch(code,/indexedDB\.deleteDatabase/);
});
