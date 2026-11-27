import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/article-patterns.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,structuredClone});
const {ARTICLE_FAMILIES,familyForKnownNoun,buildFamilyQueue,updateFamilyProgress}=exports;
const family=id=>ARTICLE_FAMILIES.find(f=>f.id===id);
test('65 unique authored questions and every family has sources/limits',()=>{
 const q=buildFamilyQueue();assert.equal(q.length,65);assert.equal(new Set(q.map(x=>x.id)).size,65);assert.equal(new Set(q.map(x=>x.example.word)).size,65);
 for(const f of ARTICLE_FAMILIES){assert(f.sources.length);assert(f.sources.every(s=>s.url.startsWith('https://')));assert(f.explanation);assert(f.caution);}
 for(const {example:e} of q){assert(['der','die','das'].includes(e.article));assert(e.meaning);if(e.ending)assert.equal(e.stem+e.ending,e.word);if(e.compound){assert.equal(e.compound.prefix+e.compound.head,e.word);assert.equal(e.article,e.compound.headArticle);}}
});
test('productive suffix rules are separate from -e tendency and contrast',()=>{
 for(const id of ['suffix-ung','suffix-heit','suffix-keit','suffix-schaft'])assert.equal(family(id).article,'die');
 for(const id of ['suffix-chen','suffix-lein'])assert.equal(family(id).article,'das');
 assert.equal(family('suffix-ismus').article,'der');assert.equal(family('ending-e').strength,'tendency');assert.equal(family('false-suffix').strength,'contrast');
});
test('Sprung/Dung/Kuchen/Spion/Stadion do not inherit misleading suffix rules',()=>{
 for(const [word,article] of [['Sprung','der'],['Dung','der'],['Kuchen','der'],['Spion','der'],['Stadion','das']]){
  assert.equal(familyForKnownNoun({word,article,partOfSpeech:'noun'}).id,'false-suffix');
  assert.equal(familyForKnownNoun({word,article:'die',partOfSpeech:'noun'}),null);
 }
});
test('Junge/Käse/Name are explicit -e counterexamples',()=>{
 assert.equal(family('ending-e').counterexamples.map(e=>`${e.article} ${e.word}`).join(','),'der Junge,der Käse,der Name');
 for(const word of ['Junge','Käse','Name'])assert.equal(familyForKnownNoun({word,article:'der'}).id,'ending-e');
});
test('calendar groups have restricted scope including das Frühjahr',()=>{
 assert.equal(family('weekdays').examples.length,7);assert.equal(family('seasons').examples.length,4);
 const spring=family('seasons').counterexamples[0];assert.equal(spring.word,'Frühjahr');assert.equal(spring.article,'das');
 assert.equal(familyForKnownNoun({word:'Frühjahr',article:'der'}),null);
 assert.equal(familyForKnownNoun({word:'Woche',article:'die'}),null);
});
test('compound head preserves actual article and visible concatenation',()=>{
 const f=family('compound-head');assert.equal(f.article,null);
 assert.equal(f.examples.find(e=>e.word==='Haustür').compound.headArticle,'die');assert.equal(f.examples.find(e=>e.word==='Krankenhaus').compound.headArticle,'das');
});
test('helper requires exact curated lemma and matching unambiguous known article',()=>{
 assert.equal(familyForKnownNoun({word:'Wohnung',article:'die',partOfSpeech:'noun'}).id,'suffix-ung');
 for(const card of [{word:'Wohnung',article:'die',articleAmbiguous:true},{word:'Wohnung',article:'die',partOfSpeech:'verb'},{word:'Wohnung'},{word:'Wohnungen',article:'die'},{word:'wohnung',article:'die'},{word:'Fälschung',article:'die'},{word:'Wohnung',article:'der'}])assert.equal(familyForKnownNoun(card),null);
});
test('progress updates purely and only known question IDs',()=>{
 const q=buildFamilyQueue()[0];const p={};const next=updateFamilyProgress(p,q.id,false,1_800_000_000_000);
 assert.equal(Object.keys(p).length,0);assert.equal(next[q.id].wrong,1);assert.equal(next[q.id].attempts,1);assert.equal(next[q.id].lastAnswered,1_800_000_000_000);
 const correct=updateFamilyProgress(next,q.id,true,1_800_000_000_001);assert.equal(correct[q.id].correct,1);assert.equal(correct[q.id].wrong,1);assert.equal(correct[q.id].lastCorrect,true);assert.equal(next[q.id].lastCorrect,false);
 assert.equal(Object.keys(updateFamilyProgress(p,'__proto__',false)).length,0);
});
test('wrong priority, unseen priority, then corrected/seen; filter stays isolated',()=>{
 const qs=buildFamilyQueue();let p=updateFamilyProgress({},qs[5].id,false,10);p=updateFamilyProgress(p,qs[0].id,true,11);
 const queue=buildFamilyQueue(p);assert.equal(queue[0].id,qs[5].id);assert.equal(queue.at(-1).id,qs[0].id);
 p=updateFamilyProgress(p,qs[5].id,true,12);assert.notEqual(buildFamilyQueue(p)[0].id,qs[5].id);
 assert(buildFamilyQueue(p,'suffix-ung').every(q=>q.familyId==='suffix-ung'));assert.equal(buildFamilyQueue(p,'unknown').length,0);
});
test('lastAnswered retains real millisecond dates and corrupted entries stay finite',()=>{
 const [a,b]=buildFamilyQueue();const p={};p[a.id]={attempts:1,correct:1,wrong:0,lastCorrect:true,lastAnswered:1_800_000_000_100};p[b.id]={attempts:1,correct:1,wrong:0,lastCorrect:true,lastAnswered:1_800_000_000_000};
 assert.equal(buildFamilyQueue(p).at(-1).id,a.id);
 const bad={[a.id]:{attempts:NaN,correct:-1,wrong:Infinity,lastCorrect:false,lastAnswered:NaN}};
 const good=updateFamilyProgress(bad,a.id,true,NaN)[a.id];assert.equal(good.attempts,1);assert.equal(good.lastAnswered,0);assert.equal(good.correct,1);
});
test('returned queue/family objects cannot mutate shared curated facts',()=>{
 const a=buildFamilyQueue();a[0].example.article='das';assert.equal(buildFamilyQueue()[0].example.article,'die');
 const f=familyForKnownNoun({word:'Wohnung',article:'die'});f.examples[0].article='das';assert.equal(familyForKnownNoun({word:'Wohnung',article:'die'}).examples[0].article,'die');
});
test('same day correct does not inflate spaced article recall',()=>{const q=buildFamilyQueue()[0];const now=1_800_000_000_000;let p=updateFamilyProgress({},q.id,true,now);assert.equal(p[q.id].recallDays,1);const due=p[q.id].due;p=updateFamilyProgress(p,q.id,true,now+1000);assert.equal(p[q.id].recallDays,1);assert.equal(p[q.id].due,due);p=updateFamilyProgress(p,q.id,true,now+86400000);assert.equal(p[q.id].recallDays,2);assert.equal(p[q.id].due,now+4*86400000)});
