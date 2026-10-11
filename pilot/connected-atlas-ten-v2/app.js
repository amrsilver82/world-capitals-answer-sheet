"use strict";
// Isolated design-only test. Static country/capital keys are local to this UNOFFICIAL preview.
const $=id=>document.getElementById(id);
const QUESTIONS=[
 ["TV","flags/canonical/675210ec5524.svg","Tuvalu","Funafuti"],
 ["MC","flags/canonical/9cb6c9e8a0ea.svg","Monaco","Monaco"],
 ["JP","flags/canonical/cc1c181ce9b2.svg","Japan","Tokyo"],
 ["FJ","flags/canonical/332ae61d0b8a.svg","Fiji","Suva"],
 ["TD","flags/canonical/fa3bd927c158.svg","Chad","N'Djamena"],
 ["GD","flags/canonical/b3d250db99cf.svg","Grenada","Saint George's"],
 ["BT","flags/canonical/20aef3a63b4d.svg","Bhutan","Thimphu"],
 ["NR","flags/canonical/ff394c411211.svg","Nauru","No official capital"],
 ["KI","flags/canonical/fda03f37beec.svg","Kiribati","South Tarawa"],
 ["DE","flags/canonical/71aa2d2c30f5.svg","Germany","Berlin"]
];
const MARKERS=[
 ["TV",-8.52,179.20],["NR",-.52,166.93],["KI",1.87,-157.36],["TO",-21.14,-175.20],
 ["FJ",-17.71,178.06],["VU",-16.08,167.40],["SB",-9.65,160.17],
 ["WS",-13.83,-171.77],["FM",6.92,158.18],["MH",7.09,171.38],
 ["PW",7.50,134.62],["PG",-6.31,147],["NZ",-40.90,174.89],["AU",-25.27,133.78],
 ["MC",43.738,7.425],["VA",41.903,12.453],["SM",43.941,12.458],
 ["AD",42.506,1.521],["LI",47.14,9.54],["MT",35.90,14.51],
 ["AG",17.07,-61.79],["BB",13.19,-59.54],["BS",25.03,-77.40],
 ["DM",15.41,-61.37],["GD",12.12,-61.68],["KN",17.35,-62.75],
 ["LC",13.91,-60.98],["VC",13.25,-61.20],["TT",10.69,-61.22],
 ["HT",18.97,-72.29],["JM",18.11,-77.29],["CU",21.52,-77.78]
];
const VIEWS={
 World:[-180,180,-82,85],Europe:[-14,43,32,66],Caribbean:[-87,-57,8,28],
 Pacific:[125,225,-52,26],Africa:[-25,55,-38,39],Asia:[42,150,-12,61]
};
const state=QUESTIONS.map(q=>({iso:q[0],country:"",capital:"",location:null}));
let current=0,world=null,detail=null,region="World",view=null,gesture=null,ignoreClicksUntil=0;
const svg=$("map"),px=lon=>(lon+180)*4,py=lat=>(90-lat)*4;
function sNode(tag,attrs,cls){
 const e=document.createElementNS("http://www.w3.org/2000/svg",tag);
 for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,String(v));
 if(cls)e.setAttribute("class",cls);return e;
}
function normalize(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"")}
function correctCapital(ans,iso){const s=normalize(ans);if(iso==="NR")return ["noofficialcapital","nocapital","none","yaren"].includes(s);
 if(iso==="GD")return ["saintgeorges","stgeorges"].includes(s);
 if(iso==="KI")return ["southtarawa","tarawa"].includes(s);
 return s===normalize(QUESTIONS.find(q=>q[0]===iso)[3]);}
function mapBounds(name){
 const a=VIEWS[name],r=svg.getBoundingClientRect(),ratio=r.width/Math.max(r.height,1);
 let w=(a[1]-a[0])*4,h=(a[3]-a[2])*4;
 const cx=px((a[0]+a[1])/2),cy=py((a[2]+a[3])/2);
 if(w/h<ratio)w=h*ratio;else h=w/ratio;
 return clamped({x:cx-w/2,y:cy-h/2,w,h});
}
function clamped(v){
 const w=Math.min(1600,Math.max(10,v.w)),h=Math.min(720,Math.max(6,v.h));
 return{x:Math.max(-1440,Math.min(2880-w,v.x)),y:Math.max(0,Math.min(720-h,v.y)),w,h};
}
function setRegion(name){
 if(!VIEWS[name])return;
 region=name;view=mapBounds(name);
 $("viewLabel").textContent=name+" view";
 for(const b of document.querySelectorAll("#regions button"))b.setAttribute("aria-pressed",String(b.dataset.region===name));
 draw();
}
function inside(x,y){return x>=view.x&&x<=view.x+view.w&&y>=view.y&&y<=view.y+view.h}
function path(poly,shift){
 return poly.map(ring=>"M"+ring.map(p=>(px(p[0])+shift).toFixed(1)+","+py(p[1]).toFixed(1)).join("L")+"Z").join(" ");
}
function draw(){
 if(!view)return;
 svg.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const land=$("land"),markers=$("micro");land.replaceChildren();markers.replaceChildren();
 if(!world||!detail)return;
 const extra=detail.features.filter(f=>!world.features.some(w=>w.id===f.id));
 for(const f of [...world.features,...extra])for(const shift of [-1440,0,1440]){
  const elem=sNode("path",{d:f.polys.map(p=>path(p,shift)).join(" "), "data-iso":f.id},"country");
  elem.addEventListener("click",()=>select(f.id));land.appendChild(elem);
 }
 const scale=Math.max(.0001,svg.getBoundingClientRect().width/view.w);
 const r=Math.max(3,Math.min(26,10/scale));
 for(const [iso,lat,lon] of MARKERS)for(const shift of [-1440,0,1440]){
  const x=px(lon)+shift,y=py(lat);if(!inside(x,y))continue;
  const selected=state[current].location===iso;
  const g=sNode("g",{"data-iso":iso},"marker"+(selected?" selected":""));
  const c=sNode("circle",{cx:x,cy:y,r});
  c.addEventListener("click",e=>{e.stopPropagation();select(iso)});
  g.appendChild(c);markers.appendChild(g);
 }
}
function renderCards(){
 $("questionList").replaceChildren();
 state.forEach((s,i)=>{
  const q=QUESTIONS[i],el=document.createElement("article");
  el.className="question"+(i===current?" active":"");el.dataset.index=i;
  const top=document.createElement("div");top.className="qtop";
  const flag=document.createElement("div");flag.className="flagbox"+(q[0]==="MC"?" monaco":"");
  const img=document.createElement("img");img.src="../../"+q[1];img.alt="Flag question "+(i+1);img.loading=i<4?"eager":"lazy";flag.appendChild(img);
  const meta=document.createElement("div");meta.className="qmeta";
  const strong=document.createElement("strong");strong.textContent="Question "+(i+1);
  const small=document.createElement("small");small.textContent="Identify flag · capital · location";
  meta.append(strong,small);
  const active=document.createElement("button");active.type="button";active.className="choose";
  active.textContent=i===current?"Open atlas ↓":"Select atlas ↓";active.addEventListener("click",()=>focusQuestion(i,true));
  top.append(flag,meta,active);
  const inputs=document.createElement("div");inputs.className="inputs";
  for(const [field,label] of [["country","Country"],["capital","Capital"]]){
   const l=document.createElement("label");l.textContent=label;
   const input=document.createElement("input");input.value=s[field];input.placeholder=label+" answer";input.autocomplete="off";input.spellcheck=false;
   input.setAttribute("aria-label","Question "+(i+1)+" "+label);input.addEventListener("focus",()=>focusQuestion(i,false));
   input.addEventListener("input",e=>{s[field]=e.target.value;updateStatus();});
   l.appendChild(input);inputs.appendChild(l);
  }
  const footer=document.createElement("div");footer.className="loc-line";
  const status=document.createElement("span");status.dataset.locstatus=i;
  status.textContent=s.location?"Location selected":"Location not selected";status.className=s.location?"picked":"";
  const goto=document.createElement("button");goto.textContent="Open atlas ↓";
  goto.addEventListener("click",()=>focusQuestion(i,true));
  footer.append(status,goto);
  el.append(top,inputs,footer);$("questionList").appendChild(el);
 });
 updateStatus();
}
function focusQuestion(i,scrollMap){
 current=i;
 for(const [j,el] of [...document.querySelectorAll(".question")].entries()){
  el.classList.toggle("active",i===j);
  const button=el.querySelector(".choose");if(button)button.textContent=i===j?"Open atlas ↓":"Select atlas ↓";
 }
 updateStatus();draw();
 if(scrollMap)$("atlasHolder").scrollIntoView({behavior:"smooth",block:"start"});
}
function updateStatus(){
 const num=state.filter(s=>s.location).length;
 $("completeCount").textContent=String(num);
 const s=state[current];
 $("activeStatus").textContent="Question "+(current+1)+" selected · "+(s.location?"location chosen":"tap any country outline or marker for this question");
 for(const el of document.querySelectorAll("[data-locstatus]")){
  const i=Number(el.dataset.locstatus);
  el.textContent=state[i].location?"Location selected":"Location not selected";
  el.className=state[i].location?"picked":"";
 }
}
function select(iso){
 state[current].location=iso;updateStatus();draw();
 $("mapStatus").textContent="Question "+(current+1)+": map location saved in this browser preview (not yet evaluated).";
}
function pointer(e){
 const m=svg.getScreenCTM();
 if(m&&svg.createSVGPoint){
  const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;
  const w=p.matrixTransform(m.inverse());return{x:w.x,y:w.y};
 }
 const b=svg.getBoundingClientRect();return{x:view.x+(e.clientX-b.x)/b.width*view.w,y:view.y+(e.clientY-b.y)/b.height*view.h};
}
function zoomAt(f,p){
 if(!view)return;
 const a=p||{x:view.x+view.w/2,y:view.y+view.h/2};
 const w=Math.max(10,Math.min(1600,view.w*f)),h=Math.max(6,Math.min(720,view.h*f));
 const fx=(a.x-view.x)/view.w,fy=(a.y-view.y)/view.h;
 view=clamped({x:a.x-fx*w,y:a.y-fy*h,w,h});draw();
}
svg.addEventListener("wheel",e=>{
 if(!view)return;e.preventDefault();zoomAt(e.deltaY<0?.75:1.33,pointer(e));
},{passive:false});
svg.addEventListener("pointerdown",e=>{
 if(e.button!==0||!view)return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,v:{...view},drag:false};
});
svg.addEventListener("pointermove",e=>{
 if(!gesture||gesture.id!==e.pointerId)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(!gesture.drag&&Math.hypot(dx,dy)>6){
  gesture.drag=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}
 }
 if(gesture.drag){
  const b=svg.getBoundingClientRect();
  view=clamped({...gesture.v,x:gesture.v.x-dx*gesture.v.w/b.width,y:gesture.v.y-dy*gesture.v.h/b.height});
  draw();
 }
});
function finishGesture(e){
 if(!gesture||gesture.id!==e.pointerId)return;
 if(gesture.drag)ignoreClicksUntil=performance.now()+160;
 try{if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId)}catch(_){}
 gesture=null;
}
svg.addEventListener("pointerup",finishGesture);svg.addEventListener("pointercancel",finishGesture);
svg.addEventListener("click",e=>{
 if(performance.now()<ignoreClicksUntil){e.preventDefault();e.stopImmediatePropagation()}
},true);

/* Safety fallback: SVG clicks in mapped land can be resolved geometrically even when
   a path's hit area is lost after panning/re-rendering; open ocean does nothing. */
function inRing(lon,lat,ring){
 let odd=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  const ax=lon+((((a[0]-lon)+540)%360)-180),bx=lon+((((b[0]-lon)+540)%360)-180);
  if((a[1]>lat)!==(b[1]>lat) && lon<ax+(bx-ax)*(lat-a[1])/(b[1]-a[1]))odd=!odd;
 }
 return odd;
}
function polygonAt(lon,lat){
 if(!world)return null;
 for(const f of world.features){
  if(f.polys.some(poly=>poly.reduce((v,ring)=>v!==inRing(lon,lat,ring),false)))return f.id;
 }
 if(detail)for(const f of detail.features){
  if(f.polys.some(poly=>poly.reduce((v,ring)=>v!==inRing(lon,lat,ring),false)))return f.id;
 }
 return null;
}
svg.addEventListener("click",e=>{
 if(performance.now()<ignoreClicksUntil||e.target.closest(".marker")||e.target.closest(".country"))return;
 if(!view)return;
 const p=pointer(e),lon=((p.x/4+180)%360+360)%360-180,lat=Math.max(-90,Math.min(90,90-p.y/4));
 const code=polygonAt(lon,lat);
 if(code)select(code);
});
function preview(){
 const el=$("reviewRows");el.replaceChildren();
 state.forEach((s,i)=>{
  const q=QUESTIONS[i],row=document.createElement("div");row.className="review-row";
  const h=document.createElement("h3");h.textContent="Question "+(i+1);row.appendChild(h);
  const pairs=[
   ["Flag → Country",s.country,normalize(s.country)===normalize(q[2])],
   ["Country → Capital",s.capital,correctCapital(s.capital,q[0])],
   ["Country → Location",s.location?"Selected marker/outline":"",s.location===q[0]]
  ];
  for(const [label,a,yes] of pairs){
   const p=document.createElement("p");p.textContent=label+": "+(a||"Not attempted");
   p.className=!a?"noanswer":yes?"ok":"bad";row.appendChild(p);
  }
  el.appendChild(row);
 });
 $("review").hidden=false;$("review").scrollIntoView({behavior:"smooth",block:"start"});
}
function reset(){
 if(!window.confirm("Clear all ten preview entries? There are no official results to lose."))return;
 state.forEach(s=>{s.country="";s.capital="";s.location=null});
 current=0;setRegion("World");renderCards();$("review").hidden=true;
 $("mapStatus").textContent="Design preview reset. Start with any flag question.";
}
async function init(){
 renderCards();
 $("regions").addEventListener("click",e=>{
  const b=e.target.closest("button[data-region]");if(b)setRegion(b.dataset.region);
 });
 $("zoomIn").addEventListener("click",()=>zoomAt(.68));
 $("zoomOut").addEventListener("click",()=>zoomAt(1.47));
 $("resetMap").addEventListener("click",()=>setRegion(region));
 $("showReview").addEventListener("click",preview);
 $("hideReview").addEventListener("click",()=>{$("review").hidden=true;$("questionList").scrollIntoView({block:"start",behavior:"smooth"})});
 $("resetDemo").addEventListener("click",reset);
 $("backQuestion").addEventListener("click",()=>document.querySelector(".question.active")?.scrollIntoView({behavior:"smooth",block:"center"}));
 window.addEventListener("resize",()=>setRegion(region));
 try{
  const r=await Promise.all(["../location/data/world.json","../location/data/targets.json"].map(u=>fetch(u,{cache:"no-store"})));
  if(r.some(z=>!z.ok))throw Error("Missing map files");
  [world,detail]=await Promise.all(r.map(z=>z.json()));
  if(world.features.length!==177||detail.features.length!==15)throw Error("Geography inventory mismatch");
  setRegion("World");
 }catch(e){$("mapStatus").textContent="The map could not load. "+String(e.message||e)}
}
init();