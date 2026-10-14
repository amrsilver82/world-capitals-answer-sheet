import {atlasIndex,referee} from "../geography-integrated-v4/referee/scorer.mjs";
import {triageMicrostate} from "../geography-integrated-v4/referee/microstate-triage.mjs";
import {githubClient,replay,eventFor,ISSUE as GAME_ISSUE} from "./sync.mjs";
import {completedBatches,batchHandoff} from "./handoff.mjs";
import {localBatchReport} from "./results.mjs";
const $=id=>document.getElementById(id);
const TOKEN_KEY="wcg-location-github-pat-v1"; // prior user opt-in only; never automatically read.
const ACCEPTANCE=new URLSearchParams(location.search).get("acceptance")==="one";
const ISSUE=ACCEPTANCE?6:GAME_ISSUE;
const ACCEPTANCE_Q=67;
const ACCEPTANCE_VERSION="live-browser-github-acceptance-one-20261014-v1";
let manifest=null,questions=[],client=null,remote=null,connected=false,busy=false,refreshing=false;
let pageIndex=0,currentDraft=null,currentTarget=null,identityLocked=false,temporaryPin=null,atlas=null,world=null,hi=null,detail=null;
let acceptanceFields=null,acceptanceActions=null;
let unsentAcceptance={countryText:"",capitalText:""}; // Ephemeral page memory only, never GitHub until saved.
const unsentBatch=new Map(); // Local unsent 10-card answers; never published until explicit GitHub save.
const LOCAL_KEY="wcg-combined195-unscored-v1", localGeo=new Map();
let localSelected=1;
const localMode=()=>!ACCEPTANCE&&!connected;
const localEntry=q=>localGeo.get(q)||null;
function persistLocal(){
 if(ACCEPTANCE)return;
 try{localStorage.setItem(LOCAL_KEY,JSON.stringify({version:1,selected:localSelected,drafts:[...unsentBatch],geo:[...localGeo]}))}catch{}
}
function loadLocal(){
 if(ACCEPTANCE)return;
 try{
  const s=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null");if(s?.version!==1)return;
  for(const [q,d] of s.drafts||[])if(Number.isInteger(q)&&q>=1&&q<=195&&
   typeof d?.countryText==="string"&&typeof d?.capitalText==="string")
   unsentBatch.set(q,{countryText:d.countryText.slice(0,120),capitalText:d.capitalText.slice(0,120)});
  for(const [q,g] of s.geo||[]){
   if(!Number.isInteger(q)||q<1||q>195)continue;
   if(g?.mode==="country_pin"&&(!g.point||(Number.isFinite(g.point.lon)&&
      Number.isFinite(g.point.lat)&&Math.abs(g.point.lon)<=180&&Math.abs(g.point.lat)<=90)))
      localGeo.set(q,{mode:"country_pin",point:g.point||null});
   if(g?.mode==="broad_area"&&(["PACIFIC_OCEAN","CARIBBEAN","INDIAN_OCEAN",""].includes(g.choice)))
      localGeo.set(q,{mode:"broad_area",choice:g.choice});
  }
  if(Number.isInteger(s.selected)&&s.selected>=1&&s.selected<=10)localSelected=s.selected;
 }catch{}
}
function selectLocal(q){
 if(!localMode()||!questions.slice(pageIndex*10,pageIndex*10+10).some(x=>x.q===q))return;
 localSelected=q;temporaryPin=localEntry(q)?.point||null;
 $("countryInput").value=draft(q).countryText;$("capitalInput").value=draft(q).capitalText;
 renderCards();drawMap();updateLocalTrial();persistLocal();
}
function updateLocalTrial(){
 if(ACCEPTANCE)return;
 const items=questions.slice(pageIndex*10,pageIndex*10+10),v=localEntry(localSelected);
 const identified=items.filter(q=>{const d=draft(q.q);return !!(d.countryText.trim()&&d.capitalText.trim())}).length;
 const geoCount=items.filter(q=>{const g=localEntry(q.q);return g?.point||
  g?.mode==="broad_area"&&g.choice}).length;
 $("trialProgress").textContent="Selected Q"+localSelected+" · Country+Capital "+identified+"/"+items.length+
   " · Geography "+geoCount+"/"+items.length+" · No official scoring";
 $("trialMethod").value=v?.mode||"country_pin";
 $("trialAreaRow").hidden=$("trialMethod").value!=="broad_area";
 $("trialArea").value=v?.mode==="broad_area"?v.choice:"";
 $("trialPinStatus").textContent=v?.mode==="country_pin"&&v.point?
   "Q"+localSelected+" pin: "+v.point.lon.toFixed(3)+", "+v.point.lat.toFixed(3):
   v?.mode==="broad_area"&&v.choice?"Q"+localSelected+" broad area: "+v.choice:
   "Q"+localSelected+" · Geography not yet selected";
 if(localMode())$("clearPin").disabled=!(v?.mode==="country_pin"&&v.point);
}
function buildLocalTrial(){
 if(!localMode())return;
 const items=questions.slice(pageIndex*10,pageIndex*10+10);
 const out=["World Flags + Capitals + Geography — UNSCORED LOCAL TRIAL",
 "Browser-local answers only. NOT synced to private GitHub. Official 390/390 unchanged.",
 "Batch "+(pageIndex+1)+" of 20"];
 for(const q of items){
  const d=draft(q.q),g=localEntry(q.q);
  const geo=g?.mode==="country_pin"&&g.point?
   "pin "+g.point.lon.toFixed(3)+", "+g.point.lat.toFixed(3):
   g?.mode==="broad_area"&&g.choice?"area "+g.choice:"not answered";
  out.push("Q"+q.q+" | Country: "+(d.countryText||"—")+" | Capital: "+(d.capitalText||"—")+" | Geography: "+geo);
 }
 $("trialOutput").value=out.join("\n");$("trialCopy").disabled=false;
 $("trialFeedback").textContent="Local reply prepared. No GitHub write or automatic score.";
}
async function copyLocalTrial(){
 if(!localMode()||!$("trialOutput").value)return;
 try{await navigator.clipboard.writeText($("trialOutput").value);
  $("trialFeedback").textContent="Copied. You can paste this into ChatGPT for referee review."}
 catch{$("trialOutput").focus();$("trialOutput").select();
  $("trialFeedback").textContent="Select-and-copy fallback ready."}
}
function clearLocalTrial(){
 if(!localMode())return;
 for(const q of questions.slice(pageIndex*10,pageIndex*10+10)){
  unsentBatch.delete(q.q);localGeo.delete(q.q);
 }
 localSelected=questions[pageIndex*10].q;temporaryPin=null;
 $("trialOutput").value="";$("trialCopy").disabled=true;
 persistLocal();showNext();drawMap();
 $("trialFeedback").textContent="Browser-local fields cleared. No private GitHub data changed.";
}
function draft(q){if(!unsentBatch.has(q))unsentBatch.set(q,{countryText:"",capitalText:""});return unsentBatch.get(q)}
let view={x:0,y:0,w:1440,h:720},lastDrawn="",activeDrawing=null;
const HALF=Math.PI/180;
const modes={country_pin:"Locate actual country",broad_area:"Identify broad area"};
function message(text,klass=""){$("questionStatus").className=klass;$("questionStatus").textContent=text}
function auth(text,klass=""){$("authStatus").className=klass;$("authStatus").textContent=text}
function getCurrent(){return remote?.next||null}

function renderChatHandoff(){
 const list=$("handoffBatch"),button=$("copyHandoff"),summary=$("handoffStatus");
 if(!list||!button)return;
 const prev=list.value;
 const complete=connected&&remote?completedBatches(remote.accepted):[];
 list.replaceChildren();
 for(const b of complete){const op=document.createElement("option");op.value=String(b.batch);
  op.textContent="Batch "+b.batch+" · Q"+b.start+"–Q"+b.end;list.appendChild(op)}
 if(complete.some(x=>String(x.batch)===prev))list.value=prev;
 else if(complete.length)list.value=String(complete.at(-1).batch);
 list.disabled=!complete.length;button.disabled=!complete.length;
 if(!complete.length){$("handoffPreview").value="";
  summary.textContent=connected?"No entire ten-question batch has been saved yet. There is nothing to hand to chat.":"Connect private GitHub to view completed batches. Browsing remains available."}
 else summary.textContent=complete.length+" full initial "+(complete.length===1?"batch":"batches")+" confirmed in GitHub. Select one for chat referee; no automatic grading or answer reset.";
}
function previewChatHandoff(){
 if(!connected||!remote)return;
 try{$("handoffPreview").value=batchHandoff(remote.accepted,Number($("handoffBatch").value))}
 catch(e){$("handoffStatus").textContent=e.message;$("handoffPreview").value=""}
}
async function copyChatHandoff(){
 previewChatHandoff();
 const output=$("handoffPreview"),value=output.value;
 if(!value)return;
 try{await navigator.clipboard.writeText(value);$("handoffStatus").textContent="Verified batch copied. Paste it into this ChatGPT conversation for private review. No game scores changed."}
 catch(e){output.focus();output.select();$("handoffStatus").textContent="Clipboard not available. The handoff text is selected below; copy it manually. No answers changed."}
}
async function finishBatch(){
 if(ACCEPTANCE||busy)return;
 const output=$("finishOutput"),status=$("finishStatus"),button=$("finishBatch");
 let text="",label="";
 button.disabled=true;
 try{
  if(localMode()){
   const batch=pageIndex+1,items=questions.slice(pageIndex*10,pageIndex*10+10);
   const result=localBatchReport(items,unsentBatch,localGeo,batch);
   text=result.text;
   label=result.complete?
    "Completed UNSCORED LOCAL batch. Only your own entries are revealed; correct answers await private referee. NOT saved to GitHub.":
    "INCOMPLETE LOCAL batch: "+result.missing+" unanswered fields are marked [MISSING]. This is not a completed or saved batch.";
  }else if(connected&&client&&remote){
   // Fresh replay must confirm all GitHub events; never export a merely pending stage.
   const fresh=replay(await client.comments(),manifest);
   const eligible=completedBatches(fresh.accepted);
   const selected=Number($("handoffBatch").value);
   const chosen=eligible.find(x=>x.batch===selected)||eligible.at(-1);
   if(!chosen){
    status.textContent="Batch not complete in private GitHub. Save and verify all ten Geography entries (five in the final batch) first.";
    output.value="";$("finishPanel").scrollIntoView({block:"start",behavior:"auto"});return;
   }
   text=batchHandoff(fresh.accepted,chosen.batch);
   label="GitHub VERIFIED draft batch "+chosen.batch+" only — player-entered results, NOT official grades. Correct answers await private referee.";
   remote=fresh;
   renderChatHandoff();
   $("handoffBatch").value=String(chosen.batch);
   $("handoffPreview").value=text;
  }else{
   status.textContent="Reconnect private GitHub to verify a saved batch, or disconnect to export an UNSCORED LOCAL trial.";
   output.value="";return;
  }
  output.value=text;
  status.textContent=label+" Copying…";
  try{
   await navigator.clipboard.writeText(text);
   status.textContent=label+" Copied in ONE click. Paste into this ChatGPT conversation.";
  }catch{
   output.focus();output.select();
   status.textContent=label+" Clipboard blocked. Results are selected below; use Ctrl+C (or mobile Copy).";
  }
  $("finishPanel").scrollIntoView({block:"start",behavior:"auto"});
 }catch(e){
  output.value="";
  status.textContent="No verified batch report created: "+e.message+". Your draft answers were not changed.";
 }finally{button.disabled=false}
}


function renderCount(){
 const done=remote?.accepted.length||0;
 $("count").textContent=done+" / "+questions.length+" experimentally synced";
 $("stage").textContent=connected?"GitHub draft connected · not official":"Answers editable · connect only to save";
 if(!ACCEPTANCE){
  if(!connected){
   $("finishEligibility").textContent="UNSCORED LOCAL · Copy any time, with missing answers clearly marked. No GitHub login needed.";
  }else{
   const complete=completedBatches(remote?.accepted||[]);
   const currentSize=Math.min(10,195-(Math.floor(done/10)*10));
   const pendingCount=done%10;
   const nextBatch=done<195?" Current batch: "+pendingCount+"/"+currentSize+" saved; "+
    (currentSize-pendingCount)+" remaining.":" All 195 experimental answers saved.";
   $("finishEligibility").textContent=complete.length?
    complete.length+" verified completed "+(complete.length===1?"batch":"batches")+" ready to copy."+
    nextBatch:"No completed verified batch yet."+nextBatch+
    " Private results require every Geography save.";
  }
 }
}
function renderCards(){
 if(!questions.length)return;
 if(!ACCEPTANCE){ // Keep the original answer controls alive while re-rendering the 10 flag cards.
  const fields=$("identityFields"),actions=$("identityActions"),panel=$("activePanel");
  if(fields&&fields.parentElement!==panel)panel.insertBefore(fields,$("geoControls"));
  if(actions&&actions.parentElement!==panel)panel.insertBefore(actions,$("geoControls"));
 }
 const n=Math.ceil(questions.length/10),maxPage=Math.min(n-1,Math.floor((remote?.accepted.length||0)/10));
 pageIndex=Math.max(0,Math.min(maxPage,pageIndex));
 $("batchNo").textContent="Batch "+(pageIndex+1)+" / "+n;
 $("batchPrev").disabled=pageIndex===0;$("batchNext").disabled=pageIndex>=maxPage;
 const wrap=$("cards");wrap.replaceChildren();
 for(const q of questions.slice(pageIndex*10,pageIndex*10+10)){
  const card=document.createElement("article");card.className="card";card.dataset.question=String(q.q);
  const done=remote?.accepted.find(x=>x.q===q.q);
  const current=getCurrent()?.q===q.q||!connected&&q.q===(ACCEPTANCE?ACCEPTANCE_Q:localSelected);
  if(done)card.classList.add("done");if(current)card.classList.add("current");
  if(ACCEPTANCE)card.classList.add("acceptance-card");
  const top=document.createElement("div");top.className="header";
  const no=document.createElement("strong");no.textContent="Question "+q.q;
  const state=document.createElement("span");
  state.textContent=done?"Saved to GitHub":getCurrent()?.q===q.q?"Current":current?"Ready to type · unsaved":"Editable · not saved";
  top.append(no,state);
  const flag=document.createElement("div");flag.className="flagPic";
  const img=document.createElement("img");img.src=q.flag;img.loading="lazy";img.alt="Flag for question "+q.q;flag.appendChild(img);
  const field=document.createElement("div");field.className="fieldsSmall";
  field.textContent=done?"Country: "+(done.countryText||"—")+" · Capital: "+(done.capitalText||"—"):
   "Country and Capital · type here; nothing saved until you confirm";
  if(ACCEPTANCE){
   if(!acceptanceFields||!acceptanceActions)throw Error("Answer fields missing");
   acceptanceFields.hidden=!!done;acceptanceActions.hidden=!!done;
   card.append(top,flag,field,acceptanceFields,acceptanceActions);
  }else if(done){
   const button=document.createElement("button");button.type="button";button.textContent="See saved submission";
   button.onclick=()=>showSaved(done);card.append(top,flag,field,button);
  }else if(current){
   const fields=$("identityFields"),actions=$("identityActions");
   fields.hidden=false;actions.hidden=false;card.append(top,flag,field,fields,actions);
  }else{
   const fields=document.createElement("div");fields.className="fields";
   for(const [kind,name] of [["countryText","Country"],["capitalText","Capital"]]){
    const label=document.createElement("label");label.textContent=name;
    const input=document.createElement("input");input.type="text";input.autocomplete="off";input.spellcheck=false;
    input.placeholder=name+" answer";input.value=draft(q.q)[kind];
    input.addEventListener("input",()=>{draft(q.q)[kind]=input.value;persistLocal();updateLocalTrial()});label.append(input);fields.append(label);
   }
   card.append(top,flag,field,fields);
   if(localMode()){
    const select=document.createElement("button");
    select.type="button";select.className="locateQuestion";
    select.textContent="Place Geography for Q"+q.q;
    select.onclick=()=>selectLocal(q.q);card.append(select);
   }
  }
  wrap.appendChild(card);
 }
}
function showSaved(done){
 message("GitHub-confirmed experimental Q"+done.q+": Country and Capital responses and geography recorded. Private referee will grade after full batch.","good");
}
function showNext(){
 renderCount();renderCards();renderChatHandoff();
 const q=getCurrent(),shown=q||(!connected?(ACCEPTANCE?manifest?.questions[0]:questions.find(x=>x.q===localSelected)):null);
 identityLocked=false;currentTarget=null;currentDraft=null;temporaryPin=null;
 $("clearPin").disabled=true;
 if(ACCEPTANCE&&(remote?.pending||connected&&!q))unsentAcceptance={countryText:"",capitalText:""};
 if(!ACCEPTANCE)for(const finished of remote?.accepted||[])unsentBatch.delete(finished.q);
 $("countryInput").value=ACCEPTANCE?shown&&!remote?.pending?unsentAcceptance.countryText:"":
    shown&&!remote?.pending?draft(shown.q).countryText:"";
 $("capitalInput").value=ACCEPTANCE?shown&&!remote?.pending?unsentAcceptance.capitalText:"":
    shown&&!remote?.pending?draft(shown.q).capitalText:"";
 const canType=!!shown&&!remote?.pending;
 $("countryInput").disabled=!canType;$("capitalInput").disabled=!canType;
 $("lockIdentity").disabled=!connected||!canType;
 $("lockIdentity").hidden=!shown||!!remote?.pending;
 $("lockIdentity").textContent=!connected?"Connect GitHub to enable saving":"Save Country + Capital, then reveal Geography";
 $("unlockIdentity").hidden=true;
 $("geoControls").hidden=false;
 $("trialPanel").hidden=!localMode();$("trialMethodRow").hidden=!localMode();
 if(localMode())temporaryPin=localEntry(localSelected)?.point||null;
 if(!remote?.pending){
  $("geoPrompt").textContent="Unlabeled world atlas — explore freely. The geography target appears only after Country and Capital are saved to private GitHub.";
  $("areaRow").hidden=true;$("clearPin").hidden=false;
  $("mapInstructions").hidden=false;
  $("mapInstructions").textContent="Start with the whole world. Zoom and pan manually, without country hints or automatic prezoom. Pin submission unlocks only after private answer confirmation.";
  $("mapStatus").hidden=false;$("atlas").closest(".mapFrame").hidden=false;
  $("submit").hidden=true;
 }else $("submit").hidden=false;
 $("activePanel").hidden=false;
 $("activeTitle").textContent=ACCEPTANCE?"Shared atlas — Geography":q?"Shared atlas — Question "+q.q:"Shared atlas — World view";
 $("modeLabel").textContent="";
 $("instructions").textContent=remote?.pending?
   "Country and Capital saved privately. Loading the Geography target...":
   !connected?"Type directly on each flag card and browse the atlas. Connect GitHub only when ready to save.":
   q?"Save the current flag's Country and Capital before its Geography target is revealed.":
   "Experimental run completed; recorded progress remains in GitHub.";
 message(shown?"Unscored development draft; official scores unchanged.":"");
 pageIndex=ACCEPTANCE?0:q?Math.floor((q.q-1)/10):pageIndex;
 renderCards();renderAcceptanceProof();
 if(!ACCEPTANCE){updateLocalTrial();if(localMode())drawMap()}
 if(remote?.pending&&connected)restorePending();
}
function scoreInput(q,g){
 return {iso:q.iso,mode:q.mode,point:g.point||null,areaChoice:g.choice||null,acceptedArea:q.area||null};
}
function normalizedGeo(){
 const q=currentTarget;if(!q||!remote?.pending)return null;
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
function clampView(){view.w=Math.max(0.2,Math.min(1440,view.w));view.h=Math.max(0.1,Math.min(720,view.h));
 view.x=Math.max(-1440,Math.min(2880-view.w,view.x));view.y=Math.max(0,Math.min(720-view.h,view.y))}
function zoom(f,p){
 const a=p||{x:view.x+view.w/2,y:view.y+view.h/2};const w=view.w,h=view.h;
 view.w=w*f;view.h=h*f;view.x=a.x-(a.x-view.x)*f;view.y=a.y-(a.y-view.y)*f;clampView();drawMap();
}
function setPin(e){
 if(localMode()){
  if(busy||$("trialMethod").value!=="country_pin")return;
  const p=mapPoint(e),point={lon:+normalize(p.x/4-180).toFixed(3),lat:+Math.max(-90,Math.min(90,90-p.y/4)).toFixed(3)};
  temporaryPin=point;localGeo.set(localSelected,{mode:"country_pin",point});
  drawMap();persistLocal();updateLocalTrial();return;
 }
 const q=getCurrent();if(!q||currentTarget?.mode!=="country_pin"||!remote?.pending||!identityLocked||!connected||busy)return;
 const p=mapPoint(e);temporaryPin={lon:+normalize(p.x/4-180).toFixed(3),lat:+Math.max(-90,Math.min(90,90-p.y/4)).toFixed(3)};
 drawMap();$("clearPin").disabled=false;updateSubmit();
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
 $("zoomIn").onclick=()=>zoom(.45,temporaryPin?{x:(temporaryPin.lon+180)*4,y:(90-temporaryPin.lat)*4}:undefined);$("zoomOut").onclick=()=>zoom(1.43);$("resetWorld").onclick=worldView;
 $("clearPin").onclick=()=>{
  if(!temporaryPin)return;temporaryPin=null;
  if(localMode()){localGeo.set(localSelected,{mode:"country_pin",point:null});
   persistLocal();updateLocalTrial()}
  $("clearPin").disabled=true;drawMap();updateSubmit();
 };
}
function beginGeography(){
 const q=currentTarget;
 if(!connected||!q||!remote?.pending)return;
 identityLocked=true;currentDraft={countryText:remote.pending.countryText,capitalText:remote.pending.capitalText};
 $("countryInput").value=currentDraft.countryText;$("capitalInput").value=currentDraft.capitalText;
 $("countryInput").disabled=true;$("capitalInput").disabled=true;
 $("lockIdentity").hidden=true;$("unlockIdentity").hidden=true;
 $("geoControls").hidden=false;
 $("submit").hidden=false;
 $("geoPrompt").textContent="Place "+q.name+" on the world map, or choose its permitted broad area.";
 $("trialPanel").hidden=true;$("trialMethodRow").hidden=true;
 $("areaRow").hidden=q.mode!=="broad_area";$("clearPin").hidden=q.mode!=="country_pin";$("clearPin").disabled=true;$("mapInstructions").hidden=q.mode!=="country_pin";
 $("mapInstructions").textContent="Place your own pin for "+q.name+"; pan and zoom manually, with no automatic country prezoom.";
 $("mapStatus").hidden=q.mode!=="country_pin";$("atlas").closest(".mapFrame").hidden=q.mode!=="country_pin";
 $("modeLabel").textContent=modes[q.mode];
 $("instructions").textContent="Your Country and Capital answers are securely recorded; they cannot be edited. Now answer Geography.";
 $("areaSelect").value="";temporaryPin=null;if(!ACCEPTANCE)worldView();updateSubmit();
}
async function restorePending(){
 const waiting=remote?.pending,q=getCurrent();
 if(!waiting||!q||!connected)return;
 try{
  const target=await client.targetFor(q.q,q.flag,waiting);
  if(remote?.pending?.attempt_id!==waiting.attempt_id||!connected)return;
  currentTarget=target;beginGeography();
 }catch(e){message("Unable to load verified geography target: "+e.message,"warning")}
}
async function refresh(force=false){
 if(!client||refreshing||busy)return;
 if(document.hidden&&!force)return;refreshing=true;
 try{
  const next=replay(await client.comments(),manifest);
  const changed=remote?.lastId!==next.lastId||remote?.accepted.length!==next.accepted.length;
  remote=next;
  if(changed||force){showNext();auth("Private GitHub verified: "+next.accepted.length+" complete geographic drafts.","good")}
 }catch(e){auth("Private GitHub refresh failed: "+e.message,"warning")}
 finally{refreshing=false}
}
async function submit(){
 const q=getCurrent(),geo=normalizedGeo(),waiting=remote?.pending;
 if(!connected||busy||!q||!identityLocked||!geo||!waiting||!currentTarget)return;
 busy=true;$("submit").disabled=true;message("Saving geography to private GitHub...");
 try{
  const before=replay(await client.comments(),manifest);
  if(before.next?.q!==q.q||before.pending?.attempt_id!==waiting.attempt_id){
   remote=before;showNext();message("This question changed in another client. Refreshed without duplicate.","warning");return
  }
  const id=crypto.randomUUID(),ev=eventFor(q,manifest,{geography:geo},id,"geography",waiting,currentTarget);
  await client.post(ev);
  const after=replay(await client.comments(),manifest);remote=after;
  if(!after.acceptedIds.has(id)){
   showNext();message("Another device completed first; stale answer not counted.","warning");return
  }
  const isMicro=["MC","VA","SM"].includes(currentTarget.iso);
  const score=atlas?(isMicro?triageMicrostate({iso:currentTarget.iso,point:geo.point,atlas}):
   referee({...scoreInput(currentTarget,geo),atlas})):null;
  const feedback=score?.result==="manual-review"?
   "Microstate location is BORDERLINE ("+score.nearBorderKm+" km). Human referee review required: NO automatic score.":
   isMicro?"Microstate geography provisional "+(score?.points??"needs review")+"/1 (draft only; no approved threshold).":
   "Geography provisional "+(score?.points??"needs review")+"/1; final scoring awaits approved referee.";
  showNext();message("Full draft saved and confirmed. "+feedback,"good");
 }catch(e){message("Geography not confirmed: "+e.message+". Retry after checking connection.","warning")}
 finally{busy=false;updateSubmit()}
}
async function saveIdentity(){
 const q=getCurrent();
 if(!connected||busy||!q||remote?.pending)return;
 busy=true;$("lockIdentity").disabled=true;
 const data={countryText:$("countryInput").value.trim(),capitalText:$("capitalInput").value.trim()};
 try{
  const before=replay(await client.comments(),manifest);
  if(before.next?.q!==q.q||before.pending){
   remote=before;showNext();message("Other client advanced the checkpoint; nothing overwritten.","warning");return
  }
  const id=crypto.randomUUID(),ev=eventFor(q,manifest,data,id,"identity");
  await client.post(ev);
  const after=replay(await client.comments(),manifest);remote=after;
  if(!after.identityIds.has(id)){
   showNext();message("A different client saved this question first; its identity is authoritative.","warning");return
  }
  showNext();message("Initial Country and Capital saved to GitHub; geography target now available.","good");
 }catch(e){message("Initial answers NOT confirmed: "+e.message+". You may retry.","warning")}
 finally{busy=false;$("lockIdentity").disabled=!!remote?.pending||!connected;updateSubmit()}
}
function renderAcceptanceProof(){
 if(!ACCEPTANCE)return;
 const out=$("acceptanceProof"),done=remote?.accepted[0],waiting=remote?.pending;
 if(!connected){out.textContent="Connect with a restricted GitHub token to read the isolated experimental checkpoint.";return}
 if(done){const point=done.geography?.point;
  out.textContent="PRIVATE GITHUB CHECKPOINT VERIFIED · 1/1 saved\n"+
    "Country entered: "+done.countryText+"\nCapital entered: "+done.capitalText+"\n"+
    (point?"Saved pin: longitude "+point.lon+"°, latitude "+point.lat+"°\n":"Saved broad area: "+done.geography?.choice+"\n")+
    "GitHub identity comment: #"+done.githubIdentityCommentId+"\nGitHub geography comment: #"+done.githubCommentId+"\n"+
    "Reconnect/reload: values loaded from private GitHub, not browser storage. No official scores changed.";
 }else if(waiting)out.textContent="PRIVATE GITHUB CHECKPOINT VERIFIED · Country + Capital saved; Geography pending. Reload/reconnect now to test recovery before completing the pin.";
 else out.textContent="No acceptance answer saved. Only ONE geography question will be submitted to private Issue #6.";
}
async function connect(token){
 if(busy)return;busy=true;auth("Verifying private experimental Issue #"+ISSUE+"…");
 try{const next=githubClient(token,fetch,ISSUE);await next.verify();const up=replay(await next.comments(),manifest);
  client=next;connected=true;remote=up;$("credential").value="";
  $("connect").disabled=true;$("refresh").disabled=false;$("disconnect").disabled=false;
  showNext();auth("Connected: "+up.accepted.length+"/"+questions.length+" synced through private GitHub. No official scores.","good");
 }catch(e){client=null;connected=false;auth("Could not connect: "+e.message,"warning");showNext()}
 finally{busy=false}
}
function disconnect(){client=null;connected=false;remote=null;identityLocked=false;currentDraft=null;temporaryPin=null;
 $("credential").value="";$("connect").disabled=false;$("refresh").disabled=true;$("disconnect").disabled=true;showNext();auth("Disconnected. No GitHub draft history deleted.")}
async function init(){
 const r=await Promise.all(["data/questions.json","../location/data/world.json","../location/data/targets.json"].map(u=>fetch(u).then(x=>{if(!x.ok)throw Error("Asset unavailable "+u);return x.json()})));
 [manifest,world,detail]=r;
 if(ACCEPTANCE){const selected=manifest.questions.find(x=>x.q===ACCEPTANCE_Q);
  if(!selected)throw Error("Acceptance question unavailable");
  manifest={...manifest,version:ACCEPTANCE_VERSION,github_event_issue:ISSUE,questions:[selected]};
  document.title="One-question GitHub browser sync test";
  document.querySelector("header h1").textContent="GitHub synchronization · one-question acceptance";
  document.querySelector("header .sub").textContent="ONE new unscored question · private Issue #6 only · original 390/390 untouched";
  document.querySelector("header .notice").textContent="This is a restricted browser write/read/reload test. No earlier V3/V4 trial results are reused.";
  document.querySelector(".sectionheading h2").textContent="Single unscored flag card";
  $("chatHandoff").hidden=true;$("finishPanel").hidden=true;$("acceptancePanel").hidden=false;
  const sheet=$("cards").closest(".panel");
  sheet.querySelector(".sectionheading span").textContent="One question · unscored";
  sheet.querySelector(".batchNav").style.display="none";
  $("cards").classList.add("single-acceptance");
  acceptanceFields=$("identityFields");acceptanceActions=$("identityActions");
  // Original flag-card / atlas / authorization order is applied for both modes below.
  $("countryInput").addEventListener("input",()=>{if(!remote?.pending)unsentAcceptance.countryText=$("countryInput").value});
  $("capitalInput").addEventListener("input",()=>{if(!remote?.pending)unsentAcceptance.capitalText=$("capitalInput").value});
 }
 questions=manifest.questions;loadLocal();
 if(questions.length!==(ACCEPTANCE?1:195)||new Set(questions.map(x=>x.q)).size!==questions.length||questions.some(x=>Object.keys(x).some(k=>!["q","flag"].includes(k))))throw Error("Public flag-only manifest verification failed");
 if(manifest.github_event_issue!==ISSUE)throw Error("Dedicated issue mismatch");
 worldView();setupMap();$("batchPrev").onclick=()=>{pageIndex--;renderCards()};$("batchNext").onclick=()=>{pageIndex++;renderCards()};
 $("lockIdentity").onclick=saveIdentity;$("unlockIdentity").hidden=true;
 $("areaSelect").onchange=updateSubmit;$("submit").onclick=submit;
 $("handoffBatch").onchange=previewChatHandoff;$("copyHandoff").onclick=copyChatHandoff;
 $("connect").onclick=()=>connect($("credential").value.trim());
 $("reuse").onclick=()=>{const token=localStorage.getItem(TOKEN_KEY)||"";if(!token){auth("No previously remembered pilot credential in this browser. Enter a restricted token if you decide to try synchronized drafts.");return}connect(token)};
 $("refresh").onclick=()=>refresh(true);$("disconnect").onclick=disconnect;
 $("trialMethod").onchange=()=>{
  if(!localMode())return;
  const mode=$("trialMethod").value;temporaryPin=null;
  localGeo.set(localSelected,mode==="broad_area"?{mode,choice:""}:{mode:"country_pin",point:null});
  drawMap();persistLocal();updateLocalTrial();
 };
 $("trialArea").onchange=()=>{
  if(!localMode())return;
  localGeo.set(localSelected,{mode:"broad_area",choice:$("trialArea").value});
  persistLocal();updateLocalTrial();
 };
 $("trialBuild").onclick=buildLocalTrial;$("trialCopy").onclick=copyLocalTrial;
 $("finishBatch").onclick=finishBatch;
 $("trialClear").onclick=clearLocalTrial;
 window.addEventListener("focus",()=>refresh(false));document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh(false)});setInterval(()=>refresh(false),60000);
  setInterval(()=>{if(connected&&remote?.pending&&!currentTarget)refresh(false)},12000); // Wait for private Action's single-target receipt.
 if(!ACCEPTANCE){
  $("countryInput").addEventListener("input",()=>{const q=getCurrent()||(!connected?questions.find(x=>x.q===localSelected):null);if(q&&!remote?.pending)draft(q.q).countryText=$("countryInput").value;persistLocal();updateLocalTrial()});
  $("capitalInput").addEventListener("input",()=>{const q=getCurrent()||(!connected?questions.find(x=>x.q===localSelected):null);if(q&&!remote?.pending)draft(q.q).capitalText=$("capitalInput").value;persistLocal();updateLocalTrial()});
 }
 const sheet=$("cards").closest(".panel");sheet.after($("activePanel"));
 $("activePanel").after($("chatHandoff")); // retained handoff, after atlas
 $("chatHandoff").after(document.querySelector(".panel.auth")); // permissioned sync remains optional and secondary
 renderCount();renderCards();showNext();
 fetch("../location/data/world-10m.json").then(x=>x.json()).then(j=>{if(j.features?.length<200)throw Error("Invalid high-resolution atlas");hi=j;atlas=atlasIndex(hi,world,detail);drawMap(true);updateSubmit()}).catch(e=>{$("mapStatus").textContent="Detailed map unavailable: "+e.message});
}
window.__combined195={getCount:()=>questions.length,modeCount:()=>({status:"PRIVATE_AFTER_IDENTITY",total:questions.length}),getStatus:()=>({connected,accepted:remote?.accepted.length||0,next:remote?.next?.q??null,identitySaved:!!remote?.pending,acceptance:ACCEPTANCE}),getWorldView:()=>({...view}),getLocalTrial:()=>({selected:localSelected,geography:[...localGeo],drafts:[...unsentBatch]}),getSubmitted:()=>remote?.accepted||[],getCurrent:()=>getCurrent(),getAtlasReady:()=>!!atlas,getTarget:()=>currentTarget,getCompletedHandoffs:()=>remote?completedBatches(remote.accepted).map(x=>x.batch):[],getHandoffPreview:()=>{const batches=remote?completedBatches(remote.accepted):[];return batches.length?batchHandoff(remote.accepted,batches.at(-1).batch):null},getFinishText:()=>($("finishOutput")?.value||"")};
init().catch(e=>{$("count").textContent="Could not load game";auth(e.message,"warning")});
