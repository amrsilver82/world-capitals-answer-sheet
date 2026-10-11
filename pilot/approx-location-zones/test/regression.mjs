import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/approx-location-zones/";
async function tapGeo(page,lon,lat,mobile){
 const map=page.locator("#map");await map.scrollIntoViewIfNeeded();
 const pt=await map.evaluate((svg,p)=>{
  const u=svg.createSVGPoint();u.x=(p.lon+180)*4;u.y=(90-p.lat)*4;
  const v=u.matrixTransform(svg.getScreenCTM());return {x:v.x,y:v.y};
 },{lon,lat});
 if(mobile)await page.touchscreen.tap(pt.x,pt.y);else await page.mouse.click(pt.x,pt.y);
}
async function run(type,mobile){
 const browser=await type.launch({headless:true});
 try{
 const page=await browser.newPage(mobile?{viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.waitForFunction(()=>window.__zoneTrial&&document.querySelectorAll(".zoneCell").length>100,{timeout:22000});
 assert.equal(await page.locator(".card").count(),10);
 assert.equal(await page.locator(".pic img").count(),10);
 assert.equal(await page.locator("#mapStatus").textContent().then(s=>s.includes("Map ready")),true);
 assert.equal(await page.locator("#viewLabel").textContent().then(s=>s.includes("World view")),true);
 const zones=await page.evaluate(()=>({
  nauru:__zoneTrial.zoneFor(166.93,-.52).code,
  kiribatiGilbert:__zoneTrial.zoneFor(172.98,1.45).code,
  tuvalu:__zoneTrial.zoneFor(179.2,-8.52).code,
  japan:__zoneTrial.zoneFor(137.5,35.5).code,
  france:__zoneTrial.zoneFor(2.35,48.86).code,
  cellCount:13*18
 }));
 assert.equal(zones.nauru,zones.kiribatiGilbert,"Nearby Pacific micro-islands share same approximate geographic zone");
 assert.notEqual(zones.japan,zones.france);
 await page.locator("#openMap-1").click();
 await page.locator('button[data-view="Pacific"]').click();
 await tapGeo(page,166.93,-.52,mobile);
 const first=await page.evaluate(()=>__zoneTrial.getState()[0].location);
 assert.equal(first,zones.nauru);
 assert.equal(await page.locator("#locationCount").innerText(),"1 / 10 zones selected");
 const mapView=await page.locator("#map").getAttribute("viewBox");
 await page.locator("#openMap-2").click();
 assert.equal(await page.locator("#map").getAttribute("viewBox"),mapView,"Question switch must not leak target viewport");
 await tapGeo(page,172.98,1.45,mobile);
 const second=await page.evaluate(()=>__zoneTrial.getState()[1].location);
 assert.equal(second,first);
 assert.equal(await page.locator("#locationCount").innerText(),"2 / 10 zones selected");
 assert.equal(await page.locator('#choiceBadges [data-question="1"]').count(),0,"Zone mode badges use different layer and attrs");
 const badgeCount=await page.locator('.zoneBadge').count();
 assert.ok(badgeCount>=2,"Both answers should remain numbered");
 await page.locator("#openMap-3").click();
 await page.locator('button[data-view="Asia"]').click();
 await tapGeo(page,137.5,35.5,mobile);
 assert.equal(await page.evaluate(()=>__zoneTrial.getState()[2].location),zones.japan);
 await page.locator("#build").click();
 assert.match(await page.locator("#reply").innerText(),/Location zone: Z/);
 assert.equal(errors.length,0,errors.join("; "));
 console.log("PASS "+type.name()+" "+(mobile?"mobile WebKit":"desktop Chromium")+": original large flags, uniform zone math, ocean/land tap, independent answers, retained numbered choices and no target-specific navigation.");
 }finally{await browser.close()}
}
await run(chromium,false);
await run(webkit,true);
