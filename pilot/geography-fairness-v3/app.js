"use strict";
// Geography V3: intentionally separate unscored history and official combined engine.
const $=id=>document.getElementById(id);
const VIEWS={World:[-180,180,-82,85],Europe:[-14,43,32,66],Caribbean:[-87,-57,8,28],Pacific:[125,225,-52,26],Africa:[-25,55,-38,39],Asia:[42,150,-12,61],SEAsia:[88,137,-15,32],SouthernAfrica:[8,43,-37,-9],SouthAmerica:[-82,-34,-57,16],EastAsia:[112,156,20,52],CentralAsia:[76,123,32,58],EastAfrica:[20,52,-17,20]};
const OPTIONS=[["pacific","Pacific Ocean"],["caribbean","Caribbean"],["indian","Indian Ocean"],["atlantic","Atlantic Ocean"],["mediterranean","Mediterranean Sea"],["europe","Europe"],["gulf","Arabian/Persian Gulf"],["seasia","Southeast Asia"],["levant","Levant / Eastern Mediterranean coast"]];
const STORE="wcg-geography-fairness-scored-v3",NEAR_BORDER_KM=60;

const Q=[{"id":1,"name":"Germany","iso":"DE","type":"pin","view":"Europe","region":"Europe","where":[10.5,51.1]},{"id":2,"name":"Vanuatu","iso":"VU","type":"area","view":"World","region":"Pacific Ocean","where":[167.4,-16.08],"area":"pacific","accept":["pacific"]},{"id":3,"name":"Myanmar","iso":"MM","type":"pin","view":"SEAsia","region":"Southeast Asia","where":[95.8,21]},{"id":4,"name":"Barbados","iso":"BB","type":"area","view":"World","region":"Caribbean","where":[-59.54,13.19],"area":"caribbean","accept":["caribbean"]},{"id":5,"name":"Kenya","iso":"KE","type":"pin","view":"EastAfrica","region":"East Africa","where":[37.9,0.5]},{"id":6,"name":"Maldives","iso":"MV","type":"area","view":"World","region":"Indian Ocean","where":[73.2,3.2],"area":"indian","accept":["indian"]},{"id":7,"name":"France","iso":"FR","type":"pin","view":"Europe","region":"Europe","where":[2.2,46.6]},{"id":8,"name":"Nauru","iso":"NR","type":"area","view":"World","region":"Pacific Ocean","where":[166.93,-0.52],"area":"pacific","accept":["pacific"]},{"id":9,"name":"Brazil","iso":"BR","type":"pin","view":"SouthAmerica","region":"South America","where":[-50,-12]},{"id":10,"name":"Cyprus","iso":"CY","type":"area","view":"World","region":"Mediterranean Sea","where":[33.3,35.1],"area":"mediterranean","accept":["mediterranean"]},{"id":11,"name":"Thailand","iso":"TH","type":"pin","view":"SEAsia","region":"Southeast Asia","where":[100.5,15.4]},{"id":12,"name":"Cabo Verde","iso":"CV","type":"area","view":"World","region":"Atlantic Ocean","where":[-23.6,15.1],"area":"atlantic","accept":["atlantic"]},{"id":13,"name":"Japan","iso":"JP","type":"pin","view":"EastAsia","region":"East Asia","where":[138,37]},{"id":14,"name":"Monaco","iso":"MC","type":"area","view":"World","region":"Europe","where":[7.425,43.738],"area":"europe","accept":["europe","mediterranean"]},{"id":15,"name":"Chile","iso":"CL","type":"pin","view":"SouthAmerica","region":"South America","where":[-71,-33]},{"id":16,"name":"Tuvalu","iso":"TV","type":"area","view":"World","region":"Pacific Ocean","where":[179.2,-8.52],"area":"pacific","accept":["pacific"]},{"id":17,"name":"Morocco","iso":"MA","type":"pin","view":"Africa","region":"Africa","where":[-7,32]},{"id":18,"name":"Grenada","iso":"GD","type":"area","view":"World","region":"Caribbean","where":[-61.7,12.1],"area":"caribbean","accept":["caribbean"]},{"id":19,"name":"Argentina","iso":"AR","type":"pin","view":"SouthAmerica","region":"South America","where":[-64,-35]},{"id":20,"name":"Vatican City","iso":"VA","type":"area","view":"World","region":"Europe","where":[12.453,41.903],"area":"europe","accept":["europe"]}];

const map=$("map");let world=null,detail=null,high=null,highErr=null,view=null,active=0,gesture=null,region="World";
let records=Q.map(()=>({point:null,areaChoice:null,revealed:false}));
function save(){try{localStorage.setItem(STORE,JSON.stringify({current:active,records}))}catch{}}
function load(){try{const o=JSON.parse(localStorage.getItem(STORE)||"null");if(o?.records?.length!==Q.length)return;active=Number.isInteger(o.current)?Math.max(0,Math.min(Q.length-1,o.current)):0;records=records.map((s,i)=>{const p=o.records[i]?.point;return {point:p&&Number.isFinite(p.lon)&&Number.isFinite(p.lat)?p:null,areaChoice:typeof o.records[i]?.areaChoice==="string"?o.records[i].areaChoice:null,revealed:!!o.records[i]?.revealed}})}catch{}}
const px=lon=>(lon+180)*4,py=lat=>(90-lat)*4;
const norm=x=>((x+180)%360+360)%360-180;
function node(tag,attrs,cls){const el=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));if(cls)el.setAttribute("class",cls);return el}
const mapSize=()=>{const r=map.getBoundingClientRect();return{w:r.width,h:r.height,ratio:r.width/Math.max(1,r.height)}};
function clamp(b){const w=Math.max(12,Math.min(1500,b.w)),h=Math.max(8,Math.min(720,b.h));return{x:Math.max(-1440,Math.min(2880-w,b.x)),y:Math.max(0,Math.min(720-h,b.y)),w,h}}
function bounds(name){const b=VIEWS[name],r=mapSize();let w=(b[1]-b[0])*4,h=(b[3]-b[2])*4;if(w/h<r.ratio)w=h*r.ratio;else h=w/r.ratio;return clamp({x:px((b[0]+b[1])/2)-w/2,y:py((b[2]+b[3])/2)-h/2,w,h})}
function changeRegion(name){region=name;view=bounds(name);$("viewLabel").textContent=" · "+name+" view";paint()}
function inside(x,y){return view&&x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h}
function path(poly,shift){return poly.map(ring=>{let last=null,d="";for(const [lon,lat] of ring){let x=lon;if(last!==null){while(x-last>180)x-=360;while(x-last< -180)x+=360}last=x;d+=(d?"L":"M")+(px(x)+shift).toFixed(2)+","+py(lat).toFixed(2)}return d?d+"Z":""}).join(" ")}
const ringCache=new WeakMap();
function shapeRing(raw){let f=ringCache.get(raw);if(f)return f;let last=null,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;const pts=[];for(const [lon,lat] of raw){let x=lon;if(last!==null){while(x-last>180)x-=360;while(x-last< -180)x+=360}last=x;pts.push([x,lat]);minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(lat,minY);maxY=Math.max(lat,maxY)}f={pts,minX,maxX,minY,maxY};ringCache.set(raw,f);return f}
function inRing(lon,lat,raw){const a=shapeRing(raw);if(lat<a.minY||lat>a.maxY)return false;for(const x of [lon,lon-360,lon+360]){if(x<a.minX||x>a.maxX)continue;let parity=false;for(let i=0,j=a.pts.length-1;i<a.pts.length;j=i++){const p=a.pts[i],r=a.pts[j];if((p[1]>lat)!==(r[1]>lat)){const at=p[0]+(r[0]-p[0])*(lat-p[1])/(r[1]-p[1]);if(x<at)parity=!parity}}if(parity)return true}return false}
function inGeometry(f,p){return !!f&&f.polys.some(poly=>poly.reduce((v,ring)=>v!==inRing(p.lon,p.lat,ring),false))}
function nearestKm(p,f){if(!f)return Infinity;let best=Infinity;const cx=111.195*Math.max(.22,Math.cos(p.lat*Math.PI/180)),cy=111.195;for(const poly of f.polys)for(const raw of poly){if(!raw.length)continue;const a=shapeRing(raw).pts;for(let i=0;i<a.length;i++){const s=a[i],t=a[(i+1)%a.length],mid=(s[0]+t[0])/2,lon=p.lon+360*Math.round((mid-p.lon)/360);const ax=(s[0]-lon)*cx,ay=(s[1]-p.lat)*cy,bx=(t[0]-lon)*cx,by=(t[1]-p.lat)*cy,dx=bx-ax,dy=by-ay,v=dx*dx+dy*dy,factor=v?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/v)):0;best=Math.min(best,Math.hypot(ax+factor*dx,ay+factor*dy))}}return best}
function grade(q,s){
 if(!s.revealed)return null;
 if(q.type==="area"){const correct=q.accept.includes(s.areaChoice);return {points:correct?1:0,status:correct?"Correct broad area":"Wrong broad area"}}
 const f=(high?.features||world?.features||[]).find(z=>z.id===q.iso)||world?.features.find(z=>z.id===q.iso)||detail?.features.find(z=>z.id===q.iso);
 if(!f)return {points:null,status:"Map outline unavailable: needs review"};
 if(inGeometry(f,s.point))return {points:1,status:"Inside the target country"};
 if(nearestKm(s.point,f)<=NEAR_BORDER_KM)return {points:1,status:"Near country border: provisional full credit"};
 const other=(high?.features||world?.features||[]).find(z=>z.id!==q.iso&&inGeometry(z,s.point));
 return {points:0,status:other?"Selected another country, not "+q.name:"Outside "+q.name+"'s approximate location"};
}
function viewPoint(e){const m=map.getScreenCTM();if(m&&map.createSVGPoint){const p=map.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(m.inverse());return{x:q.x,y:q.y}}const r=map.getBoundingClientRect();return{x:view.x+(e.clientX-r.x)*view.w/r.width,y:view.y+(e.clientY-r.y)*view.h/r.height}}
function choose(e){const q=Q[active],s=records[active];if(q.type!=="pin"||s.revealed||!world||!view)return;const p=viewPoint(e);s.point={lon:Math.round(norm(p.x/4-180)*1000)/1000,lat:Math.round((90-p.y/4)*1000)/1000};save();update();paint()}
function zoom(f,p){if(!view)return;const a=p||{x:view.x+view.w/2,y:view.y+view.h/2},w=Math.max(12,Math.min(1500,view.w*f)),h=Math.max(8,Math.min(720,view.h*f)),fx=(a.x-view.x)/view.w,fy=(a.y-view.y)/view.h;view=clamp({x:a.x-fx*w,y:a.y-fy*h,w,h});paint()}
function panBy(dx,dy){const m=map.getScreenCTM(),sx=Math.abs(m?.a)||mapSize().w/view.w,sy=Math.abs(m?.d)||mapSize().h/view.h;view=clamp({...view,x:view.x-dx/sx,y:view.y-dy/sy});paint()}
function paint(){
 if(!view)return;
 map.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const land=$("countries"),zones=$("zones"),dots=$("marks"),labels=$("choiceBadges");
 land.replaceChildren();zones.replaceChildren();dots.replaceChildren();labels.replaceChildren();
 if(!world)return;
 const fine=!!high&&view.w<=600,shapes=fine?high.features:world.features,ids=new Set(shapes.map(x=>x.id));
 const feats=[...shapes,...detail.features.filter(z=>!ids.has(z.id))];
 for(const f of feats){
  for(const shift of [-1440,0,1440]){
   land.appendChild(node("path",{d:f.polys.map(poly=>path(poly,shift)).join(" "),"data-iso":f.id},"country"));
  }
 }
 $("mapResolution").textContent=fine?"Detailed borders · Natural Earth 1:10m":highErr?"Detailed borders unavailable · overview fallback":"World overview · zoom in for detailed borders";
 const q=Q[active],s=records[active];
 if(s.revealed){for(const el of land.querySelectorAll("path[data-iso]"))if(el.getAttribute("data-iso")===q.iso)el.classList.add("funCorrect")}
 const marks=[];
 if(q.type==="pin"&&s.point)marks.push({p:[s.point.lon,s.point.lat],truth:false});
 if(s.revealed)marks.push({p:q.where,truth:true});
 const scale=Math.max(.001,mapSize().w/view.w);
 for(const m of marks)for(const shift of [-1440,0,1440]){
  const x=px(m.p[0])+shift,y=py(m.p[1]);if(!inside(x,y))continue;
  dots.appendChild(node("circle",{cx:x,cy:y,r:7/scale},m.truth?"funTruthDot":"funYourDot"));
  const t=node("text",{x:x+11/scale,y:y-10/scale,"font-size":12/scale},m.truth?"funTruthLabel":"funYourLabel");
  t.textContent=m.truth?"Actual country":"Your pin";labels.appendChild(t);
 }
}
function scoreSummary(){const g=Q.map((q,i)=>grade(q,records[i])).filter(x=>x&&Number.isFinite(x.points));return{earned:g.reduce((n,x)=>n+x.points,0),graded:g.length,revealed:records.filter(x=>x.revealed).length}}
function update(){
 const q=Q[active],s=records[active],sum=scoreSummary(),g=grade(q,s);
 $("funNumber").textContent="Question "+(active+1)+" / "+Q.length;
 $("funCountry").textContent=q.name;
 $("funProgress").textContent=sum.revealed+" revealed · "+sum.earned+"/"+sum.graded+" provisional points";
 $("funMode").textContent=q.type==="pin"?"COUNTRY PLACEMENT":"TINY COUNTRY · BROAD AREA ONLY";
 $("funInstruction").textContent=q.type==="pin"?"Place a pin approximately where "+q.name+" lies on the "+q.region+" map. Inside or very close to the border is accepted in this trial.":"Select the broad geographical area of "+q.name+". You will never need to identify a particular dot or Pacific subregion.";
 $("funAreaRow").hidden=q.type!=="area";$("funAreaChoice").value=s.areaChoice||"";$("funAreaChoice").disabled=s.revealed;
 $("funReveal").disabled=s.revealed||!(q.type==="pin"?s.point&&(high||highErr):s.areaChoice);
 $("funReveal").textContent=s.revealed?"Revealed":"Reveal & grade";
 $("funZoom").hidden=!s.revealed;$("funPrev").disabled=active===0;$("funNext").disabled=active===Q.length-1;$("funNextBottom").disabled=active===Q.length-1;
 $("funFeedback").textContent=s.revealed?("Provisional: "+(g.points===null?"manual review":g.points+"/1")+". "+g.status+". Actual region: "+q.region+". "+(q.type==="area"?"Island dot only shown to learn, not assessed.":"Blue pin is yours; orange pin is the target.")):
  (q.type==="area"?(s.areaChoice?"Area selected; ready to reveal.":"Choose a broad area above."):(s.point?"Pin recorded; ready to reveal.":"Click or tap the map to place your pin."));
 for(let i=0;i<Q.length;i++){const el=$("funStep"+(i+1));el.classList.toggle("current",i===active);el.classList.toggle("completed",records[i].revealed)}
 $("funDone").textContent=sum.revealed===Q.length?"Completed! Provisional total "+sum.earned+"/"+sum.graded+". Copy the full record into ChatGPT for GitHub checkpointing.":"";
 $("funExportBottom").hidden=sum.revealed!==Q.length;
}
function pick(i){active=Math.max(0,Math.min(Q.length-1,i));save();changeRegion(Q[active].view);update();$("mapStatus").textContent=Q[active].type==="pin"?"Pin the target country, then Reveal.":"Pick broad geographical area from the selector. Exact dot not required.";$("funPanel").scrollIntoView({block:"start"})}
function reveal(){const q=Q[active],s=records[active];if(s.revealed||!(q.type==="pin"?s.point&&(high||highErr):s.areaChoice))return;s.revealed=true;save();paint();update()}
function exportText(){const s=scoreSummary();return["World Capitals Game — Geography V3 Scored Fairness Pilot","PROVISIONAL browser-local total: "+s.earned+"/"+s.graded+" | "+s.revealed+"/"+Q.length+" revealed","Country pin: inside or within 60 km of actual border (provisional) = 1. Tiny country: correct broad area = 1; NO dot distance.","Answers:"].concat(Q.map((q,i)=>{const x=records[i],g=grade(q,x),v=q.type==="pin"?(x.point?"P:"+x.point.lon.toFixed(3)+","+x.point.lat.toFixed(3):"No pin"):(x.areaChoice||"No area");return(i+1)+". "+q.name+" | "+(q.type==="pin"?"Country pin":"Broad region")+" | Selected: "+v+" | Revealed: "+(x.revealed?"Yes":"No")+(g?" | Provisional: "+g.points+"/1 | "+g.status:"")})).concat(["No official scores were changed. Review and commit these practice results after submission."]).join("\n")}
async function copyExport(){const v=exportText();$("funExportText").hidden=false;$("funExportText").value=v;let copied=false;try{await navigator.clipboard.writeText(v);copied=true}catch{}$("funExportStatus").textContent=copied?"Copied. Paste these V3 results into ChatGPT.":"Select and copy the results from the text box below."}
function setup(){
 document.title="World Capitals Game · Geography V3";
 $("title").textContent="Where in the World? — Scored V3 Pilot";
 document.querySelector(".sub").textContent="20 questions testing fair geography grading. All scores are provisional.";
 $("stagePill").textContent="Geography Fairness V3 · Provisional Only";
 document.querySelector(".legend").textContent="10 country locations + 10 broad-area questions";
 document.querySelector(".previewOnly").textContent="For tiny islands you choose an area, never a microscopic dot. For recognizable countries, place an approximate pin.";
 $("grid").hidden=true;document.querySelector(".actions").hidden=true;document.querySelector(".small").hidden=true;$("out").hidden=true;
 $("atlasRegions").hidden=true;document.querySelector(".radiusBar").hidden=true;$("zoneKey").hidden=true;$("returnQuestion").hidden=true;
 document.querySelector(".technicalNote").textContent="Your progress saves only in this browser until you copy the export to ChatGPT. Official perfect 390/390 remains unchanged.";
 document.querySelector(".atlasHint").textContent="Country pins are approximate; broad-area questions use the selector above. Reveal only after answering.";
 document.querySelector("#atlasSection h2").textContent="Geography map";
 const wrap=document.createElement("section");wrap.id="funPanel";wrap.className="funPanel";
 wrap.innerHTML='<div class="funTop"><span id="funNumber"></span><span id="funProgress"></span></div><div id="funMode" class="funMode"></div><h2 id="funCountry"></h2><p id="funInstruction"></p><label id="funAreaRow" class="funAreaRow" hidden>Choose broad geographical area<select id="funAreaChoice"><option value="">— Select an area —</option></select></label><div class="funSteps" id="funSteps"></div><div class="funControls"><button type="button" id="funPrev">← Previous</button><button type="button" id="funReveal" class="funPrimary">Reveal & grade</button><button type="button" id="funZoom" hidden>Zoom to target after reveal</button><button type="button" id="funNext" class="funPrimary">Next →</button></div><div id="funFeedback" class="funFeedback"></div><div id="funDone"></div><div class="funExportRow"><button type="button" id="funExport" class="funPrimary">Copy V3 results</button><span class="funExportHelp">Export your original answers and provisional scores.</span></div><div id="funExportStatus" class="funExportStatus" role="status"></div><textarea id="funExportText" class="funExportText" rows="15" readonly hidden></textarea><button type="button" id="funReset" class="funReset">Restart V3 pilot</button>';
 $("atlasSection").before(wrap);
 const bottom=document.createElement("div");bottom.className="funBottom";
 bottom.innerHTML='<button type="button" id="funExportBottom" class="funExportButton" hidden>Copy V3 results</button><button type="button" id="funNextBottom">Next question →</button>';document.querySelector(".atlasFoot").after(bottom);
 for(const [id,label] of OPTIONS){const el=document.createElement("option");el.value=id;el.textContent=label;$("funAreaChoice").appendChild(el)}
 $("funAreaChoice").onchange=e=>{if(records[active].revealed)return;records[active].areaChoice=e.target.value||null;save();update()};
 for(let i=0;i<Q.length;i++){const b=document.createElement("button");b.type="button";b.id="funStep"+(i+1);b.textContent=String(i+1);b.onclick=()=>pick(i);$("funSteps").appendChild(b)}
 $("funReveal").onclick=reveal;$("funPrev").onclick=()=>pick(active-1);$("funNext").onclick=()=>pick(active+1);$("funNextBottom").onclick=()=>pick(active+1);$("funExport").onclick=copyExport;$("funExportBottom").onclick=copyExport;
 $("funZoom").onclick=()=>{if(!records[active].revealed)return;const p=Q[active].where,w=44,r=mapSize().ratio;view=clamp({x:px(p[0])-w/2,y:py(p[1])-w/(2*r),w,h:w/r});paint()};
 $("funReset").onclick=()=>{if(!confirm("Restart this separate V3 practice? Prior V1/V2 and official scores stay untouched."))return;records=Q.map(()=>({point:null,areaChoice:null,revealed:false}));active=0;save();pick(0)};
 $("zoomIn").onclick=()=>zoom(.70);$("zoomOut").onclick=()=>zoom(1.43);$("resetView").onclick=()=>changeRegion(Q[active].view);
 map.addEventListener("wheel",e=>{e.preventDefault();zoom(Math.exp(Math.max(-.17,Math.min(.17,e.deltaY*.0012))),viewPoint(e))},{passive:false});
 let drag=null,lastTouch=0;
 map.addEventListener("pointerdown",e=>{if(e.pointerType==="touch"||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...view},moved:false};try{map.setPointerCapture(e.pointerId)}catch{}});
 map.addEventListener("pointermove",e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;if(drag.moved){view=clamp({...drag.start,x:drag.start.x-dx/(mapSize().w/view.w),y:drag.start.y-dy/(mapSize().h/view.h)});paint()}});
 map.addEventListener("pointerup",e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(!moved)choose(e)});
 map.addEventListener("click",e=>{if(e.detail===0)choose(e)});
 let touch=null;
 map.addEventListener("touchstart",e=>{lastTouch=performance.now();if(e.touches.length===1){const t=e.touches[0];touch={x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY,moved:false}}else touch=null;if(e.cancelable)e.preventDefault()},{passive:false});
 map.addEventListener("touchmove",e=>{if(!touch||e.touches.length!==1)return;const t=e.touches[0];if(Math.hypot(t.clientX-touch.x,t.clientY-touch.y)>7)touch.moved=true;if(touch.moved)panBy(t.clientX-touch.lastX,t.clientY-touch.lastY);touch.lastX=t.clientX;touch.lastY=t.clientY;if(e.cancelable)e.preventDefault()},{passive:false});
 map.addEventListener("touchend",e=>{lastTouch=performance.now();if(touch&&!touch.moved&&e.changedTouches.length===1)choose(e.changedTouches[0]);touch=null;if(e.cancelable)e.preventDefault()},{passive:false});
 window.addEventListener("resize",()=>changeRegion(Q[active].view));
 changeRegion(Q[active].view);update();
}
async function init(){
 load();setup();
 try{
  const a=await Promise.all(["../location/data/world.json","../location/data/targets.json"].map(p=>fetch(p,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Atlas unavailable");return r.json()})));
  [world,detail]=a;
  if(world.features.length!==177||detail.features.length!==15)throw Error("Atlas coverage changed unexpectedly");
  changeRegion(Q[active].view);$("mapStatus").textContent="Map ready. Tap to place country pin, or choose broad area above.";
  fetch("../location/data/world-10m.json",{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Detailed atlas unavailable");return r.json()}).then(j=>{if(!Array.isArray(j.features)||j.features.length<200)throw Error("Invalid 10m atlas");high=j;paint();update()}).catch(e=>{highErr=String(e);paint();update()});
 }catch(e){$("mapStatus").textContent="Atlas load failed: "+String(e)}
}
window.__geoFun={version:3,enabled:true,getQuestions:()=>Q.map(q=>({name:q.name,type:q.type})),getActive:()=>active,getRecord:()=>records.map((r,i)=>({...r,grade:grade(Q[i],r)})),getGrade:i=>grade(Q[i],records[i]),getExport:exportText,getMapMode:()=>region};
window.__areaTrial={getHiResStatus:()=>({ready:!!high,error:highErr,features:high?.features.length||0})};
init();
