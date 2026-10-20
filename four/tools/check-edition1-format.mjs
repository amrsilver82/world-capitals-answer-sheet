#!/usr/bin/env node
// Four-category Edition 1 release gate. The old 3-category files are NOT modified.
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const read=p=>readFileSync(p,'utf8'),root=process.cwd(),must=(x,msg)=>{if(!x)throw new Error(msg)},count=(s,t)=>s.split(t).length-1;
const page=read(join(root,'four-v1.html'));
for(const [id,label] of [['build','Build my reply'],['copy','Copy reply'],['clear','Clear all']])must(page.includes('id="'+id+'"')&&page.includes(label),'Missing '+label);
for(const key of ['Country','Capital','Language','Currency'])must(page.includes('"'+key+'"'),'Missing '+key+' input');
for(const val of ['40 answer fields','Country: ','Capital: ','Language: ','Currency: '])if(val!=='40 answer fields')must(page.includes(val),'Missing output schema '+val);
must(page.includes('(expectedCount*4)+" answer fields"'),'four answers per question');
must(page.includes('data.engine!=="four_v1"'),'incorrect frozen engine');
must(page.includes('expectedCount=data.batch===20?5:10'),'final five-question validation missing');
must(page.includes('four\\/states\\/'),'wrong URL state prefix');
must(page.includes('localStorage'),'draft persistence absent');
must(page.includes('.pic img{width:min(420px,100%)')&&page.includes('.ratioframe img{width:100%;height:100%;object-fit:fill'),'flag display layout regression');
const dir=join(root,'four/states');
const states=readdirSync(dir).filter(s=>/^ed1-b\d{2}-initial-20261020\.json$/.test(s));
must(states.length>0,'No frozen states');
for(const file of states){const d=JSON.parse(read(join(dir,file))),n=d.batch===20?5:10;
must(d.engine==='four_v1'&&d.edition===1&&d.question_count===n&&d.questions.length===n&&d.end_question-d.start_question===n-1,file+': wrong batch metadata');
d.questions.forEach((q,i)=>{must(q.n===d.start_question+i,file+': order drift');must(/^\.\/flags\/canonical\/[a-f0-9]{12}\.svg$/.test(q.asset),file+': incorrect canonical SVG');for(const k of ['country_mode','capital_mode','language_mode','currency_mode'])must(q[k]==='input',file+': missing '+k);for(const k of ['country','capital','language','currency','answer','correct_answer','iso','country_key','correct_currency'])must(!(k in q),file+': ANSWER LEAK '+k);});
}
const reviewHeaders=['Q','Your Country','Correct Country','Flag','Your Capital','Correct Capital','Capital','Your Language','Correct Language(s)','Language','Your Currency','Correct Currency (name + ISO)','Currency'];
const repDir=join(root,'four/reports/edition-1');
if(existsSync(repDir))for(const file of readdirSync(repDir).filter(x=>/^batch\d{2}\.html$/.test(x))){
const h=read(join(repDir,file)),n=Number(file.match(/batch(\d+)/)[1])===20?5:10;
must(count(h,'<article class="card">')===n,file+': wrong flag cards');
must(count(h,'<table class="scores-table">')===2,file+': must have 2 separate score tables');
must(h.includes(reviewHeaders.map(x=>'<th>'+x+'</th>').join('')),file+': 13-column review changed');
for(const score of ['Pure','Pure + Assisted','Independent','Assisted','Wrong','Cancelled'])must(h.includes('<th>'+score+'</th>'),file+': missing '+score);
must(!h.includes('<strong></strong>')&&!h.includes('<td></td>')&&!h.includes('undefined'),file+': empty answers');
must(!h.includes('>Israel<')&&!h.includes('Correct: <strong>Israel</strong>'),file+': forbidden public country display');
}

// APPROVED VISUAL SOURCE + PRODUCTION GENERATOR GATE — cannot improvise per chat.
import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
const approvedCSS=read(join(root,"four/templates/approved-report.css"));
const preview=read(join(root,"four/pilot/approved-results-layout.html"));
const previewCSS=preview.match(/<style>([\s\S]*?)<\/style>/)?.[1];
must(approvedCSS.includes(previewCSS)&&previewCSS?.includes(".pic img{width:min(420px,100%)"),"Preview and approved CSS must be the exact same design");
must(count(preview,'<article class="card">')===10&&count(preview,'<div class="pic"><img src="../../../flags/canonical/')===10,"Approval preview must contain ten ORIGINAL rendered canonical flags");
must(!preview.includes("fake-flag")&&!preview.includes("data:image/svg+xml;base64")&&!preview.includes("height:170px"),"Fake flags or wrong flag ratios forbidden");
must(count(preview,'<table class="scores-table">')===2,"Must have separate Batch and Cumulative score tables");
must(preview.includes(reviewHeaders.map(x=>'<th>'+x+'</th>').join('')),"Approval preview 13 columns mismatch");
must(preview.includes('<th>Countries</th>')&&preview.includes('<b>Country</b>')&&!preview.includes('Flags / Country')&&!preview.includes('<b>Flag / Country</b>'),"Country/Countries approved labels mandatory");
for(const field of ["Country","Capital","Language","Currency"])must(count(preview,'<b>'+field+'</b>')===10,"Every one of ten cards requires field "+field);
must(preview.includes('href="navigation-demo-next.html">Next Batch →'),"Next Batch button must ALWAYS be visible and clickable");
const demoNext=read(join(root,"four/pilot/navigation-demo-next.html"));
must(demoNext.includes("demonstration-only")&&demoNext.includes('href="approved-results-layout.html"'),"Clickable safe next-step demonstration missing");
const first=JSON.parse(read(join(root,"four/states/ed1-b01-initial-20261020.json")));
const pending=new Set(first.questions.map(x=>x.asset.replace("./","")));
const images=[...preview.matchAll(/<div class="pic"><img src="\.\.\/\.\.\/\.\.\/(flags\/canonical\/[a-f0-9]{12}\.svg)"/g)].map(x=>x[1]);
must(images.length===10&&images.every(x=>!pending.has(x)),"Approval preview must never reveal the ten frozen Batch 1 flags");
const renderer=read(join(root,"four/tools/render-report.mjs"));
for(const mustContain of ["four/templates/approved-report.css",'id="next"',"Next Batch →","Championship Summary →","four-v1.html?sha="])must(renderer.includes(mustContain),"Renderer missing permanent production feature "+mustContain);
const fixture=JSON.parse(read(join(root,"four/tests/format-fixture-not-real-scores.json")));
must(fixture.TEST_FIXTURE_UNSCORED===true&&fixture.records.length===10,"Clearly unscored demo fixture required");
const dir=mkdtempSync(join(tmpdir(),"four-report-"));
try{
 const out=join(dir,"rendered.html");
 execFileSync("node",["four/tools/render-report.mjs","four/tests/format-fixture-not-real-scores.json",out],{cwd:root,stdio:"pipe"});
 const html=read(out);
 must(count(html,'<article class="card">')===10&&count(html,'<table class="scores-table">')===2,"Generated real report structure drift");
 must(html.includes(reviewHeaders.map(x=>'<th>'+x+'</th>').join(''))&&html.includes('<th>Countries</th>'),"Generated country naming/13-column headers drift");
 must(html.includes('id="next" class="linkbutton primary"')&&html.includes("Next Batch →")&&html.includes("four-v1.html?sha="),"Production Next Batch SHA-pinned navigation missing");
 must(html.includes('<b>Currency</b>')&&html.includes("Demonstration unit (TST)"),"Production fourth-category output missing");
 must(!html.includes("fake-flag")&&!html.includes("height:170px"),"Generated layout contains fictional flag framing");
}finally{rmSync(dir,{recursive:true,force:true});}

console.log('PASS four_v1: four fields, Build/Copy/Clear, flag style, no-answer states, batch 10/final 5, 13 review columns and two 5-column scoring tables');
