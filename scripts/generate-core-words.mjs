// Builds lib/b1-words.json (hand-written A1–B1 vocabulary, data/b1-words.tsv) and lib/frequency-words.json
// (the most frequent nouns and verbs from the Wiktionary frequency list, with meanings from the app's dictionary).
// Words already in the starter list or in another pack are left out so no card exists twice.
// Usage: node scripts/generate-core-words.mjs
import {buildSync} from 'esbuild';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const B=bundle('lib/basic-words.ts'),D=bundle('lib/dictionary.ts'),E=bundle('lib/examples.ts'),P=bundle('lib/word-packs.ts');
const key=B.basicWordKey;
const taken=new Set(B.BASIC_WORDS.map(w=>key(w.word)));
for(const p of P.WORD_PACKS)if(!['b1-kern-v1','sik-kelimeler-v1'].includes(p.id))for(const w of p.words)taken.add(key(w.word));
const POS={n:'noun',v:'verb',a:'adjective',d:'adverb'};
const authored=[];
for(const line of fs.readFileSync('data/b1-words.tsv','utf8').trim().split('\n')){
 const [word,p,article,plural,meaning,example,translation]=line.split('|');
 if(!word||!POS[p]||!meaning||!example||!translation)throw Error('bad row: '+line);
 const k=key(word);if(taken.has(k))continue;taken.add(k);
 authored.push({word,article:article||'',plural:plural||'',meaning,example,translation,partOfSpeech:POS[p]});
}
fs.writeFileSync('lib/b1-words.json',JSON.stringify({words:authored}));
const BLOCK=new Set(['töten','Teufel','Scheiße','Arsch','ficken','Gott','Sir','Mister','Mama','Papa','Mom','Dad','Hallo','Okay','Ach','Hey','Jack','John']);
const freq=JSON.parse(fs.readFileSync('lib/frequency-de.json','utf8')).words;
const fw=[];
for(const [word,rank,kind] of freq){
 const k=key(word);if(taken.has(k)||BLOCK.has(word))continue;
 const e=D.localEntry(word);if(!e||!e.meaning?.trim())continue;
 const senses=e.meaning.split(/\s*;\s*/).filter(Boolean).slice(0,3).join('; ');
 if(kind==='n'&&!['der','die','das'].includes(e.article))continue;
 const ex=E.bundledExamples(word).find(c=>c.de&&c.tr);
 const shown=kind==='n'?(e.word||word):word;
 if(taken.has(key(shown)))continue;
 taken.add(k);taken.add(key(shown));
 fw.push({word:shown,article:kind==='n'?e.article:'',plural:kind==='n'?(e.plural||''):'',meaning:senses,example:ex?.de||'',translation:ex?.tr||'',partOfSpeech:kind==='n'?'noun':'verb'});
}
fs.writeFileSync('lib/frequency-words.json',JSON.stringify({words:fw}));
console.log('authored',authored.length,'| frequency',fw.length,'| with example',fw.filter(w=>w.example).length);
