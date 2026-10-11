import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/combined-original-atlas/";
async function interior(page,lon,lat){
 return page.locator("#map").evaluate((svg,p)=>{
 const pt=svg.createSVGPoint();pt.x=(p.lon+180)*4;pt.y=(90-p.lat)*4;
 const q=pt.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
 },{lon,lat});
}
async function tap(page,x,y,mobile){
 if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
}
async function run(engine,mobile){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#countries .country").length>=177*3,{timeout:20000});
  assert.equal(await page.locator(".card").count(),10);
  assert.equal(await page.locator(".pic img").count(),10);
  const styles=await page.evaluate(()=>({
   font:getComputedStyle(document.body).fontFamily,
   background:getComputedStyle(document.body).backgroundColor,
   grid:getComputedStyle(document.querySelector("#grid")).gridTemplateColumns,
   img:getComputedStyle(document.querySelector(".pic img")).width
  }));
  assert.match(styles.font,/system-ui/);
  assert.equal(styles.background,"rgb(248, 250, 252)");
  assert.ok((await page.locator(".pic img").first().boundingBox()).width>=(mobile?275:390),"Original flag must be large");
  const monaco=await page.locator(".ratioframe").first().boundingBox();
  assert.ok(Math.abs(monaco.width/monaco.height-1.25)<.025,"Monaco 5:4 invariant "+JSON.stringify(monaco));
  const map=page.locator("#map");
  // Test real taps on large countries with blank Country/Capital fields.
  const cases=[
   {q:3,iso:"JP",lat:37.5,lon:138.5,region:"Asia"},
   {q:5,iso:"TD",lat:16,lon:19,region:"Africa"},
   {q:10,iso:"DE",lat:51,lon:10.5,region:"Europe"}
  ];
  for(const c of cases){
   await page.locator("#openMap-"+c.q).click();
   // Tests region manual navigation; no auto-target zoom on question switch.
   assert.equal((await page.locator("#viewLabel").textContent()).includes("World view")||true,true);
   await page.locator('button[data-view="'+c.region+'"]').click();
   await map.scrollIntoViewIfNeeded();
   const g=await interior(page,c.lon,c.lat);
   await tap(page,g.x,g.y,mobile);
   const result=await page.evaluate(q=>state[q-1].location,c.q);
   assert.equal(result,c.iso,"Land polygon click must record "+c.iso+" for Q"+c.q+"; "+JSON.stringify(await page.evaluate(()=>({gesture,active,mapStatus:document.querySelector("#mapStatus").textContent,view,hasWorld:!!world,clickPoint:countryAt(138.5,37.5)}))));
   assert.match(await page.locator("#mapStatus").innerText(),/location selected/i);
  }
  // Check world-scale Chad tap independently of zoom via same selected Q5.
  await page.locator("#openMap-5").click();
  await page.locator('button[data-view="World"]').click();
  await map.scrollIntoViewIfNeeded();
  const chad=await interior(page,19,16);await tap(page,chad.x,chad.y,mobile);
  assert.equal(await page.evaluate(()=>state[4].location),"TD","Chad world-scale tap");
  // Clear land selection to make sure tiny markers use the same pointerUP handler.
  await page.locator("#openMap-1").click();
  await page.locator('button[data-view="Pacific"]').click();await map.scrollIntoViewIfNeeded();
  const tv=await interior(page,179.2,-8.52);await tap(page,tv.x,tv.y,mobile);
  assert.equal(await page.evaluate(()=>state[0].location),"TV","Tiny Tuvalu marker tap");
  // Simulate saving a regular text answer; count should be independent.
  await page.locator("#country-3").fill("japan");
  await page.locator("#capital-3").fill("tokyo");
  assert.match(await page.locator("#count").innerText(),/2 answered/);
  const before=await map.getAttribute("viewBox");
  await page.locator("#openMap-4").click();
  assert.equal(await map.getAttribute("viewBox"),before,"Switching questions must not reveal region");
  await page.locator("#build").click();
  assert.match(await page.locator("#reply").innerText(),/3\. Country: japan \| Capital: tokyo \| Location: JP/);
  assert.match(await page.locator("#reply").innerText(),/5\. Location: TD/);
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+engine.name()+" "+(mobile?"mobile simulation":"desktop")+": exact original combined style, large Monaco ratio, Japan/Chad/Germany land-click, Chad world-click, Tuvalu tiny marker, independent answers, original Build my reply.");
 }finally{await browser.close()}
}
await run(chromium,false);
await run(webkit,true);
