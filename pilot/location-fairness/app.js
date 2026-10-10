"use strict";
// World Capitals Game: unscored geographic method laboratory.
// Entirely GitHub-hosted. Issue #2 is the only persistent event log.
// Never alter the original sync experiment Issue #1 or official quiz files.
const $=id=>document.getElementById(id);
const PILOT="location-fairness-20261010",KIND="wcg.location.fairness.v1";
const API="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/2";
const KEY="wcg-location-github-pat-v1"; // reuse optional credential from synced pilot
const CASES=[
 {code:"MC",name:"Monaco",kind:"Microstate"},
 {code:"VA",name:"Vatican City",kind:"Enclave"},
 {code:"SM",name:"San Marino",kind:"Microstate"},
 {code:"NR",name:"Nauru",kind:"Tiny island"},
 {code:"TV",name:"Tuvalu",kind:"Island chain"},
 {code:"KI",name:"Kiribati",kind:"Scattered archipelago"},
 {code:"TO",name:"Tonga",kind:"Island chain"},
 {code:"BT",name:"Bhutan",kind:"Normal-sized control"},
 {code:"TD",name:"Chad",kind:"Normal-sized control"}
];
const VIEWS=[
 ["World",[-180,180,-80,85]],["Europe",[-13,40,34,65]],
 ["NW Mediterranean",[5,11,41,46]],["Central Italy",[11.4,13.5,40.9,43]],
 ["Adriatic",[10.8,14,42.5,45]],["Africa",[-25,55,-39,40]],
 ["Southern Africa",[8,40,-39,-10]],["South Asia",[65,106,3,40]],
 ["Pacific West",[131,180,-30,24]],["Equatorial Pacific",[158,180,-9,11]],
 ["South Pacific",[170,180,-27,-2]],["Pacific East",[-180,-128,-34,24]],
 ["Central Pacific East",[-179,-145,-15,13]],["Americas",[-126,-32,-60,65]]
];
const svg=$("map"),N=1440,Y=720,DEG=Math.PI/180;
const px=lon=>(lon+180)*4,py=lat=>(90-lat)*4;
const round=(x,n=0)=>Number(x.toFixed(n));
let world=null,targets=null,currentView=null,region="World",mode="pin";
let selected=null,answerReveal=false,loaded=false,token="",connected=false,busy=false;
let checkpoint={index:0,attempts:[],accepted:new Set(),lastId:0},pan=null,suppressUntil=0,zoomAnchor=null;
const node=(tag,attr={})=>{const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attr))el.setAttribute(k,String(v));return el};
function shortError(e){return String(e?.message||"Connection failed").replace(/github_pat_[A-Za-z0-9_]+/g,"[hidden]").slice(0,180)}
function msg(s,error=false){$("selectionStatus").textContent=s;$("selectionStatus").className="status"+(error?" error":"")}
function syncStatus(s,error=false){$("syncStatus").textContent=s;$("syncStatus").className="status"+(error?" error":" good")}
function loadKey(){try{return localStorage.getItem(KEY)||""}catch(_){return""}}
function saveKey(t){try{if(t)localStorage.setItem(KEY,t);else localStorage.removeItem(KEY)}catch(_){}}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,"0")).join("")}
async function api(url,opts={}){
 if(!token)throw Error("Connect GitHub first");
 let response;
 try{response=await fetch(url,{...opts,redirect:"error",cache:"no-store",headers:{
  Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
  "X-GitHub-Api-Version":"2022-11-28",...(opts.headers||{})}})}
 catch(_){throw Error("GitHub cannot be reached")}
 if(!response.ok)throw Error(response.status===401?"Token expired or invalid":response.status===403?"GitHub permission or rate-limit error":response.status===404?"Private pilot Issue not accessible":"GitHub HTTP "+response.status);
 return response.json();
}
async function comments(){
 const out=[];
 for(let page=1;page<=20;page++){
  const batch=await api(API+"/comments?per_page=100&page="+page);
  if(!Array.isArray(batch))throw Error("Bad GitHub response");
  out.push(...batch);if(batch.length<100)return out;
 }
 throw Error("Too many events for this experimental log");
}
function replay(raw){
 const ids=new Set(),accepted=new Set(),attempts=[];let index=0,last=0;
 for(const c of [...raw].sort((a,b)=>a.id-b.id)){
  last=Math.max(last,c.id);
  let ev;try{ev=JSON.parse(c.body)}catch(_){continue}
  if(ev?.kind!==KIND||ev.pilot_id!==PILOT||typeof ev.attempt_id!=="string"||ev.attempt_id.length<12||ids.has(ev.attempt_id))continue;
  ids.add(ev.attempt_id);
  const cur=CASES[index];
  if(!cur||ev.q!==index+1||ev.code!==cur.code)continue;
  if(ev.action==="attempt"&&["pin","exact","grid"].includes(ev.mode)&&
   (ev.mode==="exact"?typeof ev.selected_code==="string":
    Number.isFinite(ev.lon)&&Number.isFinite(ev.lat)&&Math.abs(ev.lat)<=90&&Math.abs(ev.lon)<=180)){
   attempts.push({q:ev.q,mode:ev.mode,code:cur.code,choice:ev.selected_code||"",
    lon:ev.lon,lat:ev.lat,radius:ev.radius||null,when:c.created_at,comment_id:c.id});
   accepted.add(ev.attempt_id);
  }else if(ev.action==="next"&&attempts.some(a=>a.q===index+1)){
   index++;accepted.add(ev.attempt_id);
  }
 }
 return {index,attempts,accepted,lastId:last};
}
function stateUpdate(remote){
 const changed=remote.index!==checkpoint.index;
 checkpoint=remote;
 if(changed){selected=null;answerReveal=false;drawFeedback();renderQuestion()}
 else{renderCounts()}
}
async function refresh(quiet=false){
 if(!connected||busy||document.hidden)return;
 try{const next=replay(await comments());const changed=next.lastId!==checkpoint.lastId;
  stateUpdate(next);if(changed&&!quiet)syncStatus("Latest shared checkpoint loaded from GitHub.")}
 catch(e){syncStatus("Refresh failed: "+shortError(e),true)}
}
async function connect(passed){
 if(busy||!loaded)return;
 const t=(passed||$("tokenInput").value||"").trim();
 if(!/^github_pat_[A-Za-z0-9_]+$/.test(t)&&!/^gh[pousr]_[A-Za-z0-9_]+$/.test(t)){
  syncStatus("Enter your repository-restricted GitHub token.",true);return}
 busy=true;token=t;$("connectBtn").disabled=true;syncStatus("Opening private fairness checkpoint…");
 try{
  const issue=await api(API);
  if(issue.number!==2||issue.state!=="open")throw Error("Unexpected private pilot Issue");
  connected=true;const remote=replay(await comments());stateUpdate(remote);renderQuestion();
  if($("rememberToken").checked)saveKey(t);
  $("tokenInput").value="";$("authStatus").textContent="Connected";$("authStatus").className="tag good";
  $("authControls").hidden=true;$("refreshBtn").disabled=false;$("disconnectBtn").disabled=false;
  syncStatus("Connected: only experimental events are saved in private GitHub.");
 }catch(e){
  token="";connected=false;$("authStatus").textContent="Not connected";renderQuestion();
  syncStatus(shortError(e),true);
 }finally{busy=false;$("connectBtn").disabled=false}
}
function disconnect(){token="";connected=false;saveKey("");checkpoint={index:0,attempts:[],accepted:new Set(),lastId:0};
 selected=null;answerReveal=false;drawFeedback();$("authControls").hidden=false;
 $("refreshBtn").disabled=true;$("disconnectBtn").disabled=true;$("authStatus").textContent="Not connected";
 $("authStatus").className="tag";renderQuestion();syncStatus("Disconnected. GitHub pilot history is preserved.")}
async function writeEvent(event){
 if(!connected||busy)return;
 busy=true;disableMain(true);
 try{
  const fresh=replay(await comments());stateUpdate(fresh);
  if(checkpoint.index!==event.q-1)throw Error("Another device advanced. Shared position reloaded.");
  if(event.action==="next"&&!checkpoint.attempts.some(x=>x.q===event.q))throw Error("Try a method before advancing.");
  const ev={kind:KIND,pilot_id:PILOT,attempt_id:uuid(),code:CASES[event.q-1].code,
   q:event.q,at:new Date().toISOString(),...event};
  await api(API+"/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:JSON.stringify(ev)})});
  const after=replay(await comments());stateUpdate(after);
  if(!after.accepted.has(ev.attempt_id))throw Error("The event was superseded by another device");
  if(event.action==="attempt"){
   answerReveal=true;renderResult(event);drawFeedback();
   syncStatus("Practice attempt saved in private GitHub.");
  }else{syncStatus("Next case saved in GitHub; other devices will follow.");}
 }catch(e){syncStatus("Not confirmed: "+shortError(e),true)}
 finally{busy=false;disableMain(false)}
}
function disableMain(flag){
 $("submitBtn").disabled=flag||!selected||!connected||checkpoint.index>=CASES.length;
 $("nextBtn").disabled=flag||!connected||!checkpoint.attempts.some(a=>a.q===checkpoint.index+1);
 $("clearBtn").disabled=flag||!connected||!selected;
}
function renderCounts(){$("progress").textContent=connected?checkpoint.index:"–";
 $("nextBtn").disabled=!connected||busy||!checkpoint.attempts.some(a=>a.q===checkpoint.index+1);
 const attempted=checkpoint.attempts.filter(a=>a.q===checkpoint.index+1).length;
 $("nextBtn").textContent=checkpoint.index>=CASES.length?"Finished":
  "Next country →";
 if(connected&&attempted&&!answerReveal&&checkpoint.index<CASES.length){
  $("resultBox").hidden=false;$("resultHeading").textContent="Saved practice history";
  $("resultText").textContent=attempted+" earlier attempt(s) on this case are stored in GitHub. The correct location is still hidden until you submit another choice.";
 }
}
function renderQuestion(){
 renderCounts();
 $("modePin").disabled=$("modeExact").disabled=$("modeGrid").disabled=!connected;
 if(!connected){
  $("questionIndex").textContent="Private checkpoint required";$("question").textContent="Connect GitHub to begin";
  $("submitBtn").disabled=true;$("nextBtn").disabled=true;$("clearBtn").disabled=true;msg("No local score or unsynced fallback.");return
 }
 if(checkpoint.index>=CASES.length){
  $("questionIndex").textContent="Unscored comparison complete";$("question").textContent="All 9 cases explored";
  $("submitBtn").disabled=true;$("nextBtn").disabled=true;msg("No official points were assigned. Your comparison history is saved in GitHub.");return
 }
 const q=CASES[checkpoint.index];$("questionIndex").textContent="Case "+(checkpoint.index+1)+" of "+CASES.length+" · "+q.kind;
 $("question").textContent="Locate "+q.name;$("resultBox").hidden=!answerReveal;
 disableMain(false);
 msg("Choose a location using the "+(mode==="pin"?"pin":mode==="exact"?"land-tap":"grid")+" method.");
}
function setMode(m){
 mode=m;selected=null;answerReveal=false;drawFeedback();
 for(const name of ["pin","exact","grid"])$("mode"+name[0].toUpperCase()+name.slice(1)).classList.toggle("chosen",mode===name);
 $("toleranceRow").hidden=m!=="pin";
 $("methodHelp").textContent=m==="pin"?
  "Tap anywhere, including water. Your own pin appears; the correct location stays hidden until you submit.":
  m==="exact"?"Tap actual land, not its general vicinity. This mode is intentionally challenging for tiny countries.":
  "Choose one uniform 20° × 20° tile. This tests rough world-region knowledge, not a tiny land shape.";
 renderGrid();renderQuestion();
}
function ringContains(lon,lat,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  let a=ring[i],b=ring[j];
  let x=lon+((((a[0]-lon)+540)%360)-180),y=a[1];
  let z=lon+((((b[0]-lon)+540)%360)-180),w=b[1];
  if((y>lat)!==(w>lat)&&lon<(z-x)*(lat-y)/(w-y)+x)inside=!inside
 }return inside
}
function inPoly(f,lon,lat){
 return f.polys.some(p=>p.reduce((inside,ring)=>inside!==ringContains(lon,lat,ring),false))
}
function deltaLon(a,b){return ((a-b+540)%360)-180}
function landDistanceKm(f,lon,lat){
 if(inPoly(f,lon,lat))return 0;
 let best=Infinity;
 // Point-to-polyline approximation in a local tangent plane; accurate at trial radii
 // of a few hundred km. Includes every polygon, island, and separated atoll.
 for(const poly of f.polys)for(const ring of poly)for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length];
  const ax=deltaLon(a[0],lon)*111.32*Math.cos((a[1]+lat)*DEG/2),ay=(a[1]-lat)*111.195;
  const bx=deltaLon(b[0],lon)*111.32*Math.cos((b[1]+lat)*DEG/2),by=(b[1]-lat)*111.195;
  const dx=bx-ax,dy=by-ay;const d=dx*dx+dy*dy;
  let t=d?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/d)):0;
  const distance=Math.hypot(ax+t*dx,ay+t*dy);
  if(distance<best)best=distance;
 }
 return best
}
function nearestPoint(f,lon,lat){
 let best=Infinity,out=null;
 for(const poly of f.polys)for(const ring of poly)for(const p of ring){
  const x=deltaLon(p[0],lon)*111.32*Math.cos((p[1]+lat)*DEG/2);
  const y=(p[1]-lat)*111.195;
  const dist=Math.hypot(x,y);if(dist<best){best=dist;out=p}
 }
 return out
}
function gridCell(lon,lat){
 return{col:Math.max(0,Math.min(17,Math.floor((lon+180)/20))),
  row:Math.max(0,Math.min(8,Math.floor((90-lat)/20)))}
}
function gridHit(f,cell){
 // All islands (not a single capital or centroid) count; check every vertex.
 return f.polys.some(poly=>poly.some(ring=>ring.some(([lon,lat])=>
  gridCell(lon,lat).col===cell.col&&gridCell(lon,lat).row===cell.row)));
}
function xPath(polys){
 let d="";
 for(const poly of polys)for(const ring of poly){
  let segment=[],prev=null;
  function emit(){if(segment.length>=3)d+="M"+segment.join("L")+"Z";segment=[]}
  for(const p of ring){
   if(!Array.isArray(p)||!Number.isFinite(p[0]))continue;
   const x=px(p[0]),y=py(p[1]);
   if(prev!==null&&Math.abs(x-prev)>720)emit();
   segment.push(x.toFixed(2)+","+y.toFixed(2));prev=x;
  }emit();
 }
 return d
}
function bounds(regionSpec){let [west,east,south,north]=regionSpec;return{x:px(west),y:py(north),w:(east-west)*4,h:(north-south)*4}}
function setView(name){
 const found=VIEWS.find(x=>x[0]===name)||VIEWS[0];region=found[0];currentView=bounds(found[1]);zoomAnchor=null;
 $("viewName").textContent=region;
 for(const btn of $("regions").querySelectorAll("button"))btn.setAttribute("aria-pressed",String(btn.textContent===region));
 applyView();
}
function applyView(){svg.setAttribute("viewBox",[currentView.x,currentView.y,currentView.w,currentView.h].join(" "));drawFeedback()}
function inside(p){return p&&p.x>=currentView.x&&p.x<=currentView.x+currentView.w&&p.y>=currentView.y&&p.y<=currentView.y+currentView.h}
function pointerToMap(e){
 const matrix=svg.getScreenCTM();if(matrix&&svg.createSVGPoint){
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const q=p.matrixTransform(matrix.inverse());
  if(Number.isFinite(q.x)&&Number.isFinite(q.y))return{x:q.x,y:q.y}
 }
 const r=svg.getBoundingClientRect(),s=Math.min(r.width/currentView.w,r.height/currentView.h);
 if(!s)return null;
 return{x:currentView.x+(e.clientX-r.left-(r.width-currentView.w*s)/2)/s,
 y:currentView.y+(e.clientY-r.top-(r.height-currentView.h*s)/2)/s}
}
function zoom(f){
 const center=zoomAnchor&&inside(zoomAnchor)?zoomAnchor:
  {x:currentView.x+currentView.w/2,y:currentView.y+currentView.h/2};
 const w=Math.min(1440,Math.max(.004,currentView.w*f)),h=Math.min(720,Math.max(.004,currentView.h*f));
 currentView={x:Math.max(0,Math.min(1440-w,center.x-w/2)),
  y:Math.max(0,Math.min(720-h,center.y-h/2)),w,h};applyView()
}
function renderMap(){
 const land=$("land"),detail=$("detail");land.replaceChildren();detail.replaceChildren();
 for(const f of world.features){const d=xPath(f.polys);if(d)land.appendChild(node("path",{d,class:"country","data-code":f.id,"fill-rule":"evenodd"}))}
 for(const f of targets.features){
  if(world.features.some(w=>w.id===f.id))continue;
  const d=xPath(f.polys);if(d)detail.appendChild(node("path",{d,class:"detail","data-code":f.id,"fill-rule":"evenodd"}))
 }
}
function renderGrid(){
 const root=$("grid");root.replaceChildren();if(mode!=="grid")return;
 for(let row=0;row<9;row++)for(let col=0;col<18;col++)
  root.appendChild(node("rect",{x:col*80,y:row*80,width:80,height:80,
   class:"gridcell"+(selected?.cell?.col===col&&selected?.cell?.row===row?" chosen":"")}));
}
function pinCircle(root,p,answer=false){
 if(!p)return;
 const x=px(p.lon),y=py(p.lat);
 if(!inside({x,y}))return;
 const scale=Math.max(.001,Math.min(svg.getBoundingClientRect().width/currentView.w,
 svg.getBoundingClientRect().height/currentView.h));
 root.appendChild(node("circle",{cx:x,cy:y,r:Math.min(35,9/scale),class:answer?"answerpin":"pinmark"}));
}
function drawFeedback(){
 if(!loaded)return;
 for(const el of svg.querySelectorAll(".country,.detail"))el.classList.remove("selected","answer");
 const root=$("feedback");root.replaceChildren();renderGrid();
 if(selected?.code){
  for(const el of svg.querySelectorAll("[data-code]"))if(el.getAttribute("data-code")===selected.code)el.classList.add("selected");
 }
 if(selected?.lon!==undefined&&mode==="pin")pinCircle(root,selected);
 if(answerReveal&&checkpoint.index<CASES.length){
  const q=CASES[checkpoint.index],target=targets.features.find(x=>x.id===q.code);
  // Correct land is only revealed AFTER submission, across all mapped islands.
  for(const el of svg.querySelectorAll("[data-code]"))if(el.getAttribute("data-code")===q.code)el.classList.add("answer");
  if(target&&!world.features.some(x=>x.id===q.code)){
   const d=xPath(target.polys);
   root.appendChild(node("path",{d,fill:"#ed8b36",opacity:.95,"stroke-width":0,"pointer-events":"none"}))
  }
  if(mode==="pin"&&selected?.lon!==undefined){
   const nearest=nearestPoint(target,selected.lon,selected.lat);
   if(nearest)pinCircle(root,{lon:nearest[0],lat:nearest[1]},true);
  }
 }
}
function countryAt(lon,lat){
 // Each normal country has an independent ID. No target-answer priority.
 for(let i=world.features.length-1;i>=0;i--)if(inPoly(world.features[i],lon,lat))return world.features[i].id;
 for(let i=targets.features.length-1;i>=0;i--)
  if(!world.features.some(x=>x.id===targets.features[i].id)&&inPoly(targets.features[i],lon,lat))
   return targets.features[i].id;
 return""
}
function choose(e){
 if(!connected||busy||!loaded||checkpoint.index>=CASES.length||answerReveal)return;
 const p=pointerToMap(e);if(!inside(p))return;zoomAnchor=p;
 const lon=Math.min(179.999,Math.max(-180,p.x/4-180)),lat=Math.min(89.999,Math.max(-90,90-p.y/4));
 if(mode==="pin")selected={lon,lat};
 else if(mode==="grid")selected={lon,lat,cell:gridCell(lon,lat)};
 else{const code=countryAt(lon,lat);if(!code){msg("Tap actual land, not water, in exact mode.");return}
 selected={code,lon,lat}}
 answerReveal=false;$("resultBox").hidden=true;
 disableMain(false);drawFeedback();
 msg(mode==="pin"?"Your pin is placed (the target has not been revealed).":
  mode==="grid"?"Your 20° grid tile is selected.":"Land area selected.");
}
function renderResult(ev){
 const target=targets.features.find(f=>f.id===CASES[checkpoint.index].code);
 if(!target)return;
 $("resultBox").hidden=false;
 const exact=ev.mode==="exact",grid=ev.mode==="grid";
 const dist=exact?null:landDistanceKm(target,ev.lon,ev.lat);
 const isCorrect=exact?ev.selected_code===target.id:
  grid?gridHit(target,gridCell(ev.lon,ev.lat)):
  dist<=ev.radius;
 $("resultHeading").textContent="Unscored method feedback";
 const desc=exact?
  (isCorrect?"You touched the actual country shape.":"This tap was outside the country's actual shape. It is not counted as an official error."):
  grid?(isCorrect?"Your 20° tile contains at least one mapped part of this country.":"This tile contains none of its mapped islands/land."):
  ("Approximate distance to nearest mapped land: "+Math.round(dist)+" km. "+
   (isCorrect?"Inside":"Outside")+" the experimental "+ev.radius+" km allowance.");
 $("resultText").textContent=desc+" This is practice feedback, not an official score.";
 renderCounts();
}
async function submit(){
 if(!selected||!connected||busy||checkpoint.index>=CASES.length)return;
 const q=checkpoint.index+1;
 const ev={action:"attempt",q,mode};
 if(mode==="exact")ev.selected_code=selected.code;
 else{ev.lon=round(selected.lon,5);ev.lat=round(selected.lat,5);
  if(mode==="pin")ev.radius=Number($("radius").value)}
 await writeEvent(ev);
}
function clear(){selected=null;answerReveal=false;$("resultBox").hidden=true;drawFeedback();disableMain(false);msg("Choice cleared.")}
async function init(){
 try{
  const res=await Promise.all(["../location/data/world.json","../location/data/targets.json"].map(u=>fetch(u,{cache:"no-store"})));
  if(res.some(r=>!r.ok))throw Error("Missing static map data");
  [world,targets]=await Promise.all(res.map(r=>r.json()));
  if(world.features.length!==177||targets.features.length!==15)throw Error("Unexpected map dataset");
  if(new Set(world.features.map(f=>f.id)).size!==177)throw Error("Duplicate world country IDs");
  if(CASES.some(q=>!targets.features.some(f=>f.id===q.code)))throw Error("Missing country shape");
  loaded=true;renderMap();setView("World");setMode("pin");
  const existing=loadKey();if(existing){$("rememberToken").checked=true;await connect(existing)}
  else syncStatus("Enter the same restricted GitHub token used for the other location pilot.");
 }catch(e){msg("Map could not load. No result recorded: "+shortError(e),true)}
}
for(const [name] of VIEWS){
 const b=document.createElement("button");b.textContent=name;b.type="button";
 b.onclick=()=>setView(name);$("regions").appendChild(b);
}
$("connectBtn").onclick=()=>connect();
$("disconnectBtn").onclick=disconnect;
$("refreshBtn").onclick=()=>refresh();
$("modePin").onclick=()=>setMode("pin");$("modeExact").onclick=()=>setMode("exact");$("modeGrid").onclick=()=>setMode("grid");
$("zoomIn").onclick=()=>zoom(.65);$("zoomOut").onclick=()=>zoom(1.5);$("resetView").onclick=()=>setView(region);
$("radius").oninput=()=>{$("radiusValue").textContent=$("radius").value+" km"};
$("submitBtn").onclick=submit;$("clearBtn").onclick=clear;
$("nextBtn").onclick=async()=>{if(!connected||busy||!checkpoint.attempts.some(a=>a.q===checkpoint.index+1))return;
 await writeEvent({action:"next",q:checkpoint.index+1})};
svg.addEventListener("click",e=>{
 if(Date.now()<suppressUntil)return;
 choose(e);
});
svg.addEventListener("pointerdown",e=>{if(!loaded)return;
 pan={id:e.pointerId,startX:e.clientX,startY:e.clientY,view:{...currentView},moved:false};});
svg.addEventListener("pointermove",e=>{
 if(!pan||e.pointerId!==pan.id)return;
 const dx=e.clientX-pan.startX,dy=e.clientY-pan.startY;
 if(!pan.moved&&Math.hypot(dx,dy)<14)return;
 pan.moved=true;
 const b=svg.getBoundingClientRect(),scale=Math.max(.0001,Math.min(b.width/pan.view.w,b.height/pan.view.h));
 currentView={...pan.view,x:Math.max(0,Math.min(1440-pan.view.w,pan.view.x-dx/scale)),
 y:Math.max(0,Math.min(720-pan.view.h,pan.view.y-dy/scale))};
 applyView();
});
function endPan(e){
 if(!pan||e.pointerId!==pan.id)return;
 const moved=pan.moved;
 pan=null;
 if(moved){suppressUntil=Date.now()+280;return}
 if(e.type==="pointerup"&&e.pointerType==="touch"){
  choose(e);suppressUntil=Date.now()+280;
 }
}
svg.addEventListener("pointerup",endPan);
svg.addEventListener("pointercancel",endPan);
// WebKit synthetic click fallback when a touch ends without a click.
let touchStart=null;
svg.addEventListener("touchstart",e=>{const t=e.changedTouches?.[0];
 touchStart=t?{x:t.clientX,y:t.clientY,when:Date.now()}:null},{passive:true});
svg.addEventListener("touchend",e=>{const t=e.changedTouches?.[0];
 if(!t||!touchStart)return;
 const dist=Math.hypot(t.clientX-touchStart.x,t.clientY-touchStart.y);
 touchStart=null;
 if(dist<14&&Date.now()>suppressUntil){
  choose(t);suppressUntil=Date.now()+280;
 }
},{passive:true});
svg.addEventListener("touchcancel",()=>{touchStart=null},{passive:true});
window.addEventListener("focus",()=>refresh(true));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh(true)});
setInterval(()=>refresh(true),15000);
init();
