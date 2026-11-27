import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';import vm from 'node:vm';
const require=createRequire(import.meta.url);
const bundle=entry=>{const box={module:{exports:{}},exports:{},require,URL};vm.runInNewContext(buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}}).outputFiles[0].text,box);return box.module.exports;};
const {createTranslator,germanArtSrc,looksTurkish}=bundle('lib/dom-translate.ts');
const dict=JSON.parse(fs.readFileSync(new URL('../lib/i18n-de.json',import.meta.url),'utf8'));
const translate=createTranslator(dict);

test('interface strings translate exactly, keeping the surrounding whitespace',()=>{
 assert.equal(translate('Bilmiyorum'),'Weiß ich nicht');
 assert.equal(translate('  Çok kolay '),'  Sehr leicht ');
 assert.equal(translate('Kelimelerim'),'Meine Wörter');
 assert.equal(translate('Haus'),null,'German words stay');
 assert.equal(translate('42'),null);
});
test('pieces of longer labels are replaced only when nothing Turkish is left',()=>{
 assert.equal(translate('Haus için seçilen görsel'),'Haus – gewähltes Bild');
 assert.equal(translate('Bu cümlede Bildim yazıyor ve devam ediyor'),null,'no half-German sentences');
});
test('the dictionary holds German only and covers the main navigation',()=>{
 for(const [tr,de] of Object.entries(dict)){assert(de.trim(),tr);if(!/^z. B. /.test(de))assert(!/[ğışİ]/.test(de),'Turkish letters in '+de);}
 const page=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 const nav=page.slice(page.indexOf('const NAV_GROUPS'),page.indexOf('export default function Home'));
 const labels=[...nav.matchAll(/'([^']+)'\]/g)].map(m=>m[1]).filter(looksTurkish);
 assert(labels.length>10);
 for(const label of labels)assert(translate(label),'missing: '+label);
});
test('illustrations with Turkish labels point to their German copies',()=>{
 assert.equal(germanArtSrc('/vocabulary-art/teaching-scenes/heute.svg'),'/vocabulary-art/teaching-scenes-de/heute.svg');
 assert.equal(germanArtSrc('/vocabulary-art/lesson-20261108/zeile.svg?v=1'),'/vocabulary-art/lesson-20261108-de/zeile.svg?v=1');
 assert.equal(germanArtSrc('/vocabulary-art/openmoji/1F600.svg'),null);
 for(const dir of ['teaching-scenes','lesson-20261108','audit-20261109']){
  const svgs=fs.readdirSync(new URL(`../public/vocabulary-art/${dir}`,import.meta.url)).filter(f=>f.endsWith('.svg'));
  const de=new Set(fs.readdirSync(new URL(`../public/vocabulary-art/${dir}-de`,import.meta.url)));
  assert.deepEqual(svgs.filter(f=>!de.has(f)),[],dir+': run node scripts/generate-german-art.mjs');
  for(const f of svgs.slice(0,40)){const text=fs.readFileSync(new URL(`../public/vocabulary-art/${dir}-de/${f}`,import.meta.url),'utf8');assert(!/[ğışİŞ]/.test([...text.matchAll(/<text[^>]*>([^<]*)</g)].map(m=>m[1]).join(' ')),f);}
 }
});
test('German exercise choices use German explanations and skip words without one',()=>{
 const src=`import {buildChoices} from './lib/daily-exercise';module.exports={buildChoices};`;
 const box={module:{exports:{}},exports:{},require,URL};vm.runInNewContext(buildSync({stdin:{contents:src,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['react']}).outputFiles[0].text,box);
 const card=(id,word,meaning)=>({id,word,meaning,article:'',partOfSpeech:'verb',example:'',translation:''});
 const pool=[card('a','helfen','yardım etmek'),card('b','warten','beklemek'),card('c','gehen','gitmek'),card('d','kommen','gelmek'),card('e','xyz','bilinmeyen')];
 const de={helfen:'jemanden unterstützen',warten:'bleiben, bis etwas geschieht',gehen:'sich zu Fuß fortbewegen',kommen:'sich nähern'};
 const choices=box.module.exports.buildChoices(pool[0],pool,'meaning','s',c=>de[c.word]||'');
 assert.equal(choices.length,4);
 assert.equal(JSON.stringify(choices.filter(c=>c.correct).map(c=>c.label)),'["jemanden unterstützen"]');
 assert(choices.every(c=>Object.values(de).includes(c.label)));
});
