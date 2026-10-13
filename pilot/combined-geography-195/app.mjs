import {atlasIndex,referee} from "../geography-integrated-v4/referee/scorer.mjs";
import {githubClient,replay,eventFor,ISSUE} from "./sync.mjs";
const $=id=>document.getElementById(id);
const TOKEN_KEY="wcg-location-github-pat-v1"; // prior user opt-in only; never automatically read.
const api="https://api.github.com/repos/amrsilver82/World-Capitals-Game/issues/"+ISSUE;
let manifest=null,questions=[],client=null,remote=null,connected=false,busy=false,refreshing=false;
let pageIndex=0,currentDraft=null,identityLocked=false,temporaryPin=null,atlas=null,world=null,hi=null,detail=null;
let view={x:0,y:0,w:1440,h:720},lastDrawn="",activeDrawing=null;
const HALF=Math.PI/180;
const modes={country_pin:"Locate actual country",broad_area:"Identify broad area"};
function message(text,klass=""){$("questionStatus").className=klass;$("questionStatus").textContent=text}
function auth(text,klass=""){$("authStatus").className=klass;$("authStatus").textContent=text}
function getCurrent(){return remote?.next||null}
function renderCount(){const done=remote?.accepted.length||0;$("count").textContent=done+" / 195 experimentally synced";$("stage").textContent=connected?"GitHub draft connected · not official":"Read-only until private GitHub connected"}
function renderCards(){
 if(!questions.length)return;
 const n=Math.ceil(questions.length/10);pageIndex=Math.max(0,Math.min(n-1,pageIndex));
 $("batchNo").textContent="Batch "+(pageIndex+1)+" / "+n;$("batchPrev").disabled=pageIndex===0;$("batchNext").disabled=pageIndex===n-1;
 const wrap=$("cards");wrap.replaceChildren();
 for(const q of questions.slice(pageIndex*10,pageIndex*10+10)){
  const card=document.createElement("article");card.className="card";
  const done=remote?.accepted.find(x=>x.q===q.q);
  if(done)card.classList.add("done");if(getCurrent()?.q===q.q)card.classList.add("current");
  const top=document.createElement("div");top.className="header";
  const no=document.createElement("strong");no.textContent="Question "+q.q;
  const state=document.createElement("span");state.textContent=done?"Saved to GitHub":getCurrent()?.q===q.q?"Current":"Upcoming";top.append(no,state);
  const flag=document.createElement("div");flag.className="flagPic";
  const img=document.createElement("img");img.src=q.flag;img.loading="lazy";img.alt="Flag for question "+q.q;flag.appendChild(img);
  const field=document.createElement("div");field.className="fieldsSmall";
  field.textContent=done?"Country: "+(done.countryText||"—")+" · Capital: "+(done.capitalText||"—"):"Country and Capital fields are below for the active question";
  const button=document.createElement("button");button.type="button";
  button.textContent=getCurrent()?.q===q.q?"Go to current question":done?"See saved submission":"Not yet available";
  button.disabled=!done&&getCurrent()?.q!==q.q;button.onclick=()=>{if(done)showSaved(done);else $("activePanel").scrollIntoView({behavior:"smooth"})};
  card.append(top,flag,field,button);wrap.appendChild(card);
 }
}
function showSaved(done){
 const q=questions[done.q-1];const grade=atlas?referee({...scoreInput(q,done.geography),atlas}):null;
 message("GitHub-confirmed experimental Q"+done.q+" · "+q.name+" · provisional geography "+(grade?.points??"pending")+"/1. This record cannot be edited in the browser.","good");
}
function showNext(){
 renderCount();renderCards();
 const q=getCurrent();identityLocked=false;currentDraft=null;temporaryPin=null;
 $("countryInput").value="";$("capitalInput").value="";
 const enabled=!!q&&connected&&!busy;
 $("countryInput").disabled=!enabled;$("capitalInput").disabled=!enabled;
 $("lockIdentity").disabled=!enabled;$("lockIdentity").hidden=!q;
 $("unlockIdentity").hidden=true;$("geoControls").hidden=true;
 $("activeTitle").textContent=q?"Q"+q.q+" of 195 — identify this flag":"195-country Geography game";
 $("modeLabel").textContent=q?modes[q.mode]:"";
 $("instructions").textContent=q?
  "Enter Country and Capital, then Continue to Geography. These two fields are recorded but are NOT automatically graded in this development candidate.":
  connected?"All 195 experimental draft answers are stored on GitHub. Official scores unaffected.":"Connect GitHub to submit draft answers. Browse the 195 flag cards above without playing.";
 message(q?"No answers will be saved until you confirm a complete question and GitHub accepts it.":"");
 pageIndex=q?Math.floor((q.q-1)/10):pageIndex;renderCards();
}
function scoreInput(q,g){
 return {iso:q.iso,mode:q.mode,point:g.point||null,areaChoice:g.choice||null,acceptedArea:q.area||null};
}
function normalizedGeo(){
 const q=getCurrent();if(!q)return null;
 if(q.mode==="broad_area"){const v=$("areaSelect").value;return v?{mode:q.mode,choice:v}:null}
 return temporaryPin?{mode:q.mode,point:{...temporaryPin}}:null;
}
function updateSubmit(){const g=normalizedGeo();$("submit").disabled=!connected||busy||!identityLocked||!g||!atlas}
function path(poly,shift){
 let d="";for(const ring of poly){let prev=null,part="";
  for(const [rawLon,lat] of ring){let lon=rawLon;if(prev!==null){while(lon-prev>180)lon-=360;while(lon-prev< -180)lon+=360}prev=lon;
   part+=(part?"L":"M")+((lon+180)*4+shift).toFixed(2)+","+((90-lat)*4).toFixed(2)}
  if(part)d+=part+"Z ";
 }return d;
}
function drawMap(force=false){
 const map=$("atlas");map.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const detailed=!!hi&&view.w<=600,kind=detailed?"high":"low";
 if(force||kind!==lastDrawn){
  const land=$("land");land.replaceChildren();
  const shapes=detailed?hi.features:world?.features||[],ids=new Set(shapes.map(x=>x.id));
  const add=detail?.features.filter(f=>!ids.has(f.id))||[];
  for(const f of [...shapes,...add])for(const shift of [-1440,0,1440]){
   const el=document.createElementNS("http://www.w3.org/2000/svg","path");
   el.setAttribute("d",f.polys.map(p=>path(p,shift)).join(" "));
   el.setAttribute("class","countryShape");el.setAttribute("data-iso",f.id);land.appendChild(el);
  }
  lastDrawn=kind;
 }
 const marks=$("pinLayer");marks.replaceChildren();
 if(!temporaryPin)return;
 for(const shift of [-1440,0,1440]){
  const x=(temporaryPin.lon+180)*4+shift,y=(90-temporaryPin.lat)*4;
  if(x<view.x||x>view.x+view.w||y<view.y||y>view.y+view.h)continue;
  const m=document.createElementNS("http://www.w3.org/2000/svg","circle");m.setAttribute("cx",x);m.setAttribute("cy",y);
  m.setAttribute("r",6*Math.max(.01,view.w/1440));m.setAttribute("class","marker");marks.appendChild(m);
 }
 $("mapStatus").textContent=hi?(detailed?"Detailed world borders":"World overview · zoom in for detail"):"Loading detailed atlas…";
}
function worldView(){
 const w=1440,ratio=Math.max(.5,$("atlas").clientWidth/Math.max(1,$("atlas").clientHeight));
 view={x:0,y:0,w,h:Math.min(720,w/ratio)}; // preserve full world from initial UI, not zoom to target
 if(view.h<680)view={x:0,y:0,w:1440,h:720};
 drawMap();
}
function normalize(lon){return ((lon+180)%360+360)%360-180}
function mapPoint(e){
 const svg=$("atlas"),m=svg.getScreenCTM();
 if(m&&svg.createSVGPoint){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const a=p.matrixTransform(m.inverse());return{x:a.x,y:a.y}}
 const r=svg.getBoundingClientRect();return{x:view.x+(e.clientX-r.x)*view.w/r.width,y:view.y+(e.clientY-r.y)*view.h/r.height};
}
function clampView(){view.w=Math.max(12,Math.min(1440,view.w));view.h=Math.max(8,Math.min(720,view.h));
 view.x=Math.max(-1440,Math.min(2880-view.w,view.x));view.y=Math.max(0,Math.min(720-view.h,view.y))}
function zoom(f,p){
 const a=p||{x:view.x+view.w/2,y:view.y+view.h/2};const w=view.w,h=view.h;
 view.w=w*f;view.h=h*f;view.x=a.x-(a.x-view.x)*f;view.y=a.y-(a.y-view.y)*f;clampView();drawMap();
}
function setPin(e){
 const q=getCurrent();if(!q||q.mode!=="country_pin"||!identityLocked||!connected||busy)return;
 const p=mapPoint(e);temporaryPin={lon:+normalize(p.x/4-180).toFixed(3),lat:+Math.max(-90,Math.min(90,90-p.y/4)).toFixed(3)};
 drawMap();updateSubmit();
}
function setupMap(){
 const svg=$("atlas");let drag=null,touch=null;
 svg.addEventListener("wheel",e=>{e.preventDefault();zoom(Math.exp(Math.max(-.18,Math.min(.18,e.deltaY*.0012))),mapPoint(e))},{passive:false});
 svg.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...view},moved:false};try{svg.setPointerCapture(e.pointerId)}catch{}});
 svg.addEventListener("pointermove",e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>5)drag.moved=true;
  if(drag.moved){view={...drag.start,x:drag.start.x-dx*drag.start.w/Math.max(1,svg.clientWidth),y:drag.start.y-dy*drag.start.h/Math.max(1,svg.clientHeight)};clampView();drawMap()}
 });
 svg.addEventListener("pointerup",e=>{if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;drag=null;if(!moved)setPin(e)});
 svg.addEventListener("touchstart",e=>{if(e.touches.length===1){touch={one:true,x:e.touches[0].clientX,y:e.touches[0].clientY,lx:e.touches[0].clientX,ly:e.touches[0].clientY,moved:false}}
  else if(e.touches.length===2){const a=e.touches[0],b=e.touches[1];touch={one:false,dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),mx:(a.clientX+b.clientX)/2,my:(a.clientY+b.clientY)/2}};e.preventDefault()},{passive:false});
 svg.addEventListener("touchmove",e=>{
  if(!touch)return;
  if(e.touches.length===2){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),mx=(a.clientX+b.clientX)/2,my=(a.clientY+b.clientY)/2;
   if(touch.one){touch={one:false,dist:d,mx,my}}
   else{zoom(touch.dist/Math.max(d,1),mapPoint({clientX:mx,clientY:my}));touch={one:false,dist:d,mx,my}}}
  else if(touch.one&&e.touches.length===1){const a=e.touches[0];if(Math.hypot(a.clientX-touch.x,a.clientY-touch.y)>7)touch.moved=true;
   if(touch.moved){view.x-=(a.clientX-touch.lx)*view.w/Math.max(1,svg.clientWidth);view.y-=(a.clientY-touch.ly)*view.h/Math.max(1,svg.clientHeight);clampView();drawMap()}
   touch.lx=a.clientX;touch.ly=a.clientY}
  e.preventDefault();
 },{passive:false});
 svg.addEventListener("touchend",e=>{if(touch?.one&&!touch.moved&&e.changedTouches?.length===1)setPin(e.changedTouches[0]);touch=null;e.preventDefault()},{passive:false});
 svg.addEventListener("click",e=>{if(e.detail===0)setPin(e)});
 $("zoomIn").onclick=()=>zoom(.7);$("zoomOut").onclick=()=>zoom(1.43);$("resetWorld").onclick=worldView;
}
function beginGeography(){
 if(!connected||busy||!getCurrent())return;
 identityLocked=true;currentDraft={countryText:$("countryInput").value.trim(),capitalText:$("capitalInput").value.trim()};
 $("countryInput").disabled=true;$("capitalInput").disabled=true;$("lockIdentity").hidden=true;$("unlockIdentity").hidden=false;
 const q=getCurrent();$("geoControls").hidden=false;$("geoPrompt").textContent="Place "+q.name+" on the world map, or select the declared broad area if it is an approved tiny-island exception.";
 $("areaRow").hidden=q.mode!=="broad_area";$("mapInstructions").hidden=q.mode!=="country_pin";
 $("mapStatus").hidden=q.mode!=="country_pin";$("atlas").closest(".mapFrame").hidden=q.mode!=="country_pin";
 $("areaSelect").value="";temporaryPin=null;worldView();updateSubmit();
}
async function refresh(force=false){
 if(!client||refreshing||busy)return;
 if(document.hidden&&!force)return;refreshing=true;
 try{const next=replay(await client.comments(),manifest);const changed=remote?.lastId!==next.lastId||remote?.accepted.length!==next.accepted.length;remote=next;
  if(changed||force){showNext();auth("GitHub verified: "+next.accepted.length+"/195 draft responses.","good")}
 }catch(e){auth("GitHub refresh failed. No new progress has been accepted: "+e.message,"warning")}
 finally{refreshing=false}
}
async function submit(){
 const q=getCurrent(),geo=normalizedGeo();if(!connected||busy||!q||!identityLocked||!geo)return;
 busy=true;$("submit").disabled=true;message("Checking private GitHub checkpoint before posting…");
 const draft={...currentDraft,geography:geo};
 try{
  const before=replay(await client.comments(),manifest);
  if(before.next?.q!==q.q){remote=before;showNext();message("Another device advanced the checkpoint. This tab refreshed; no duplicate answer was saved.","warning");return}
  const id=crypto.randomUUID(),event=eventFor(q,manifest,draft,id);
  await client.post(event);
  const after=replay(await client.comments(),manifest);remote=after;
  if(!after.acceptedIds.has(id)){showNext();message("A competing device submitted first. Your stale attempt was not counted. Nothing was overwritten.","warning");return}
  const grader=atlas?referee({...scoreInput(q,geo),atlas}):null;
  showNext();message("Saved to private GitHub, verified. Geography provisional: "+(grader?.points??"needs review")+"/1. Flag/capital not auto-graded.","good");
 }catch(e){message("Not saved: "+e.message+". You may retry when the connection is available.","warning")}
 finally{busy=false;updateSubmit()}
}
async function connect(token){
 if(busy)return;busy=true;auth("Verifying private experimental Issue #"+ISSUE+"…");
 try{const next=githubClient(token);await next.verify();const up=replay(await next.comments(),manifest);
  client=next;connected=true;remote=up;$("credential").value="";
  $("connect").disabled=true;$("refresh").disabled=false;$("disconnect").disabled=false;
  showNext();auth("Connected: "+up.accepted.length+"/195 synced through private GitHub. No official scores.","good");
 }catch(e){client=null;connected=false;auth("Could not connect: "+e.message,"warning");showNext()}
 finally{busy=false}
}
function disconnect(){client=null;connected=false;remote=null;identityLocked=false;currentDraft=null;temporaryPin=null;
 $("credential").value="";$("connect").disabled=false;$("refresh").disabled=true;$("disconnect").disabled=true;showNext();auth("Disconnected. No GitHub draft history deleted.")}
async function init(){
 const r=await Promise.all(["data/questions.json","../location/data/world.json","../location/data/targets.json"].map(u=>fetch(u).then(x=>{if(!x.ok)throw Error("Asset unavailable "+u);return x.json()})));
 [manifest,world,detail]=r;questions=manifest.questions;
 if(questions.length!==195||new Set(questions.map(x=>x.iso)).size!==195)throw Error("195-country manifest verification failed");
 if(manifest.github_event_issue!==ISSUE)throw Error("Dedicated issue mismatch");
 worldView();setupMap();$("batchPrev").onclick=()=>{pageIndex--;renderCards()};$("batchNext").onclick=()=>{pageIndex++;renderCards()};
 $("lockIdentity").onclick=beginGeography;$("unlockIdentity").onclick=()=>{identityLocked=false;currentDraft=null;temporaryPin=null;
  $("countryInput").disabled=false;$("capitalInput").disabled=false;$("lockIdentity").hidden=false;$("unlockIdentity").hidden=true;$("geoControls").hidden=true};
 $("areaSelect").onchange=updateSubmit;$("submit").onclick=submit;
 $("connect").onclick=()=>connect($("credential").value.trim());
 $("reuse").onclick=()=>{const token=localStorage.getItem(TOKEN_KEY)||"";if(!token){auth("No previously remembered pilot credential in this browser. Enter a restricted token if you decide to try synchronized drafts.");return}connect(token)};
 $("refresh").onclick=()=>refresh(true);$("disconnect").onclick=disconnect;
 window.addEventListener("focus",()=>refresh(false));document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh(false)});setInterval(()=>refresh(false),60000);
 renderCount();renderCards();showNext();
 fetch("../location/data/world-10m.json").then(x=>x.json()).then(j=>{if(j.features?.length<200)throw Error("Invalid high-resolution atlas");hi=j;atlas=atlasIndex(hi,world,detail);drawMap(true);updateSubmit()}).catch(e=>{$("mapStatus").textContent="Detailed map unavailable: "+e.message});
}
window.__combined195={getCount:()=>questions.length,modeCount:()=>({pins:questions.filter(x=>x.mode==="country_pin").length,areas:questions.filter(x=>x.mode==="broad_area").length}),getStatus:()=>({connected,accepted:remote?.accepted.length||0,next:remote?.next?.q??null}),getWorldView:()=>({...view}),getSubmitted:()=>remote?.accepted||[],getCurrent:()=>getCurrent(),getAtlasReady:()=>!!atlas};
init().catch(e=>{$("count").textContent="Could not load game";auth(e.message,"warning")});
