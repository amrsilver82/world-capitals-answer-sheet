// Dedicated GitHub-only append-only EXPERIMENTAL draft log.
// Never writes official ACTIVE_TEST or scores; never stores a private token in code or issue comments.
export const EVENT_KIND="wcg.combined195.answer.v1";
export const EVENT_VERSION=1;
export const ISSUE=5;
const API="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/"+ISSUE;
export function replay(comments,manifest){
 const ordered=[...comments].sort((a,b)=>a.id-b.id);
 const seen=new Set(),accepted=[],acceptedIds=new Set();let rejected=0;
 for(const row of ordered){
  let e;try{e=JSON.parse(row.body||"")}catch{continue}
  if(!e||e.kind!==EVENT_KIND||e.version!==EVENT_VERSION||e.manifest!==manifest.version)continue;
  if(typeof e.attempt_id!=="string"||!/^[0-9a-f-]{24,64}$/i.test(e.attempt_id)||seen.has(e.attempt_id))continue;
  seen.add(e.attempt_id);
  const next=manifest.questions[accepted.length];
  if(!next||!Number.isInteger(e.q)||e.q!==next.q||e.iso!==next.iso){rejected++;continue}
  if(typeof e.countryText!=="string"||typeof e.capitalText!=="string"||e.countryText.length>120||e.capitalText.length>120){rejected++;continue}
  const g=e.geography;if(!g||typeof g!=="object"){rejected++;continue}
  const valid=next.mode==="country_pin"?
   g.mode==="country_pin"&&g.point&&Number.isFinite(g.point.lon)&&Number.isFinite(g.point.lat)&&
   Math.abs(g.point.lon)<=180&&Math.abs(g.point.lat)<=90:
   g.mode==="broad_area"&&g.choice===next.area||g.mode==="broad_area"&&typeof g.choice==="string"&&["PACIFIC_OCEAN","CARIBBEAN","INDIAN_OCEAN"].includes(g.choice);
  if(!valid||g.mode!==next.mode){rejected++;continue}
  accepted.push({q:e.q,iso:e.iso,countryText:e.countryText,capitalText:e.capitalText,geography:g,
   attempt_id:e.attempt_id,githubCommentId:row.id,created_at:row.created_at});
  acceptedIds.add(e.attempt_id);
 }
 return {accepted,acceptedIds,next:manifest.questions[accepted.length]||null,count:ordered.length,rejected,
  lastId:ordered.at(-1)?.id||0};
}
export function githubClient(token,fetchImpl=fetch){
 if(!token||!/^(github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+)$/.test(token))throw Error("Use a restricted GitHub fine-grained PAT");
 const req=async(path,opt={})=>{
  const res=await fetchImpl(API+path,{...opt,cache:"no-store",redirect:"error",headers:{
   "Accept":"application/vnd.github+json","Authorization":"Bearer "+token,
   "X-GitHub-Api-Version":"2022-11-28",...(opt.body?{"Content-Type":"application/json"}:{}),...(opt.headers||{})}});
  if(!res.ok){throw Error(res.status===401?"GitHub credential invalid":res.status===403?"GitHub permission denied or rate limited":res.status===404?"Experimental private Issue #5 unavailable":"GitHub HTTP "+res.status)}
  return res.json();
 };
 return {
  async verify(){const issue=await req("");if(issue.number!==ISSUE||issue.state!=="open")throw Error("Private experimental issue is closed or mismatched");return true;},
  async comments(){const rows=[];for(let p=1;p<=30;p++){const batch=await req("/comments?per_page=100&page="+p);if(!Array.isArray(batch))throw Error("Unexpected comment response");rows.push(...batch);if(batch.length<100)return rows}throw Error("Draft log exceeds safe 3,000-comment read limit")},
  async post(ev){return req("/comments",{method:"POST",body:JSON.stringify({body:JSON.stringify(ev)})})}
 };
}
export function eventFor(next,manifest,input,id){
 if(!next||!input||typeof id!=="string"||!/^[0-9a-f-]{24,64}$/i.test(id))throw Error("Bad experimental event");
 return {kind:EVENT_KIND,version:EVENT_VERSION,manifest:manifest.version,attempt_id:id,
  q:next.q,iso:next.iso,countryText:String(input.countryText||"").trim().slice(0,120),
  capitalText:String(input.capitalText||"").trim().slice(0,120),geography:input.geography};
}
