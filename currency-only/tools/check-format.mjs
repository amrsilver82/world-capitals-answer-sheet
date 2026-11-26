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
check(page.includes('value="clue">Clue — request a hint')&&page.includes('value="don\\\'t know">Don\\\'t know — give up')&&page.includes('["__other__","clue","don\'t know"].includes(v.choice)'),"Clue / Don't know must work as visible options and be restorable");
check(page.includes('Only <strong>current</strong> currencies count')&&!page.includes('historically valid currencies also count'),"Historical currencies must be excluded in this mode");
check(page.includes('lines.push(q.n+". Currency: "')&&!page.includes("q.country+"),"Reply must contain only currency, no country");

const script=page.slice(page.lastIndexOf("<script>")+8,page.lastIndexOf("</script>"));
new Script(script,{filename:"currency-only/edition1.html.inline.js"});
const states=readdirSync("currency-only/states").filter(x=>/^ed1-b(?:0[1-9]|1[0-9]|20)-initial-20\d{6}\.json$/.test(x));
check(states.length>=1,"No official frozen batch present");
// Regression: official state URLs may have any valid 20YYMMDD release suffix,
// not just the initial 20261109 rollout. The strict batch and path prefix stay.
const officialFilename=/^currency-only\/states\/ed1-b(?:0[1-9]|1[0-9]|20)-initial-20\d{6}\.json$/;
for(const valid of ["currency-only/states/ed1-b08-initial-20261109.json","currency-only/states/ed1-b09-initial-20261116.json","currency-only/states/ed1-b20-initial-20270108.json"]){
 check(officialFilename.test(valid),"Official frozen batch URL wrongly rejected: "+valid);
}
for(const invalid of ["currency-only/states/ed1-b00-initial-20261116.json","currency-only/states/ed1-b21-initial-20261116.json","currency-only/states/../ed1-b09-initial-20261116.json","currency-only/states/ed1-b09-initial-20261116.json?tamper=yes","currency-only/states/ed1-b09-initial-20261116.txt"]){
 check(!officialFilename.test(invalid),"Unsafe batch URL accepted: "+invalid);
}
check(page.includes("-initial-20\\d{6}\\.json$"),"Official page still rejects newer pinned release dates");
check(states.includes("ed1-b09-initial-20261116.json"),"Newer Batch9 not covered by standard frozen-state CI audit");

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
// Permanent fail-closed country-flag confusion checks after the Q57 Indonesia/Monaco defect.
// The two approved source SVGs were fetched from the PINNED audited native-geometry
// hampusborgos/country-flags@c09927e63705529bbf59ca6684cd9b23225dddad.
// Never accept 4:3 normalization for this pair. The old Q57 asset path is now
// a byte-identical compatibility alias for the proper 3:2 native flag.
const approvedIndonesia="flags/canonical/dadcc9be41ad.svg";
const oldIndonesiaAlias="flags/canonical/3b7c8fcfd965.svg";
const approvedMonaco="flags/canonical/231ec9ba3c7b.svg";
check(gitBlob(read(approvedIndonesia))==="dadcc9be41adba9792c667146f3a247d4e4dfe6f","Approved native Indonesia SVG has been changed");
check(gitBlob(read(approvedMonaco))==="231ec9ba3c7be4c3d5fc8ba842aed53ece7f338c","Approved native Monaco SVG has been changed");
check(read(oldIndonesiaAlias)===read(approvedIndonesia),"Q57 4:3 Indonesia artwork has returned in its original live path");
check(read("flags/canonical/11fde67db930.svg")===read("flags/canonical/015a7442e386.svg"),"Legacy Honduras cyan flag has returned");
const requiredRatio=new Map([["id",1.5],["mc",1.25],["hn",2]]);
for(const stateFile of states){
 const d=JSON.parse(read("currency-only/states/"+stateFile));
 for(const q of d.questions){
  const assetPath=q.asset.slice(2),svg=read(assetPath);
  const code=svg.match(/\bid=["']flag-icons-([a-z]{2})["']/)?.[1];
  const expected=requiredRatio.get(code);
  if(expected!==undefined){
   const v=svg.match(/\bviewBox=["']\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/);
   check(v!==null&&Math.abs(Number(v[3])/Number(v[4])-expected)<0.00001,"Unfair normalized flag aspect ratio: "+stateFile+" Q"+q.n+" ("+code+")");
  }
  if(assetPath===oldIndonesiaAlias)check(svg===read(approvedIndonesia),"Presented Q57 is not exact audited native geometry");
 }
}

// Currency Only Batch7 mandatory native-country flag certification. Original native artwork
// sourced from pinned hampusborgos/country-flags@c09927e63705529bbf59ca6684cd9b23225dddad.
// Only inert ISO flag ID was added; image geometry, palette, symbol and paths unchanged.
const batch7Native= [
 [
  "flags/canonical/1eeda9f6de99.svg",
  "1eeda9f6de99833f211893f5ab0dd6114b279d7a",
  "md",
  2
 ],
 [
  "flags/canonical/0cc87d4185f8.svg",
  "0cc87d4185f89dd1c2d611fe8f2829a6f7ff471e",
  "st",
  2
 ],
 [
  "flags/canonical/b3a8deae1f4b.svg",
  "b3a8deae1f4b65408c62431f9a2fc3b0d369a330",
  "tn",
  1.5
 ],
 [
  "flags/canonical/bd532cc95767.svg",
  "bd532cc95767d7ac0ef4a4fb0a420f34781b68e1",
  "et",
  2
 ],
 [
  "flags/canonical/54fe356449b8.svg",
  "54fe356449b8d83278540a03b22f80ab2cb4a89b",
  "cd",
  1.3333333333333333
 ],
 [
  "flags/canonical/9083df9c4801.svg",
  "9083df9c48019b097c797df7d96f6625f25d2250",
  "mr",
  1.5
 ],
 [
  "flags/canonical/63294280c0bd.svg",
  "63294280c0bd9da044a7b12730cf5727a9cb8a98",
  "pk",
  1.5
 ],
 [
  "flags/canonical/47a0be9df6fd.svg",
  "47a0be9df6fdd8f4ee251fa54a6ed890c01bb85b",
  "jp",
  1.5
 ],
 [
  "flags/canonical/65c4880886e0.svg",
  "65c4880886e04db6a5506deb92c0e18ca43da148",
  "bh",
  1.6666666666666667
 ],
 [
  "flags/canonical/81e8d465a55d.svg",
  "81e8d465a55dd4b32b21938c5330d269b5c60227",
  "kw",
  2
 ]
];
const batch7Actual=JSON.parse(read("currency-only/states/ed1-b07-initial-20261109.json")).questions;
check(batch7Actual.length===10,"Batch7 flag audit requires ten exact assets");
for(let i=0;i<batch7Native.length;i++){
 const [path,sha,code,ratio]=batch7Native[i],q=batch7Actual[i];
 check(q.n===61+i&&q.asset==="./"+path,"Batch7 quiz flag order or vetted asset changed");
 const svg=read(path);
 check(gitBlob(svg)===sha,"Batch7 vetted SVG bytes changed: "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch7 flag country identity incorrect: "+path);
 const v=svg.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch7 native proportions invalid: "+path);
}

// Mandatory exact native flag release certification for Batch8 (Q71–Q80).
// Each audited vector from pinned hampusborgos/country-flags@c09927e63705529bbf59ca6684cd9b23225dddad,
// unchanged except harmless id="flag-icons-XX" identity metadata.
const batch8Native=[
 [
  "flags/canonical/6a288339017b.svg",
  "6a288339017b772705a90ccd5d0b76ce89fa3604",
  "gq",
  1.5
 ],
 [
  "flags/canonical/953646f933ed.svg",
  "953646f933edb473e2e65d352fd237b242c87d13",
  "bd",
  1.6666666666666667
 ],
 [
  "flags/canonical/0c3c42fc7f4d.svg",
  "0c3c42fc7f4ddc7a318c262b601fb599e5a39a78",
  "in",
  1.5
 ],
 [
  "flags/canonical/277033a3c63a.svg",
  "277033a3c63a7fab8a2138d618d02d76f5e57005",
  "th",
  1.5
 ],
 [
  "flags/canonical/aacef25aa0e4.svg",
  "aacef25aa0e4f7a764e77476ee7af129d7a0f3e2",
  "ge",
  1.5
 ],
 [
  "flags/canonical/250aa5fb8e23.svg",
  "250aa5fb8e235941bb4884a10a218cfd78e1d060",
  "lu",
  1.6666666666666667
 ],
 [
  "flags/canonical/eaa2257469aa.svg",
  "eaa2257469aac6de1774e8908c8ac84574f90d8b",
  "rs",
  1.4999900811363052
 ],
 [
  "flags/canonical/982d20df8596.svg",
  "982d20df8596dc5913161737a082543ee6f198b6",
  "lr",
  1.9
 ],
 [
  "flags/canonical/f7ade74c4493.svg",
  "f7ade74c4493e896dc0e3f6f4138f2a84637b657",
  "tl",
  2
 ],
 [
  "flags/canonical/c46d2027719a.svg",
  "c46d2027719af3fe21fd3a21a72d51d92dd5eae9",
  "ba",
  2
 ]
];
const batch8State=JSON.parse(read("currency-only/states/ed1-b08-initial-20261109.json")).questions;
check(batch8State.length===10,"Batch8 must display exactly 10 certified flags");
for(let i=0;i<batch8Native.length;i++){
 const [path,sha,code,ratio]=batch8Native[i],q=batch8State[i],svg=read(path);
 check(q.n===71+i&&q.asset==="./"+path,"Batch8 original country/flag order or source asset changed");
 check(gitBlob(svg)===sha,"Batch8 flag source content has changed: "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch8 flag country code mismatch: "+path);
 const box=svg.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(box&&Math.abs(Number(box[3])/Number(box[4])-ratio)<0.00001,"Batch8 native geometry wrong: "+path);
}

// Batch9 source-pinned native flag audit. Artifact identity and exact native proportions
// must match the source-selected flag-only Q81–Q90 before publication.
const batch9Native=[["flags/canonical/345a2acbca3b.svg","345a2acbca3b8d085ae5a149a95c31070412ef76","gm",1.5],["flags/canonical/668eaa13f61f.svg","668eaa13f61f6b08e35d3823c5ae1d48d2ddec22","tz",1.5],["flags/canonical/48e220d5794d.svg","48e220d5794d4aa73401d5d8e865c74f1e731cfd","fj",2],["flags/canonical/f7899ce1231f.svg","f7899ce1231fd38ca3c447c12e8a7aacdb5eac7e","td",1.5],["flags/canonical/8891451493b8.svg","8891451493b8e44b6929ee45fe96dcef605f4bf3","la",1.5],["flags/canonical/439f52520f47.svg","439f52520f47bd0ff1c0bac5838a6425efa8d088","mz",1.5],["flags/canonical/d88e6b10e376.svg","d88e6b10e376b91f23b7a6052f031e921294f4de","cu",2],["flags/canonical/d78481062af5.svg","d78481062af54ee4a8c56e2558aa789f92ed854b","de",1.6666666666666667],["flags/canonical/1ac7f0c41bae.svg","1ac7f0c41bae27de3a4e1556e1b466d667ee3dca","bt",1.5],["flags/canonical/8bae73e30ebe.svg","8bae73e30ebea33c31b64336076e6baa90fe600a","tg",1.618]];
const batch9Frozen=JSON.parse(read("currency-only/states/ed1-b09-initial-20261116.json"));
check(batch9Frozen.batch===9&&batch9Frozen.question_count===10&&batch9Frozen.questions.length===10&&batch9Frozen.stage==="initial","Batch9 state schema/metadata");
for(let i=0;i<10;i++){
 const [path,sha,code,ratio]=batch9Native[i],q=batch9Frozen.questions[i],svg=read(path);
 check(q.n===81+i&&q.asset==="./"+path&&Object.keys(q).sort().join(",")==="asset,n","Batch9 asset order/spoiler");
 check(gitBlob(svg)===sha,"Batch9 native source SVG changed "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch9 country flag source identity mismatch");
 const v=svg.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch9 selected flag native ratio mismatch");
}

// Mobile-safe Batch9: the answer-free frozen questions are embedded in a unique
// query-free document; this avoids stale / stripped in-app-browser URL parameters
// and third-party raw.githubusercontent.com fetch failures.
const batch09Direct=read("currency-only/batch09.html");
const embeddedMatch=batch09Direct.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!embeddedMatch,"Mobile-safe Batch9 lacks embedded frozen state");
const embedded=JSON.parse(embeddedMatch[1]),officialBatch9=JSON.parse(read("currency-only/states/ed1-b09-initial-20261116.json"));
check(JSON.stringify(embedded)===JSON.stringify(officialBatch9),"Mobile-safe Batch9 must exactly match original frozen Q81–Q90 JSON");
check(embedded.batch===9&&embedded.questions.length===10&&embedded.questions.every((q,i)=>q.n===81+i&&Object.keys(q).sort().join(",")==="asset,n"),"Mobile-safe Batch9 sequence or spoilers invalid");
check(batch09Direct.includes('const statePath="currency-only/states/ed1-b09-initial-20261116.json"')&&batch09Direct.includes('JSON.parse(document.getElementById("officialBatchState").textContent)'),"Mobile-safe page does not load embedded state");
check(!batch09Direct.includes("Invalid official pinned batch URL.")&&!batch09Direct.includes("fetch(url")&&!batch09Direct.includes('sha=params.get("sha")'),"Mobile-safe Batch9 still depends on URL params or remote fetch");
check(batch09Direct.includes('id="quizGrid"')&&batch09Direct.includes('id="build"')&&batch09Direct.includes('id="copy"')&&batch09Direct.includes('id="clear"'),"Mobile-safe Batch9 interaction controls missing");
check(read("currency-only/reports/edition-1/batch08.html").includes('href="../../../currency-only/batch09.html"'),"Batch8 next-link must point to working query-free Batch9");

// Batch10 mobile-safe direct HTML + original country-native flag art QA.
// The answer-free embedded JSON must exactly match the immutable frozen state.
const b10Data=[["flags/canonical/9c27e32de24a.svg","9c27e32de24a2b5c3b930b1e399174d0cfb6a812","ru",1.5],["flags/canonical/13cdfff1a7a0.svg","13cdfff1a7a051d73ed10d07e18e0b0373cd55ad","bo",1.4666646509237142],["flags/canonical/b65d70c32ac5.svg","b65d70c32ac5e1a00885f95f7a7a577e1158579f","cg",1.5],["flags/canonical/1143c15d91c2.svg","1143c15d91c200bf0b06b922a2deb554c14617de","sc",2],["flags/canonical/7b9b8a107a7d.svg","7b9b8a107a7d8f42f866cf6c57d31bf29cc3143c","ag",1.5],["flags/canonical/48f9fa55c8ba.svg","48f9fa55c8bad13d1bdadf4f23a3c53b5b9f001d","jo",2],["flags/canonical/918228add1ef.svg","918228add1ef8fc56d7a21ca5ce16f34fa73bbb1","cy",1.5],["flags/canonical/bd110983913b.svg","bd110983913bd31e4236125a0d80a943ac4a55b8","lb",1.5],["flags/canonical/a99ab47b06cb.svg","a99ab47b06cb9ddef2efcde57c129bc6043f125a","me",2],["flags/canonical/6b2c6cc3a467.svg","6b2c6cc3a4675a8f408a1e0a86beab0ccaac448d","bi",1.6666666666666667]];
const b10Frozen=JSON.parse(read("currency-only/states/ed1-b10-initial-20261116.json"));
check(b10Frozen.batch===10&&b10Frozen.start_question===91&&b10Frozen.end_question===100&&b10Frozen.questions.length===10,"Batch10 frozen Q range");
const b10Html=read("currency-only/batch10.html");
const b10Match=b10Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b10Match,"Batch10 direct page missing embedded questions");
const b10Inline=JSON.parse(b10Match[1]);
check(JSON.stringify(b10Frozen)===JSON.stringify(b10Inline),"Batch10 direct page must exactly equal frozen original Q91–Q100 state");
check(b10Inline.questions.every((q,i)=>q.n===91+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch10 source order or spoilers");
check(b10Html.includes('const statePath="currency-only/states/ed1-b10-initial-20261116.json"')&&!b10Html.includes('fetch(url')&&!b10Html.includes("Invalid official pinned batch URL.")&&!b10Html.includes('sha=params.get("sha")'),"Batch10 mobile page must not need URL parameters/network JSON");
for(let i=0;i<b10Data.length;i++){
 const [path,sha,code,ratio]=b10Data[i],q=b10Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch10 source art changed or out of order: "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch10 country flag mismatch: "+path);
 const view=svg.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(view&&Math.abs(Number(view[3])/Number(view[4])-ratio)<0.00001,"Batch10 flag native geometry mismatch: "+path);
}
check(read("currency-only/reports/edition-1/batch09.html").includes('href="../../../currency-only/batch10.html"'),"Batch9 review next-link must be direct mobile page");
check((read("currency-only/reports/edition-1/batch09.html").match(/<article class="card">/g)||[]).length===10,"Batch9 ten card review");

// Source-art audited mobile-direct Batch11: original source order Q101–Q110, no answers.
const b11Data=[["flags/canonical/a61df2468442.svg","a61df24684424f9b4a433f8e7b1463b41054f430","cn",1.5],["flags/canonical/d437e93137a9.svg","d437e93137a9ef4989aae3eb058eea7bba708edf","cz",1.5],["flags/canonical/6b3f0a4fbed9.svg","6b3f0a4fbed93016cac8bb10eb710c27de77ee9c","is",1.3888888888888888],["flags/canonical/e4496f8a1519.svg","e4496f8a15195278407b1e889ff0027cbb9987d7","il",1.375],["flags/canonical/18f5e56a74fe.svg","18f5e56a74feae3dbf7cbd40e07a64a43ceead93","jm",2],["flags/canonical/1c8c684a21de.svg","1c8c684a21dea69e4ba3b9932c453c976fc3926a","my",2],["flags/canonical/be54ef21dcf8.svg","be54ef21dcf8feabeb6b65cc7f3225f495967512","er",2],["flags/canonical/d76cef89a97c.svg","d76cef89a97c2a701d849d2c37b0ae4fe05c5e94","vc",1.5],["flags/canonical/20373dc92aaf.svg","20373dc92aafdaca46a75fbb3cf1974c907ee9db","ki",2],["flags/canonical/64b056639a1c.svg","64b056639a1c5b841299cba87a062316169a944d","mt",1.5]];
const b11Frozen=JSON.parse(read("currency-only/states/ed1-b11-initial-20261116.json"));
check(b11Frozen.batch===11&&b11Frozen.start_question===101&&b11Frozen.end_question===110&&b11Frozen.questions.length===10,"Batch11 frozen range");
const b11Html=read("currency-only/batch11.html");
const b11Match=b11Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b11Match,"Batch11 direct HTML must embed same frozen state");
const b11Inline=JSON.parse(b11Match[1]);
check(JSON.stringify(b11Frozen)===JSON.stringify(b11Inline),"Batch11 direct HTML and official state differ");
check(b11Inline.questions.every((q,i)=>q.n===101+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch11 spoiler or sequence error");
check(b11Html.includes('const statePath="currency-only/states/ed1-b11-initial-20261116.json"')&&!b11Html.includes('fetch(url')&&!b11Html.includes("Invalid official pinned batch URL.")&&!b11Html.includes('sha=params.get("sha")'),"Batch11 iOS page incorrectly needs query params or remote fetch");
for(let i=0;i<b11Data.length;i++){
 const [path,sha,code,ratio]=b11Data[i],q=b11Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch11 approved flag source differs "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch11 source country ID mismatch "+path);
 const v=svg.match(/viewBox="\s*([\d.-]+)\s+([\d.-]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch11 native flag ratio mismatch "+path);
}
check(read("currency-only/reports/edition-1/batch10.html").includes('href="../../../currency-only/batch11.html"'),"Batch10 direct next button missing");
check((read("currency-only/reports/edition-1/batch10.html").match(/<article class="card">/g)||[]).length===10,"Batch10 report ten cards missing");

// Batch12 ten source-pinned native flags, original order, and mobile-safe answer-free source.
const b12Data=[["flags/canonical/676fbbfdd013.svg","676fbbfdd0131a99166387a7069ebbef53807bfc","hu",2],["flags/canonical/683e5e0526f9.svg","683e5e0526f9728c3b1914510a080fc379781fed","lc",2],["flags/canonical/808dd4442f9b.svg","808dd4442f9be60fc9daf6fb539bbd593cbf18ff","nl",1.5],["flags/canonical/ff75eebc62ca.svg","ff75eebc62cae14b41d40420da87ff4ac22fd9fe","to",2],["flags/canonical/a1c3ee4830aa.svg","a1c3ee4830aa427f8aae4f5b532836aa749729d5","ht",1.6666666666666667],["flags/canonical/f6961fe07191.svg","f6961fe07191b8772ce3ee0db45b3dba78492c83","sb",2],["flags/canonical/e9d810b24299.svg","e9d810b2429938ff175bfcbab74b436103ec7e0f","us",1.9],["flags/canonical/3fa44bd09d3a.svg","3fa44bd09d3aa8b6d315d96836c0f5d7b8c983f9","gy",1.6666666666666667],["flags/canonical/6403dcfb034c.svg","6403dcfb034ce8417a44f3a0859665f32577ed67","cr",1.6666666666666667],["flags/canonical/b0de0a66401f.svg","b0de0a66401fe81f76a73ae7a285a6ab2437e5ab","gw",2]];
const b12Frozen=JSON.parse(read("currency-only/states/ed1-b12-initial-20261116.json"));
check(b12Frozen.batch===12&&b12Frozen.start_question===111&&b12Frozen.end_question===120&&b12Frozen.questions.length===10,"Batch12 question range");
const b12Html=read("currency-only/batch12.html");
const b12Match=b12Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b12Match,"Batch12 self-contained page missing embedded frozen JSON");
const b12Inline=JSON.parse(b12Match[1]);
check(JSON.stringify(b12Frozen)===JSON.stringify(b12Inline),"Batch12 direct page must equal frozen state");
check(b12Inline.questions.every((q,i)=>q.n===111+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch12 spoiler or order");
check(b12Html.includes('const statePath="currency-only/states/ed1-b12-initial-20261116.json"')&&!b12Html.includes('fetch(url')&&!b12Html.includes("Invalid official pinned batch URL.")&&!b12Html.includes('sha=params.get("sha")'),"Batch12 mobile page still URL dependent");
for(let i=0;i<b12Data.length;i++){
 const [path,sha,code,ratio]=b12Data[i],q=b12Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch12 approved flag source different "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch12 source country identity mismatch "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch12 native flag ratio mismatch "+path);
}
check(read("currency-only/reports/edition-1/batch11.html").includes('href="../../../currency-only/batch12.html"'),"Batch11 review direct next link");
check((read("currency-only/reports/edition-1/batch11.html").match(/<article class="card">/g)||[]).length===10,"Batch11 report complete");

// Batch13 Q121–Q130 ten pinned source-native flags, standalone answer-free frozen quiz.
const b13Data=[["flags/canonical/db89a3505bc1.svg","db89a3505bc1faf0a7a9aa270531c83279d88dca","bb",1.5],["flags/canonical/e2b8e89aa447.svg","e2b8e89aa4473f27d37efeae39677bca19b91e77","pa",1.5],["flags/canonical/30e78c116f91.svg","30e78c116f91f38b7c5198d2b7e7ab7acdb18a2f","sy",1.5],["flags/canonical/cb83d9c69163.svg","cb83d9c69163c167bdf30fe096ddecfe1d883668","ke",1.5],["flags/canonical/5ed4f898912f.svg","5ed4f898912f4a2078e80372f611c327635627ff","dm",2],["flags/canonical/9513db2bdb77.svg","9513db2bdb776e18f473fe69c3566ccce88ef827","az",2],["flags/canonical/e11b225a2713.svg","e11b225a27139193671345f1537a2e841d4d854a","cm",1.5],["flags/canonical/3b0b4a5a4f50.svg","3b0b4a5a4f50cf3f416a901c57ea1156e5a40d4a","fr",1.5],["flags/canonical/fa554bf93b48.svg","fa554bf93b48f44d801c1265a6a8dfe7c883f605","gh",1.5],["flags/canonical/31975f095ff2.svg","31975f095ff2902b63c5da540934f893c5642ed3","kn",1.5]];
const b13Frozen=JSON.parse(read("currency-only/states/ed1-b13-initial-20261119.json"));
check(b13Frozen.batch===13&&b13Frozen.start_question===121&&b13Frozen.end_question===130&&b13Frozen.questions.length===10,"Batch13 frozen Q range");
const b13Html=read("currency-only/batch13.html");
const b13Match=b13Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b13Match,"Batch13 direct page must embed frozen state");
const b13Inline=JSON.parse(b13Match[1]);
check(JSON.stringify(b13Frozen)===JSON.stringify(b13Inline),"Batch13 direct page differs from frozen source");
check(b13Inline.questions.every((q,i)=>q.n===121+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch13 spoiler or question reorder");
check(b13Html.includes('const statePath="currency-only/states/ed1-b13-initial-20261119.json"')&&!b13Html.includes('fetch(url')&&!b13Html.includes("Invalid official pinned batch URL.")&&!b13Html.includes('sha=params.get("sha")'),"Batch13 requires URL parameters, remote fetch or unpinned state");
for(let i=0;i<b13Data.length;i++){
 const [path,sha,code,ratio]=b13Data[i],q=b13Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch13 source flag mismatched "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch13 original country identity mismatched "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch13 native ratio mismatch "+path);
}
check(read("currency-only/reports/edition-1/batch12.html").includes('href="../../../currency-only/batch13.html"'),"Batch12 review next direct link missing");
check((read("currency-only/reports/edition-1/batch12.html").match(/<article class="card">/g)||[]).length===10,"Batch12 report all ten cards");

// Batch14 pinned-native ten flags with exact original order and spoiler-free mobile quiz.
const b14Data=[["flags/canonical/c6b14564860b.svg","c6b14564860b646337b4bd641c25bf74c28f0733","sv",1.7724867724867726],["flags/canonical/e1e6ddb159fd.svg","e1e6ddb159fdbc9bd8238e7b67e551b1d785200e","gd",1.6666666666666667],["flags/canonical/85ad0a1e853e.svg","85ad0a1e853eb6da7e5edab1f29219be4d987fec","ee",1.5714285714285714],["flags/canonical/d5d390cf8334.svg","d5d390cf8334263739d2ad9e0ff726084eeb3895","mh",1.9],["flags/canonical/f8956025563f.svg","f8956025563fb4e08a73122c1b17f5cc5da4ac3b","lk",2],["flags/canonical/68d0cf3d0cb4.svg","68d0cf3d0cb45cf484ffa1747e597c5113503e5a","uy",1.5],["flags/canonical/d59f538bbd60.svg","d59f538bbd607089248a6a236d3cc36a575dfde8","va",1],["flags/canonical/5059089b7bd5.svg","5059089b7bd5ecda28b24537661c2b72f138fa4b","dz",1.5],["flags/canonical/be6c69df3f38.svg","be6c69df3f388f0ef8cc8a3ea0d2cf360c4a87c4","mk",2],["flags/canonical/f4ec87c09010.svg","f4ec87c0901076a58132553825ab68c873908e05","tj",2]];
const b14Frozen=JSON.parse(read("currency-only/states/ed1-b14-initial-20261124.json"));
check(b14Frozen.batch===14&&b14Frozen.start_question===131&&b14Frozen.end_question===140&&b14Frozen.questions.length===10,"Batch14 range");
const b14Html=read("currency-only/batch14.html");
const b14Match=b14Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b14Match,"Batch14 HTML must embed frozen state");
const b14Inline=JSON.parse(b14Match[1]);
check(JSON.stringify(b14Frozen)===JSON.stringify(b14Inline),"Batch14 frozen direct page mismatch");
check(b14Inline.questions.every((q,i)=>q.n===131+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch14 reordered or spoiler data");
check(b14Html.includes('const statePath="currency-only/states/ed1-b14-initial-20261124.json"')&&!b14Html.includes('fetch(url')&&!b14Html.includes("Invalid official pinned batch URL.")&&!b14Html.includes('sha=params.get("sha")'),"Batch14 direct page needs parameters");
for(let i=0;i<b14Data.length;i++){
 const [path,sha,code,ratio]=b14Data[i],q=b14Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch14 source file SHA "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch14 source identity "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch14 source geometry "+path);
}
check((read("currency-only/reports/edition-1/batch13.html").match(/<article class="card">/g)||[]).length===10,"Batch13 report cards");
check(read("currency-only/reports/edition-1/batch13.html").includes('href="../../../currency-only/batch14.html"'),"Batch13 next button");

// Batch15 pinned native source flag proportions, identity, immutable direct quiz.
const b15Data=[["flags/canonical/80060ca58bb7.svg","80060ca58bb70ddcf72285894122948d0f93bd81","bn",2],["flags/canonical/95fb4b040fa4.svg","95fb4b040fa4c8b6a7d73498f9a54a284ebf7da8","br",1.4285714285714286],["flags/canonical/640237947144.svg","640237947144bb275420068be112bb73557b1746","mu",1.5],["flags/canonical/301b553fd1b1.svg","301b553fd1b1793328df45bcc85c257b14f941d6","sz",1.5],["flags/canonical/5f6aae5677c1.svg","5f6aae5677c1f5bd1d8aa3221e5b99d266dee899","be",1.1538461538461537],["flags/canonical/e152ca3b7caf.svg","e152ca3b7caf0ddc0f74ffe2d684b4017c2a4dff","ie",2],["flags/canonical/614e54e95f3a.svg","614e54e95f3ac6017e40558f227182e4bf0c3b2e","ly",2],["flags/canonical/42567b97e5fd.svg","42567b97e5fd3dcbfd29f78349ad92c22b287760","es",1.5],["flags/canonical/c0236c6a9b1a.svg","c0236c6a9b1adf5608de497e04f20f891e8cb500","pl",1.6],["flags/canonical/a48c8e88a1a1.svg","a48c8e88a1a1d1a2d8c14af7cf061704b3d820d8","ng",2]];
const b15Frozen=JSON.parse(read("currency-only/states/ed1-b15-initial-20261124.json"));
check(b15Frozen.batch===15&&b15Frozen.start_question===141&&b15Frozen.end_question===150&&b15Frozen.questions.length===10,"Batch15 range");
const b15Html=read("currency-only/batch15.html");
const b15Match=b15Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b15Match,"Batch15 embedded state");
const b15Inline=JSON.parse(b15Match[1]);
check(JSON.stringify(b15Frozen)===JSON.stringify(b15Inline),"Batch15 direct page state");
check(b15Inline.questions.every((q,i)=>q.n===141+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch15 order and no answers");
check(b15Html.includes('const statePath="currency-only/states/ed1-b15-initial-20261124.json"')&&!b15Html.includes('fetch(url')&&!b15Html.includes("Invalid official pinned batch URL."),"Batch15 direct URL");
for(let i=0;i<b15Data.length;i++){
 const [path,sha,code,ratio]=b15Data[i],q=b15Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch15 source SHA "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch15 source identity "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch15 geometry "+path);
}
check((read("currency-only/reports/edition-1/batch14.html").match(/<article class="card">/g)||[]).length===10,"Batch14 report cards");
check(read("currency-only/reports/edition-1/batch14.html").includes('href="../../../currency-only/batch15.html"'),"Batch14 next button");

// Batch16 pinned native flags and immutable direct quiz.
const b16Data=[["flags/canonical/6e665bbf2e07.svg","6e665bbf2e07867b61fb6344f36b57d6c663f22c","gn",1.5],["flags/canonical/f8463fe03de3.svg","f8463fe03de33bd422b0b70d2befbc49d2b896d8","cl",1.5],["flags/canonical/d85131d9e7d5.svg","d85131d9e7d57103e50a73db429cd04104d6b269","gt",1.6],["flags/canonical/dbd39d07c88a.svg","dbd39d07c88a365c51ba9c7c3a51bef729ba76be","li",1.6666666666666667],["flags/canonical/2f4c37cfbeb1.svg","2f4c37cfbeb16a84dbcd78141658997a01346afd","do",1.5],["flags/canonical/dd52af16a46f.svg","dd52af16a46f0404aefc346e52a56a233a06e066","at",1.5],["flags/canonical/78db4a9a319c.svg","78db4a9a319c9efddc47c8165948fd865564f566","tm",1.5],["flags/canonical/0955e18724a4.svg","0955e18724a4658f836407cb64b7283bf253348d","fm",1.9],["flags/canonical/2b3b119d0f97.svg","2b3b119d0f9767a3c38a548b40ccca434cf9082b","rw",1.5],["flags/canonical/56a84df67d9f.svg","56a84df67d9fe18bca5f19769968f4466b15ab85","fi",1.6363636363636365]];
const b16Frozen=JSON.parse(read("currency-only/states/ed1-b16-initial-20261124.json"));
check(b16Frozen.batch===16&&b16Frozen.start_question===151&&b16Frozen.end_question===160&&b16Frozen.questions.length===10,"Batch16 range");
const b16Html=read("currency-only/batch16.html");
const b16Match=b16Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b16Match,"Batch16 embedded state");
const b16Inline=JSON.parse(b16Match[1]);
check(JSON.stringify(b16Frozen)===JSON.stringify(b16Inline),"Batch16 direct page state");
check(b16Inline.questions.every((q,i)=>q.n===151+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch16 order and no answers");
check(b16Html.includes('const statePath="currency-only/states/ed1-b16-initial-20261124.json"')&&!b16Html.includes('fetch(url')&&!b16Html.includes("Invalid official pinned batch URL."),"Batch16 direct URL");
for(let i=0;i<b16Data.length;i++){
 const [path,sha,code,ratio]=b16Data[i],q=b16Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch16 source SHA "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch16 source identity "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch16 geometry "+path);
}
check((read("currency-only/reports/edition-1/batch15.html").match(/<article class="card">/g)||[]).length===10,"Batch15 report cards");
check(read("currency-only/reports/edition-1/batch15.html").includes('href="../../../currency-only/batch16.html"'),"Batch15 next button");


 // Batch17 pinned native flags and immutable direct quiz.
const b17Data=[["flags/canonical/b7ace144b293.svg","b7ace144b293545b86e850738e5209a503650072","ro",1.5],["flags/canonical/b3445d3d8fb8.svg","b3445d3d8fb8d99c81d5c13e04d8ad7d14e0e837","mw",1.5],["flags/canonical/806747b8b097.svg","806747b8b09745a546304e7c285442c74108eaba","sd",2],["flags/canonical/10268f63aa69.svg","10268f63aa69ed7093ebd2d32d2c4d75105b5aa7","so",1.5],["flags/canonical/0aaa9803d00a.svg","0aaa9803d00a07c52480ce7a8eab96b0d75e32c9","gr",1.5],["flags/canonical/91dabca3b12a.svg","91dabca3b12ae60edde3601ea388dfe5efc17092","ga",1.3333333333333333],["flags/canonical/fe06e48b310e.svg","fe06e48b310ec7819e75e7c56d45e8375637b498","kz",2],["flags/canonical/1ffa9cd381bd.svg","1ffa9cd381bd691effdf0c2f84027943a5ecbb0d","zm",1.5],["flags/canonical/6a918d76bcea.svg","6a918d76bceaea2075193ac740c7efb0c402c844","sm",1.3333333333333333],["flags/canonical/1b664b572ee5.svg","1b664b572ee53919506856ec89fb8d5c099a0196","by",2]];
const b17Frozen=JSON.parse(read("currency-only/states/ed1-b17-initial-20261126.json"));
check(b17Frozen.batch===17&&b17Frozen.start_question===161&&b17Frozen.end_question===170&&b17Frozen.questions.length===10,"Batch17 range");
const b17Html=read("currency-only/batch17.html");
const b17Match=b17Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b17Match,"Batch17 embedded state");
const b17Inline=JSON.parse(b17Match[1]);
check(JSON.stringify(b17Frozen)===JSON.stringify(b17Inline),"Batch17 direct page state");
check(b17Inline.questions.every((q,i)=>q.n===161+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch17 order and no answers");
check(b17Html.includes('const statePath="currency-only/states/ed1-b17-initial-20261126.json"')&&!b17Html.includes('fetch(url')&&!b17Html.includes("Invalid official pinned batch URL."),"Batch17 direct URL");
for(let i=0;i<b17Data.length;i++){
 const [path,sha,code,ratio]=b17Data[i],q=b17Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch17 source SHA "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch17 source identity "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch17 geometry "+path);
}
check((read("currency-only/reports/edition-1/batch16.html").match(/<article class="card">/g)||[]).length===10,"Batch16 report cards");
check(read("currency-only/reports/edition-1/batch16.html").includes('href="../../../currency-only/batch17.html"'),"Batch16 next button");


 // Batch18 pinned native flags and immutable direct quiz.
const b18Data=[["flags/canonical/68fc6a8ffa13.svg","68fc6a8ffa13cf90f26690487ee844ffac717d36","mv",1.5],["flags/canonical/9b63c0a494ce.svg","9b63c0a494ce767d26d4b6ad1bef43a812635086","zw",2],["flags/canonical/fd6d7865d417.svg","fd6d7865d4174dac65c787f6a26923ce4402807c","tr",1.5],["flags/canonical/98419c86a93c.svg","98419c86a93c98585c8ba372ac96b0e056970431","ss",2],["flags/canonical/2df04a720ebc.svg","2df04a720ebc2689efde1cfc24e71d52b7f05a7d","lt",1.6666666666666667],["flags/canonical/ce2513ed9b9e.svg","ce2513ed9b9e2ab0620dfd761d3143669731d085","ir",1.75],["flags/canonical/5859339fb06a.svg","5859339fb06a5e78a2a60ec18f517723ccc503ed","iq",1.5],["flags/canonical/712960f498fa.svg","712960f498fae8fe79516e57004a847e0190d4bb","km",1.6666666666666667],["flags/canonical/4cfa0ccae0cc.svg","4cfa0ccae0ccc0ec3c42f1d6e6cf1aa790c49667","ao",1.5],["flags/canonical/bab95f2ae6e9.svg","bab95f2ae6e95d7f3e5ca5cb50f528a8c9cf2a65","np",0.8203356027783509]];
const b18Frozen=JSON.parse(read("currency-only/states/ed1-b18-initial-20261126.json"));
check(b18Frozen.batch===18&&b18Frozen.start_question===171&&b18Frozen.end_question===180&&b18Frozen.questions.length===10,"Batch18 range");
const b18Html=read("currency-only/batch18.html");
const b18Match=b18Html.match(/<script id="officialBatchState" type="application\/json">([\s\S]*?)<\/script>/);
check(!!b18Match,"Batch18 embedded state");
const b18Inline=JSON.parse(b18Match[1]);
check(JSON.stringify(b18Frozen)===JSON.stringify(b18Inline),"Batch18 direct page state");
check(b18Inline.questions.every((q,i)=>q.n===171+i&&Object.keys(q).sort().join(",")==="asset,n"),"Batch18 order and no answers");
check(b18Html.includes('const statePath="currency-only/states/ed1-b18-initial-20261126.json"')&&!b18Html.includes('fetch(url')&&!b18Html.includes("Invalid official pinned batch URL."),"Batch18 direct URL");
for(let i=0;i<b18Data.length;i++){
 const [path,sha,code,ratio]=b18Data[i],q=b18Inline.questions[i],svg=read(path);
 check(q.asset==="./"+path&&gitBlob(svg)===sha,"Batch18 source SHA "+path);
 check(svg.includes('id="flag-icons-'+code+'"'),"Batch18 source identity "+path);
 const v=svg.match(/viewBox="\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*"/);
 check(v&&Math.abs(Number(v[3])/Number(v[4])-ratio)<0.00001,"Batch18 geometry "+path);
}
check((read("currency-only/reports/edition-1/batch17.html").match(/<article class="card">/g)||[]).length===10,"Batch17 report cards");
check(read("currency-only/reports/edition-1/batch17.html").includes('href="../../../currency-only/batch18.html"'),"Batch17 next button");

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
