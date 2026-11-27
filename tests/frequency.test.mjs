import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const F=bundle('lib/frequency.ts');
test('suggestions follow frequency order and skip words the learner already has',()=>{
 const first=F.nextFrequentWords([],5);assert.equal(first.length,5);
 assert.deepEqual(first.map(x=>x.rank),[...first.map(x=>x.rank)].sort((a,b)=>a-b));
 const next=F.nextFrequentWords([first[0].word,'der '+first[1].word],5);
 assert.ok(!next.some(x=>x.word===first[0].word||x.word===first[1].word));
 assert.equal(next[0].word,first[2].word);
 assert.notDeepEqual(F.nextFrequentWords([],5,5).map(x=>x.word),first.map(x=>x.word),'"show others" moves on');
});
test('only nouns and infinitives with a dictionary meaning are suggested; vulgar words are left out',()=>{
 const all=F.nextFrequentWords([],5000);assert.ok(all.length>800);
 assert.ok(all.every(x=>x.kind==='n'?/^\p{Lu}/u.test(x.word):/en$/.test(x.word)));
 assert.ok(!all.some(x=>/Scheiße|Hallo|Verdammt/.test(x.word)));
});
test('coverage counts saved words among the most frequent ones',()=>{
 const top=F.nextFrequentWords([],3).map(x=>x.word);
 assert.equal(F.frequencyCoverage(top,300).hit,3);assert.equal(F.frequencyCoverage([],300).hit,0);
});
test('the data file names its source and licence',()=>{const d=JSON.parse(fs.readFileSync('lib/frequency-de.json','utf8'));assert.equal(d.license,'CC BY-SA 4.0');assert.match(d.url,/wiktionary\.org/);});
