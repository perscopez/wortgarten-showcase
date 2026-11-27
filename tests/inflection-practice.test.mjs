import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';import {createRequire} from 'node:module';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/inflection-practice.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL});
const {buildInflectionQuestions:build,normalizeInflectionAnswer:normalize,checkInflectionAnswer:check,updateInflectionProgress:update,buildInflectionQueue:queue,advanceInflectionQueue:advance,parseInflectionProgress:parse,isInflectionCellProgress:valid}=exports;
const data={version:1,lemma:'Haus',tables:[{title:'İsim · dört hâl',columns:['Tekil','Çoğul'],rows:[{label:'Dativ',cells:[['dem Haus','dem Hause'],['den Häusern']]},{label:'Genitiv',cells:[['des Hauses'],['der Häuser']]},{label:'Akkusativ',cells:[[],['—']]}]},{title:'Fiil · Indikativ Aktiv',columns:['Präsens','Perfekt'],rows:[{label:'ich',cells:[['gehe'],['bin gegangen']]}]},{title:'Fiil · ek biçimler (kaynakta varsa)',columns:['Kaynakta verilen'],rows:[{label:'Imperativ Singular',cells:[['geh','gehe']]}]},{title:'Sıfat · karşılaştırma',columns:['Kaynakta verilen'],rows:[{label:'Komparativ',cells:[['besser']]}]}],sources:[{label:'Wiktionary · Haus',url:'https://de.wiktionary.org/wiki/Haus'}],license:{label:'CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'},warnings:[]};
const cards=[{id:'card-a',word:'Haus',inflections:data}];const all=()=>build(cards,'advanced');
test('source-only cells cover noun/person/adjective; Genitiv and extra forms are advanced',()=>{
 const basic=build(cards);assert.equal(basic.length,5);assert.equal(all().length,8);assert(!basic.some(q=>q.row==='Genitiv'||q.tableTitle.includes('ek biçimler')));assert(all().some(q=>q.advanced&&q.row==='Genitiv'));assert(basic.some(q=>q.row==='Komparativ'));assert(basic.some(q=>q.row==='ich'&&q.column==='Perfekt'));
 assert.equal(basic[0].answers.join('|'),'dem Haus|dem Hause');assert(!basic.some(q=>q.answers.some(a=>a==='—')));
});
test('no generated data, article stripping or loss of umlauts; all recorded alternatives accepted',()=>{
 const q=build(cards)[0];assert(check(q,' DEM   HAUSE '));assert(check(q,'dem haus'));assert(!check(q,'Haus'));assert(!check(q,''));assert.equal(normalize('  HA\u0308USERN  '),'häusern');
 const pl=build(cards).find(q=>q.answers[0]==='den Häusern');assert(check(pl,'DEN HÄUSERN'));assert(!check(pl,'den Hausern'));assert(!check(pl,'den Haeusern'));
});
test('missing/manual/unattributed/complex cells are skipped without guessing',()=>{
 assert.equal(build([{id:'empty',word:'Haus'}]).length,0);assert.equal(build([{...cards[0],inflections:{...data,edited:true}}]).length,0);
 assert.equal(build([{...cards[0],inflections:{...data,sources:[]}}]).length,0);assert.equal(build([{...cards[0],inflections:{...data,license:{label:'bad',url:'javascript:alert(1)'}}}]).length,0);
 const complex={...data,tables:[{title:'Fiil',columns:['Präsens'],rows:[{label:'du',cells:[['machst / veraltet: du machest']]}]}]};assert.equal(build([{...cards[0],inflections:complex}]).length,0);
});
test('question keys survive card ID changes, deduplicate same skill, reset after changed answer key',()=>{
 const before=JSON.stringify(cards);const a=build(cards)[0],b=build([{...cards[0],id:'restored-new-id'}])[0];assert.equal(a.id,b.id);assert.equal(a.signature,b.signature);
 assert.equal(build([...cards,{...cards[0],id:'duplicate'}]).length,build(cards).length);
 const changed=structuredClone(cards);changed[0].inflections.tables[0].rows[0].cells[0]=['dem Gebäude'];const c=build(changed)[0];assert.notEqual(a.id,c.id);assert.notEqual(a.signature,c.signature);
 assert.equal(JSON.stringify(cards),before);
});
test('alternatives reordered do not reset skill but unrelated labels do',()=>{
 const changed=structuredClone(cards);changed[0].inflections.tables[0].rows[0].cells[0].reverse();assert.equal(build(cards)[0].id,build(changed)[0].id);
 changed[0].inflections.tables[0].rows[0].label='anderer Kontext';assert.notEqual(build(cards)[0].id,build(changed)[0].id);
});
test('SRS advances only across due distinct days with 1/3/7/14/30 spacing',()=>{
 const q=build(cards)[0];let p=update(undefined,q,true,'2026-10-25');assert.equal(p.intervalIndex,0);assert.equal(p.dueDay,'2026-10-26');assert.equal(p.dayStreak,1);
 const repeat=update(p,q,true,'2026-10-25');assert.equal(repeat.intervalIndex,0);assert.equal(repeat.dueDay,'2026-10-26');assert.equal(repeat.dayStreak,1);
 p=update(repeat,q,true,'2026-10-26');assert.equal(p.intervalIndex,1);assert.equal(p.dueDay,'2026-10-29');assert.equal(p.dayStreak,2);
 const early=update(p,q,true,'2026-10-27');assert.equal(early.intervalIndex,1);assert.equal(early.dayStreak,2);assert.equal(early.lastSuccessDay,'2026-10-26');assert.equal(early.dueDay,'2026-10-29');
 p=update(early,q,true,'2026-10-29');assert.equal(p.intervalIndex,2);assert.equal(p.dueDay,'2026-11-05');assert.equal(p.dayStreak,3);
 p=update(p,q,true,'2026-11-05');assert.equal(p.dueDay,'2026-11-19');p=update(p,q,true,'2026-11-19');assert.equal(p.dueDay,'2026-12-19');p=update(p,q,true,'2026-12-19');assert.equal(p.intervalIndex,4);assert.equal(p.dueDay,'2027-01-18');
});
test('wrong answer resets mastery; same-day recovery cannot restore spaced streak',()=>{
 const q=build(cards)[0];let p=update(undefined,q,true,'2026-10-25');p=update(p,q,true,'2026-10-26');p=update(p,q,false,'2026-10-26');assert.equal(p.dayStreak,0);assert.equal(p.intervalIndex,-1);assert.equal(p.dueDay,'2026-10-26');
 p=update(p,q,true,'2026-10-26');assert.equal(p.dayStreak,0);assert.equal(p.intervalIndex,0);assert.equal(p.dueDay,'2026-10-27');p=update(p,q,true,'2026-10-27');assert.equal(p.dayStreak,1);assert(valid(p));
});
test('wrong queue reinsert happens after two other cells; no mutation',()=>{
 const ids=['a','b','c','d'];assert.equal(advance(ids,false).join(','),'b,c,a,d');assert.equal(advance(ids,true).join(','),'b,c,d');assert.equal(ids.join(','),'a,b,c,d');assert.equal(advance(['a'],false).join(','),'a');
});
test('queue prioritizes last-wrong and respects due date unless early practice requested',()=>{
 const qs=build(cards);const progress={};progress[qs[0].id]=update(undefined,qs[0],true,'2026-10-25');progress[qs[2].id]=update(undefined,qs[2],false,'2026-10-25');
 const due=queue(qs,progress,'2026-10-25');assert.equal(due[0],qs[2].id);assert(!due.includes(qs[0].id));assert(queue(qs,progress,'2026-10-25',true).includes(qs[0].id));
});
test('signature mismatch/corrupt imported state resets skill and cannot imply mastery',()=>{
 const q=build(cards)[0];const p=update(undefined,q,true,'2026-10-25');const stale={...p,signature:'other answer',dayStreak:0};const fresh=update(stale,q,true,'2026-10-25');assert.equal(fresh.attempts,1);assert.equal(fresh.dayStreak,1);
 assert(queue([q],{[q.id]:stale},'2026-10-25').includes(q.id));assert.equal(update({...p,correct:NaN},q,true,'2026-10-25').attempts,1);
 assert.equal(parse(JSON.stringify({version:1,progress:{[q.id]:p}})).valid,true);assert.equal(parse('broken').valid,false);assert.equal(parse('{"version":1,"progress":[]}').valid,false);assert.equal(parse(JSON.stringify({version:1,progress:{[q.id]:{...p,dueDay:'2026-02-30'}}})).valid,false);assert.equal(parse(null).valid,true);
});
test('answer/source is absent from unrevealed rendered DOM and present only after reveal',()=>{
 const require=createRequire(import.meta.url),component={};const customRequire=name=>name==='../lib/inflection-practice'?exports:require(name);
 const js=ts.transpileModule(fs.readFileSync(new URL('../components/inflection-practice.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(js,{exports:component,require:customRequire});
 const question=build(cards)[0],props={question,typed:'',onType:()=>{},result:null,onSubmit:()=>{},onReveal:()=>{},onNext:()=>{}};const render=p=>require('react-dom/server').renderToStaticMarkup(require('react').createElement(component.InflectionQuestionView,p));
 const front=render(props);assert(!front.includes('dem Haus'));assert(!front.includes('wiktionary.org'));assert(!front.includes('CC BY-SA'));
 const back=render({...props,result:false});assert(back.includes('dem Haus / dem Hause'));assert(back.includes('wiktionary.org'));assert(back.includes('CC BY-SA'));
});
