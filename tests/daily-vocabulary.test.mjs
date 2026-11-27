import test from'node:test';import assert from'node:assert/strict';import{buildSync}from'esbuild';import vm from'node:vm';
const b={module:{exports:{}},exports:{},Date,Map,Set};vm.runInNewContext(buildSync({entryPoints:['lib/daily-vocabulary.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,b);const m=b.module.exports,now=new Date(2026,10,3,12).getTime();
const card=(id,over={})=>({id,word:'helfen',meaning:'yardım etmek',article:'',due:now-1000,interval:1,reviews:2,created:now-10000,...over});
test('mixed selection is stable, unique, bounded and includes newest, weak and everyday',()=>{const rows=Array.from({length:90},(_,i)=>card('old'+i,{word:'Kunsthandel',created:now-i*1000,reviews:0}));rows.push(card('weak',{reviews:20,due:0}),card('important',{word:'bezahlen',created:1}),card('recent',{created:now+1}));const a=m.dailySelection(rows,now);assert(a.some(c=>c.id==='weak'));assert(a.some(c=>c.id==='recent'));assert(a.some(c=>c.id==='important'));assert.equal(new Set(a.map(c=>c.id)).size,a.length);assert(a.length<=40);assert(a.filter(c=>c.reviews===0).length<=12);assert.deepEqual(a.map(c=>c.id),m.dailySelection(rows,now).map(c=>c.id));assert.equal(rows.length,93)});
test('checked meanings replace known misleading gloss in study only; originals untouched',()=>{const c=card('a',{word:'nun',meaning:'evet'});assert.match(m.dailyMeaning(c).meaning,/şimdi/);assert.equal(c.meaning,'evet');assert.match(m.dailyMeaning(card('b',{word:'Vorlesung'})).meaning,/üniversite/);assert.equal(m.dailyMeaning(card('p',{qualityFlag:{status:'pending'}})),null);assert.equal(m.dailyMeaning(card('q',{word:'xyz',meaning:'MYMEMORY ERROR'})),null)});
test('timer only credits active ticks and stops at20min',()=>{assert.equal(m.dailyElapsed(10,500,false),10);assert.equal(m.dailyElapsed(10,60000,true),1010);assert.equal(m.dailyElapsed(1199900,1000,true),1200000);assert.equal(m.dailyElapsed(10,-1,true),10)});
test('resume rejects stale/corrupt sessions; answer advances only explicitly with bounded recovery',()=>{let s=m.newDailySession([card('a'),card('b')],now);assert.equal(s.queue.length,4);assert(m.readDailySession(JSON.stringify(s),now));assert.equal(m.readDailySession(JSON.stringify(s),now+86400000),null);assert.equal(m.readDailySession('{bad',now),null);let n=m.advanceDaily(s,0,now);assert.equal(s.answers.length,0);assert.equal(n.answers.length,1);assert.equal(n.queue.filter(i=>i.id==='a'&&i.round===2).length,1);assert.equal(m.readDailySession(JSON.stringify({...s,elapsed:Infinity}),now),null);assert.equal(m.advanceDaily({...s,elapsed:1200000},2,now).finished,true)});
test('practice never mutates original notes or review state during planning; homonymous nouns keep their own gender/sense',()=>{const rows=[card('a',{word:'Bank',article:'die',meaning:'banka; finans kurumu',note:'kişisel not'})];const snapshot=JSON.stringify(rows);m.dailySelection(rows,now);m.newDailySession(rows,now);assert.equal(JSON.stringify(rows),snapshot);const definition=m.dailyMeaning(rows[0]);assert.match(definition.meaning,/banka/);assert(!definition.meaning.includes('oturma'))});
test('newly saved and synced cards join a paused session without reset; duplicates do not multiply',()=>{const old=[card('old')];let s=m.newDailySession(old,now);s={...s,elapsed:61000};const fresh=card('fresh',{created:now+1,reviews:0});const n=m.mergeAddedDailyCards(s,[...old,fresh]);assert.equal(n.elapsed,61000);assert.equal(n.queue[0].id,'fresh');assert.equal(n.queue.filter(i=>i.id==='fresh').length,2);assert.deepEqual(m.mergeAddedDailyCards(n,[...old,fresh]),n);assert.equal(m.mergeAddedDailyCards({...s,finished:true,queue:[]},[...old,fresh]).queue[0].id,'fresh');assert.equal(m.mergeAddedDailyCards({...s,elapsed:m.DAILY_TARGET_MS},[...old,fresh]).queue.length,s.queue.length)});
test('bulk additions keep prior queue and refill beyond 12 new words',()=>{const old=Array.from({length:12},(_,i)=>card('n'+i,{created:now+i,reviews:0}));let s=m.newDailySession(old,now);const fresh=Array.from({length:30},(_,i)=>card('f'+i,{created:now+100+i,reviews:0}));const n=m.mergeAddedDailyCards(s,[...old,...fresh]);assert.equal(n.queue.filter(i=>!i.reverse).length,24);assert.equal(n.queue[0].id,'f29');assert(old.every(c=>n.queue.some(i=>i.id===c.id)));s={...s,answers:old.map(c=>({id:c.id,rating:2,at:now})),queue:[],finished:true};const full=m.continueDailySession(s,[...old,...fresh],now);assert.equal(full.queue.length,24);assert.equal(full.answers.length,12)});
test('full library rotation reaches the oldest and all unrated cards over successive batches',()=>{const cards=Array.from({length:93},(_,i)=>card('x'+i,{created:now+i,reviews:0}));let s=m.newDailySession(cards,now);assert.equal(s.queue[0].id,'x92');assert.equal(s.queue[1].id,'x0');let steps=0;while(s.queue.length&&steps++<200)s=m.continueDailySession(m.advanceDaily(s,3,now),cards,now);assert.equal(s.answers.length,93);assert.equal(s.finished,true)});
test('reverse cue falls back to forward when the German answer is literally printed',()=>{assert.equal(m.safeDailyReverse('Bank','oturma bankı (Bank)',true),false);assert.equal(m.safeDailyReverse('Bank','banka',true),true);assert.equal(m.safeDailyReverse('Bank','banka',false),false)});
test('terminal timer is frozen, including stale callbacks after final card',()=>{let s=m.newDailySession([card('a')],now);s={...s,elapsed:60000,queue:[],finished:true};assert.equal(m.tickDailySession(s,1000,true),s);assert.equal(m.tickDailySession({...s,finished:false},1000,true).elapsed,60000)});
test('mixed library includes starters without prioritizing them above new additions',()=>{const seeds=[card('seed-a'),card('seed-b')];assert.equal(m.starterOnly(seeds),true);const real=card('own',{word:'Begegnung'});assert.equal(m.starterOnly([...seeds,real]),false);assert.deepEqual(Array.from(m.dailySelection([...seeds,real],now),c=>c.id),['own','seed-a','seed-b']);const s={...m.newDailySession(seeds,now),elapsed:60000,queue:[],finished:true};const resumed=m.continueDailySession(s,[...seeds,real],now);assert.equal(resumed.finished,false);assert.equal(resumed.elapsed,60000);assert.equal(resumed.queue[0].id,'own')});
test('batch refills from unseen real words; very easy cards leave reverse queue until due',()=>{const all=Array.from({length:60},(_,i)=>card('r'+i,{reviews:5}));let s=m.newDailySession(all,now);const first=s.queue[0].id;s=m.advanceDaily(s,3,now);assert.equal(s.queue.some(i=>i.id===first),false);const out=m.continueDailySession({...s,queue:[],finished:true},all,now);assert.equal(out.finished,false);assert(out.queue.every(i=>i.id!==first));assert(out.queue.length>0)});
test('skipped cards cannot cycle back through automatic batch refill',()=>{const cards=[card('one')];let s=m.newDailySession(cards,now);s=m.skipDailyCard(s);assert.equal(s.queue.length,0);assert.equal(s.answers.length,0);const next=m.continueDailySession(s,cards,now);assert.equal(next.queue.length,0);assert.equal(next.finished,true)});
test('capitalized noun homographs keep the authored sense and example',()=>{
 for(const [word,meaning] of [['Kosten','giderler'],['Wissen','bilgi']]){
 const info=m.dailyMeaning(card('homograph',{word,meaning,partOfSpeech:'noun',example:'Eigenes Beispiel.'}));
 assert.equal(info.meaning,meaning);assert.equal(info.example,'Eigenes Beispiel.');
 }
});
test('keep going today: a finished day starts another block, keeps total time and prefers unanswered words',()=>{
 const cards=Array.from({length:30},(_,i)=>card('c'+i,{word:'Wort'+i,reviews:0,created:now-i*1000}));
 let s=m.newDailySession(cards,now);
 const firstIds=new Set(s.queue.map(i=>i.id));
 s={...s,elapsed:20*60*1000,finished:true,queue:[],answers:[...firstIds].map(id=>({id,rating:2,at:now}))};
 const n=m.extendDailySession(s,cards,now,10);
 assert.equal(n.finished,false);assert.ok(n.queue.length>0);
 assert.equal(n.elapsed,10*60*1000,'a 10 minute block starts with 10 minutes left');
 assert.equal(m.dailyTotal(n),20*60*1000,'total time stays continuous');
 assert.ok(n.queue.every(i=>!firstIds.has(i.id)),'unanswered words come first');
 assert.ok(m.readDailySession(JSON.stringify(n),now),'the extended session is still a valid saved session');
 const again=m.extendDailySession({...n,elapsed:20*60*1000,finished:true,queue:[]},cards,now,20);
 assert.equal(again.elapsed,0);assert.equal(m.dailyTotal(again),30*60*1000,'10 earlier + 20 played');
});
test('keep going today works on a tiny deck and refuses an empty one',()=>{
 const cards=[card('a'),card('b')];
 let s=m.newDailySession(cards,now);s={...s,elapsed:20*60*1000,finished:true,queue:[],answers:[{id:'a',rating:2,at:now},{id:'b',rating:2,at:now}]};
 assert.ok(m.extendDailySession(s,cards,now,10).queue.length>0,'falls back to the whole deck');
 assert.equal(m.extendDailySession(s,[],now,10),s);
});
test('invalid earlier time is rejected when reading a saved session',()=>{
 const s=m.newDailySession([card('a')],now);
 assert.equal(m.readDailySession(JSON.stringify({...s,earlier:-5}),now),null);
});
const rs=(lapses,rating)=>({version:1,ease:2.5,lapses,successDays:1,lastAdvancedDay:'2026-11-02',lastReviewedAt:now-5000,scheduledDue:now,events:[{at:now-5000,rating,phase:'scheduled'}]});
test('weak words: two lapses or a last miss, worst first; fresh and easy words are left out',()=>{
 const cards=[card('easy',{reviewState:rs(0,2)}),card('lapsed',{reviewState:rs(3,2)}),card('missed',{reviewState:rs(0,0)}),card('worse',{reviewState:rs(5,1)}),card('fresh',{reviews:0})];
 assert.deepEqual(m.weakCards(cards).map(c=>c.id),['worse','lapsed','missed']);
});
test('weak words session continues today, is limited to weak words and never invents a session without them',()=>{
 assert.equal(m.weakWordsSession(null,[card('a'),card('b')],now),null);
 const cards=[card('a',{reviewState:rs(3,2)}),card('b',{reviewState:rs(0,0)}),card('c')];
 const base=m.newDailySession(cards,now);
 const s=m.weakWordsSession({...base,elapsed:5000},cards,now);
 assert.deepEqual([...new Set(s.queue.map(i=>i.id))].sort(),['a','b']);assert.equal(s.elapsed,5000);assert.equal(s.finished,false);
 const done=m.weakWordsSession({...base,elapsed:20*60*1000,finished:true},cards,now);
 assert.equal(done.elapsed,10*60*1000);assert.equal(m.dailyTotal(done),20*60*1000);
 assert.ok(m.readDailySession(JSON.stringify(done),now));
});

test('two everyday words share the learner’s topic while due review retains its slot',()=>{
 const rows=[
  card('recent',{word:'Salat',meaning:'salata',article:'der',reviews:0,created:now}),
  card('package',{word:'Packung',meaning:'paket',article:'die',reviews:0}),
  card('offer',{word:'Angebot',meaning:'teklif',article:'das',reviews:0}),
  card('due',{word:'warten',meaning:'beklemek',due:0}),
  card('other',{word:'Sonne',meaning:'güneş',article:'die',reviews:0,created:1}),
 ];
 assert.deepEqual(Array.from(m.dailySelection(rows,now).slice(0,4),c=>c.id),['recent','offer','due','package']);
});

test('the daily checkpoint round-trips targeted retries and records hints separately',()=>{
 const s=m.newDailySession([card('a'),card('b')],now);
 const next=m.advanceDaily(s,1,now,{retry:{kind:'article'},assisted:true});
 assert.equal(next.answers[0].assisted,true);
 const saved=m.readDailySession(JSON.stringify(next),now);
 assert.equal(saved.queue.find(q=>q.round===2).retry.kind,'article');
 const malformed={...saved,queue:[{id:'a',reverse:false,round:2,retry:{kind:'invalid'}}]};
 assert.equal(m.readDailySession(JSON.stringify(malformed),now),null);
});
