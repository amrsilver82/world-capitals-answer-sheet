"use strict";
// Standalone, unscored prototype. Original Combined V2 visual system is kept
// in index.html, but no official batch state or secret answer key is read here.
const QUESTIONS=[{"iso":"TV","country":"Tuvalu","capital":"Funafuti","asset":"flags/canonical/675210ec5524.svg"},{"iso":"MC","country":"Monaco","capital":"Monaco","asset":"flags/canonical/9cb6c9e8a0ea.svg","display_ratio":"5/4"},{"iso":"JP","country":"Japan","capital":"Tokyo","asset":"flags/canonical/cc1c181ce9b2.svg"},{"iso":"FJ","country":"Fiji","capital":"Suva","asset":"flags/canonical/332ae61d0b8a.svg"},{"iso":"TD","country":"Chad","capital":"N'Djamena","asset":"flags/canonical/fa3bd927c158.svg"},{"iso":"GD","country":"Grenada","capital":"Saint George's","asset":"flags/canonical/b3d250db99cf.svg"},{"iso":"BT","country":"Bhutan","capital":"Thimphu","asset":"flags/canonical/20aef3a63b4d.svg"},{"iso":"NR","country":"Nauru","capital":"No official capital","asset":"flags/canonical/ff394c411211.svg"},{"iso":"KI","country":"Kiribati","capital":"South Tarawa","asset":"flags/canonical/fda03f37beec.svg"},{"iso":"DE","country":"Germany","capital":"Berlin","asset":"flags/canonical/71aa2d2c30f5.svg"}];
const MARKERS=[["TV",-8.52,179.2],["NR",-0.52,166.93],["KI",1.87,-157.36],["TO",-21.14,-175.2],["FJ",-17.71,178.06],["VU",-16.08,167.4],["SB",-9.65,160.17],["WS",-13.83,-171.77],["FM",6.92,158.18],["MH",7.09,171.38],["PW",7.5,134.62],["PG",-6.31,147],["MC",43.738,7.425],["VA",41.903,12.453],["SM",43.941,12.458],["AD",42.506,1.521],["LI",47.14,9.54],["MT",35.9,14.51],["AG",17.07,-61.79],["BB",13.19,-59.54],["BS",25.03,-77.4],["DM",15.41,-61.37],["GD",12.12,-61.68],["KN",17.35,-62.75],["LC",13.91,-60.98],["VC",13.25,-61.2],["TT",10.69,-61.22],["HT",18.97,-72.29],["JM",18.11,-77.29],["CU",21.52,-77.78],["MV",4.1755,73.5093],["SG",1.3521,103.8198],["ST",0.3365,6.7273],["SC",-4.62,55.45],["MU",-20.166,57.502],["CV",14.933,-23.513],["KM",-11.7,43.25],["BH",26.0667,50.5577]];
const OFFICIAL_195_CODES=["KW","MC","AO","BJ","FM","KE","MY","SI","SN","PT","HN","ZM","PY","MH","CM","RU","CN","MD","GM","CY","GQ","TZ","EG","MV","SG","GR","QA","SY","US","TT","IT","TJ","GD","ET","EE","JO","PH","TG","AR","MG","VE","VN","IS","ER","MK","SE","ES","ST","DE","NZ","GA","WS","FR","DK","LY","VC","LI","PK","NG","TR","KP","BY","KR","GB","IQ","ZA","LS","NP","UA","CF","AF","LK","PE","LU","DM","MM","DJ","GY","BZ","BG","LB","MN","KI","CA","BN","PS","NL","PL","HT","MR","BE","SC","AT","SA","NI","VA","JM","AD","LT","EC","MA","NA","MZ","BT","TN","TV","TM","CU","LA","UG","RO","TD","KH","CD","AZ","IE","SL","IR","SS","BS","OM","DO","MU","KN","BF","CV","SK","AL","TL","AG","CO","KZ","BR","ML","AE","LR","SO","MT","LV","CL","GE","BO","SR","UY","RS","PA","BW","FI","AU","GN","GH","YE","VU","BI","AM","ID","NO","IL","KG","SZ","KM","TH","SB","ZW","HU","LC","GT","BH","CR","RW","CG","CH","NR","SD","BB","MX","SV","SM","PG","NE","GW","PW","BA","DZ","UZ","JP","CI","CZ","TO","HR","IN","FJ","MW","ME","BD"];
const VIEWS={World:[-180,180,-82,85],Europe:[-14,43,32,66],Caribbean:[-87,-57,8,28],Pacific:[125,225,-52,26],Africa:[-25,55,-38,39],Asia:[42,150,-12,61]};
const $=id=>document.getElementById(id),svg=$("map"),px=lon=>(lon+180)*4,py=lat=>(90-lat)*4;
const STORE="wcg-gridfree-location-area-prototype-v1";
const ANCHORS=new Map(MARKERS.map(([iso,lat,lon])=>[iso,{lat,lon}]));
let world=null,detail=null,worldHiRes=null,hiResError=null,active=0,view=null,region="World",gesture=null;
let state=QUESTIONS.map(()=>({country:"",capital:"",location:null,point:null,radiusKm:500}));
function esc(s){return String(s??"").replace(/[&<>"]/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[x]))}
function node(tag,attrs,cls){const el=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));if(cls)el.setAttribute("class",cls);return el}
function store(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch{}}
function readStore(){try{const a=JSON.parse(localStorage.getItem(STORE)||"null");if(Array.isArray(a)&&a.length===QUESTIONS.length)state=state.map((s,i)=>({
 country:String(a[i]?.country||""),capital:String(a[i]?.capital||""),location:typeof a[i]?.location==="string"?a[i].location:null,point:Number.isFinite(a[i]?.point?.lat)&&Number.isFinite(a[i]?.point?.lon)?a[i].point:null,radiusKm:[300,500,800].includes(a[i]?.radiusKm)?a[i].radiusKm:500
 }))}catch{}}
function render(){
 $("grid").replaceChildren();
 QUESTIONS.forEach((q,i)=>{
  const card=document.createElement("div");card.className="card";card.id="card-"+(i+1);
  const img='<img src="../../'+esc(q.asset)+'" alt="Flag question '+(i+1)+'">';
  const flag=q.display_ratio?'<div class="ratioframe" style="aspect-ratio:'+q.display_ratio+'">'+img+'</div>':img;
  card.innerHTML='<div class="top"><span class="qno">Question '+(i+1)+'</span><span class="stage" id="st'+(i+1)+'"></span></div><div class="pic">'+flag+'</div><div class="pair"><div class="field"><div class="label">Country</div><input id="country-'+(i+1)+'" placeholder="Country" autocomplete="off" spellcheck="false"></div><div class="field"><div class="label">Capital</div><input id="capital-'+(i+1)+'" placeholder="Capital" autocomplete="off" spellcheck="false"></div></div><div class="locrow" id="locrow-'+(i+1)+'"><span class="loclabel">Location</span><span id="locstatus-'+(i+1)+'" class="locstatus">Not selected</span><button id="openMap-'+(i+1)+'" type="button">Select area ↓</button></div>';
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
 const st=$("locstatus-"+(i+1));if(st)st.textContent=s.location?"Area selected":"Not selected";
 const row=$("locrow-"+(i+1));if(row)row.classList.toggle("active",i===active);
 });
 $("count").textContent=a+" answered · "+(20-a)+" current fields left";
 $("locationCount").textContent=state.filter(s=>s.location).length+" / 10 locations selected";
}
function refreshActive(){
 $("activeQuestion").textContent="Question "+(active+1);
 for(let i=0;i<10;i++)$("locrow-"+(i+1))?.classList.toggle("active",i===active);
 status();radiusKm=state[active].radiusKm;$("radiusChoice").value=String(radiusKm);paint();
}
function hide(){$("out").className="out";$("copy").disabled=true}
function build(){
 const lines=[],blanks=[];
 state.forEach((s,i)=>{
  const part=[];
  if(s.country.trim())part.push("Country: "+s.country.trim());else blanks.push("Q"+(i+1)+" Country");
  if(s.capital.trim())part.push("Capital: "+s.capital.trim());else blanks.push("Q"+(i+1)+" Capital");
  if(s.location){part.push("Approximate location: "+s.location);part.push("Radius: "+s.radiusKm+" km");}else blanks.push("Q"+(i+1)+" Approximate location");
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
// Natural Earth polygons can cross the International Date Line: -180° and
// +180° are neighboring longitudes, not opposite sides of the planet.
// Unwrap each SVG ring before projection to prevent long horizontal stripes
// through Australia/Papua New Guinea from Fiji's 180°-crossing islands.
function path(poly,shift){
 return poly.map(ring=>{
  let last=null,d="";
  for(const [lon,lat] of ring){
   let x=lon;
   if(last!==null){
    while(x-last>180)x-=360;
    while(x-last< -180)x+=360;
   }
   last=x;
   d+=(d?"L":"M")+(px(x)+shift).toFixed(2)+","+py(lat).toFixed(2);
  }
  return d?d+"Z":"";
 }).join(" ");
}
function representativePoint(iso){
 const f=world?.features.find(z=>z.id===iso)||detail?.features.find(z=>z.id===iso);
 if(!f)return null;
 const rings=f.polys.flatMap(poly=>poly);
 const ring=rings.reduce((a,b)=>b.length>a.length?b:a,[]);
 if(!ring.length)return null;
 return {lon:ring.reduce((sum,p)=>sum+p[0],0)/ring.length,lat:ring.reduce((sum,p)=>sum+p[1],0)/ring.length};
}
// Experimental constant-distance regions around the USER-selected points.
const EARTH_KM=6371;let radiusKm=500;
function selectPoint(lon,lat){return {lon:Math.round(normLon(lon)*1000)/1000,lat:Math.round(Math.max(-89.99,Math.min(89.99,lat))*1000)/1000}}
function pointFromCode(s){const m=/^P:([+-]?[0-9.]+),([+-]?[0-9.]+)$/.exec(s||"");return m?{lon:+m[1],lat:+m[2]}:null}
function circlePath(p,shift,radius){
 const phi=p.lat*Math.PI/180,lambda=p.lon*Math.PI/180,delta=radius/EARTH_KM;
 let d="";
 for(let k=0;k<=96;k++){
  const bearing=k*2*Math.PI/96;
  const lat=Math.asin(Math.sin(phi)*Math.cos(delta)+Math.cos(phi)*Math.sin(delta)*Math.cos(bearing));
  const lng=lambda+Math.atan2(Math.sin(bearing)*Math.sin(delta)*Math.cos(phi),Math.cos(delta)-Math.sin(phi)*Math.sin(lat));
  d+=(k===0?"M":"L")+(px(lng*180/Math.PI)+shift).toFixed(2)+","+py(lat*180/Math.PI).toFixed(2);
 }
 return d+"Z";
}
// Map bounds are indexed once per feature so regional panning never redraws
// offscreen 1:10m polygons. Dateline-spanning features conservatively overlap.
const boundsCache=new WeakMap();
function featureBounds(f){
 let b=boundsCache.get(f);if(b)return b;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const poly of f.polys)for(const ring of poly)for(const p of ring){
  if(!Array.isArray(p)||p.length<2)continue;
  const x=px(p[0]),y=py(p[1]);
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 b={left:minX,right:maxX,top:minY,bottom:maxY};
 boundsCache.set(f,b);return b;
}
function paint(){
 if(!view)return;
 svg.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const land=$("countries"),circles=$("zones"),dots=$("marks"),labels=$("choiceBadges");
 land.replaceChildren();circles.replaceChildren();dots.replaceChildren();labels.replaceChildren();
 if(!world)return;
 // World overview stays lightweight; detailed 1:10m shapes appear as you
 // zoom into a region. Bounds-cull before turning 10m coordinates into SVG paths.
 const hires=!!worldHiRes&&view.w<=600;
 const shapes=hires?worldHiRes.features:world.features;
 const ids=new Set(shapes.map(f=>f.id));
 const extras=detail.features.filter(f=>!ids.has(f.id));
 const worldShapes=[...shapes,...extras];
 for(const f of worldShapes){
  const bounds=featureBounds(f);
  for(const shift of [-1440,0,1440]){
   if(bounds.right+shift<view.x||bounds.left+shift>view.x+view.w||
      bounds.bottom<view.y||bounds.top>view.y+view.h)continue;
   land.appendChild(node("path",{d:f.polys.map(poly=>path(poly,shift)).join(" "),"data-iso":f.id},"country"));
  }
 }
 const quality=$("mapResolution");
 if(quality)quality.textContent=hires?"Detailed borders · Natural Earth 1:10m":
  view.w<=600&&hiResError?"Detailed borders unavailable · 1:110m fallback":
  view.w<=600?"Loading detailed borders · 1:110m fallback":"World overview · zoom in for 1:10m detail";
 const scale=Math.max(.001,mapSize().w/view.w);
 state.forEach((s,i)=>{
  const p=s.point&&Number.isFinite(s.point.lon)&&Number.isFinite(s.point.lat)?s.point:pointFromCode(s.location);
  if(!p)return;
  for(const shift of [-1440,0,1440]){
   circles.appendChild(node("path",{d:circlePath(p,shift,s.radiusKm||500),"data-question":i+1},"areaCircle"+(i===active?" current":"")));
   const x=px(p.lon)+shift,y=py(p.lat);if(!inside(x,y))continue;
   const badge=node("g",{"data-question":i+1},"pinBadge"+(i===active?" current":""));
   badge.appendChild(node("circle",{cx:x,cy:y,r:11/scale}));
   const t=node("text",{x,y:y+1/scale,"font-size":11/scale});t.textContent=String(i+1);
   badge.appendChild(t);labels.appendChild(badge);
  }
 });
}
// Geographic point-inside-polygon test, independent of SVG path/click hitboxes.
// This is the crucial difference from the experimental side-panel layout.
function normLon(x){return ((x+180)%360+360)%360-180}
// Stable unwrap relative to the actual polygon, never to the clicked longitude.
// The old code falsely matched India (79 E) to Mexico (-100 W).
const ringCache=new WeakMap();
function shapeRing(ring){
 let cached=ringCache.get(ring);if(cached)return cached;
 const points=[];
 let last=null,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const [rawX,y] of ring){
  let x=rawX;
  if(last!==null){
   while(x-last>180)x-=360;
   while(x-last< -180)x+=360;
  }
  last=x;points.push([x,y]);
  minX=Math.min(minX,x);maxX=Math.max(maxX,x);
  minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 }
 cached={points,minX,maxX,minY,maxY};ringCache.set(ring,cached);
 return cached;
}
function inRing(lon,lat,ring){
 const {points,minX,maxX,minY,maxY}=shapeRing(ring);
 if(lat<minY||lat>maxY)return false;
 for(const x of [lon,lon-360,lon+360]){
  if(x<minX||x>maxX)continue;
  let parity=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];
   if((a[1]>lat)!==(b[1]>lat)){
    const at=a[0]+(b[0]-a[0])*(lat-a[1])/(b[1]-a[1]);
    if(x<at)parity=!parity;
   }
  }
  if(parity)return true;
 }
 return false;
}
function inGeometry(f,lon,lat){
 return f.polys.some(poly=>poly.reduce((v,ring)=>v!==inRing(lon,lat,ring),false));
}
function countryAt(lon,lat){
 if(!world||!detail)return null;
 // 110m land polygons cover Vatican, San Marino and Monaco with their host
 // country. More precise microstate outlines must take priority inside them.
 for(const f of detail.features)if(["MC","VA","SM"].includes(f.id)&&inGeometry(f,lon,lat))return f.id;
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
 if(!world||!view)return;
 const p=viewPoint(e),point=selectPoint(p.x/4-180,90-p.y/4);
 state[active].location="P:"+point.lon.toFixed(3)+","+point.lat.toFixed(3);
 state[active].point=point;
 state[active].radiusKm=radiusKm;
 store();status();paint();
 $("mapStatus").textContent="Question "+(active+1)+" — approximate position "+Math.abs(point.lat).toFixed(2)+"°"+(point.lat>=0?"N":"S")+", "+Math.abs(point.lon).toFixed(2)+"°"+(point.lon>=0?"E":"W")+"; circle radius "+radiusKm+" km. Tap again to adjust.";
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
let lastPointerChooseAt=-1e5,touchGesture=null,lastTouchAt=-1e5;
function chooseOnce(e){
 // Suppress only the synthetic click following a pointerup; do not suppress
 // a second genuine tap/pointerup made quickly to change the active answer.
 const now=performance.now();
 if(e.type==="click"&&now-lastPointerChooseAt<450)return;
 chooseAt(e);
 if(e.type==="pointerup")lastPointerChooseAt=now;
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
 $("radiusChoice").onchange=e=>{radiusKm=Number(e.target.value)||500;state[active].radiusKm=radiusKm;store();paint();$("mapStatus").textContent="Question "+(active+1)+": radius "+radiusKm+" km saved independently. Other question radii unchanged.";};
 $("returnQuestion").onclick=()=>$("card-"+(active+1)).scrollIntoView({behavior:"smooth",block:"center"});
 $("build").onclick=build;
 $("copy").onclick=async()=>{const t=build(),ok=await copy(t);$("note").textContent=(ok?"Copied preview reply. ":"Copy failed — select the text manually. ")+$("note").textContent};
 $("clear").onclick=()=>{if(!confirm("Clear all 30 preview fields? Official results will not change."))return;
  state=QUESTIONS.map(()=>({country:"",capital:"",location:null,point:null,radiusKm:500}));radiusKm=500;$("radiusChoice").value="500";store();render();paint();hide()};
 $("latest").onclick=()=>{location.reload()};
 window.addEventListener("resize",()=>changeRegion(region));
 try{
  const rs=await Promise.all(["../location/data/world.json","../location/data/targets.json"].map(url=>fetch(url,{cache:"no-store"})));
  if(rs.some(r=>!r.ok))throw Error("Geographic reference files missing");
  [world,detail]=await Promise.all(rs.map(r=>r.json()));
  if(world.features.length!==177||detail.features.length!==15)throw Error("Unexpected map inventory");
  const datasetCodes=new Set([...world.features,...detail.features].map(z=>z.id));
  const renderedCodes=new Set([...datasetCodes,...MARKERS.map(z=>z[0])]);
  const uncovered=OFFICIAL_195_CODES.filter(z=>!renderedCodes.has(z));
  if(OFFICIAL_195_CODES.length!==195||uncovered.length)throw Error("Selectable 195-country inventory incomplete: "+uncovered.join(","));
  window.__atlasCoverage={count:195,uncovered,polygonCount:195-OFFICIAL_195_CODES.filter(z=>!datasetCodes.has(z)).length,markerOnly:OFFICIAL_195_CODES.filter(z=>!datasetCodes.has(z))};

  changeRegion("World");
  $("mapStatus").textContent="Map ready. Zoom into a region to see detailed national borders; select any approximate location.";
  // A local copy of Natural Earth 1:10m, generated and committed into this
  // same GitHub Pages site. The lightweight 110m data remains the fallback.
  fetch("../location/data/world-10m.json",{cache:"force-cache"})
    .then(r=>{if(!r.ok)throw Error("High-resolution map unavailable");return r.json()})
    .then(data=>{
      if(data.scale!=="Natural Earth 1:10m"||!Array.isArray(data.features)||data.features.length<200)
        throw Error("Invalid detailed geography dataset");
      const de=data.features.find(z=>z.id==="DE");
      const points=de?.polys.reduce((sum,poly)=>sum+poly.reduce((n,ring)=>n+ring.length,0),0)||0;
      if(points<1000)throw Error("Germany borders are not detailed enough");
      worldHiRes=data;
      paint();
    })
    .catch(error=>{hiResError=String(error.message||error);paint()});
 }catch(e){$("mapStatus").textContent="Map could not load: "+String(e?.message||e)}
}
init();

window.__areaTrial={getState:()=>state.map(s=>({country:s.country,capital:s.capital,location:s.location,point:s.point,radiusKm:s.radiusKm})),getRadius:()=>radiusKm,getHiResStatus:()=>({ready:!!worldHiRes,error:hiResError,features:worldHiRes?.features?.length||0,germanyVertices:worldHiRes?.features?.find(f=>f.id==="DE")?.polys?.reduce((s,p)=>s+p.reduce((n,r)=>n+r.length,0),0)||0}),pointFromCode};
