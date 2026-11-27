import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{
 const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});
 const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;
};
const {turkishReading:r}=bundle('lib/pronunciation.ts');
const {caseHint,withCaseNote}=bundle('lib/case-hint.ts');
const P=bundle('lib/pattern-practice.ts');

test('Turkish reading follows the main German spelling rules',()=>{
 assert.equal(r('Schule'),'şule');assert.equal(r('Straße'),'ştrase');assert.equal(r('sprechen'),'şpreşın');
 assert.equal(r('Zeit'),'tsayt');assert.equal(r('Haus'),'havs');assert.equal(r('Wasser'),'vasır');assert.equal(r('Buch'),'buh');assert.equal(r('Tisch'),'tiş');
 assert.equal(r('die Wirtschaft'),'di virtşaft');assert.equal(r('der Pfleger'),'der pflegır');assert.equal(r('König'),'köniş');assert.equal(r('Tag'),'tak');
});
test('no reading is invented for numbers or placeholders',()=>{assert.equal(r('3 Tage'),'');assert.equal(r('etwas … tun'),'');assert.equal(r(''),'');});

test('case hint is derived only when the wording makes it certain',()=>{
 assert.deepEqual(caseHint('mit einem Kollegen sprechen'),{prep:'mit',governed:'Dativ'});
 assert.deepEqual(caseHint('für den Versand vorbereiten'),{prep:'für',governed:'Akkusativ'});
 assert.deepEqual(caseHint('in einen Rahmen setzen'),{prep:'in',governed:'Akkusativ'});
 assert.deepEqual(caseHint('an einer Weiterbildung teilnehmen'),{prep:'an',governed:'Dativ'});
 assert.deepEqual(caseHint('jemandem etwas schenken'),{governed:'Dativ + Akkusativ'});
 assert.deepEqual(caseHint('den Koffer packen'),{governed:'Akkusativ'});
 assert.equal(caseHint('den Kindern helfen'),null,'dative plural is not guessed');
 assert.equal(caseHint('den Kunden beraten'),null,'weak noun ending in -n is not guessed');
 assert.equal(caseHint('die Wirtschaft wächst'),null,'subject phrases get no note');
 assert.equal(caseHint('auf etwas warten'),null,'ambiguous two-way preposition without a clear article');
 assert.equal(caseHint('auf + Akkusativ'),null,'already stated');
 assert.equal(withCaseNote('mit dem Bus fahren'),'mit dem Bus fahren · mit + Dativ');
});
test('patterns carry a case note whenever one can be derived',()=>{
 const all=['Kollege','Kunde','Verwandte','Weiterbildung','Unternehmen','Baum','Erfolg','Wand','Verlag'].flatMap(w=>P.rowsFor(w));
 const withMit=all.filter(x=>/\b(mit|zu|unter) einem\b/.test(x.phrase));
 assert.ok(withMit.length>0);
 for(const x of withMit)assert.ok(/Dativ/.test(x.de),x.de);
});
test('sentence readings keep every word, drop punctuation and refuse long or odd input',()=>{
 const {turkishReadingSentence:s}=bundle('lib/pronunciation.ts');
 assert.equal(s('Wie spät ist es?'),'vi şpet ist es');
 assert.ok(s('Ich fahre jeden Morgen mit dem Bus zur Arbeit.').startsWith('iş fare'));
 assert.equal(s('Das kostet 5 Euro.'),'');assert.equal(s('a b c d e f g h i j k l m n o p q'),'');assert.equal(s(''),'');
});
test('quick-added words are enriched automatically and readings are shown where German is learned',()=>{
 const fs=require('node:fs');const page=fs.readFileSync('app/page.tsx','utf8');
 assert.ok(page.includes('async function enrichOne'));assert.ok(page.includes('queueEnrich([c])'),'after a quick add, through the single queue');
 assert.ok(page.includes('caughtUp'),'old unchecked cards are completed on start');
 for(const f of ['components/daily-exercise.tsx','components/pattern-drill.tsx','components/word-result.tsx','components/reading-view.tsx'])assert.ok(/<Reading /.test(fs.readFileSync(f,'utf8')),f);
});
