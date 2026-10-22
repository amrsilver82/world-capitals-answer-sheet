import fs from "node:fs";
import {execFileSync} from "node:child_process";
import {render} from "./render-edition2-b01.mjs";
const fail=x=>{throw Error("PUBLIC CHECKPOINT REFUSED: "+x)};
const git=(...args)=>execFileSync("git",args,{encoding:"utf8"}).trim();
const evt=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,"utf8"));
if(evt.ref!=="refs/heads/main"||evt.repository?.full_name!=="amrsilver82/world-capitals-answer-sheet")fail("Not an authorized main-branch publication");
const p=JSON.parse(fs.readFileSync("languages/publish/ed2-b01-payload.json","utf8"));
const head=git("rev-parse","HEAD"),parent=git("rev-parse","HEAD^");
if(!p||p.expected_public_head!==parent||p.private_scoring_commit!=="977d5226ba13cf85c70984d19c4087614db75a01"||p.edition!==2||p.batch!==1)fail("Wrong private/public checkpoint");
if(fs.existsSync("languages/reports/edition-2/batch01.html"))fail("Duplicate publication");
if(!Array.isArray(p.records)||p.records.length!==10||!Array.isArray(p.next_assets)||p.next_assets.length!==10)fail("Missing batch records");
const seen=new Set();
const rows=p.records.map((r,i)=>{
 if(!r||r.q!==i+1||!r.country||!r.capital||!r.correct_languages||!r.your||["country","capital","language"].some(k=>!r.your[k]||typeof r.your[k]!=="string"))fail("Incomplete scored record");
 if(!/^flags\/canonical\/[a-f0-9]{12}\.svg$/.test(r.asset)||!fs.existsSync(r.asset)||seen.has(r.asset))fail("Unsafe flag");
 seen.add(r.asset);
 return {...r,attempts:Object.fromEntries(["country","capital","language"].map(k=>[k,[r.your[k]]])),flag_result:"independent",capital_result:"independent",language_result:"independent"};
});
const nextseen=new Set();
const next={schema_version:1,engine:"languages_v1",edition:2,round_id:"world_flags_capitals_languages_edition_2",title:"World Flags + Capitals + Languages — Edition 2",batch:2,start_question:11,end_question:20,question_count:10,stage:"initial",stage_label:"Initial answers",version:"lang-ed2-b02-initial-20261022",validator_private:"languages/edition2-b02-validator.json",questions:p.next_assets.map((asset,i)=>{
 if(!/^flags\/canonical\/[a-f0-9]{12}\.svg$/.test(asset)||!fs.existsSync(asset)||seen.has(asset)||nextseen.has(asset))fail("Unsafe next flag");
 nextseen.add(asset);
 return {n:i+11,asset:"./"+asset,country_mode:"input",capital_mode:"input",language_mode:"input"};
})};
const score=Object.fromEntries(["flag","capital","language"].map(k=>[k,{denominator:10,pure:10,pure_plus_assisted:10,independent:10,assisted:0,wrong:0,cancelled:0}]));
const report={schema_version:1,round_id:"world_flags_capitals_languages_edition_2",edition:2,batch:1,questions:"1–10",status:"completed",date:"2026-10-22",records:rows,batch_score:score,cumulative:score,completed_questions:10,remaining_questions:185};
const latest={schema_version:1,engine:"languages_v1",edition:2,batch:2,stage:1,status:"initial_published",state_path:"languages/states/ed2-b02-initial-20261022.json",completed_batch:1,report_path:"languages/reports/edition-2/batch01.html",version:"lang-ed2-b02-initial-20261022"};
const files={
 "languages/reports/edition-2/batch01.html":render(rows),
 "languages/reports/edition-2/batch01.json":JSON.stringify(report,null,2)+"\n",
 "languages/states/ed2-b02-initial-20261022.json":JSON.stringify(next,null,2)+"\n",
 "languages/latest.json":JSON.stringify(latest,null,2)+"\n"
};
for(const [path,data] of Object.entries(files)){
 fs.mkdirSync(path.slice(0,path.lastIndexOf("/")),{recursive:true});
 fs.writeFileSync(path,data);
}
git("add","--",...Object.keys(files));
git("diff","--cached","--check");
const now=execFileSync("date",["+%d-%b-%Y %-I:%M %p"],{encoding:"utf8",env:{...process.env,TZ:"Africa/Cairo"}}).trim();
git("-c","user.name=world-capitals-public-gateway","-c","user.email=41898282+github-actions[bot]@users.noreply.github.com","commit","-m",now+" — Game: publish Edition 2 report and frozen Batch 2 (AI)");
git("push","origin","HEAD:main");
console.log("SUCCESS: completed batch report and next frozen batch committed "+git("rev-parse","HEAD"));
