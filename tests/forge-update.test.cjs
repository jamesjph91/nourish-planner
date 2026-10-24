'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8');

test('FORGE v54 is wired into the installed app and remains on a stable start URL',()=>{
 const html=read('index.html'),manifest=JSON.parse(read('manifest.webmanifest')),build=JSON.parse(read('forge-build.json'));
 assert.equal(build.version,54);
 assert.equal(manifest.start_url,'./index.html');
 assert.match(html,/forge-updater\.js\?v=41/);
 assert.match(html,/forge-updater\.css\?v=39/);
 assert.match(html,/forge-visual-v40\.css\?v=40/);
 assert.match(html,/forge-activity-explorer\.css\?v=42/);
 assert.match(html,/forge-activity-explorer\.js\?v=42/);
 assert.match(html,/forge-strength-insights\.css\?v=43/);
 assert.match(html,/forge-strength-insights\.js\?v=43/);
 assert.match(html,/forge-fuel-v44\.css\?v=44/);
 assert.match(html,/food-diary\.js\?v=46/);
 assert.match(html,/forge-fuel-v46\.css\?v=46/);
 assert.match(html,/forge-visual-v47\.css\?v=47/);
 assert.match(html,/forge-train-v48\.css\?v=48/);
 assert.match(html,/gym\.js\?v=54/);
 assert.match(html,/forge-strength-v50\.js\?v=50/);
 assert.match(html,/forge-strength-v50\.css\?v=50/);
 assert.match(html,/forge-access-v51\.css\?v=51/);
 assert.match(html,/forge-access-v51\.js\?v=51/);
 assert.match(html,/forge-data-safety-v52\.js\?v=52/);
 assert.match(html,/forge-data-safety-v52\.css\?v=52/);
 assert.match(html,/forge-offline-v53\.js\?v=53/);
 assert.match(html,/forge-offline-v53\.css\?v=53/);
 assert.match(html,/forge-gym-v54\.css\?v=54/);
 assert.match(html,/forge-gym-v54\.js\?v=54/);
 assert.match(html,/forge-train-v49\.css\?v=49/);
 assert.match(html,/forge-today-v45\.js\?v=45/);
 assert.match(html,/forge-today-v45\.css\?v=45/);
 assert.match(html,/forge-train-coach\.js\?v=43/);
 assert.match(html,/name="forge-release" content="54"/);
});
test('FORGE update worker revalidates navigations and carries recovery files',()=>{
 const sw=read('service-worker.js');
 new vm.Script(sw);
 assert.match(sw,/forge-v54-gym-flow/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/forge-build\.json/);
 assert.match(sw,/refresh-forge\.html/);
});
test('Recovery only resets caches and service workers, not local workouts or photos',()=>{
 const html=read('refresh-forge.html');
 assert.match(html,/caches\.keys\(\)/);
 assert.match(html,/\.unregister\(\)/);
 assert.match(html,/index\.html\?v=54/);
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
