import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{
 const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['react','react/jsx-runtime','../components/*']});
 const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;
};
const X=bundle('lib/daily-exercise.ts'),P=bundle('lib/pattern-practice.ts'),E=bundle('lib/examples.ts');
const t=s=>s.split(' ');

// ---- several word orders can be right ----
test('complements of a pattern may swap places, the verb stays last and groups stay together',()=>{
 const g=(alt,sol)=>X.gradeBuild(t(alt),t(sol),'pattern');
 assert.equal(g('über etwas jemanden benachrichtigen','jemanden über etwas benachrichtigen'),'alt');
 assert.equal(g('etwas jemandem erklären','jemandem etwas erklären'),'alt');
 assert.equal(g('bei etwas jemandem helfen','jemandem bei etwas helfen'),'alt');
 assert.equal(g('zu einer Feier jemanden einladen','jemanden zu einer Feier einladen'),'alt');
 assert.equal(g('sich für etwas bei jemandem bedanken','sich bei jemandem für etwas bedanken'),'alt');
 assert.equal(g('jemanden über etwas benachrichtigen','jemanden über etwas benachrichtigen'),'correct');
 // not acceptable
 assert.equal(g('erklären jemandem etwas','jemandem etwas erklären'),'close','verb first');
 assert.equal(g('eine Regel gegen verstoßen','gegen eine Regel verstoßen'),'close','a group split up');
 assert.equal(g('für etwas sich bei jemandem bedanken','sich bei jemandem für etwas bedanken'),'close','"sich" stays first');
 assert.equal(g('x y z','jemandem etwas erklären'),'wrong');
});
test('sentences keep the verb second, the last word last and each determiner or preposition with its noun',()=>{
 const g=(alt,sol)=>X.gradeBuild(t(alt),t(sol),'sentence');
 assert.equal(g('heute habe Ich Zeit','Ich habe heute Zeit'),'alt');
 assert.equal(g('Ich helfe jeden Tag dem Kind','Ich helfe dem Kind jeden Tag'),'alt');
 assert.equal(g('Ich helfe Kind dem jeden Tag','Ich helfe dem Kind jeden Tag'),'close');
 assert.equal(g('Ich Kind helfe dem jeden Tag','Ich helfe dem Kind jeden Tag'),'close','verb not second');
 assert.equal(g('Ich helfe dem jeden Tag Kind','Ich helfe dem Kind jeden Tag'),'close','determiner separated from its noun / last word moved');
 assert.equal(X.gradeBuild(t('b a c d'),t('a b c d')),'close','without a kind only the exact order is right');
});
test('invariants over every pattern of the app: the solution is correct, every alternative uses the same words, shuffles are mixed',()=>{
 const words=[...new Set(['verbPatterns','adjectives','nouns','more'].flatMap(g=>Object.keys(JSON.parse(fs.readFileSync('data/compact-card-data.json','utf8'))[g])))];
 let rows=0,alts=0;
 for(const w of words)for(const row of P.rowsFor(w)){
  rows++;const q=X.buildQuizOfRow(row,'2026-11-13');
  if(!q)continue;
  assert.equal(X.gradeBuild(q.solution,q.solution,'pattern'),'correct',row.phrase);
  assert.notDeepEqual(q.chips.map(c=>c.text),q.solution,'unsolved shuffle: '+row.phrase);
  assert.deepEqual([...q.chips.map(c=>c.text)].sort(),[...q.solution].sort(),row.phrase);
  const orders=X.alternativeOrders(q.solution);alts+=orders.length>1?1:0;
  assert.ok(orders.length<=24);
  for(const o of orders){assert.deepEqual([...o].sort(),[...q.solution].sort(),'alternative keeps the words: '+row.phrase);assert.equal(X.gradeBuild(o,q.solution,'pattern')==='close'||X.gradeBuild(o,q.solution,'pattern')==='wrong',false,row.phrase);}
 }
 assert.ok(rows>1000&&alts>80,`rows ${rows}, patterns with alternatives ${alts}`);
});
test('invariants over every example sentence: the blank is the word itself or its inflection, and the sentence is rebuilt exactly',()=>{
 const data=JSON.parse(fs.readFileSync('lib/tatoeba-examples.json','utf8')).examples;let n=0;
 for(const [w,list] of Object.entries(data))for(const e of list){
  const c=X.clozeFor(e.de,w,e.tr);if(!c)continue;n++;
  assert.equal(c.before+c.answer+c.after,e.de,w);
  const a=c.answer.toLowerCase();assert.ok(a.startsWith(w.slice(0,Math.max(3,w.length-3)))||a.startsWith(w.replace(/(e?n|ern|eln)$/,'')),`${w} blanks "${c.answer}" in "${e.de}"`);
 }
 assert.ok(n>500,'cloze sentences '+n);
});
test('cloze does not blank another word that merely starts alike',()=>{
 assert.equal(X.clozeFor('Fragt ihn einfach!','Frage'),null,'the noun Frage is not the verb form Fragt');
 assert.equal(X.clozeFor('Sie liebt dich!','liebe'),null);
 assert.equal(X.clozeFor('Bitte nicht stören!','störend'),null);
 assert.equal(X.clozeFor('Das Gehalt ist hoch.','gehen'),null,'a noun inside the sentence is not a verb form');
 assert.equal(X.clozeFor('Er gehört dazu.','gehen'),null);
 assert.equal(X.clozeFor('Anna kommt an.','an').answer,'an','short words match exactly');
 assert.equal(X.clozeFor('Wir gehen jetzt.','gehen').answer,'gehen');
 assert.equal(X.clozeFor('Ich gehe jetzt.','gehen').answer,'gehe');
 assert.equal(X.clozeFor('Sie hilft allen.','helfen'),null,'vowel-changing forms fall back to typed recall instead of a wrong blank');
 assert.equal(X.clozeFor('Viele Fragen bleiben offen.','Frage').answer,'Fragen');
 assert.equal(X.clozeFor('Die Medien sind frei.','Medium').answer,'Medien');
});

// ---- headwords that are grammar items ----
test('grammar headwords can be typed and spoken: placeholders like "+ Nebensatz" and "…" are dropped',()=>{
 assert.equal(X.spokenForm('weil + Nebensatz'),'weil');assert.equal(X.spokenForm('um … zu'),'um zu');assert.equal(X.spokenForm('zu + Infinitiv'),'zu');assert.equal(X.spokenForm('Haus'),'Haus');
 assert.equal(X.wordLabel({word:'um … zu',article:''}),'um zu');
 assert.equal(X.gradeRecall('weil',{word:'weil + Nebensatz',article:''}),'correct');
 assert.equal(X.gradeRecall('um zu',{word:'um … zu',article:''}),'correct');
 assert.equal(X.listenable('weil + Nebensatz'),false);assert.equal(X.listenable('im'),false);assert.equal(X.listenable('Tisch'),true);assert.equal(X.listenable('zu Hause'),false);
});

// ---- two words, one Turkish meaning ----
test('words that share a Turkish meaning are not offered as a second right answer and are recognised when typed',()=>{
 const mk=(id,word,meaning,article='')=>({id,word,meaning,article,due:0,interval:0,reviews:3,partOfSpeech:article?'noun':'verb'});
 const machen=mk('1','machen','yapmak'),tun=mk('2','tun','yapmak'),gehen=mk('3','gehen','gitmek'),kommen=mk('4','kommen','gelmek'),essen=mk('5','essen','yemek');
 const pool=[machen,tun,gehen,kommen,essen];
 assert.deepEqual(X.synonymsOf(machen,pool).map(c=>c.word),['tun']);
 for(let i=0;i<30;i++){
  const ch=X.buildChoices(machen,pool,'word','d'+i);
  assert.equal(ch.filter(c=>c.correct).length,1);assert.ok(!ch.some(c=>c.label==='tun'),'"tun" is also "yapmak": it must not be a wrong option');
 }
 assert.equal(X.gradeRecall('tun',tun),'correct');
});
test('a preposition that occurs twice in a pattern is not offered as a wrong option',()=>{
 const rows=P.rowsFor('verbinden');const row=P.rowsFor('Zugang haben zu')[0]||rows[0];void row;
 const fake={id:'x',word:'x',de:'von etwas zu etwas · von + Dativ',tr:'bir şeyden bir şeye',phrase:'von etwas zu etwas'};
 for(let i=0;i<20;i++){const q=X.patternQuizOfRow(fake,'s'+i);assert.ok(!q.options.some(o=>o.label==='zu'));assert.equal(q.options.filter(o=>o.correct).length,1);}
});

test('a typed pattern in another valid order is right, in an unnatural order it is a near miss',()=>{
 assert.equal(X.gradePhrase('über etwas jemanden benachrichtigen','jemanden über etwas benachrichtigen'),'correct');
 assert.equal(X.gradePhrase('benachrichtigen jemanden über etwas','jemanden über etwas benachrichtigen'),'close');
 assert.equal(X.gradePhrase('jemanden über etwas benachrichtigen','jemanden über etwas benachrichtigen'),'correct');
});
