import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const SITE="http://127.0.0.1:8765/pilot/location-pacific-retest/";
const API="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/3";
const TOKEN="github_pat_MOCK_BROWSER_ONLY";
const CASES=["Nauru","Tuvalu","Kiribati","Tonga"];
async function run(engine){
 const browser=await engine.launch({headless:true});const log=[];let nextId=1;
 async function mock(route){
  const req=route.request(),u=req.url(),method=req.method();
  if(!u.startsWith(API))return route.continue();
  assert.equal(req.headers().authorization,"Bearer "+TOKEN);
  const h={"Content-Type":"application/json","Access-Control-Allow-Origin":"*",
   "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
   "Access-Control-Allow-Headers":"accept,authorization,content-type,x-github-api-version"};
  if(method==="OPTIONS")return route.fulfill({status:204,headers:h});
  if(u===API&&method==="GET")return route.fulfill({status:200,headers:h,body:JSON.stringify({number:3,state:"open"})});
  if(u.startsWith(API+"/comments")&&method==="GET"){
   const url=new globalThis.URL(u),page=Number(url.searchParams.get("page")||"1");
   return route.fulfill({status:200,headers:h,body:JSON.stringify(log.slice((page-1)*100,page*100))});
  }
  if(u===API+"/comments"&&method==="POST"){
   const e=JSON.parse(JSON.parse(req.postData()).body);
   log.push({id:nextId++,body:JSON.stringify(e),created_at:new Date().toISOString()});
   return route.fulfill({status:201,headers:h,body:JSON.stringify(log.at(-1))});
  }
  return route.fulfill({status:404,headers:h,body:"{}"});
 }
 const contexts=await Promise.all([
  browser.newContext({viewport:{width:1320,height:900}}),
  browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true})
 ]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 const errors=[];
 for(const p of pages){p.on("pageerror",e=>errors.push(e.message));await p.route("https://api.github.com/**",mock)}
 async function connect(p){
  await p.goto(SITE,{waitUntil:"networkidle"});
  await p.waitForFunction(()=>document.querySelectorAll("#land .country").length>=177*3,{timeout:20000});
  assert.match(await p.locator("#question").innerText(),/Connect GitHub/);
  await p.locator("#tokenInput").fill(TOKEN);
  await p.locator("#rememberToken").check();
  await p.locator("#connectBtn").click();
  await p.waitForFunction(()=>document.querySelector("#authStatus").textContent.includes("Connected"));
  assert.match(await p.locator("#question").innerText(),/Nauru/);
 }
 async function oceanTap(p,side,latFraction=.55){
  const box=await p.locator("#map").boundingBox();
  assert.ok(box&&box.width>100&&box.height>100);
  const x=box.x+(side==="left"?8:side==="right"?box.width-8:box.width*.55);
  const y=box.y+box.height*latFraction;
  if((await p.evaluate(()=>window.matchMedia("(pointer:coarse)").matches)))await p.touchscreen.tap(x,y);
  else await p.mouse.click(x,y);
  await p.waitForFunction(()=>document.querySelector("#selectionStatus").textContent.includes("Your pin is placed"));
  assert.equal(await p.locator("#submitBtn").isEnabled(),true);
  return{x,y,box};
 }
 async function confirm(p){
  const before=log.length;
  await p.locator("#submitBtn").click();
  await p.waitForFunction(()=>document.querySelector("#syncStatus").textContent.includes("Practice attempt saved"),null,{timeout:15000});
  await p.waitForFunction(()=>!document.querySelector("#retryBtn").hidden);
  assert.equal(log.length,before+1);
  const ev=JSON.parse(log.at(-1).body);
  assert.equal(ev.action,"attempt");assert.equal(ev.mode,"pin");
  assert.ok(ev.lon>=-180&&ev.lon<180&&ev.lat>=-90&&ev.lat<=90);
  assert.equal(await p.locator("#submitBtn").isEnabled(),false);
  return ev;
 }
 async function advance(p,name){
  await p.locator("#nextBtn").click();
  await p.waitForFunction(n=>document.querySelector("#question").textContent.includes(n),name,{timeout:15000});
 }
 try{
  const [pc,mobile]=pages;
  await connect(pc);await connect(mobile);
  assert.equal(await pc.locator("#viewName").innerText(),"Pacific Unified");
  // Verify the actual visible map has NO letterbox on PC or mobile:
  // every left/right sea edge must permit a freely placed pin.
  const sidePositions=[];
  for(const p of [pc,mobile]){
   const frame=await p.locator("#map").evaluate(svg=>({
    w:svg.getBoundingClientRect().width,h:svg.getBoundingClientRect().height,
    vb:[svg.viewBox.baseVal.width,svg.viewBox.baseVal.height]
   }));
   assert.ok(Math.abs(frame.w/frame.h-frame.vb[0]/frame.vb[1])<.025,"Unclickable ocean-looking map bands still present");
   const side=await oceanTap(p,"left");sidePositions.push(side);
   await p.locator("#clearBtn").click();
   await oceanTap(p,"right");
   await p.locator("#clearBtn").click();
  }
  // Pacific Unified must show both east and west of the Date Line on one map.
  const longitudes=await pc.locator("#map").evaluate(svg=>{
   const v=svg.viewBox.baseVal;
   return [v.x/4-180,(v.x+v.width)/4-180];
  });
  assert.ok(longitudes[0]<180&&longitudes[1]>180,"Pacific view does not cross the Date Line");
  // First committed blind answer is the left edge of the visible Pacific.
  await oceanTap(pc,"left");
  const nauru=await confirm(pc);
  assert.equal(nauru.q,1);
  assert.ok(log.every(x=>JSON.parse(x.body).pilot_id==="pacific-pin-retest-20261011"));
  // Retrying is a deliberate additional PRACTICE event, not an overwrite.
  await pc.locator("#retryBtn").click();
  assert.equal(await pc.locator("#resultBox").isHidden(),true);
  await oceanTap(pc,"right");
  const practice=await confirm(pc);
  assert.equal(practice.q,1);assert.notEqual(practice.lon,nauru.lon);
  await advance(pc,"Tuvalu");
  await mobile.locator("#refreshBtn").click();
  await mobile.waitForFunction(()=>document.querySelector("#question").textContent.includes("Tuvalu"));
  await oceanTap(mobile,"right");
  await confirm(mobile);
  await advance(mobile,"Kiribati");
  await pc.locator("#refreshBtn").click();
  await pc.waitForFunction(()=>document.querySelector("#question").textContent.includes("Kiribati"));
  // Test open sea at x beyond +180°, expecting NEGATIVE normalized longitude.
  await oceanTap(pc,"right");
  const kiribati=await confirm(pc);
  assert.ok(kiribati.lon<0,"Wrapped eastern Pacific was not normalized");
  await advance(pc,"Tonga");
  await mobile.locator("#refreshBtn").click();
  await mobile.waitForFunction(()=>document.querySelector("#question").textContent.includes("Tonga"));
  await oceanTap(mobile,"left");
  await confirm(mobile);
  await advance(mobile,"All 4 cases explored");
  await pc.reload({waitUntil:"networkidle"});
  await pc.waitForFunction(()=>document.querySelector("#question").textContent.includes("All 4 cases explored"));
  assert.equal(await pc.locator("#progress").innerText(),"4");
  assert.equal(log.length,9,"5 pin attempts + 4 next actions expected");
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("PASS "+engine.name()+": PC+mobile visible ocean edges, Date Line crossing, independent practice re-pin, 4-case shared GitHub replay and refresh.");
 }finally{await browser.close()}
}
for(const engine of [chromium,webkit])await run(engine);
