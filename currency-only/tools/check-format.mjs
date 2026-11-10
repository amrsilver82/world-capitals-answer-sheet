#!/usr/bin/env node
// Isolated currency-only guard. NEVER edit original four-category documents or their site.
import {readFileSync,readdirSync,existsSync,mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {Script} from "node:vm";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
const check=(v,m)=>{if(!v)throw Error("CURRENCY ONLY FORMAT FAIL: "+m)};
const read=p=>readFileSync(p,"utf8");
const gitBlob=s=>createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0"+s).digest("hex");
const protectedBlobs=[
["four-v1.html","715d938bceec853f9142a87b726c3ee1ef984c92"],
["four/templates/approved-report.css","7780c60e80803625ff3f0dcc22db60417b869d81"],
["four/reports/edition-1/championship.html","a9f0070778203fa3ead97abe38fa2acdad3c6924"]
];
for(const [path,sha] of protectedBlobs)check(gitBlob(read(path))===sha,"Original four-category file must remain BYTE-IDENTICAL: "+path);
const page=read("currency-only/edition1.html"),css=read("currency-only/templates/approved-report.css");
const fourPage=read("four-v1.html");
const originalStyle=fourPage.split("<style>")[1].split("</style>")[0];
const newStyle=page.split("<style>")[1].split("</style>")[0];
check(newStyle.startsWith(originalStyle),"Full original flag/quiz style must be retained verbatim");
check(css===read("four/templates/approved-report.css"),"Original report CSS must be exact");
check(page.includes("Flag → Currency")&&page.includes("id=\"quizGrid\"")&&page.includes('id="build"')&&page.includes('id="copy"')&&page.includes('id="clear"'),"UI and functional controls missing");
check(page.includes('lines.push(q.n+". Currency: "')&& !page.includes("lines.push(q.n+\". Country:")&&!page.includes("q.country+"),"Reply MUST contain only numbered currency answers");
check(page.includes('"../"+q.asset.slice(2)')&&!page.includes("country-face")&&!page.includes("country-name"),"Original SVG display not retained or country shown");
check(page.includes('d.stage!=="initial"')&&page.includes('d.engine!=="currency_only_v1"'),"Frozen official state loader not safe");

const groups=[
["Dollar","Dollar"],["Euro","Euro"],["Franc","Franc"],["Peso","Peso"],["Pound","Pound"],
["Dinar","Dinar"],["Rupee","Rupee"],["Shilling","Shilling"],["Rial","Riyal / Rial"],["Krone","Krone / Krona"]];
for(const [value,label] of groups)check(page.includes('value:"'+value+'",label:"'+label+'"'),"Missing recurring current-currency family "+label);
check(page.includes('Other — type currency')&&page.includes('data-custom=')&&page.includes('data-i=')&&page.includes('function answerFor(n)')&&page.includes("currency-only-official-ed1-family-select-"),"Other typed answer + retained old attempts required");
check(page.includes('Only <strong>current</strong> currencies count')&&!page.includes('historically valid currencies also count'),"Historical currencies must be excluded in this mode");
check(page.includes('lines.push(q.n+". Currency: "')&&!page.includes("q.country+"),"Reply must contain only currency, no country");

const script=page.slice(page.lastIndexOf("<script>")+8,page.lastIndexOf("</script>"));
new Script(script,{filename:"currency-only/edition1.html.inline.js"});
const states=readdirSync("currency-only/states").filter(x=>/^ed1-b(?:0[1-9]|1[0-9]|20)-initial-20261109\.json$/.test(x));
check(states.length>=1,"No official frozen batch present");
let previousQ=new Set();
for(const stateFile of states){
 const d=JSON.parse(read("currency-only/states/"+stateFile)),n=d.batch===20?5:10,first=d.batch===20?191:(d.batch-1)*10+1;
 check(d.engine==="currency_only_v1"&&d.edition===1&&d.stage==="initial"&&d.preview_only!==true&&d.scoring_enabled===true&&d.question_count===n&&d.questions?.length===n&&d.total_countries===195&&d.total_batches===20&&d.start_question===first&&d.end_question===first+n-1,"Frozen state metadata failed for "+stateFile);
 check(Object.keys(d).every(k=>!["correct_answer","country","currency","answers"].includes(k)),"Spoiler in state metadata");
 for(let i=0;i<n;i++){
 const q=d.questions[i];check(q.n===first+i&&!previousQ.has(q.n)&&Object.keys(q).every(k=>["n","asset","display_ratio"].includes(k))&&/^\.\/flags\/canonical\/[a-f0-9]{12}\.svg$/.test(q.asset),"Spoiler/duplicate/out-of-sequence in state "+stateFile);
 check(existsSync(q.asset.slice(2)),"Missing canonical flag SVG "+q.asset);
 previousQ.add(q.n);
 }
}
const runner="currency-only/tools/render-report.mjs";
// ES-module syntax is verified by `node --check currency-only/tools/render-report.mjs` in CI.
const dir=mkdtempSync(join(tmpdir(),"currency-only-format-"));
try{
 for(const batch of [1,20]){
 const n=batch===20?5:10,first=batch===20?191:1;
 const score=(v)=>({denominator:v,pure:v,pure_plus_assisted:v,independent:v,assisted:0,wrong:0,cancelled:0});
 const fixture={engine:"currency_only_v1",edition:1,status:"complete",batch,committed_questions:batch===20?195:10,records:Array.from({length:n},(_,i)=>({q:first+i,asset:"flags/canonical/88e32b3ae666.svg",country:"Fixture Country",your:{currency:"test franc"},correct_currency:{name:"Fixture Franc",iso:"TST"},currency_result:"independent",attempts:{currency:["test franc"]},note:"Not a real player answer"})),batch_score:{currency:score(n)},cumulative:{currency:score(batch===20?195:10)}};
 const input=join(dir,"input.json"),output=join(dir,"report.html");
 writeFileSync(input,JSON.stringify(fixture));
 execFileSync(process.execPath,[runner,input,output],{stdio:"pipe"});
 const html=read(output);
 check((html.match(/<article class="card">/g)||[]).length===n&&html.includes("Pure + Assisted")&&html.includes("Independent")&&html.includes("Assisted")&&html.includes("Wrong")&&html.includes("Cancelled")&&html.includes("Correct: <strong>Fixture Franc (TST)"),"Report missing original result format "+batch);
 check(batch===20?html.includes("Championship Summary →"):html.includes("Next Batch →"),"Report next-link wrong "+batch);
 }
}finally{rmSync(dir,{recursive:true,force:true});}
console.log("PASS: original four-category blobs byte-identical; frozen flags original; one currency input; six-row scoring; 10/5-card rendered reports; no country leaks");
