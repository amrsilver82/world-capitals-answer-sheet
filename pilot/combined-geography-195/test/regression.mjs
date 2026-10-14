import {chromium,webkit} from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/combined-geography-195/";
const m=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
const used=new Set(),iso=[];
for(let i=0;i<195;i++){let c=i===0?"KW":i===1?"MC":String.fromCharCode(65+Math.floor(i/26),65+i%26);
 while(used.has(c))c=String.fromCharCode(65+Math.floor((i+31)/26),65+(i+31)%26);
 used.add(c);iso.push(c)}
const assets={entries:m.questions.map((q,i)=>({q:q.q,country:i===0?"Kuwait":i===1?"Monaco":"Country "+q.q,public_asset:q.flag.slice(6),source_path:"flags/"+iso[i]+".svg"}))};
const classified={countries:assets.entries.map((x,i)=>({iso2:iso[i],name:x.country,mode:"country_pin"}))};
const base64=o=>Buffer.from(JSON.stringify(o)).toString("base64");
async function run(browserType,mobile){
 const browser=await browserType.launch();
 try{
 const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1365,height:900}});
 const comments=[],requests=[];let seq=100;
 await ctx.route("https://api.github.com/**",async r=>{
  const req=r.request(),url=req.url();requests.push(url);
  if(url.includes("/contents/START_HERE.md"))return r.fulfill({status:200,json:{content:base64({safe:true})}});
  if(url.includes("/contents/v2/edition3-asset-map.json"))return r.fulfill({status:200,json:{content:base64(assets)}});
  if(url.includes("/contents/experiments/location-pilot/GEOGRAPHY_195_CLASSIFICATION"))return r.fulfill({status:200,json:{content:base64(classified)}});
  if(url.endsWith("/issues/5"))return r.fulfill({status:200,json:{number:5,state:"open"}});
  if(url.includes("/comments?"))return r.fulfill({status:200,json:comments});
  if(url.endsWith("/issues/5/comments")&&req.method()==="POST"){
   const data=JSON.parse(req.postData());
   comments.push({id:seq++,body:data.body,created_at:"2026-10-13T12:00:00Z"});
   return r.fulfill({status:201,json:{id:seq-1}});
  }
  return r.fulfill({status:404,json:{}});
 });
 const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.waitForFunction(()=>__combined195?.getAtlasReady(),null,{timeout:40000});
 assert.equal(await page.evaluate(()=>__combined195.getCount()),195);
 assert.ok(m.questions.every(q=>Object.keys(q).join(",")==="q,flag"));
 assert.equal(await page.locator("#batchNext").isDisabled(),true);
 assert.equal(await page.locator(".flagPic img").count(),10);
 assert.equal(await page.locator("#geoControls").isHidden(),true,"Full 195-country authenticated question flow unchanged");
 assert.equal(await page.locator("#countryInput").isEnabled(),true,"Country editable before login");
 assert.equal(await page.locator("#capitalInput").isEnabled(),true,"Capital editable before login");
 assert.equal(await page.locator("#cards .card").count(),10);
 assert.equal(await page.locator('#cards input[type="text"]').count(),20,"Ten cards each have Country and Capital inputs");
 assert.equal(await page.locator("#geoControls").isVisible(),true,"Atlas visible before login");
 assert.equal(await page.locator("#atlas").isVisible(),true);
 assert.equal(await page.locator("#submit").isHidden(),true,"No geography save before identity");
 assert.equal(await page.locator("#lockIdentity").isDisabled(),true,"No save without GitHub auth");
 assert.ok(await page.evaluate(()=>!!(document.querySelector("#activePanel").compareDocumentPosition(document.querySelector(".panel.auth"))&Node.DOCUMENT_POSITION_FOLLOWING)),
   "Flag cards -> atlas -> GitHub connection order");
 await page.locator("#countryInput").fill("Kuwait");
 await page.locator("#capitalInput").fill("Kuwait City");
 await page.locator('[data-question="2"] input').nth(0).fill("Monaco");
 await page.locator('[data-question="2"] input').nth(1).fill("Monaco");
 assert.equal(requests.length,0,"No GitHub calls merely from typing");
 await page.locator("#zoomIn").click();
 assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<1440,"Map zoom must work before authentication");
 await page.locator("#resetWorld").click();
 assert.equal(requests.filter(x=>x.includes("/contents/")).length,0);
 await page.locator("#credential").fill("github_pat_mockOnly");
 await page.locator("#connect").click();
 await page.waitForFunction(()=>__combined195.getStatus().connected);
 assert.equal(await page.locator("#countryInput").inputValue(),"Kuwait","Answer retained on connect");
 assert.equal(await page.locator("#capitalInput").inputValue(),"Kuwait City","Capital retained on connect");
 assert.equal(await page.locator('[data-question="2"] input').nth(0).inputValue(),"Monaco","Next flag draft retained");
 assert.equal(await page.locator('[data-question="2"] input').nth(1).inputValue(),"Monaco","Next capital draft retained");
 assert.equal(requests.filter(x=>x.includes("edition3-asset-map")||x.includes("GEOGRAPHY_195_CLASSIFICATION")).length,0,"No answer-key lookup before first saved identity");
 await page.locator("#countryInput").fill("Kuwait");
 await page.locator("#capitalInput").fill("Kuwait City");
 await page.locator("#lockIdentity").click();
 await page.waitForFunction(()=>__combined195.getStatus().identitySaved,{timeout:15000});
 assert.equal(comments.length,1);
 assert.equal(JSON.parse(comments[0].body).kind,"wcg.combined195.identity.v2");
 await page.waitForFunction(()=>__combined195.getTarget()?.iso==="KW",{timeout:40000});
 assert.equal(await page.locator("#countryInput").isDisabled(),true);
 assert.equal(await page.locator("#unlockIdentity").isHidden(),true);
 assert.match(await page.locator("#geoPrompt").innerText(),/Kuwait/);
 for(let i=0;i<12;i++)await page.locator("#zoomIn").click();
 assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<=.25);
 await page.locator("#resetWorld").click();
 await page.locator("#atlas").scrollIntoViewIfNeeded();
 const rect=await page.locator("#atlas").boundingBox();
 const x=rect.x+(47.5+180)/360*rect.width,y=rect.y+(90-29.3)/180*rect.height;
 if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await page.waitForFunction(()=>!document.getElementById("submit").disabled);
 assert.ok(await page.locator("#pinLayer circle").count()>0,"Selected pin visible");
 assert.equal(await page.locator("#clearPin").isEnabled(),true);
 await page.locator("#clearPin").click();
 assert.equal(await page.locator("#pinLayer circle").count(),0,"Clear removes pin");
 assert.equal(await page.locator("#clearPin").isDisabled(),true);
 assert.equal(await page.locator("#submit").isDisabled(),true,"Cannot submit cleared pin");
 if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
 await page.waitForFunction(()=>!document.getElementById("submit").disabled);
 assert.ok(await page.locator("#pinLayer circle").count()>0,"Pin replacement works");
 await page.locator("#submit").click();
 await page.waitForFunction(()=>__combined195.getStatus().accepted===1);
 assert.equal(comments.length,2);
 assert.equal(JSON.parse(comments[1].body).kind,"wcg.combined195.geography.v2");
 assert.equal(await page.evaluate(()=>__combined195.getStatus().next),2);
 await page.reload({waitUntil:"networkidle"});
 assert.equal(await page.evaluate(()=>__combined195.getStatus().connected),false);
 await page.locator("#credential").fill("github_pat_mockOnly");
 await page.locator("#connect").click();
 await page.waitForFunction(()=>__combined195.getStatus().connected);
 assert.equal(await page.evaluate(()=>__combined195.getStatus().next),2);
 const second=await ctx.newPage();second.on("pageerror",e=>errors.push(e.message));
 await second.goto(URL,{waitUntil:"networkidle"});
 await second.locator("#credential").fill("github_pat_mockOnly");
 await second.locator("#connect").click();
 await second.waitForFunction(()=>__combined195.getStatus().connected);
 await page.locator("#countryInput").fill("Monaco");
 await page.locator("#capitalInput").fill("Monaco");
 await second.locator("#countryInput").fill("Monaco");
 await second.locator("#capitalInput").fill("Monaco");
 await page.locator("#lockIdentity").click();
 await page.waitForFunction(()=>__combined195.getStatus().identitySaved);
 await second.locator("#lockIdentity").click();
 await second.waitForFunction(()=>__combined195.getStatus().identitySaved);
 assert.equal(comments.length,3,"Stale client must not create duplicate identity event");
 await page.waitForFunction(()=>__combined195.getTarget()?.iso==="MC");
 await second.waitForFunction(()=>__combined195.getTarget()?.iso==="MC");
 // Borderline Monaco: 20–60km may NEVER be shown as an automatic wrong or zero.
 await page.locator("#resetWorld").click();
 assert.equal(await page.evaluate(()=>__combined195.getWorldView().w),1440);
 await page.locator("#atlas").scrollIntoViewIfNeeded();
 // A full-world SVG gives ~0.3–0.5 degrees per screen pixel; user must zoom for microstate precision.
 // Desktop exercises pointer-centered wheel zoom. Mobile uses the visible, user-triggered
 // + Zoom UI after an actual touchscreen tap; neither device receives target prezoom.
 if(mobile){
  const initial=await page.evaluate(()=>{
   const svg=document.getElementById("atlas"),p=svg.createSVGPoint();
   p.x=(7.05+180)*4;p.y=(90-43.60)*4;
   const a=p.matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y};
  });
  await page.touchscreen.tap(initial.x,initial.y);
  await page.waitForFunction(()=>!document.getElementById("submit").disabled);
  for(let i=0;i<11;i++){
   await page.locator("#zoomIn").click();
   await page.locator("#atlas").scrollIntoViewIfNeeded();
   const refined=await page.evaluate(()=>{
    const svg=document.getElementById("atlas"),p=svg.createSVGPoint();
    p.x=(7.05+180)*4;p.y=(90-43.60)*4;
    const a=p.matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y};
   });
   const bounds=await page.locator("#atlas").boundingBox();
   assert.ok(refined.x>=bounds.x&&refined.x<=bounds.x+bounds.width&&
     refined.y>=bounds.y&&refined.y<=bounds.y+bounds.height,
     "The user-chosen pin must remain visible through manual zoom");
   await page.touchscreen.tap(refined.x,refined.y);
  }
 }else{
  for(let i=0;i<24;i++){
   const where=await page.evaluate(()=>{
    const svg=document.getElementById("atlas"),p=svg.createSVGPoint();
    p.x=(7.05+180)*4;p.y=(90-43.60)*4;
    const a=p.matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y};
   });
   await page.mouse.move(where.x,where.y);
   await page.mouse.wheel(0,-300);
   await page.waitForTimeout(10);
  }
 }
 assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<(mobile?1:40),
   "Microstate test must manually zoom before pin placement");
 await page.locator("#atlas").scrollIntoViewIfNeeded();
 const {bx,by}=await page.evaluate(()=>{
  const svg=document.getElementById("atlas"),p=svg.createSVGPoint();
  p.x=(7.05+180)*4;p.y=(90-43.60)*4;
  const a=p.matrixTransform(svg.getScreenCTM());
  return {bx:a.x,by:a.y};
 });
 if(mobile)await page.touchscreen.tap(bx,by);else await page.mouse.click(bx,by);
 await page.waitForFunction(()=>!document.getElementById("submit").disabled);
 await page.locator("#submit").click();
 await page.waitForFunction(()=>__combined195.getStatus().accepted===2);
 assert.equal(comments.length,4);
 const actualPin=JSON.parse(comments[3].body).geography.point;
 assert.ok(Math.abs(actualPin.lon-7.05)<.05&&Math.abs(actualPin.lat-43.60)<.05,"Geography pin click mismatch: "+JSON.stringify(actualPin));
 assert.match(await page.locator("#questionStatus").innerText(),/BORDERLINE.*Human referee review required.*NO automatic score/i);
 assert.deepEqual(errors,[]);
 console.log("PASS "+browserType.name()+" "+(mobile?"mobile":"desktop")+" — two-stage protected metadata, no source leaks, country locked before reveal, geography, restore, stale client");
 }finally{await browser.close()}
}
await run(chromium,false);
await run(webkit,true);
