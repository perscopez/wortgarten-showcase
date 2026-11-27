import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const bundle=(entry,globals={})=>{
 const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['react','react/jsx-runtime','../components/*']});
 const mod={exports:{}};new Function('module','exports','require',...Object.keys(globals),f.text)(mod,mod.exports,require,...Object.values(globals));return mod.exports;
};
const ex=bundle('lib/daily-exercise.ts');
const tat=bundle('lib/tatoeba.ts');

// ---- Tatoeba picker ----
const res=(id,text,tr,user='x',lang='deu')=>({id,text,lang,user:{username:user},translations:[[{lang:'tur',text:tr}]]});
test('Tatoeba picker keeps short sentences with the word and a Turkish translation, drops the rest',()=>{
 const picks=tat.pickExamples([
  res(1,'Tom hilft mir jeden Tag.','Tom bana her gün yardım ediyor.'),
  res(2,'Sie hilft ihrer Mutter im Haus.','Annesine evde yardım eder.'),
  res(3,'Hilft das?','?'),
  res(4,'Ich habe 3 Katzen und hilft nicht.','Üç kedim var.'),
  res(5,'Er hilft uns gern, wenn wir ihn rechtzeitig um Hilfe bitten und anrufen.','Bize yardım eder.'),
  res(6,'Wir helfen gern.','Seve seve yardım ederiz.'),
  {id:7,text:'Sie hilft allen Leuten hier.',lang:'deu',translations:[]},
  res(8,'Die Mutter hilft allen Leuten dort.','Anne herkese yardım eder.','y','eng'),
 ],'hilft','yardım etmek');
 assert.deepEqual(picks.map(p=>p.id),[2,1,6],'literal matches first (clean before names), then stem-search hits; too short/long/digit/untranslated/other-language dropped');
});
test('names are ranked last and at most the requested number is returned',()=>{
 const results=[res(10,'Tom kauft ein Buch.','Tom bir kitap alıyor.'),res(11,'Wir kaufen ein Auto.','Bir araba alıyoruz.'),res(12,'Sie kauft Brot und Käse.','Ekmek ve peynir alıyor.')];
 assert.deepEqual(tat.pickExamples(results,'kauft','',3).map(p=>p.id),[11,12,10],'all three relate to the word; shorter first, the one with a name last');
 assert.equal(tat.pickExamples(results,'kauft','',3).at(-1).id,10);assert.equal(tat.pickExamples(results,'kauft','',1).length,1);
});

// ---- Bundled examples and coverage of the app's own words ----
const data=JSON.parse(fs.readFileSync('lib/tatoeba-examples.json','utf8'));
test('bundled examples are well formed and credited',()=>{
 assert.equal(data.license,'CC BY 2.0 FR');assert.equal(data.source,'Tatoeba');
 for(const [w,list] of Object.entries(data.examples)){
  assert.ok(list.length>=1&&list.length<=3,w);
  for(const e of list){assert.ok(e.id>0&&e.de&&e.tr,w);const n=(e.de.match(/\p{L}+/gu)||[]).length;assert.ok(n>=3&&n<=11&&!/\d/.test(e.de),`${w}: "${e.de}" length`);}
 }
});
function knownWords(){
 const words=new Map();const add=w=>{w=(w||'').trim();if(w)words.set(w.toLowerCase(),words.get(w.toLowerCase())||w);};
 for(const m of fs.readFileSync('lib/basic-words.ts','utf8').matchAll(/\['([^']+)','([^']*)','([^']*)','([^']*)'/g))add(m[1]);
 for(const f of ['daily-new-words','reviewed-lexicon','daily-meanings']){const j=JSON.parse(fs.readFileSync(`lib/${f}.json`,'utf8'));for(const [k,v] of Object.entries(j))add(v&&typeof v==='object'?v.word||k:k);}
 for(const f of ['new-word-scenes','lesson-20261108-art','audit-20261109-art','teaching-scenes']){const j=JSON.parse(fs.readFileSync(`lib/${f}.json`,'utf8'));for(const a of j.reviewedAssets||j.assets||j.scenes||[])add(a.word||a.lemma);}
 return [...words.values()];
}
test('every word the app ships with has at least one Turkish-glossed pattern',()=>{
 const missing=knownWords().filter(w=>!ex.patternRows(w).some(([de,tr])=>de&&tr));
 assert.deepEqual(missing,[],'words without a pattern: '+missing.join(', '));
});
const exmod=bundle('lib/examples.ts');
test('every single word the app ships with has an example sentence with a Turkish translation',()=>{
 const own=new Set();
 for(const f of ['daily-new-words','reviewed-lexicon']){const j=JSON.parse(fs.readFileSync(`lib/${f}.json`,'utf8'));for(const [k,v] of Object.entries(j))if(v.example&&v.translation)own.add((v.word||k).toLowerCase());}
 for(const m of fs.readFileSync('lib/basic-words.ts','utf8').matchAll(/\['([^']+)','([^']*)','([^']*)','([^']*)','([^']+)','([^']+)'\]/g))own.add(m[1].toLowerCase());
 const singles=knownWords().filter(w=>/^[\p{L}-]+$/u.test(w));
 const without=singles.filter(w=>!own.has(w.toLowerCase())&&!exmod.bundledExamples(w).some(c=>c.tr));
 assert.deepEqual(without,[],'words without any example: '+without.join(', '));
});

// ---- Build-the-order quizzes ----
test('collocation quiz: Turkish prompt, shuffled chips that are never already solved',()=>{
 const q=ex.buildQuizFor('Regel','pattern','2026-11-13');
 assert.equal(q.kind,'pattern');assert.ok(q.tr&&q.solution.length>=2&&q.solution.length<=6);
 assert.deepEqual([...q.chips.map(c=>c.text)].sort(),[...q.solution].sort());
 assert.notDeepEqual(q.chips.map(c=>c.text),q.solution);
 assert.deepEqual(ex.buildQuizFor('Regel','pattern','2026-11-13'),q,'stable per day');
 assert.equal(ex.buildQuizFor('zzzunbekannt','pattern','x'),null);
});
test('sentence quiz uses 4–10 word examples with a translation and keeps the closing punctuation aside',()=>{
 const q=ex.buildQuizFor('helfen','sentence','d',{example:'Ich helfe dem Kind jeden Tag.',translation:'Çocuğa her gün yardım ederim.'},{});
 assert.equal(q.end,'.');assert.deepEqual(q.solution,['Ich','helfe','dem','Kind','jeden','Tag']);assert.equal(q.full,'Ich helfe dem Kind jeden Tag.');
 assert.equal(ex.buildQuizFor('helfen','sentence','d',{example:'Ich helfe.',translation:'Yardım ederim.'},{}),null,'too short');
 assert.equal(ex.buildQuizFor('helfen','sentence','d',{example:'Ich helfe dem Kind jeden Tag.',translation:''},{}),null,'needs a translation');
 assert.equal(ex.gradeBuild(q.solution,q.solution),'correct');
 const swapped=[...q.solution];[swapped[0],swapped[1]]=[swapped[1],swapped[0]];
 assert.equal(ex.gradeBuild(swapped,q.solution),'close');assert.equal(ex.gradeBuild(['x','y'],q.solution),'wrong');
});
test('known words get a mix of exercise kinds, including patterns and sentences; reverse questions stay typed',()=>{
 const info={example:'',translation:''};
 const card=(id,o={})=>({id,reviews:3,word:'warten',example:'Ich warte auf den Bus heute Morgen.',translation:'Bu sabah otobüsü bekliyorum.',...o});
 const kinds=new Set(Array.from({length:80},(_,i)=>ex.exerciseFor({round:0},false,card('w'+i),info,false,'d')));
 for(const k of ['choice','listen','pattern','build-sentence'])assert.ok(kinds.has(k),k+' appears: '+[...kinds]);
 // patterns settled and not due → the typed round stays a word question
 const PP=bundle('lib/pattern-practice.ts');const items={};for(const r of PP.rowsFor('warten'))items[r.id]={attempts:6,correct:6,streak:6,last:0,due:9e15};
 assert.equal(ex.exerciseFor({round:1},true,card('x'),info,false,'d',{version:1,items},1),'cloze');
});

// ---- Runtime cache for words outside the bundle ----
test('unknown words are fetched once and remembered; failures are retried later',async()=>{
 const store=new Map();let calls=0,ok=true;
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
 const fetch=async url=>{calls++;assert.match(String(url),/^\/api\/examples\?word=Quittungsnummer/);return{ok,json:async()=>({examples:[{id:5,de:'Die Quittungsnummer steht oben.',tr:'Makbuz numarası üstte yazıyor.',by:'u'}]})};};
 const m=bundle('lib/examples.ts',{localStorage,fetch});
 assert.equal(await m.fetchExamples('Quittungsnummer','makbuz numarası'),true);
 assert.equal(await m.fetchExamples('Quittungsnummer'),false,'remembered: no second request');assert.equal(calls,1);
 assert.equal(m.candidatesFor({word:'Quittungsnummer'},{})[0].origin,'tatoeba');
 ok=false;assert.equal(await m.fetchExamples('Unbekanntheit'),false);assert.equal(await m.fetchExamples('Unbekanntheit'),false);assert.equal(calls,3,'a failed lookup is not remembered');
 assert.equal(await m.fetchExamples('Haus'),false,'bundled words never hit the network');
});

// ---- Every example and pattern can be heard ----
const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
const wr=(()=>{const box={module:{exports:{}},exports:{},require,URL,localStorage:{getItem:()=>'tr'}};vm.runInNewContext(buildSync({entryPoints:['components/word-result.tsx'],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text,box);return box.module.exports.default;})();
test('example and patterns have a listen button even when the host page supplies no player',()=>{
 const out=render(React.createElement(wr,{compact:true,data:{word:'warten',meaning:'beklemek',partOfSpeech:'verb',example:'Ich warte auf den Bus.',translation:'Otobüsü bekliyorum.'}}));
 assert.ok((out.match(/speak-button/g)||[]).length>=2,'example + patterns: '+out.match(/speak-button/g));
 const noExample=render(React.createElement(wr,{compact:true,data:{word:'abholen',meaning:'almak',partOfSpeech:'verb'}}));
 assert.match(noExample,/Cümle|Örnek/,'a bundled sentence fills in a missing example');assert.match(noExample,/speak-button/);
});
test('daily exercises show a listenable sentence after each answer and credit Tatoeba',()=>{
 const ui=fs.readFileSync('components/daily-exercise.tsx','utf8');
 assert.ok(ui.includes('<Sentence cand={sample}'));assert.ok(ui.includes('CC BY 2.0 FR'));assert.ok(ui.includes('<SpeakButton'));
 const q=fs.readFileSync('components/daily-vocabulary.tsx','utf8');assert.ok(q.includes('fetchExamples('));
});
