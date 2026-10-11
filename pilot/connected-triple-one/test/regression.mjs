import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/connected-triple-one/";
const API="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/4";
const PAT="github_pat_MOCK_ONLY";
async function run(browserType,small){
 const browser=await browserType.launch({headless:true});
 try{
  const context=await browser.newContext(small?{viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,isMobile:true}:{viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errors=[],events=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://api.github.com/**",route=>{
   const req=route.request(),url=req.url(),method=req.method();
   if(!url.startsWith(API))return route.abort();
   const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"accept,authorization,content-type,x-github-api-version","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
   if(method==="OPTIONS")return route.fulfill({status:204,headers});
   if(url===API)return route.fulfill({status:200,headers,body:JSON.stringify({number:4,state:"open",title:"EXPERIMENTAL — One-country connected Flag + Capital + Atlas demonstration"})});
   if(method==="GET")return route.fulfill({status:200,headers,body:JSON.stringify(events.map((e,i)=>({id:i+1,body:JSON.stringify(e)})))});
   if(method==="POST"){
    const record=JSON.parse(JSON.parse(req.postData()).body);events.push(record);
    return route.fulfill({status:201,headers,body:JSON.stringify({id:events.length})});
   }
  });
  const responses=[];page.on("response",r=>{if(/world.json|targets.json|675210ec5524.svg/.test(r.url()))responses.push({url:r.url(),status:r.status()})});
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#land path").length>=177*3,{timeout:20000});
  assert.equal(await page.locator("#country").inputValue(),"");
  assert.equal(await page.locator("#capital").inputValue(),"");
  assert.equal(await page.locator("#atlasPrompt").isHidden(),true);
  assert.equal(await page.locator("#map").getAttribute("aria-label"),"Unlabeled interactive world map with neutral country markers");
  assert.ok(responses.every(r=>r.status===200),JSON.stringify(responses));
  await page.locator("#country").fill("Tuvalu");
  await page.locator("#capital").fill("Funafuti");
  await page.locator("#continueBtn").click();
  await page.waitForFunction(()=>document.querySelector("#atlasPrompt").hidden===false);
  assert.equal(await page.locator("#viewLabel").innerText(),"World view","No target-specific regional jump");
  assert.equal(await page.locator("#submitBtn").isDisabled(),true);
  await page.locator('button[data-region="Pacific"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.marker[data-iso="TV"]').length>0);
  const count=await page.locator("#micro .marker").count();assert.ok(count>=10,"Not enough neutral Pacific markers");
  const names=await page.locator("#micro").textContent();assert.equal(names.trim(),"","Premature island labels");
  const candidates=page.locator('.marker[data-iso="TV"] circle');
  let selected=false;
  await page.locator("#map").scrollIntoViewIfNeeded();
  for(const c of await candidates.all()){
   const rect=await c.boundingBox(),outer=await page.locator("#map").boundingBox();
   if(rect&&outer&&rect.x>=outer.x+1&&rect.x<outer.x+outer.width-1&&rect.y>=outer.y+1&&rect.y<outer.y+outer.height-1){
    await c.click({timeout:5000});selected=true;break;
   }
  }
  assert.ok(selected,"No reachable Tuvalu marker");
  assert.equal(await page.locator("#submitBtn").isEnabled(),true);
  assert.doesNotMatch(await page.locator("#choiceStatus").innerText(),/Tuvalu/,"Selected marker leaked the target");
  await page.locator("#submitBtn").click();
  assert.match(await page.locator("#scoreHeading").innerText(),/3\/3/);
  assert.equal(await page.locator("#atlasState").innerText(),"Practice evaluation complete");
  await page.locator("#pat").fill(PAT);
  await page.locator("#connect").click();
  await page.waitForFunction(()=>document.querySelector("#syncStatus").textContent.includes("1 completed"),null,{timeout:10000});
  assert.equal(events.length,1);
  assert.equal(events[0].choice,"TV");
  assert.equal(events[0].capital,"Funafuti");
  await page.locator("#restartBtn").click();
  assert.equal(await page.locator("#country").inputValue(),"");
  assert.equal(await page.locator("#capital").inputValue(),"");
  assert.equal(events.length,1,"Reset must not alter saved results");
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+browserType.name()+" "+(small?"mobile":"desktop")+" Flag→Country→Capital→Atlas, anonymous markers, world-start, saved completion, replay and reset.");
 }finally{await browser.close()}
}
await run(chromium,false);
await run(webkit,true);
