import { chromium, webkit } from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/location-sync/";
const REPO="amrsilver82/World-Capitals-Game",TOKEN="github_pat_TEST_ONLY_NOT_A_REAL_TOKEN";
const API="https://api.github.com/repos/"+REPO+"/issues/1";
async function run(browserType){
 const browser=await browserType.launch({headless:true});
 const comments=[];let nextId=1;
 const answerWrites=[];
 const contextOpts={viewport:{width:1060,height:1000},hasTouch:true};
 const a=await browser.newContext(contextOpts),b=await browser.newContext(contextOpts);
 async function handle(route){
  const req=route.request(),url=req.url(),method=req.method();
  if(!url.startsWith(API))return route.continue();
  const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*",
   "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
   "Access-Control-Allow-Headers":"accept,authorization,content-type,x-github-api-version"};
  if(method==="OPTIONS")return route.fulfill({status:204,headers});
  assert.match(req.headers().authorization||"",/Bearer github_pat_TEST_ONLY_NOT_A_REAL_TOKEN/);
  if(url===API&&method==="GET")return route.fulfill({status:200,headers,
   body:JSON.stringify({number:1,state:"open"})});
  if(url.startsWith(API+"/comments")&&method==="GET"){
   const u=new globalThis.URL(url),page=Number(u.searchParams.get("page")||"1");
   return route.fulfill({status:200,headers,body:JSON.stringify(comments.slice((page-1)*100,page*100))});
  }
  if(url===API+"/comments"&&method==="POST"){
   const posted=JSON.parse(req.postData()),ev=JSON.parse(posted.body);
   answerWrites.push(ev);
   const comment={id:nextId++,body:posted.body,created_at:new Date().toISOString()};
   comments.push(comment);
   return route.fulfill({status:201,headers,body:JSON.stringify(comment)});
  }
  return route.fulfill({status:404,headers,body:"{}"});
 }
 await Promise.all([a.route("https://api.github.com/**",handle),b.route("https://api.github.com/**",handle)]);
 const x=await a.newPage(),y=await b.newPage();
 const errors=[];x.on("pageerror",e=>errors.push("A "+e.message));y.on("pageerror",e=>errors.push("B "+e.message));
 async function login(page,remember=true){
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#land path").length===177);
  assert.match(await page.locator("#question").innerText(),/Connect GitHub/);
  assert.equal(await page.locator("#check").isEnabled(),false);
  await page.locator("#tokenInput").fill(TOKEN);
  if(remember)await page.locator("#rememberToken").check();
  await page.locator("#connectGithub").click();
  await page.waitForFunction(()=>document.querySelector("#syncStatus").textContent.includes("Connected to private GitHub"));
  assert.match(await page.locator("#question").innerText(),/Chad/);
 }
 async function select(page,lon,lat,region){
  await page.getByRole("button",{name:region,exact:true}).click();
  const coords=await page.locator("#map").evaluate((svg,pt)=>{
   const p=svg.createSVGPoint();p.x=(pt.lon+180)*4;p.y=(90-pt.lat)*4;
   const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
  },{lon,lat});
  await page.locator("#map").evaluate((svg,p)=>{
   svg.dispatchEvent(new MouseEvent("click",{bubbles:true,clientX:p.x,clientY:p.y}));
  },coords);
  assert.equal(await page.locator("#check").isEnabled(),true);
  await page.locator("#check").click();
 }
 async function at(page,q,progress){
  await page.waitForFunction(v=>document.querySelector("#question").textContent.includes(v),q,{timeout:15000});
  assert.equal(await page.locator("#progress").innerText(),String(progress));
 }
 try{
  await login(x);await login(y);
  assert.equal(comments.length,0);
  await select(x,18.73,15.45,"Africa");
  await at(x,"Romania",1);
  assert.equal(answerWrites.length,1);
  assert.equal(answerWrites[0].country,"TD");
  // Device B gets the exact same checkpoint from private GitHub.
  await y.locator("#refreshSync").click();
  await at(y,"Romania",1);
  await select(y,24.97,45.7,"Europe");
  await at(y,"Monaco",2);
  await x.locator("#refreshSync").click();
  await at(x,"Monaco",2);
  // Persist after a new page load on both devices, without manual export.
  await x.reload({waitUntil:"networkidle"});
  await at(x,"Monaco",2);
  await y.reload({waitUntil:"networkidle"});
  await at(y,"Monaco",2);
  assert.equal(answerWrites.length,2);
  assert.equal(comments.length,2);
  // A duplicate/stale answer cannot double count the same country.
  comments.push({id:nextId++,body:JSON.stringify({...answerWrites[0],
   attempt_id:"stale-attempt-unique-0000001"}),created_at:new Date().toISOString()});
  await x.locator("#refreshSync").click();
  await at(x,"Monaco",2);
  assert.equal(errors.length,0,errors.join("\n"));
  // Disconnect clears locally held credential, not GitHub's shared score.
  await x.locator("#disconnectGithub").click();
  assert.match(await x.locator("#question").innerText(),/Connect GitHub/);
  assert.equal(await x.evaluate(()=>localStorage.getItem("wcg-location-github-pat-v1")),null);
  assert.equal(comments.length,3);
  await a.close();await b.close();
  console.log("PASS "+browserType.name()+": two devices, persistent auth, shared Q1->Q3, refresh, no duplicate, logout.");
 }finally{await browser.close()}
}
for(const engine of [chromium,webkit])await run(engine);
