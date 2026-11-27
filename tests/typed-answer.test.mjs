import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
const {outputFiles:[file]}=buildSync({entryPoints:['lib/typed-answer.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const mod={exports:{}};new Function('module','exports',file.text)(mod,mod.exports);
const {checkTypedAnswer:check}=mod.exports;
const noun={word:'Entscheidung',article:'die'};

test('exact answers with article, extra spaces and any case are correct',()=>{
 assert.equal(check('die Entscheidung',noun),'correct');
 assert.equal(check('  Die   entscheidung ',noun),'correct');
 assert.equal(check('beantworten',{word:'beantworten',article:''}),'correct');
});
test('article mistakes are separated from word mistakes',()=>{
 assert.equal(check('der Entscheidung',noun),'article');
 assert.equal(check('Entscheidung',noun),'article');
 assert.equal(check('der Endscheidung',noun),'article','close word, wrong article → article first');
});
test('umlaut transliteration and one-letter typos are recognised, short words stay strict',()=>{
 assert.equal(check('die Pruefung',{word:'Prüfung',article:'die'}),'umlaut');
 assert.equal(check('die Strasse',{word:'Straße',article:'die'}),'umlaut');
 assert.equal(check('die Entscheidng',noun),'close');
 assert.equal(check('das Hus',{word:'Haus',article:'das'}),'wrong');
 assert.equal(check('die Lösung',noun),'wrong');
});
test('empty input gives no verdict',()=>{assert.equal(check('   ',noun),null);});
test('daily exercises offer typing on Turkish → German prompts and colour articles',()=>{
 const ui=fs.readFileSync('components/daily-exercise.tsx','utf8');
 assert.ok(ui.includes("const typing=askKind==='cloze'||askKind==='recall'||askKind==='listen'||askKind==='pattern-fill'||askKind==='pattern-type';"));
 assert.ok(ui.includes("'article-color article-'+card.article"));
 assert.ok(!fs.readFileSync('components/daily-vocabulary.tsx','utf8').includes("Önce kelimelerimi eşitle"),'starter-only users can start right away');
});
