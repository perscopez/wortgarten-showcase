// Precomputes everything the full lookup knows for every pack word, so no phone has to look words up one by one:
// inflection tables, case notes (rection), plural, article, part of speech, a reviewed picture and Tatoeba example sentences (with credit).
// Output: public/pack-data/<packId>.json  { word: {pos,article,plural,source,forms,rection,photo,examples} }
// Usage: node scripts/generate-pack-data.mjs [packId ...]   (resumes: words already in the output are skipped)
import {buildSync} from 'esbuild';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// The lookup route also asks Wikidata/Commons for picture candidates and MyMemory for translations; only reviewed local pictures and Wiktionary data are wanted here, so those hosts fail fast.
const SKIP=/wikidata\.org|commons\.wikimedia\.org|mymemory/;
const quickFetch=(input,init)=>{const url=String(input?.url||input);return SKIP.test(url)?Promise.reject(new Error('skipped')):fetch(input,init);};
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require','process','AbortSignal','fetch','URL','URLSearchParams','TextEncoder',f.text)(mod,mod.exports,require,process,AbortSignal,quickFetch,URL,URLSearchParams,TextEncoder);return mod.exports;};
const route=bundle('app/api/lookup/route.ts'),W=bundle('lib/word-packs.ts'),SI=bundle('lib/saved-inflections.ts'),SR=bundle('lib/saved-rection.ts'),T=bundle('lib/tatoeba.ts');
const only=process.argv.slice(2).filter(a=>!a.startsWith('--'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ipCounter=0;const fakeIp=()=>`10.${(ipCounter>>16)&255}.${(ipCounter>>8)&255}.${ipCounter++&255}`;
async function lookup(word){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await route.GET(new Request('http://pack.local/api/lookup?word='+encodeURIComponent(word)+'&exact=1',{headers:{'x-forwarded-for':fakeIp()}}));
   if(res.status===429){await sleep(2000);continue;}
   const d=await res.json();if(!res.ok||d.selectionRequired||d.word!==word)return null;
   if(!/wiktionary/.test(d.source||'')&&attempt<2){await sleep(1500*(attempt+1));continue;}// Wiktionary page fetch probably throttled: fall back to wikdict only after retries
   return d;
  }catch{await sleep(800*(attempt+1));}
 }
 return null;
}
async function examples(word,meaning){
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(T.tatoebaUrl(word),{headers:{'User-Agent':'Wortgarten-learning-app'},signal:AbortSignal.timeout(9000)});
   if(r.status===429||r.status>=500){await sleep(1500*(attempt+1));continue;}
   if(!r.ok)return [];const data=await r.json();return T.pickExamples(data.results||[],word,meaning,3);
  }catch{await sleep(800*(attempt+1));}
 }
 return null;// unknown: try again in the examples pass
}
const RETRY=process.argv.includes('--retry');
const EXAMPLES_ONLY=process.argv.includes('--examples');
for(const pack of W.WORD_PACKS){
 if(only.length&&!only.includes(pack.id))continue;
 const file=`public/pack-data/${pack.id}.json`;
 const out=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
 const todo=EXAMPLES_ONLY?pack.words.filter(w=>w.word in out&&!out[w.word].examples&&!out[w.word].exTried):pack.words.filter(w=>!(w.word in out)||(RETRY&&!out[w.word].forms&&!/wiktionary/.test(out[w.word].source||'')));
 console.log(pack.id,'todo',todo.length,'of',pack.words.length);
 let n=0,i=0,misses=0;const t0=Date.now();
 const worker=async()=>{
  for(;;){
   const w=todo[i++];if(!w)return;
   if(EXAMPLES_ONLY){const ex=await examples(w.word,w.meaning);if(ex===null){}else if(ex.length)out[w.word].examples=ex;else out[w.word].exTried=true;if(++n%40===0){fs.writeFileSync(file,JSON.stringify(out));console.log(pack.id,'examples',n,'/',todo.length,Math.round((Date.now()-t0)/1000)+'s');}await sleep(350);continue;}
   const d=await lookup(w.word);await sleep(250);
   if(!d){misses++;continue;}// no entry (compound, typo, outage): leave unchecked so the app's live lookup can still try
   const ex=[];
   const forms=d?SI.safeInflections(d.inflections):undefined,rection=d?SR.safeRection(d.rection):undefined;
   const photo=d?.images?.find(p=>p.match==='curated');
   out[w.word]={...(d?{pos:d.partOfSpeech||undefined,article:d.articleAmbiguous?undefined:(d.article||undefined),plural:d.plural||undefined,source:d.source||undefined}:{}),...(forms?.tables?.length?{forms}:{}),...(rection?.status==='known'?{rection}:{}),...(photo?{photo}:{}),...(ex.length?{examples:ex}:{}),checked:true};
   if(++n%50===0){fs.writeFileSync(file,JSON.stringify(out));console.log(pack.id,n,'/',todo.length,Math.round((Date.now()-t0)/1000)+'s');}
  }
 };
 await Promise.all(Array.from({length:EXAMPLES_ONLY?2:2},worker));
 fs.writeFileSync(file,JSON.stringify(out));
 const withForms=Object.values(out).filter(x=>x.forms).length,withEx=Object.values(out).filter(x=>x.examples).length;
 console.log(pack.id,'misses',misses);console.log(pack.id,'done:',Object.keys(out).length,'words,',withForms,'with tables,',withEx,'with examples,',Math.round((fs.statSync(file).size)/1024)+' KB');
}
