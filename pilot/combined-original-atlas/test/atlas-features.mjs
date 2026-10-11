import {chromium, webkit} from "playwright";
import assert from "node:assert/strict";

const URL = "http://127.0.0.1:8765/pilot/combined-original-atlas/";
async function waitReady(page) {
  await page.goto(URL, {waitUntil: "networkidle"});
  await page.waitForFunction(() => window.__atlasCoverage?.count === 195);
}
async function locate(page, lon, lat) {
  return page.locator("#map").evaluate((svg, point) => {
    const p = svg.createSVGPoint();
    p.x = (point.lon+180)*4;
    p.y = (90-point.lat)*4;
    const screen = p.matrixTransform(svg.getScreenCTM());
    return {x:screen.x,y:screen.y};
  }, {lon,lat});
}
async function tapPoint(page, lon, lat, touch=false) {
  await page.locator("#map").scrollIntoViewIfNeeded();
  const p = await locate(page,lon,lat);
  if (touch) await page.touchscreen.tap(p.x,p.y);
  else await page.mouse.click(p.x,p.y);
}
async function testCore(browserType, mobile) {
  const browser=await browserType.launch({headless:true});
  try {
    const page=await browser.newPage(mobile
      ? {viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}
      : {viewport:{width:1440,height:900}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await waitReady(page);
    const coverage=await page.evaluate(()=>window.__atlasCoverage);
    assert.equal(coverage.count,195);
    assert.deepEqual(coverage.uncovered,[]);
    assert.equal(coverage.polygonCount+coverage.markerOnly.length,195);
    assert.equal(coverage.markerOnly.length,22,"22 official states require artificial visible markers");
    assert.equal(await page.locator(".card").count(),10);
    assert.equal(await page.locator("#choiceBadges").count(),1);
    const initial=await page.evaluate(()=>state.map(s=>s.location));
    assert.ok(initial.every(x=>x===null));

    // Input specifically inside India, with Question 7 (Bhutan) active.
    // Only Question 7 may be updated. A second country selection must not result.
    await page.locator("#openMap-7").click();
    await page.locator('[data-view="Asia"]').click();
    await tapPoint(page,79,22,mobile);
    const afterIndia=await page.evaluate(()=>state.map(s=>s.location));
    assert.equal(afterIndia[6],"IN", "India must resolve only to India");
    assert.equal(afterIndia.filter(x=>x!==null).length,1,"one tap must change exactly one question slot");
    assert.equal(await page.locator('#choiceBadges [data-question="7"]').count()>0,true);
    const countryColors=await page.locator(".country.targetSelected").evaluateAll(es=>[...new Set(es.map(e=>e.getAttribute("data-iso")))]);
    assert.deepEqual(countryColors,["IN"],"Only India should have active-country styling");

    // User's next question retains the India selection; Japan selection
    // must not erase it, and the map shouldn't reveal a new target location.
    const before=await page.locator("#map").getAttribute("viewBox");
    await page.locator("#openMap-3").click();
    assert.equal(await page.locator("#map").getAttribute("viewBox"),before);
    await tapPoint(page,137.5,35.5,mobile);
    const afterJapan=await page.evaluate(()=>state.map(s=>s.location));
    assert.equal(afterJapan[2],"JP");
    assert.equal(afterJapan[6],"IN");
    assert.equal(afterJapan.filter(Boolean).length,2);
    assert.ok((await page.locator('#choiceBadges [data-question="3"]').count())>0);
    assert.ok((await page.locator('#choiceBadges [data-question="7"]').count())>0);
    const badges=await page.locator("#choiceBadges").textContent();
    assert.ok(badges.includes("3")&&badges.includes("7"));
    assert.doesNotMatch(badges,/India|Japan|Bhutan/,"Previously chosen answers must not leak names");

    // Duplicate geographic choices are permitted in the design pilot, but
    // the warning must make them visible and not overwrite the previous answer.
    await page.locator("#openMap-8").click();
    await tapPoint(page,79,22,mobile);
    assert.equal(await page.evaluate(()=>state[7].location),"IN");
    assert.equal(await page.evaluate(()=>state[6].location),"IN");
    assert.match(await page.locator("#mapStatus").innerText(),/Already selected/);
    assert.equal(await page.evaluate(()=>state.filter(s=>s.location).length),3);

    // Complete 195-country union does not mean full audited official map,
    // but all required country IDs must be represented by polygon or marker.
    const geometryCheck=await page.evaluate(()=>{
      const mapped=new Set([...world.features,...detail.features].map(f=>f.id));
      const marked=new Set(MARKERS.map(m=>m[0]));
      return {
        official:OFFICIAL_195_CODES.length,
        unique:new Set(OFFICIAL_195_CODES).size,
        orphan:OFFICIAL_195_CODES.filter(x=>!mapped.has(x)&&!marked.has(x)),
        duplicates:MARKERS.map(m=>m[0]).filter((x,i,a)=>a.indexOf(x)!==i),
        india:countryAt(79,22),
        myanmar:countryAt(96,20),
        bangladesh:countryAt(90,23.5),
        japan:countryAt(137.5,35.5),
        germany:countryAt(10.5,51),
        chad:countryAt(19,16)
      };
    });
    assert.equal(geometryCheck.official,195);
    assert.equal(geometryCheck.unique,195);
    assert.deepEqual(geometryCheck.orphan,[]);
    assert.deepEqual(geometryCheck.duplicates,[]);
    for(const [k,v] of Object.entries({india:"IN",myanmar:"MM",bangladesh:"BD",japan:"JP",germany:"DE",chad:"TD"}))
      assert.equal(geometryCheck[k],v,k+" land polygon incorrectly assigned");

    if(!mobile) {
      await page.locator("#map").scrollIntoViewIfNeeded();
      const map=page.locator("#map");
      const rect=await map.boundingBox();
      await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
      const before=await page.evaluate(()=>view.w);
      await page.mouse.wheel(0,-120);
      const after=await page.evaluate(()=>view.w);
      assert.ok(after<before&&after/before>.83,
        "One wheel notch should zoom moderately, not wildly: "+before+" → "+after);
      const b=await page.evaluate(()=>state.map(s=>s.location));
      await page.mouse.move(rect.x+rect.width*.56,rect.y+rect.height*.48);
      await page.mouse.down();
      await page.mouse.move(rect.x+rect.width*.68,rect.y+rect.height*.48,{steps:5});
      await page.mouse.up();
      assert.deepEqual(await page.evaluate(()=>state.map(s=>s.location)),b,
        "Drag must not accidentally select a second country");
    } else {
      // WebKit's synthetic two-finger touches exercise application pinch
      // handling without pretending to be a physical iPhone/iPad check.
      await page.locator("#map").scrollIntoViewIfNeeded();
      const size=await page.locator("#map").boundingBox();
      const diff=await page.evaluate(({cx,cy})=>{
        const svg=document.querySelector("#map");
        const touch=(id,x,y)=>new Touch({identifier:id,target:svg,clientX:x,clientY:y});
        const emit=(type,touches,changed)=>svg.dispatchEvent(new TouchEvent(type,{
          bubbles:true,cancelable:true,touches,targetTouches:touches,changedTouches:changed
        }));
        const startW=view.w;
        const a=touch(1,cx-25,cy),b=touch(2,cx+25,cy);
        emit("touchstart",[a,b],[a,b]);
        const c=touch(1,cx-62,cy),d=touch(2,cx+62,cy);
        emit("touchmove",[c,d],[c,d]);
        emit("touchend",[],[c,d]);
        return {startW,endW:view.w};
      },{cx:size.x+size.width*.52,cy:size.y+size.height*.5});
      assert.ok(diff.endW<diff.startW,"Pinch-out must zoom in, rather than select location: "+JSON.stringify(diff));
      assert.equal(await page.evaluate(()=>state.filter(s=>s.location).length),3,
        "Pinch zoom should not create a country selection");
    }

    // Existing answers in browser-local preview should survive a reload.
    await page.reload({waitUntil:"networkidle"});
    await page.waitForFunction(()=>window.__atlasCoverage?.count===195);
    const afterReload=await page.evaluate(()=>state.map(x=>x.location));
    assert.equal(afterReload[2],"JP");
    assert.equal(afterReload[6],"IN");
    assert.equal(afterReload[7],"IN");
    assert.equal(errors.length,0,errors.join("; "));
    console.log("PASS "+browserType.name()+" "+(mobile?"mobile WebKit simulation":"desktop Chromium")+
      " — 195 IDs covered, one country per tap, 3 retained numbered markers, interior India/Japan and neighbors, duplicate warning, zoom/pinch, reload.");
  } finally {await browser.close()}
}
await testCore(chromium,false);
await testCore(webkit,true);
