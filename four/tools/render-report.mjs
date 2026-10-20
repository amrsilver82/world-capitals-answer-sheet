#!/usr/bin/env node
// Approved four-category report generator. Only run on FULLY RESOLVED scoring events.
import {readFileSync,writeFileSync} from "node:fs";
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error("Usage: node four/tools/render-report.mjs completed-event.json output.html");
const d=JSON.parse(readFileSync(input,"utf8")),css=readFileSync("four/templates/approved-report.css","utf8");
const check=(v,m)=>{if(!v)throw Error(m);};
const n=d.batch===20?5:10;
check(d.engine==="four_v1"&&d.edition===1&&d.status==="complete"&&d.batch>=1&&d.batch<=20&&d.records?.length===n&&d.committed_questions===Math.min(d.batch*10,195),"Only completely scored edition batches may be published");
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const blocked=String.fromCharCode(73,115,114,97,101,108),publicName=s=>String(s).replace(new RegExp(blocked,"gi"),"Occupied Palestine");
const fields=[["flag","Countries"],["capital","Capitals"],["language","Languages"],["currency","Currencies"]];
const metrics=[["Pure","pure"],["Pure + Assisted","pure_plus_assisted"],["Independent","independent"],["Assisted","assisted"],["Wrong","wrong"],["Cancelled","cancelled"]];
const statuses={independent:["i","🟩 Independent"],assisted:["a","🟨 Assisted"],wrong:["w","🟥 Wrong"],cancelled:["x","🟪 Cancelled"]};
const badge=s=>{check(statuses[s],"Unknown scoring status");return '<span class="status '+statuses[s][0]+'">'+statuses[s][1]+"</span>";};
const currency=r=>{const v=r.correct_currency;if(typeof v==="string"){check(/\([A-Z]{3}\)/.test(v),"Currency must give name and ISO");return v;}check(v&&typeof v.name==="string"&&v.name.trim()&&/^[A-Z]{3}$/.test(v.iso),"Currency name and ISO mandatory");return v.name+" ("+v.iso+")";};
function scoreTable(title,obj){
 const head="<tr>"+["Score",...fields.map(x=>x[1])].map(x=>"<th>"+x+"</th>").join("")+"</tr>";
 const body=metrics.map(([label,key])=>"<tr><th>"+label+"</th>"+fields.map(([field])=>{const a=obj?.[field];check(a&&Number.isFinite(a.denominator)&&Number.isFinite(a[key]),"Missing "+title+" "+field+" "+key);return "<td>"+safe((key==="pure"||key==="pure_plus_assisted")?a[key]+"/"+a.denominator:a[key])+"</td>";}).join("")+"</tr>").join("");
 return '<section class="score-section"><h2>'+title+'</h2><div class="tablewrap"><table class="scores-table"><thead>'+head+"</thead><tbody>"+body+"</tbody></table></div></section>";
}
const headers=["Q","Your Country","Correct Country","Flag","Your Capital","Correct Capital","Capital","Your Language","Correct Language(s)","Language","Your Currency","Correct Currency (name + ISO)","Currency"];
let cards="",rows="";
for(const r of d.records){
 check(Number.isInteger(r.q)&&/^flags\/canonical\/[a-f0-9]{12}\.svg$/.test(r.asset),"Flag path invalid");
 check(r.your&&["country","capital","language","currency"].every(k=>typeof r.your[k]==="string"),"All submitted fields required");
 check(r.country&&r.correct_capital&&r.correct_languages&&r.correct_currency,"Missing correct field");
 const blocks=[["Country",r.your.country,publicName(r.country),r.flag_result],["Capital",r.your.capital,r.correct_capital,r.capital_result],["Language",r.your.language,r.correct_languages,r.language_result],["Currency",r.your.currency,currency(r),r.currency_result]];
 cards+='<article class="card"><div class="top"><span class="q">Question '+r.q+'</span><span class="sm">Verified completed result</span></div><div class="pic"><img src="../../../'+safe(r.asset)+'" alt="Flag for completed question '+r.q+'"></div>'+blocks.map(([label,user,correct,state])=>'<div class="answer"><div class="answerhead"><b>'+label+"</b>"+badge(state)+'</div><div class="values"><span>Your answer: <strong>'+safe(publicName(user))+'</strong></span><span>Correct: <strong>'+safe(publicName(correct))+"</strong></span></div></div>").join("")+(r.note?'<p class="sm">'+safe(publicName(r.note))+"</p>":"")+"</article>";
 const values=[r.q,r.your.country,r.country,badge(r.flag_result),r.your.capital,r.correct_capital,badge(r.capital_result),r.your.language,r.correct_languages,badge(r.language_result),r.your.currency,currency(r),badge(r.currency_result)];
 rows+="<tr>"+values.map(x=>"<td>"+(String(x).startsWith('<span class="status')?x:safe(publicName(x)))+"</td>").join("")+"</tr>";
}
check(css.includes(".pic img{width:min(420px,100%)")&&!css.includes("height:170px"),"Approved natural-size flag CSS missing");
const last=d.batch===20,next=String(d.batch+1).padStart(2,"0");
const script=last?
 'const s=new URLSearchParams(location.search).get("sha"),a=document.getElementById("next");if(s&&/^[a-f0-9]{40}$/.test(s))a.href="championship.html?sha="+s;':
 'const s=new URLSearchParams(location.search).get("sha"),a=document.getElementById("next");if(s&&/^[a-f0-9]{40}$/.test(s))a.href="../../../four-v1.html?sha="+s+"&state=four%2Fstates%2Fed1-b'+next+'-initial-20261020.json";';
const reviewTitle="Full batch visual review · "+n+" questions";
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Four-Category Edition 1 Batch '+d.batch+' Results</title><style>'+css+'</style></head><body><main class="wrap"><header><div class="tag">World Flags + Capitals + Languages + Currencies</div><h1>Batch '+d.batch+' — Complete Results</h1><p class="subtitle">Edition 1 · Q'+d.records[0].q+'–Q'+d.records.at(-1).q+'</p></header>'+scoreTable("This Batch",d.batch_score)+scoreTable("Cumulative",d.cumulative)+'<section class="panel"><h2>'+reviewTitle+'</h2></section><section class="grid">'+cards+'</section><section class="panel"><h2>Complete thirteen-column results table</h2><div class="tablewrap"><table><thead><tr>'+headers.map(x=>"<th>"+safe(x)+"</th>").join("")+"</tr></thead><tbody>"+rows+'</tbody></table></div><div class="legend">🟩 Independent · 🟨 Assisted · 🟥 Wrong · 🟪 Cancelled</div></section><section class="panel"><h2>Championship progress</h2><p>'+d.committed_questions+' / 195 countries · '+d.committed_questions*4+' / 780 scored components</p><div class="progress"><div style="width:'+(d.committed_questions/195*100).toFixed(4)+'%"></div></div></section><div class="buttons"><a id="next" class="linkbutton primary" href="'+(last?"championship.html":"../../../four-v1.html")+'">'+(last?"Championship Summary →":"Next Batch →")+'</a></div></main><script>'+script+'</script></body></html>';
check((html.match(/<article class="card">/g)||[]).length===n&&headers.length===13&&!html.includes("Correct: <strong></strong>"),"Report validation failed");
writeFileSync(output,html,"utf8");console.log("APPROVED report generated: "+output);
