"use strict";
/*
 Country Location Pilot v1 — UN-SCORED EXPERIMENT
 Static local assets only. Never requests or writes official quiz scores.
*/
const PILOT="geography-location-v1", STOR="wcg-location-pilot-v1";
const $=s=>document.getElementById(s);
const VIEWS=[
 ["World",[-180,180,-78,84]],["Europe",[-13,40,34,65]],["Italy microstates",[6.6,13.8,40.7,45.9]],
 ["Africa",[-25,55,-39,40]],["West Africa",[-21,20,1,28]],["Southern Africa",[8,40,-39,-10]],
 ["South Asia",[65,106,3,40]],["Middle East",[25,60,15,45]],["SE Asia",[91,145,-18,28]],
 ["Pacific West",[134,180,-30,23]],["Pacific East",[-180,-132,-33,24]],["Americas",[-125,-32,-59,63]]
];
/* All markers are unlabeled and always visible in the matching regional view,
   regardless of the question. No marker is generated from the answer. */
const MARKERS=[["MC",7.416,43.737],["VA",12.4533,41.9032],["SM",12.45,43.94],
 ["NR",166.931,-0.526],["TV",179.2,-8.52],["KI",173.03,1.45],
 ["KI",-157.3,1.9],["TO",-175.2,-21.16]];
const px=lon=>(lon+180)*4, py=lat=>(90-lat)*4;
const viewbox=([w,e,s,n])=>({x:px(w),y:py(n),w:(e-w)*4,h:(n-s)*4});
let data=null,world=null,shapes=null,progress=null,currentView=null,region="World",selected="",loaded=false,drag=null,suppress=false;
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
function save(){if(!progress)return;progress.region=region;
 try{localStorage.setItem(STOR,JSON.stringify(progress))}
 catch(e){$("status").textContent="Storage unavailable. Export a checkpoint before closing the page."}
}
function done(){return data?.questions.filter(q=>!progress.done.includes(q.q))[0]||null}
function zoomScale(){if(!currentView)return 1;let b=svg.getBoundingClientRect();return Math.max(.001,Math.min(b.width/currentView.w,b.height/currentView.h))}
function inside(x,y){return currentView&&x>=currentView.x&&x<=currentView.x+currentView.w&&y>=currentView.y&&y<=currentView.y+currentView.h}
function markers(){
 const g=$("marks");g.replaceChildren();if(region==="World"||!currentView)return;
 const sc=zoomScale(),vis=8/sc,hit=23/sc;
 for(const [code,lon,lat] of MARKERS){
  if(!inside(px(lon),py(lat)))continue;
  const wrap=node("g",{"data-code":code,role:"button",tabindex:0,"aria-label":"Select small country location"});
  wrap.appendChild(node("circle",{class:"marker",cx:px(lon),cy:py(lat),r:vis}));
  wrap.appendChild(node("circle",{class:"hit",cx:px(lon),cy:py(lat),r:hit}));
  g.appendChild(wrap)
 }highlight()
}
function highlight(){document.querySelectorAll("#land [data-code],#detail [data-code],#marks [data-code]").forEach(g=>{
 let isSelected=Boolean(selected)&&g.getAttribute("data-code")===selected;
 g.querySelectorAll("path,circle.marker").forEach(el=>el.classList.toggle("picked",isSelected))
})}
function paint(){
 for(const [id,features,klass] of [["land",world.features,"country"],["detail",shapes.features,"target"]]){
  let root=$(id);root.replaceChildren();
  for(const f of features){let d=path(f.polys);if(!d)continue;
   let el=node("path",{d,"data-code":f.id,class:klass,role:"button",tabindex:0,"aria-label":"Select country area","fill-rule":"evenodd"});
   root.appendChild(el)
  }
 }markers();highlight()
}
function applyView(){if(!currentView)return;svg.setAttribute("viewBox",[currentView.x,currentView.y,currentView.w,currentView.h].join(" "));markers()}
function setRegion(name){
 const x=VIEWS.find(a=>a[0]===name)||VIEWS[0];region=x[0];currentView=viewbox(x[1]);$("regionname").textContent=region;
 document.querySelectorAll(".regions button").forEach(b=>b.setAttribute("aria-pressed",String(b.textContent===region)));
 selected="";$("check").disabled=true;applyView();highlight();save();
 if(loaded&&done())show("Choose a location on the map.", "")
}
function zoom(f){
 if(!loaded||!currentView)return;
 const c={x:currentView.x+currentView.w/2,y:currentView.y+currentView.h/2};
 const w=Math.min(1440,Math.max(.02,currentView.w*f)),h=Math.min(720,Math.max(.02,currentView.h*f));
 currentView={x:Math.max(0,Math.min(1440-w,c.x-w/2)),y:Math.max(0,Math.min(720-h,c.y-h/2)),w,h};applyView()
}
function show(s,cls){$("status").textContent=s;$("status").className="status"+(cls?" "+cls:"")}
function question(){
 if(!data||!progress)return;
 $("progress").textContent=progress.done.length;
 let q=done();selected="";highlight();$("check").disabled=true;
 if(!q){$("qindex").textContent="Pilot complete";$("question").textContent="15 locations tested";show("Pilot complete on this device. Save your checkpoint for the review.","good");return}
 $("qindex").textContent="Pilot item "+q.q+" of 15";$("question").textContent="Find "+q.name;show("Select the country's location. No country names are shown on the map.","")
}
function select(code){if(!loaded||!done()||!code)return;selected=code;highlight();$("check").disabled=false;show("Location selected. Check your answer when ready.","")}
function answer(){
 const q=done();if(!loaded||!selected||!q)return;
 const ok=selected===q.code;
 progress.attempts.push({q:q.q,country:selected,ok,at:new Date().toISOString()});
 if(ok){progress.done=uniqueSortedDone([...progress.done,q.q]);save();question();if(done())show("Correct location saved. Next country is ready.","good")}
 else{save();selected="";highlight();$("check").disabled=true;show("Not the requested country. Try again; no clue or answer is revealed.","warn")}
}
function fail(msg){loaded=false;$("maperror").textContent=msg+" Your unfinished pilot question is preserved. Use Reload maps.";$("maperror").classList.add("on");$("check").disabled=true;show("Static map files unavailable. No result has been recorded.","warn")}
async function init(){
 loaded=false;$("check").disabled=true;$("maperror").classList.remove("on");show("Loading local map files…","");
 try{
  const paths=["data/manifest.json","data/world.json","data/targets.json"];
  const res=await Promise.all(paths.map(p=>fetch(p,{cache:"no-store"})));
  if(res.some(r=>!r.ok))throw Error("A required static map file failed to load.");
  const [m,w,s]=await Promise.all(res.map(r=>r.json()));
  if(m.pilot_id!==PILOT||m.questions.length!==15||w.features.length!==177||s.features.length!==15)throw Error("Static data integrity check failed.");
  const expected=m.questions.map(q=>q.code),found=new Set(s.features.map(f=>f.id));
  if(new Set(expected).size!==15||found.size!==15||expected.some(c=>!found.has(c)))throw Error("Pilot shapes and frozen questions disagree.");
  if([...w.features,...s.features].some(f=>!Array.isArray(f.polys)||!f.polys.length||!path(f.polys)))throw Error("One or more map geometries are missing.");
  data=m;world=w;shapes=s;
  let saved={};try{saved=JSON.parse(localStorage.getItem(STOR)||"{}")}catch(e){}
  if(saved.version&&saved.version!==data.version)throw Error("Checkpoint version changed. Export your old checkpoint first.");
  progress=normalizeState(saved);loaded=true;paint();setRegion(progress.region);question()
 }catch(e){fail(e.message||"Map unavailable")}
}
function exportState(){return JSON.stringify({...progress,pilot_id:PILOT,version:data.version,exported_at:new Date().toISOString(),type:"UNSCORED_LOCATION_PILOT"},null,2)}
function importState(){
 try{
  if(!loaded)throw Error("Load the map files before restoring a checkpoint.");
  const raw=JSON.parse($("checkpointInput").value);
  if(raw.pilot_id!==PILOT||raw.version!==data.version)throw Error("Checkpoint is for a different pilot or version.");
  progress=normalizeState(raw);setRegion(progress.region);save();question();$("restoreStatus").textContent="Restored "+progress.done.length+"/15 locations."
 }catch(e){$("restoreStatus").textContent=e.message}
}
/* Tap to select; pointer drag to pan. Drag suppresses the following click. */
svg.addEventListener("click",e=>{
 if(suppress){suppress=false;return}
 let el=e.target.closest("[data-code]");if(el&&svg.contains(el))select(el.getAttribute("data-code"))
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
 if(!drag.moved&&Math.hypot(dx,dy)<=7)return;
 drag.moved=true;svg.classList.add("dragging");
 const b=svg.getBoundingClientRect(),scale=Math.max(.0001,Math.min(b.width/drag.origin.w,b.height/drag.origin.h));
 currentView={...drag.origin,x:Math.max(0,Math.min(1440-drag.origin.w,drag.origin.x-dx/scale)),y:Math.max(0,Math.min(720-drag.origin.h,drag.origin.y-dy/scale))};
 applyView()
});
function finishDrag(e){if(drag?.id===e.pointerId){if(drag.moved){suppress=true;setTimeout(()=>{suppress=false},100)}drag=null;svg.classList.remove("dragging")}}
svg.addEventListener("pointerup",finishDrag);svg.addEventListener("pointercancel",finishDrag);
for(const [name] of VIEWS){
 let b=document.createElement("button");b.type="button";b.textContent=name;b.setAttribute("aria-pressed",String(name===region));b.onclick=()=>setRegion(name);$("regions").appendChild(b)
}
$("check").onclick=answer;
$("zoomIn").onclick=()=>zoom(.65);$("zoomOut").onclick=()=>zoom(1.5);$("resetView").onclick=()=>setRegion(region);
$("reload").onclick=init;
$("clear").onclick=()=>{if(!confirm("Reset only this experimental 15-country pilot? Official scores stay unchanged."))return;try{localStorage.removeItem(STOR)}catch(e){}init()};
$("checkpoint").onclick=async()=>{if(!data||!progress)return;const value=exportState();
 try{await navigator.clipboard.writeText(value);show("Pilot checkpoint copied to clipboard.","good")}
 catch(e){$("restore").open=true;$("checkpointInput").value=value;$("checkpointInput").select();show("Clipboard blocked. Select and copy the checkpoint text below.","warn")}
};
$("saveFile").onclick=()=>{if(!data||!progress)return;let url=URL.createObjectURL(new Blob([exportState()],{type:"application/json"}));let a=document.createElement("a");a.href=url;a.download="world-location-pilot-checkpoint.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("restoreBtn").onclick=importState;
init();
