"use strict";
// Standalone, unscored prototype. Original Combined V2 visual system is kept
// in index.html, but no official batch state or secret answer key is read here.
const QUESTIONS=[{"iso":"TV","country":"Tuvalu","capital":"Funafuti","asset":"flags/canonical/675210ec5524.svg"},{"iso":"MC","country":"Monaco","capital":"Monaco","asset":"flags/canonical/9cb6c9e8a0ea.svg","display_ratio":"5/4"},{"iso":"JP","country":"Japan","capital":"Tokyo","asset":"flags/canonical/cc1c181ce9b2.svg"},{"iso":"FJ","country":"Fiji","capital":"Suva","asset":"flags/canonical/332ae61d0b8a.svg"},{"iso":"TD","country":"Chad","capital":"N'Djamena","asset":"flags/canonical/fa3bd927c158.svg"},{"iso":"GD","country":"Grenada","capital":"Saint George's","asset":"flags/canonical/b3d250db99cf.svg"},{"iso":"BT","country":"Bhutan","capital":"Thimphu","asset":"flags/canonical/20aef3a63b4d.svg"},{"iso":"NR","country":"Nauru","capital":"No official capital","asset":"flags/canonical/ff394c411211.svg"},{"iso":"KI","country":"Kiribati","capital":"South Tarawa","asset":"flags/canonical/fda03f37beec.svg"},{"iso":"DE","country":"Germany","capital":"Berlin","asset":"flags/canonical/71aa2d2c30f5.svg"}];
const MARKERS=[["TV",-8.52,179.2],["NR",-0.52,166.93],["KI",1.87,-157.36],["TO",-21.14,-175.2],["FJ",-17.71,178.06],["VU",-16.08,167.4],["SB",-9.65,160.17],["WS",-13.83,-171.77],["FM",6.92,158.18],["MH",7.09,171.38],["PW",7.5,134.62],["PG",-6.31,147],["MC",43.738,7.425],["VA",41.903,12.453],["SM",43.941,12.458],["AD",42.506,1.521],["LI",47.14,9.54],["MT",35.9,14.51],["AG",17.07,-61.79],["BB",13.19,-59.54],["BS",25.03,-77.4],["DM",15.41,-61.37],["GD",12.12,-61.68],["KN",17.35,-62.75],["LC",13.91,-60.98],["VC",13.25,-61.2],["TT",10.69,-61.22],["HT",18.97,-72.29],["JM",18.11,-77.29],["CU",21.52,-77.78]];
const VIEWS={World:[-180,180,-82,85],Europe:[-14,43,32,66],Caribbean:[-87,-57,8,28],Pacific:[125,225,-52,26],Africa:[-25,55,-38,39],Asia:[42,150,-12,61]};
const $=id=>document.getElementById(id),svg=$("map"),px=lon=>(lon+180)*4,py=lat=>(90-lat)*4;
const STORE="wcg-combined-original-atlas-prototype-v1";
let world=null,detail=null,active=0,view=null,region="World",gesture=null;
let state=QUESTIONS.map(()=>({country:"",capital:"",location:null}));
function esc(s){return String(s??"").replace(/[&<>"]/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[x]))}
function node(tag,attrs,cls){const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));if(cls)el.setAttribute("class",cls);return el}
function store(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{}}
function readStore(){try{const a=JSON.parse(localStorage.getItem(STORE)||"null");if(Array.isArray(a)&&a.length===QUESTIONS.length)state=state.map((s,i)=>({
 country:String(a[i]?.country||""),capital:String(a[i]?.capital||""),location:typeof a[i]?.location==="string"?a[i].location:null
 }))}catch{}}
function render(){
 $("grid").replaceChildren();
 QUESTIONS.forEach((q,i)=>{
  const card=document.createElement("div");card.className="card";card.id="card-"+(i+1);
  const img='<img src="../../'+esc(q.asset)+'" alt="Flag question '+(i+1)+'">';
  const flag=q.display_ratio?'<div class="ratioframe" style="aspect-ratio:'+q.display_ratio+'">'+img+'</div>':img;
  card.innerHTML='<div class="top"><span class="qno">Question '+(i+1)+'</span><span class="stage" id="st'+(i+1)+'"></span></div><div class="pic">'+flag+'</div><div class="pair"><div class="field"><div class="label">Country</div><input id="country-'+(i+1)+'" placeholder="Country" autocomplete="off" spellcheck="false"></div><div class="field"><div class="label">Capital</div><input id="capital-'+(i+1)+'" placeholder="Capital" autocomplete="off" spellcheck="false"></div></div><div class="locrow" id="locrow-'+(i+1)+'"><span class="loclabel">Location</span><span id="locstatus-'+(i+1)+'" class="locstatus">Not selected</span><button id="openMap-'+(i+1)+'" type="button">Select on atlas ↓</button></div>';
  $("grid").appendChild(card);
  ["country","capital"].forEach(k=>{
   const e=$(k+"-"+(i+1));e.value=state[i][k];e.oninput=()=>{state[i][k]=e.value;store();status();hide()};
  });
  $("openMap-"+(i+1)).onclick=()=>{active=i;refreshActive();$("atlasSection").scrollIntoView({behavior:"smooth",block:"start"})};
 });status();refreshActive();
}
function status(){
 let a=0;state.forEach((s,i)=>{const n=Number(!!s.country.trim())+Number(!!s.capital.trim());a+=n;
 const t=$("st"+(i+1));if(t)t.textContent=n+"/2 current fields answered";
 const st=$("locstatus-"+(i+1));if(st)st.textContent=s.location?"Location selected":"Not selected";
 const row=$("locrow-"+(i+1));if(row)row.classList.toggle("active",i===active);
 });
 $("count").textContent=a+" answered · "+(20-a)+" current fields left";
 $("locationCount").textContent=state.filter(s=>s.location).length+" / 10 locations selected";
}
function refreshActive(){
 $("activeQuestion").textContent="Question "+(active+1);
 for(let i=0;i<10;i++)$("locrow-"+(i+1))?.classList.toggle("active",i===active);
 status();paint();
}
function hide(){$("out").className="out";$("copy").disabled=true}
function build(){
 const lines=[],blanks=[];
 state.forEach((s,i)=>{
  const part=[];
  if(s.country.trim())part.push("Country: "+s.country.trim());else blanks.push("Q"+(i+1)+" Country");
  if(s.capital.trim())part.push("Capital: "+s.capital.trim());else blanks.push("Q"+(i+1)+" Capital");
  if(s.location)part.push("Location: "+s.location);else blanks.push("Q"+(i+1)+" Location");
  if(part.length)lines.push((i+1)+". "+part.join(" | "));
 });
 $("reply").textContent=lines.join("\n");
 $("note").textContent=blanks.length?"Left blank: "+blanks.join(", "):"All 30 current components answered.";
 $("out").className="out show";$("copy").disabled=!lines.length;
 return $("reply").textContent;
}
async function copy(t){if(!t)return false;try{await navigator.clipboard.writeText(t);return true}catch{}
 const e=document.createElement("textarea");e.value=t;e.style.position="fixed";e.style.opacity="0";document.body.appendChild(e);e.select();
 let ok=false;try{ok=document.execCommand("copy")}catch{}e.remove();return ok}
const mapSize=()=>{const r=svg.getBoundingClientRect();return{w:r.width,h:r.height,ratio:r.width/Math.max(1,r.height)}};
function clamp(b){
 const w=Math.max(12,Math.min(1500,b.w)),h=Math.max(8,Math.min(720,b.h));
 return{x:Math.max(-1440,Math.min(2880-w,b.x)),y:Math.max(0,Math.min(720-h,b.y)),w,h};
}
function bounds(name){
 const b=VIEWS[name],r=mapSize();let w=(b[1]-b[0])*4,h=(b[3]-b[2])*4;
 if(w/h<r.ratio)w=h*r.ratio;else h=w/r.ratio;
 return clamp({x:px((b[0]+b[1])/2)-w/2,y:py((b[2]+b[3])/2)-h/2,w,h});
}
function changeRegion(name){
 if(!VIEWS[name])return;
 region=name;view=bounds(name);
 document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===name)));
 $("viewLabel").textContent=" · "+name+" view";paint();
}
function inside(x,y){return view&&x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h}
function path(poly,shift){return poly.map(ring=>"M"+ring.map(p=>(px(p[0])+shift).toFixed(2)+","+py(p[1]).toFixed(2)).join("L")+"Z").join(" ")}
function paint(){
 if(!view)return;
 svg.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const land=$("countries"),dots=$("marks");land.replaceChildren();dots.replaceChildren();
 if(!world)return;
 const extras=detail.features.filter(d=>!world.features.some(w=>w.id===d.id));
 for(const f of [...world.features,...extras]){
  for(const shift of [-1440,0,1440]){
   const p=node("path",{d:f.polys.map(poly=>path(poly,shift)).join(" "), "data-iso":f.id},"country"+(state[active].location===f.id?" targetSelected":""));
   land.appendChild(p);
  }
 }
 const r=mapSize(),scale=Math.max(.0001,r.w/view.w);
 const radius=Math.max(3.3,Math.min(22,10/scale));
 for(const [iso,lat,lon] of MARKERS)for(const shift of [-1440,0,1440]){
  const x=px(lon)+shift,y=py(lat);if(!inside(x,y))continue;
  const g=node("g",{"data-iso":iso},"mark"+(state[active].location===iso?" current":""));
  g.appendChild(node("circle",{cx:x,cy:y,r:radius}));dots.appendChild(g);
 }
}
// Geographic point-inside-polygon test, independent of SVG path/click hitboxes.
// This is the crucial difference from the experimental side-panel layout.
function normLon(x){return ((x+180)%360+360)%360-180}
function inRing(lon,lat,ring){
 let odd=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j],ax=lon+normLon(a[0]-lon),bx=lon+normLon(b[0]-lon);
  if((a[1]>lat)!==(b[1]>lat)){
   const edgeX=ax+(bx-ax)*(lat-a[1])/(b[1]-a[1]);
   if(lon<edgeX)odd=!odd;
  }
 }
 return odd;
}
function inGeometry(f,lon,lat){
 return f.polys.some(poly=>poly.reduce((v,ring)=>v!==inRing(lon,lat,ring),false));
}
function countryAt(lon,lat){
 if(!world||!detail)return null;
 // Detailed polygons where the 110m background has no country; normal countries first.
 for(const f of world.features)if(inGeometry(f,lon,lat))return f.id;
 for(const f of detail.features)if(inGeometry(f,lon,lat))return f.id;
 return null;
}
function viewPoint(e){
 const m=svg.getScreenCTM();
 if(m&&svg.createSVGPoint){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const q=p.matrixTransform(m.inverse());return{x:q.x,y:q.y}}
 const r=svg.getBoundingClientRect();return{x:view.x+(e.clientX-r.x)*view.w/r.width,y:view.y+(e.clientY-r.y)*view.h/r.height};
}
function chooseAt(e){
 if(!world)return;
 const p=viewPoint(e),scale=Math.max(.001,mapSize().w/view.w),rad=13/scale;
 // Hit marker first using a fixed 13 physical-pixel radius, not SVG DOM hit-tests.
 let candidate=null,dist=Infinity;
 for(const [iso,lat,lon] of MARKERS)for(const shift of [-1440,0,1440]){
  const x=px(lon)+shift,y=py(lat),d=Math.hypot(p.x-x,p.y-y);
  if(inside(x,y)&&d<rad&&d<dist){candidate=iso;dist=d}
 }
 const lon=normLon(p.x/4-180),lat=90-p.y/4;
 window.__atlasLastPoint={eventType:e.type||"touch",clientX:e.clientX,clientY:e.clientY,point:p,lon,lat,country:countryAt(lon,lat),viewport:view,rect:svg.getBoundingClientRect().toJSON()};
 if(!candidate)candidate=countryAt(lon,lat);
 if(!candidate){
  $("mapStatus").textContent="No mapped country at that point. Select land, or a neutral marker for a tiny island.";
  return;
 }
 state[active].location=candidate;store();status();paint();
 $("mapStatus").textContent="Question "+(active+1)+": location selected. You may select another location to change it.";
 hide();
}
function zoom(f,p){
 if(!view)return;
 const a=p||{x:view.x+view.w/2,y:view.y+view.h/2};
 const w=Math.max(12,Math.min(1500,view.w*f)),h=Math.max(8,Math.min(720,view.h*f));
 const fx=(a.x-view.x)/view.w,fy=(a.y-view.y)/view.h;
 view=clamp({x:a.x-fx*w,y:a.y-fy*h,w,h});paint();
}
// All clicks select at most one location. Touch pinch never selects a country.
let lastSelectionTime=0,gesture=null,touchGesture=null,lastTouchAt=-1e5;
function chooseOnce(e){
 if(performance.now()-lastSelectionTime<250)return;
 lastSelectionTime=performance.now();chooseAt(e);
}
function twoTouches(t){
 const a=t[0],b=t[1];
 return {x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2,
 dist:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)};
}
function panBy(dx,dy){
 const matrix=svg.getScreenCTM(),scaleX=Math.abs(matrix?.a)||mapSize().w/view.w,scaleY=Math.abs(matrix?.d)||mapSize().h/view.h;
 view=clamp({...view,x:view.x-dx/scaleX,y:view.y-dy/scaleY});paint();
}
svg.addEventListener("touchstart",e=>{
 lastTouchAt=performance.now();
 if(e.touches.length>=2){
  touchGesture={mode:"pinch",last:twoTouches(e.touches)};
 }else if(e.touches.length===1&&(!touchGesture||touchGesture.mode!=="ignored")){
  const t=e.touches[0];
  touchGesture={mode:"single",startX:t.clientX,startY:t.clientY,prevX:t.clientX,prevY:t.clientY,moved:false};
 }
 if(e.cancelable)e.preventDefault();
},{passive:false});
svg.addEventListener("touchmove",e=>{
 if(!view||!touchGesture)return;
 if(e.cancelable)e.preventDefault();
 if(e.touches.length>=2){
  const now=twoTouches(e.touches);
  if(touchGesture.mode!=="pinch"){touchGesture={mode:"pinch",last:now};return}
  const before=touchGesture.last;
  const anchor=viewPoint({clientX:before.x,clientY:before.y});
  zoom(Math.max(.72,Math.min(1.38,before.dist/Math.max(1,now.dist))),anchor);
  panBy(now.x-before.x,now.y-before.y);
  touchGesture.last=now;
 }else if(e.touches.length===1&&touchGesture.mode==="single"){
  const t=e.touches[0];
  if(Math.hypot(t.clientX-touchGesture.startX,t.clientY-touchGesture.startY)>7)touchGesture.moved=true;
  if(touchGesture.moved)panBy(t.clientX-touchGesture.prevX,t.clientY-touchGesture.prevY);
  touchGesture.prevX=t.clientX;touchGesture.prevY=t.clientY;
 }
},{passive:false});
svg.addEventListener("touchend",e=>{
 lastTouchAt=performance.now();
 if(!touchGesture)return;
 if(e.touches.length===0){
  if(touchGesture.mode==="single"&&!touchGesture.moved&&e.changedTouches.length===1){
   const t=e.changedTouches[0];
   if(Math.hypot(t.clientX-touchGesture.startX,t.clientY-touchGesture.startY)<=9)chooseOnce(t);
  }
  touchGesture=null;
 }else if(touchGesture.mode==="pinch")touchGesture={mode:"ignored"};
},{passive:false});
svg.addEventListener("touchcancel",()=>{touchGesture=null});
svg.addEventListener("pointerdown",e=>{
 if(e.pointerType==="touch"||e.button!==0||!view)return;
 gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,v:{...view},dragged:false};
 try{svg.setPointerCapture(e.pointerId)}catch{}
});
svg.addEventListener("pointermove",e=>{
 if(e.pointerType==="touch"||!gesture||gesture.id!==e.pointerId)return;
 const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;
 if(!gesture.dragged&&Math.hypot(dx,dy)>7){gesture.dragged=true;svg.classList.add("dragging")}
 if(gesture.dragged){
  const matrix=svg.getScreenCTM(),sx=Math.abs(matrix?.a)||mapSize().w/view.w,sy=Math.abs(matrix?.d)||mapSize().h/view.h;
  view=clamp({...gesture.v,x:gesture.v.x-dx/sx,y:gesture.v.y-dy/sy});paint();
 }
});
function endPointer(e){
 if(e.pointerType==="touch"||!gesture||gesture.id!==e.pointerId)return;
 const isDrag=gesture.dragged||Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>7;
 try{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)}catch{}
 gesture=null;svg.classList.remove("dragging");
 if(e.type==="pointerup"&&!isDrag)chooseOnce(e);
}
svg.addEventListener("pointerup",endPointer);
svg.addEventListener("pointercancel",endPointer);
svg.addEventListener("click",e=>{
 if(performance.now()-lastTouchAt>500&&!gesture)chooseOnce(e);
});
svg.addEventListener("wheel",e=>{
 if(!view)return;e.preventDefault();
 const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?400:1);
 const exponent=Math.max(-.16,Math.min(.16,delta*.0012));
 zoom(Math.exp(exponent),viewPoint(e));
},{passive:false});
async function init(){
 readStore();render();
 $("atlasRegions").onclick=e=>{const b=e.target.closest("button[data-view]");if(b)changeRegion(b.dataset.view)};
 $("zoomIn").onclick=()=>zoom(.70);
 $("zoomOut").onclick=()=>zoom(1.43);
 $("resetView").onclick=()=>changeRegion(region);
 $("returnQuestion").onclick=()=>$("card-"+(active+1)).scrollIntoView({behavior:"smooth",block:"center"});
 $("build").onclick=build;
 $("copy").onclick=async()=>{const t=build(),ok=await copy(t);$("note").textContent=(ok?"Copied preview reply. ":"Copy failed — select the text manually. ")+$("note").textContent};
 $("clear").onclick=()=>{if(!confirm("Clear all 30 preview fields? Official results will not change."))return;
  state=QUESTIONS.map(()=>({country:"",capital:"",location:null}));store();render();paint();hide()};
 $("latest").onclick=()=>{location.reload()};
 window.addEventListener("resize",()=>changeRegion(region));
 try{
  const rs=await Promise.all(["../location/data/world.json","../location/data/targets.json"].map(url=>fetch(url,{cache:"no-store"})));
  if(rs.some(r=>!r.ok))throw Error("Geographic reference files missing");
  [world,detail]=await Promise.all(rs.map(r=>r.json()));
  if(world.features.length!==177||detail.features.length!==15)throw Error("Unexpected map inventory");
  changeRegion("World");
  $("mapStatus").textContent="Map ready. Select the question above, then click any country outline or tiny-country dot.";
 }catch(e){$("mapStatus").textContent="Map could not load: "+String(e?.message||e)}
}
init();
