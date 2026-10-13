/**
 * Read-only completed-batch handoff for ChatGPT referee, NOT a scoring engine.
 * Never exports the flag answer key, ISO/expected Country, credential or a pending batch.
 */
export function completedBatches(accepted,total=195){
 if(!Array.isArray(accepted)||total!==195)return [];
 const count=accepted.length,n=Math.ceil(total/10),out=[];
 for(let batch=1;batch<=n;batch++){
  const start=(batch-1)*10+1,end=Math.min(total,start+9);
  if(count<end)break;
  const slice=accepted.slice(start-1,end);
  if(slice.length!==end-start+1||slice.some((x,i)=>x?.q!==start+i||!Number.isSafeInteger(x.githubCommentId)||x.githubCommentId<=0))break;
  out.push({batch,start,end,count:slice.length});
 }
 return out;
}
export function batchHandoff(accepted,batch,total=195){
 const meta=completedBatches(accepted,total).find(x=>x.batch===batch);
 if(!meta)throw Error("Cannot export a batch until all initial questions are verified by GitHub");
 const rows=accepted.slice(meta.start-1,meta.end);
 const lines=[
  "World Capitals Game — Combined 195 Geography | EXPERIMENTAL FIRST-PASS CHAT REFEREE",
  "Original Flag + Capital + Geography trial. Not an official score and not an answer key.",
  "PRIVATE GitHub Issue #5 | Batch "+meta.batch+" | Q"+meta.start+"–Q"+meta.end+" | "+meta.count+" initial answers verified",
  "Review original Country and Capital attempts with the PRIVATE canonical validators.",
  "Only unresolved components get no-clue retries or clues IN CHAT. No incomplete GitHub batch commits.",
  "The geography distances/classification are still provisional and require approved referee rules.",
  "Answers (participant-entered values only; flag answers and correct capitals are not disclosed):"
 ];
 for(const x of rows){
  const g=x.geography;
  if(!g||!["country_pin","broad_area"].includes(g.mode))throw Error("Missing confirmed geography");
  const place=g.mode==="country_pin"?
   (Number.isFinite(g.point?.lon)&&Number.isFinite(g.point?.lat)?
    "Pin: "+g.point.lon.toFixed(3)+","+g.point.lat.toFixed(3):null):
   (typeof g.choice==="string"?"Area: "+g.choice:null);
  if(!place)throw Error("Incomplete geography response");
  lines.push("Q"+x.q+" | Country entered: "+String(x.countryText??"").replace(/[\r\n|]/g," ").slice(0,120)+
   " | Capital entered: "+String(x.capitalText??"").replace(/[\r\n|]/g," ").slice(0,120)+
   " | "+place+" | GitHub comment #"+x.githubCommentId);
 }
 lines.push("REFEREE: First confirm these GitHub comment IDs and Q numbers against the private Issue before adjudication. Do not start or commit a new official test based on this export alone.");
 return lines.join("\n");
}
