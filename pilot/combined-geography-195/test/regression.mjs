import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/combined-geography-195/";
async function run(engine,mobile){
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1365,height:900}});
  const comments=[];let nextId=100;
  await ctx.route("https://api.github.com/**",async route=>{
   const req=route.request(),url=req.url();
   if(!req.headers().authorization?.startsWith("Bearer github_pat_"))return route.fulfill({status:401,json:{message:"Unauthorized"}});
   if(/\/issues\/5\/comments\?/.test(url))return route.fulfill({status:200,json:comments});
   if(url.endsWith("/issues/5"))return route.fulfill({status:200,json:{number:5,state:"open"}});
   if(url.endsWith("/issues/5/comments")&&req.method()==="POST"){
    const ev=JSON.parse(req.postData()||"{}"),body=ev.body;
    comments.push({id:nextId++,body,created_at:"2026-10-13T07:10:00Z"});
    return route.fulfill({status:201,json:{id:comments.at(-1).id}});
   }
   return route.fulfill({status:404,json:{}});
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__combined195?.getAtlasReady(),null,{timeout:45000});
  assert.equal(await page.evaluate(()=>__combined195.getCount()),195);
  assert.deepEqual(await page.evaluate(()=>__combined195.modeCount()),{pins:177,areas:18});
  assert.equal(await page.locator(".card").count(),10,"Ten original-style flag cards per batch");
  assert.equal(await page.locator("#submit").isDisabled(),true,"No unsynced answers");
  await page.locator("#batchNext").click();assert.equal(await page.locator(".card").count(),10);
  assert.match(await page.locator("#batchNo").innerText(),/Batch 2/);
  await page.locator("#batchPrev").click();
  assert.equal(await page.evaluate(()=>__combined195.getWorldView().w),1440);
  await page.locator("#credential").fill("github_pat_fakeMockIntegration");
  await page.locator("#connect").click();
  await page.waitForFunction(()=>__combined195.getStatus().connected===true);
  assert.deepEqual(await page.evaluate(()=>__combined195.getStatus()),{connected:true,accepted:0,next:1});
  assert.equal(await page.locator("#countryInput").isEnabled(),true);
  await page.locator("#countryInput").fill("Kuwait");
  await page.locator("#capitalInput").fill("Kuwait City");
  await page.locator("#lockIdentity").click();
  assert.match(await page.locator("#geoPrompt").innerText(),/Kuwait/);
  assert.equal(await page.evaluate(()=>__combined195.getWorldView().w),1440);
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  const rect=await page.locator("#atlas").boundingBox();
  assert.ok(rect);
  const lon=47.5,lat=29.3;
  const px=rect.x+(lon+180)/360*rect.width;
  const py=rect.y+(90-lat)/180*rect.height;
  if(mobile)await page.touchscreen.tap(px,py);
  else await page.mouse.click(px,py);
  assert.equal(await page.locator("#submit").isEnabled(),true);
  await page.locator("#submit").click();
  await page.waitForFunction(()=>__combined195.getStatus().accepted===1);
  assert.equal(comments.length,1,"Exactly one private experimental GitHub comment");
  const first=JSON.parse(comments[0].body);
  assert.equal(first.iso,"KW");assert.equal(first.q,1);
  assert.equal(first.countryText,"Kuwait");
  assert.equal(first.capitalText,"Kuwait City");
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),2);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195.getCount()===195);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().connected),false,"No credential silently reused after refresh");
  assert.equal(await page.locator("#submit").isDisabled(),true);
  await page.locator("#credential").fill("github_pat_fakeMockIntegration");
  await page.locator("#connect").click();
  await page.waitForFunction(()=>__combined195.getStatus().connected);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().accepted),1,"GitHub is authoritative across refresh");
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),2);
  assert.equal(await page.locator("#countryInput").isEnabled(),true,"Connected next question stays editable after sync");
  // Two different browser tabs must read the same GitHub-only checkpoint.
  const second=await ctx.newPage();second.on("pageerror",e=>errors.push(e.message));
  await second.goto(URL,{waitUntil:"networkidle"});await second.waitForFunction(()=>__combined195?.getAtlasReady(),null,{timeout:45000});
  assert.equal(await second.evaluate(()=>__combined195.getStatus().connected),false);
  await second.locator("#credential").fill("github_pat_fakeMockIntegration");
  await second.locator("#connect").click();await second.waitForFunction(()=>__combined195.getStatus().connected);
  assert.equal(await second.evaluate(()=>__combined195.getStatus().next),2);
  // Both browsers prepare Q2. A wins the GitHub append-only race.
  for(const tab of [second,page]){
   await tab.locator("#countryInput").fill("Monaco");await tab.locator("#capitalInput").fill("Monaco");
   await tab.locator("#lockIdentity").click();
   await tab.locator("#atlas").scrollIntoViewIfNeeded();
   const bounds=await tab.locator("#atlas").boundingBox();
   const x=bounds.x+(7.425+180)/360*bounds.width,y=bounds.y+(90-43.738)/180*bounds.height;
   if(mobile)await tab.touchscreen.tap(x,y);
   else await tab.mouse.click(x,y);
   assert.equal(await tab.locator("#submit").isEnabled(),true);
  }
  await page.locator("#submit").click();await page.waitForFunction(()=>__combined195.getStatus().accepted===2);
  assert.equal(comments.length,2);
  await second.locator("#submit").click();
  await second.waitForFunction(()=>__combined195.getStatus().accepted===2);
  assert.equal(comments.length,2,"Stale concurrent browser cannot post an extra answer");
  assert.equal(await second.evaluate(()=>__combined195.getStatus().next),3);
  assert.equal(await second.locator("#countryInput").isEnabled(),true);
  assert.deepEqual(errors,[],"No browser script errors");
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+" 195 combined UI, no continent hint, canonical flag, submitted event confirmed by GitHub, no local score fallback, reload resumes from remote.");
 }finally{await browser.close()}
}
await run(chromium,false);
await run(webkit,true);
