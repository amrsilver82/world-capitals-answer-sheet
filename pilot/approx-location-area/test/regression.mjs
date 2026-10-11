import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/approx-location-area/";
async function tap(page,lon,lat,mobile){
 const svg=page.locator("#map");await svg.scrollIntoViewIfNeeded();
 const p=await svg.evaluate((s,{lon,lat})=>{const a=s.createSVGPoint();a.x=(lon+180)*4;a.y=(90-lat)*4;const b=a.matrixTransform(s.getScreenCTM());return{x:b.x,y:b.y}},{lon,lat});
 if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
}
async function run(type,mobile){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__areaTrial&&document.querySelectorAll("#countries path").length>=177*3,{timeout:20000});
  assert.equal(await page.locator(".card").count(),10);
  assert.equal(await page.locator(".zoneCell").count(),0,"There must be no rigid zone grid");
  await page.locator("#openMap-5").click();
  await page.locator('[data-view="Africa"]').click();
  await tap(page,18,15,mobile);
  const left=await page.evaluate(()=>__areaTrial.getState()[4].point);
  assert.ok(Math.abs(left.lon-18)<1.2&&Math.abs(left.lat-15)<1.2,JSON.stringify(left));
  await tap(page,22,15,mobile);
  const right=await page.evaluate(()=>__areaTrial.getState()[4].point);
  assert.ok(Math.abs(right.lon-22)<1.2&&Math.abs(right.lat-15)<1.2,JSON.stringify(right));
  assert.equal(await page.locator("#locationCount").innerText(),"1 / 10 locations selected");
  await page.locator("#openMap-1").click();
  await page.locator('[data-view="Pacific"]').click();
  await tap(page,167,-.52,mobile);
  const island=await page.evaluate(()=>__areaTrial.getState()[0].point);
  assert.ok(Math.abs(island.lon-167)<1.2&&Math.abs(island.lat+.52)<1.2);
  await page.locator('[data-view="World"]').click();
  assert.ok(await page.locator("#choiceBadges .pinBadge").count()>=2,"Both prior pins should be visible in shared world viewport");
  const before=await page.locator("#map").getAttribute("viewBox");
  await page.locator("#openMap-3").click();
  assert.equal(await page.locator("#map").getAttribute("viewBox"),before);
  await page.locator("#radiusChoice").selectOption("800");
  assert.equal(await page.evaluate(()=>__areaTrial.getRadius()),800);
  assert.deepEqual(await page.evaluate(()=>__areaTrial.getState()[0].point),island);
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[2].radiusKm),800);
  await page.locator("#openMap-5").click();
  assert.equal(await page.locator("#radiusChoice").inputValue(),"500","Chad must keep independent radius");
  await page.locator("#radiusChoice").selectOption("300");
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[4].radiusKm),300);
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[2].radiusKm),800);
  await page.locator("#build").click();
  assert.match(await page.locator("#reply").innerText(),/Approximate location: P:/);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__areaTrial);
  assert.deepEqual(await page.evaluate(()=>__areaTrial.getState()[0].point),island);
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+type.name()+" "+(mobile?"mobile WebKit":"desktop Chromium")+" — no grid, Chad either side, Pacific water click, persistent numbered choices and radius controls.");
 }finally{await browser.close()}
}
await run(chromium,false);await run(webkit,true);
