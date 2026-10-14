import {atlasIndex,referee} from "../geography-integrated-v4/referee/scorer.mjs";
import {triageMicrostate} from "../geography-integrated-v4/referee/microstate-triage.mjs";
const $=id=>document.getElementById(id),STORE="wcg-fairness-seven-20261013";
const C=[
 {iso:"BB",name:"Barbados",draft:"Pin proposed",area:"CARIBBEAN",default:"pin",desc:"Can you locate this single Caribbean island fairly using a pin? Try broad area too."},
 {iso:"MV",name:"Maldives",draft:"Broad area proposed",area:"INDIAN_OCEAN",default:"area",desc:"Its atolls are scattered. Test whether an exact pin would be fair."},
 {iso:"PW",name:"Palau",draft:"Broad area proposed",area:"PACIFIC_OCEAN",default:"area",desc:"Try whether you can locate the island group, not one arbitrary tiny dot."},
 {iso:"SC",name:"Seychelles",draft:"Broad area proposed",area:"INDIAN_OCEAN",default:"area",desc:"Check the spread-out Indian Ocean islands and whether pin placement is practical."},
 {iso:"MC",name:"Monaco",draft:"20 km near / 20–60 km human review — trial only",area:null,default:"pin",desc:"Locate the principality near the French Mediterranean coast; 20 km is a draft, not an official rule."},
 {iso:"VA",name:"Vatican City",draft:"20 km microstate tolerance",area:null,default:"pin",desc:"Locate the city-state within Rome; zoom as much as you need."},
 {iso:"SM",name:"San Marino",draft:"20 km microstate tolerance",area:null,default:"pin",desc:"Locate the microstate enclosed by Italy; look at how forgiving 20 km actually is."}
];
function microstateSummary(c,d){
 if(c.area!==null||!d.pin||!atlas)return null;
 const out=triageMicrostate({iso:c.iso,point:d.pin,atlas});
 if(out.result==="manual-review")return "BORDERLINE — NEEDS HUMAN REFEREE: "+out.nearBorderKm+" km from "+c.name+
   ". Draft 20 km automatic credit does not apply; within 60 km trial manual-review band. No automatic score.";
 if(out.result==="provisional-near")return "PROVISIONAL NEAR: "+(out.nearBorderKm??0)+" km from detailed border; no official rule approved.";
 if(out.result==="provisional-outside")return "PROVISIONAL OUTSIDE: "+out.nearBorderKm+" km from detailed border, beyond the draft 60 km review band.";
 return "Needs referee: unavailable or invalid microstate location.";
}
const empty=()=>({pin:null,area:"",method:null,vote:"",revealed:false,score:null});
let data=C.map(empty),at=0,atlas=null,world=null,hi=null,detail=null,view={x:0,y:0,w:1440,h:720},drawingMode="";
function save(){try{localStorage.setItem(STORE,JSON.stringify({version:1,at,data}))}catch{}}
function load(){try{const x=JSON.parse(localStorage.getItem(STORE)||"null");if(x?.version===1&&Array.isArray(x.data)&&x.data.length===C.length){data=C.map((_,i)=>({...empty(),...x.data[i]}));at=Math.max(0,Math.min(6,Number(x.at)||0))}}catch{}}
function svgPoint(e){const s=$("atlas"),m=s.getScreenCTM();if(m&&s.createSVGPoint){const p=s.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(m.inverse())}const r=s.getBoundingClientRect();return{x:view.x+(e.clientX-r.x)*view.w/r.width,y:view.y+(e.clientY-r.y)*view.h/r.height}}
function normal(lon){return ((lon+180)%360+360)%360-180}
function bounds(){view.w=Math.max(.2,Math.min(1440,view.w));view.h=Math.max(.1,Math.min(720,view.h));view.x=Math.max(-1440,Math.min(2880-view.w,view.x));view.y=Math.max(0,Math.min(720-view.h,view.y))}
function zoom(k,p){const a=p||{x:view.x+view.w/2,y:view.y+view.h/2};view.x=a.x-(a.x-view.x)*k;view.y=a.y-(a.y-view.y)*k;view.w*=k;view.h*=k;bounds();draw()}
function reset(){view={x:0,y:0,w:1440,h:720};draw()}
function path(poly,shift){let d="";for(const ring of poly){let prev=null,txt="";for(const [raw,lat] of ring){let lon=raw;if(prev!==null){while(lon-prev>180)lon-=360;while(lon-prev< -180)lon+=360}prev=lon;txt+=(txt?"L":"M")+((lon+180)*4+shift).toFixed(2)+","+((90-lat)*4).toFixed(2)}if(txt)d+=txt+"Z "}return d}
function draw(force=false){
 const s=$("atlas");s.setAttribute("viewBox",[view.x,view.y,view.w,view.h].join(" "));
 const mode=hi&&view.w<=550?"high":"low";
 if(mode!==drawingMode||force){
  const f=mode==="high"?hi?.features:world?.features;
  if(f){const el=$("land");el.replaceChildren();const ids=new Set(f.map(v=>v.id));const add=detail?.features.filter(x=>!ids.has(x.id))||[];
   const fragment=document.createDocumentFragment();
   for(const v of [...f,...add])for(const shift of [-1440,0,1440]){
    const z=document.createElementNS("http://www.w3.org/2000/svg","path");
    z.setAttribute("d",v.polys.map(x=>path(x,shift)).join(" "));
    z.setAttribute("class","country"+(data[at].revealed&&v.id===C[at].iso?" chosen":""));
    fragment.appendChild(z)
   }el.appendChild(fragment)}
  drawingMode=mode
 }
 const z=$("mark");z.replaceChildren();
 const pin=data[at].pin;
 if(pin)for(const shift of [-1440,0,1440]){
  const x=(pin.lon+180)*4+shift,y=(90-pin.lat)*4;
  if(x>=view.x-10&&x<=view.x+view.w+10&&y>=view.y-10&&y<=view.y+view.h+10){
   const circ=document.createElementNS("http://www.w3.org/2000/svg","circle");
   circ.setAttribute("cx",x);circ.setAttribute("cy",y);circ.setAttribute("r",Math.max(.015,5*view.w/1440));circ.setAttribute("class","marker");z.appendChild(circ)
  }
 }
 $("resolution").textContent=mode==="high"?"Detailed 1:10m borders":"World overview • zoom for detailed borders";
}
function mode(){return document.querySelector('input[name="method"]:checked')?.value||"pin"}
function vote(){return document.querySelector('input[name="vote"]:checked')?.value||""}
function updateMethod(){
 const v=mode();data[at].method=v;
 $("areaControls").hidden=v!=="area";
 $("mapHelp").textContent=v==="area"?"Choose the broad region. You can still inspect/zoom the map.":"Zoom and tap anywhere for a pin. The point will be evaluated against detailed borders.";
 save()
}
function choose(i){
 at=(i+C.length)%C.length;const c=C[at],d=data[at];
 $("counter").textContent="Case "+(at+1)+" of "+C.length;
 $("country").textContent=c.name;$("draft").textContent=c.draft;$("context").textContent=c.desc;
 const method=d.method||c.default;document.querySelectorAll('input[name="method"]').forEach(x=>x.checked=x.value===method);
 $("areaMethod").hidden=!c.area;$("area").value=d.area||"";
 document.querySelectorAll('input[name="vote"]').forEach(x=>x.checked=x.value===d.vote);
 $("pinStatus").textContent=d.pin?"Your pin: "+d.pin.lon.toFixed(3)+", "+d.pin.lat.toFixed(3):"No pin selected";
 if((d.method||c.default)==="area"&&!d.area){d.revealed=false;d.score=null}
 if(c.area===null&&d.revealed&&d.pin&&atlas)d.score=microstateSummary(c,d);
 $("result").hidden=!d.revealed;
 if(d.revealed)$("result").textContent=d.score||"No provisional result";
 $("progress").textContent=C.filter((_,i)=>data[i].vote).length+" / 7 decisions recorded • no official score";
 $("copy").disabled=!C.some((_,i)=>data[i].vote||data[i].revealed);
 $("previous").disabled=at===0;$("next").textContent=at===6?"Review feedback":"Next case →";
 updateMethod();reset();save()
}
function evaluate(){
 if(!atlas){$("result").hidden=false;$("result").textContent="Detailed atlas still loading. Please wait.";return}
 const c=C[at],d=data[at];let out;
 if(mode()==="area"){
  if(!d.area){$("result").hidden=false;$("result").textContent="Choose one area before checking.";return}
  out=referee({iso:c.iso,mode:"broad_area",areaChoice:d.area,acceptedArea:c.area,atlas});
 }else{
  if(!d.pin){$("result").hidden=false;$("result").textContent="Place a pin before checking.";return}
  out=c.area===null?triageMicrostate({iso:c.iso,point:d.pin,atlas}):referee({iso:c.iso,mode:"country_pin",point:d.pin,atlas});
 }
 const text=mode()==="area"?(out.points===1?"Chosen broad region matches the proposed region.":"Chosen region differs from the proposed one."):
  (c.area===null?(
    out.result==="manual-review"?"BORDERLINE — NEEDS HUMAN REFEREE: Your pin is "+out.nearBorderKm+" km from "+c.name+". The draft 20 km near-credit threshold has been exceeded, but the pin is within a proposed 60 km manual-review band. No point awarded or deducted; you decide whether this is fair.":
    out.result==="provisional-near"?"PROVISIONAL NEAR: "+(out.nearBorderKm??0)+" km from detailed border. The trial treats this as close enough for a candidate point, but no official threshold is approved.":
    out.result==="provisional-outside"?"PROVISIONAL OUTSIDE: "+out.nearBorderKm+" km from detailed border. Beyond the draft 60 km review band; still not an official score.":
    "No valid microstate location available for evaluation."
  ):(
    out.result==="inside"?"Your pin is inside the country border.":out.result==="near-border"?"Your pin is within the draft tolerance.":out.result==="outside"?"Your pin is outside the draft tolerance.":"Further geographic review needed."
  )+(Number.isFinite(out.nearBorderKm)?" Nearest border: "+out.nearBorderKm+" km.":"")+
  (Number.isFinite(out.allowedKm)?" Draft tolerance: "+out.allowedKm+" km.":""));
 d.revealed=true;d.score=text;save();$("result").hidden=false;$("result").textContent=text;draw(true)
}
function summary(){
 const lines=["World Capitals Game — Seven-Case Geography Fairness Acceptance (unscored)","Device: "+navigator.userAgent,
 "All cases are provisional. No official scores or previous game sessions changed."];
 C.forEach((c,i)=>{
  const d=data[i];
  const eligible=!(d.method==="area"&&!d.area);
  const provisional=eligible?(d.score||"not checked"):"not evaluated — no region selected";
  lines.push((i+1)+". "+c.name+" | tested method: "+(d.method||c.default)+" | pin: "+(d.pin?d.pin.lon.toFixed(3)+","+d.pin.lat.toFixed(3):"none")+
   " | region: "+(d.area||"none")+" | provisional: "+provisional+" | preferred rule: "+(d.vote||"not chosen"))
 });
 lines.push("My preference is a fairness decision, not a scored geography answer. Please review borderline microstate placements before adopting scoring.");
 return lines.join("\n")
}
function init(){
 load();document.querySelectorAll('input[name="method"]').forEach(x=>x.addEventListener("change",()=>{data[at].revealed=false;data[at].score=null;updateMethod();$("result").hidden=true;draw(true)}));
 document.querySelectorAll('input[name="vote"]').forEach(x=>x.addEventListener("change",()=>{data[at].vote=vote();save();$("progress").textContent=C.filter((_,i)=>data[i].vote).length+" / 7 decisions recorded"}));
 $("area").onchange=()=>{data[at].area=$("area").value;data[at].revealed=false;data[at].score=null;save();$("result").hidden=true};
 $("zoomIn").onclick=()=>zoom(.55);$("zoomOut").onclick=()=>zoom(1.8);$("resetMap").onclick=reset;
 $("removePin").onclick=()=>{data[at].pin=null;data[at].revealed=false;$("pinStatus").textContent="No pin selected";$("result").hidden=true;draw(true);save()};
 $("evaluate").onclick=evaluate;$("next").onclick=()=>choose(at===6?0:at+1);$("previous").onclick=()=>choose(at-1);
 $("build").onclick=()=>{$("export").value=summary();$("copy").disabled=false;$("status").textContent="Feedback prepared. Copy it into our chat when you finish."};
 $("copy").onclick=async()=>{const x=$("export");if(!x.value)x.value=summary();try{await navigator.clipboard.writeText(x.value);$("status").textContent="Copied. Paste into our ChatGPT conversation."}catch{x.focus();x.select();$("status").textContent="Copy selected text manually."}};
 $("restart").onclick=()=>{if(!confirm("Clear only this separate seven-case trial? Old games are not affected."))return;data=C.map(empty);at=0;localStorage.removeItem(STORE);$("export").value="";choose(0)};
 const s=$("atlas");let pointer=null;
 s.addEventListener("pointerdown",e=>{s.setPointerCapture(e.pointerId);pointer={x:e.clientX,y:e.clientY,viewX:view.x,viewY:view.y,moved:false}});
 s.addEventListener("pointermove",e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>7)pointer.moved=true;
  if(pointer.moved){const box=s.getBoundingClientRect();view.x=pointer.viewX-dx*view.w/box.width;view.y=pointer.viewY-dy*view.h/box.height;bounds();draw()}});
 s.addEventListener("pointerup",e=>{if(!pointer)return;const moved=pointer.moved;pointer=null;if(moved)return;const p=svgPoint(e),pin={lon:+normal(p.x/4-180).toFixed(3),lat:+Math.max(-90,Math.min(90,90-p.y/4)).toFixed(3)};
  data[at].pin=pin;data[at].revealed=false;data[at].score=null;$("result").hidden=true;
  $("pinStatus").textContent="Your pin: "+pin.lon.toFixed(3)+", "+pin.lat.toFixed(3);save();draw(true)});
 s.addEventListener("wheel",e=>{e.preventDefault();zoom(e.deltaY>0?1.35:.74,svgPoint(e))},{passive:false});
 choose(at);
 Promise.all(["../location/data/world.json","../location/data/world-10m.json","../location/data/targets.json"].map(u=>fetch(u).then(r=>{if(!r.ok)throw Error(u+" HTTP "+r.status);return r.json()})))
  .then(([lo,high,det])=>{world=lo;hi=high;detail=det;atlas=atlasIndex(hi,world,detail);choose(at);draw(true);$("status").textContent="Atlas ready. Fairness triage is provisional; no token needed."})
  .catch(e=>{$("resolution").textContent="Map loading error: "+e.message});
}
init();
window.__fairness7={count:()=>C.length,case:()=>C[at].name,at:()=>at,view:()=>({...view}),ready:()=>!!atlas,record:()=>({...data[at]})};
