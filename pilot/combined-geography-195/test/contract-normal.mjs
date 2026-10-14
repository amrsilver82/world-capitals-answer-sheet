import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const root="http://127.0.0.1:8765/pilot/combined-geography-195/";
const manifest=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
assert.equal(manifest.questions.length,195);
assert.ok(manifest.questions.every(q=>Object.keys(q).sort().join(",")==="flag,q"),"No public answers");

async function normal(browserType,mobile){
 const browser=await browserType.launch();
 try{
  const context=await browser.newContext(mobile?
    {viewport:{width:390,height:844},isMobile:true,hasTouch:true}:
    {viewport:{width:1365,height:900}});
  const calls=[],errors=[];
  await context.route("https://api.github.com/**",route=>{calls.push(route.request().url());
    return route.fulfill({status:599,json:{error:"no private token used"}})});
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(root+"?v=contract-normal",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195?.getAtlasReady(),null,{timeout:40000});
  assert.equal(await page.evaluate(()=>__combined195.getCount()),195);
  assert.equal(await page.locator("#cards .card").count(),10);
  assert.equal(await page.locator('#cards input[type="text"]').count(),20);
  assert.equal(await page.locator("#countryInput").isEnabled(),true);
  assert.equal(await page.locator("#capitalInput").isEnabled(),true);
  assert.equal(await page.locator("#atlas").isVisible(),true);
  assert.equal(await page.locator("#trialPanel").isVisible(),true);
  assert.equal(await page.locator("#submit").isHidden(),true);
  assert.equal(await page.locator("#lockIdentity").isDisabled(),true);
  assert.equal(await page.locator("#acceptancePanel").isHidden(),true);
  const data=await page.evaluate(()=>{
    const cards=document.querySelector("#cards"),map=document.querySelector("#activePanel"),
      handoff=document.querySelector("#chatHandoff"),auth=document.querySelector(".panel.auth");
    return {columns:getComputedStyle(cards).gridTemplateColumns.split(" ").length,
      mapAfter:!!(cards.closest(".panel").compareDocumentPosition(map)&Node.DOCUMENT_POSITION_FOLLOWING),
      mapBeforeHandoff:!!(map.compareDocumentPosition(handoff)&Node.DOCUMENT_POSITION_FOLLOWING),
      handoffBeforeAuth:!!(handoff.compareDocumentPosition(auth)&Node.DOCUMENT_POSITION_FOLLOWING),
      world:__combined195.getWorldView()};
  });
  assert.equal(data.columns,mobile?1:2,"Responsive normal cards");
  assert.ok(data.mapAfter&&data.mapBeforeHandoff&&data.handoffBeforeAuth,
    "Flag cards -> atlas -> handoff -> optional GitHub");
  assert.equal(data.world.w,1440);assert.equal(data.world.h,720);
  assert.equal(calls.length,0,"No token or GitHub calls merely opening the normal page");
  await page.locator("#countryInput").fill("first country draft");
  await page.locator("#capitalInput").fill("first capital draft");
  await page.locator('[data-question="2"] .locateQuestion').click();
  assert.match(await page.locator("#trialProgress").innerText(),/Selected Q2/);
  await page.locator("#countryInput").fill("second country draft");
  await page.locator("#capitalInput").fill("second capital draft");
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  const coordinates=await page.locator("#atlas").boundingBox();
  const place=async(rx,ry)=>{
   const x=coordinates.x+coordinates.width*rx,y=coordinates.y+coordinates.height*ry;
   if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  };
  await place(.55,.42);
  assert.equal(await page.locator("#clearPin").isEnabled(),true);
  assert.ok(await page.locator("#pinLayer circle").count()>0);
  let first=(await page.evaluate(()=>__combined195.getLocalTrial().geography))
    .find(([q])=>q===2)[1].point;
  await place(.66,.55);
  let second=(await page.evaluate(()=>__combined195.getLocalTrial().geography))
    .find(([q])=>q===2)[1].point;
  assert.notDeepEqual(first,second,"Replacing pin must update the actual coordinates");
  await page.locator("#clearPin").click();
  assert.equal(await page.locator("#pinLayer circle").count(),0);
  assert.equal(await page.locator("#clearPin").isDisabled(),true);
  await place(.48,.44);
  assert.equal(await page.locator("#clearPin").isEnabled(),true);
  await page.locator("#zoomIn").click();
  assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<1440);
  await page.locator("#resetWorld").click();
  assert.equal((await page.evaluate(()=>__combined195.getWorldView().w)),1440);

  await page.locator('[data-question="3"] .locateQuestion').click();
  await page.locator("#trialMethod").selectOption("broad_area");
  assert.equal(await page.locator("#trialAreaRow").isVisible(),true,"Generic broad-area trial independent of country identity");
  await page.locator("#trialArea").selectOption("CARIBBEAN");
  assert.match(await page.locator("#trialPinStatus").innerText(),/CARIBBEAN/);
  await page.locator("#trialBuild").click();
  const output=await page.locator("#trialOutput").inputValue();
  assert.match(output,/Q1 \| Country: first country draft \| Capital: first capital draft/);
  assert.match(output,/Q2 \| Country: second country draft \| Capital: second capital draft \| Geography: pin/);
  assert.match(output,/Q3 \| Country: — \| Capital: — \| Geography: area CARIBBEAN/);
  assert.match(output,/NOT synced to private GitHub/);
  assert.equal(calls.length,0,"No GitHub request during local entry, atlas, copy preparation");
  await page.locator("#trialCopy").click();
  assert.equal(calls.length,0);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195?.getAtlasReady(),null,{timeout:40000});
  assert.equal(await page.evaluate(()=>__combined195.getLocalTrial().selected),3);
  assert.equal(await page.locator("#trialMethod").inputValue(),"broad_area");
  assert.equal(await page.locator("#trialArea").inputValue(),"CARIBBEAN");
  await page.locator('[data-question="2"] .locateQuestion').click();
  assert.equal(await page.locator("#countryInput").inputValue(),"second country draft");
  assert.ok(await page.locator("#pinLayer circle").count()>0,"Browser-local pin survives reload and question switch");
  await page.locator("#trialBuild").click();
  assert.ok((await page.locator("#trialOutput").inputValue()).includes("second capital draft"));
  await page.locator("#trialClear").click();
  assert.equal(await page.locator("#countryInput").inputValue(),"");
  assert.equal(await page.evaluate(()=>__combined195.getLocalTrial().geography.length),0);
  assert.equal(calls.length,0,"No hidden authentication calls in local trial");
  assert.deepEqual(errors,[]);
  console.log("PASS normal "+browserType.name()+" "+(mobile?"mobile":"desktop")+
    " — 10 editable flag cards, atlas, local pin replace/clear, broad-area, feedback, reload, zero-token");
 }finally{await browser.close()}
}

async function finalFive(browserType,mobile){
 const events=[];
 const ID=i=>"00000000-0000-4000-8000-"+String(i).padStart(12,"0");
 const GD=i=>"10000000-0000-4000-8000-"+String(i).padStart(12,"0");
 for(let i=0;i<190;i++){
  const question=manifest.questions[i],identity={kind:"wcg.combined195.identity.v2",version:2,
    manifest:manifest.version,attempt_id:ID(i),q:question.q,countryText:"test "+i,capitalText:"test"};
  const geography={kind:"wcg.combined195.geography.v2",version:2,manifest:manifest.version,
    attempt_id:GD(i),identity_attempt_id:ID(i),q:question.q,iso:"AA",
    geography:{mode:"country_pin",point:{lon:0,lat:0}}};
  events.push({id:i*2+1,body:JSON.stringify(identity),created_at:"2026-10-14T10:00:00Z"});
  events.push({id:i*2+2,body:JSON.stringify(geography),created_at:"2026-10-14T10:00:00Z"});
 }
 const browser=await browserType.launch();
 try{
  const context=await browser.newContext(mobile?
   {viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1365,height:900}});
  const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64");
  await context.route("https://api.github.com/**",async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.endsWith("/issues/5"))return route.fulfill({status:200,json:{number:5,state:"open"}});
   if(url.pathname.endsWith("/contents/START_HERE.md"))
    return route.fulfill({status:200,json:{content:b64({safe:true})}});
   if(url.pathname.endsWith("/issues/5/comments")){
    const page=Number(url.searchParams.get("page")||1);
    return route.fulfill({status:200,json:events.slice((page-1)*100,page*100)});
   }
   return route.fulfill({status:404,json:{}});
  });
  const page=await context.newPage();
  await page.goto(root+"?v=contract-final-five",{waitUntil:"networkidle"});
  await page.locator("#credential").fill("github_pat_simulatedTestOnly");
  await page.locator("#connect").click();
  await page.waitForFunction(()=>__combined195.getStatus().connected);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().accepted),190);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),191);
  assert.equal(await page.locator("#cards .card").count(),5);
  assert.equal(await page.locator('#cards input[type="text"]').count(),10);
  assert.deepEqual(await page.locator("#cards .card").evaluateAll(es=>es.map(e=>e.dataset.question)),
   ["191","192","193","194","195"]);
  assert.equal(await page.locator("#batchNo").innerText(),"Batch 20 / 20");
  assert.equal(await page.locator("#batchNext").isDisabled(),true);
  assert.equal(await page.locator("#atlas").isVisible(),true);
  console.log("PASS final-five "+browserType.name()+" "+(mobile?"mobile":"desktop")+
   " — Q191–195, exact five cards, no extra flags, atlas");
 }finally{await browser.close()}
}
await normal(chromium,false);
await normal(webkit,true);
await finalFive(chromium,false);
await finalFive(webkit,true);
