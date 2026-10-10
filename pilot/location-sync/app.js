"use strict";
/*
 Country Location Pilot v1 — UN-SCORED EXPERIMENT
 Static local assets only. Never requests or writes official quiz scores.
*/
const PILOT="geography-location-v1";
const TOKEN_KEY="wcg-location-github-pat-v1";
const PRIVATE_REPO="amrsilver82/World-Capitals-Game";
const ISSUE=1;
const API="https://api.github.com/repos/"+PRIVATE_REPO+"/issues/"+ISSUE;
const EVENT_KIND="wcg.location.answer.v1";
let githubToken="",connected=false,syncBusy=false,committedCount=0,refreshInFlight=false;
const $=s=>document.getElementById(s);
const VIEWS=[
 ["World",[-180,180,-78,84]],["Europe",[-13,40,34,65]],["NW Mediterranean",[6.5,10.5,42,45.4]],["Central Italy",[12.1,12.85,41.6,42.32]],["Adriatic",[11.8,13.1,43.3,44.6]],
 ["Africa",[-25,55,-39,40]],["West Africa",[-21,20,1,28]],["Southern Africa",[8,40,-39,-10]],
 ["South Asia",[65,106,3,40]],["Middle East",[25,60,15,45]],["SE Asia",[91,145,-18,28]],
 ["Pacific West",[134,180,-30,23]],["Equatorial Pacific",[160,179,-6,9]],["South Pacific atolls",[170,180,-14,-3]],["Pacific East",[-180,-132,-33,24]],["Central Pacific East",[-179,-147,-10,11]],["Americas",[-125,-32,-59,63]]
];
/* No visible dots or province borders. Invisible neutral micro-hit zones are
 active only after deliberate manual zoom, never based on current answer. */
const MICRO_TOUCH=[["MC",7.416,43.737],["VA",12.4533,41.9032],["SM",12.45,43.94],
 ["NR",166.931,-0.526],["TV",179.2,-8.52],["KI",173.03,1.45],
 ["KI",-157.3,1.9],["TO",-175.2,-21.16]];
const px=lon=>(lon+180)*4, py=lat=>(90-lat)*4;
const viewbox=([w,e,s,n])=>({x:px(w),y:py(n),w:(e-w)*4,h:(n-s)*4});
let data=null,world=null,shapes=null,progress=null,currentView=null,region="World",selected="",loaded=false,drag=null,suppress=false,zoomAnchor=null;
const svg=$("map");
function node(tag,attributes){let e=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attributes))e.setAttribute(k,String(v));return e}
function path(polys){let d="";
 for(const polygon of polys||[])for(const ring of polygon||[]){if(ring.length<3)continue;
  let piece=[],prev=null;
  function emit(){if(piece.length>=3)d+="M"+piece.join("L")+"Z";piece=[]}
  for(const p of ring){if(!Array.isArray(p)||!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
   const x=px(p[0]),y=py(p[1]);
   if(prev!==null&&Math.abs(x-prev)>720)emit();
   piece.push(x.toFixed(2)+","+y.toFixed(2));prev=x
  }emit()
 }return d
}
function uniqueSortedDone(a){return [...new Set((Array.isArray(a)?a:[]).filter(x=>Number.isInteger(x)&&x>=1&&x<=15))].sort((a,b)=>a-b)}
function normalizeState(s){let done=uniqueSortedDone(s?.done);
 let attempts=(Array.isArray(s?.attempts)?s.attempts:[]).filter(x=>Number.isInteger(x.q)&&x.q>=1&&x.q<=15&&typeof x.country==="string"&&typeof x.ok==="boolean").slice(-2000);
 return {pilot_id:PILOT,version:data.version,done,attempts,region:VIEWS.some(r=>r[0]===s?.region)?s.region:"World"}
}
function save(){
 // Map view preference is transient. The GitHub issue is the sole checkpoint;
 // NEVER write an alternate local score, history, or source of truth.
}
function done(){return data?.questions.filter(q=>!progress.done.includes(q.q))[0]||null}
function zoomScale(){if(!currentView)return 1;let b=svg.getBoundingClientRect();return Math.max(.001,Math.min(b.width/currentView.w,b.height/currentView.h))}
function inside(x,y){return currentView&&x>=currentView.x&&x<=currentView.x+currentView.w&&y>=currentView.y&&y<=currentView.y+currentView.h}
function eventMapPoint(e){
 const c=svg.getScreenCTM();
 if(c&&svg.createSVGPoint){
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const q=p.matrixTransform(c.inverse());
  if(Number.isFinite(q.x)&&Number.isFinite(q.y))return{x:q.x,y:q.y}
 }
 // Device-safe fallback if WebKit cannot provide SVG screen transformation.
 if(!currentView)return null;
 const b=svg.getBoundingClientRect(),scale=Math.min(b.width/currentView.w,b.height/currentView.h);
 if(scale<=0)return null;
 const left=b.left+(b.width-currentView.w*scale)/2,top=b.top+(b.height-currentView.h*scale)/2;
 return{x:currentView.x+(e.clientX-left)/scale,y:currentView.y+(e.clientY-top)/scale}
}
function rememberTap(e){const p=eventMapPoint(e);if(p&&inside(p.x,p.y))zoomAnchor=p}
function closeOutline(){const show=!!currentView&&currentView.w/4<0.3;document.querySelectorAll("#detail path.micro-target").forEach(p=>p.classList.toggle("precise",show))}
function ringContains(lon,lat,ring){
 let hit=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit
}
function featureContains(f,lon,lat){
 if(f.bbox&&(lon<f.bbox[0]||lon>f.bbox[2]||lat<f.bbox[1]||lat>f.bbox[3]))return false;
 return (f.polys||[]).some(poly=>poly.reduce((inside,ring)=>inside!==ringContains(lon,lat,ring),false))
}
function countryAtPoint(x,y){
 if(!world||!shapes||!currentView||!inside(x,y))return "";
 const lon=x/4-180,lat=90-y/4;
 // Invisible microstate touch allowance at manually selected close zoom only.
 const width=currentView.w/4,scale=zoomScale();
 const limits={MC:3,SM:3,VA:.16,NR:2,TV:3,KI:3,TO:4};
 if(region!=="World")for(const [code,mlon,mlat] of MICRO_TOUCH){
  if(width>limits[code])continue;
  const r=Math.min(25/Math.max(scale,.001),currentView.w/4);
  if((x-px(mlon))**2+(y-py(mlat))**2<=r*r)return code
 }
 // Actual detailed polygons for small states, only when user zooms close enough.
 for(let i=shapes.features.length-1;i>=0;i--){
  const f=shapes.features[i];
  if(f.tiny&&featureContains(f,lon,lat))return f.id
 }
 // Full world land boundaries have equal priority: never bias towards pilot answers.
 for(let i=world.features.length-1;i>=0;i--)if(featureContains(world.features[i],lon,lat))return world.features[i].id;
 // 15 detailed target polygons fill gaps in 110m world data, including microstates.
 for(let i=shapes.features.length-1;i>=0;i--)if(featureContains(shapes.features[i],lon,lat))return shapes.features[i].id;
 return ""
}
function countryAtEvent(e){
 const p=eventMapPoint(e);
 return p?countryAtPoint(p.x,p.y):""
}
function markers(){
 const layer=$("marks");layer.replaceChildren();
 if(!currentView||region==="World")return;
 const degreesWide=currentView.w/4,scale=zoomScale();
 // No visible circles. All microstates use the same, question-independent rule.
 const limits={MC:3,SM:3,VA:.16,NR:2,TV:3,KI:3,TO:4};
 const radius=Math.min(25/Math.max(scale,.001),currentView.w/4);
 for(const [code,lon,lat] of MICRO_TOUCH){
  if(degreesWide>limits[code]||!inside(px(lon),py(lat)))continue;
  const hit=node("circle",{cx:px(lon),cy:py(lat),r:radius,class:"hit","data-code":code,role:"button","aria-label":"Select country outline"});
  layer.appendChild(hit);
 }
 highlight();
}
function highlight(){
 // SVG country geometry is a direct <path> with data-code, not a parent <g>.
 // The old querySelectorAll("path") skipped the path itself, so a valid
 // selected country never visibly highlighted on WebKit/iPad Chrome.
 document.querySelectorAll("#land [data-code],#detail [data-code],#marks [data-code]").forEach(el=>{
  const match=Boolean(selected)&&el.getAttribute("data-code")===selected;
  if(el.matches("path"))el.classList.toggle("picked",match);
  else el.querySelectorAll("path,circle.marker").forEach(child=>child.classList.toggle("picked",match));
 })
}
function paint(){
 for(const [id,features,klass] of [["land",world.features,"country"],["detail",shapes.features,"target"]]){
  let root=$(id);root.replaceChildren();
  for(const f of features){
   // IMPORTANT: A country already present in the world layer must never
   // receive a second invisible SVG path on top of it. On iPad Chrome/WebKit
   // the transparent 10m provincial overlay swallowed Chad taps, while the
   // unlayered neighbor Sudan remained selectable.
   // Retain the 10m source polygons for coordinate checks, but render a
   // single normal world path for all large/ordinary countries.
   if(klass==="target"&&world.features.some(x=>x.id===f.id))continue;
   const d=path(f.polys);if(!d)continue;
   const kind=klass==="target"?"micro-target":klass;
   let el=node("path",{d,"data-code":f.id,class:kind,role:"button",tabindex:0,"aria-label":"Select country area","fill-rule":"evenodd"});
   root.appendChild(el);
  }
 }markers();highlight()
}
function applyView(){if(!currentView)return;svg.setAttribute("viewBox",[currentView.x,currentView.y,currentView.w,currentView.h].join(" "));markers();closeOutline()}
function setRegion(name){
 const x=VIEWS.find(a=>a[0]===name)||VIEWS[0];region=x[0];currentView=viewbox(x[1]);zoomAnchor=null;$("regionname").textContent=region;
 document.querySelectorAll(".regions button").forEach(b=>b.setAttribute("aria-pressed",String(b.textContent===region)));
 selected="";$("check").disabled=true;applyView();highlight();save();
 if(loaded&&done())show("Choose a location on the map.", "")
}
function zoom(f){
 if(!loaded||!currentView)return;
 const c=zoomAnchor&&inside(zoomAnchor.x,zoomAnchor.y)?zoomAnchor:{x:currentView.x+currentView.w/2,y:currentView.y+currentView.h/2};
 const w=Math.min(1440,Math.max(.001,currentView.w*f)),h=Math.min(720,Math.max(.001,currentView.h*f));
 currentView={x:Math.max(0,Math.min(1440-w,c.x-w/2)),y:Math.max(0,Math.min(720-h,c.y-h/2)),w,h};applyView()
}
function show(s,cls){$("status").textContent=s;$("status").className="status"+(cls?" "+cls:"")}
function question(){
 if(!data||!progress)return;
 if(!connected){
  $("qindex").textContent="Private checkpoint required";
  $("question").textContent="Connect GitHub to resume";
  $("progress").textContent="–";
  $("check").disabled=true;
  show("Answers are disabled until your shared GitHub checkpoint has loaded.","warn");
  return;
 }
 $("progress").textContent=progress.done.length;
 let q=done();selected="";highlight();$("check").disabled=true;
 if(!q){$("qindex").textContent="Pilot complete";$("question").textContent="15 locations tested";show("Pilot complete on this device. Save your checkpoint for the review.","good");return}
 $("qindex").textContent="Pilot item "+q.q+" of 15";$("question").textContent="Find "+q.name;show("Select the country silhouette; use manual region and zoom for tiny countries.","")
}
function select(code){if(!loaded||!connected||syncBusy||!done()||!code)return;selected=code;highlight();$("check").disabled=false;show("Location selected. Check your answer when ready.","")}
async function answer(){
 const q=done();if(!loaded||!connected||syncBusy||!selected||!q)return;
 const country=selected,number=q.q;
 syncBusy=true;$("check").disabled=true;
 syncMessage("Verifying the latest GitHub question before saving…");
 try{
  // Refuse to submit a stale answer when another device has already advanced.
  const before=await getComments();
  const upstream=replay(before);
  if(upstream.next?.q!==number){
   applyRemote(upstream);
   syncMessage("Another device advanced the game. Updated to the latest question.","warn");
   return;
  }
  const nonce=randomId();
  const event={kind:EVENT_KIND,pilot_id:PILOT,manifest_version:data.version,
   attempt_id:nonce,q:number,country,at:new Date().toISOString()};
  await githubRequest(API+"/comments",{method:"POST",
   headers:{"Content-Type":"application/json"},body:JSON.stringify({body:JSON.stringify(event)})});
  // A successful POST alone is not a score. Replay authoritative GitHub data.
  const after=await getComments(),result=replay(after);
  applyRemote(result);
  const accepted=result.acceptedIds.has(nonce);
  if(!accepted){syncMessage("Another device answered first. Shared state reloaded.","warn");return}
  syncMessage("Saved and verified in private GitHub: "+result.progress.done.length+"/15.","good");
  if(country!==q.code)show("Not the requested country. Try again; no clue or answer is revealed.","warn");
  else if(done())show("Correct location saved in GitHub. Next country is ready.","good");
 }catch(err){
  // Network uncertainty: event may or may not have posted. Never advance
  // without reading the authoritative event log again.
  syncMessage("Not verified: "+safeError(err)+". Refresh shared progress before trying again.","warn");
  show("GitHub confirmation failed. Your score has NOT advanced locally.","warn");
 }finally{syncBusy=false;$("check").disabled=!connected||!selected||!done()}
}
function fail(msg){loaded=false;$("maperror").textContent=msg+" Your unfinished pilot question is preserved. Use Reload maps.";$("maperror").classList.add("on");$("check").disabled=true;show("Static map files unavailable. No result has been recorded.","warn")}
async function init(){
 loaded=false;$("check").disabled=true;$("maperror").classList.remove("on");show("Loading local map files…","");
 try{
  const paths=["../location/data/manifest.json","../location/data/world.json","../location/data/targets.json"];
  const res=await Promise.all(paths.map(p=>fetch(p,{cache:"no-store"})));
  if(res.some(r=>!r.ok))throw Error("A required static map file failed to load.");
  const [m,w,s]=await Promise.all(res.map(r=>r.json()));
  if(m.pilot_id!==PILOT||m.questions.length!==15||w.features.length!==177||s.features.length!==15)throw Error("Static data integrity check failed.");
  const expected=m.questions.map(q=>q.code),found=new Set(s.features.map(f=>f.id));
  if(new Set(expected).size!==15||found.size!==15||expected.some(c=>!found.has(c)))throw Error("Pilot shapes and frozen questions disagree.");
  if([...w.features,...s.features].some(f=>!Array.isArray(f.polys)||!f.polys.length||!path(f.polys)))throw Error("One or more map geometries are missing.");
  data=m;world=w;shapes=s;
  progress=normalizeState({});loaded=true;paint();setRegion("World");question();
  const stored=readStoredToken();
  if(stored){$("rememberToken").checked=true;await connectGithub(stored)}
  else syncMessage("Not connected. Enter a restricted GitHub token; no answers can be scored.","warn")
 }catch(e){fail(e.message||"Map unavailable")}
}
function syncMessage(message,kind=""){
 $("syncStatus").textContent=message;
 $("syncStatus").className="status"+(kind?" "+kind:"");
}
function safeError(err){
 const text=String(err?.message||"Request failed");
 return text.replace(/github_pat_[a-zA-Z0-9_]+|gh[pousr]_[a-zA-Z0-9_]+/g,"[credential hidden]").slice(0,220);
}
function readStoredToken(){
 try{return localStorage.getItem(TOKEN_KEY)||""}catch(_){return ""}
}
function storeToken(value){
 try{if(value)localStorage.setItem(TOKEN_KEY,value);else localStorage.removeItem(TOKEN_KEY)}
 catch(_){syncMessage("Browser storage denied. Token will be forgotten on reload.","warn")}
}
function randomId(){
 if(crypto.randomUUID)return crypto.randomUUID();
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
async function githubRequest(url,opts={}){
 if(!githubToken)throw Error("GitHub connection required");
 const headers={"Accept":"application/vnd.github+json",
  "Authorization":"Bearer "+githubToken,"X-GitHub-Api-Version":"2022-11-28",
  ...(opts.headers||{})};
 let response;
 try{response=await fetch(url,{...opts,headers,cache:"no-store",redirect:"error"})}
 catch(_){throw Error("GitHub connection blocked or unavailable")}
 if(!response.ok){
  const message=response.status===401?"Token invalid or expired":
    response.status===403?"Permission denied or GitHub rate limit":
    response.status===404?"Private issue not accessible to this token":
    "GitHub HTTP "+response.status;
  throw Error(message);
 }
 return response.json();
}
async function getComments(){
 const output=[];
 for(let page=1;page<=20;page++){
  const batch=await githubRequest(API+"/comments?per_page=100&page="+page);
  if(!Array.isArray(batch))throw Error("Unexpected GitHub comment response");
  output.push(...batch);
  if(batch.length<100)return output;
 }
 throw Error("Pilot issue event limit reached; do not discard history");
}
function replay(comments){
 const completed=[], attempts=[],seen=new Set(),acceptedIds=new Set();
 const ordered=[...comments].sort((a,b)=>a.id-b.id);
 let index=0;
 for(const comment of ordered){
  let ev;try{ev=JSON.parse(comment.body||"")}catch(_){continue}
  if(!ev||ev.kind!==EVENT_KIND||ev.pilot_id!==PILOT||
     ev.manifest_version!==data.version||
     typeof ev.attempt_id!=="string"||ev.attempt_id.length<12||ev.attempt_id.length>128||
     !Number.isInteger(ev.q)||typeof ev.country!=="string"||!/^[A-Z]{2}$/.test(ev.country))continue;
  if(seen.has(ev.attempt_id))continue;
  seen.add(ev.attempt_id);
  const expected=data.questions[index];
  // Drop duplicate/stale or out-of-order attempts after another device advances.
  if(!expected||ev.q!==expected.q)continue;
  const ok=expected.code===ev.country;
  attempts.push({q:ev.q,country:ev.country,ok,at:ev.at||comment.created_at});
  acceptedIds.add(ev.attempt_id);
  if(ok){completed.push(ev.q);index++}
 }
 return {progress:normalizeState({done:completed,attempts,region}),
  next:data.questions[index]||null,acceptedIds,count:ordered.length,
  lastId:ordered.length?ordered[ordered.length-1].id:0};
}
function applyRemote(result){
 const old=progress?.done?.length??-1;
 progress=result.progress;committedCount=result.lastId;
 if(loaded&&connected&&old!==progress.done.length)question();
 else if(loaded&&connected){$("progress").textContent=progress.done.length}
}
async function connectGithub(explicit){
 if(syncBusy||!loaded)return;
 const newToken=(explicit||$("tokenInput").value||"").trim();
 if(!/^github_pat_[a-zA-Z0-9_]+$/.test(newToken)&&
    !/^gh[pousr]_[a-zA-Z0-9_]+$/.test(newToken)){
  syncMessage("Enter your restricted GitHub personal access token (not your password).","warn");return;
 }
 const previous=githubToken,wasConnected=connected;
 githubToken=newToken;connected=false;syncBusy=true;
 $("connectGithub").disabled=true;$("check").disabled=true;
 syncMessage("Authenticating with private GitHub issue…");
 try{
  const issue=await githubRequest(API);
  if(issue.number!==ISSUE||issue.state!=="open")throw Error("Unexpected or closed GitHub pilot issue");
  const result=replay(await getComments());
  connected=true;applyRemote(result);question();
  if($("rememberToken").checked)storeToken(newToken);else storeToken("");
  $("tokenInput").value="";$("authPanel").classList.add("connected");
  $("disconnectGithub").disabled=false;$("refreshSync").disabled=false;
  syncMessage("Connected to private GitHub. Shared: "+progress.done.length+"/15.","good");
 }catch(err){
  connected=false;githubToken="";progress=normalizeState({});question();
  $("authPanel").classList.remove("connected");
  syncMessage(safeError(err),"warn");
  // Previously verified credential may have expired; remove it to avoid looping.
  if(readStoredToken()===newToken)storeToken("");
 }finally{
  syncBusy=false;$("connectGithub").disabled=false;
  $("check").disabled=!connected||!selected||!done();
 }
}
function disconnectGithub(){
 githubToken="";connected=false;syncBusy=false;storeToken("");
 progress=normalizeState({});selected="";highlight();question();
 $("authPanel").classList.remove("connected");
 $("disconnectGithub").disabled=true;$("refreshSync").disabled=true;
 syncMessage("Disconnected. Local credential cleared; shared GitHub progress is retained.");
}
async function refreshGithub(){
 if(!connected||syncBusy||refreshInFlight||!loaded||document.hidden)return;
 refreshInFlight=true;
 try{
  const result=replay(await getComments());
  const changed=result.lastId!==committedCount||result.progress.done.length!==progress.done.length;
  applyRemote(result);
  if(changed)syncMessage("Synced from GitHub: "+progress.done.length+"/15.","good");
 }catch(err){syncMessage("Cannot refresh GitHub: "+safeError(err),"warn")}
 finally{refreshInFlight=false}
}
$("connectGithub").addEventListener("click",()=>connectGithub());
$("disconnectGithub").addEventListener("click",disconnectGithub);
$("refreshSync").addEventListener("click",refreshGithub);
window.addEventListener("focus",refreshGithub);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshGithub()});
setInterval(refreshGithub,15000);
/* Cross-browser touch fallback: Safari sometimes emits no path click at all.
 * Use coordinate hit testing, not event.target, and ignore pan gestures. */
let touchStart=null;
svg.addEventListener("touchstart",e=>{
 const t=e.changedTouches?.[0];touchStart=t?{x:t.clientX,y:t.clientY,at:Date.now()}:null
},{passive:true});
svg.addEventListener("touchend",e=>{
 const t=e.changedTouches?.[0];
 if(!touchStart||!t)return;
 const dist=Math.hypot(t.clientX-touchStart.x,t.clientY-touchStart.y),elapsed=Date.now()-touchStart.at;
 touchStart=null;
 if(dist>14||elapsed>900||!loaded)return;
 const code=countryAtEvent(t);if(code)select(code);
 // Suppress duplicate compatibility click when Safari already selected by touch.
 if(code){suppress=true;setTimeout(()=>{suppress=false},210)}
},{passive:true});
svg.addEventListener("touchcancel",()=>{touchStart=null},{passive:true});
/* Tap to select; pointer drag to pan. Drag suppresses the following click. */
svg.addEventListener("click",e=>{
 if(suppress){suppress=false;return}
 rememberTap(e);
 // Safari sometimes targets the SVG container instead of its path.
 const code=countryAtEvent(e);
 if(code)select(code);
});
svg.addEventListener("keydown",e=>{
 if(e.key==="Enter"||e.key===" "){let el=e.target.closest("[data-code]");if(el){e.preventDefault();select(el.getAttribute("data-code"))}}
});
svg.addEventListener("pointerdown",e=>{if(!loaded||!currentView)return;
 drag={id:e.pointerId,x:e.clientX,y:e.clientY,origin:{...currentView},moved:false};
});
svg.addEventListener("pointermove",e=>{
 if(!drag||drag.id!==e.pointerId)return;
 const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.moved&&Math.hypot(dx,dy)<=14)return;
 drag.moved=true;svg.classList.add("dragging");
 const b=svg.getBoundingClientRect(),scale=Math.max(.0001,Math.min(b.width/drag.origin.w,b.height/drag.origin.h));
 currentView={...drag.origin,x:Math.max(0,Math.min(1440-drag.origin.w,drag.origin.x-dx/scale)),y:Math.max(0,Math.min(720-drag.origin.h,drag.origin.y-dy/scale))};
 applyView()
});
function finishDrag(e){if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;if(moved){suppress=true;setTimeout(()=>{suppress=false},180)}if(!moved&&e.type==="pointerup"&&e.pointerType==="touch"){rememberTap(e);const code=countryAtEvent(e);if(code)select(code);suppress=true;setTimeout(()=>{suppress=false},180)}drag=null;svg.classList.remove("dragging")}
svg.addEventListener("pointerup",finishDrag);svg.addEventListener("pointercancel",finishDrag);
for(const [name] of VIEWS){
 let b=document.createElement("button");b.type="button";b.textContent=name;b.setAttribute("aria-pressed",String(name===region));b.onclick=()=>setRegion(name);$("regions").appendChild(b)
}
$("check").onclick=answer;
$("zoomIn").onclick=()=>zoom(.65);$("zoomOut").onclick=()=>zoom(1.5);$("resetView").onclick=()=>setRegion(region);
$("reload").onclick=()=>location.reload();
init();
