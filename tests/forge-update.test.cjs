'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');

test('FORGE v44 is wired into the installed app and remains on a stable start URL',()=>{
 const html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest')),build=JSON.parse(read('forge-build.json'));
 assert.equal(build.version,44);
 assert.equal(manifest.start_url,'./index.html');
 assert.match(html,/forge-updater\.js\?v=41/);
 assert.match(html,/forge-updater\.css\?v=39/);
 assert.match(html,/forge-visual-v40\.css\?v=40/);
 assert.match(html,/forge-activity-explorer\.css\?v=42/);
 assert.match(html,/forge-activity-explorer\.js\?v=42/);
 assert.match(html,/forge-strength-insights\.css\?v=43/);
 assert.match(html,/forge-strength-insights\.js\?v=43/);
 assert.match(html,/forge-fuel-v44\.css\?v=44/);
 assert.match(html,/food-diary\.js\?v=44/);
 assert.match(html,/forge-train-coach\.js\?v=43/);
 assert.match(html,/name="forge-release" content="44"/);
});
test('FORGE update worker revalidates navigations and carries recovery files',()=>{
 const sw=read('service-worker.js');
 new vm.Script(sw);
 assert.match(sw,/forge-v44-smart-fuel/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/forge-build\.json/);
 assert.match(sw,/refresh-forge\.html/);
});
test('Recovery only resets caches and service workers, not local workouts or photos',()=>{
 const html=read('refresh-forge.html');
 assert.match(html,/caches\.keys\(\)/);
 assert.match(html,/\.unregister\(\)/);
 assert.match(html,/index\.html\?v=44/);
 assert.doesNotMatch(html,/localStorage\.(?:clear|removeItem)/);
 assert.doesNotMatch(html,/indexedDB\.deleteDatabase/);
 assert.doesNotMatch(html,/caches\.delete\([^)]*localStorage/);
});
test('Updater never clears personal app state',()=>{
 const code=read('forge-updater.js');
 new vm.Script(code);
 assert.match(code,/forge-build\.json/);
 assert.match(code,/getRegistration/);
 assert.match(code,/forge-release/);
 assert.match(code,/refresh-forge\.html/);
 assert.doesNotMatch(code,/const CURRENT=39/);
 assert.doesNotMatch(code,/localStorage\.clear/);
 assert.doesNotMatch(code,/localStorage\.removeItem/);
 assert.doesNotMatch(code,/indexedDB\.deleteDatabase/);
});

test('FORGE photographic styling stays separate from private app data',()=>{
 const visual=read('forge-visual-v40.css');
 assert.match(visual,/#overview \.fg26-hero/);
 assert.match(visual,/#workouts\{/);
 assert.match(visual,/#diary\{/);
 assert.match(visual,/#health\{/);
 assert.match(visual,/#progress\{/);
 assert.doesNotMatch(visual,/localStorage|indexedDB|fetch\(/);
});
