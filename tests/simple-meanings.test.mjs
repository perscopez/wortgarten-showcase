import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url),React=require('react'),render=require('react-dom/server').renderToStaticMarkup;
const bundle=entry=>{const box={module:{exports:{}},exports:{},require,URL};vm.runInNewContext(buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',external:['react','react/jsx-runtime'],write:false}).outputFiles[0].text,box);return box.module.exports;};
const {parseVocabulary,createChecker}=bundle('lib/simple-german.ts');
const check=createChecker(parseVocabulary(fs.readFileSync(new URL('../lib/defining-vocabulary.txt',import.meta.url),'utf8')));
const meanings=JSON.parse(fs.readFileSync(new URL('../lib/german-meanings.json',import.meta.url),'utf8')).words;

test('German explanations only use basic (A1–A2) words, so learners can understand them',()=>{
 const hard=[];
 for(const [word,text] of Object.entries(meanings)){
  const base=word.replace(/^sich /,'').toLowerCase();
  // The word itself (and its forms) may appear in a usage pattern such as "sich freuen: …".
  const unknown=check(text).filter(t=>!base.split(/[ -]/).some(b=>t.toLowerCase().startsWith(b.slice(0,Math.max(4,b.length-2)))));
  if(unknown.length)hard.push(`${word}: ${unknown.join(', ')}`);
 }
 assert.deepEqual(hard,[],'Use simpler words, or add a basic word to lib/defining-vocabulary.txt');
});
test('explanations are short',()=>{
 for(const [word,text] of Object.entries(meanings))assert(text.split(/\s+/).length<=22,word+': '+text);
});
test('the checker accepts forms and compounds of basic words but flags rare ones',()=>{
 assert.equal(JSON.stringify(check('Die Kinder spielten im großen Garten mit einer Tischlampe.')),'[]');
 assert.equal(JSON.stringify(check('Die Kirchengemeinde braucht Hopfen und Malz.')),JSON.stringify(['Kirchengemeinde','Hopfen','Malz']));
});
test('the Turkish hint is hidden until tapped',()=>{
 const Hint=bundle('components/turkish-hint.tsx').default;
 const out=render(React.createElement(Hint,{meaning:'yardım etmek'}));
 assert.match(out,/Türkçe ipucu/);assert.doesNotMatch(out,/yardım etmek/);
 assert.equal(render(React.createElement(Hint,{meaning:''})),'');
});
