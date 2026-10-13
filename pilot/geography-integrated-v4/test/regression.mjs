import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/geography-integrated-v4/";
async function check(browserType,mobile){
 const browser=await browserType.launch();
 try{
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});
  const page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem("wcg-geography-fairness-scored-v3",JSON.stringify({current:19,records:Array.from({length:20},(_,i)=>({point:i===0?{lon:9.8,lat:50.9}:null,areaChoice:i===11?"atlantic":i===19?"europe":null,revealed:i===0||i===11||i===19}))}))});
  await page.goto(URL,{waitUntil:"networkidle"});await page.waitForFunction(()=>window.__geoFun?.version===4&&window.__areaTrial?.getHiResStatus().ready,null,{timeout:30000});
  assert.equal(await page.locator(".geoCard").count(),22);
  assert.equal(await page.locator(".geoCard:visible").count(),10,"imported Q20 should show Q11-20 as a ten-card batch");
  assert.equal(await page.locator("#funCountry").innerText(),"Vatican City");
  assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  assert.equal(await page.locator("#activeQuestion").innerText(),"Question 20 / 22");
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[11].revealed),false,"Cabo Verde old area should not become scored country pin");
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[19].revealed),false,"Vatican old area should not become scored pin");
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[0].revealed),true,"Compatible historic country answer must persist");
  await page.locator("#v4BatchNav button").first().click();
  assert.equal(await page.locator(".geoCard:visible").count(),10);
  assert.ok((await page.locator("#geoCard1 img").getAttribute("src")).includes("flags/canonical/"));
  await page.locator("#geoCard2 button").click();assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  await page.locator("#funAreaChoice").selectOption("pacific");await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(1).points),1);
  await page.reload({waitUntil:"networkidle"});await page.waitForFunction(()=>__geoFun?.version===4);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[1].revealed),true);
  assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  assert.deepEqual(errors,[]);
  console.log("PASS integrated V4 "+browserType.name()+" "+(mobile?"mobile":"desktop")+" — original flag cards, no continent hints, dynamic Q label, broad-area grading, legacy isolation");
 }finally{await browser.close()}
}
await check(chromium,false);await check(webkit,true);
