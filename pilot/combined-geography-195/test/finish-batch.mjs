import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const root="http://127.0.0.1:8765/pilot/combined-geography-195/";
const manifest=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
const ID=i=>"00000000-0000-4000-8000-"+String(i).padStart(12,"0");
const GD=i=>"10000000-0000-4000-8000-"+String(i).padStart(12,"0");
const remote=(n)=>{
 const events=[];let commentId=1;
 for(let i=0;i<n;i++){
  const q=i+1;
  const ev={kind:"wcg.combined195.identity.v2",version:2,manifest:manifest.version,
   attempt_id:ID(i),q,countryText:"entered "+q,capitalText:"capital "+q};
  const geo={kind:"wcg.combined195.geography.v2",version:2,manifest:manifest.version,
   attempt_id:GD(i),identity_attempt_id:ID(i),q,iso:"AA",
   geography:{mode:"country_pin",point:{lon:-27.125,lat:42.25}}};
  events.push({id:commentId++,body:JSON.stringify(ev),created_at:"2026-10-14T10:00:00Z"});
  events.push({id:commentId++,body:JSON.stringify(geo),created_at:"2026-10-14T10:00:00Z"});
 }
 return events;
};
async function check(engine,mobile){
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext(mobile?
   {viewport:{width:390,height:844},isMobile:true,hasTouch:true}:
   {viewport:{width:1365,height:900}});
  await ctx.addInitScript(()=>{
   window.__copied=null;
   Object.defineProperty(navigator,"clipboard",{configurable:true,
    value:{writeText:async t=>{window.__copied=t}}});
  });
  const requests=[];
  await ctx.route("https://api.github.com/**",route=>{
   requests.push({url:route.request().url(),method:route.request().method()});
   return route.fulfill({status:403,json:{message:"Mock denies any unauthorized request"}});
  });
  const page=await ctx.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(root+"?v=finish-local",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195?.getAtlasReady(),null,{timeout:40000});
  assert.equal(await page.locator("#finishBatch").isVisible(),true);
  assert.equal(await page.locator("#cards .card").count(),10);
  assert.equal(await page.locator("#atlas").isVisible(),true);
  // Incomplete batch must be honestly labeled; all ten Qs must be present.
  await page.locator("#countryInput").fill("Kuwait");
  await page.locator("#capitalInput").fill("Kuwait City");
  await page.locator("#finishBatch").click();
  const partial=await page.locator("#finishOutput").inputValue();
  assert.match(partial,/INCOMPLETE UNSCORED LOCAL BATCH/);
  assert.match(partial,/Q1 \| Country: Kuwait \| Capital: Kuwait City \| Geography: \[MISSING\]/);
  assert.match(partial,/Q10 \| Country: \[MISSING\]/);
  assert.equal(await page.evaluate(()=>window.__copied),partial);
  assert.equal(requests.length,0);
  await page.locator("#trialMethod").selectOption("broad_area");
  await page.locator("#trialArea").selectOption("CARIBBEAN");
  await page.locator('[data-question="2"] .locateQuestion').click();
  await page.locator("#countryInput").fill("Monaco");
  await page.locator("#capitalInput").fill("Monaco");
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  const bbox=await page.locator("#atlas").boundingBox();
  if(mobile)await page.touchscreen.tap(bbox.x+bbox.width*.53,bbox.y+bbox.height*.45);
  else await page.mouse.click(bbox.x+bbox.width*.53,bbox.y+bbox.height*.45);
  const coords=await page.evaluate(()=>__combined195.getLocalTrial().geography.find(([q])=>q===2)[1].point);
  await page.locator("#finishBatch").click();
  const report=await page.locator("#finishOutput").inputValue();
  assert.match(report,/Q1 \| Country: Kuwait \| Capital: Kuwait City \| Geography: Area CARIBBEAN/);
  assert.ok(report.includes("Q2 | Country: Monaco | Capital: Monaco | Geography: Pin "+coords.lon.toFixed(3)+", "+coords.lat.toFixed(3)));
  assert.equal(await page.evaluate(()=>window.__copied),report);
  assert.equal(requests.length,0,"Local one-click report must never call GitHub");
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195?.getAtlasReady(),null,{timeout:40000});
  await page.locator("#finishBatch").click();
  const reloaded=await page.locator("#finishOutput").inputValue();
  assert.ok(reloaded.includes("Q2 | Country: Monaco | Capital: Monaco | Geography: Pin"));
  assert.equal(await page.evaluate(()=>window.__copied),reloaded);
  // Force clipboard denial: one click must still leave revealed, selected readonly text.
  await page.evaluate(()=>{Object.defineProperty(navigator,"clipboard",{configurable:true,
   value:{writeText:async()=>{throw Error("Clipboard unavailable")}}})});
  await page.locator("#finishBatch").click();
  assert.match(await page.locator("#finishStatus").innerText(),/Clipboard blocked/);
  assert.equal(await page.locator("#finishOutput").evaluate(e=>e.selectionEnd-e.selectionStart),
   (await page.locator("#finishOutput").inputValue()).length);
  assert.deepEqual(errors,[]);
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+
   " local one-click: incomplete marked, entered Country/Capital/area/pin, single-copy, reload, fallback, zero private writes");
  await ctx.close();
 }finally{await browser.close()}
}
async function verified(engine,mobile,accepted=10){
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext(mobile?
   {viewport:{width:390,height:844},isMobile:true,hasTouch:true}:
   {viewport:{width:1365,height:900}});
  await ctx.addInitScript(()=>{window.__copied=null;
   Object.defineProperty(navigator,"clipboard",{configurable:true,
    value:{writeText:async t=>{window.__copied=t}}})});
  let events=remote(accepted),writes=0,reads=0;
  await ctx.route("https://api.github.com/**",route=>{
   const r=route.request(),url=new URL(r.url());
   if(r.method()==="POST"){writes++;return route.fulfill({status:403,json:{message:"No posts allowed"}})}
   if(url.pathname.endsWith("/issues/5"))return route.fulfill({status:200,json:{number:5,state:"open"}});
   if(url.pathname.endsWith("/issues/5/comments")){reads++;
    const n=Number(url.searchParams.get("page")||1);
    return route.fulfill({status:200,json:events.slice((n-1)*100,n*100)})}
   return route.fulfill({status:404,json:{}});
  });
  const page=await ctx.newPage();
  await page.goto(root+"?v=finish-verified",{waitUntil:"networkidle"});
  await page.locator("#credential").fill("github_pat_finishMockOnly");
  await page.locator("#connect").click();
  await page.waitForFunction(n=>__combined195.getStatus().accepted===n,accepted);
  const expectedBatch=Math.floor(accepted/10);
  await page.locator("#finishBatch").click();
  const report=await page.locator("#finishOutput").inputValue();
  if(accepted<10){
   assert.equal(report,"","Incomplete GitHub batch must fail closed");
   assert.match(await page.locator("#finishStatus").innerText(),/Batch not complete/);
   assert.equal(await page.evaluate(()=>window.__copied),null);
  }else{
   assert.ok(report.includes("PRIVATE GitHub Issue #5"));
   assert.ok(report.includes("Q1 | Country entered: entered 1 | Capital entered: capital 1 | Pin: -27.125,42.250"));
   assert.ok(report.includes("Q"+(Math.floor(accepted/10)*10)+" | Country entered:"));
   assert.ok(!report.includes("correctCountry")&&!report.includes("github_pat_"));
   assert.equal(await page.evaluate(()=>window.__copied),report);
   assert.match(await page.locator("#finishStatus").innerText(),/GitHub VERIFIED draft batch/);
  }
  assert.equal(writes,0,"Copying reports never writes private GitHub");
  assert.ok(reads>=2,"One-click report rechecks current private events");
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+" verified mode "+accepted+
   " — fresh Issue read, completed-only handoff, one-click copy, zero writes");
  await ctx.close();
 }finally{await browser.close()}
}
await check(chromium,false);
await check(webkit,true);
await verified(chromium,false,9);
await verified(webkit,true,10);
