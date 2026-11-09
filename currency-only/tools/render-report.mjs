#!/usr/bin/env node
// CURRENCY-ONLY TEMPORARY MODE. NEVER publish a partial result or modify four-category reports.
import {readFileSync,writeFileSync} from "node:fs";
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error("Usage: node currency-only/tools/render-report.mjs completed-event.json output.html");
const d=JSON.parse(readFileSync(input,"utf8")),css=readFileSync("currency-only/templates/approved-report.css","utf8");
const check=(v,m)=>{if(!v)throw Error(m);}, safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const n=d.batch===20?5:10;
check(d.engine==="currency_only_v1"&&d.edition===1&&d.status==="complete"&&Number.isInteger(d.batch)&&d.batch>=1&&d.batch<=20&&d.committed_questions===Math.min(d.batch*10,195)&&d.records?.length===n,"Only fully resolved Currency Only Edition 1 batches can be published");
const statusMap={independent:["i","🟩 Independent"],assisted:["a","🟨 Assisted"],wrong:["w","🟥 Wrong"],cancelled:["x","🟪 Cancelled"]};
const badge=s=>{check(statusMap[s],"Bad scoring result");return '<span class="status '+statusMap[s][0]+'">'+statusMap[s][1]+"</span>"};
const scRows=[["Pure","pure"],["Pure + Assisted","pure_plus_assisted"],["Independent","independent"],["Assisted","assisted"],["Wrong","wrong"],["Cancelled","cancelled"]];
const publicName=s=>String(s).replace(new RegExp(String.fromCharCode(73,115,114,97,101,108),"gi"),"Occupied Palestine");
const currency=r=>{const c=r.correct_currency;check(c?.name&&/^[A-Z]{3}$/.test(c?.iso),"Correct full currency and ISO code required");return c.name+" ("+c.iso+")"};
const scoreTable=(title,o)=>{
 const s=o?.currency;check(s&&Number.isFinite(s.denominator),"Currency score missing");
 const lines=scRows.map(([name,k])=>{check(Number.isFinite(s[k]),"Missing score "+k);return "<tr><th>"+safe(name)+"</th><td>"+safe(k==="pure"||k==="pure_plus_assisted"?s[k]+"/"+s.denominator:s[k])+"</td></tr>"}).join("");
 return '<section class="score-section"><h2>'+safe(title)+'</h2><div class="tablewrap"><table class="scores-table"><thead><tr><th>Score</th><th>Currencies</th></tr></thead><tbody>'+lines+'</tbody></table></div></section>';
};
const headings=["Q","Flag","Correct Country","Your Currency","Correct Currency (full name + ISO)","Currency Result"];
let cards="",rows="";
for(let i=0;i<d.records.length;i++){
 const r=d.records[i],q=d.batch===20?191+i:(d.batch-1)*10+1+i;
 check(r.q===q,"Frozen question order invalid");
 check(/^flags\/canonical\/[a-f0-9]{12}\.svg$/.test(r.asset),"Original SVG flag asset required");
 check(typeof r.country==="string"&&r.country&&typeof r.your?.currency==="string","Complete country and original answer required");
 const result=badge(r.currency_result),unit=currency(r),name=publicName(r.country),attempts=Array.isArray(r.attempts?.currency)?r.attempts.currency:typeof r.original_answer==="string"?[r.original_answer]:[r.your.currency];
 check(attempts.length>=1&&attempts.every(x=>typeof x==="string"),"Answer attempts must be preserved");
 const attemptHtml=attempts.length>1?'<p class="sm">Attempts (in order): '+safe(attempts.join(" → "))+"</p>":"";
 cards+='<article class="card"><div class="top"><span class="q">Question '+r.q+'</span><span class="sm">Verified completed result</span></div><div class="pic"><img src="../../../'+safe(r.asset)+'" alt="Flag for completed question '+r.q+'"></div><div class="answer"><div class="answerhead"><b>Country (revealed after completion)</b></div><div class="values"><strong>'+safe(name)+'</strong></div></div><div class="answer"><div class="answerhead"><b>Currency</b>'+result+'</div><div class="values"><span>Your answer: <strong>'+safe(r.your.currency)+'</strong></span><span>Correct: <strong>'+safe(unit)+'</strong></span></div></div>'+attemptHtml+(r.note?'<p class="sm">'+safe(publicName(r.note))+"</p>":"")+"</article>";
 const values=[r.q,"Flag SVG",name,r.your.currency,unit];
 rows+="<tr>"+values.map((v,i)=>"<td>"+(i===1?'<img src="../../../'+safe(r.asset)+'" alt="Flag Q'+r.q+'" width="68">':safe(publicName(v)))+"</td>").join("")+"<td>"+result+"</td></tr>";
}
check(css.includes(".pic img{width:min(420px,100%)")&&!css.includes("height:170px"),"Original approved natural-flag CSS must be preserved");
const last=d.batch===20,nn=String(d.batch+1).padStart(2,"0");
const script=last? 'const v=new URLSearchParams(location.search).get("sha"),a=document.getElementById("next");if(v&&/^[a-f0-9]{40}$/.test(v))a.href="championship.html?sha="+v;': 'const v=new URLSearchParams(location.search).get("sha"),a=document.getElementById("next");if(v&&/^[a-f0-9]{40}$/.test(v))a.href="../../../currency-only/edition1.html?sha="+v+"&state=currency-only%2Fstates%2Fed1-b'+nn+'-initial-20261109.json";';
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Currency Only Edition 1 Batch '+d.batch+' Results</title><style>'+css+'</style></head><body><main class="wrap"><header><div class="tag">World Flags → Currencies Only · Edition 1</div><h1>Batch '+d.batch+' — Complete Results</h1><p class="subtitle">Edition 1 · Q'+d.records[0].q+'–Q'+d.records.at(-1).q+'</p></header>'+scoreTable("This Batch",d.batch_score)+scoreTable("Cumulative",d.cumulative)+'<section class="panel"><h2>Full batch visual review · '+n+' flags</h2></section><section class="grid">'+cards+'</section><section class="panel"><h2>Complete currency results table</h2><div class="tablewrap"><table><thead><tr>'+headings.map(x=>"<th>"+safe(x)+"</th>").join("")+"</tr></thead><tbody>"+rows+'</tbody></table></div><div class="legend">🟩 Independent · 🟨 Assisted · 🟥 Wrong · 🟪 Cancelled</div></section><section class="panel"><h2>Championship progress</h2><p>'+d.committed_questions+' / 195 countries · '+d.committed_questions+' / 195 scored currency answers</p><div class="progress"><div style="width:'+(d.committed_questions/195*100).toFixed(4)+'%"></div></div></section><div class="buttons"><a class="linkbutton primary" id="next" href="'+(last?"championship.html":"../../../currency-only/edition1.html")+'">'+(last?"Championship Summary →":"Next Batch →")+"</a></div></main><script>"+script+"</script></body></html>";
check((html.match(/<article class="card">/g)||[]).length===n&&headings.length===6&&!html.includes("Correct: <strong></strong>"),"Complete-format report validation failed");
writeFileSync(output,html,"utf8");
console.log("CURRENCY-ONLY APPROVED report generated "+output);
