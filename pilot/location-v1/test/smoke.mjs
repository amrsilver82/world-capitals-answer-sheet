import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const ROOT = 'http://127.0.0.1:8765/pilot/location-v1/';
const browser = await chromium.launch({headless:true});
const requests=[];
const questions=[
  ['TD','Africa',false],['RO','Europe',false],['MC','Europe',true],['VA','Europe',true],
  ['SM','Europe',true],['NR','Pacific West',true],['TV','Pacific West',true],
  ['KI','Pacific West',true],['TO','Pacific East',true],['PS','Middle East',false],
  ['BT','South Asia',false],['LS','Africa',false],['GM','Africa',false],
  ['TL','SE Asia',false],['FJ','Pacific West',false]
];
async function ready(page){
 await page.goto(ROOT,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelectorAll('#baselayer path').length===177,{timeout:20000});
 assert.equal(await page.locator('#detail [data-code]').count(),15);
 assert.equal(await page.locator('#maperror.on').count(),0);
}
try{
 const context=await browser.newContext({viewport:{width:1100,height:800}});
 const page=await context.newPage();
 page.on('request',r=>requests.push(r.url()));
 await ready(page);
 assert.match(await page.locator('#question').innerText(),/Chad/);

 // A wrong selection is local, retryable, and cannot reveal or commit a canonical score.
 await page.locator('#baselayer [data-code="RO"] path').first().dispatchEvent('click');
 await page.locator('#submit').click();
 assert.match(await page.locator('#status').innerText(),/Try again without a clue/);
 assert.equal(await page.locator('#progress').innerText(),'0');

 // Physical taps where possible, DOM pointer events for the full crosswalk.
 for(let i=0;i<questions.length;i++){
  const [code,region,small]=questions[i];
  await page.getByRole('button',{name:region,exact:true}).click();
  const target=small?page.locator('#marks [data-code="'+code+'"] .marker-hit').first():
                      page.locator('#detail [data-code="'+code+'"] path').first();
  assert.equal(await target.count(),1,'Missing click target '+code);
  if(small){await target.click({force:true})}
  else{await target.dispatchEvent('click')}
  assert.equal(await page.locator('#submit').isEnabled(),true,'Not selectable '+code);
  await page.locator('#submit').click();
  assert.equal(await page.locator('#progress').innerText(),String(i+1),'Progress wrong after '+code);
  if(i===1){await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#progress').innerText(),'2')}
 }
 assert.match(await page.locator('#qindex').innerText(),/finished/);
 const checkpoint=await page.evaluate(()=>localStorage.getItem('world-capitals-location-pilot-v1'));
 assert.equal(JSON.parse(checkpoint).done.length,15);
 assert.equal(JSON.parse(checkpoint).attempts[0].ok,false);
 assert.equal(JSON.parse(checkpoint).attempts.at(-1).country,'FJ');

 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mp=await mobile.newPage();await ready(mp);
 await mp.locator('details summary').click();
 await mp.locator('#paste').fill(checkpoint);
 await mp.locator('#import').click();
 assert.equal(await mp.locator('#progress').innerText(),'15');
 assert.match(await mp.locator('#importStatus').innerText(),/Restored 15/);
 await mp.reload({waitUntil:'networkidle'});
 assert.equal(await mp.locator('#progress').innerText(),'15');
 await mobile.close();

 // A broken map asset must block submission; never mark any country Wrong.
 const outage=await browser.newContext({viewport:{width:1024,height:700}});
 await outage.route('**/pilot/location-v1/data/targets.json',route=>route.abort('failed'));
 const op=await outage.newPage();await op.goto(ROOT,{waitUntil:'networkidle'});
 await op.waitForSelector('#maperror.on');
 assert.equal(await op.locator('#submit').isDisabled(),true);
 assert.match(await op.locator('#status').innerText(),/question remains unanswered/);
 assert.equal(await op.evaluate(()=>localStorage.getItem('world-capitals-location-pilot-v1')),null);
 await outage.unroute('**/pilot/location-v1/data/targets.json');
 await op.locator('#reload').click();
 await op.waitForFunction(()=>document.querySelectorAll('#baselayer path').length===177);
 assert.equal(await op.locator('#maperror.on').count(),0);
 await outage.close();

 const outside=requests.filter(u=>!u.startsWith('http://127.0.0.1:8765/'));
 assert.deepEqual(outside,[],'Unexpected third-party runtime request');
 console.log('PASS: desktop 15/15 clicks, actual microstate markers, retries, refresh, mobile restore, asset-outage recovery, 0 third-party runtime requests');
 await context.close();
}finally{await browser.close()}
