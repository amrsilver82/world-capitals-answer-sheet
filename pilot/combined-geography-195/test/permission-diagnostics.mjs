import assert from "node:assert/strict";
import {githubClient} from "../sync.mjs";
const token="github_pat_mockSecretMustNotDisplay";
const root="https://api.github.com/repos/amrsilver82/World-Capitals-Game";
const issue=root+"/issues/5";
const content=root+"/contents/START_HERE.md";
const response=(status,body,headers={})=>new Response(JSON.stringify(body),
 {status,headers:{"Content-Type":"application/json",...headers}});
async function failureAt(stage,status,body,headers){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push({url,method:options.method||"GET",authenticated:options.headers.Authorization==="Bearer "+token});
  if(stage==="issue"&&url===issue)return response(status,body,headers);
  if(stage==="contents"&&url===content)return response(status,body,headers);
  if(stage==="contents"&&url===root+"/issues/6")return response(200,{number:6,state:"open"});
  if(stage==="comments"&&url.startsWith(issue+"/comments"))return response(status,body,headers);
  if(url===issue)return response(200,{number:5,state:"open"});
  if(url===content)return response(200,{content:"YQ=="});
  throw Error("Unexpected test endpoint "+url);
 };
 const c=githubClient(token,fetcher,stage==="contents"?6:5);
 const attempt=async()=>stage==="comments"?(await c.verify(),await c.comments()):await c.verify();
 let message="";
 try{await attempt();assert.fail("Expected an access failure")}
 catch(e){message=e.message}
 assert.equal(message.includes(token),false,"Never echo credentials");
 assert.ok(calls.length&&calls.every(x=>x.authenticated),"Requests sent with private credential");
 return message;
}
const issue403=await failureAt("issue",403,{message:"Resource not accessible by personal access token"},
 {"x-ratelimit-remaining":"4999","x-accepted-github-permissions":"issues=read"});
assert.match(issue403,/GitHub 403/);assert.match(issue403,/Issue #5/);
assert.match(issue403,/issues=read/);assert.doesNotMatch(issue403,/rate limit reached/i);
const contents403=await failureAt("contents",403,{message:"Resource not accessible by personal access token"},
 {"x-ratelimit-remaining":"4998","x-accepted-github-permissions":"contents=read"});
assert.match(contents403,/GitHub 403/);assert.match(contents403,/START_HERE/);assert.match(contents403,/contents=read/);
const comments403=await failureAt("comments",403,{message:"Resource not accessible by personal access token"},
 {"x-ratelimit-remaining":"4000"});
assert.match(comments403,/comments/);assert.match(comments403,/Issue #5/);
const primary=await failureAt("issue",403,{message:"API rate limit exceeded"},{"x-ratelimit-remaining":"0"});
assert.match(primary,/rate limit reached/i);assert.doesNotMatch(primary,/token is forbidden/i);
const secondary=await failureAt("issue",403,{message:"You have exceeded a secondary rate limit."},
 {"x-ratelimit-remaining":"4600"});
assert.match(secondary,/secondary rate limit/);
assert.match(await failureAt("issue",401,{message:"Bad credentials"}),/GitHub 401/);
assert.match(await failureAt("issue",404,{message:"Not Found"}),/GitHub 404/);
const hostile=await failureAt("issue",403,{message:"Sensitive /user/private-path message"},
 {"x-ratelimit-remaining":"120"});
assert.ok(!hostile.includes("Sensitive")&&!hostile.includes("private-path"));

// Normal Issue #5 uses only the original Issues permission; no Contents preflight.
const issueOnlyRequests=[];
const oldPermissionClient=githubClient(token,async(url,options)=>{
 issueOnlyRequests.push(url);
 if(url===issue)return response(200,{number:5,state:"open"});
 if(url.startsWith(issue+"/comments"))return response(200,[]);
 throw Error("Unexpected GitHub Contents request");
},5);
assert.equal(await oldPermissionClient.verify(),true);
assert.deepEqual(await oldPermissionClient.comments(),[]);
assert.equal(issueOnlyRequests.some(u=>u.includes("/contents/")),false);
console.log("PASS safe GitHub connection diagnostics: named 403 endpoint, 401, 404, primary vs secondary rate limit, no token exposure");
