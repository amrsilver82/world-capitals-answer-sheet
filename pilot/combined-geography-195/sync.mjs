// Experimental two-stage GitHub Issue #5 draft log. No answer keys in public manifest.
// Identity must be saved and independently confirmed BEFORE country target is disclosed.
export const EVENT_KIND="wcg.combined195.identity.v2";
export const GEO_EVENT_KIND="wcg.combined195.geography.v2";
export const EVENT_VERSION=2;
export const ISSUE=5;
const ROOT="https://api.github.com/repos/amrsilver82/World-Capitals-Game";
const API=ROOT+"/issues/"+ISSUE;
const ID=/^[0-9a-f-]{24,64}$/i;
const regionSet=new Set(["PACIFIC_OCEAN","CARIBBEAN","INDIAN_OCEAN"]);
export function replay(comments,manifest){
 const ordered=[...comments].sort((a,b)=>a.id-b.id);
 const seen=new Set(),accepted=[],acceptedIds=new Set(),identityIds=new Set();let rejected=0,pending=null;
 for(const row of ordered){
  let ev;try{ev=JSON.parse(row.body||"")}catch{continue}
  if(!ev||ev.version!==EVENT_VERSION||ev.manifest!==manifest.version||
     ![EVENT_KIND,GEO_EVENT_KIND].includes(ev.kind)||!ID.test(ev.attempt_id)||seen.has(ev.attempt_id))continue;
  seen.add(ev.attempt_id);
  const q=manifest.questions[accepted.length];
  if(!q||ev.q!==q.q||!Number.isSafeInteger(row.id)){rejected++;continue}
  if(ev.kind===EVENT_KIND){
   if(pending||typeof ev.countryText!=="string"||typeof ev.capitalText!=="string"||
      ev.countryText.length>120||ev.capitalText.length>120){rejected++;continue}
   pending={q:q.q,countryText:ev.countryText,capitalText:ev.capitalText,
      attempt_id:ev.attempt_id,githubIdentityCommentId:row.id};
   identityIds.add(ev.attempt_id);
   continue;
  }
  const g=ev.geography;
  const validGeo=g?.mode==="country_pin"&&g.point&&Number.isFinite(g.point.lon)&&
      Number.isFinite(g.point.lat)&&Math.abs(g.point.lon)<=180&&Math.abs(g.point.lat)<=90 ||
      g?.mode==="broad_area"&&regionSet.has(g.choice);
  if(!pending||ev.identity_attempt_id!==pending.attempt_id||!validGeo||
     typeof ev.iso!=="string"||!/^[A-Z]{2}$/.test(ev.iso)){rejected++;continue}
  accepted.push({...pending,iso:ev.iso,geography:g,githubCommentId:row.id,created_at:row.created_at});
  acceptedIds.add(ev.attempt_id);pending=null;
 }
 return{accepted,pending,next:manifest.questions[accepted.length]||null,acceptedIds,identityIds,rejected,
  count:ordered.length,lastId:ordered.at(-1)?.id||0};
}
export function eventFor(next,manifest,input,id,stage="identity",pending=null,target=null){
 if(!next||!ID.test(id)||!manifest?.version||!Number.isInteger(next.q))throw Error("Invalid draft event");
 if(stage==="identity"){
  return{kind:EVENT_KIND,version:EVENT_VERSION,manifest:manifest.version,attempt_id:id,
    q:next.q,countryText:String(input.countryText??"").trim().slice(0,120),
    capitalText:String(input.capitalText??"").trim().slice(0,120)};
 }
 if(stage!=="geography"||!pending||!target||pending.q!==next.q||target.q!==next.q||
    !ID.test(pending.attempt_id))throw Error("Geography requires confirmed identity and private target");
 return{kind:GEO_EVENT_KIND,version:EVENT_VERSION,manifest:manifest.version,attempt_id:id,
    identity_attempt_id:pending.attempt_id,q:next.q,iso:target.iso,geography:input.geography};
}
export function githubClient(token,fetchImpl=fetch,issueNumber=ISSUE){
 if(![5,6].includes(issueNumber))throw Error("Unexpected experimental issue");
 const endpoint=ROOT+"/issues/"+issueNumber;
 if(!token||!/^(github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+)$/.test(token))
  throw Error("Use a restricted GitHub fine-grained PAT");
 const get=async(url,opt={})=>{
  const r=await fetchImpl(url,{...opt,cache:"no-store",redirect:"error",headers:{
   "Accept":"application/vnd.github+json","Authorization":"Bearer "+token,
   "X-GitHub-Api-Version":"2022-11-28",...(opt.body?{"Content-Type":"application/json"}:{})}});
  if(!r.ok)throw Error(r.status===401?"GitHub credential invalid":r.status===403?"GitHub permissions or rate limit":r.status===404?"Private game resource not accessible (requires repository Contents:read and Issues:read/write)":"GitHub HTTP "+r.status);
  return r.json();
 };
 const contents=async(path)=>{
  const f=await get(ROOT+"/contents/"+path);
  if(typeof f.content!=="string")throw Error("Missing protected private file");
  const text=atob(f.content.replace(/\s+/g,""));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(text,c=>c.charCodeAt(0))));
 };
 let privateCache=null;
 return {
  async verify(){const issue=await get(endpoint);if(issue.number!==issueNumber||issue.state!=="open")throw Error("Experimental issue not open");const access=await get(ROOT+"/contents/START_HERE.md");if(typeof access.content!=="string")throw Error("Private repository Contents read permission required");return true},
  async comments(){const all=[];for(let page=1;page<=30;page++){
   const chunk=await get(endpoint+"/comments?per_page=100&page="+page);
   if(!Array.isArray(chunk))throw Error("Invalid GitHub comments");
   all.push(...chunk);if(chunk.length<100)return all;
  }throw Error("More than 3000 comments; refuse truncated history")},
  async post(ev){return get(endpoint+"/comments",{method:"POST",body:JSON.stringify({body:JSON.stringify(ev)})})},
  async targetFor(q,publicFlag){
   if(!privateCache){
    const [assets,cls]=await Promise.all([
     contents("v2/edition3-asset-map.json"),
     contents("experiments/location-pilot/GEOGRAPHY_195_CLASSIFICATION_V3_EVIDENCE_2026-10-13.json")]);
    const byIso=new Map(cls.countries.map(c=>[c.iso2,c]));
    const rows=assets.entries.map(x=>{
     const iso=x.source_path.split("/").at(-1).slice(0,2).toUpperCase();
     const c=byIso.get(iso);if(!c||c.name!==x.country)throw Error("Private canonical identity mismatch");
     return{q:x.q,iso,name:c.name,flag:"../../"+x.public_asset,mode:c.mode,
      area:c.mode==="broad_area"?c.accepted_area_id:null};
    });
    if(rows.length!==195||new Set(rows.map(x=>x.iso)).size!==195)throw Error("Private identity set invalid");
    privateCache=rows;
   }
   const item=privateCache[q-1];
   if(!item||item.q!==q||item.flag!==publicFlag)throw Error("Private flag/target verification failed");
   return item;
  }
 };
}
