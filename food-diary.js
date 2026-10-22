/* Nourish Food Diary 2.0 — food consumed, separate from the meal plan. */
(function(){
'use strict';
const NUT=['kcal','protein','carbs','fat','fibre'];
const CATS=['breakfast','lunch','dinner','snack'];
const Z=()=>({kcal:0,protein:0,carbs:0,fat:0,fibre:0});
const f=n=>Number.isFinite(+n)?Math.round(+n*10)/10:0;
const amountLabel={g:'g',ml:'ml',portion:'portion'};
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
let selected=localDate(new Date()),draft=null,editing='',scanner=null,scannerBusy=false,scannerLoading=null,lookupBusy=false,lookupMessage='',lastBarcode='';
const dayUTC=iso=>{const a=iso.split('-').map(Number);return Date.UTC(a[0],a[1]-1,a[2]);};
const plusDays=(date,n)=>new Date(dayUTC(date)+n*86400000).toISOString().slice(0,10);
const cleanDiary=()=>{s.foodDiary=validateFoodDiary(s.foodDiary);return s.foodDiary;};
const escape=v=>esc(v);
const gram=unit=>unit==='ml'?'ml':unit==='portion'?'portion':'g';
const blankDraft=()=>({name:'',barcode:'',unit:'g',quantity:100,category:'snack',perUnit:{kcal:'',protein:'',carbs:'',fat:'',fibre:''},saveFood:true});
const total=(unit,quantity,perUnit)=>{const mul=unit==='portion'?quantity:quantity/100;const out={};for(const key of NUT)out[key]=f((perUnit[key]||0)*mul);return out;};
const grand=entries=>entries.reduce((a,v)=>{for(const k of NUT)a[k]+=v.totals[k]||0;return a},Z());
const diaryFor=date=>cleanDiary().entries.filter(x=>x.date===date);
const targetFor=date=>{
 const index=planIndex(date),row=index?days()[index-1]:null;
 return row?goal(row):s.settings.restCal;
};
const planIndex=date=>{
 const start=s.workouts?.startDate||(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return localDate(d)})();
 const offset=(dayUTC(date)-dayUTC(start))/86400000;
 return Number.isInteger(offset)&&offset>=0&&offset<28?offset+1:null;
};
function changeDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T12:00:00')))return;
 selected=value;draft=null;editing='';stopScanner();renderCurrent();
}
function adjustDate(n){if(Number.isInteger(n)&&Math.abs(n)<10)changeDate(plusDays(selected,n));}
function addPlanned(cat,servings){
 const index=planIndex(selected);if(!index||!['breakfast','lunch','dinner'].includes(cat))return;
 const n=Number(servings);if(!Number.isFinite(n)||n<0.25||n>4)return;
 const row=days()[index-1],id=row.ids[CATS.indexOf(cat)],recipe=rs[id];
 if(!recipe)return;
 const diary=cleanDiary(),prior=diary.entries.find(x=>x.date===selected&&x.category===cat&&x.source==='plan');
 if(prior&&!confirm('Replace the already logged '+cat+' with this planned meal?'))return;
 const foodData=portion(id,row.gym).n;
 const entry={id:uid(),date:selected,category:cat,source:'plan',name:recipe.name,recipeId:id,barcode:'',unit:'portion',quantity:n,perUnit:copyN(foodData),totals:total('portion',n,foodData)};
 diary.entries=diary.entries.filter(x=>x!==prior);diary.entries.push(entry);
 s.foodDiary=diary;save();renderCurrent();notify(recipe.name+' logged as eaten.');
}
function uid(){return 'fd_'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2,12));}
function copyN(o){const a=Z();for(const k of NUT)a[k]=f(o?.[k]);return a;}
function deleteEntry(id){
 const diary=cleanDiary(),e=diary.entries.find(x=>x.id===id);
 if(!e||!confirm('Remove '+e.name+' from your diary?'))return;
 diary.entries=diary.entries.filter(x=>x.id!==id);s.foodDiary=diary;save();renderCurrent();
}
function fillDraft(food,id=''){
 editing=id;draft={...blankDraft(),...food,perUnit:copyN(food.perUnit)};
 renderCurrent();
 const el=document.getElementById('fd-name');el?.focus();el?.scrollIntoView({block:'center',behavior:'smooth'});
}
function editEntry(id){
 const e=cleanDiary().entries.find(x=>x.id===id);if(!e)return;
 fillDraft({name:e.name,barcode:e.barcode||'',unit:e.unit,quantity:e.quantity,category:e.category,perUnit:e.perUnit,saveFood:e.source!=='plan'},id);
}
function useSaved(id){
 const item=cleanDiary().savedFoods.find(x=>x.id===id);
 if(!item)return;fillDraft({...item,quantity:item.lastQuantity||100,category:item.category||'snack',saveFood:true});
}
function cancelDraft(){draft=null;editing='';renderCurrent();}
function upsertSaved(data){
 const diary=cleanDiary();
 const key=data.barcode?diary.savedFoods.findIndex(x=>x.barcode===data.barcode):diary.savedFoods.findIndex(x=>x.name.toLowerCase()===data.name.toLowerCase()&&!x.barcode);
 const item={id:key>=0?diary.savedFoods[key].id:uid(),name:data.name,barcode:data.barcode||'',unit:data.unit,category:data.category,perUnit:data.perUnit,lastQuantity:data.quantity};
 if(key>=0)diary.savedFoods.splice(key,1);diary.savedFoods.unshift(item);
 diary.savedFoods=diary.savedFoods.slice(0,80);s.foodDiary=diary;
}
function saveManual(){
 const name=(document.getElementById('fd-name')?.value||'').trim().slice(0,100);
 const unit=document.getElementById('fd-unit')?.value||'g',cat=document.getElementById('fd-category')?.value||'snack';
 const quantity=Number(document.getElementById('fd-quantity')?.value),code=(document.getElementById('fd-barcode')?.value||'').trim();
 if(name.length<2){alert('Enter a food name.');return;}
 if(!['g','ml','portion'].includes(unit)||!CATS.includes(cat))return;
 if(!Number.isFinite(quantity)||quantity<=0||quantity>5000){alert('Enter a quantity between 0.1 and 5,000.');return;}
 if(code&&!/^\d{8,14}$/.test(code)){alert('Barcode must contain 8–14 digits, or be blank.');return;}
 const perUnit={};const incomplete=[];for(const key of NUT){
  const raw=String(document.getElementById('fd-'+key)?.value??'').trim();
  if(raw===''){
   if(key==='kcal'){alert('Enter calories from the product nutrition label before saving.');return;}
   incomplete.push(key);
  }
  const value=raw===''?0:Number(raw);
  const limits={kcal:5000,protein:300,carbs:500,fat:300,fibre:200};
  if(!Number.isFinite(value)||value<0||value>limits[key]){alert('Check the '+key+' value per '+(unit==='portion'?'portion':'100 '+unit)+'.');return;}
  perUnit[key]=f(value);
 }
 if(incomplete.length&&!confirm('Missing nutrition data: '+incomplete.join(', ')+'. These unknown values will count as zero until you correct the entry from the label. Save anyway?'))return;
 const diary=cleanDiary(),old=diary.entries.find(x=>x.id===editing);
 const isPlanned=old?.source==='plan'&&unit==='portion'&&cat===old.category;
 const source=isPlanned?'plan':code?'barcode':'manual';
 const entry={id:old?.id||uid(),date:selected,category:cat,source,name,barcode:code,unit,quantity:f(quantity),perUnit,totals:total(unit,quantity,perUnit)};
 if(isPlanned&&old.recipeId)entry.recipeId=old.recipeId;
 if(old)diary.entries=diary.entries.filter(x=>x.id!==old.id);
 diary.entries.push(entry);diary.entries=diary.entries.slice(-1200);
 s.foodDiary=diary;
 if(document.getElementById('fd-save-food')?.checked)upsertSaved(entry);
 draft=null;editing='';save();renderCurrent();notify(name+' added to your food diary.');
}
function parseProduct(p,code){
 const n=p?.nutriments||{};
 const present=keys=>keys.map(k=>n[k]).find(x=>x!==undefined&&x!==null&&x!==''&&Number.isFinite(Number(x))&&Number(x)>=0);
 const pick=(keys,max=5000)=>{
  const v=present(keys);
  return v===undefined?'':f(Math.min(max,Number(v)));
 };
 let energy=pick(['energy-kcal_100g']);
 if(energy===''){
  const kj=pick(['energy-kj_100g','energy_100g'],20000);
  if(kj!=='')energy=f(kj/4.184);
 }
 const perUnit={
  kcal:energy,
  protein:pick(['proteins_100g'],300),
  carbs:pick(['carbohydrates_100g'],500),
  fat:pick(['fat_100g'],300),
  fibre:pick(['fiber_100g'],200)
 };
 const name=String(p?.product_name_en||p?.product_name||p?.generic_name||'').trim().slice(0,100)||'Scanned product '+code;
 const quantity=String(p?.quantity||'').toLowerCase();
 const unit=/(?:ml|cl|litres?|liters?|\d\s*l\b)/.test(quantity)&&!/(?:\d\s*kg\b|\d\s*g\b)/.test(quantity)?'ml':'g';
 const missing=NUT.filter(k=>perUnit[k]==='');
 return {...blankDraft(),name,barcode:code,unit,perUnit,missing};
}
async function lookup(code){
 const normalized=String(code||'').replace(/\s/g,'');
 if(!/^\d{8,14}$/.test(normalized)){showMessage('Enter a valid 8–14 digit barcode or use manual food entry.');return;}
 if(lookupBusy){showMessage('The previous lookup is still running. Please try again once it finishes.');return;}
 lookupBusy=true;lastBarcode=normalized;
 // Retain the scanned code in a usable food form even if the external API is offline.
 draft={...blankDraft(),barcode:normalized};editing='';
 renderCurrent();showMessage('Barcode '+normalized+' captured. Looking for the product and nutritional values…');
 let failure=null,notFound=false;
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),14000);
 try{
  const fields='code,product_name,product_name_en,generic_name,quantity,nutriments';
  const urls=[
   'https://world.openfoodfacts.org/api/v3/product/'+normalized+'.json?fields='+fields,
   'https://world.openfoodfacts.org/api/v2/product/'+normalized+'.json?fields='+fields
  ];
  let product=null;
  for(let i=0;i<urls.length;i++){
   try{
    const res=await fetch(urls[i],{signal:abort.signal,headers:{Accept:'application/json'}});
    if(res.status===429)throw Error('The food database is temporarily limiting requests (429).');
    if(!res.ok){if(res.status===404){notFound=true;continue;}throw Error('Food database returned HTTP '+res.status+'.');}
    const data=await res.json();
    const found=!!data?.product&&(data.status===1||data.status==='success'||data.result?.id==='product_found');
    if(found){product=data.product;break;}
    notFound=true;
   }catch(e){
    failure=e;
    if(abort.signal.aborted)break;
   }
  }
  if(!product){
   const detail=abort.signal.aborted?'The lookup timed out.':notFound?'No matching product was found in the database.':(failure?.message||'The product database could not be reached.');
   showMessage('Barcode '+normalized+' saved. '+detail+' Fill in the product name and label values in the form below.');
   return;
  }
  draft=parseProduct(product,normalized);editing='';
  renderCurrent();
  const missing=draft.missing||[];
  showMessage(!missing.length?
   'Found '+draft.name+' — nutrition values are filled in. Check the packaging and amount eaten before saving.':
   'Found '+draft.name+', but the database has no value for: '+missing.join(', ')+'. Enter any missing values from the product label before saving.');
  document.getElementById('fd-entry')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){
  showMessage('Barcode '+normalized+' captured but the lookup failed ('+(e?.message||'connection error')+'). You can enter the nutrition label below.');
 }finally{clearTimeout(timer);lookupBusy=false;}
}
function showMessage(msg){
 lookupMessage=String(msg||'').slice(0,600);
 const el=document.getElementById('fd-message');if(el){el.textContent=lookupMessage;el.setAttribute('role','status');}
}
function beginManual(){fillDraft(blankDraft());}
function parseScan(code){
 if(scannerBusy)return;
 const c=String(code||'').replace(/\s/g,'');
 if(!/^\d{8,14}$/.test(c)){showMessage('The camera read an unsupported barcode. Try scanning the EAN/UPC number or typing the digits.');return;}
 scannerBusy=true;lastBarcode=c;
 // Start nutrition lookup immediately; do not block it on slow camera shutdown.
 void stopScanner().catch(()=>{});
 renderCurrent();
 void lookup(c).finally(()=>{scannerBusy=false;});
}
function loadScannerLibrary(){
 if(window.Html5QrcodeScanner)return Promise.resolve();
 if(scannerLoading)return scannerLoading;
 scannerLoading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
  script.async=true;
  script.onload=()=>window.Html5QrcodeScanner?resolve():reject(Error('Scanner library did not initialise.'));
  script.onerror=()=>reject(Error('Could not load camera scanner library.'));
  document.head.append(script);
 }).catch(e=>{scannerLoading=null;throw e});
 return scannerLoading;
}
async function openScanner(){
 if(scanner)return;
 if(!window.isSecureContext&&!['localhost','127.0.0.1'].includes(location.hostname)){showMessage('Camera scanning needs HTTPS. Enter the barcode manually.');return;}
 const el=document.getElementById('fd-scan-holder');if(!el)return;
 el.hidden=false;el.innerHTML='<div id="fd-camera"></div><button class="btn" onclick="fdStopScanner()">Close scanner</button><p class="short">Allow camera access, then point at an EAN or UPC barcode. The scanner also offers a photo upload option on supported devices.</p>';
 showMessage('Loading camera scanner. Allow camera permission when prompted.');
 try{
  await loadScannerLibrary();
  if(!document.getElementById('fd-camera'))return;
  scanner=new window.Html5QrcodeScanner('fd-camera',{fps:10,qrbox:{width:240,height:140},rememberLastUsedCamera:false,showTorchButtonIfSupported:true},false);
  scanner.render(code=>parseScan(code),()=>{});
  showMessage('Point your camera at the product barcode. If camera access fails, enter the digits below.');
 }catch(e){await stopScanner();showMessage('Camera unavailable: '+e.message+'. Type the barcode or use manual entry.');}
}
async function stopScanner(){
 const ref=scanner;scanner=null;
 if(ref)try{await ref.clear();}catch(e){}
 const el=document.getElementById('fd-scan-holder');
 if(el){el.hidden=true;el.innerHTML='';}
}
function dateUI(){
 return '<div class="fd-date"><button class="btn" aria-label="Previous day" onclick="fdAdjustDate(-1)">←</button><label for="fd-date">Diary date</label><input type="date" id="fd-date" value="'+selected+'" onchange="fdChangeDate(this.value)"><button class="btn" aria-label="Next day" onclick="fdAdjustDate(1)">→</button><button class="btn" onclick="fdChangeDate(\''+localDate(new Date())+'\')">Today</button></div>';
}
function bar(label,current,goalValue){
 const pct=Math.min(100,Math.max(0,(goalValue?current/goalValue:0)*100));
 return '<div class="fd-stat"><div class="row" style="justify-content:space-between"><span>'+label+'</span><b>'+f(current)+' / '+f(goalValue)+' g</b></div><div class="fd-meter"><div style="width:'+pct+'%"></div></div></div>';
}
function dashboard(forToday=false){
 const date=forToday?localDate(new Date()):selected,entries=diaryFor(date),n=grand(entries),calTarget=targetFor(date),remaining=calTarget-n.kcal,goalProtein=s.settings.prot;
 return '<div class="card fd-summary"><div class="row" style="flex-wrap:wrap;justify-content:space-between"><div><div class="eyebrow">'+(forToday?'TODAY’S ACTUAL INTAKE':'FOOD ACTUALLY EATEN')+'</div><h2 style="margin:6px 0">'+Math.round(n.kcal)+' kcal <span style="font-size:14px;font-weight:400;color:var(--muted)">/ '+calTarget+' kcal target</span></h2></div><div class="fd-remaining"><strong>'+Math.round(Math.abs(remaining))+' kcal</strong><small>'+(remaining>=0?'remaining':'over reference target')+'</small></div></div><div class="fd-meter big"><div style="width:'+Math.min(100,n.kcal/calTarget*100)+'%"></div></div><div class="fd-nutrients">'+bar('Protein',n.protein,goalProtein)+bar('Carbs',n.carbs,Math.max(1,Math.round(calTarget*.45/4)))+bar('Fat',n.fat,Math.max(1,Math.round(calTarget*.30/9)))+'</div><p class="short">Logged '+entries.length+' food item'+(entries.length===1?'':'s')+'. Targets are reference values; carbs and fat are illustrative splits, not individual prescriptions. Planned meals count only after you log them.</p></div>';
}
function planned(){
 const index=planIndex(selected);
 if(!index)return '<div class="card"><h3>Your planned meals</h3><p class="short">This date is outside your current 28-day plan. You can still log anything using the scanner or manual food entry. Adjust Gym & Workouts → Plan starts on Monday to align your plan with your diary dates.</p></div>';
 const row=days()[index-1];
 return '<div class="card"><div class="row" style="flex-wrap:wrap;justify-content:space-between"><div><div class="eyebrow">NOURISH 28-DAY PLAN • DAY '+index+'</div><h3 style="margin:6px 0">Mark planned meals as eaten</h3></div><span class="pill">'+(row.gym?'Gym day':'Rest day')+'</span></div><p class="short">Your meal schedule is a plan, not an intake record. Add each meal after eating. Actual portions can be adjusted before logging.</p>'+
 ['breakfast','lunch','dinner'].map((cat,i)=>{
  const id=row.ids[i],item=rs[id],macro=portion(id,row.gym).n;
  const already=diaryFor(selected).find(x=>x.category===cat&&x.source==='plan');
  return '<div class="fd-planned"><div><b>'+escape(cat[0].toUpperCase()+cat.slice(1))+': '+escape(item.name)+'</b><small>'+Math.round(macro.kcal)+' kcal · '+Math.round(macro.protein)+'g protein per planned portion</small></div><div class="fd-planned-actions"><label class="short">Portions<select id="fd-portions-'+cat+'" class="select">'+[0.5,1,1.5,2,3,4].map(v=>'<option value="'+v+'" '+(already?.quantity===v?'selected':!already&&v===1?'selected':'')+'>'+v+'</option>').join('')+'</select></label><button class="btn '+(already?'':'dark')+'" onclick="fdAddPlanned(\''+cat+'\',document.getElementById(\'fd-portions-'+cat+'\').value)">'+(already?'↻ Update log':'✓ I ate this')+'</button></div></div>';
 }).join('')+'</div>';
}
function logRows(){
 const all=diaryFor(selected);
 return '<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0">Your food log</h3><div class="actions"><span class="pill">'+all.length+' items</span><button class="btn sm" onclick="fdExport()">↓ Export CSV</button></div></div>'+
 (all.length?CATS.map(cat=>{
  const items=all.filter(x=>x.category===cat);if(!items.length)return '';
  return '<div class="fd-log-group"><h4>'+cat[0].toUpperCase()+cat.slice(1)+'</h4>'+items.map(item=>
   '<div class="fd-log"><div><b>'+escape(item.name)+'</b><small>'+f(item.quantity)+' '+escape(item.unit==='portion'?'portion(s)':item.unit)+' · '+escape(item.source==='plan'?'Nourish meal':item.source==='barcode'?'Scanned product':'Manual / saved food')+'</small><small>'+f(item.totals.protein)+'g protein · '+f(item.totals.carbs)+'g carbs · '+f(item.totals.fat)+'g fat</small></div><div class="fd-log-actions"><strong>'+Math.round(item.totals.kcal)+' kcal</strong><button class="btn sm" onclick="fdEditEntry(\''+item.id+'\')">Edit</button><button class="btn sm" onclick="fdDeleteEntry(\''+item.id+'\')">Delete</button></div></div>').join('')+'</div>';
 }).join(''):'<p class="short">Nothing logged yet. Tap “I ate this” on a planned meal or add any other food below.</p>')+'</div>';
}
function exportDiary(){
 const entries=cleanDiary().entries;
 if(!entries.length){alert('There are no foods to export yet.');return;}
 const quote=x=>{
  let v=String(x??'');
  if(/^[=+@-]/.test(v))v="'"+v;
  return '"'+v.replaceAll('"','""')+'"';
 };
 const keys=['date','category','name','source','barcode','quantity','unit','kcal','protein','carbs','fat','fibre'];
 const rows=[keys.join(',')].concat(entries.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>
  [x.date,x.category,x.name,x.source,x.barcode,x.quantity,x.unit,...NUT.map(k=>x.totals[k])].map(quote).join(',')
 ));
 download('nourish-food-diary.csv','\uFEFF'+rows.join('\r\n'),'text/csv;charset=utf-8');
 notify('Your food diary CSV was downloaded.');
}
function weekIntake(){
 const rows=[];
 for(let i=6;i>=0;i--){
  const date=plusDays(selected,-i),items=diaryFor(date),nut=grand(items),goal=targetFor(date);
  rows.push('<div class="fd-log"><span><b>'+date+'</b><small>'+items.length+' foods logged</small></span><span class="fd-week-numbers">'+(items.length?'<b>'+Math.round(nut.kcal)+' kcal</b><small>'+Math.round(nut.protein)+'g protein · '+goal+' kcal reference</small>':'<small>Not logged</small>')+'</span></div>');
 }
 return '<div class="card"><h3>Last seven days</h3><p class="short">Unlogged days are marked “Not logged”, never assumed to mean you ate zero calories.</p>'+rows.join('')+'</div>';
}
function saved(){
 const foods=cleanDiary().savedFoods;
 return foods.length?'<div class="card"><h3>My saved foods</h3><p class="short">Tap a favourite to fill the form and add it again.</p><div class="fd-saved">'+foods.slice(0,18).map(x=>'<button class="btn" onclick="fdUseSaved(\''+x.id+'\')">'+escape(x.name)+' · '+Math.round(x.perUnit.kcal)+' kcal/'+(x.unit==='portion'?'portion':'100'+x.unit)+'</button>').join('')+'</div></div>':'';
}
function inputPanel(){
 const d=draft||blankDraft();const input=(id,label,step,maximum)=>'<label>'+label+'<input id="fd-'+id+'" type="number" step="'+step+'" min="0" max="'+maximum+'" inputmode="decimal" value="'+(d.perUnit[id]??'')+'" placeholder="Enter label value"></label>';
 return '<div class="card" id="fd-entry"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><div><h3 style="margin:0">Add extra food</h3><p class="short">Snacks, drinks, takeaways, supplements or anything outside the plan.</p></div><button class="btn" onclick="fdBeginManual()">＋ New manual food</button></div>'+
 '<div class="fd-lookup"><button class="btn dark" onclick="fdOpenScanner()">▦ Scan barcode</button><label class="short" for="fd-lookup-code">Barcode digits</label><input id="fd-lookup-code" inputmode="numeric" pattern="[0-9]*" maxlength="14" placeholder="EAN/UPC barcode" aria-label="Barcode digits" value="'+escape(lastBarcode)+'"><button class="btn" onclick="fdLookup(document.getElementById(\'fd-lookup-code\').value)">Find product</button></div><div id="fd-scan-holder" hidden></div><p class="short" id="fd-message" role="status">'+escape(lookupMessage||"Scan or enter a barcode to look up a product. Barcode data comes from Open Food Facts; verify against the label.")+'</p>'+
 (draft?'<form onsubmit="event.preventDefault();fdSaveManual()"><div class="fd-inputs"><label class="fd-wide">Product / food name<input id="fd-name" maxlength="100" required value="'+escape(d.name)+'" placeholder="e.g. Chicken sandwich"></label><label>Meal<select id="fd-category">'+CATS.map(c=>'<option value="'+c+'" '+(d.category===c?'selected':'')+'>'+c[0].toUpperCase()+c.slice(1)+'</option>').join('')+'</select></label><label>Quantity eaten<input id="fd-quantity" required type="number" inputmode="decimal" min="0.1" max="5000" step="0.1" value="'+f(d.quantity)+'"></label><label>Unit<select id="fd-unit" onchange="fdUnitChanged(this.value)">'+['g','ml','portion'].map(u=>'<option value="'+u+'" '+(d.unit===u?'selected':'')+'>'+escape(u==='portion'?'Portions':u==='ml'?'Millilitres (ml)':'Grams (g)')+'</option>').join('')+'</select></label><label>Barcode (optional)<input id="fd-barcode" inputmode="numeric" maxlength="14" value="'+escape(d.barcode||'')+'" placeholder="Optional"></label></div><p class="short fd-base-label" id="fd-base-label">Nutritional values per '+(d.unit==='portion'?'one portion':'100 '+d.unit)+'. You can change values to match the package label.</p><div class="fd-inputs">'+input('kcal','Calories (kcal)',.1,5000)+input('protein','Protein (g)',.1,300)+input('carbs','Carbohydrates (g)',.1,500)+input('fat','Fat (g)',.1,300)+input('fibre','Fibre (g)',.1,200)+'</div><label class="fd-check"><input type="checkbox" id="fd-save-food" '+(d.saveFood?'checked':'')+'> Save food for next time</label><div class="actions"><button class="btn dark" type="submit">'+(editing?'Update diary entry':'Add to my diary')+'</button><button type="button" class="btn" onclick="fdCancelDraft()">Cancel</button></div></form>':'<p class="short">Scan or find a barcode to fill the nutrition values, or choose “New manual food” to enter values from the packaging.</p>')+'</div>';
}
function unitChanged(unit){
 const label=document.getElementById('fd-base-label');
 if(label)label.textContent='Nutritional values per '+(unit==='portion'?'one portion':'100 '+unit)+'. If changing units, update the label values too.';
}
function diaryPage(){
 return '<div class="sectionhead"><div><div class="eyebrow">NOURISH • FOOD DIARY 2.0</div><h2>What you actually ate</h2></div><span class="pill">Private to your account</span></div>'+
 '<p class="notice">Track real consumption alongside your planned meals. Nutrition and barcode information are estimates; verify the product label, especially allergies and serving sizes. Your daily reference target is not adjusted automatically for exercise calories.</p>'+dateUI()+dashboard()+planned()+'<div class="fd-columns"><div>'+logRows()+'</div><div>'+inputPanel()+saved()+'</div></div>'+weekIntake();
}
function dashboardCard(){
 const date=localDate(new Date()),entries=diaryFor(date),totals=grand(entries),target=targetFor(date);
 return '<div style="margin-bottom:16px">'+dashboard(true)+'</div><div class="actions" style="margin-bottom:16px"><button class="btn dark" onclick="navigate(\'diary\')">▦ Open today’s food diary →</button></div>';
}
const css=document.createElement('style');
css.textContent='.fd-date{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:14px 0}.fd-date input,.fd-inputs input,.fd-inputs select,.fd-lookup input{border:1px solid var(--line);background:#fff;color:var(--ink);padding:11px;border-radius:9px;font:inherit;min-width:0;max-width:100%;font-size:16px}.fd-date label{font-weight:700}.fd-summary{margin-bottom:16px}.fd-remaining{text-align:right}.fd-remaining strong{display:block;font-size:19px}.fd-remaining small{color:var(--muted)}.fd-meter{height:7px;overflow:hidden;background:#e3eae4;border-radius:99px;margin:7px 0}.fd-meter.big{height:12px;margin:16px 0}.fd-meter>div{height:100%;background:#34795c;border-radius:99px}.fd-nutrients{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.fd-stat{font-size:12px}.fd-stat .row{gap:4px;flex-wrap:wrap}.fd-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;align-items:start}.fd-columns .card{margin-bottom:16px}.fd-planned{border-top:1px solid var(--line);padding:14px 0;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}.fd-planned small,.fd-log small{display:block;font-size:12px;color:var(--muted);margin-top:4px}.fd-planned-actions{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.fd-planned-actions select{display:block;margin-top:3px}.fd-log-group{border-top:1px solid var(--line);margin-top:16px}.fd-log-group h4{margin:13px 0 6px}.fd-log{padding:10px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:start}.fd-log-actions{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.fd-log-actions strong{white-space:nowrap}.fd-lookup{display:flex;flex-wrap:wrap;gap:9px;align-items:end;margin:15px 0}.fd-lookup label{width:100%}.fd-lookup input{flex:1;min-width:120px}.fd-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.fd-inputs label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;min-width:0}.fd-inputs .fd-wide{grid-column:1/-1}.fd-check{display:flex;gap:9px;align-items:center;margin:15px 0}.fd-check input{width:20px;height:20px;accent-color:var(--green)}.fd-saved{display:flex;flex-wrap:wrap;gap:8px}.fd-saved .btn{text-align:left;white-space:normal}#fd-scan-holder{margin:12px 0;max-width:100%;overflow:hidden}#fd-scan-holder video{max-width:100%}@media(max-width:850px){.fd-columns{grid-template-columns:1fr}}@media(max-width:540px){.fd-nutrients{grid-template-columns:1fr}.fd-inputs{grid-template-columns:1fr}.fd-remaining{text-align:left}.fd-planned-actions{width:100%}}';
css.textContent+='.fd-week-numbers{text-align:right}.fd-week-numbers small{display:block;color:var(--muted)}';document.head.append(css);
window.nourishFoodDiaryPage=diaryPage;
window.nourishFoodDashboard=dashboardCard;
window.nourishFoodTodaySummary=()=>({date:localDate(new Date()),totals:grand(diaryFor(localDate(new Date()))),target:targetFor(localDate(new Date()))});
window.fdChangeDate=changeDate;window.fdAdjustDate=adjustDate;window.fdAddPlanned=addPlanned;
window.fdDeleteEntry=deleteEntry;window.fdEditEntry=editEntry;window.fdUseSaved=useSaved;
window.fdBeginManual=beginManual;window.fdCancelDraft=cancelDraft;window.fdSaveManual=saveManual;
window.fdLookup=lookup;window.fdExport=exportDiary;window.fdOpenScanner=openScanner;window.fdStopScanner=stopScanner;window.fdUnitChanged=unitChanged;
window.nourishFoodCleanup=stopScanner;
if(s.tab==='diary'||s.tab==='overview')renderCurrent();
})();