import {test} from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url);
function bundled(entry,external=[]){const code=buildSync({entryPoints:[decodeURIComponent(new URL(entry,import.meta.url).pathname)],bundle:true,platform:'node',format:'cjs',write:false,external}).outputFiles[0].text;const mod={exports:{}};vm.runInNewContext(code,{module:mod,exports:mod.exports,require,console,structuredClone,URL});return mod.exports;}
const lib=bundled('../lib/knowledge-cards.ts');

test('deck includes every existing table, selected rule and known rection pattern, preserving source attribution',()=>{
 const {GRAMMAR_REFERENCE}=bundled('../lib/grammar-reference.ts'),{RULE_CATALOG}=bundled('../lib/rule-catalog.ts'),rection=bundled('../lib/rection.ts');const deck=lib.buildKnowledgeDeck();
 assert.equal(deck.filter(c=>c.kind==='table').length,GRAMMAR_REFERENCE.length);assert.equal(deck.filter(c=>c.kind==='rule').length,RULE_CATALOG.length);
 const patterns=rection.listRectionLemmas().reduce((n,lemma)=>n+rection.getRection(lemma).patterns.length,0);assert.equal(deck.filter(c=>c.kind==='rection').length,patterns);
 assert(deck.every(c=>c.kind==='table'?c.table.sources.length>0:c.kind==='rule'?c.rule.sources.length>0:c.pattern.sources.length>0));
 assert(deck.some(c=>c.kind==='table'&&c.table.rows.length));assert(deck.some(c=>c.kind==='rule'&&c.rule.counterexamples.length));assert(deck.some(c=>c.kind==='rection'&&c.pattern.example.parts.length));
});
test('filters search Turkish diacritics while retaining category boundaries',()=>{
 const deck=lib.buildKnowledgeDeck();assert(lib.filterKnowledgeDeck(deck,'Tablolar','artikel').length>0);assert.equal(lib.filterKnowledgeDeck(deck,'Rektion','warten').filter(c=>c.kind==='rection').length,2);assert.equal(lib.filterKnowledgeDeck(deck,'Kurallar','').length,deck.filter(c=>c.kind==='rule').length);
});
test('session length defaults to 20, all is bounded to supplied deck, and skip is not wrong',()=>{
 const deck=lib.buildKnowledgeDeck(),s=lib.createKnowledgeSession(deck);assert.equal(s.queue.length,Math.min(20,deck.length));assert.equal(lib.createKnowledgeSession(deck,'all').queue.length,deck.length);
 const skipped=lib.skipKnowledgeCard(s);assert.equal(skipped.skipped,1);assert.equal(skipped.attempts,0);assert.equal(skipped.missedIds.length,0);assert.equal(skipped.answeredIds.length,0);
});
test('answer assessment tracks unique cards and attempts separately; missed card revisits once after three others',()=>{
 const deck=lib.buildKnowledgeDeck().slice(0,6);let s=lib.createKnowledgeSession(deck,'all');const first=lib.currentKnowledgeCard(s);s=lib.assessKnowledgeCard(s,true);assert.equal(s.attempts,0);s=lib.revealKnowledgeAnswer(s);s=lib.assessKnowledgeCard(s,false);assert.equal(s.attempts,1);assert.deepEqual([...s.answeredIds],[first.id]);assert.equal(s.queue[4].id,first.id);
 for(let i=0;i<3;i++){s=lib.revealKnowledgeAnswer(s);s=lib.assessKnowledgeCard(s,true);}assert.equal(lib.currentKnowledgeCard(s).id,first.id);s=lib.revealKnowledgeAnswer(s);s=lib.assessKnowledgeCard(s,false);assert.equal(s.attempts,5);assert.equal(s.answeredIds.length,4);assert.equal(s.missedIds.length,1);assert.equal(s.queue.filter(c=>c.id===first.id).length,2);
});
test('defer moves the current card to the end and early finish ends the session',()=>{
 const deck=lib.buildKnowledgeDeck().slice(0,3);let s=lib.createKnowledgeSession(deck,'all');const first=s.queue[0].id;s=lib.deferKnowledgeCard(s);assert.equal(lib.currentKnowledgeCard(s).id,deck[1].id);assert.equal(s.queue.at(-1).id,first);s=lib.finishKnowledgeSession(s);assert.equal(lib.currentKnowledgeCard(s),null);
});
test('front face does not leak table cells, rule examples or rection pattern answers',()=>{
 const ui=bundled('../components/knowledge-cards.tsx',['react','react/jsx-runtime']);const React=require('react'),render=require('react-dom/server').renderToStaticMarkup;const deck=lib.buildKnowledgeDeck();
 for(const card of [deck.find(c=>c.kind==='table'),deck.find(c=>c.kind==='rule'),deck.find(c=>c.kind==='rection')]){const html=render(React.createElement(ui.KnowledgeFace,{card}));assert(html.includes(card.title));if(card.kind==='table'){assert(!html.includes(card.table.rows[0].cells[0]));}if(card.kind==='rule'){assert(!html.includes(card.rule.examples[0].de));}if(card.kind==='rection'){assert(!html.includes(card.pattern.pattern));}}
});
test('mixed practice balances topics and varies without mutating reference deck',()=>{const deck=lib.buildKnowledgeDeck(),before=deck.map(c=>c.id).join(','),order=lib.balancedKnowledgeOrder(deck,()=>.5);assert.equal(new Set(order.slice(0,6).map(c=>c.category)).size,3);assert.equal(new Set(order.map(c=>c.id)).size,deck.length);assert.equal(deck.map(c=>c.id).join(','),before);});
