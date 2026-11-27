import {test} from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';import vm from 'node:vm';import fs from 'node:fs';
const require=createRequire(import.meta.url);
function bundled(entry,external=[]){const code=buildSync({entryPoints:[decodeURIComponent(new URL(entry,import.meta.url).pathname)],bundle:true,platform:'node',format:'cjs',write:false,external}).outputFiles[0].text;const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require,console,structuredClone,URL});return module.exports;}
const t=bundled('../lib/table-recall.ts');const {buildRecallTables,normalizeTableRecallAnswer:normalize,checkTableRecallAnswer:check,selectTableRecallRound:select,recordTableRecallRound:record,parseTableRecallValue:parse,nextTableRecallDue:nextDue,persistTableRecallProgress:persist,TABLE_RECALL_KEY:KEY}=t;
const tables=buildRecallTables(),def=tables.find(t=>t.id==='definite');const first=def.cells[0];
test('ten allowlisted paradigms yield exact form cells, excluding prose and verb prompts with identical answers',()=>{
 assert.equal(tables.length,10);assert.equal(tables.reduce((n,t)=>n+t.cells.length,0),196);assert.equal(tables.map(t=>t.id).sort().join(','),'definite,demonstrative-dies,indefinite,interrogative-welch,kein,modal-past,personal-pronouns,possessive-declension,reflexive,stem-change');
 assert.equal(tables.find(t=>t.id==='indefinite').cells.length,12);for(const table of tables)for(const c of table.cells){assert(c.context);assert(c.rowLabel);assert(c.columnLabel);assert(c.answers.length);assert(c.sources.every(s=>s.url.startsWith('https://')));assert(!c.answers.includes('∅'));assert(c.answers.every(a=>!/[.;]|\bIch\b/.test(a)));}
 const nominal=def.cells.find(c=>c.rowLabel==='Dativ'&&c.columnLabel.includes('Maskulin'));assert.equal(nominal.answers[0],'dem');assert(nominal.context.includes('tekil'));
 const p=tables.find(t=>t.id==='personal-pronouns').cells.find(c=>c.rowLabel==='sen'&&c.columnLabel==='Dativ');assert.equal(p.answers[0],'dir');assert(p.context.includes('kişi'));
});
test('NFC/space/case normalization preserves umlaut and ß distinctions and source alternatives',()=>{
 assert.equal(normalize('  MU\u0308SST  '),'müsst');assert.notEqual(normalize('schön'),normalize('schon'));assert.notEqual(normalize('Maße'),normalize('Masse'));assert(check(first,first.answers[0].toUpperCase()));assert(!check(first,''));assert(check({...first,answers:['dem Haus','dem Hause']},' DEM   HAUSE '));
});
test('no source mutation; signature changes with answer/context, not table order',()=>{
 const before=JSON.stringify(tables);const reference=bundled('../lib/grammar-reference.ts').GRAMMAR_REFERENCE;const clone=structuredClone(reference);clone.find(t=>t.id==='definite').rows[0].cells[0]='geändert';const changed=buildRecallTables(clone).find(t=>t.id==='definite').cells[0];assert.notEqual(changed.id,first.id);assert.notEqual(changed.signature,first.signature);assert.equal(buildRecallTables([...reference].reverse()).find(t=>t.id==='definite').cells[0].id,first.id);assert.equal(JSON.stringify(tables),before);
});
test('first round has one blank, scaffolds to three; full-table only after every cell has spaced evidence',()=>{
 const p={};assert.equal(select(def,p,{day:'2026-10-25'}).cells.length,1);
 let progress=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');assert.equal(select(def,progress,{day:'2026-10-25'}).cells.length,3);
 for(const c of def.cells){progress=record(progress,[c],{[c.id]:c.answers[0]},{hint:false,reveal:false},'2026-10-26');progress=record(progress,[c],{[c.id]:c.answers[0]},{hint:false,reveal:false},'2026-10-29');}
 const full=select(def,progress,{day:'2026-11-05'});assert.equal(full.mode,'full');assert.equal(full.cells.length,5);assert(full.cells.every(c=>c.tableId===def.id));
});
test('1/3/7/14/30 spaced SRS never advances same-day or early success',()=>{
 let p=record({},[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');assert.equal(p[first.id].dueDay,'2026-10-26');assert.equal(p[first.id].recallDays,1);
 p=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');assert.equal(p[first.id].recallDays,1);assert.equal(p[first.id].dueDay,'2026-10-26');
 p=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-26');assert.equal(p[first.id].dueDay,'2026-10-29');p=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-27');assert.equal(p[first.id].recallDays,2);assert.equal(p[first.id].dueDay,'2026-10-29');
 for(const [day,due] of [['2026-10-29','2026-11-05'],['2026-11-05','2026-11-19'],['2026-11-19','2026-12-19']]){p=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},day);assert.equal(p[first.id].dueDay,due);}
});
test('hint/reveal/wrong are tracked separately, cannot become unassisted mastery through repetition',()=>{
 let p=record({},[first],{[first.id]:first.answers[0]},{hint:true,reveal:false},'2026-10-25');assert.equal(p[first.id].assistedCorrect,1);assert.equal(p[first.id].unassistedCorrect,0);assert.equal(p[first.id].recallDays,0);assert.equal(p[first.id].hints,1);assert.equal(p[first.id].dueDay,'2026-10-26');
 p=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');assert.equal(p[first.id].recallDays,0);
 p=record(p,[first],{[first.id]:first.answers[0]},{hint:false,reveal:true},'2026-10-26');assert.equal(p[first.id].revealed,1);assert.equal(p[first.id].lastOutcome,'revealed');assert.equal(p[first.id].recallDays,0);
 p=record(p,[first],{[first.id]:'yanlış'},{hint:false,reveal:false},'2026-10-27');assert.equal(p[first.id].wrong,1);assert.equal(p[first.id].dueDay,'2026-10-28');assert.equal(p[first.id].intervalIndex,-1);
});
test('new cells create no notification due; learned current signatures do, stale ones do not',()=>{
 assert.equal(nextDue({}),null);const p=record({},[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');assert.equal(nextDue(p),new Date(2026,9,26).getTime());assert.equal(nextDue({[first.id]:{...p[first.id],signature:'old-content'}}),null);
});
test('versioned strict parsing preserves valid state and refuses corruption without treating it as empty',()=>{
 assert.equal(parse(null).valid,true);const p=record({},[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');assert.equal(parse({version:1,progress:p}).valid,true);for(const value of [{version:2,progress:p},{version:1,progress:[]},{version:1,progress:{[first.id]:{...p[first.id],correct:99,attempts:0}}},{version:1,progress:{[first.id]:{...p[first.id],dueDay:'2026-02-30'}}}])assert.equal(parse(value).valid,false);
});
test('persist commits through supplied shared adapter and propagates errors, with no input mutation',async()=>{
 const p=record({},[first],{[first.id]:first.answers[0]},{hint:false,reveal:false},'2026-10-25');let stored;await persist(p,async(key,value)=>{assert.equal(key,KEY);stored=value});assert.equal(stored.version,1);assert.equal(stored.progress[first.id].attempts,1);await assert.rejects(()=>persist(p,async()=>{throw Error('quota')}),/quota/);assert.equal(p[first.id].attempts,1);
});
test('masked cells do not put source answers in their input DOM; full reveal provides correction and attribution',()=>{
 // Component is bundled only after parent-provided shared storage/quota modules exist.
 const ui=bundled('../components/table-recall.tsx',['react','react/jsx-runtime']);const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;const target=def.cells.find(c=>c.answers[0]==='dem');const props={table:def,masked:[target],values:{},onChange:()=>{},results:null,disabled:false};
 const front=render(React.createElement(ui.RecallTableGrid,props));assert(front.includes('aria-label="'+target.context.replace(/&/g,'&amp;')+'"'));assert(!front.includes('value="dem"'));assert(!front.includes('data-answer'));assert(!front.includes('Wiktionary'));
 const back=render(React.createElement(ui.RecallTableGrid,{...props,results:{[target.id]:'wrong'}}));assert(back.includes('dem'));assert(back.includes('Doğru biçim'));
});

test('person/number labels are explicit, while nominal gender headers do not disclose source nominative articles',()=>{
 assert.equal(def.columns[0],'Maskulin · tekil');assert(!def.columns[0].includes('der'));
 const pronoun=tables.find(t=>t.id==='personal-pronouns').cells.find(c=>c.rowLabel==='sen'&&c.columnLabel==='Dativ');assert(pronoun.context.includes('2. kişi'));assert(pronoun.context.includes('tekil'));assert(pronoun.context.includes('Dativ'));
});
test('future full-table pages stay concealed; failed/assisted first encounter keeps one-blank scaffold',()=>{
 const ui=bundled('../components/table-recall.tsx',['react','react/jsx-runtime']);const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;const table=tables.find(t=>t.id==='possessive-declension');
 const front=render(React.createElement(ui.RecallTableGrid,{table,masked:table.cells.slice(0,12),concealed:table.cells,values:{},onChange:()=>{},results:null,disabled:false}));assert(!front.includes('meines'));assert(!front.includes('meinem'));assert(front.includes('Başka bölümde doldurulacak hücre'));
 const p=record({},[first],{[first.id]:'yanlış'},{hint:false,reveal:false},'2026-10-25');assert.equal(select(def,p,{day:'2026-10-25'}).cells.length,1);
});
test('same committed page token is idempotent on crash/retry',()=>{const opts={hint:false,reveal:false,attemptToken:'round:0'},values={[first.id]:first.answers[0]};const once=record({},[first],values,opts,'2026-10-27');const twice=record(once,[first],values,opts,'2026-10-27');assert.equal(twice[first.id].attempts,1);assert.equal(twice[first.id].lastAttemptToken,'round:0');});

test('full mode respects due-only rank and maxCells, never expands to all mastered cells',()=>{let p={};for(const c of def.cells){p=record(p,[c],{[c.id]:c.answers[0]},{hint:false,reveal:false},'2026-10-20');p=record(p,[c],{[c.id]:c.answers[0]},{hint:false,reveal:false},'2026-10-21');}for(const c of def.cells)p[c.id]={...p[c.id],dueDay:'2026-11-20'};p[def.cells[0].id].dueDay='2026-10-29';p[def.cells[1].id].dueDay='2026-10-29';const limited=select(def,p,{day:'2026-10-29',maxCells:1});assert.equal(limited.mode,'full');assert.equal(limited.cells.length,1);assert.equal(limited.cells[0].id,def.cells[0].id);assert.equal(select(def,p,{day:'2026-10-29',maxCells:10}).cells.length,2);assert.equal(select(def,p,{day:'2026-10-29',maxCells:0}).cells.length,0);assert.equal(select(def,p,{day:'2026-10-29',maxCells:NaN}).cells.length,0);assert.equal(select(def,p,{day:'2026-10-29',maxCells:10,includeEarly:true}).cells.length,10);});

test('fixed session pool is bounded before skips; scaffold cannot pull in unseen extra slots',()=>{const pool=select(def,{}, {day:'2026-10-29',maxCells:5,scaffold:false}).cells;assert.equal(pool.length,5);const excluded=new Set();let shown=0;while(true){const round=select({...def,cells:pool.filter(c=>!excluded.has(c.id))},{},{day:'2026-10-29',maxCells:5});if(!round.cells.length)break;for(const c of round.cells){shown++;excluded.add(c.id);}}assert.equal(shown,5);assert.equal(excluded.size,5);});

test('partial table does not print another cell that gives the active answer away',()=>{
 const ui=bundled('../components/table-recall.tsx',['react','react/jsx-runtime']);const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
 const target=def.cells.find(c=>c.answers[0]==='die');const props={table:def,masked:[target],values:{},onChange:()=>{},disabled:false};
 const front=render(React.createElement(ui.RecallTableGrid,{...props,results:null}));assert(!/>die</i.test(front));
 const back=render(React.createElement(ui.RecallTableGrid,{...props,results:{[target.id]:'revealed'}}));assert(/>die</i.test(back));
});
