import fs from "node:fs";
import assert from "node:assert/strict";
import {replay,eventFor,githubClient,EVENT_KIND,ISSUE} from "../sync.mjs";
const manifest=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
assert.equal(manifest.questions.length,195);
assert.equal(new Set(manifest.questions.map(x=>x.iso)).size,195);
assert.equal(manifest.questions.filter(x=>x.mode==="country_pin").length,177);
assert.equal(manifest.questions.filter(x=>x.mode==="broad_area").length,18);
assert.equal(ISSUE,5);
const flagPaths=manifest.questions.map(x=>x.flag);
assert.equal(flagPaths.length,new Set(flagPaths).size,"Canonical flag assets must be unique");
assert.ok(flagPaths.every(x=>/^..\/..\/flags\/canonical\/[0-9a-f]{12}\.svg$/.test(x)),"Bad canonical flag mapping");
const sample=(q,id,geography)=>{
 const item=manifest.questions[q-1];return eventFor(item,manifest,{countryText:item.name,capitalText:"not graded",geography},id.padEnd(24,"a"));
};
const events=[];const add=e=>events.push({id:1000+events.length,body:JSON.stringify(e),created_at:"2026-10-13T07:10:00Z"});
add(sample(1,"1111",{mode:"country_pin",point:{lon:47.5,lat:29.3}}));
add(sample(1,"2222",{mode:"country_pin",point:{lon:47.2,lat:29.4}})); // stale duplicate q1
add(sample(2,"3333",{mode:"country_pin",point:{lon:7.4,lat:43.7}}));
add(sample(3,"4444",{mode:"country_pin",point:{lon:12.5,lat:-7}})); // q3 Angola, valid
let x=replay(events,manifest);assert.equal(x.accepted.length,3);assert.equal(x.next.q,4);assert.equal(x.rejected,1);
add(sample(3,"4444",{mode:"country_pin",point:{lon:12.5,lat:-7}})); // retry must deduplicate
x=replay(events,manifest);assert.equal(x.accepted.length,3);
const answers=manifest.questions.slice(3).map((q,i)=>sample(q.q,String(i+5000),q.mode==="country_pin"?{mode:"country_pin",point:{lon:0,lat:0}}:{mode:"broad_area",choice:"PACIFIC_OCEAN"}));
for(const e of answers)add(e);
x=replay(events,manifest);assert.equal(x.accepted.length,195);assert.equal(x.next,null);
assert.equal(x.accepted[194].q,195);
const future=sample(195,"abc0",{mode:"country_pin",point:{lon:0,lat:0}});
add(future);assert.equal(replay(events,manifest).accepted.length,195);
const authHeaders=[];let comments=[];
const fake=async(url,opt)=>{
 authHeaders.push(opt.headers);
 if(url.endsWith("/5"))return {ok:true,json:async()=>({number:5,state:"open"})};
 if(url.includes("/comments?"))return {ok:true,json:async()=>comments};
 if(url.endsWith("/5/comments")&&opt.method==="POST"){
  const obj=JSON.parse(opt.body);comments.push({id:100+comments.length,body:obj.body,created_at:"2026-10-13T07:10:00Z"});return{ok:true,json:async()=>({id:comments.at(-1).id})};
 }
 return{ok:false,status:404};
};
const client=githubClient("github_pat_testCredOnly",fake);
assert.equal(await client.verify(),true);
await client.post(sample(1,"abcf",{mode:"country_pin",point:{lon:47.5,lat:29.3}}));
assert.equal(replay(await client.comments(),manifest).next.q,2);
assert.ok(authHeaders.every(x=>x.Authorization==="Bearer github_pat_testCredOnly"));
assert.ok(!JSON.stringify(comments).includes("testCredOnly"),"Never write token in issue comment");
console.log("PASS 195 canonical flags and modes; GitHub Issue #5 append-only event replay/ordering/dedupe/stale, 195 complete, restricted-token HTTP, no token in comments.");
