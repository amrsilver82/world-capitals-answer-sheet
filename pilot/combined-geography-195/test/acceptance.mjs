import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const url="http://127.0.0.1:8765/pilot/combined-geography-195/?acceptance=one";
const raw=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
const original=raw.questions.find(x=>x.q===67);
assert.ok(original,"New acceptance flag is available");
const used=new Set(),codes=[];
for(let i=0;i<195;i++){
 let iso=i===66?"LS":String.fromCharCode(65+Math.floor(i/26),65+i%26);
 while(used.has(iso))iso=String.fromCharCode(65+Math.floor((i+31)/26),65+(i+31)%26);
 used.add(iso);codes.push(iso);
}
const assets={entries:raw.questions.map((q,i)=>({q:q.q,country:i===66?"Lesotho":"Country "+q.q,
 public_asset:q.flag.slice(6),source_path:"flags/"+codes[i].toLowerCase()+".svg"}))};
const classification={countries:assets.entries.map((x,i)=>({iso2:codes[i],name:x.country,mode:"country_pin"}))};
const b64=o=>Buffer.from(JSON.stringify(o)).toString("base64");

async function exercise(browserType,mobile){
 const browser=await browserType.launch();
 try{
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1365,height:900}});
  const events=[{id:400,body:"Old unscored service canary; not part of this one-question test",created_at:"2026-10-13T10:14:33Z"}];
  const requests=[],errors=[];
  await context.route("https://api.github.com/**",async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   requests.push({path,method:req.method()});
   if(path.endsWith("/issues/6")&&req.method()==="GET")return route.fulfill({status:200,json:{number:6,state:"open"}});
   if(path.endsWith("/contents/START_HERE.md"))return route.fulfill({status:200,json:{content:b64({safe:true})}});
   if(path.endsWith("/contents/v2/edition3-asset-map.json"))return route.fulfill({status:200,json:{content:b64(assets)}});
   if(path.includes("/GEOGRAPHY_195_CLASSIFICATION_V3_EVIDENCE"))return route.fulfill({status:200,json:{content:b64(classification)}});
   if(path.endsWith("/issues/6/comments")&&req.method()==="POST"){
    const body=JSON.parse(req.postData()).body;
    events.push({id:400+events.length,body,created_at:"2026-10-14T07:40:00Z"});
    return route.fulfill({status:201,json:{id:events.at(-1).id}});
   }
   if(path.endsWith("/issues/6/comments")&&req.method()==="GET")return route.fulfill({status:200,json:events});
   return route.fulfill({status:404,json:{}});
  });
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__combined195?.getAtlasReady());
  assert.equal(await page.evaluate(()=>__combined195.getCount()),1);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().acceptance),true);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().connected),false,"No active question before authenticated checkpoint");
  assert.equal(await page.locator("#cards .card").count(),1,"Exactly one flag visible");
  assert.equal(await page.locator("#chatHandoff").isHidden(),true);
  assert.equal(requests.filter(x=>x.path.includes("/contents/")).length,0,"Cannot read protected target before identity");
  assert.equal(await page.locator("#activePanel").isVisible(),true);
  assert.equal(await page.locator("#geoControls").isVisible(),true,"Map must be visible before login");
  assert.equal(await page.locator("#atlas").isVisible(),true,"Actual atlas must be visible before login");
  assert.equal(await page.locator("#submit").isHidden(),true,"No geography submission before private identity");
  assert.ok(await page.evaluate(()=>!!(document.querySelector("#activePanel").compareDocumentPosition(document.querySelector(".panel.auth"))&Node.DOCUMENT_POSITION_FOLLOWING)),
    "The atlas must follow the flag and precede authentication, preserving V4 layout");
  await page.locator("#zoomIn").click();
  assert.ok((await page.evaluate(()=>__combined195.getWorldView().w))<1440,
    "User-controlled atlas zoom must work without authentication");
  await page.locator("#resetWorld").click();
  assert.equal(await page.locator("#countryInput").isEnabled(),true);
  assert.equal(await page.locator("#capitalInput").isEnabled(),true);
  assert.equal(await page.locator("#lockIdentity").isDisabled(),true);
  assert.equal(await page.locator("#cards #countryInput").count(),1,"Country input remains directly in the flag card");
  assert.equal(await page.locator("#cards #capitalInput").count(),1,"Capital input remains directly in the flag card");
  await page.locator("#countryInput").fill("Lesotho");
  await page.locator("#capitalInput").fill("Maseru");
  assert.equal(events.length,1,"Typing may not write to GitHub");

  async function connect(){
   await page.locator("#credential").fill("github_pat_testBrowserOnly");
   await page.locator("#connect").click();
   await page.waitForFunction(()=>__combined195.getStatus().connected);
  }
  await connect();
  assert.equal(await page.evaluate(()=>__combined195.getCurrent()?.q),67);
  assert.equal(await page.locator("#countryInput").inputValue(),"Lesotho","Typed answer survives GitHub login");
  assert.equal(await page.locator("#capitalInput").inputValue(),"Maseru","Typed answer survives GitHub login");
  assert.equal(await page.locator("#lockIdentity").isEnabled(),true);
  assert.equal(events.length,1);
  assert.ok(requests.every(x=>!x.path.includes("/issues/5")),"Never touch the general 195 draft issue");
  await page.locator("#lockIdentity").click();
  await page.waitForFunction(()=>__combined195.getStatus().identitySaved);
  await page.waitForFunction(()=>__combined195.getTarget()?.iso==="LS");
  assert.equal(events.length,2);
  const id=JSON.parse(events[1].body);
  assert.equal(id.countryText,"Lesotho");
  assert.equal(id.capitalText,"Maseru");
  assert.equal(id.manifest,"live-browser-github-acceptance-one-20261014-v1");
  assert.equal(await page.locator("#atlas").isVisible(),true,"The map remains visible after target confirmation");
  assert.equal(await page.locator("#submit").isVisible(),true,"Geography save button is unlocked only after identity confirmation");
  assert.equal(await page.locator("#countryInput").isDisabled(),true);
  assert.match(await page.locator("#geoPrompt").innerText(),/Lesotho/);
  // Recovery must work even if the browser closes after Country+Capital but before Geography.
  await page.reload({waitUntil:"networkidle"});
  assert.equal(await page.evaluate(()=>__combined195.getStatus().connected),false);
  await connect();
  await page.waitForFunction(()=>__combined195.getStatus().identitySaved&&__combined195.getTarget()?.iso==="LS");
  assert.equal(await page.locator("#countryInput").inputValue(),"Lesotho");
  assert.equal(await page.locator("#capitalInput").inputValue(),"Maseru");
  assert.equal(events.length,2);

  assert.equal(await page.locator("#atlas").isVisible(),true,"Map visible after reload/reconnect");
  await page.locator("#atlas").scrollIntoViewIfNeeded();
  const pin=await page.evaluate(()=>{
   const svg=document.getElementById("atlas"),p=svg.createSVGPoint();
   p.x=(28.2+180)*4;p.y=(90+29.5)*4;
   const c=p.matrixTransform(svg.getScreenCTM());
   return{x:c.x,y:c.y};
  });
  if(mobile)await page.touchscreen.tap(pin.x,pin.y);else await page.mouse.click(pin.x,pin.y);
  await page.waitForFunction(()=>!document.getElementById("submit").disabled);
  assert.ok(await page.locator("#pinLayer circle").count()>0,"Visible pin");
  await page.locator("#clearPin").click();
  assert.equal(await page.locator("#pinLayer circle").count(),0,"Clear removes marker");
  assert.equal(await page.locator("#submit").isDisabled(),true,"Cleared pin cannot be submitted");
  if(mobile)await page.touchscreen.tap(pin.x,pin.y);else await page.mouse.click(pin.x,pin.y);
  await page.waitForFunction(()=>!document.getElementById("submit").disabled);
  await page.locator("#submit").click();
  await page.waitForFunction(()=>__combined195.getStatus().accepted===1);
  assert.equal(events.length,3);
  const geo=JSON.parse(events[2].body);
  assert.equal(geo.identity_attempt_id,id.attempt_id);
  assert.equal(geo.iso,"LS");
  assert.ok(Math.abs(geo.geography.point.lon-28.2)<1.5&&Math.abs(geo.geography.point.lat+29.5)<1.5);
  assert.equal(await page.evaluate(()=>__combined195.getStatus().next),null);

  await page.reload({waitUntil:"networkidle"});
  await connect();
  await page.waitForFunction(()=>__combined195.getStatus().accepted===1);
  const proof=await page.locator("#acceptanceProof").innerText();
  assert.match(proof,/PRIVATE GITHUB CHECKPOINT VERIFIED/);
  assert.match(proof,/Country entered: Lesotho/);
  assert.match(proof,/Capital entered: Maseru/);
  assert.ok(proof.includes(String(geo.geography.point.lon))&&proof.includes(String(geo.geography.point.lat)));
  assert.match(proof,/GitHub identity comment: #401/);
  assert.match(proof,/GitHub geography comment: #402/);
  assert.equal(events.length,3,"Reload never writes duplicate events");
  assert.deepEqual(errors,[]);
  console.log("PASS "+browserType.name()+" "+(mobile?"mobile WebKit":"desktop Chromium")+" — isolated Issue #6, first/second stage, reload/reconnect exact GitHub proof");
 }finally{await browser.close()}
}
await exercise(chromium,false);
await exercise(webkit,true);
