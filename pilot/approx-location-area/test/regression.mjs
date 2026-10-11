import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/approx-location-area/";
async function tap(page,lon,lat,mobile){
 const svg=page.locator("#map");await svg.scrollIntoViewIfNeeded();
 const p=await svg.evaluate((s,{lon,lat})=>{const a=s.createSVGPoint();a.x=(lon+180)*4;a.y=(90-lat)*4;const b=a.matrixTransform(s.getScreenCTM());return{x:b.x,y:b.y}},{lon,lat});
 if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
}
async function run(type,mobile){
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__areaTrial&&document.querySelectorAll("#countries path").length>=170,{timeout:20000});
  assert.equal(await page.locator(".card").count(),10);
  await page.waitForFunction(()=>__areaTrial.getHiResStatus().ready,null,{timeout:25000});
  const hires=await page.evaluate(()=>__areaTrial.getHiResStatus());
  assert.ok(hires.features>=200,"10m country inventory missing: "+JSON.stringify(hires));
  assert.ok(hires.germanyVertices>=1000,"German border detail missing: "+JSON.stringify(hires));
  const seamCheck=await page.evaluate(()=>{
    const f=worldHiRes.features.find(x=>x.id==="FJ");
    let originalCrossings=0,unwrappedLongEdges=0,unwrappedBadClosures=0,maxUnwrapped=0;
    for(const poly of f.polys)for(const ring of poly){
      if(ring.length<2)continue;
      for(let i=1;i<ring.length;i++)if(Math.abs(ring[i][0]-ring[i-1][0])>180)originalCrossings++;
      const d=path([ring],0);
      const matches=[...d.matchAll(/[ML](-?[0-9.]+),(-?[0-9.]+)/g)];
      const points=matches.map(z=>({x:Number(z[1]),y:Number(z[2])}));
      for(let i=1;i<points.length;i++){
        const dx=Math.abs(points[i].x-points[i-1].x);
        maxUnwrapped=Math.max(maxUnwrapped,dx);
        if(dx>720)unwrappedLongEdges++;
      }
      if(points.length>1&&Math.abs(points[0].x-points.at(-1).x)>720)unwrappedBadClosures++;
    }
    return {originalCrossings,unwrappedLongEdges,unwrappedBadClosures,maxUnwrapped};
  });
  assert.ok(seamCheck.originalCrossings>=4,"Expected real Fiji antimeridian source segments");
  assert.equal(seamCheck.unwrappedLongEdges,0,"Fiji seam still renders lines across the map: "+JSON.stringify(seamCheck));
  assert.equal(seamCheck.unwrappedBadClosures,0,"Fiji polygon closure draws a cross-world stripe: "+JSON.stringify(seamCheck));
  console.log("DATELINE_FIX_PASS "+JSON.stringify(seamCheck));
  const seamAudit=await page.evaluate(()=>{
    const issues=[];
    for(const country of worldHiRes.features) for(const [pi,poly] of country.polys.entries())for(const [ri,ring] of poly.entries()){
      for(let i=1;i<ring.length;i++){
        const a=ring[i-1],b=ring[i],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);
        if(dx>=80||dy>=65){
          issues.push({country:country.id,pi,ri,dx:+dx.toFixed(3),dy:+dy.toFixed(3),a,b});
        }
      }
    }
    return {count:issues.length,examples:issues.slice(0,30),pacific:issues.filter(x=>x.a[1]>-35&&x.a[1]<25||x.b[1]>-35&&x.b[1]<25).slice(0,35)};
  });
  console.log("SEAM_DIAG "+JSON.stringify(seamAudit));

  assert.equal(await page.locator(".zoneCell").count(),0,"There must be no rigid zone grid");
  await page.locator("#openMap-5").click();
  await page.locator('[data-view="Africa"]').click();
  assert.match(await page.locator("#mapResolution").innerText(),/1:10m/);
  await tap(page,18,15,mobile);
  const left=await page.evaluate(()=>__areaTrial.getState()[4].point);
  assert.ok(Math.abs(left.lon-18)<1.2&&Math.abs(left.lat-15)<1.2,JSON.stringify(left));
  await tap(page,22,15,mobile);
  const right=await page.evaluate(()=>__areaTrial.getState()[4].point);
  assert.ok(Math.abs(right.lon-22)<1.2&&Math.abs(right.lat-15)<1.2,JSON.stringify(right));
  assert.equal(await page.locator("#locationCount").innerText(),"1 / 10 locations selected");
  await page.locator("#openMap-1").click();
  await page.locator('[data-view="Pacific"]').click();
  await tap(page,167,-.52,mobile);
  const island=await page.evaluate(()=>__areaTrial.getState()[0].point);
  assert.ok(Math.abs(island.lon-167)<1.2&&Math.abs(island.lat+.52)<1.2);
  await page.locator('[data-view="World"]').click();
  assert.ok(await page.locator("#choiceBadges .pinBadge").count()>=2,"Both prior pins should be visible in shared world viewport");
  const before=await page.locator("#map").getAttribute("viewBox");
  await page.locator("#openMap-3").click();
  assert.equal(await page.locator("#map").getAttribute("viewBox"),before);
  await page.locator("#radiusChoice").selectOption("800");
  assert.equal(await page.evaluate(()=>__areaTrial.getRadius()),800);
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[2].radiusKm),800);
  assert.deepEqual(await page.evaluate(()=>__areaTrial.getState()[0].point),island);
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[2].radiusKm),800);
  await page.locator("#openMap-5").click();
  assert.equal(await page.locator("#radiusChoice").inputValue(),"500","Chad must keep independent radius");
  await page.locator("#radiusChoice").selectOption("300");
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[4].radiusKm),300);
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[2].radiusKm),800);
  await page.locator("#build").click();
  assert.match(await page.locator("#reply").innerText(),/Approximate location: P:/);
  await page.reload({waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__areaTrial);
  assert.deepEqual(await page.evaluate(()=>__areaTrial.getState()[0].point),island);
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+type.name()+" "+(mobile?"mobile WebKit":"desktop Chromium")+" — no grid, Chad either side, Pacific water click, persistent numbered choices and radius controls.");
 }finally{await browser.close()}
}
await run(chromium,false);await run(webkit,true);

async function refereeMode(engine,mobile){
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const page=await context.newPage();
  await page.goto(URL+"?referee=1",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__areaTrial&&REFEREE_PILOT,{timeout:20000});
  assert.equal(await page.locator(".card").count(),10);
  assert.match(await page.locator("#title").innerText(),/Geography Referee/);
  assert.equal(await page.locator("#locationCount").innerText(),"0 / 10 locations selected");
  await page.locator("#openMap-1").click();
  await page.locator('[data-view="Africa"]').click();
  const svg=page.locator("#map");await svg.scrollIntoViewIfNeeded();
  const p=await svg.evaluate(s=>{let a=s.createSVGPoint();a.x=(19+180)*4;a.y=(90-16)*4;let z=a.matrixTransform(s.getScreenCTM());return{x:z.x,y:z.y}});
  if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  const code=await page.evaluate(()=>__areaTrial.getState()[0].location);
  assert.match(code,/^P:/);
  await page.locator("#build").click();
  assert.match(await page.locator("#reply").innerText(),/1\. Approximate location: P:/);
  await page.reload({waitUntil:"networkidle"});
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[0].location),code);
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>window.__areaTrial);
  assert.equal(await page.evaluate(()=>__areaTrial.getState()[0].location),null,
    "Referee mode must be isolated from prior normal prototype answers");
  console.log("PASS "+engine.name()+" "+(mobile?"mobile":"desktop")+" isolated 10-location referee practice mode");
 }finally{await browser.close()}
}
await refereeMode(chromium,false);
await refereeMode(webkit,true);
