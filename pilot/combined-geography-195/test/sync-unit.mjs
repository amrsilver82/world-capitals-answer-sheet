import fs from "node:fs";
import assert from "node:assert/strict";
import {replay,eventFor,EVENT_KIND,GEO_EVENT_KIND} from "../sync.mjs";
const m=JSON.parse(fs.readFileSync("pilot/combined-geography-195/data/questions.json","utf8"));
assert.equal(m.questions.length,195);
assert.ok(m.questions.every(x=>Object.keys(x).join(",")==="q,flag"));
assert.equal(new Set(m.questions.map(x=>x.q)).size,195);
const a=m.questions[0],b=m.questions[1],uid=n=>n.toString(16).padStart(24,"0");
const ev=(q,n,text)=>eventFor(q,m,{countryText:text,capitalText:"capital field"},uid(n));
const comments=[];const put=x=>comments.push({id:100+comments.length,body:JSON.stringify(x)});
const start=ev(a,1,"Kuwait");put(start);
let state=replay(comments,m);
assert.equal(start.kind,EVENT_KIND);assert.equal(state.accepted.length,0);
assert.equal(state.pending.q,1);assert.equal(state.identityIds.has(uid(1)),true);
put(ev(a,2,"stale"));assert.equal(replay(comments,m).pending.countryText,"Kuwait");
const saved=state.pending;
put(eventFor(a,m,{geography:{mode:"country_pin",point:{lon:47.5,lat:29.3}}},uid(3),"geography",saved,{q:1,iso:"KW"}));
state=replay(comments,m);assert.equal(state.accepted.length,1);
assert.equal(state.accepted[0].iso,"KW");assert.equal(state.next.q,2);
assert.equal(state.pending,null);assert.equal(state.accepted[0].githubCommentId,comments.at(-1).id);
put(ev(b,4,"Monaco"));state=replay(comments,m);
put(eventFor(b,m,{geography:{mode:"country_pin",point:{lon:7.4,lat:43.7}}},uid(5),"geography",state.pending,{q:2,iso:"MC"}));
state=replay(comments,m);assert.equal(state.accepted.length,2);
assert.equal(state.next.q,3);assert.equal(state.accepted[1].countryText,"Monaco");
assert.throws(()=>eventFor(a,m,{geography:{}},uid(6),"geography"),/confirmed identity/);

// After GitHub saves identity, only the private bot's receipt may resolve a target.
const initialReceipt={kind:"wcg.combined195.target.v1",version:1,manifest:m.version,q:1,
 identity_attempt_id:start.attempt_id,identity_comment_id:100,
 target:{q:1,iso:"KW",name:"Kuwait",flag:a.flag,mode:"country_pin",area:null}};
const issueUrls=[];
const issuesOnlyClient=(await import("../sync.mjs")).githubClient("github_pat_mockIssues",
 async(url)=>{
  issueUrls.push(url);
  if(url.endsWith("/issues/5"))return new Response(JSON.stringify({number:5,state:"open"}),{status:200});
  if(url.includes("/issues/5/comments?"))return new Response(JSON.stringify([
   {id:100,body:JSON.stringify(start),user:{login:"amrsilver82"}},
   {id:101,body:JSON.stringify(initialReceipt),user:{login:"github-actions[bot]"}}
  ]),{status:200});
  throw Error("Protected Contents API must not be needed in normal Issue #5");
 },5);
assert.equal(await issuesOnlyClient.verify(),true);
const resolved=await issuesOnlyClient.targetFor(1,a.flag,
 {q:1,attempt_id:start.attempt_id,githubIdentityCommentId:100});
assert.equal(resolved.iso,"KW");
assert.equal(resolved.name,"Kuwait");
assert.equal(issueUrls.some(url=>url.includes("/contents/")),false);
await assert.rejects(issuesOnlyClient.targetFor(1,a.flag,
 {q:1,attempt_id:start.attempt_id,githubIdentityCommentId:999}),/Waiting for GitHub/);
console.log("PASS 195 public flag-only questions, two-stage identity confirmation, geography, stale duplicate rejection.");
