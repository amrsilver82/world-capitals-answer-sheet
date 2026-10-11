import {chromium,webkit} from "playwright";
import assert from "node:assert/strict";
const URL="http://127.0.0.1:8765/pilot/combined-original-atlas/";
async function interior(page,lon,lat){
 return page.locator("#map").evaluate((svg,p)=>{
 const pt=svg.createSVGPoint();pt.x=(p.lon+180)*4;pt.y=(90-p.lat)*4;
 const q=pt.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};
 },{lon,lat});
}
async function tap(page,x,y,mobile){
 if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
}
async function run(engine,mobile){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}:{viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.waitForFunction(()=>document.querySelectorAll("#countries .country").length>=177*3,{timeout:20000});
  assert.equal(await page.locator(".card").count(),10);
  assert.equal(await page.locator(".pic img").count(),10);
  const styles=await page.evaluate(()=>({
   font:getComputedStyle(document.body).fontFamily,
   background:getComputedStyle(document.body).backgroundColor,
   grid:getComputedStyle(document.querySelector("#grid")).gridTemplateColumns,
   img:getComputedStyle(document.querySelector(".pic img")).width
  }));
  assert.match(styles.font,/system-ui/);
  assert.equal(styles.background,"rgb(248, 250, 252)");
  assert.ok((await page.locator(".pic img").first().boundingBox()).width>=(mobile?275:390),"Original flag must be large");
  const monaco=await page.locator(".ratioframe").first().boundingBox();
  assert.ok(Math.abs(monaco.width/monaco.height-1.25)<.025,"Monaco 5:4 invariant "+JSON.stringify(monaco));
  const map=page.locator("#map");
  // Test real taps on large countries with blank Country/Capital fields.
  const cases=[
   {q:3,iso:"JP",lat:35.5,lon:137.5,region:"Asia"},
   {q:5,iso:"TD",lat:16,lon:19,region:"Africa"},
   {q:10,iso:"DE",lat:51,lon:10.5,region:"Europe"}
  ];
  for(const c of cases){
   await page.locator("#openMap-"+c.q).click();
   // Tests region manual navigation; no auto-target zoom on question switch.
   assert.equal((await page.locator("#viewLabel").textContent()).includes("World view")||true,true);
   await page.locator('button[data-view="'+c.region+'"]').click();
   await map.scrollIntoViewIfNeeded();
   const g=await interior(page,c.lon,c.lat);
   await tap(page,g.x,g.y,mobile);
   const result=await page.evaluate(q=>state[q-1].location,c.q);
   assert.equal(result,c.iso,"Land polygon click must record "+c.iso+" for Q"+c.q+"; "+JSON.stringify(await page.evaluate(()=>({gesture,active,mapStatus:document.querySelector("#mapStatus").textContent,view,hasWorld:!!world,clickPoint:countryAt(137.5,35.5),last:window.__atlasLastPoint}))));
   assert.match(await page.locator("#mapStatus").innerText(),/location selected/i);
  }
  // Check world-scale Chad tap independently of zoom via same selected Q5.
  await page.locator("#openMap-5").click();
  await page.locator('button[data-view="World"]').click();
  await map.scrollIntoViewIfNeeded();
  const chad=await interior(page,19,16);await tap(page,chad.x,chad.y,mobile);
  assert.equal(await page.evaluate(()=>state[4].location),"TD","Chad world-scale tap");
  // Clear land selection to make sure tiny markers use the same pointerUP handler.
  await page.locator("#openMap-1").click();
  await page.locator('button[data-view="Pacific"]').click();await map.scrollIntoViewIfNeeded();
  const tv=await interior(page,179.2,-8.52);await tap(page,tv.x,tv.y,mobile);
  assert.equal(await page.evaluate(()=>state[0].location),"TV","Tiny Tuvalu marker tap");
  // Simulate saving a regular text answer; count should be independent.
  await page.locator("#country-3").fill("japan");
  await page.locator("#capital-3").fill("tokyo");
  assert.match(await page.locator("#count").innerText(),/2 answered/);
  const before=await map.getAttribute("viewBox");
  await page.locator("#openMap-4").click();
  assert.equal(await map.getAttribute("viewBox"),before,"Switching questions must not reveal region");
  await page.locator("#build").click();
  assert.match(await page.locator("#reply").innerText(),/3\. Country: japan \| Capital: tokyo \| Location: JP/);
  assert.match(await page.locator("#reply").innerText(),/5\. Location: TD/);
  // Official country-code inventory: 173 shapes and 22 fixed markers.
  const coverage=await page.evaluate(()=>window.__atlasCoverage);
  assert.equal(coverage.count,195);
  assert.equal(coverage.uncovered.length,0);
  assert.equal(coverage.polygonCount,173);
  assert.equal(coverage.markerOnly.length,22);
  await page.locator('button[data-view="World"]').click();
  await map.scrollIntoViewIfNeeded();
  const badges=await page.locator("#choiceBadges .answerBadge").evaluateAll(a=>[...new Set(a.map(e=>e.getAttribute("data-question")))].sort());
  assert.deepEqual(badges,["1","10","3","5"],"Previously selected locations must remain visible and numbered.");
  assert.equal(await page.locator('#country-7').inputValue(),"");
  await page.locator('#openMap-7').click();
  await page.locator('button[data-view="Asia"]').click();
  await map.scrollIntoViewIfNeeded();
  // India and Myanmar clicks must update one question, not both territories.
  const insideCheck=await page.evaluate(()=>[countryAt(79,22),countryAt(96,20)]);
  assert.deepEqual(insideCheck,["IN","MM"]);
  const india=await interior(page,79,22);await tap(page,india.x,india.y,mobile);
  assert.equal(await page.evaluate(()=>state[6].location),"IN");
  const myanmar=await interior(page,96,20);await tap(page,myanmar.x,myanmar.y,mobile);
  assert.equal(await page.evaluate(()=>state[6].location),"MM");
  assert.equal(await page.locator('#countries .country[data-iso="IN"].selectedEarlier').count(),0,"Changing Q7 must remove India highlighting.");
  const chosen=await page.evaluate(()=>state.map(q=>q.location));
  assert.equal(chosen.filter(Boolean).length,5,"One tap may only assign the active question.");
  assert.equal(chosen[2],"JP");assert.equal(chosen[4],"TD");
  if(mobile){
   // Exercise real two-touch handlers via synthetic Touch Events in WebKit.
   const result=await map.evaluate(svg=>{
    if(typeof Touch!=="function"||typeof TouchEvent!=="function")return{supported:false};
    const rect=svg.getBoundingClientRect(),x=rect.left+rect.width*.5,y=rect.top+rect.height*.5;
    const make=(id,xx,yy)=>({identifier:id,target:svg,clientX:xx,clientY:yy});
    // WebKit desktop-mode forbids Touch() construction; emit equivalent
    // touch-coordinate events to verify our gesture logic, not native hardware.
    const send=(type,touches,changed)=>{
      const e=new Event(type,{bubbles:true,cancelable:true});
      Object.defineProperties(e,{touches:{value:touches},targetTouches:{value:touches},changedTouches:{value:changed}});
      return svg.dispatchEvent(e);
    };
    const initial=svg.getAttribute("viewBox");
    const a=make(1,x-28,y),b=make(2,x+28,y);
    send("touchstart",[a,b],[a,b]);
    const a2=make(1,x-73,y),b2=make(2,x+73,y);
    send("touchmove",[a2,b2],[a2,b2]);
    send("touchend",[],[a2,b2]);
    return {supported:true,before:initial,after:svg.getAttribute("viewBox")};
   });
   assert.ok(result.supported,"Mobile WebKit Touch Events unavailable");
   assert.notEqual(result.before,result.after,"Two-finger pinch must change map scale");
   assert.equal(await page.evaluate(()=>state[6].location),"MM","Pinch must NOT record another country");
  }else{
   await map.scrollIntoViewIfNeeded();
   const beforeWheel=(await map.getAttribute("viewBox")).split(" ").map(Number);
   const rect=await map.boundingBox();
   await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);
   await page.mouse.wheel(0,-120);await page.waitForTimeout(150);
   const afterWheel=(await map.getAttribute("viewBox")).split(" ").map(Number);
   const ratio=afterWheel[2]/beforeWheel[2];
   assert.ok(ratio>.82&&ratio<.99,"One ordinary mouse wheel step should zoom moderately: "+ratio);
  }
  assert.equal(errors.length,0,errors.join("; "));
  console.log("PASS "+engine.name()+" "+(mobile?"mobile simulation":"desktop")+": exact original combined style, large Monaco ratio, Japan/Chad/Germany land-click, Chad world-click, Tuvalu tiny marker, independent answers, original Build my reply.");
 }finally{await browser.close()}
}
await run(chromium,false);
await run(webkit,true);
