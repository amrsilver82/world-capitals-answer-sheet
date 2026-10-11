import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const SITE="http://127.0.0.1:8765/";
async function ten(engine,mobile){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(SITE+"pilot/connected-atlas-ten/",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#land .country").length>=177*3,{timeout:20000});
  assert.equal(await page.locator(".question").count(),10);
  assert.equal(await page.locator(".flagbox img").count(),10);
  assert.equal(await page.locator("#viewLabel").innerText(),"World view");
  assert.equal(await page.locator("#completeCount").innerText(),"0");
  const atlas=page.locator("#map");
  const original=await atlas.getAttribute("viewBox");
  await page.locator("#zoomIn").click();const closer=await atlas.getAttribute("viewBox");assert.notEqual(closer,original);
  await page.locator("#zoomOut").click();
  await page.locator("#resetMap").click();
  if(!mobile){
   await atlas.scrollIntoViewIfNeeded();const rect=await atlas.boundingBox();
   await page.mouse.move(rect.x+rect.width*.53,rect.y+rect.height*.54);
   const before=await atlas.getAttribute("viewBox");
   await page.mouse.wheel(0,-500);await page.waitForTimeout(180);
   const after=await atlas.getAttribute("viewBox");assert.notEqual(after,before,"Wheel zoom must change viewport");
   const bbox=await atlas.boundingBox();await page.mouse.move(bbox.x+bbox.width*.55,bbox.y+bbox.height*.55);
   const beforeDrag=await atlas.getAttribute("viewBox");
   await page.mouse.down();await page.mouse.move(bbox.x+bbox.width*.70,bbox.y+bbox.height*.55,{steps:5});await page.mouse.up();
   const afterDrag=await atlas.getAttribute("viewBox");assert.notEqual(beforeDrag,afterDrag,"Dragging should pan");
  }
  await page.locator('button[data-region="Pacific"]').click();
  assert.equal(await page.locator("#viewLabel").innerText(),"Pacific view");
  assert.ok((await page.locator("#micro .marker").count())>=10,"Regional neutral markers insufficient");
  assert.equal((await page.locator("#micro").textContent()).trim(),"","Map leaks country labels");
  // Selecting a different question preserves Pacific viewport, never reveals/zooms to target.
  const pacific=await atlas.getAttribute("viewBox");
  await page.locator(".question").nth(4).locator(".choose").click();
  assert.equal(await atlas.getAttribute("viewBox"),pacific);
  assert.equal(await page.locator("#activeStatus").innerText().then(t=>t.includes("Question 5")),true);
  // Fill Q1, select an anonymous Pacific marker, revisit Q2 without losing its answer.
  await page.locator(".question").first().locator("input").nth(0).fill("Tuvalu");
  await page.locator(".question").first().locator("input").nth(1).fill("Funafuti");
  await page.locator(".question").first().locator(".choose").click();
  await atlas.scrollIntoViewIfNeeded();
  const markers=page.locator('#micro [data-iso="TV"] circle');let clicked=false;
  for(const c of await markers.all()){
   const b=await c.boundingBox(),parent=await atlas.boundingBox();
   if(b&&parent&&b.x>=parent.x+1&&b.x<parent.x+parent.width-1&&b.y>=parent.y+1&&b.y<parent.y+parent.height-1){
    await c.click({timeout:4000,force:true});clicked=true;break;
   }
  }
  assert.ok(clicked,"Tuvalu candidate marker not accessible");
  assert.equal(await page.locator("#completeCount").innerText(),"1");
  await page.locator(".question").nth(1).locator(".choose").click();
  assert.equal(await atlas.getAttribute("viewBox"),pacific,"Switching question must not navigate atlas");
  assert.equal(await page.locator("#completeCount").innerText(),"1");
  await page.locator("#showReview").click();
  assert.equal(await page.locator("#reviewRows .review-row").count(),10);
  assert.match(await page.locator("#reviewRows .review-row").nth(1).innerText(),/Not attempted/);
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+": 10 cards, one shared atlas, regions, zoom, stable map, neutral marker selection, optional review.");
 }finally{await browser.close()}
}
async function one(){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(SITE+"pilot/connected-triple-one/",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#land .landpath").length>=177*3,{timeout:20000});
  const map=page.locator("#map");await map.scrollIntoViewIfNeeded();
  const start=await map.getAttribute("viewBox");await page.locator("#zoomIn").click();
  assert.notEqual(await map.getAttribute("viewBox"),start);
  const rect=await map.boundingBox();await page.mouse.move(rect.x+rect.width*.48,rect.y+rect.height*.43);
  const first=await map.getAttribute("viewBox");await page.mouse.wheel(0,-400);await page.waitForTimeout(150);
  assert.notEqual(await map.getAttribute("viewBox"),first);
  const second=await map.getAttribute("viewBox");
  await page.mouse.down();await page.mouse.move(rect.x+rect.width*.59,rect.y+rect.height*.43,{steps:5});await page.mouse.up();
  assert.notEqual(await map.getAttribute("viewBox"),second);
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS one-country atlas desktop: wheel zoom and drag pan.");
 }finally{await browser.close()}
}
await ten(chromium,false);
await ten(webkit,true);
await one();
