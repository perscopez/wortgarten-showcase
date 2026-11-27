import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const F=bundle('lib/form-finder.ts');
const lic={label:'x',url:'https://x.example'},src=[{label:'W',url:'https://de.wiktionary.org/wiki/x'}];
const rows=(data)=>data.map(([l,...cells])=>({label:l,cells:cells.map(c=>[c])}));
const verb={id:'v',word:'beantworten',inflections:{version:1,lemma:'beantworten',license:lic,sources:src,tables:[{title:'Fiil · Indikativ Aktiv',columns:['Präsens','Präteritum'],rows:rows([['ich','beantworte','beantwortete'],['du','beantwortest','beantwortetest'],['er/sie/es','beantwortet','beantwortete'],['wir','beantworten','beantworteten']])}]}};
const noun={id:'n',word:'Pfleger',inflections:{version:1,lemma:'Pfleger',license:lic,sources:src,tables:[{title:'İsim · dört hâl',columns:['Tekil','Çoğul'],rows:rows([['Nominativ','der Pfleger','die Pfleger'],['Akkusativ','den Pfleger','die Pfleger'],['Dativ','dem Pfleger','den Pflegern'],['Genitiv','des Pflegers','der Pfleger']])}]}};
const cards=[verb,noun];

test('every question type is produced from the saved tables and answers are real cells',()=>{
 const items=F.buildFormItems(cards,{mode:'mix',advanced:true,seed:'s',size:12});
 assert.ok(items.length>=8);assert.deepEqual([...new Set(items.map(i=>i.type))].sort(),['identify','lemma','produce','transform']);
 const forms=new Set(cards.flatMap(c=>c.inflections.tables.flatMap(t=>t.rows.flatMap(r=>r.cells.flat()))));
 for(const i of items){assert.ok(i.id&&i.target&&i.answers.length,i.type);if(i.type!=='lemma'&&i.type!=='identify')assert.ok(i.answers.every(a=>forms.has(a)),'answer is a table cell');}
 assert.equal(new Set(items.map(i=>i.id)).size,items.length,'no repeated question');
});
test('write mode only asks to type forms, recognise mode only to identify or go back to the base form',()=>{
 assert.ok(F.buildFormItems(cards,{mode:'write',seed:'a'}).every(i=>['produce','transform'].includes(i.type)));
 assert.ok(F.buildFormItems(cards,{mode:'recognize',seed:'a'}).every(i=>['identify','lemma'].includes(i.type)));
});
test('transform shows a different form as the starting point; identify offers exactly the right cells among distinct options',()=>{
 for(const i of F.buildFormItems(cards,{mode:'mix',advanced:true,seed:'q',size:12})){
  if(i.type==='transform'){assert.ok(i.given.form&&i.given.cell);assert.ok(!i.answers.includes(i.given.form),'the given form is not the answer');}
  if(i.type==='identify'){assert.ok(i.choices.length>=3&&i.choices.length<=5);assert.equal(new Set(i.choices.map(c=>c.label)).size,i.choices.length);assert.ok(i.choices.some(c=>c.correct));assert.ok(i.choices.filter(c=>!c.correct).length>=2);}
  if(i.type==='lemma')assert.ok(['beantworten','Pfleger','der Pfleger'].includes(i.answers[0]));
 }
});
test('answers: pronoun and article are optional, umlaut spellings are close, wrong forms are wrong',()=>{
 const find=(pred)=>F.buildFormItems(cards,{mode:'write',advanced:true,seed:'z',size:30}).find(pred);
 const verbItem=find(i=>i.type==='produce'&&i.word==='beantworten'&&i.target==='ich · Präteritum');
 if(verbItem){assert.equal(F.checkFormAnswer(verbItem,'beantwortete'),'correct');assert.equal(F.checkFormAnswer(verbItem,'ich beantwortete'),'correct');assert.equal(F.checkFormAnswer(verbItem,'beantworte'),'wrong');}
 const nounItem=find(i=>i.type==='produce'&&i.word==='Pfleger'&&i.target==='Genitiv · Tekil');
 if(nounItem){assert.equal(F.checkFormAnswer(nounItem,'des Pflegers'),'correct');assert.equal(F.checkFormAnswer(nounItem,'Pflegers'),'correct');assert.equal(F.checkFormAnswer(nounItem,'des pflegers'),'correct','case-insensitive');assert.equal(F.checkFormAnswer(nounItem,''),'wrong');}
 const u={answers:['Äpfel'],type:'produce'};assert.equal(F.checkFormAnswer(u,'Aepfel'),'close');assert.equal(F.checkFormAnswer(u,'Äpfel'),'correct');
});
test('words without usable tables give no questions; the same seed gives the same round',()=>{
 assert.deepEqual(F.buildFormItems([{id:'x',word:'Haus',inflections:null}],{}),[]);
 assert.deepEqual(F.buildFormItems(cards,{seed:'same'}).map(i=>i.id),F.buildFormItems(cards,{seed:'same'}).map(i=>i.id));
 assert.equal(F.usableGroups([{id:'x',word:'Haus',inflections:undefined}]).length,0);
});
test('the page is reachable, mistakes are logged as their own error type',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');assert.ok(page.includes("['formfinder','Biçim bul']")&&page.includes("page==='formfinder'&&"));
 const E=bundle('lib/error-log.ts');assert.equal(E.ERROR_LABELS.cekim.label,'Çekim biçimi');
 assert.ok(fs.readFileSync('components/form-finder.tsx','utf8').includes("type:'cekim'"));
});
