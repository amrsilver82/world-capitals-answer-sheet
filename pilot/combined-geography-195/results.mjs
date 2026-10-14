/**
 * User-entered results only. Never imports protected answer keys.
 * Local drafts are not GitHub saves; the referee must review actual answers.
 */
const clean=value=>String(value??"").replace(/[\r\n|]/g," ").trim().slice(0,120);
export function localBatchReport(items,drafts,geography,batch,total=195){
 if(!Array.isArray(items)||!items.length||items.length>10||!Number.isInteger(batch)||batch<1||
    items.some((q,i)=>q?.q!==(batch-1)*10+i+1))throw Error("Invalid local batch");
 const maxBatch=Math.ceil(total/10);
 if(batch>maxBatch||items.length!==Math.min(10,total-(batch-1)*10))throw Error("Invalid batch size");
 const rows=[];let incomplete=0;
 for(const q of items){
  const d=drafts.get(q.q)||{},g=geography.get(q.q)||null;
  const country=clean(d.countryText)||"[MISSING]";
  const capital=clean(d.capitalText)||"[MISSING]";
  const place=g?.mode==="country_pin"&&Number.isFinite(g.point?.lon)&&Number.isFinite(g.point?.lat)?
   "Pin "+g.point.lon.toFixed(3)+", "+g.point.lat.toFixed(3):
   g?.mode==="broad_area"&&["PACIFIC_OCEAN","CARIBBEAN","INDIAN_OCEAN"].includes(g.choice)?
    "Area "+g.choice:"[MISSING]";
  const blank=[country,capital,place].filter(x=>x==="[MISSING]").length;
  incomplete+=blank;
  rows.push("Q"+q.q+" | Country: "+country+" | Capital: "+capital+" | Geography: "+place);
 }
 const complete=incomplete===0;
 const lines=[
  "World Flags + Capitals + Geography — "+(complete?"COMPLETED":"INCOMPLETE")+" UNSCORED LOCAL BATCH",
  "BROWSER-LOCAL ONLY — NOT GITHUB SAVED — NOT OFFICIALLY GRADED",
  "Batch "+batch+"/"+maxBatch+" | Q"+items[0].q+"–Q"+items.at(-1).q+" | Missing fields: "+incomplete,
  "Player's entries revealed below; correct answers await PRIVATE REFEREE. No answer key or official scores included.",
  ...rows,
  "PRIVATE REFEREE: Confirm inputs in chat; no official scoring/commits from this local export."
 ];
 return {text:lines.join("\n"),complete,missing:incomplete};
}
