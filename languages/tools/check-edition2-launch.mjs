#!/usr/bin/env node
// Guard the first published Edition 2 format without reading private answers.
import fs from 'node:fs';
const html=fs.readFileSync('languages-v2.html','utf8');
const a=JSON.parse(fs.readFileSync('languages/states/ed2-b01-initial-20261022.json','utf8'));
const b=fs.readFileSync('languages-v1.html','utf8');
if(a.edition!==2||a.engine!=='languages_v1'||a.question_count!==10||a.questions.length!==10||a.batch!==1)throw Error('Wrong Edition 2 first batch');
if(a.questions.some((q,i)=>q.n!==i+1||!/^\.\/flags\/canonical\/[a-f0-9]{12}\.svg$/.test(q.asset)||q.country||q.capital||q.language||q.answer))throw Error('State leaks answers or has invalid flags');
for(const q of a.questions){if(!fs.existsSync(q.asset.slice(2)))throw Error('Missing canonical flag '+q.n)}
if(!html.includes('edition!==2')||!html.includes('world-languages-v2-')||!html.includes('World Flags + Capitals + Languages')||!html.includes('Copy reply'))throw Error('Edition 2 interface mismatch');
if(!b.includes('edition!==1'))throw Error('Historical Edition 1 page modified');
console.log('PASS: 10 canonical flag cards; no public answers; new edition isolated from original');
