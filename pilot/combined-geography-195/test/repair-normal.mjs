import {chromium,webkit} from "playwright";
import {PNG} from "pngjs";
import fs from "node:fs";
import assert from "node:assert/strict";

const BASE="http://127.0.0.1:8765/pilot/combined-geography-195/";
const M=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
const root="pilot/combined-geography-195/test/screenshots";
fs.mkdirSync(root,{recursive:true});
const id=n=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
function identity(q){return {kind:"wcg.combined195.identity.v2",version:2,manifest:M.version,
 q,attempt_id:id(q),countryText:"Synthetic country "+q,capitalText:"Synthetic capital "+q}}
function target(q,commentId,mode){return {kind:"wcg.combined195.target.v1",version:1,
 manifest:M.version,q,identity_attempt_id:id(q),identity_comment_id:commentId,
 target:{q,iso:["AA","BB","CC","DD","EE"][q-1],name:"Synthetic target "+q,
  flag:M.questions[q-1].flag,mode,area:mode==="broad_area"?"CARIBBEAN":null}}}
const pins={1:{lon:-62.124,lat:13.521},2:{lon:8.462,lat:43.771},4:{lon:58.112,lat:-21.339}};
function geo(q,mode){return {kind:"wcg.combined195.geography.v2",version:2,manifest:M.version,
 q,attempt_id:id(q+200),identity_attempt_id:id(q),iso:["AA","BB","CC","DD","EE"][q-1],
 geography:mode==="broad_area"?{mode,choice:"CARIBBEAN"}:{mode,point:pins[q]}}}
function initialHistory(pendingBroad=false){
 const comments=[];let n=500;
 function push(v,actor="amrsilver82"){
  const row={id:n++,body:JSON.stringify(v),user:{login:actor},created_at:"2026-10-14T10:00:00Z"};
  comments.push(row);return row;
 }
 for(let q=1;q<=4;q++){
  const first=push(identity(q));const mode=q===3?"broad_area":"country_pin";
  push(target(q,first.id,mode),"github-actions[bot]");push(geo(q,mode));
 }
 if(pendingBroad){const first=push(identity(5));push(target(5,first.id,"broad_area"),"github-actions[bot]")}
 return {comments,nextId:n,push};
}
const paint=(png,x,y)=>{
 const px=Math.max(0,Math.min(png.width-1,Math.floor(x))),py=Math.max(0,Math.min(png.height-1,Math.floor(y)));
 const i=(py*png.width+px)*4;return [...png.data.subarray(i,i+3)];
};
async function capture(page,name,elementSel=null){
 await page.evaluate(()=>{document.querySelectorAll("img").forEach(img=>img.loading="eager")});
 await page.waitForFunction(()=>[...document.querySelectorAll(".flagPic img")].every(i=>i.complete&&i.naturalWidth>0));
 // Playwright screenshot({animations:'disabled'}) avoids illegal inline CSS under strict CSP.
 const bytes=await page.screenshot({fullPage:true,animations:"disabled"});
 const png=PNG.sync.read(bytes);
 const vp=page.viewportSize();
 assert.equal(png.width,vp.width,"Screenshot physical width must match viewport");
 assert.ok(png.height>=vp.height&&bytes.length>18000,"Full-page screenshot contains actual flag cards/map, not a blank page");
 if(elementSel){
  const b=await page.locator(elementSel).boundingBox();
  const y=b.y+await page.evaluate(()=>scrollY);
  assert.ok(y>=0&&y<png.height,"Screenshot includes actual inspected element");
 }
 const matte=await page.locator(".flagPic").first().boundingBox();
 const my=matte.y+await page.evaluate(()=>scrollY);
 assert.deepEqual(paint(png,matte.x+8,my+8),[226,232,240],"Actual screenshot flag matte pixels must be light gray");
 fs.writeFileSync(root+"/"+name+".png",bytes);
 return png;
}
async function openPage(engine,mobile,seed){
 const browser=await engine.launch();
 const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:
  {viewport:{width:1365,height:900}});
 await context.addInitScript(()=>Object.defineProperty(navigator,"clipboard",
  {configurable:true,value:{writeText:async value=>{window.__copied=value}}}));
 const history=initialHistory(seed);
 const posts=[],urls=[];
 await context.route("https://api.github.com/**",async route=>{
  const request=route.request(),url=new URL(request.url());urls.push(url.pathname);
  if(url.pathname.endsWith("/issues/5")&&request.method()==="GET")return route.fulfill({status:200,json:{number:5,state:"open"}});
  if(url.pathname.endsWith("/issues/5/comments")&&request.method()==="GET"){
   const n=Number(url.searchParams.get("page")||1);
   return route.fulfill({status:200,json:history.comments.slice((n-1)*100,n*100)});
  }
  if(url.pathname.endsWith("/issues/5/comments")&&request.method()==="POST"){
   const ev=JSON.parse(JSON.parse(request.postData()).body);posts.push(ev);
   const saved=history.push(ev);
   if(ev.kind==="wcg.combined195.identity.v2"){
    const mode=seed?"broad_area":"country_pin";
    history.push(target(ev.q,saved.id,mode),"github-actions[bot]");
   }
   return route.fulfill({status:201,json:{id:saved.id}});
  }
  return route.fulfill({status:403,json:{message:"Denied in synthetic Issues-only fixture"}});
 });
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(BASE+"?v=repair-visual-fixture",{waitUntil:"networkidle"});
 await page.waitForFunction(()=>window.__combined195?.getAtlasReady(),null,{timeout:45000});
 return {browser,context,page,history,posts,urls,errors};
}
async function doRun(engine,mobile){
 const kind=mobile?"mobile-webkit":"desktop-chromium";
 const s=await openPage(engine,mobile,false);
 const {page,posts,urls,errors}=s;
 try{
  // Real screen layout: full-size canonical flags and exactly one shared map after cards.
  const info=await page.evaluate(()=>{
   const cards=document.querySelector("#cards"),a=document.querySelector("#activePanel"),
    auth=document.querySelector(".panel.auth"),header=document.querySelector("#finishPrimary");
   const b=cards.getBoundingClientRect(),ab=a.getBoundingClientRect();
   const flags=[...cards.querySelectorAll(".flagPic img")];
   return {cards:cards.children.length,inputs:cards.querySelectorAll("input[type=text]").length,
    twoColumns:getComputedStyle(cards).gridTemplateColumns.trim().split(/\s+/).length,
    flags:flags.map(img=>({width:img.getBoundingClientRect().width,height:img.getBoundingClientRect().height})),
    isAtlasVisible:!!a.querySelector("svg#atlas")?.getBoundingClientRect().width,
    order:!!(cards.closest(".panel").compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING)&&
     !!(a.compareDocumentPosition(auth)&Node.DOCUMENT_POSITION_FOLLOWING),
    mapAfterCards:ab.top>=b.bottom,
    topAction:!!(header.compareDocumentPosition(cards)&Node.DOCUMENT_POSITION_FOLLOWING)};
  });
  assert.equal(info.cards,10);assert.equal(info.inputs,20);
  assert.equal(info.twoColumns,mobile?1:2);
  assert.ok(info.flags.every(v=>v.width>150&&v.width<=420.5&&v.height>120));
  assert.ok(info.isAtlasVisible&&info.order&&info.mapAfterCards&&info.topAction);
  await capture(page,kind+"-01-local-flags-atlas","#atlas");
  await page.locator("#countryInput").fill("Unscored test Q1");
  await page.locator("#capitalInput").fill("Unscored capital Q1");
  await page.locator('[data-question="2"] .locateQuestion').click();
  await page.locator("#countryInput").fill("Unscored test Q2");
  await page.locator("#capitalInput").fill("Unscored capital Q2");
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  let b=await page.locator("#atlas").boundingBox();
  if(mobile)await page.touchscreen.tap(b.x+b.width*.52,b.y+b.height*.48);
  else await page.mouse.click(b.x+b.width*.52,b.y+b.height*.48);
  assert.equal(await page.locator("#pinLayer circle").count(),1);
  const point=await page.evaluate(()=>__combined195.getLocalTrial().geography.find(([q])=>q===2)[1].point);
  await capture(page,kind+"-02-selected-local-pin","#pinLayer");
  await page.locator('[data-question="1"] .locateQuestion').click();
  assert.equal(await page.locator("#pinLayer circle").count(),0,"Q2 pin cannot migrate to Q1");
  await page.locator('[data-question="2"] .locateQuestion').click();
  assert.equal(await page.locator("#pinLayer circle").count(),1,"Q2 pin restored");
  assert.equal(await page.locator("#trialPinStatus").innerText(),"Q2 pin: "+point.lon.toFixed(3)+", "+point.lat.toFixed(3));
  assert.equal(posts.length,0);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195.getAtlasReady());
  assert.equal(await page.locator("#pinLayer circle").count(),1,"Q2 local pin recovered after reload");
  assert.equal(await page.locator("#countryInput").inputValue(),"Unscored test Q2");
  assert.equal(posts.length,0);
  // Private Issue #5: exactly four COMPLETED synthetic triplets, next Q5.
  await page.locator("#credential").fill("github_pat_synthetic_Only");
  await page.locator("#connect").click();
  await page.waitForFunction(()=>__combined195.getStatus().connected&&__combined195.getStatus().accepted===4);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),5);
  assert.equal(await page.locator("#cards input[type=text]").count(),20,"Saved Q1–Q4 must have read-only fields directly under flags");
  for(let q=1;q<=4;q++){
   assert.equal(await page.locator('[data-question="'+q+'"] input').count(),2);
   assert.equal(await page.locator('[data-question="'+q+'"] input').first().getAttribute("readonly"),"");
   assert.equal(await page.locator('[data-question="'+q+'"] .inspectSaved').count(),1);
  }
  const expectedCount=posts.length,viewBefore=await page.evaluate(()=>__combined195.getWorldView());
  await page.locator("#countryInput").fill("Live Q5 draft");
  await page.locator("#capitalInput").fill("Draft Q5 capital");
  await capture(page,kind+"-03-remote-four-saved","#cards");
  await page.locator('[data-question="2"] .inspectSaved').click();
  assert.match(await page.locator("#activeTitle").innerText(),/Saved Q2/);
  assert.equal(await page.locator("#atlas").isVisible(),true);
  assert.equal(await page.locator("#pinLayer circle").count(),1);
  const saved= pins[2],cx=(saved.lon+180)*4,cy=(90-saved.lat)*4;
  const xy=await page.locator("#pinLayer circle").first().evaluate(el=>({x:+el.getAttribute("cx"),y:+el.getAttribute("cy")}));
  assert.ok(Math.abs(xy.x-cx)<.01&&Math.abs(xy.y-cy)<.01,"Read-only marker coordinates equal GitHub event");
  assert.equal(await page.locator("#submit").isHidden(),true);
  assert.equal(await page.locator("#clearPin").isDisabled(),true);
  assert.match(await page.locator("#mapStatus").innerText(),/Saved Q2 pin.*read-only/);
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  b=await page.locator("#atlas").boundingBox();
  if(mobile)await page.touchscreen.tap(b.x+b.width*.35,b.y+b.height*.55);
  else await page.mouse.click(b.x+b.width*.35,b.y+b.height*.55);
  assert.equal(await page.locator("#pinLayer circle").first().getAttribute("cx"),String(cx));
  assert.equal(posts.length,expectedCount);
  await capture(page,kind+"-04-readonly-saved-pin","#pinLayer");
  await page.locator('[data-question="3"] .inspectSaved').click();
  assert.equal(await page.locator("#atlas").isVisible(),true);
  assert.equal(await page.locator("#pinLayer circle").count(),0);
  assert.equal(await page.locator("#areaRow").isVisible(),true);
  assert.equal(await page.locator("#areaSelect").inputValue(),"CARIBBEAN");
  assert.equal(await page.locator("#areaSelect").isDisabled(),true);
  assert.match(await page.locator("#mapStatus").innerText(),/Saved Q3 broad area/);
  await page.locator("#zoomIn").click();
  assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<1440);
  await capture(page,kind+"-05-readonly-saved-area","#atlas");
  await page.locator("#returnToActive").click();
  assert.equal(await page.locator("#countryInput").inputValue(),"Live Q5 draft");
  assert.equal(await page.locator("#capitalInput").inputValue(),"Draft Q5 capital");
  assert.equal(await page.locator("#countryInput").isEnabled(),true);
  assert.deepEqual(await page.evaluate(()=>__combined195.getWorldView()),viewBefore);
  assert.equal(await page.locator("#returnToActive").isHidden(),true);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),5);
  assert.equal(posts.length,expectedCount,"Viewing saved questions creates zero GitHub POSTs");
  // Target for current Q5 is released only after the saved identity + trusted bot receipt.
  assert.equal(await page.evaluate(()=>__combined195.getTarget()),null);
  await page.locator("#lockIdentity").click();
  try{
   await page.waitForFunction(()=>__combined195.getStatus().identitySaved&&__combined195.getTarget()?.q===5,null,{timeout:8000});
  }catch(e){
   const probe=await page.evaluate(()=>({
    state:__combined195.getStatus(),target:__combined195.getTarget(),
    info:document.querySelector("#questionStatus").textContent,
    auth:document.querySelector("#authStatus").textContent,
    lock:{disabled:document.querySelector("#lockIdentity").disabled,hidden:document.querySelector("#lockIdentity").hidden},
    fields:{country:document.querySelector("#countryInput").value,capital:document.querySelector("#capitalInput").value}
   }));
   console.error("REPAIR_Q5_TRANSITION_DIAGNOSTIC",JSON.stringify({probe,postKinds:posts.map(p=>({kind:p.kind,q:p.q})),commentKinds:s.history.comments.map(c=>({id:c.id,kind:JSON.parse(c.body).kind,q:JSON.parse(c.body).q,actor:c.user?.login}))}));
   throw e;
  }
  assert.equal(posts.length,expectedCount+1);
  assert.equal(await page.evaluate(()=>__combined195.getTarget().mode),"country_pin");
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  b=await page.locator("#atlas").boundingBox();
  if(mobile)await page.touchscreen.tap(b.x+b.width*.4,b.y+b.height*.56);
  else await page.mouse.click(b.x+b.width*.4,b.y+b.height*.56);
  assert.equal(await page.locator("#submit").isEnabled(),true);
  const livePin=await page.locator("#pinLayer circle").first().evaluate(el=>el.getAttribute("cx"));
  await page.locator('[data-question="1"] .inspectSaved').click();
  await page.locator("#returnToActive").click();
  assert.equal(await page.locator("#pinLayer circle").first().getAttribute("cx"),livePin);
  assert.equal(await page.locator("#submit").isEnabled(),true,"Q5 unsent pin preserved after inspection");
  assert.equal(posts.length,expectedCount+1);
  await page.locator("#finishBatch").click();
  assert.match(await page.locator("#finishStatus").innerText(),/Batch not complete/);
  assert.equal(posts.length,expectedCount+1);
  assert.equal(urls.some(x=>x.includes("/contents/")),false,"Original Issues-only token never reads Contents");
  assert.deepEqual(errors,[]);
  console.log("PASS "+kind+" NORMAL saved Q1–Q4 inspect pin/area, local switching and reload, pending Q5 preserved, secure reveal and no duplicate posts, pixel-checked screenshots");
 }finally{await s.browser.close()}
 // Separate verified BROAD-AREA Q5 with the same four immutable event triplets.
 const bctx=await openPage(engine,mobile,true);
 try{
  const page=bctx.page;
  await page.locator("#credential").fill("github_pat_synthetic_Only");
  await page.locator("#connect").click();
  await page.waitForFunction(()=>__combined195.getStatus().accepted===4&&__combined195.getTarget()?.mode==="broad_area");
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),5);
  assert.equal(await page.locator("#atlas").isVisible(),true,"Verified broad-area Q5 MUST keep atlas");
  assert.equal(await page.locator(".mapFrame").isVisible(),true);
  assert.equal(await page.locator("#areaSelect").inputValue(),"","Blank means unanswered, not zero");
  assert.equal(await page.locator("#submit").isDisabled(),true);
  assert.equal(await page.locator("#clearPin").isHidden(),true);
  const before=await page.evaluate(()=>__combined195.getWorldView());
  await page.locator("#zoomIn").click();
  assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<before.w);
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  const bb=await page.locator("#atlas").boundingBox();
  if(mobile)await page.touchscreen.tap(bb.x+bb.width*.3,bb.y+bb.height*.5);
  else await page.mouse.click(bb.x+bb.width*.3,bb.y+bb.height*.5);
  assert.equal(await page.locator("#pinLayer circle").count(),0,"Broad-area click cannot create country pin");
  assert.equal(await page.locator("#submit").isDisabled(),true);
  await page.locator("#areaSelect").selectOption("CARIBBEAN");
  assert.equal(await page.locator("#submit").isEnabled(),true);
  await page.locator("#resetWorld").click();
  assert.equal(await page.evaluate(()=>__combined195.getWorldView().w),1440);
  assert.equal(await page.locator("#areaSelect").inputValue(),"CARIBBEAN");
  await capture(page,kind+"-06-broad-verified-always-visible","#atlas");
  await page.locator("#finishBatch").click();
  assert.match(await page.locator("#finishStatus").innerText(),/Batch not complete/);
  assert.equal(bctx.posts.length,0,"Browse, inspect and copy must not POST");
  assert.equal(bctx.urls.some(x=>x.includes("/contents/")),false);
  assert.deepEqual(bctx.errors,[]);
  console.log("PASS "+kind+" NORMAL verified broad-area Atlas visible, pan/zoom/world reset, no pin, region save gated, screenshot pixels");
 }finally{await bctx.browser.close()}
}
await doRun(chromium,false);
await doRun(webkit,true);
