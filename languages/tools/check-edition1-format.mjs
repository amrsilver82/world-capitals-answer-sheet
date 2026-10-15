#!/usr/bin/env node
// Official World Flags + Capitals + Languages Edition 1 presentation guard.
// Do not remove fields/buttons or silently leave a correct language blank.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = p => readFileSync(p, 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count = (s, literal) => s.split(literal).length - 1;
const root = process.cwd();
const quiz = read(join(root, 'languages-v1.html'));
const demoReport = read(join(root, 'pilot/languages-three-category-acceptance-20261015/report.html'));
const css = demoReport.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const headers = ['Q','Your Country','Correct Country','Flag','Your Capital','Correct Capital','Capital','Your Language','Correct Language(s)','Language'];
assert(css, 'Accepted demo report CSS not found');
for (const [id, text] of [['build','Build my reply'],['copy','Copy reply'],['clear','Clear all']]) {
  assert(quiz.includes('id="'+id+'"') && quiz.includes(text), 'Quiz button missing: '+text);
}
for (const id of ['progress','quizGrid']) assert(quiz.includes('id="'+id+'"'), 'Quiz control missing: '+id);
for (const name of ['Country','Capital','Language']) assert(quiz.includes('"'+name+'"'), 'Quiz input schema missing '+name);
for (const cssRule of ['.pic img{width:min(420px,100%)','.ratioframe img{width:100%;height:100%;object-fit:fill']) {
  assert(quiz.includes(cssRule), 'Approved quiz flag CSS changed: '+cssRule);
}
assert(quiz.includes('localStorage') && quiz.includes('Build my reply'), 'Browser-local quiz answer preservation changed');
const dir = join(root, 'languages/reports/edition-1');
const files = readdirSync(dir).filter(n => /^batch\d{2}\.json$/.test(n)).sort();
assert(files.length >= 3, 'Historic results unexpectedly missing');
for (const file of files) {
  const id = file.slice(0, -5), data = JSON.parse(read(join(dir, file))), html = read(join(dir, id+'.html'));
  const q = data.records;
  assert(Array.isArray(q) && q.length > 0, id+': missing records');
  assert(count(html, '<article class="card">') === q.length, id+': flag review card count differs');
  assert(count(html, '<table class="scores-table">') === 2, id+': two separate score tables required');
  assert(html.includes(headers.map(h => '<th>'+h+'</th>').join('')), id+': exact ten review columns/order changed');
  assert(html.match(/<style>([\s\S]*?)<\/style>/)?.[1] === css, id+': approved report style changed');
  assert(!html.includes('<strong></strong>') && !html.includes('<td></td>'), id+': blank correct-answer field');
  assert(!html.includes('undefined') && !html.includes('>null<'), id+': missing-value placeholder in report');
  assert(html.includes('class="linkbutton primary"') && /id="next(?:Batch)?"/.test(html), id+': Next Batch button missing');
  assert(html.includes('languages-v1.html?sha=') && html.includes('state=languages%2Fstates%2F'), id+': exact SHA-pinned next-quiz URL format absent');
  for (const [index, item] of q.entries()) {
    const val = item.correct_languages ?? item.languages;
    assert(typeof val === 'string' && val.trim().length > 0, id+' q'+(item.q||index+1)+': correct_languages missing from JSON');
    const v = escapeHTML(val);
    assert(html.includes('Correct: <strong>'+v+'</strong>'), id+' q'+item.q+': correct language absent from visual card');
    assert(html.includes('<td>'+v+'</td>'), id+' q'+item.q+': correct language absent from ten-column table');
    assert(typeof item.country === 'string' && item.country.length > 0, id+': country label missing');
  }
  console.log('PASS '+id+': '+q.length+' complete rows, nonblank correct languages, two score tables, approved layout/button');
}
console.log('PASS frozen quiz: three input fields, all original buttons, flag CSS, answer persistence');
