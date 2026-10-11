import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/connected-atlas-ten-v2/";
async function run(engine,mobile=false){
 const b=await engine.launch({headless:true});
 try{
  const p=await b.newPage(mobile?{viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true}:{viewport:{width:1440,height:900}});
  const errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.goto(URL,{waitUntil:"networkidle"});
  await p.waitForFunction(()=>document.querySelectorAll("#land .country").length>=177*3,{timeout:20000});
  const cards=p.locator(".question"),map=p.locator("#map");
  assert.equal(await cards.count(),10);
  const flag=cards.nth(1).locator(".flagbox");
  const img=cards.nth(1).locator("img");
  const rect=await flag.boundingBox(),imgRect=await img.boundingBox();
  assert.ok(imgRect.width>=(mobile?290:385),"Monaco flag too small: "+JSON.stringify(imgRect));
  assert.ok(Math.abs(rect.width/rect.height-1.25)<.02,"Monaco should be 5:4 ratio");
  const last=await cards.last().boundingBox(),atlas=await p.locator("#atlasHolder").boundingBox();
  assert.ok(atlas.y>last.y+last.height-5,"Atlas must be physically beneath ALL flags");
  await cards.nth(4).locator(".choose").click();
  assert.match(await p.locator("#activeStatus").innerText(),/Question 5/);
  // V1 incorrectly gated map choices behind typed Country and Capital.
  assert.equal(await cards.nth(4).locator("input").nth(0).inputValue(),"");
  assert.equal(await cards.nth(4).locator("input").nth(1).inputValue(),"");
  // Click inner Chad geography point without zoom. World view first.
  const point=await map.evaluate(svg=>{
   const geoX=(19+180)*4,geoY=(90-16)*4;
   const pt=svg.createSVGPoint();pt.x=geoX;pt.y=geoY;
   const q=pt.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
  });
  await map.scrollIntoViewIfNeeded();
  const geo=await map.evaluate(svg=>{
   const p=svg.createSVGPoint();p.x=(19+180)*4;p.y=(90-16)*4;
   const s=p.matrixTransform(svg.getScreenCTM());return{x:s.x,y:s.y};
  });
  if(!mobile)await p.mouse.click(geo.x,geo.y);else await p.touchscreen.tap(geo.x,geo.y);
  await p.waitForTimeout(100);
  let count=await p.locator("#completeCount").innerText();
  assert.equal(count,"1","Chad not selectable on world map with blank text: "+await p.locator("#mapStatus").innerText());
  assert.equal(await p.locator("#micro .selected").count(),0,"Chad should come from land outline, not artificial marker");
  // Verify region view and another explicit Chad selection after zoom.
  await p.locator('button[data-region="Africa"]').click();
  await p.locator("#zoomIn").click();
  await map.scrollIntoViewIfNeeded();
  const point2=await map.evaluate(svg=>{
   const p=svg.createSVGPoint();p.x=(19+180)*4;p.y=(90-16)*4;
   const a=p.matrixTransform(svg.getScreenCTM());return{x:a.x,y:a.y};
  });
  if(!mobile)await p.mouse.click(point2.x,point2.y);else await p.touchscreen.tap(point2.x,point2.y);
  assert.equal(await p.locator("#completeCount").innerText(),"1");
  assert.match(await p.locator("#mapStatus").innerText(),/Question 5:/);
  const before=await map.getAttribute("viewBox");
  await p.locator("#backQuestion").click();
  assert.equal(await map.getAttribute("viewBox"),before,"Returning to questions should preserve viewport");
  await cards.nth(1).locator(".choose").click();
  assert.equal(await map.getAttribute("viewBox"),before,"Changing Q should preserve viewport");
  assert.match(await p.locator("#activeStatus").innerText(),/Question 2/);
  // Viewing review must mark unattempted components as unattempted.
  await p.locator("#showReview").click();
  assert.equal(await p.locator("#reviewRows .review-row").count(),10);
  assert.match(await p.locator("#reviewRows .review-row").nth(4).innerText(),/Selected marker\/outline/);
  assert.match(await p.locator("#reviewRows .review-row").nth(0).innerText(),/Not attempted/);
  if(!mobile){
   await map.scrollIntoViewIfNeeded();
   const r=await map.boundingBox();
   await p.mouse.move(r.x+r.width*.6,r.y+r.height*.5);
   const pre=await map.getAttribute("viewBox");
   await p.mouse.wheel(0,-420);await p.waitForTimeout(180);
   assert.notEqual(await map.getAttribute("viewBox"),pre,"Mouse wheel zoom failed");
   const preDrag=await map.getAttribute("viewBox");
   await p.mouse.down();await p.mouse.move(r.x+r.width*.69,r.y+r.height*.5,{steps:5});await p.mouse.up();
   assert.notEqual(await map.getAttribute("viewBox"),preDrag,"Drag pan failed");
  }
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+engine.name()+" "+(mobile?"mobile-viewport":"desktop")+": large 420px Monaco 5:4 flag, atlas below cards, Chad country-map selection without text or zoom, Africa zoom, shared atlas state, review.");
 }finally{await b.close()}
}
await run(chromium,false);await run(webkit,true);
