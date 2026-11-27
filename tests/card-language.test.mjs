import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
const bundle=(entry,extra={})=>{const box={module:{exports:{}},exports:{},require,URL,...extra};vm.runInNewContext(buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime','lucide-react'],write:false,loader:{'.json':'json'}}).outputFiles[0].text,box);return box.module.exports;};
const turkish={localStorage:{getItem:()=>'tr'}};
const meanings=JSON.parse(fs.readFileSync(new URL('../lib/german-meanings.json',import.meta.url),'utf8')).words;
const gm=bundle('lib/german-meaning.ts');

test('the card language defaults to German and only an explicit choice switches to Turkish',()=>{
 const {normalizeCardLanguage}=bundle('lib/card-language.ts');
 for(const v of [null,undefined,'','de','en','TR'])assert.equal(normalizeCardLanguage(v),'de',String(v));
 assert.equal(normalizeCardLanguage('tr'),'tr');
});
test('every word in the built-in packs has a German explanation',()=>{
 const src=`import {WORD_PACKS} from './lib/word-packs';import {BASIC_WORDS} from './lib/basic-words';import daily from './lib/daily-new-words.json';import reviewed from './lib/reviewed-lexicon.json';
 module.exports=[...WORD_PACKS.flatMap(p=>p.words),...BASIC_WORDS,...Object.values(daily),...Object.values(reviewed)].map(w=>w.word);`;
 const box={module:{exports:{}},exports:{},require,URL};vm.runInNewContext(buildSync({stdin:{contents:src,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}}).outputFiles[0].text,box);
 const words=[...new Set(box.module.exports)];assert(words.length>2000,String(words.length));
 const missing=words.filter(w=>!gm.findGermanMeaning(meanings,w));assert.deepEqual(missing,[]);
 for(const [word,text] of Object.entries(meanings)){assert(text.length>=4&&text.length<=200,word);assert(!/[ğışİ]/.test(text),'Turkish letters in '+word);}
});
test('lookups ignore the article and letter case',()=>{
 assert.equal(gm.findGermanMeaning(meanings,'das Haus'),meanings.Haus);
 assert.equal(gm.findGermanMeaning(meanings,'haus'),meanings.Haus);
 assert.equal(gm.findGermanMeaning(meanings,'Zzzwort'),'');
});
test('Wiktionary senses are read from the Bedeutungen block only, without markup',()=>{
 const clean=s=>s.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\{\{[^{}]*\}\}/g,'').replace(/'{2,}/g,'').trim();
 const section=`{{Wortart|Substantiv|Deutsch}}\n{{Bedeutungen}}\n:[1] {{K|Architektur}} [[Gebäude]], in dem [[Mensch]]en wohnen\n:[1a] Unterbedeutung\n:[2] ''übertragen:'' alle [[Bewohner]] eines Hauses\n:[3] dritte Bedeutung\n\n{{Herkunft}}\n:[1] althochdeutsch hūs`;
 assert.equal(gm.parseGermanMeanings(section,clean),'Gebäude, in dem Menschen wohnen; übertragen: alle Bewohner eines Hauses');
 assert.equal(gm.parseGermanMeanings('{{Herkunft}}\n:[1] x',clean),'');
});
test('the reverse side hides the answer word inside its explanation',()=>{
 assert.equal(gm.maskWord('Haus, in dem eine Familie wohnt; Hausnummer','Haus'),'…, in dem eine Familie wohnt; …');
 assert.equal(gm.maskWord('mit den Händen festhalten','fangen'),'mit den Händen festhalten');
});
const data={word:'Haus',meaning:'ev',article:'das',plural:'Häuser',partOfSpeech:'noun',example:'Das Haus ist alt.',translation:'Ev eski.',patterns:[]};
test('German word card: German labels, no Turkish translations',()=>{
 const WordResult=bundle('components/word-result.tsx').default;
 const out=render(React.createElement(WordResult,{data}));
 for(const label of ['Genus','Singular','Plural','Beispielsatz','Wort anhören','aria-pressed="true" title="Alles auf Deutsch"'])assert(out.includes(label),label);
 for(const tr of ['Ev eski.','Artikel türü','Örnek cümle','Kelimeyi dinle'])assert(!out.includes(tr),tr);
});
test('Turkish stays available as an option on the same card',()=>{
 const WordResult=bundle('components/word-result.tsx',turkish).default;
 const out=render(React.createElement(WordResult,{data}));
 for(const label of ['Artikel türü','Örnek cümle','Ev eski.','aria-pressed="true" title="Her şeyi Türkçe göster"'])assert(out.includes(label),label);
});
test('German flashcard asks in German and keeps the example untranslated',()=>{
 const ReviewCard=bundle('components/review-card.tsx').default;
 const card={...data,translation:'Ev eski.'};
 const front=render(React.createElement(ReviewCard,{card,reverse:false,reveal:false,onReveal(){},onSpeak(){}}));
 assert(front.includes('WEISST DU, WAS ES BEDEUTET?'));assert(front.includes('Bedeutung zeigen'));
 const answer=render(React.createElement(ReviewCard,{card,reverse:false,reveal:true,onReveal(){},onSpeak(){}}));
 assert(answer.includes('Plural: die Häuser'));assert(answer.includes('Das Haus ist alt.'));assert(!answer.includes('Ev eski.'));
});
