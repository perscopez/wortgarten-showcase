import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/rection.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports});
const {getRection,listRectionLemmas}=exports;
const byPrep=(lemma,prep)=>getRection(lemma).patterns.filter(p=>p.complements.some(c=>c.preposition===prep));
test('142 distinct canonical lemmas, 166 documented usage patterns; no alias inflation',()=>{
 const lemmas=listRectionLemmas();assert.equal(lemmas.length,142);assert.equal(new Set(lemmas).size,142);assert(!lemmas.some(l=>l.startsWith('sich ')));
 assert.equal(lemmas.reduce((n,l)=>n+getRection(l).patterns.length,0),166);
 for(const l of lemmas){const d=getRection(l);assert.equal(d.lemma,l);assert.equal(d.status,'known');assert(d.patterns.length);for(const p of d.patterns){assert(p.pattern);assert(p.explanation);assert(p.sources.length);assert(p.sources.every(s=>s.label&&s.url.startsWith('https://')));assert(p.complements.length);assert(p.example.translation);assert(p.example.parts.some(x=>x.case));assert(!p.example.parts.some(x=>/[{}]/.test(x.text)));}}
});
test('new 60 dictionary lemmas each have lemma-specific lexical source',()=>{
 const additions='zuhören zustimmen widersprechen gratulieren verzeihen gehorchen schaden fehlen schmecken passen haben brauchen suchen finden nehmen bringen trinken essen lesen schreiben hören lernen lieben mögen vergessen verstehen öffnen schließen bezahlen anrufen treffen denken hoffen teilnehmen träumen lachen nachdenken aufpassen aufhören bestehen reagieren riechen reden telefonieren freuen interessieren erinnern kümmern beschäftigen konzentrieren bedanken entschuldigen bewerben beschweren verlieben vorbereiten unterhalten verabreden bitten einladen'.split(' ');
 assert.equal(additions.length,60);
 for(const lemma of additions){const d=getRection(lemma);assert.equal(d.status,'known',lemma);assert(d.patterns.every(p=>p.sources.some(s=>s.url===`https://de.wiktionary.org/wiki/${encodeURIComponent(lemma)}`)),lemma);}
});
test('new datives are not translated mechanically from Turkish case endings',()=>{
 for(const l of ['zuhören','zustimmen','widersprechen','gratulieren','verzeihen','gehorchen','schaden','fehlen','passen'])assert.equal(getRection(l).patterns[0].complements[0].case,'Dativ',l);
 assert.equal(getRection('anrufen').patterns[0].complements[0].case,'Akkusativ');
 assert(getRection('fehlen').patterns[0].explanation.includes('öznedir'));
});
test('fixed lexical an/auf patterns do not use mechanical movement/goal selection',()=>{
 assert.equal(byPrep('denken','an')[0].complements[0].case,'Akkusativ');
 assert.equal(byPrep('teilnehmen','an')[0].complements[0].case,'Dativ');
 assert.equal(byPrep('hoffen','auf')[0].complements[0].case,'Akkusativ');
 assert.equal(byPrep('aufpassen','auf')[0].complements[0].case,'Akkusativ');
});
test('same lemma preserves genuinely different constructions',()=>{
 assert(getRection('suchen').patterns[0].pattern.includes('Akkusativ'));assert.equal(byPrep('suchen','nach')[0].complements[0].case,'Dativ');
 assert(getRection('treffen').patterns[0].pattern.startsWith('treffen'));const reflex=getRection('treffen').patterns.find(p=>p.pattern.startsWith('sich '));assert(reflex);assert(reflex.complements.some(c=>c.preposition==='mit'&&c.case==='Dativ'));
 assert.equal(byPrep('bestehen','aus')[0].complements[0].case,'Dativ');assert(getRection('bestehen').patterns.some(p=>p.pattern.includes('sınavı geçmek')&&p.complements[0].case==='Akkusativ'));
 assert.equal(getRection('schmecken').patterns[0].complements[0].case,'Dativ');assert(byPrep('schmecken','nach').length);
});
test('reflexive usage has an explicit pronoun, no accidental drop or universal valency',()=>{
 for(const lemma of ['freuen','interessieren','erinnern','kümmern','beschäftigen','konzentrieren','bedanken','entschuldigen','bewerben','beschweren','verlieben','vorbereiten','unterhalten','verabreden']){
  const r=getRection(lemma);assert(r.patterns.every(p=>p.pattern.startsWith('sich ')),lemma);assert(r.patterns.every(p=>p.complements[0].role.includes('dönüşlü')&&p.complements[0].case==='Akkusativ'),lemma);
  assert.equal(getRection('sich '+lemma).lemma,lemma);
 }
 assert.equal(getRection('sich suchen').status,'unknown');assert.equal(getRection('sich sehen').status,'unknown');
 assert.equal(byPrep('freuen','auf')[0].complements.at(-1).case,'Akkusativ');assert.equal(byPrep('freuen','über')[0].complements.at(-1).case,'Akkusativ');
});
test('optional partners/topics and transitive/intransitive contrasts stay explicit',()=>{
 for(const l of ['reden','telefonieren','lachen','träumen','aufhören'])assert(getRection(l).patterns[0].complements.some(c=>c.requirement==='optional'),l);
 for(const l of ['essen','trinken','lesen','lernen'])assert(getRection(l).patterns[0].explanation.includes('nesnesiz')||getRection(l).patterns[0].explanation.includes('nesne belirtilmeden')||getRection(l).patterns[0].explanation.includes('de mümkündür')||getRection(l).patterns[0].explanation.includes('Nesne belirtilmeden'),l);
 const bring=getRection('bringen').patterns[0];assert.equal(bring.complements.map(c=>c.case).join(','),'Dativ,Akkusativ');
 const invite=getRection('einladen').patterns[0];assert.equal(invite.complements[0].case,'Akkusativ');assert.equal(invite.complements[1].case,'Dativ');assert.equal(invite.complements[1].preposition,'zu');
});
test('unknown entries and capitalized nominalizations remain unguessed',()=>{
 for(const l of ['Haben','Schreiben','Bank','sich Unbekannt','aufschließen','__proto__','constructor']){const r=getRection(l);assert.equal(r.status,'unknown');assert.equal(r.summary,'Hâl bilgisi bulunamadı');assert.equal(r.patterns.length,0);}
});
test('existing base coverage, source values and clone isolation are preserved',()=>{
 for(const l of ['helfen','sehen','geben','mit','für','wegen','an','auf','in','warten','sprechen'])assert.equal(getRection(l).status,'known',l);
 const result=getRection('bewerben');result.patterns[0].complements[0].case='Genitiv';assert.equal(getRection('bewerben').patterns[0].complements[0].case,'Akkusativ');
 assert(getRection('widersprechen').patterns[0].sources.some(s=>s.url.includes('ids-mannheim')));
});
