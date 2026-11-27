import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const exports={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/rection.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,console});
const {getRection}=exports;
const cases=lemma=>getRection(lemma).patterns.flatMap(p=>p.complements.map(c=>c.case));
test('verb case applies to complement, not verb itself',()=>{
 assert.equal(cases('helfen').join(','),'Dativ');assert.equal(cases('sehen').join(','),'Akkusativ');
 const r=getRection('helfen');assert.equal(r.case,undefined);assert(r.summary.includes('tamlayıcının'));
 assert(r.patterns[0].example.parts.some(p=>p.case==='Dativ'&&p.text==='dem Kind'));
});
test('geben distinguishes recipient Dativ and thing Akkusativ',()=>{
 const p=getRection('geben').patterns[0];assert.equal(p.complements[0].case,'Dativ');assert.equal(p.complements[1].case,'Akkusativ');
 assert.equal(p.complements[0].requirement,'optional');assert.equal(p.example.parts.filter(x=>x.case).length,2);
});
test('fixed prepositions and wegen preserve usage/register distinction',()=>{
 assert.equal(cases('mit').join(','),'Dativ');assert.equal(cases('für').join(','),'Akkusativ');
 const r=getRection('wegen');assert.equal(cases('wegen').join(','),'Genitiv,Dativ');assert(r.patterns[1].explanation.includes('konuşma'));assert(r.notes.some(x=>x.includes('wegen Problemen')));
});
test('all nine spatial prepositions explain location/goal, not motion alone',()=>{
 for(const prep of ['an','auf','in','über','unter','hinter','neben','vor','zwischen']){
  const r=getRection(prep);assert.equal(cases(prep).join(','),'Dativ,Akkusativ');
  assert(r.patterns[0].pattern.includes('Wo?'));assert(r.patterns[1].pattern.includes('Wohin?'));
  assert(r.notes.some(n=>n.includes('Her hareket Akkusativ')&&n.includes('yanlıştır')));
 }
 const location=getRection('in').patterns[0].example.parts.map(p=>p.text).join('');assert.equal(location,'Ich laufe in dem Park.');
});
test('warten and sprechen are contextual patterns, not one universal case',()=>{
 const w=getRection('warten');assert(w.patterns[0].pattern.includes('auf + Akkusativ'));assert.equal(w.patterns[0].complements[0].requirement,'optional');assert(w.patterns[0].explanation.includes('Ich warte.'));assert(w.patterns[1].explanation.includes('bakımını'));
 const s=getRection('sprechen');assert.equal(s.patterns[0].complements[0].preposition,'mit');assert.equal(s.patterns[1].complements[0].preposition,'über');assert.equal(cases('sprechen').join(','),'Dativ,Akkusativ');assert(s.patterns.every(p=>p.complements.every(c=>c.requirement==='optional')));
});
test('unknown words/nouns/inflected forms cannot be assigned a guessed case',()=>{
 for(const lemma of ['Haus','Sehen','Helfen','Winterzeit','unbekannt','hilfst','__proto__','constructor']){
  const r=getRection(lemma);assert.equal(r.status,'unknown');assert.equal(r.summary,'Hâl bilgisi bulunamadı');assert.equal(r.patterns.length,0);
 }
});
test('40 curated lemmas have sources, authored translations and valid highlight data',()=>{
 const lemmas='helfen antworten danken folgen gefallen gehören vertrauen sehen besuchen kaufen kennen fragen geben schenken erklären warten sprechen aus bei mit nach seit von zu außer durch für gegen ohne um an auf in über unter hinter neben vor zwischen wegen'.split(' ');
 assert.equal(lemmas.length,40);
 for(const lemma of lemmas){const r=getRection(lemma);assert.equal(r.status,'known',lemma);for(const p of r.patterns){assert(p.sources.length,lemma);assert(p.sources.every(s=>s.url.startsWith('https://')));assert(p.example.translation);assert(p.example.parts.some(x=>x.case));assert(!p.example.parts.some(x=>/[{}]/.test(x.text)));}}
});
test('saved offline data renders case highlights, sources and unknown states',()=>{
 const require=createRequire(import.meta.url);const component={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../components/rection-info.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:component,require});
 const render=(lemma,lang='tr')=>require('react-dom/server').renderToStaticMarkup(require('react').createElement(component.RectionInfo,{data:JSON.parse(JSON.stringify(getRection(lemma))),lang}));
 const known=render('geben');assert(known.includes('<mark'));assert(known.includes('Dativ'));assert(known.includes('Akkusativ'));assert(known.includes('https://de.wiktionary.org/wiki/geben'));assert(render('Haus').includes('Hâl bilgisi bulunamadı'));const german=render('geben','de');assert(german.includes('Welche Ergänzung, welcher Fall?'));assert(german.includes('<mark'));assert(!/[ğışİ]/.test(german.replace(/<[^>]+>/g,'')),'German card shows no Turkish text');
});
test('callers cannot mutate curated entries through returned card data',()=>{
 const a=getRection('helfen');a.patterns[0].complements[0].case='Genitiv';assert.equal(cases('helfen').join(','),'Dativ');
});
