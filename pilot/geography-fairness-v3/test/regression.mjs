import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const ROOT="http://127.0.0.1:8765/pilot/";
async function tap(page,lon,lat,mobile){
 const map=page.locator("#map");await map.scrollIntoViewIfNeeded();
 const p=await map.evaluate((s,v)=>{const a=s.createSVGPoint();a.x=(v.lon+180)*4;a.y=(90-v.lat)*4;const b=a.matrixTransform(s.getScreenCTM());return{x:b.x,y:b.y}},{lon,lat});
 if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
}
async function exercise(engine,mobile){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(ROOT+"geography-fairness-v3/",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__geoFun?.version===3&&window.__areaTrial?.getHiResStatus().ready,null,{timeout:30000});
  assert.equal(await page.locator("#funCountry").innerText(),"Germany");
  assert.equal(await page.locator("#funReveal").isDisabled(),true);
  assert.equal(await page.locator("#countries path.funCorrect").count(),0);
  await tap(page,10.5,51.1,mobile);
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(0)),null);
  await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(0).points),1);
  const original=await page.evaluate(()=>__geoFun.getRecord()[0].point);
  await tap(page,12,50,mobile);
  assert.deepEqual(await page.evaluate(()=>__geoFun.getRecord()[0].point),original);
  await page.locator("#funStep2").click();
  assert.equal(await page.locator("#funCountry").innerText(),"Vanuatu");
  assert.equal(await page.locator("#funAreaRow").isVisible(),true);
  await tap(page,167,-16,mobile);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[1].point),null);
  await page.locator("#funAreaChoice").selectOption("pacific");
  await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(1).points),1);
  await page.locator("#funStep4").click();
  await page.locator("#funAreaChoice").selectOption("caribbean");
  await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(3).points),1);
  await page.locator("#funStep6").click();
  await page.locator("#funAreaChoice").selectOption("atlantic");
  await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(5).points),0);
  await page.locator("#funExport").click();
  const txt=await page.locator("#funExportText").inputValue();
  assert.match(txt,/Geography V3 Scored Fairness Pilot/);
  assert.match(txt,/Vanuatu .* Selected: pacific .* Provisional: 1\/1/);
  assert.match(txt,/Maldives .* Selected: atlantic .* Provisional: 0\/1/);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.version===3);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[0].revealed),true);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[1].areaChoice),"pacific");
  await page.goto(ROOT+"geography-fun-v2/",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.version===2);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[0].point),null,"V2 local storage isolated");
  assert.deepEqual(errors,[],"page exceptions");
  console.log("PASS "+engine.name()+" "+(mobile?"mobile WebKit":"desktop Chromium")+" V3 20 questions; pin grade, area grade, frozen reveals, export, persistence, V2 isolation");
 }finally{await browser.close()}
}
await exercise(chromium,false);await exercise(webkit,true);
