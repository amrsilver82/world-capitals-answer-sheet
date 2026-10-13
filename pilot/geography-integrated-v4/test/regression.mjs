import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/geography-integrated-v4/";
async function check(browserType,mobile){
 const browser=await browserType.launch();
 try{
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});
  const page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem("wcg-geography-fairness-scored-v3",JSON.stringify({current:19,records:Array.from({length:20},(_,i)=>({point:i===0?{lon:9.8,lat:50.9}:null,areaChoice:i===11?"atlantic":i===19?"europe":null,revealed:i===0||i===11||i===19}))}))});
  await page.goto(URL,{waitUntil:"networkidle"});await page.waitForFunction(()=>window.__geoFun?.version===4&&window.__areaTrial?.getHiResStatus().ready,null,{timeout:30000});
  assert.equal(await page.locator(".geoCard").count(),22);
  assert.equal(await page.locator(".geoCard:visible").count(),10,"imported Q20 should show Q11-20 as a ten-card batch");
  assert.equal(await page.locator("#funCountry").innerText(),"Vatican City");
  assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  assert.equal(await page.locator("#activeQuestion").innerText(),"Question 20 / 22");
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[11].revealed),false,"Cabo Verde old area should not become scored country pin");
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[19].revealed),false,"Vatican old area should not become scored pin");
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[0].revealed),true,"Compatible historic country answer must persist");
  await page.locator("#v4BatchNav button").first().click();
  assert.equal(await page.locator(".geoCard:visible").count(),10);
  assert.ok((await page.locator("#geoCard1 img").getAttribute("src")).includes("flags/canonical/"));
  await page.locator("#geoCard2 button").click();assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  await page.locator("#funAreaChoice").selectOption("pacific");await page.locator("#funReveal").click();
  assert.equal(await page.evaluate(()=>__geoFun.getGrade(1).points),1);
  await page.reload({waitUntil:"networkidle"});await page.waitForFunction(()=>__geoFun?.version===4);
  assert.equal(await page.evaluate(()=>__geoFun.getRecord()[1].revealed),true);
  assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  
  const untouched=await page.evaluate(()=>__geoFun.getRecord());
  await page.locator("#geoModeAudit summary").click();
  assert.equal(await page.locator("[data-audit-iso]").count(),5);
  assert.ok((await page.evaluate(()=>__geoFun.getAuditUpgradeNames())).includes("Fiji"));
  await page.locator('[data-audit-iso="FJ"]').click();
  assert.equal(await page.evaluate(()=>__geoFun.getAuditFocus()),"Fiji");
  assert.deepEqual(await page.evaluate(()=>__geoFun.getRecord()),untouched,"Review must not change user answers");
  await page.locator("#auditReturn").click();
  assert.equal(await page.evaluate(()=>__geoFun.getAuditFocus()),null);
  assert.equal(await page.evaluate(()=>__geoFun.getMapMode()),"World");
  assert.deepEqual(await page.evaluate(()=>__geoFun.getRecord()),untouched);
  assert.deepEqual(errors,[]);
  console.log("PASS integrated V4 "+browserType.name()+" "+(mobile?"mobile":"desktop")+" — original flag cards, no continent hints, dynamic Q label, broad-area grading, legacy isolation");
 }finally{await browser.close()}
}
await check(chromium,false);await check(webkit,true);


async function regressionV4Persistence(engine,mobile){
 const browser=await engine.launch();
 try{
  const ctx=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});
  const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  // Exact regression: original V4 load() mistakenly treated legitimate 22-record state
  // as V3 and removed country pins/reveals from Q12/Q14/Q20.
  await page.addInitScript(()=>{
   const base=Array.from({length:22},()=>({point:null,areaChoice:null,revealed:false,legacy:null}));
   base[11]={point:{lon:-24,lat:15},areaChoice:"atlantic",revealed:false,legacy:{areaChoice:"atlantic",revealed:true}};
   base[13]={point:{lon:7.2,lat:43.7},areaChoice:"mediterranean",revealed:false,legacy:{areaChoice:"mediterranean",revealed:true}};
   base[19]={point:{lon:13,lat:41.9},areaChoice:"europe",revealed:true,legacy:{areaChoice:"europe",revealed:true}};
   base[20]={point:{lon:14.3,lat:37.2},areaChoice:null,revealed:true,legacy:null};
   base[21]={point:{lon:16.3,lat:38.6},areaChoice:null,revealed:true,legacy:null};
   localStorage.setItem("wcg-geography-integrated-v4",JSON.stringify({schema:4,current:21,records:base}));
  });
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.version===4&&__areaTrial.getHiResStatus().ready,null,{timeout:30000});
  const before=await page.evaluate(()=>__geoFun.getRecord());
  assert.deepEqual(before[11].point,{lon:-24,lat:15});
  assert.deepEqual(before[13].point,{lon:7.2,lat:43.7});
  assert.equal(before[19].revealed,true);
  assert.equal(before[20].revealed,true);assert.equal(before[21].revealed,true);
  await page.reload({waitUntil:"networkidle"});await page.waitForFunction(()=>__geoFun?.version===4);
  const persisted=await page.evaluate(()=>__geoFun.getRecord());
  assert.deepEqual(persisted,before,"Reload must never clear normal V4 country-pins and revealed states");
  // User's private recovery payload, through URL hash and explicit user action.
  await page.evaluate(()=>{
   const r=JSON.parse(localStorage.getItem("wcg-geography-integrated-v4"));
   r.records[11].point=null;r.records[11].legacy=null;
   r.records[19].point=null;r.records[19].revealed=false;r.records[19].legacy=null;
   localStorage.setItem("wcg-geography-integrated-v4",JSON.stringify(r));
  });
  const candidate={version:1,records:[
   {q:12,name:"Cabo Verde",point:{lon:-24,lat:15},revealed:false,legacy:{areaChoice:"atlantic",revealed:true}},
   {q:20,name:"Vatican City",point:{lon:13,lat:41.9},revealed:true,legacy:{areaChoice:"europe",revealed:true}},
   {q:21,name:"Malta",point:{lon:15.5,lat:37},revealed:true}
  ]};
  const code=Buffer.from(JSON.stringify(candidate)).toString("base64url");
  await page.goto(URL+"#wcg-recover="+code,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>__geoFun?.version===4);
  assert.equal(await page.locator("#v4Recovery").isVisible(),true);
  assert.match(await page.locator("#v4RecoveryPreview").innerText(),/Q12 Cabo Verde/);
  assert.match(await page.locator("#v4RecoveryPreview").innerText(),/Q20 Vatican City/);
  assert.match(await page.locator("#v4RecoveryPreview").innerText(),/Conflict/);
  const pre=await page.evaluate(()=>__geoFun.getRecord());
  assert.equal(pre[11].point,null,"Preview must be read-only");
  await page.locator("#v4RecoveryApply").click();
  const got=await page.evaluate(()=>__geoFun.getRecord());
  assert.deepEqual(got[11].point,{lon:-24,lat:15});
  assert.equal(got[19].revealed,true);
  assert.deepEqual(got[20].point,before[20].point,"Do not overwrite newer Malta answer");
  assert.ok(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes("-pre-recovery-"))),"Pre-repair snapshot");
  await page.reload({waitUntil:"networkidle"});await page.waitForFunction(()=>__geoFun?.version===4);
  const after=await page.evaluate(()=>__geoFun.getRecord());
  assert.deepEqual(after,got,"Confirmed private-checkpoint restore must survive reload");
  assert.deepEqual(errors,[]);
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+" — no V4 reload clearing, explicit private snapshot recovery, non-destructive conflict handling, backup and reload.");
 }finally{await browser.close()}
}
await regressionV4Persistence(chromium,false);
await regressionV4Persistence(webkit,true);
