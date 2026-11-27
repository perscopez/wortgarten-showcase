import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const C=bundle('lib/compose.ts');
test('content words skip articles and placeholders',()=>{assert.deepEqual(C.contentWords('gegen eine Regel verstoßen'),['gegen','regel','verstossen']);assert.deepEqual(C.contentWords('jemandem bei etwas helfen'),['bei','helfen']);});
test('an original sentence with the pattern in any inflected form passes',()=>{
 assert.equal(C.checkComposition('Er verstößt oft gegen die Regeln der Schule.','gegen eine Regel verstoßen').status,'ok');
 assert.equal(C.checkComposition('Mein Bruder hilft mir bei den Hausaufgaben.','jemandem bei etwas helfen').status,'ok');
 assert.equal(C.checkComposition('Ich rufe dich morgen an.','jemanden anrufen').status,'ok','separable verb');
});
test('missing pieces are named; short and empty answers are not accepted',()=>{
 const m=C.checkComposition('Ich mag die Schule sehr gern.','gegen eine Regel verstoßen');assert.equal(m.status,'missing');assert.deepEqual(m.missing,['gegen','Regel','verstoßen'],'missing words are shown as written in the pattern');
 assert.equal(C.checkComposition('Er verstößt gegen Regel.','gegen eine Regel verstoßen').status,'short');
 assert.equal(C.checkComposition('  ','gegen eine Regel verstoßen').status,'empty');
});
test('copying the pattern is detected',()=>{assert.ok(C.isCopy('Gegen eine Regel verstoßen.','gegen eine Regel verstoßen'));assert.ok(!C.isCopy('Er verstößt gegen eine Regel.','gegen eine Regel verstoßen'));});
const S=bundle('lib/sentence-check.ts');
test('sentence notes: wrong case after the pattern preposition, lower-case noun, capital and full stop, at most two',()=>{
 assert.deepEqual(S.sentenceNotes('Ich fahre mit dem Bus zur Arbeit.','mit etwas fahren · mit + Dativ'),[]);
 const wrong=S.sentenceNotes('Ich fahre mit den Bus zur Arbeit.','mit etwas fahren · mit + Dativ');
 assert.equal(wrong.length,0,'"den" can be a dative plural, so the rule stays silent');
 const dat=S.sentenceNotes('Ich fahre mit einen Bus zur Arbeit.','mit etwas fahren · mit + Dativ');assert.equal(dat[0].kind,'case');assert.match(dat[0].text,/Dativ/);
 const acc=S.sentenceNotes('Das Geschenk ist für dem Lehrer.','für jemanden sein · für + Akkusativ');
 assert.equal(acc[0].kind,'case');assert.match(acc[0].text,/Akkusativ/);
 const noun=S.sentenceNotes('Ich habe heute zeit.','Zeit haben');assert.ok(noun.some(n=>n.kind==='noun'&&/Zeit/.test(n.text)));
 const form=S.sentenceNotes('ich habe zeit','Zeit haben');assert.ok(form.length<=2);
 assert.ok(S.sentenceNotes('ich lerne heute Deutsch.','x').some(n=>n.kind==='capital'));
 assert.deepEqual(S.sentenceNotes('','x'),[]);
});
