import {chromium, webkit} from 'playwright';
import assert from 'node:assert/strict';
const URL='http://127.0.0.1:8765/pilot/location/';
const VERSION='pilot-location-chad-touch-reset-20261010';
const KEY='wcg-location-pilot-chad-touch-reset-20261010';
const browser=await chromium.launch({headless:true});
async function ready(page){
 await page.goto(URL,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('#land path').length===177,{timeout:25000});
 // Only small countries missing from the 110m background keep a high-res layer.
 assert.equal(await page.locator('#detail path').count(),7);
 assert.equal(await page.locator('#detail [data-code="TD"]').count(),0,
   'Chad must not be covered by an invisible detailed-country overlay');
 assert.equal(await page.locator('#detail [data-code="RO"]').count(),0);
 assert.equal(await page.locator('#land [data-code="TD"]').count(),1);
 assert.equal(await page.locator('#maperror.on').count(),0);
 assert.match(await page.locator('#question').innerText(),/Chad/);
 assert.equal(await page.locator('#progress').innerText(),'0');
}
async function point(page,lon,lat){
 return page.locator('#map').evaluate((svg,{lon,lat})=>{
  const p=svg.createSVGPoint();p.x=(lon+180)*4;p.y=(90-lat)*4;
  const v=p.matrixTransform(svg.getScreenCTM());
  return {x:v.x,y:v.y};
 },{lon,lat});
}
try{
 const desktop=await browser.newContext({viewport:{width:1300,height:1000}});
 const page=await desktop.newPage();
 await ready(page);
 await page.getByRole('button',{name:'Africa',exact:true}).click();
 let xy=await point(page,18.73,15.45);
 // The iPad's normal tap should hit the world's actual Chad outline, not an
 // invisible overlay. All countries with 110m polygons use the exact same layer.
 await page.locator('#land [data-code="TD"]').evaluate(el=>{
   if(document.querySelector('#detail [data-code="TD"]'))throw Error('Chad overlay remains');
   if(el.getAttribute('class')!=='country')throw Error('Chad not a normal country layer');
 });
 // Deliberately fire from the SVG root, not a <path>, matching Safari mis-targeting.
 await page.locator('#map').evaluate((svg,p)=>svg.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:p.x,clientY:p.y})),xy);
 assert.equal(await page.locator('#check').isEnabled(),true,'Chad coordinate click never enabled submit');
 await page.locator('#check').click();
 assert.equal(await page.locator('#progress').innerText(),'1');
 assert.match(await page.locator('#question').innerText(),/Romania/);
 // Progress survives reload in the same browser.
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await page.locator('#progress').innerText(),'1');
 await desktop.close();
 const phone=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true});
 const mobile=await phone.newPage();
 await ready(mobile);
 await mobile.getByRole('button',{name:'Africa',exact:true}).click();
 await mobile.locator('#map').scrollIntoViewIfNeeded();
 xy=await point(mobile,18.73,15.45);
 await mobile.touchscreen.tap(xy.x,xy.y);
 assert.equal(await mobile.locator('#check').isEnabled(),true,'Mobile Chad touch was not recognized');
 await mobile.locator('#check').click();
 assert.equal(await mobile.locator('#progress').innerText(),'1');
 await phone.close();
 const resetContext=await browser.newContext({viewport:{width:900,height:700}});
 const reset=await resetContext.newPage();
 await reset.goto(URL);
 await reset.evaluate(()=>{
   localStorage.setItem('wcg-location-pilot-v1',JSON.stringify({
    version:'pilot-location-v1-20261010',done:[1,2,3],attempts:[],region:'Europe'
   }));
 });
 await reset.reload({waitUntil:'networkidle'});
 assert.equal(await reset.locator('#progress').innerText(),'0');
 assert.match(await reset.locator('#question').innerText(),/Chad/);
 assert.equal(JSON.parse(await reset.locator('#map').evaluate(()=>fetch('data/manifest.json').then(r=>r.text()))).version,VERSION);
 assert.equal(await reset.evaluate(key=>localStorage.getItem(key),KEY)!==null,true);
 await resetContext.close();
 console.log('PASS: Chad root SVG click, mobile touchscreen, local refresh, Q1 reset, frozen manifest.');
}finally{await browser.close()}

const wb=await webkit.launch({headless:true});
try{
 const iphone=await wb.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true});
 const p=await iphone.newPage();
 await ready(p);
 await p.getByRole('button',{name:'Africa',exact:true}).click();
 await p.locator('#map').scrollIntoViewIfNeeded();
 // Actual synthetic touchscreen tap targeted at the interior of Chad.
 const loc=await point(p,18.73,15.45);
 await p.touchscreen.tap(loc.x,loc.y);
 assert.equal(await p.locator('#check').isEnabled(),true,'WebKit Chad was not touch-selectable');
 const selected=await p.locator('#land [data-code="TD"]').getAttribute('class');
 assert.match(selected,/picked/,'WebKit selected something else instead of Chad');
 await p.locator('#check').click();
 assert.equal(await p.locator('#progress').innerText(),'1','WebKit Chad did not advance');
 await iphone.close();
 console.log('PASS: WebKit mobile Chad touch, single normal country layer, no overlay.');
}finally{await wb.close()}
