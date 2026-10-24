/* Nourish Food Diary 2.0 — food consumed, separate from the meal plan. */
(function(){
'use strict';
const NUT=['kcal','protein','carbs','fat','fibre'];
const CATS=['breakfast','lunch','dinner','snack'];
const Z=()=>({kcal:0,protein:0,carbs:0,fat:0,fibre:0});
const f=n=>Number.isFinite(+n)?Math.round(+n*10)/10:0;
const amountLabel={g:'g',ml:'ml',portion:'portion'};
const localDate=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
let selected=localDate(new Date()),draft=null,editing='',scanner=null,scannerBusy=false,scannerLoading=null,lookupBusy=false,lookupMessage='',lastBarcode='',lookupToken=0,lookupController=null;
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
 if(prior&&prior.recipeId===id&&Number(prior.quantity)===n){
  notify('This planned '+cat+' is already logged at the same portion size. Nothing was added.');return;
 }
 if(prior&&!confirm('Update your existing '+cat+' log with this planned meal and portion amount?'))return;
 const foodData=portion(id,row.gym).n;
 const entry={id:prior?.id||uid(),date:selected,category:cat,source:'plan',name:recipe.name,recipeId:id,barcode:'',unit:'portion',quantity:n,perUnit:copyN(foodData),totals:total('portion',n,foodData)};
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
 editing=id;
 // Keep unknown fields blank while preparing the editable form.
 // Previously copyN() coerced them to zero, making incomplete food labels appear complete.
 const values={};
 for(const key of NUT){
  const v=food.perUnit?.[key];
  values[key]=food.missingNutrients?.includes(key)||v===undefined||v===null||v===''?'':f(v);
 }
 draft={...blankDraft(),...food,perUnit:values};
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

// Name-based choices, NOT barcode matches. Values from Tesco product listings (per 100 g drained).
const RETAIL_CHOICES=[
 {name:'Tesco Tuna Chunks in Spring Water 145g',drained:102,n:{kcal:109,protein:24.9,carbs:0,fat:1,fibre:0},url:'https://www.tesco.com/shop/en-GB/products/303887546'},
 {name:'Tesco Tuna Chunks in Brine 145g',drained:102,n:{kcal:109,protein:24.9,carbs:0,fat:1,fibre:0},url:'https://www.tesco.com/shop/en-GB/products/303887523'},
 {name:'Tesco Tuna Chunks in Sunflower Oil 145g',drained:102,n:{kcal:159,protein:25.4,carbs:0,fat:6.4,fibre:0},url:'https://www.tesco.com/shop/en-GB/products/303882199'},
 {name:'Tesco Tuna Chunks in Spring Water 160g',drained:112,n:{kcal:109,protein:24.9,carbs:0,fat:1,fibre:0},url:'https://www.tesco.com/shop/en-GB/products/283723368'},
 {name:'Tesco Tuna Chunks in Brine 160g',drained:112,n:{kcal:109,protein:24.9,carbs:0,fat:1,fibre:0},url:'https://www.tesco.com/shop/en-GB/products/283715919'},
 {name:'Tesco Tuna Chunks in Spring Water 400g',drained:280,n:{kcal:109,protein:24.9,carbs:0,fat:1,fibre:0},url:'https://www.tesco.com/shop/en-GB/products/310092502'}
];
let foodSearchQuery='',searchProducts=[],foodSearchMessage='',foodSearchBusy=false,foodSearchController=null,foodSearchToken=0;
let privateFoodQuery='',lastQuickLog={key:'',time:0},lastManualSubmission={key:'',time:0};
function suggestionsHTML(){
 const query=foodSearchQuery.toLowerCase().trim();
 if(query.length<2)return '<p class="short">Enter at least two letters (for example “Tesco tuna”) to find foods by name, even when a barcode is missing.</p>';
 const words=query.split(/\s+/).filter(Boolean);
 const catalog=RETAIL_CHOICES.map((p,i)=>({...p,index:i})).filter(p=>words.every(w=>p.name.toLowerCase().includes(w)));
 const entries=catalog.map(p=>
  '<div class="fd-choose-result"><div><b>'+escape(p.name)+'</b><small>'+p.n.kcal+' kcal · '+p.n.protein+'g protein per 100g drained · '+p.drained+'g drained per tin</small><small>Official Tesco product information · <a href="'+p.url+'" target="_blank" rel="noopener noreferrer">Check Tesco listing ↗</a></small></div><button type="button" class="btn sm dark" onclick="fdChooseVerified('+p.index+')">Choose</button></div>'
 );
 for(const [i,p] of searchProducts.entries()){
  const name=p.product_name_en||p.product_name||'Unnamed product',brand=p.brands||'';
  const x=parseProduct(p,String(p.code||''));
  entries.push('<div class="fd-choose-result"><div><b>'+escape(name)+'</b><small>'+escape(brand)+' · '+(x.perUnit.kcal===''?'No calories listed':x.perUnit.kcal+' kcal per 100g')+' · '+escape(String(p.quantity||''))+'</small><small>Open Food Facts search result · verify it matches your packaging</small></div><button type="button" class="btn sm" onclick="fdChooseSearch('+i+')">Choose</button></div>');
 }
 return (catalog.length?'<p class="short">Tesco-listed products (nutrition confirmed by retailer, barcode not confirmed):</p>':'')+
   (entries.length?entries.join(''):'<p class="short">No matching products available here yet. Try different words or enter the packaging values below.</p>')+
   '<p class="short" role="status">'+escape(foodSearchMessage)+'</p>';
}
function searchTyping(q){
 foodSearchToken++;foodSearchController?.abort();
 foodSearchQuery=String(q||'').slice(0,80);
 searchProducts=[];foodSearchMessage='';
 const target=document.getElementById('fd-search-results');if(target)target.innerHTML=suggestionsHTML();
}
async function searchFoodNames(){
 const query=foodSearchQuery.trim();if(query.length<2){foodSearchMessage='Enter at least two letters.';renderSearchResults();return}
 if(searchFoodNames.pending)return;
 searchFoodNames.pending=true;const token=++foodSearchToken;foodSearchMessage='Searching the wider Open Food Facts catalogue…';renderSearchResults();
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);foodSearchController=abort;
 try{
  // Open Food Facts v1 supports full-text queries; its v2 search endpoint does not.
  const url='https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=12&fields=code,product_name,product_name_en,brands,quantity,nutriments&search_terms='+encodeURIComponent(query);
  const res=await fetch(url,{signal:abort.signal,headers:{Accept:'application/json'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json();
  if(token!==foodSearchToken||query!==foodSearchQuery.trim())return;
  searchProducts=Array.isArray(data.products)?data.products.filter(p=>p&&typeof p==='object'&&String(p.product_name||p.product_name_en||'').trim()).slice(0,12):[];
  foodSearchMessage=searchProducts.length?searchProducts.length+' additional community products found.':'No additional community products found for these words.';
 }catch(e){
  if(token===foodSearchToken)foodSearchMessage='Wider search unavailable ('+(e.name==='AbortError'?'timed out':e.message)+'). Verified Tesco choices above still work.';
 }finally{
  clearTimeout(timer);searchFoodNames.pending=false;foodSearchController=null;
  if(token===foodSearchToken)renderSearchResults();
 }
}
function renderSearchResults(){
 const el=document.getElementById('fd-search-results');
 if(el)el.innerHTML=suggestionsHTML();
}
function chooseVerified(i){
 const p=RETAIL_CHOICES[i];if(!p)return;
 const code=lastBarcode||'';
 draft={...blankDraft(),name:p.name,barcode:code,unit:'g',quantity:p.drained,category:'snack',perUnit:{...p.n},saveFood:true,lookupSource:'retailer-choice'};
 editing='';renderCurrent();
 showMessage('Selected by product name from Tesco: '+p.name+'. This barcode has NOT been verified as belonging to that listing. Check the tin size, spring water/brine/oil and nutrition label before saving. Your choice will be remembered privately for future scans.');
 document.getElementById('fd-entry')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function chooseSearch(i){
 const p=searchProducts[i];if(!p)return;
 const source=String(p.code||'');
 draft={...parseProduct(p,lastBarcode||source),lookupSource:'name-choice'};
 editing='';renderCurrent();
 showMessage('Selected a similar product by name, NOT a confirmed barcode match. Check the brand, variety, size and nutrition label before saving. This may differ from your tin.');
 document.getElementById('fd-entry')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function foodSearchUI(){
 return '<div class="fd-search-panel" id="fd-search-panel"><h4 style="margin:0 0 6px">Find food by name</h4><p class="short">Missing barcode? Search names instead. Our starter Tesco choices use published retailer nutrition; broader results come from Open Food Facts. Confirm the exact type and drained weight.</p>'+
  '<div class="fd-lookup"><input id="fd-food-query" type="search" aria-label="Food name search" enterkeyhint="search" autocomplete="off" placeholder="e.g. Tesco tuna" maxlength="80" value="'+escape(foodSearchQuery)+'" oninput="fdSearchTyping(this.value)" onkeydown="fdFoodSearchKey(event)"><button class="btn" type="button" onclick="fdSearchNames()">Search more foods</button></div>'+
  '<div id="fd-search-results">'+suggestionsHTML()+'</div></div>';
}

function barcodeVariants(code){
 const normalized=String(code||'').replace(/\s/g,'');
 if(!/^\d{8,14}$/.test(normalized))return [];
 // UPC-A and EAN-13 are sometimes represented with/without a single leading zero.
 return normalized.length===12?[normalized,'0'+normalized]:[normalized];
}
function nutritionCoverage(product){
 const n=product?.nutriments||{};
 const keys=['energy-kcal_100g','proteins_100g','carbohydrates_100g','fat_100g','fiber_100g'];
 return keys.reduce((score,k)=>score+(n[k]!==null&&n[k]!==undefined&&n[k]!==''&&Number.isFinite(Number(n[k]))&&Number(n[k])>=0?1:0),0);
}
function sameBarcode(a,b){
 const x=String(a||''),y=String(b||'');
 return /^\d{8,14}$/.test(x)&&/^\d{8,14}$/.test(y)&&x.replace(/^0+(?=\d)/,'')===y.replace(/^0+(?=\d)/,'');
}
function savedBarcode(code){
 return cleanDiary().savedFoods.find(item=>sameBarcode(item.barcode,code));
}
function upsertSaved(data){
 const diary=cleanDiary();
 const key=data.barcode?diary.savedFoods.findIndex(x=>sameBarcode(x.barcode,data.barcode)):diary.savedFoods.findIndex(x=>x.name.toLowerCase()===data.name.toLowerCase()&&!x.barcode);
 const item={id:key>=0?diary.savedFoods[key].id:uid(),name:data.name,barcode:data.barcode||'',unit:data.unit,category:data.category,perUnit:data.perUnit,lastQuantity:data.quantity,missingNutrients:Array.isArray(data.missingNutrients)?data.missingNutrients.filter(k=>NUT.includes(k)):[],favorite:key>=0&&diary.savedFoods[key].favorite===true};
 if(key>=0)diary.savedFoods.splice(key,1);diary.savedFoods.unshift(item);
 diary.savedFoods=diary.savedFoods.slice(0,80);s.foodDiary=diary;
}
/* FORGE v56: an intentional second serving requires explicit confirmation for
   identical same-day barcode, quantity and meal. No automatic dedup deletions. */
function fd56SameFood(a,b){
 return !!(a.barcode&&b?.barcode&&sameBarcode(a.barcode,b.barcode)&&a.date===b.date&&
  a.category===b.category&&a.unit===b.unit&&Number(a.quantity)===Number(b.quantity));
}
function fd56Duplicate(entries,entry,excludeId=''){
 return entries.some(old=>old.id!==excludeId&&fd56SameFood(entry,old));
}
function fd56Repeat(id){
 const diary=cleanDiary(),old=diary.entries.find(e=>e.id===id);
 if(!old)return false;
 const now=Date.now(),key=selected+'|entry:'+id;
 if(lastQuickLog.key===key&&now-lastQuickLog.time<1000)return false;
 const entry={...old,id:uid(),date:selected,missingNutrients:[...(old.missingNutrients||[])],perUnit:copyN(old.perUnit),totals:total(old.unit,old.quantity,old.perUnit)};
 if(fd56Duplicate(diary.entries,entry)&&!confirm('That barcode, quantity and meal are already logged on this date. Log another serving anyway?'))return false;
 lastQuickLog={key,time:now};
 diary.entries.push(entry);diary.entries=diary.entries.slice(-1200);
 s.foodDiary=diary;save();renderCurrent();notify(entry.name+' logged again.');return true;
}
function fd56ToggleFavorite(key){
 const selectedFood=libraryPick(key);if(!selectedFood)return false;
 let diary=cleanDiary();
 const findIndex=items=>items.findIndex(x=>x.id===selectedFood.id||
  (selectedFood.barcode&&sameBarcode(x.barcode,selectedFood.barcode))||
  (!selectedFood.barcode&&!x.barcode&&x.name.toLowerCase()===selectedFood.name.toLowerCase()&&x.unit===selectedFood.unit));
 let index=findIndex(diary.savedFoods);
 if(index<0){
  // Favourite from recent history: create a saved-food record, then use
  // the new validated object so it survives cloud sync and backups.
  upsertSaved({...selectedFood,quantity:selectedFood.quantity});
  diary=cleanDiary();index=findIndex(diary.savedFoods);
  if(index<0)return false;
  diary.savedFoods[index].favorite=true;
 }else diary.savedFoods[index].favorite=diary.savedFoods[index].favorite!==true;
 const nowFavorite=diary.savedFoods[index].favorite===true;
 s.foodDiary=diary;save();renderCurrent();
 notify(nowFavorite?'Added to your favourite foods.':'Removed from favourites.');return true;
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
 if(incomplete.length&&!confirm('Missing nutrition values: '+incomplete.join(', ')+'. FORGE will retain an unknown-field warning; displayed totals remain partial estimates until corrected. Save anyway?'))return;
 const computed=perUnit.protein*4+perUnit.carbs*4+perUnit.fat*9;
 const discrepancy=Math.abs(perUnit.kcal-computed);
 if(!incomplete.some(k=>['protein','carbs','fat'].includes(k))&&
    discrepancy>Math.max(25,perUnit.kcal*.2)&&
    !confirm('Nutrition cross-check: protein, carbs and fat suggest approximately '+f(computed)+
       ' kcal per label unit, but the label calories say '+perUnit.kcal+
       ' kcal. Fibre, rounding and other nutrients can cause differences. Have you checked the packaging and want to save anyway?'))return;
 const diary=cleanDiary(),old=diary.entries.find(x=>x.id===editing);
 const isPlanned=old?.source==='plan'&&unit==='portion'&&cat===old.category;
 const source=isPlanned?'plan':code?'barcode':'manual';
 const entry={id:old?.id||uid(),date:selected,category:cat,source,name,barcode:code,unit,quantity:f(quantity),perUnit,missingNutrients:incomplete,totals:total(unit,quantity,perUnit)};
 if(isPlanned&&old.recipeId)entry.recipeId=old.recipeId;
 const signature=selected+'|'+cat+'|'+code+'|'+f(quantity)+'|'+unit+'|'+name.toLowerCase();
 const now=Date.now();
 if(!editing&&lastManualSubmission.key===signature&&now-lastManualSubmission.time<1200)return;
 if(fd56Duplicate(diary.entries,entry,editing)&&!confirm('That barcode, quantity and meal are already logged on this date. Add another serving anyway?'))return;
 if(old)diary.entries=diary.entries.filter(x=>x.id!==old.id);
 diary.entries.push(entry);
 lastManualSubmission={key:signature,time:now};diary.entries=diary.entries.slice(-1200);
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
 return {...blankDraft(),name,barcode:code,unit,perUnit,missing,lookupSource:'community'};
}
async function lookup(code){
 const normalized=String(code||'').replace(/\s/g,'');
 if(!/^\d{8,14}$/.test(normalized)){showMessage('Enter a valid 8–14 digit barcode or use manual food entry.');return;}
 if(lookupBusy){showMessage('The previous lookup is still running. Please try again once it finishes.');return;}
 lookupBusy=true;lastBarcode=normalized;const token=++lookupToken;
 const mine=savedBarcode(normalized);
 if(mine){
  lookupBusy=false;
  draft={...blankDraft(),...mine,barcode:normalized,quantity:mine.lastQuantity||100,perUnit:{...mine.perUnit},saveFood:true,lookupSource:'personal'};editing='';
  renderCurrent();showMessage('Found in My saved foods: '+mine.name+'. These are the label values you previously saved. Review the amount eaten, then add to your diary.');
  document.getElementById('fd-entry')?.scrollIntoView({behavior:'smooth',block:'start'});
  return;
 }
 // Retain the scanned code in a usable food form even if the external API is offline.
 draft={...blankDraft(),barcode:normalized};editing='';
 renderCurrent();showMessage('Barcode '+normalized+' captured. Looking for the product and nutritional values…');
 let failure=null,notFound=false;
 const abort=new AbortController();lookupController=abort;
 const timer=setTimeout(()=>abort.abort(),14000);
 try{
  const fields='code,product_name,product_name_en,generic_name,brands,quantity,nutriments';
  // Prioritise v3. A v2 read is used only when the first record is absent or
  // short of key nutrition fields. UPC-A also has a safe, zero-padded GTIN alias.
  let product=null,matchedCode=normalized;
  for(const candidate of barcodeVariants(normalized)){
   for(const version of [3,2]){
    if(abort.signal.aborted)break;
    try{
     const url='https://world.openfoodfacts.org/api/v'+version+'/product/'+candidate+'.json?fields='+fields;
     const res=await fetch(url,{signal:abort.signal,headers:{Accept:'application/json'}});
     if(res.status===429)throw Error('The food database is temporarily limiting requests (429).');
     if(!res.ok){if(res.status===404){notFound=true;continue;}throw Error('Food database returned HTTP '+res.status+'.');}
     const data=await res.json();
     const found=!!data?.product&&(data.status===1||data.status==='success'||data.status==='success_with_warnings'||data.result?.id==='product_found');
     if(!found){notFound=true;continue;}
     const returned=String(data.product.code||data.code||'').trim();
     // A valid endpoint response isn't enough: reject another product's code.
     if(returned&&!sameBarcode(returned,normalized)){failure=Error('Returned barcode does not match the scanned number.');notFound=true;continue;}
     const candidateProduct=data.product;
     if(!product||nutritionCoverage(candidateProduct)>nutritionCoverage(product)){
      product=candidateProduct;matchedCode=candidate;
     }
     // Complete nutrient records need no extra request. Never merge fields
     // from different products — report gaps and let the user verify the label.
     if(nutritionCoverage(product)===5)break;
    }catch(e){failure=e;if(abort.signal.aborted)break;}
   }
   if(product||abort.signal.aborted)break;
  }
  if(token!==lookupToken)return;
  if(!product){
   if(normalized==='966340011833'){
    foodSearchQuery='tesco tuna';foodSearchMessage='You identified this barcode as Tesco tuna. Choose the exact tin variety and size below — the barcode itself has not been verified.';
    renderCurrent();
    document.getElementById('fd-search-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
   }
   const detail=abort.signal.aborted?'The lookup timed out.':failure?.message==='Returned barcode does not match the scanned number.'?'Product data did not match the scanned barcode.':notFound?'No matching product was found in the database.':(failure?.message==='Failed to fetch'?'The food database could not be reached from this browser.':failure?.message||'The product database could not be reached.');
   showMessage('Barcode '+normalized+' saved. '+detail+' Try Find food by name below and choose an exact matching product, or enter label values.');
   return;
  }
  draft={...parseProduct(product,normalized),barcodeMatch:sameBarcode(String(product.code||''),normalized)};editing='';
  renderCurrent();
  const missing=draft.missing||[];
  const alias=matchedCode!==normalized?' UPC/EAN representation matched.':'';
  showMessage(!missing.length?
   'Found '+draft.name+' in Open Food Facts.'+alias+' Review the package label and amount eaten before saving.':
   'Found '+draft.name+' in Open Food Facts.'+alias+' Missing '+missing.join(', ')+'. These are unknown, NOT zero — enter the correct label values before saving.');
  document.getElementById('fd-entry')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){
  if(token===lookupToken)showMessage('Barcode '+normalized+' captured but the lookup failed ('+(e?.message||'connection error')+'). You can enter the nutrition label below.');
 }finally{clearTimeout(timer);if(token===lookupToken){lookupBusy=false;lookupController=null;}}
}
async function testFoodDatabase(){
 if(lookupBusy){showMessage('A barcode lookup is already running. Try the test afterwards.');return;}
 showMessage('Testing the public food database using a known example barcode…');
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
 try{
  const res=await fetch('https://world.openfoodfacts.org/api/v3/product/3017624010701.json?fields=product_name,nutriments',
   {signal:abort.signal,headers:{Accept:'application/json'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json();
  if(!data?.product||!['success','success_with_warnings','success_with_errors'].includes(data.status))
   throw Error('The example product could not be retrieved.');
  const info=parseProduct(data.product,'3017624010701');
  if(info.perUnit.kcal==='')throw Error('The example has no calorie value.');
  showMessage('Database connection works: '+info.name+' ('+info.perUnit.kcal+' kcal/100g). If your barcode still has no nutrition, its product record may be missing. Save the label values privately to recognise it next time.');
 }catch(e){
  showMessage('Database test failed ('+(e.name==='AbortError'?'timed out':e.message)+'). This points to a food-API or network access issue on this device.');
 }finally{clearTimeout(timer)}
}
function showMessage(msg){
 lookupMessage=String(msg||'').slice(0,600);
 const el=document.getElementById('fd-message');if(el){el.textContent=lookupMessage;el.setAttribute('role','status');}
}
function beginManual(){fillDraft(blankDraft());}
function lookupKey(event,value){
 if(event?.key!=='Enter')return false;
 event.preventDefault?.();
 void lookup(value);
 return true;
}
function foodSearchKey(event){
 if(event?.key!=='Enter')return false;
 event.preventDefault?.();
 void searchFoodNames();
 return true;
}
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
function resetDiaryUI(){
 privateFoodQuery='';lastQuickLog={key:'',time:0};
 lookupToken++;lookupController?.abort();lookupController=null;lookupBusy=false;
 foodSearchToken++;foodSearchController?.abort();foodSearchController=null;searchFoodNames.pending=false;
 foodSearchQuery='';searchProducts=[];foodSearchMessage='';
 draft=null;editing='';lastBarcode='';lookupMessage='';scannerBusy=false;
 void stopScanner().catch(()=>{});
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
 return '<div class="card fd-summary">'+(entries.some(x=>x.missingNutrients?.length)?'<p class="fd57-unknown">Partial nutrition totals: some foods have unknown nutrients. Missing values are not confirmed zeros.</p>':'')+'<div class="row" style="flex-wrap:wrap;justify-content:space-between"><div><div class="eyebrow">'+(forToday?'TODAY’S ACTUAL INTAKE':'FOOD ACTUALLY EATEN')+'</div><h2 style="margin:6px 0">'+Math.round(n.kcal)+' kcal <span style="font-size:14px;font-weight:400;color:var(--muted)">/ '+calTarget+' kcal target</span></h2></div><div class="fd-remaining"><strong>'+Math.round(Math.abs(remaining))+' kcal</strong><small>'+(remaining>=0?'remaining':'over reference target')+'</small></div></div><div class="fd-meter big"><div style="width:'+Math.min(100,n.kcal/calTarget*100)+'%"></div></div><div class="fd-nutrients">'+bar('Protein',n.protein,goalProtein)+bar('Carbs',n.carbs,Math.max(1,Math.round(calTarget*.45/4)))+bar('Fat',n.fat,Math.max(1,Math.round(calTarget*.30/9)))+'</div><p class="short">Logged '+entries.length+' food item'+(entries.length===1?'':'s')+'. Targets are reference values; carbs and fat are illustrative splits, not individual prescriptions. Planned meals count only after you log them.</p></div>';
}
function planned(){
 const index=planIndex(selected);
 if(!index)return '<div class="card"><h3>Your planned meals</h3><p class="short">This date is outside your current 28-day plan. You can still log anything using the scanner or manual food entry. Adjust Gym & Workouts → Plan starts on Monday to align your plan with your diary dates.</p></div>';
 const row=days()[index-1];
 return '<div class="card"><div class="row" style="flex-wrap:wrap;justify-content:space-between"><div><div class="eyebrow">FORGE · 28-DAY MEAL PLAN • DAY '+index+'</div><h3 style="margin:6px 0">Mark planned meals as eaten</h3></div><span class="pill">'+(row.gym?'Gym day':'Rest day')+'</span></div><p class="short">Your meal schedule is a plan, not an intake record. Add each meal after eating. Actual portions can be adjusted before logging.</p>'+
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
   '<div class="fd-log"><div><b>'+escape(item.name)+'</b><small>'+f(item.quantity)+' '+escape(item.unit==='portion'?'portion(s)':item.unit)+' · '+escape(item.source==='plan'?'Planned meal':item.source==='barcode'?'Scanned product':'Manual / saved food')+'</small><small>'+f(item.totals.protein)+'g protein · '+f(item.totals.carbs)+'g carbs · '+f(item.totals.fat)+'g fat</small>'+(item.missingNutrients?.length?
  '<small class="fd57-unknown">Partial estimate · missing '+escape(item.missingNutrients.join(', '))+' (unknown, not zero)</small>':
  '')+'</div><div class="fd-log-actions"><strong>'+Math.round(item.totals.kcal)+' kcal</strong><button class="btn sm" onclick="fdEditEntry(\''+item.id+'\')">Edit</button><button class="btn sm" onclick="fdRepeatEntry(\''+item.id+'\')">↻ Repeat</button><button class="btn sm" onclick="fdDeleteEntry(\''+item.id+'\')">Delete</button></div></div>').join('')+'</div>';
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
 download('forge-food-diary.csv','\uFEFF'+rows.join('\r\n'),'text/csv;charset=utf-8');
 notify('Your food diary CSV was downloaded.');
}
function weekIntake(){
 const rows=[];
 for(let i=6;i>=0;i--){
  const date=plusDays(selected,-i),items=diaryFor(date),nut=grand(items),goal=targetFor(date);
  rows.push('<div class="fd-log"><span><b>'+date+'</b><small>'+items.length+' foods logged'+(items.some(x=>x.missingNutrients?.length)?' · partial nutrient totals':'')+'</small></span><span class="fd-week-numbers">'+(items.length?'<b>'+Math.round(nut.kcal)+' kcal</b><small>'+Math.round(nut.protein)+'g protein · '+goal+' kcal reference</small>':'<small>Not logged</small>')+'</span></div>');
 }
 return '<div class="card"><h3>Last seven days</h3><p class="short">Unlogged days are marked “Not logged”, never assumed to mean you ate zero calories.</p>'+rows.join('')+'</div>';
}

/* Quick Log: private library from validated saved foods and actual logged meals.
   Never includes planned-but-uneaten recipes or other user accounts. */
function libraryCandidates(){
 const d=cleanDiary(),map=new Map();
 const add=(food,saved=false)=>{
  if(!food||food.source==='plan'||!food.name||!['g','ml','portion'].includes(food.unit))return;
  const key=(food.barcode?'barcode:'+food.barcode.replace(/^0+(?=\d)/,''):'name:'+food.name.toLocaleLowerCase('en-GB'))+'|'+food.unit;
  const previous=map.get(key);
  if(previous){if(saved&&!previous.saved){map.set(key,{...food,saved:true});}return;}
  const amount=Number(food.lastQuantity??food.quantity??100);
  if(!Number.isFinite(amount)||amount<=0||amount>5000)return;
  map.set(key,{...food,key,quantity:amount,saved});
 };
 // Most recently saved foods are first; recent logged items may supplement them.
 for(const food of d.savedFoods.slice(0,80))add(food,true);
 for(const food of d.entries.slice().reverse().slice(0,160)){
  if(food.source==='plan')continue;
  add(food,false);
 }
 return [...map.values()].sort((a,b)=>Number(b.favorite===true)-Number(a.favorite===true)).slice(0,80);
}
function libraryResults(query=privateFoodQuery){
 const q=String(query||'').toLocaleLowerCase('en-GB').trim().slice(0,80);
 const words=q.split(/\s+/).filter(Boolean);
 return libraryCandidates().filter(f=>words.every(word=>(f.name+' '+(f.barcode||'')).toLocaleLowerCase('en-GB').includes(word))).slice(0,25);
}
function libraryHTML(){
 const all=libraryCandidates(),items=libraryResults();
 const rows=items.map(x=>{
  const unitLabel=x.unit==='portion'?'portion':'100 '+x.unit;
  const serving=f(x.quantity);
  const amount=x.unit==='portion'?serving+' portion(s)':serving+' '+x.unit;
  const nutrition=total(x.unit,x.quantity,x.perUnit);
  const key=escape(x.key);
  return '<div class="fd44-library-item"><div><b>'+escape(x.name)+'</b>'+
    '<small>'+escape(amount)+' · '+fmtQuick(nutrition.kcal)+' kcal · '+fmtQuick(nutrition.protein)+'g protein'+(x.missingNutrients?.length?' · incomplete label':'')+'</small>'+
    '<small>'+(x.favorite?'★ Favourite · ':'')+(x.saved?'Saved food':'Recent food')+' · Label data per '+unitLabel+'</small></div>'+
    '<div class="fd44-library-actions"><button type="button" class="btn sm fd56-favorite" data-fd56-fav="'+key+'" aria-pressed="'+(x.favorite===true)+'" aria-label="'+(x.favorite?'Remove from favourites: ':'Add to favourites: ')+escape(x.name)+'">'+(x.favorite?'★ Favourited':'☆ Favourite')+'</button><button type="button" class="btn sm" data-fd44-edit="'+key+'">Edit amount</button>'+
    '<button type="button" class="btn sm dark" data-fd44-log="'+key+'">＋ Log again</button></div></div>';
 }).join('');
 return '<section class="card fd44-library" aria-label="Personal food library"><div class="fd44-library-head"><div><small>QUICK LOG</small><h3>My food library</h3></div><span>'+all.length+' foods</span></div>'+
 '<p class="short">Find your own saved or previously eaten foods, then log the same portion again. You can edit the new diary entry afterwards. No food is added until you tap Log again.</p>'+
 '<input id="fd44-private-search" aria-label="Search my food library" type="search" maxlength="80" placeholder="Search a food or barcode…" value="'+escape(privateFoodQuery)+'" oninput="fdPrivateSearch(this.value)">'+
 '<div id="fd44-private-results" aria-live="polite">'+(rows||'<p class="short">'+(all.length?'No foods match that search.':'Log your first food or save a product to build this library.')+'</p>')+'</div></section>';
}
const fmtQuick=n=>Math.round(Number(n||0)).toLocaleString('en-GB');
function privateSearch(q){
 privateFoodQuery=String(q||'').slice(0,80);
 const old=document.getElementById('fd44-private-results');
 if(!old)return;
 const current=document.activeElement;
 const search=document.getElementById('fd44-private-search');
 if(search&&current!==search)search.value=privateFoodQuery;
 const panel=libraryHTML(),start=panel.indexOf('<div id="fd44-private-results" aria-live="polite">'),end=panel.lastIndexOf('</div></section>');
 if(start>=0&&end>=0)old.innerHTML=panel.slice(start+'<div id="fd44-private-results" aria-live="polite">'.length,end);
}
function libraryPick(key){
 return libraryCandidates().find(x=>x.key===key);
}
function quickRepeat(key){
 const x=libraryPick(key);
 if(!x)return false;
 const now=Date.now();
 if(lastQuickLog.key===key&&now-lastQuickLog.time<1000)return false;
 const entry={id:uid(),date:selected,category:CATS.includes(x.category)?x.category:'snack',
  source:'manual',name:x.name,barcode:x.barcode||'',unit:x.unit,quantity:f(x.quantity),
  perUnit:copyN(x.perUnit),missingNutrients:[...(x.missingNutrients||[])],totals:total(x.unit,x.quantity,x.perUnit)};
 const diary=cleanDiary();
 if(fd56Duplicate(diary.entries,entry)&&!confirm('That barcode, quantity and meal are already logged on this date. Add another serving anyway?'))return false;
 lastQuickLog={key,time:now};
 diary.entries.push(entry);diary.entries=diary.entries.slice(-1200);
 s.foodDiary=diary;save();renderCurrent();notify(x.name+' logged — '+fmtQuick(entry.totals.kcal)+' kcal.');
 return true;
}
function quickEdit(key){
 const x=libraryPick(key);if(!x)return false;
 fillDraft({name:x.name,barcode:x.barcode||'',unit:x.unit,quantity:x.quantity,category:x.category||'snack',perUnit:x.perUnit,saveFood:true});
 return true;
}

function saved(){return libraryHTML()}

function draftReview(d){
 const source=d.lookupSource==='community'?'COMMUNITY PRODUCT LOOKUP':
  d.lookupSource==='personal'?'YOUR SAVED LABEL VALUES':
  d.lookupSource==='retailer-choice'?'SELECTED BY PRODUCT NAME — BARCODE NOT VERIFIED':
  d.lookupSource==='name-choice'?'COMMUNITY NAME SEARCH — BARCODE NOT VERIFIED':
  'MANUAL LABEL ENTRY';
 const missing=NUT.filter(k=>d.perUnit?.[k]===null||d.perUnit?.[k]===undefined||d.perUnit?.[k]==='');
 const unknown=missing.length?'<p class="fd46-unknown">Unknown fields: '+escape(missing.join(', '))+'. Blank is not zero. Check your packaging.</p>':
  '<p class="fd46-complete">All five label values entered. Check they match this exact product.</p>';
 const unit=d.unit==='portion'?'portion':'100 '+(d.unit==='ml'?'ml':'g');
 return '<div class="fd46-review" id="fd46-review" aria-label="Check product nutritional values">'+
 '<div class="fd46-source"><b>'+escape(source)+'</b><span>Values per '+escape(unit)+'</span></div>'+
 '<div class="fd56-provenance"><strong>'+(d.barcode?'Barcode '+escape(d.barcode):'No barcode entered')+'</strong><span>'+
  (d.lookupSource==='community'?(d.barcodeMatch===true?'Returned product code matches the entered barcode · community data, not manufacturer certification':'Community product record · code not independently confirmed'):
   d.lookupSource==='retailer-choice'||d.lookupSource==='name-choice'?'Chosen by name · NOT a verified barcode match':
   d.lookupSource==='personal'?'Your previously saved label values · confirm current packaging':
   'Manual label values · confirm packaging')+'</span>'+
  '<b id="fd56-coverage">'+(NUT.length-missing.length)+' / '+NUT.length+' nutrition fields supplied'+(missing.length?' · missing '+escape(missing.join(', ')):'')+'</b></div>'+
 unknown+'<p class="fd46-detail">Preview of the amount eaten, using the values currently entered:</p>'+
 '<div class="fd46-preview" id="fd46-preview" role="status">'+nutritionPreview(d.unit,d.quantity,d.perUnit)+'</div>'+
 '<small>Open Food Facts and retailer name matches are not official barcode certification. Verify variety, serving weight and nutrition on the pack.</small></div>';
}
function nutritionPreview(unit,quantity,nut){
 const mult=unit==='portion'?Number(quantity):Number(quantity)/100;
 const parts=NUT.map(k=>{
  const raw=nut?.[k];
  const val=raw===''||raw===undefined||raw===null||!Number.isFinite(Number(raw))?'—':
   (!Number.isFinite(mult)||mult<=0?'—':String(f(Number(raw)*mult)));
  return '<div><small>'+({kcal:'CALORIES',protein:'PROTEIN',carbs:'CARBS',fat:'FAT',fibre:'FIBRE'})[k]+'</small><b>'+val+(val==='—'?'':k==='kcal'?' kcal':' g')+'</b></div>';
 });
 return parts.join('');
}
function refreshPreview(){
 const r=document.getElementById('fd46-review');if(!r)return;
 const unit=document.getElementById('fd-unit')?.value||'g',quantity=document.getElementById('fd-quantity')?.value;
 const values={};
 for(const k of NUT)values[k]=document.getElementById('fd-'+k)?.value??'';
 const preview=document.getElementById('fd46-preview');
 if(preview)preview.innerHTML=nutritionPreview(unit,quantity,values);
 const unknown=NUT.filter(k=>values[k]==='');
 const completeness=document.getElementById('fd56-coverage');
 if(completeness)completeness.textContent=(NUT.length-unknown.length)+' / '+NUT.length+' nutrition fields supplied'+(unknown.length?' · missing '+unknown.join(', '):'');
 const warning=r.querySelector('.fd46-unknown,.fd46-complete');
 if(warning){
  warning.className=unknown.length?'fd46-unknown':'fd46-complete';
  warning.textContent=unknown.length?'Unknown fields: '+unknown.join(', ')+'. Blank is not zero. Check your packaging.':'All five label values entered. Check they match this exact product.';
 }
 const basis=r.querySelector('.fd46-source span');
 if(basis)basis.textContent='Values per '+(unit==='portion'?'portion':'100 '+unit);
}
function inputPanel(){
 const d=draft||blankDraft();const input=(id,label,step,maximum)=>'<label>'+label+'<input id="fd-'+id+'" aria-label="'+label+' per label unit" enterkeyhint="next" type="number" step="'+step+'" min="0" max="'+maximum+'" inputmode="decimal" value="'+(d.perUnit[id]??'')+'" placeholder="Enter label value"></label>';
 return '<div class="card" id="fd-entry"><div class="row" style="justify-content:space-between;flex-wrap:wrap"><div><h3 style="margin:0">Add extra food</h3><p class="short">Snacks, drinks, takeaways, supplements or anything outside the plan.</p></div><button class="btn" onclick="fdBeginManual()">＋ New manual food</button></div>'+
 '<div class="fd-lookup"><button class="btn dark" onclick="fdOpenScanner()">▦ Scan barcode</button><label class="short" for="fd-lookup-code">Barcode digits</label><input id="fd-lookup-code" type="text" inputmode="numeric" pattern="[0-9]*" enterkeyhint="search" autocomplete="off" onkeydown="fdLookupKey(event,this.value)" maxlength="14" placeholder="EAN/UPC barcode" aria-label="Barcode digits" value="'+escape(lastBarcode)+'"><button class="btn" onclick="fdLookup(document.getElementById(\'fd-lookup-code\').value)">Find product</button></div><div id="fd-scan-holder" hidden></div><div class="actions" style="margin:8px 0"><button class="btn sm" onclick="fdTestLookup()">Test food database connection</button></div><p class="short" id="fd-message" role="status">'+escape(lookupMessage||"Scan or enter a barcode to look up a product. Barcode data comes from Open Food Facts; verify against the label.")+'</p>'+(lastBarcode?'<p class="short">Scanned code: <b>'+escape(lastBarcode)+'</b> · <a href="https://world.openfoodfacts.org/product/'+encodeURIComponent(lastBarcode)+'" target="_blank" rel="noopener noreferrer">Check this barcode on Open Food Facts ↗</a></p>':'')+
 foodSearchUI()+
 (draft?'<form id="fd56-entry-form" onsubmit="event.preventDefault();fdSaveManual()"><div class="fd-inputs"><label class="fd-wide">Product / food name<input id="fd-name" autocomplete="off" enterkeyhint="next" maxlength="100" required value="'+escape(d.name)+'" placeholder="e.g. Chicken sandwich"></label><label>Meal<select id="fd-category">'+CATS.map(c=>'<option value="'+c+'" '+(d.category===c?'selected':'')+'>'+c[0].toUpperCase()+c.slice(1)+'</option>').join('')+'</select></label><label>Quantity eaten<input id="fd-quantity" required type="number" inputmode="decimal" enterkeyhint="next" min="0.1" max="5000" step="0.1" value="'+f(d.quantity)+'"></label><label>Unit<select id="fd-unit" onchange="fdUnitChanged(this.value)">'+['g','ml','portion'].map(u=>'<option value="'+u+'" '+(d.unit===u?'selected':'')+'>'+escape(u==='portion'?'Portions':u==='ml'?'Millilitres (ml)':'Grams (g)')+'</option>').join('')+'</select></label><label>Barcode (optional)<input id="fd-barcode" inputmode="numeric" enterkeyhint="next" autocomplete="off" maxlength="14" value="'+escape(d.barcode||'')+'" placeholder="Optional"></label></div><p class="short fd-base-label" id="fd-base-label">Nutritional values per '+(d.unit==='portion'?'one portion':'100 '+d.unit)+'. You can change values to match the package label.</p><div class="fd-inputs">'+input('kcal','Calories (kcal)',.1,5000)+input('protein','Protein (g)',.1,300)+input('carbs','Carbohydrates (g)',.1,500)+input('fat','Fat (g)',.1,300)+input('fibre','Fibre (g)',.1,200)+'</div>'+draftReview(d)+'<label class="fd-check"><input type="checkbox" id="fd-save-food" '+(d.saveFood?'checked':'')+'> Save food for next time</label><div class="actions"><button class="btn dark" type="submit">'+(editing?'Update diary entry':'Add to my diary')+'</button><button type="button" class="btn" onclick="fdCancelDraft()">Cancel</button></div></form>':'<p class="short">Scan or find a barcode to fill the nutrition values, or choose “New manual food” to enter values from the packaging.</p>')+'</div>';
}
function unitChanged(unit){
 const label=document.getElementById('fd-base-label');
 if(label)label.textContent='Nutritional values per '+(unit==='portion'?'one portion':'100 '+unit)+'. If changing units, update the label values too.';
}
function diaryPage(){
 return '<div class="sectionhead"><div><div class="eyebrow">FORGE · FOOD DIARY</div><h2>What you actually ate</h2></div><span class="pill">Private to your account</span></div>'+
 '<p class="notice">Track real consumption alongside your planned meals. Nutrition and barcode information are estimates; verify the product label, especially allergies and serving sizes. Your daily reference target is not adjusted automatically for exercise calories.</p>'+dateUI()+dashboard()+planned()+'<div class="fd-columns"><div>'+logRows()+'</div><div>'+inputPanel()+saved()+'</div></div>'+weekIntake();
}
function dashboardCard(){
 const date=localDate(new Date()),entries=diaryFor(date),totals=grand(entries),target=targetFor(date);
 return '<div style="margin-bottom:16px">'+dashboard(true)+'</div><div class="actions" style="margin-bottom:16px"><button class="btn dark" onclick="navigate(\'diary\')">▦ Open today’s food diary →</button></div>';
}
const css=document.createElement('style');
css.textContent='.fd-date{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin:14px 0}.fd-date input,.fd-inputs input,.fd-inputs select,.fd-lookup input{border:1px solid var(--line);background:#fff;color:var(--ink);padding:11px;border-radius:9px;font:inherit;min-width:0;max-width:100%;font-size:16px}.fd-date label{font-weight:700}.fd-summary{margin-bottom:16px}.fd-remaining{text-align:right}.fd-remaining strong{display:block;font-size:19px}.fd-remaining small{color:var(--muted)}.fd-meter{height:7px;overflow:hidden;background:#e3eae4;border-radius:99px;margin:7px 0}.fd-meter.big{height:12px;margin:16px 0}.fd-meter>div{height:100%;background:#34795c;border-radius:99px}.fd-nutrients{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.fd-stat{font-size:12px}.fd-stat .row{gap:4px;flex-wrap:wrap}.fd-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;align-items:start}.fd-columns .card{margin-bottom:16px}.fd-planned{border-top:1px solid var(--line);padding:14px 0;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}.fd-planned small,.fd-log small{display:block;font-size:12px;color:var(--muted);margin-top:4px}.fd-planned-actions{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.fd-planned-actions select{display:block;margin-top:3px}.fd-log-group{border-top:1px solid var(--line);margin-top:16px}.fd-log-group h4{margin:13px 0 6px}.fd-log{padding:10px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;align-items:start}.fd-log-actions{display:flex;flex-direction:column;align-items:flex-end;gap:6px}.fd-log-actions strong{white-space:nowrap}.fd-lookup{display:flex;flex-wrap:wrap;gap:9px;align-items:end;margin:15px 0}.fd-lookup label{width:100%}.fd-lookup input{flex:1;min-width:120px}.fd-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.fd-inputs label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:700;min-width:0}.fd-inputs .fd-wide{grid-column:1/-1}.fd-check{display:flex;gap:9px;align-items:center;margin:15px 0}.fd-check input{width:20px;height:20px;accent-color:var(--green)}.fd-saved{display:flex;flex-wrap:wrap;gap:8px}.fd-saved .btn{text-align:left;white-space:normal}#fd-scan-holder{margin:12px 0;max-width:100%;overflow:hidden}#fd-scan-holder video{max-width:100%}@media(max-width:850px){.fd-columns{grid-template-columns:1fr}}@media(max-width:540px){.fd-nutrients{grid-template-columns:1fr}.fd-inputs{grid-template-columns:1fr}.fd-remaining{text-align:left}.fd-planned-actions{width:100%}}';
css.textContent+='.fd-search-panel{margin:15px 0;border:1px solid var(--line);border-radius:12px;padding:12px;background:#fbfdfa}.fd-choose-result{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)}.fd-choose-result div{min-width:0}.fd-choose-result small{display:block;color:var(--muted);font-size:12px;margin-top:4px}.fd-choose-result .btn{flex-shrink:0}@media(max-width:480px){.fd-choose-result{align-items:flex-start;flex-wrap:wrap}}';
css.textContent+='.fd-week-numbers{text-align:right}.fd-week-numbers small{display:block;color:var(--muted)}';document.head.append(css);
window.nourishFoodDiaryPage=diaryPage;
window.nourishFoodDashboard=dashboardCard;
window.nourishFoodTodaySummary=()=>({date:localDate(new Date()),totals:grand(diaryFor(localDate(new Date()))),target:targetFor(localDate(new Date()))});
document.addEventListener?.('input',e=>{
 const target=e.target;
 if(!target?.id||!/^fd-(quantity|unit|kcal|protein|carbs|fat|fibre)$/.test(target.id))return;
 refreshPreview();
});
document.addEventListener?.('change',e=>{
 if(e.target?.id==='fd-unit')refreshPreview();
});
document.addEventListener?.('click',e=>{
 const fav=e.target.closest?.('[data-fd56-fav]');
 if(fav&&document.getElementById('diary')?.contains(fav)){fd56ToggleFavorite(fav.dataset.fd56Fav);return;}
 const log=e.target.closest?.('[data-fd44-log]');
 const edit=e.target.closest?.('[data-fd44-edit]');
 const control=log||edit;
 if(!control||!document.getElementById('diary')?.contains(control))return;
 if(log)quickRepeat(log.dataset.fd44Log);
 else if(edit)quickEdit(edit.dataset.fd44Edit);
});
window.fdPrivateSearch=privateSearch;window.fdQuickRepeat=quickRepeat;window.fdQuickEdit=quickEdit;
window.fdRepeatEntry=fd56Repeat;window.fdToggleFoodFavorite=fd56ToggleFavorite;
window.forgeFoodQuickLog={libraryCandidates,libraryResults,quickRepeat,quickEdit};
window.forgeBarcodeV46={barcodeVariants,nutritionCoverage,nutritionPreview,refreshPreview};
window.fdChangeDate=changeDate;window.fdAdjustDate=adjustDate;window.fdAddPlanned=addPlanned;
window.fdDeleteEntry=deleteEntry;window.fdEditEntry=editEntry;window.fdUseSaved=useSaved;
window.fdBeginManual=beginManual;window.fdCancelDraft=cancelDraft;window.fdSaveManual=saveManual;
window.fdSearchTyping=searchTyping;window.fdSearchNames=searchFoodNames;window.fdLookupKey=lookupKey;window.fdFoodSearchKey=foodSearchKey;window.fdChooseVerified=chooseVerified;window.fdChooseSearch=chooseSearch;
window.fdLookup=lookup;window.fdTestLookup=testFoodDatabase;window.fdExport=exportDiary;window.fdOpenScanner=openScanner;window.fdStopScanner=stopScanner;window.fdUnitChanged=unitChanged;
window.nourishFoodCleanup=stopScanner;window.nourishFoodReset=resetDiaryUI;
if(s.tab==='diary'||s.tab==='overview')renderCurrent();
})();