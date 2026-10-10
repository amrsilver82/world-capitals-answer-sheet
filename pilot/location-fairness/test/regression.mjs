import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const SITE="http://127.0.0.1:8765/pilot/location-fairness/";
const API="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/2";
const TOKEN="github_pat_FAKE_FOR_AUTOMATED_TESTS_ONLY";
async function run(engine){
 const browser=await engine.launch({headless:true}),log=[];let id=1;
 async function route(r){
  const req=r.request(),url=req.url(),method=req.method();
  if(!url.startsWith(API))return r.continue();
  assert.equal(req.headers().authorization,"Bearer "+TOKEN);
  const h={"Content-Type":"application/json","Access-Control-Allow-Origin":"*",
   "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
   "Access-Control-Allow-Headers":"accept,authorization,content-type,x-github-api-version"};
  if(method==="OPTIONS")return r.fulfill({status:204,headers:h});
  if(url===API&&method==="GET")return r.fulfill({status:200,headers:h,
   body:JSON.stringify({number:2,state:"open"})});
  if(url.startsWith(API+"/comments")&&method==="GET"){
   const u=new globalThis.URL(url),page=Number(u.searchParams.get("page")||"1");
   return r.fulfill({status:200,headers:h,
    body:JSON.stringify(log.slice((page-1)*100,page*100))});
  }
  if(url===API+"/comments"&&method==="POST"){
   const ev=JSON.parse(JSON.parse(req.postData()).body);
   log.push({id:id++,body:JSON.stringify(ev),created_at:new Date().toISOString()});
   return r.fulfill({status:201,headers:h,body:JSON.stringify(log.at(-1))});
  }
  return r.fulfill({status:404,headers:h,body:"{}"});
 }
 const contexts=await Promise.all([browser.newContext({viewport:{width:950,height:950},hasTouch:true}),browser.newContext({viewport:{width:430,height:844},hasTouch:true,isMobile:true})]);
 const [a,b]=await Promise.all(contexts.map(x=>x.newPage()));
 const errs=[];for(const p of [a,b]){p.on("pageerror",e=>errs.push(e.message));await p.route("https://api.github.com/**",route)}
 async function connect(page){
  await page.goto(SITE,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#land .country").length===177);
  assert.match(await page.locator("#question").innerText(),/Connect GitHub/);
  await page.locator("#tokenInput").fill(TOKEN);
  await page.locator("#rememberToken").check();
  await page.locator("#connectBtn").click();
  await page.waitForFunction(()=>document.querySelector("#authStatus").textContent.includes("Connected"));
  assert.match(await page.locator("#question").innerText(),/Monaco/);
 }
 async function touchPoint(page,lon,lat){
  await page.locator("#map").scrollIntoViewIfNeeded();
  const p=await page.locator("#map").evaluate((svg,{lon,lat})=>{
   const point=svg.createSVGPoint();point.x=(lon+180)*4;point.y=(90-lat)*4;
   const c=point.matrixTransform(svg.getScreenCTM());return {x:c.x,y:c.y};
  },{lon,lat});
  await page.touchscreen.tap(p.x,p.y);
 }
 try{
  await connect(a);await connect(b);
  await a.getByRole("button",{name:"NW Mediterranean",exact:true}).click();
  await touchPoint(a,7.44,43.74);
  assert.equal(await a.locator("#submitBtn").isEnabled(),true);
  // No correct-location reveal before the user submits.
  assert.equal(await a.locator("#resultBox").isHidden(),true);
  await a.locator("#submitBtn").click();
  await a.waitForFunction(()=>document.querySelector("#syncStatus").textContent.includes("Practice attempt saved"));
  assert.match(await a.locator("#resultText").innerText(),/Approximate distance to nearest mapped land/);
  assert.equal(log.length,1);
  assert.equal(JSON.parse(log[0].body).mode,"pin");
  assert.equal(await a.locator("#nextBtn").isEnabled(),true);
  // Compare method: exact land attempt on same microstate.
  await a.locator("#modeExact").click();
  await a.locator("#zoomIn").click();await a.locator("#zoomIn").click();
  await touchPoint(a,7.412,43.739);
  assert.equal(await a.locator("#submitBtn").isEnabled(),true);
  await a.locator("#submitBtn").click();
  await a.waitForFunction(()=>document.querySelector("#syncStatus").textContent.includes("Practice attempt saved"));
  assert.equal(JSON.parse(log.at(-1).body).mode,"exact");
  await a.locator("#nextBtn").click();
  await a.waitForFunction(()=>document.querySelector("#question").textContent.includes("Vatican City"));
  await b.locator("#refreshBtn").click();
  await b.waitForFunction(()=>document.querySelector("#question").textContent.includes("Vatican City"));
  assert.equal(await b.locator("#progress").innerText(),"1");
  // Uniform 20° region-grid method: no tiny dot needed.
  await b.locator("#modeGrid").click();
  await b.getByRole("button",{name:"Central Italy",exact:true}).click();
  await touchPoint(b,12.4533,41.9032);
  assert.equal(await b.locator("#submitBtn").isEnabled(),true);
  await b.locator("#submitBtn").click();
  await b.waitForFunction(()=>document.querySelector("#syncStatus").textContent.includes("Practice attempt saved"));
  assert.match(await b.locator("#resultText").innerText(),/20° tile/);
  await b.locator("#nextBtn").click();
  await b.waitForFunction(()=>document.querySelector("#question").textContent.includes("San Marino"));
  await a.reload({waitUntil:"networkidle"});
  await a.waitForFunction(()=>document.querySelector("#question").textContent.includes("San Marino"));
  assert.equal(await a.locator("#progress").innerText(),"2");
  assert.equal(log.length,5);
  assert.equal(errs.length,0,errs.join("; "));
  // Previously active full 15-question pilot is never accessed.
  assert.ok(log.every(c=>JSON.parse(c.body).pilot_id==="location-fairness-20261010"));
  console.log("PASS "+engine.name()+": Monaco pin+exact, Vatican 20° grid, two devices, reload, 5 GitHub events, no official scores.");
 }finally{await browser.close()}
}
for(const engine of [chromium,webkit])await run(engine);
