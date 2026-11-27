import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const R=bundle('lib/readings.ts'),X=bundle('lib/exam-a2.ts');
const okQuestions=(qs,id)=>{assert.equal(qs.length,3,id);for(const q of qs){assert.ok(q.q.endsWith('?'),id+':'+q.q);assert.equal(q.options.length,3,id);assert.equal(new Set(q.options).size,3,id);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3,id);}};
test('every reading has German, Turkish, a level and three well-formed questions',()=>{
 assert.ok(R.READINGS.length>=8);assert.equal(new Set(R.READINGS.map(r=>r.id)).size,R.READINGS.length);
 for(const r of R.READINGS){assert.ok(r.title&&r.de.length>120&&r.tr.length>100,r.id);assert.ok(['A1','A2'].includes(r.level));assert.ok(R.readingWords(r.de).length>=30&&R.readingWords(r.de).length<=90,r.id+' length');okQuestions(r.questions,r.id);}
});
test('the A2 mini test covers listening, reading, writing and speaking, and says it is not the official exam',()=>{
 assert.equal(X.EXAM_READING.length,2);assert.ok(X.EXAM_READING.every(Boolean));
 assert.equal(X.EXAM_LISTENING.length,3);for(const l of X.EXAM_LISTENING)okQuestions(l.questions,l.id);
 assert.ok(X.EXAM_WRITING.every(w=>w.points.length===3&&w.minWords<w.maxWords));assert.ok(X.EXAM_SPEAKING.length>=2);
 assert.match(X.EXAM_NOTICE,/Resmî sınav değildir/);
});
test('navigation reaches the new pages',()=>{
 const fs=require('node:fs');const p=fs.readFileSync('app/page.tsx','utf8');
 for(const k of ['reading','exam','errors'])assert.ok(p.includes(`['${k}',`)&&p.includes(`page==='${k}'&&`),k);
});
test('function words have a gloss so "Ich" is never looked up as the noun "das Ich"',()=>{
 assert.equal(R.functionGloss('Ich'),'ben');assert.ok(R.functionGloss('und'));assert.equal(R.functionGloss('Haus'),undefined);
 const words=new Set(R.READINGS.flatMap(r=>R.readingWords(r.de).map(w=>w.toLocaleLowerCase('de'))));
 for(const w of ['ich','und','in','mit','der','die','das','ist','nicht'])if(words.has(w))assert.ok(R.functionGloss(w),w);
});
