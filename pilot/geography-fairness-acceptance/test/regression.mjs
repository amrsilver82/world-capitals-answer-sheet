import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/geography-fairness-acceptance/";
async function test(engine,mobile){
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1330,height:900}});
  const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__fairness7?.ready(),null,{timeout:50000});
  assert.equal(await page.evaluate(()=>__fairness7.count()),7);
  assert.equal(await page.evaluate(()=>__fairness7.case()),"Barbados");
  assert.equal(await page.evaluate(()=>__fairness7.view().w),1440);
  assert.equal(await page.locator("#result").isHidden(),true);
  await page.locator("#evaluate").click();
  assert.match(await page.locator("#result").innerText(),/Place a pin/);
  const point=await page.evaluate(()=>{
   const s=document.getElementById("atlas"),p=s.createSVGPoint();
   p.x=(-59.54+180)*4;p.y=(90-13.19)*4;
   const z=p.matrixTransform(s.getScreenCTM());
   return {x:z.x,y:z.y};
  });
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  const pt=await page.evaluate(()=>{
   const s=document.getElementById("atlas"),p=s.createSVGPoint();
   p.x=(-59.54+180)*4;p.y=(90-13.19)*4;
   const z=p.matrixTransform(s.getScreenCTM());return{x:z.x,y:z.y}
  });
  if(mobile)await page.touchscreen.tap(pt.x,pt.y);
  else await page.mouse.click(pt.x,pt.y);
  assert.ok((await page.evaluate(()=>__fairness7.record().pin))!==null);
  await page.locator("#evaluate").click();
  assert.match(await page.locator("#result").innerText(),/border|within|inside|outside/i);
  await page.locator('input[name="vote"][value="country_pin"]').check();
  await page.locator("#next").click();
  assert.equal(await page.evaluate(()=>__fairness7.case()),"Maldives");
  assert.equal(await page.evaluate(()=>__fairness7.view().w),1440);
  assert.equal(await page.locator("#areaControls").isVisible(),true);
  await page.locator("#area").selectOption("INDIAN_OCEAN");
  await page.locator("#evaluate").click();
  assert.match(await page.locator("#result").innerText(),/matches the proposed region/);
  await page.locator('input[name="vote"][value="broad_area"]').check();
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__fairness7?.ready());
  assert.equal(await page.evaluate(()=>__fairness7.case()),"Maldives");
  assert.equal(await page.locator('input[name="vote"][value="broad_area"]').isChecked(),true);
  for(let i=0;i<3;i++)await page.locator("#next").click();
  assert.equal(await page.evaluate(()=>__fairness7.case()),"Monaco");
  assert.equal(await page.locator("#areaMethod").isHidden(),true);
  for(let i=0;i<16;i++)await page.locator("#zoomIn").click();
  assert.ok((await page.evaluate(()=>__fairness7.view().w))<1,"Microstate zoom should be supported");
  await page.locator("#resetMap").click();
  assert.equal(await page.evaluate(()=>__fairness7.view().w),1440);
  await page.locator("#build").click();
  const out=await page.locator("#export").inputValue();
  assert.ok(out.includes("Barbados")&&out.includes("Monaco")&&out.includes("San Marino"));
  assert.ok(out.includes("Direct country")===false);
  assert.ok(!out.includes("github_pat_"));
  assert.equal(await page.locator("#copy").isEnabled(),true);
  assert.deepEqual(errors,[]);
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+" seven-case acceptance: pin/broad area, preliminary scoring, preferences, zoom, persistence, export, no GitHub");
 }finally{await browser.close()}
}
await test(chromium,false);
await test(webkit,true);
