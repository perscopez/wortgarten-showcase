// Builds lib/pattern-words.json: a word for every key of the pattern data (data/compact-*-patterns.tsv, compact-nouns.tsv),
// so no pattern is left without its word. Meanings come from the app's own dictionary (reviewed lexicon, WikDict); keys without a meaning are listed and skipped.
// Usage: node scripts/generate-pattern-words.mjs
import {buildSync} from 'esbuild';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const D=bundle('lib/dictionary.ts'),P=bundle('lib/word-packs.ts'),B=bundle('lib/basic-words.ts');
const keysOf=(name)=>fs.readFileSync(`data/compact-${name}.tsv`,'utf8').trim().split('\n').map(l=>l.split('\t')[0]);
const sources=[['verb-patterns','verb'],['nouns','noun'],['adjective-patterns','adjective'],['more-patterns','auto']];
const taken=new Set([...B.BASIC_WORDS.map(w=>B.basicWordKey(w.word)),...P.WORD_PACKS.filter(p=>p.id!=='kalip-kelimeleri-v1').flatMap(p=>p.words.map(w=>B.basicWordKey(w.word)))]);
const out=[],missing=[],seen=new Set();
for(const [name,kind] of sources)for(const key of keysOf(name)){
 const k=B.basicWordKey(key);if(taken.has(k)||seen.has(k))continue;seen.add(k);
 const e=D.localEntry(key);
 if(!e||!e.meaning||!e.meaning.trim()){missing.push(key);continue;}
 const pos=kind==='auto'?(/en$|ln$|rn$/.test(key)?'verb':'adjective'):kind;
 const article=pos==='noun'?(e.article||''):'';
 if(pos==='noun'&&!article){missing.push(key+' (no article)');continue;}
 out.push({word:pos==='noun'?(e.word||key):key,article,plural:pos==='noun'?(e.plural||''):'',meaning:e.meaning.trim(),example:(e.example||'').trim(),translation:(e.translation||'').trim(),partOfSpeech:pos});
}
// Keys the offline dictionary cannot describe: meanings and articles written by hand in scripts/pattern-word-meanings.json (reviewed Turkish pattern translations).
const FUNCTION=new Set(['an','aus','bei','bis','durch','im','in','ins','nach','um','von','während','zu','zum','zur','damit','obwohl','weil','mithilfe']);
const authored=JSON.parse(fs.readFileSync('scripts/pattern-word-meanings.json','utf8'));
const stillMissing=[];
for(const m of missing){
 const base=m.replace(/ \(no article\)$/,'').replace(/^sich /,'');
 if(!/^[\p{L}]+$/u.test(base)||FUNCTION.has(base))continue;
 const a=authored[base];if(!a){stillMissing.push(m);continue;}
 const k=B.basicWordKey(a.word);if(taken.has(k)||out.some(o=>B.basicWordKey(o.word)===k))continue;
 out.push({word:a.word,article:a.article,plural:a.plural,meaning:a.meaning,example:'',translation:'',partOfSpeech:a.pos});
}
fs.writeFileSync('lib/pattern-words.json',JSON.stringify({words:out}));
console.log('written',out.length,'words; single words still without any meaning:',stillMissing.join(', ')||'none');
console.log('pattern keys',seen.size,'→ words',out.length,'| without a usable dictionary entry:',missing.length);
console.log(missing.join(', '));
