"use strict";
const $=id=>document.getElementById(id);
const TARGET={code:"TV",country:"Tuvalu",capital:"Funafuti"};
const ISSUE="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/4";
const KIND="wcg.connected-atlas.one-country.v1",PILOT="connected-triple-tuvalu-20261011";
const PAT_KEY="wcg-location-github-pat-v1";
const ALL_MARKERS=[
 // Equal-style neutral fixed country anchors. Coordinate = representative real land/location.
 ["TV",-8.52,179.20],["NR",-.52,166.93],["KI",1.87,-157.36],["TO",-21.14,-175.20],
 ["FJ",-17.71,178.06],["VU",-16.08,167.40],["SB",-9.65,160.17],
 ["WS",-13.83,-171.77],["FM",6.92,158.18],["MH",7.09,171.38],
 ["PW",7.50,134.62],["PG",-6.31,147.00],["NZ",-40.90,174.89],["AU",-25.27,133.78],
 ["MC",43.738,7.425],["VA",41.903,12.453],["SM",43.941,12.458],
 ["AD",42.506,1.521],["LI",47.14,9.54],["MT",35.90,14.51],
 ["AG",17.07,-61.79],["BB",13.19,-59.54],["BS",25.03,-77.40],
 ["DM",15.41,-61.37],["GD",12.12,-61.68],["KN",17.35,-62.75],
 ["LC",13.91,-60.98],["VC",13.25,-61.20],["TT",10.69,-61.22],
 ["HT",18.97,-72.29],["JM",18.11,-77.29],["CU",21.52,-77.78]
];
const views={
 World:[-180,180,-82,85],
 Europe:[-14,43,32,66],
 Caribbean:[-87,-57,8,28],
 Pacific:[125,225,-52,26]
};
const svg=$("map"),px=l=>(l+180)*4,py=a=>(90-a)*4;
let world=null,details=null,region="World",view=null,stage="form",picked=null,token="",connected=false,busy=false;
let resultRecord=null,history=[],savedIds=new Set();
function svgNode(tag,attrs,cls){
 const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
 if(cls)el.setAttribute("class",cls);
 return el;
}
function escapeErr(e){return String(e?.message||e).replace(/github_pat_[\w]+/g,"[hidden]").slice(0,120)}
function norm(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"")}
function lonWrap(l){return ((l+180)%360+360)%360-180}
function bounds(name){
 const b=views[name],r=svg.getBoundingClientRect(),ratio=r.width/Math.max(1,r.height);
 let w=(b[1]-b[0])*4,h=(b[3]-b[2])*4;
 const cx=px((b[0]+b[1])/2),cy=py((b[2]+b[3])/2);
 if(w/h<ratio)w=h*ratio;else h=w/ratio;
 return{x:cx-w/2,y:Math.max(0,Math.min(720-h,cy-h/2)),w,h};
}
function setRegion(name){
 region=name;view=bounds(name);
 for(const b of $("regions").querySelectorAll("button"))b.setAttribute("aria-pressed",String(b.dataset.region===name));
 $("viewLabel").textContent=name+" view";
 draw();
}
function inside(x,y){return x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h}
function pathData(poly,shift){return poly.map(ring=>"M"+ring.map(v=>(px(v[0])+shift).toFixed(2)+","+py(v[1]).toFixed(2)).join("L")+"Z").join(" ")}
function draw(){
 if(!view)return;
 svg.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const land=$("land"),micro=$("micro"),sel=$("selected");
 land.replaceChildren();micro.replaceChildren();sel.replaceChildren();
 if(!world)return;
 // Existing Natural Earth 110m shapes plus explicit detailed shapes absent in the background.
 const collection=[...world.features,...details.features.filter(f=>!world.features.some(w=>w.id===f.id))];
 for(const f of collection){
  for(const shift of [-1440,0,1440]){
   const item=svgNode("path",{d:f.polys.map(p=>pathData(p,shift)).join(" "), "data-iso":f.id},"landpath");
   item.addEventListener("click",()=>select(f.id));
   land.appendChild(item);
  }
 }
 const scale=Math.max(.001,svg.getBoundingClientRect().width/view.w);
 const r=Math.max(3,Math.min(25,10/scale)),sw=Math.max(.7,Math.min(4,1.6/scale));
 for(const [code,lat,lon] of ALL_MARKERS){
  for(const shift of [-1440,0,1440]){
   const x=px(lon)+shift,y=py(lat);
   if(!inside(x,y))continue;
   const g=svgNode("g",{"data-iso":code},"marker"+(picked===code?" is-selected":"")+(stage==="done"&&code===TARGET.code?" is-correct":""));
   const c=svgNode("circle",{cx:x,cy:y,r, "stroke-width":sw, "data-iso":code});
   c.addEventListener("click",e=>{e.stopPropagation();select(code)});
   g.appendChild(c);micro.appendChild(g);
  }
 }
}
function select(code){
 if(stage!=="atlas")return;
 picked=code;draw();
 $("choiceStatus").textContent="Location selected. No country name revealed. You can change it until submitting.";
 $("submitBtn").disabled=false;
}
function zoom(k){
 if(!view)return;
 const cx=view.x+view.w/2,cy=view.y+view.h/2;
 const w=Math.max(40,Math.min(1600,view.w*k)),h=Math.max(20,Math.min(720,view.h*k));
 view={x:cx-w/2,y:Math.max(0,Math.min(720-h,cy-h/2)),w,h};
 draw();
}
function goAtlas(){
 const a=$("country").value.trim(),b=$("capital").value.trim();
 if(!a||!b)return;
 stage="atlas";$("answerForm").hidden=true;$("atlasPrompt").hidden=false;$("report").hidden=true;
 $("typedCountry").textContent=a;$("typedCapital").textContent=b;
 $("atlasState").textContent="Select a location";
 $("choiceStatus").textContent="Choose a region, then select a neutral marker or a country's land outline.";
 $("submitBtn").disabled=!picked;
 // Intentionally remain in World view: never provide target-specific viewport hints.
 setRegion("World");
}
function showResult(ev){
 stage="done";resultRecord=ev;
 $("answerForm").hidden=true;$("atlasPrompt").hidden=true;$("report").hidden=false;
 const okCountry=norm(ev.country)===norm(TARGET.country);
 const okCapital=norm(ev.capital)===norm(TARGET.capital);
 const okLocation=ev.choice===TARGET.code;
 const score=Number(okCountry)+Number(okCapital)+Number(okLocation);
 $("scoreHeading").textContent="Your connected demo: "+score+"/3";
 const entries=[
  ["Flag → country",ev.country,TARGET.country,okCountry],
  ["Country → capital",ev.capital,TARGET.capital,okCapital],
  ["Country → location",ev.choice||"No position",TARGET.country,okLocation]
 ];
 $("results").replaceChildren();
 for(const [label,user,correct,ok] of entries){
  const el=document.createElement("div");el.className="result "+(ok?"ok":"bad");
  const heading=document.createElement("strong");heading.textContent=(ok?"✓ ":"✕ ")+label;
  const detail=document.createElement("span");detail.textContent="Your answer: "+user+(ok?"":" · Correct: "+correct);
  el.append(heading,detail);$("results").appendChild(el);
 }
 $("atlasState").textContent="Practice evaluation complete";
 $("choiceStatus").textContent="The correct country's fixed atlas marker is now green. Your selected location is blue if different.";
 draw();
}
function makeAttempt(){
 if(stage!=="atlas"||!picked)return;
 const ev={kind:KIND,pilot_id:PILOT,action:"complete",attempt_id:crypto.randomUUID(),
 country:$("country").value.trim(),capital:$("capital").value.trim(),choice:picked,mode:"atlas-marker-or-outline",at:new Date().toISOString()};
 showResult(ev);
 if(connected)saveAttempt(ev);else $("syncStatus").textContent="Completed locally; this demo is not synchronized until GitHub is connected.";
}
function restart(){
 stage="form";picked=null;resultRecord=null;$("country").value="";$("capital").value="";
 $("answerForm").hidden=false;$("atlasPrompt").hidden=true;$("report").hidden=true;
 $("atlasState").textContent="Finish written answers first";
 $("choiceStatus").textContent="Enter country and capital to unlock location selection.";
 setRegion("World");$("country").focus();
}
function keySaved(){try{return localStorage.getItem(PAT_KEY)||""}catch{return""}}
function keyStore(v){try{if(v)localStorage.setItem(PAT_KEY,v);else localStorage.removeItem(PAT_KEY)}catch{}}
async function api(url,options={}){
 const res=await fetch(url,{...options,cache:"no-store",redirect:"error",headers:{
  Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",
  Authorization:"Bearer "+token,...(options.headers||{})
 }});
 if(!res.ok)throw Error("GitHub HTTP "+res.status+"; verify restricted Issues permission");
 return res.json();
}
async function loadHistory(){
 const records=[];
 for(let page=1;page<=10;page++){
  const batch=await api(ISSUE+"/comments?per_page=100&page="+page);
  records.push(...batch);
  if(batch.length<100)break;
 }
 history=records.map(c=>{try{return JSON.parse(c.body)}catch{return null}})
   .filter(x=>x&&x.kind===KIND&&x.pilot_id===PILOT&&x.action==="complete");
 savedIds=new Set(history.map(x=>x.attempt_id));
 $("syncStatus").textContent="Connected to private Issue #4. "+history.length+" completed practice attempt(s) saved.";
}
async function connect(t){
 const supplied=(t||$("pat").value||"").trim();
 if(!/^github_pat_[A-Za-z0-9_]+$/.test(supplied)&&!/^gh[pousr]_[A-Za-z0-9_]+$/.test(supplied)){
  $("syncStatus").textContent="Enter the restricted GitHub Issues token, or play without connecting.";return;
 }
 token=supplied;
 try{
  const issue=await api(ISSUE);
  if(issue.state!=="open"||!/one-country connected/i.test(issue.title))throw Error("Unexpected practice issue");
  connected=true;await loadHistory();$("authStatus").textContent="Connected";
  $("authForm").hidden=true;$("disconnect").hidden=false;$("refreshHistory").hidden=false;
  if($("remember").checked)keyStore(token);$("pat").value="";
  if(resultRecord&&!savedIds.has(resultRecord.attempt_id))await saveAttempt(resultRecord);
 }catch(e){connected=false;token="";$("syncStatus").textContent=escapeErr(e);}
}
function disconnect(){
 connected=false;token="";keyStore("");$("authForm").hidden=false;
 $("authStatus").textContent="Optional";$("disconnect").hidden=true;$("refreshHistory").hidden=true;
 $("syncStatus").textContent="Disconnected. Existing private GitHub records are preserved.";
}
async function saveAttempt(ev){
 if(!connected||busy||savedIds.has(ev.attempt_id))return;
 busy=true;$("syncStatus").textContent="Saving the complete three-part practice attempt to GitHub…";
 try{
  await loadHistory();
  if(!savedIds.has(ev.attempt_id)){
   const resp=await api(ISSUE+"/comments",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({body:JSON.stringify(ev)})});
   if(!resp.id)throw Error("No comment confirmation");
   await loadHistory();
  }
  if(!savedIds.has(ev.attempt_id))throw Error("Confirmation was not replayed");
 }catch(e){$("syncStatus").textContent="Not saved: "+escapeErr(e)+" — retry connecting later.";}
 finally{busy=false}
}
async function init(){
 $("answerForm").addEventListener("submit",e=>{e.preventDefault();goAtlas()});
 $("submitBtn").addEventListener("click",makeAttempt);
 $("editBtn").addEventListener("click",()=>{stage="form";$("answerForm").hidden=false;$("atlasPrompt").hidden=true;$("atlasState").textContent="Finish written answers";});
 $("restartBtn").addEventListener("click",restart);
 $("connect").addEventListener("click",()=>connect());
 $("disconnect").addEventListener("click",disconnect);
 $("refreshHistory").addEventListener("click",async()=>{try{await loadHistory()}catch(e){$("syncStatus").textContent=escapeErr(e)}});
 $("regions").addEventListener("click",e=>{const btn=e.target.closest("button[data-region]");if(btn)setRegion(btn.dataset.region)});
 $("zoomIn").addEventListener("click",()=>zoom(.70));
 $("zoomOut").addEventListener("click",()=>zoom(1.43));
 $("resetMap").addEventListener("click",()=>setRegion(region));
 window.addEventListener("resize",()=>setRegion(region));
 try{
  const response=await Promise.all(["../location/data/world.json","../location/data/targets.json"].map(u=>fetch(u,{cache:"no-store"})));
  if(response.some(r=>!r.ok))throw Error("Map geography files unavailable");
  [world,details]=await Promise.all(response.map(r=>r.json()));
  if(world.features.length!==177||details.features.length!==15)throw Error("Unexpected geography version");
  setRegion("World");
  $("choiceStatus").textContent="Map loaded. First, enter country and capital.";
  const saved=keySaved();if(saved){$("remember").checked=true;await connect(saved)}
 }catch(e){$("choiceStatus").textContent="Map unavailable: "+escapeErr(e)}
}

/* Desktop wheel zoom, pointer drag-to-pan and cursor-anchored zoom. Manual navigation only. */
let mapGesture=null, suppressMapClickUntil=0;
function clampMap(v){
 const w=Math.max(12,Math.min(1600,v.w)),h=Math.max(8,Math.min(720,v.h));
 return {x:Math.max(-1440,Math.min(2880-w,v.x)),y:Math.max(0,Math.min(720-h,v.y)),w,h};
}
function pointFromPointer(e){
 const m=svg.getScreenCTM();
 if(m&&svg.createSVGPoint){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
 const q=p.matrixTransform(m.inverse());return {x:q.x,y:q.y}}
 const r=svg.getBoundingClientRect();return{x:view.x+(e.clientX-r.x)/r.width*view.w,y:view.y+(e.clientY-r.y)/r.height*view.h}
}
function zoomOn(factor,x,y){
 if(!view)return;
 const anchor=x===undefined?{x:view.x+view.w/2,y:view.y+view.h/2}:{x,y};
 const nw=Math.max(12,Math.min(1600,view.w*factor));
 const nh=Math.max(8,Math.min(720,view.h*factor));
 const dx=(anchor.x-view.x)/view.w,dy=(anchor.y-view.y)/view.h;
 view=clampMap({x:anchor.x-dx*nw,y:anchor.y-dy*nh,w:nw,h:nh});draw()
}
svg.addEventListener("wheel",e=>{
 if(!view)return;e.preventDefault();
 const p=pointFromPointer(e);zoomOn(e.deltaY<0?0.79:1.27,p.x,p.y);
},{passive:false});
svg.addEventListener("pointerdown",e=>{
 if(e.button!==0||!view)return;
 mapGesture={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,origin:{...view},dragging:false};
});
svg.addEventListener("pointermove",e=>{
 if(!mapGesture||e.pointerId!==mapGesture.pointer)return;
 const dx=e.clientX-mapGesture.startX,dy=e.clientY-mapGesture.startY;
 if(!mapGesture.dragging&&Math.hypot(dx,dy)>5){
  mapGesture.dragging=true;
  try{svg.setPointerCapture(e.pointerId)}catch(_){}
 }
 if(mapGesture.dragging){
  const b=svg.getBoundingClientRect();
  view=clampMap({...mapGesture.origin,
   x:mapGesture.origin.x-dx*mapGesture.origin.w/b.width,
   y:mapGesture.origin.y-dy*mapGesture.origin.h/b.height
  });draw();
 }
});
function endMapGesture(e){
 if(!mapGesture||e.pointerId!==mapGesture.pointer)return;
 if(mapGesture.dragging)suppressMapClickUntil=performance.now()+400;
 if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
 mapGesture=null;
}
svg.addEventListener("pointerup",endMapGesture);
svg.addEventListener("pointercancel",endMapGesture);
svg.addEventListener("click",e=>{
 if(performance.now()<suppressMapClickUntil){e.preventDefault();e.stopImmediatePropagation()}
},true);

init();
