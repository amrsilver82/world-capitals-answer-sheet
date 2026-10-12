import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const ROOT="http://127.0.0.1:8765/pilot/";
const URL=ROOT+"geography-fun-v2/";
async function tap(page,lon,lat,mobile){
 const map=page.locator("#map");await map.scrollIntoViewIfNeeded();
 const p=await map.evaluate((s,v)=>{
  const a=s.createSVGPoint();a.x=(v.lon+180)*4;a.y=(90-v.lat)*4;
  const b=a.matrixTransform(s.getScreenCTM());return{x:b.x,y:b.y}
 },{lon,lat});
 if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
}
async function exercise(browserType,mobile){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.version===2&&__areaTrial.getHiResStatus().ready,null,{timeout:30000});
  assert.equal(await page.locator("#funCountry").innerText(),"Poland");
  assert.equal(await page.locator("#funReveal").isDisabled(),true);
  assert.equal(await page.locator("#countries path.funCorrect").count(),0);
  await tap(page,19,52,mobile);
  assert.equal(await page.evaluate(()=>__geoFun.getFeedback(0)),"Feedback hidden until Reveal");
  await page.locator("#funReveal").click();
  assert.match(await page.locator("#funFeedback").innerText(),/inside Poland/);
  assert.ok(await page.locator("#countries path.funCorrect").count()>0);
  const pin=await page.evaluate(()=>__geoFun.getRecord()[0].point);
  await tap(page,23,56,mobile);
  assert.deepEqual(await page.evaluate(()=>__geoFun.getRecord()[0].point),pin,"Reveal locks original answer");
  await page.locator("#funStep2").click();
  assert.equal(await page.locator("#funCountry").innerText(),"Mongolia");
  assert.equal(await page.locator("#countries path.funCorrect").count(),0);
  await page.locator("#funStep6").click();
  assert.equal(await page.locator("#funCountry").innerText(),"Barbados");
  assert.match(await page.locator("#viewLabel").innerText(),/World/);
  await tap(page,-65,19,mobile);
  assert.equal(await page.evaluate(()=>__geoFun.getFeedback(5)),"Feedback hidden until Reveal");
  await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getFeedback(5)),"Same broad geographical area");
  await page.locator("#funStep7").click();
  await tap(page,-23,14,mobile); // Atlantic: wrong broad ocean for Maldives.
  await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getFeedback(6)),"Different broad geographical area");
  await page.locator("#funExport").click();
  const exportText=await page.locator("#funExportText").inputValue();
  assert.match(exportText,/Geography Fun Trial V2/);
  assert.match(exportText,/Feedback: Your pin is inside Poland/);
  assert.match(exportText,/Feedback: Different broad geographical area/);
  assert.doesNotMatch(exportText,/Score:|Radius:/);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.version===2);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[0].revealed),true);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[6].revealed),true);
  await page.goto(ROOT+"approx-location-area/?fun=1",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.enabled);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[0].point),null,"V1 storage must remain independent");
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+browserType.name()+" "+(mobile?"mobile WebKit":"desktop Chromium")+" — revealed-only geography feedback, own country, wrong ocean, frozen pins, export, reload and V1 isolation.");
 }finally{await browser.close()}
}
await exercise(chromium,false);
await exercise(webkit,true);
