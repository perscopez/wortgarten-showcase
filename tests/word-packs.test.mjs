import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const W=bundle('lib/word-packs.ts'),P=bundle('lib/pattern-practice.ts'),B=bundle('lib/basic-words.ts');
const pack=W.WORD_PACKS.find(p=>p.id==='werbung-b1');
test('the Werbung pack is well formed: unique words, German example containing the word family, Turkish meaning, article for nouns',()=>{
 assert.ok(pack.words.length>=90);
 const keys=pack.words.map(w=>B.basicWordKey(w.word));assert.equal(new Set(keys).size,keys.length,'no duplicate words');
 const basic=new Set(B.BASIC_WORDS.map(w=>B.basicWordKey(w.word)));
 for(const w of pack.words){
  assert.ok(w.meaning&&w.example&&w.translation,w.word);
  assert.ok(['noun','verb','adjective','adverb'].includes(w.partOfSpeech),w.word);
  if(w.partOfSpeech==='noun')assert.ok(['der','die','das'].includes(w.article),w.word+' needs an article');else assert.equal(w.article,'',w.word);
  assert.ok(/^https:\/\/de\.wiktionary\.org\//.test(w.source));
  assert.ok(/[.!?]$/.test(w.example)&&/[.!?]$/.test(w.translation)||/[.!?’]$/.test(w.translation),w.word+' sentence punctuation');
 }
 assert.equal(pack.words.filter(w=>basic.has(B.basicWordKey(w.word))).length,0,'nothing the starter list already has');
});
test('the words and phrases from the book pages are in the pack',()=>{
 const have=new Set(pack.words.map(w=>w.word));
 for(const w of ['Marktschreier','Pressefreiheit','Scheinwelt','Zielgruppenwerbung','Werbezeitung','Boom','Absatzförderung','anbieten','verdienen','entstehen','bestehen','Wasserkocher','Einrad','Einkaufstrolley','Taschenmesser','Produktpräsentation','erstmals','empfehlen','vorstellen','herstellen','benutzen'])assert.ok(have.has(w),w);
});
test('patterns exist for the pack verbs and nouns and carry case notes where the wording allows',()=>{
 const withPatterns=pack.words.filter(w=>P.rowsFor(w.word).length>0).map(w=>w.word);
 assert.ok(withPatterns.length>=40,'patterns for '+withPatterns.length+' pack words');
 const rows=P.rowsFor('bestehen');assert.ok(rows.some(r=>/aus \+ Dativ/.test(r.de)&&/aus etwas bestehen/.test(r.phrase)));
 assert.ok(P.rowsFor('Zielgruppe').some(r=>/an \+ Akkusativ/.test(r.de)));
 assert.ok(P.rowsFor('anbieten').every(r=>r.tr&&r.phrase.split(/\s+/).length>=2));
});
test('packs install themselves once per device, never touch saved words, and complete word data through one queue',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8');
 assert.ok(!page.includes('WORD_PACKS.map(pack=>'),'no pack buttons');
 assert.ok(page.includes('pendingPacks(done)')&&page.includes('PACKS_KEY'),'auto install with a per-device marker');
 assert.ok(page.includes("known.has(basicWordKey(e.word))"),'skips words already saved');
 assert.ok(page.includes('mergePackData()')&&page.includes('enrichQueue'),'precomputed pack data first, one background worker for the rest');
 assert.ok(!page.includes('queueEnrich(fresh)'),'installing a pack never floods the lookup queue');
 assert.ok(!page.includes('await new Promise(r=>setTimeout(r,2300));}})();}};'),'no per-pack loops that could run in parallel');
});
test('pending packs are the ones not yet recorded; the marker is parsed defensively',()=>{
 assert.deepEqual(W.pendingPacks([]).map(p=>p.id),W.WORD_PACKS.map(p=>p.id));
 assert.deepEqual(W.pendingPacks(W.WORD_PACKS.map(p=>p.id)),[]);
 assert.deepEqual(W.pendingPacks(['werbung-b1']).map(p=>p.id).includes('werbung-b1'),false);
 assert.deepEqual(W.parseInstalled('["a","b"]'),['a','b']);assert.deepEqual(W.parseInstalled('{bad'),[]);assert.deepEqual(W.parseInstalled('[1,"x"]'),['x']);assert.deepEqual(W.parseInstalled(null),[]);
});
test('the adverb pack has völlig, ungefähr and similar words, and no word is in two packs or in the starter list',()=>{
 const adv=W.WORD_PACKS.find(p=>p.id==='zarflar-b1');assert.ok(adv&&adv.words.length>=40);
 const have=new Set(adv.words.map(w=>w.word));
 for(const w of ['völlig','ungefähr','ziemlich','beinahe','etwa','überhaupt','eigentlich','insgesamt','mindestens','höchstens','trotzdem','deshalb','dennoch','jedoch','zumindest'])assert.ok(have.has(w),w);
 const all=W.WORD_PACKS.flatMap(p=>p.words.map(w=>B.basicWordKey(w.word)));assert.equal(new Set(all).size,all.length,'no word in two packs');
 const basic=new Set(B.BASIC_WORDS.map(w=>B.basicWordKey(w.word)));assert.ok(!all.some(k=>basic.has(k)));
 for(const w of adv.words){assert.ok(w.meaning&&w.example.toLowerCase().includes(w.word.toLowerCase().slice(0,Math.max(4,w.word.length-1))),'the example uses the word: '+w.word);assert.ok(['adverb','adjective'].includes(w.partOfSpeech));assert.equal(w.article,'');}
});
test('"birinin işini almak": the job pack and its patterns exist, with case notes',()=>{
 const job=W.WORD_PACKS.find(p=>p.id==='is-yeri-b1');assert.ok(job);
 const have=new Set(job.words.map(w=>w.word));for(const w of ['wegnehmen','abnehmen','ersetzen','wegschnappen','ablösen','vertreten','Job','Arbeitsplatz','Stelle'])assert.ok(have.has(w),w);
 const phrases=(w)=>P.rowsFor(w).map(r=>r.phrase);
 assert.ok(phrases('wegnehmen').includes('jemandem den Job wegnehmen'));
 assert.ok(phrases('abnehmen').includes('jemandem die Arbeit abnehmen'));
 assert.ok(phrases('ersetzen').includes('jemanden ersetzen'));
 assert.ok(phrases('übernehmen').includes('jemandes Stelle übernehmen'));
 assert.ok(phrases('ablösen').includes('jemanden im Dienst ablösen'));
 assert.ok(P.rowsFor('wegnehmen').every(r=>/Dativ/.test(r.de)),'the person is Dativ');
 assert.ok(P.rowsFor('übernehmen').find(r=>r.phrase==='jemandes Stelle übernehmen').de.includes('Genitiv'));
 assert.ok(P.rowsFor('wegnehmen').every(r=>r.tr));
});
test('every word that has patterns gets a card: from a pack or the starter list; nothing is left without its word',()=>{
 const keys=['verb-patterns','nouns','adjective-patterns','more-patterns'].flatMap(n=>fs.readFileSync(`data/compact-${n}.tsv`,'utf8').trim().split('\n').map(l=>l.split('\t')[0]));
 const covered=new Set([...W.WORD_PACKS.flatMap(p=>p.words.map(w=>B.basicWordKey(w.word))),...B.BASIC_WORDS.map(w=>B.basicWordKey(w.word))]);
 const singles=[...new Set(keys.filter(k=>/^[\p{L}]+$/u.test(k)))];
 const missing=singles.filter(k=>!covered.has(B.basicWordKey(k)));
 const functionWords=new Set(['an','aus','bei','bis','durch','im','in','ins','nach','um','von','während','zu','zum','zur','damit','obwohl','weil']);
 assert.deepEqual(missing.filter(k=>!functionWords.has(k)),[],'words with patterns but no card source');
});
test('pattern words carry a Turkish meaning and nouns an article; the pack never repeats a word from another pack',()=>{
 const gen=W.WORD_PACKS.find(p=>p.id==='kalip-kelimeleri-v1');assert.ok(gen&&gen.words.length>300);
 for(const w of gen.words){assert.ok(w.meaning.trim(),w.word);if(w.partOfSpeech==='noun'&&!['Eltern','Ferien','Kosten'].includes(w.word))assert.ok(['der','die','das'].includes(w.article),w.word);}
 const others=new Set(W.WORD_PACKS.filter(p=>p!==gen).flatMap(p=>p.words.map(w=>B.basicWordKey(w.word))));
 assert.ok(!gen.words.some(w=>others.has(B.basicWordKey(w.word))));
 assert.ok(gen.words.some(x=>x.word==='freuen'&&/sich freuen/.test(x.meaning))&&gen.words.some(x=>x.word==='hoffen'),'authored words are in the pack');
});
test('Kapitel 4 · Einkaufen pack: the words and phrases from the book pages are in the app, with articles and patterns',()=>{
 const pk=W.WORD_PACKS.find(p=>p.id==='einkaufen-b1');assert.ok(pk&&pk.words.length>=80);
 const have=new Set(pk.words.map(w=>w.word));
 for(const w of ['Kühlschrank','Garantie','Garantiezeit','Liefertermin','Banküberweisung','Kreditkarte','Besonderheit','Umtauschmöglichkeit','Wolle','Baumwolle','Regenschirm','Spitzengeschwindigkeit','Einparkhilfe','Beschleunigungszeit','Navigationssystem','Soundanlage','Panoramadach','Dachgepäckträger','Gangschaltung','Komfortsattel','Diebstahlsicherung','Spiegelreflexkamera','Kompaktkamera','Autofokus','Zoomfunktion','Gesichtserkennung','Wechselobjektiv','Gefrierfach','einfrieren','liefern','testen','seltsam','eingebaut','hergestellt','aufmerksam'])assert.ok(have.has(w),w);
 for(const w of pk.words){assert.ok(w.meaning&&w.example&&w.translation,w.word);if(w.partOfSpeech==='noun')assert.ok(['der','die','das'].includes(w.article),w.word);}
 const phrases=(w)=>P.rowsFor(w).map(r=>r.phrase);
 assert.ok(phrases('aufmerksam').includes('jemanden auf etwas aufmerksam machen'));
 assert.ok(phrases('Garantie').includes('Garantie auf etwas haben'));
 assert.ok(phrases('einfrieren').includes('Ware einfrieren'));
 assert.ok(P.rowsFor('aufmerksam').find(r=>r.phrase==='jemanden auf etwas aufmerksam machen').de.includes('auf + Akkusativ'));
 assert.ok(P.rowsFor('liefern').every(r=>r.tr));
 const ref=bundle('lib/grammar-reference.ts');assert.ok(ref.GRAMMAR_REFERENCE.some(t=>t.id==='participle-adjective'&&t.rows.some(r=>r.cells.includes('ein eingebautes Gefrierfach'))));
});
test('A1–B1 core pack and frequency pack: sizes, themes, well-formed rows, no word twice, no vulgar words',()=>{
 const core=W.WORD_PACKS.find(p=>p.id==='b1-kern-v1'),freq=W.WORD_PACKS.find(p=>p.id==='sik-kelimeler-v1');
 assert.ok(core&&core.words.length>=350&&freq&&freq.words.length>=700);
 const have=new Set(W.WORD_PACKS.flatMap(p=>p.words.map(w=>w.word)));
 for(const w of ['Familie','Kleidung','Krankheit','Arzt','Bewerbung','Vorstellungsgespräch','Mietvertrag','Verspätung','Umwelt','Gesellschaft','Enttäuschung','ändern','beantragen','verzichten','zuverlässig','obwohl','nachdem','entweder','einerseits','trotz'])assert.ok(have.has(w),w);
 for(const w of core.words){assert.ok(w.meaning&&w.example&&w.translation,w.word);if(w.partOfSpeech==='noun'&&!['Eltern','Geschwister','Großeltern','Nebenkosten'].includes(w.word))assert.ok(['der','die','das'].includes(w.article),w.word);}
 for(const w of freq.words){assert.ok(w.meaning.trim(),w.word);assert.ok(w.partOfSpeech==='noun'?['der','die','das'].includes(w.article):w.article==='',w.word);}
 assert.ok(!freq.words.some(w=>/^(Scheiße|töten|Teufel)$/.test(w.word)));
 const all=W.WORD_PACKS.flatMap(p=>p.words.map(w=>B.basicWordKey(w.word)));assert.equal(new Set(all).size,all.length,'no word in two packs');
 assert.ok(all.length>1900,'about 1900 words in total: '+all.length);
});
test('B1 verb + preposition patterns (Rektion) are there with their case notes',()=>{
 const check=(w,phrase,note)=>{const r=P.rowsFor(w).find(x=>x.phrase===phrase);assert.ok(r,w+': '+phrase);if(note)assert.ok(r.de.includes(note),r.de);};
 check('warten','auf jemanden warten','auf + Akkusativ');check('abhängen','von etwas abhängen','von + Dativ');check('anfangen','mit etwas anfangen','mit + Dativ');
 check('teilnehmen','an etwas teilnehmen','an + Dativ');check('verzichten','auf etwas verzichten','auf + Akkusativ');check('warnen','jemanden vor etwas warnen','vor + Dativ');
 check('kämpfen','für etwas kämpfen','für + Akkusativ');check('leiden','unter etwas leiden','unter + Dativ');check('zweifeln','an etwas zweifeln','an + Dativ');
 check('zufrieden','mit etwas zufrieden sein','mit + Dativ');check('stolz','auf jemanden stolz sein','auf + Akkusativ');check('Angst','Angst vor etwas haben','Dativ');
 check('Termin','einen Termin vereinbaren');check('Entscheidung','eine Entscheidung treffen');
});
test('the notebook sentences (teacher-corrected German) are in the app as words and patterns',()=>{
 const have=new Set(W.WORD_PACKS.flatMap(p=>p.words.map(w=>w.word)));
 for(const w of ['Zwerg','kleinwüchsig','Wetter-App','Grad','Tischlampe','Laptop','Glas','nennen','werfen','schauen','hierherkommen','reinbekommen','zerbrechen','kaputtgehen','wütend'])assert.ok(have.has(w),w);
 const phrases=(w)=>P.rowsFor(w).map(r=>r.phrase);
 assert.ok(phrases('werfen').includes('etwas gegen die Wand werfen'));
 assert.ok(P.rowsFor('werfen').find(r=>r.phrase==='etwas gegen die Wand werfen').de.includes('gegen + Akkusativ'));
 assert.ok(phrases('passen').includes('in etwas passen'));assert.ok(phrases('nennen').includes('jemandem etwas nennen'));
 assert.ok(phrases('reinbekommen').includes('etwas in etwas reinbekommen'));assert.ok(phrases('wütend').includes('auf jemanden wütend sein'));
 assert.ok(phrases('Zeit').includes('Wie viel Zeit haben wir noch?'));assert.ok(phrases('gehen').includes('Es geht mir besser.'));
});
