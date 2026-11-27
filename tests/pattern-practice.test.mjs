import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{
 const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['react','react/jsx-runtime','../components/*']});
 const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;
};
const P=bundle('lib/pattern-practice.ts');
const X=bundle('lib/daily-exercise.ts');
const DAY=86400000;
const card=(id,o={})=>({id,reviews:3,word:'Regel',example:'',translation:'',...o});
const info={example:'',translation:''};
const row=P.rowsFor('Regel').find(r=>r.phrase==='gegen eine Regel verstoßen');

test('each pattern has its own progress: success raises the streak and pushes the due date, a miss resets it for ten minutes',()=>{
 let p=P.emptyPatternProgress();
 p=P.recordPattern(p,row.id,true,0);assert.equal(p.items[row.id].streak,1);assert.equal(p.items[row.id].due,1*DAY);
 p=P.recordPattern(p,row.id,true,DAY);assert.equal(p.items[row.id].streak,2);assert.equal(p.items[row.id].due,DAY+3*DAY);
 p=P.recordPattern(p,row.id,false,5*DAY);assert.equal(p.items[row.id].streak,0);assert.equal(p.items[row.id].due,5*DAY+600000);assert.equal(p.items[row.id].attempts,3);assert.equal(p.items[row.id].correct,2);
 for(let i=0;i<4;i++)p=P.recordPattern(p,row.id,true,10*DAY+i);assert.equal(P.isSettled(p.items[row.id]),true,'four successes in a row settle a pattern');
});
test('progress records are validated and merged by attempts when synced',()=>{
 assert.deepEqual(P.parsePatternProgress(null),{version:1,items:{}});
 assert.throws(()=>P.parsePatternProgress({version:2,items:{}}));
 assert.throws(()=>P.parsePatternProgress({version:1,items:{a:{attempts:1,correct:2,streak:0,last:0,due:0}}}),'correct cannot exceed attempts');
 assert.throws(()=>P.parsePatternProgress({version:1,items:{a:{attempts:1,correct:1,streak:0,last:-1,due:0}}}));
 const B=bundle('lib/extended-learning-backup.ts');
 const key='wortgarten-pattern-progress-v1';
 assert.ok(B.EXTENDED_KEYS.includes(key),'pattern progress is part of backup and sync');
});
test('ranking: just missed first, then due reviews, then never practised, then the rest',()=>{
 const rows=P.rowsFor('Regel');assert.equal(rows.length,2);
 const now=10*DAY,[a,b]=rows;
 const items={[a.id]:{attempts:2,correct:1,streak:0,last:now-60000,due:now+540000},[b.id]:{attempts:3,correct:3,streak:3,last:now-DAY,due:now+6*DAY}};
 const r=P.rankPatterns('Regel',{version:1,items},'d',now);
 assert.deepEqual(r.map(x=>x.rank),[0,3]);assert.equal(r[0].row.id,a.id);
 const fresh=P.rankPatterns('Regel',{version:1,items:{[b.id]:items[b.id]}},'d',now);assert.deepEqual(fresh.map(x=>x.rank),[2,3]);
 const due=P.rankPatterns('Regel',{version:1,items:{[a.id]:{...items[a.id],last:now-DAY,due:now-1},[b.id]:items[b.id]}},'d',now);assert.deepEqual(due.map(x=>x.rank),[1,3]);
 const both=P.rankPatterns('Regel',{version:1,items:{[b.id]:{...items[b.id],streak:1,due:now-5}}},'d',now);assert.deepEqual(both.map(x=>x.rank),[1,2],'a due review is asked before a never practised pattern');
});
test('difficulty follows the pattern: choose/order → order → fill → type',()=>{
 const pick=(streak)=>({row,tier:Math.min(3,streak),rank:2});
 assert.equal(X.patternKindFor({...pick(0),row:P.rowsFor('warten')[0]}),'pattern','a preposition pattern starts as a choice');
 assert.equal(X.patternKindFor({...pick(0),row:{id:'x',word:'Erfolg',de:'Erfolg haben',tr:'başarılı olmak',phrase:'Erfolg haben'}}),'build-pattern','a pattern without a preposition starts as ordering');
 assert.equal(X.patternKindFor({...pick(1),row:{id:'x',word:'Erfolg',de:'Erfolg haben',tr:'başarılı olmak',phrase:'Erfolg haben'}}),'build-pattern');
 assert.equal(X.patternKindFor(pick(2)),'pattern-fill');
 assert.equal(X.patternKindFor(pick(3)),'pattern-type');assert.equal(X.patternKindFor(pick(7)),'pattern-type');
});
test('a pattern that is new, due or just missed takes about every second question of its word',()=>{
 const kinds=Array.from({length:200},(_,i)=>X.exerciseFor({round:0},false,card('w'+i),info,false,'d',null,0));
 const share=kinds.filter(k=>['pattern','build-pattern','pattern-fill','pattern-type'].includes(k)).length/200;
 assert.ok(share>0.35&&share<0.65,'pattern share '+share);
 // once both patterns are settled and not due, patterns stop taking over
 const rows=P.rowsFor('Regel'),now=10*DAY,items={};for(const r of rows)items[r.id]={attempts:5,correct:5,streak:5,last:now-DAY,due:now+20*DAY};
 const calm=Array.from({length:100},(_,i)=>X.exerciseFor({round:0},false,card('c'+i),info,false,'d',{version:1,items},now));
 assert.ok(calm.every(k=>!['pattern','build-pattern','pattern-fill','pattern-type'].includes(k)),'settled patterns are left alone until they are due');
 // reviews=0 → intro first
 assert.equal(X.exerciseFor({round:0},false,card('n',{reviews:0}),info,false,'d',null,0),'intro');
});
test('a just-missed pattern comes back typed with a hint on the retry round, otherwise the retry stays a recall',()=>{
 const now=10*DAY,rows=P.rowsFor('Regel');
 const missed={version:1,items:{[rows[0].id]:{attempts:1,correct:0,streak:0,last:now-60000,due:now+540000}}};
 assert.equal(X.exerciseFor({round:2},false,card('x'),info,true,'d',missed,now),'pattern-type');
 assert.equal(X.exerciseFor({round:2},false,card('x'),info,true,'d',null,now),'recall');
 assert.equal(X.exerciseFor({round:3},false,card('x'),info,true,'d',missed,now),'reverse-choice');
});
test('a missed pattern is not a forgotten word: rating 1 instead of 0, and a pattern is never rated "easy"',()=>{
 const base={ms:2000,round:1,production:true,hinted:false};
 assert.equal(X.autoRating('wrong',{...base,pattern:true}),1);assert.equal(X.autoRating('wrong',{...base,pattern:false}),0);
 assert.equal(X.autoRating('correct',{...base,pattern:true}),2);assert.equal(X.autoRating('correct',base),3);
});
test('fill and typed pattern quizzes',()=>{
 const f=X.fillQuizOfRow(row,'Regel');assert.equal(f.answer,'verstoßen');assert.equal(f.before,'gegen eine Regel');
 const w=X.fillQuizOfRow(P.rowsFor('warten')[0],'warten');assert.equal(w.answer,'warten','the headword is blanked when it is the only content word');
 assert.equal(X.fillQuizOfRow({...row,phrase:'in der'},'x'),null,'no content word to blank');
 assert.equal(X.gradePhrase('gegen eine Regel verstoßen',row.phrase),'correct');
 assert.equal(X.gradePhrase('  Gegen eine  regel verstoßen ',row.phrase),'correct');
 assert.equal(X.gradePhrase('gegen eine Regel verstossen',row.phrase),'umlaut');
 assert.equal(X.gradePhrase('eine Regel gegen verstoßen',row.phrase),'close','same words, another order');
 assert.equal(X.gradePhrase('gegen eine Regel verstoßn',row.phrase),'close','one letter off');
 assert.equal(X.gradePhrase('gegen die Regel brechen',row.phrase),'wrong');assert.equal(X.gradePhrase('  ',row.phrase),null);
 assert.equal(X.phraseSkeleton('gegen eine Regel'),'g•••• e••• R••••');
});
test('overview counts the learner\'s own patterns once, split by progress',()=>{
 const rows=P.rowsFor('Regel');
 const items={[rows[0].id]:{attempts:5,correct:5,streak:5,last:0,due:99*DAY},[rows[1].id]:{attempts:1,correct:0,streak:0,last:0,due:0}};
 const o=P.patternOverview(['Regel','regel','Regel'],{version:1,items},DAY);
 assert.deepEqual(o,{total:2,fresh:0,learning:1,settled:1,due:1,words:1});
 assert.equal(P.patternOverview(['zzzunbekannt'],null).total,0);
});
test('the drill builds a round of at most ten patterns, a few per word, missed ones first',()=>{
 const D=bundle('components/pattern-drill.tsx');
 const mk=(id,word,reviews=1)=>({id,word,meaning:'x',article:'',due:0,interval:0,reviews,partOfSpeech:'verb'});
 const cards=['Regel','Frage','warten','helfen','Rechnung','Termin','kochen','lesen','Angebot','Größe','Quittung','Versicherung'].map((w,i)=>mk('c'+i,w));
 const none=D.buildRound(cards,P.emptyPatternProgress(),'d',0);
 assert.ok(none.length>0&&new Set(none.map(i=>i.row.id)).size<=10,'at most ten patterns (a new one is studied once, then asked)');
 assert.ok(Object.values(none.reduce((m,i)=>((m[i.cardId]??=new Set()).add(i.row.id),m),{})).every(set=>set.size<=2),'at most two patterns per word');
 assert.ok(none.every(i=>['pattern','build-pattern'].includes(i.kind)),'unpractised patterns start gently');
 const rows=P.rowsFor('Regel');
 const missed={version:1,items:{[rows[1].id]:{attempts:1,correct:0,streak:0,last:50000,due:650000}}};
 const r=D.buildRound(cards,missed,'d',60000);
 assert.equal(r[0].row.id,rows[1].id,'a pattern missed a minute ago is first');
});
test('the app wires patterns in: copy step in the intro, own page, progress and menu entry',()=>{
 const ex=fs.readFileSync('components/daily-exercise.tsx','utf8'),dv=fs.readFileSync('components/daily-vocabulary.tsx','utf8'),pg=fs.readFileSync('app/page.tsx','utf8');
 assert.ok(ex.includes("stage==='copy'"),'intro has a copy step');assert.ok(ex.includes('Kalıbı kur'));
 assert.ok(dv.includes('recordPatternResult(meta)'));assert.ok(dv.includes("patterns={patterns}"));
 assert.ok(pg.includes("page==='patterns'&&<PatternDrill"));
});
test('case question: only for rows that state a preposition with its case',()=>{
 const E=bundle('lib/daily-exercise.ts');
 const q=E.caseQuizOfRow({id:'x',word:'warten',de:'auf etwas warten · auf + Akkusativ',tr:'bir şeyi beklemek',phrase:'auf etwas warten'});
 assert.equal(q.prep,'auf');assert.equal(q.governed,'Akkusativ');assert.equal(q.options.filter(o=>o.correct).length,1);
 assert.equal(E.caseQuizOfRow({id:'y',word:'x',de:'die Regel beachten',tr:'x',phrase:'die Regel beachten'}),null);
 assert.equal(E.caseQuizOfRow({id:'z',word:'x',de:'etwas tun · mit + Dativ',tr:'x',phrase:'etwas tun'}),null,'preposition must occur in the phrase');
});
test('weak and new modes pick only matching patterns',()=>{
 const D=bundle('components/pattern-drill.tsx');
 const mk=(id,word)=>({id,word,meaning:'x',article:'',due:0,interval:0,reviews:1,partOfSpeech:'verb'});
 const cards=['Regel','Frage','warten'].map((w,i)=>mk('c'+i,w));
 const rows=P.rowsFor('Regel');
 const progress={version:1,items:{[rows[0].id]:{attempts:3,correct:1,streak:0,last:1,due:1}}};
 const weak=D.buildRound(cards,progress,'d',1e9,'weak');
 assert.ok(weak.length>0&&weak.every(i=>i.row.id===rows[0].id));
 const fresh=D.buildRound(cards,progress,'d',1e9,'new');
 assert.ok(fresh.length>0&&fresh.every(i=>i.row.id!==rows[0].id));
});
test('typing and own-sentence modes cover every practised pattern, studying new ones first',()=>{
 const D=bundle('components/pattern-drill.tsx');
 const mk=(id,word)=>({id,word,meaning:'x',article:'',due:0,interval:0,reviews:1,partOfSpeech:'verb'});
 const cards=['Regel','Frage','warten'].map((w,i)=>mk('c'+i,w));
 const typed=D.buildRound(cards,P.emptyPatternProgress(),'d',1e9,'type');
 assert.ok(typed.filter(i=>!i.study).length>0&&typed.filter(i=>!i.study).every(i=>['pattern-type','dictate'].includes(i.kind)));
 assert.ok(typed.some(i=>i.kind==='pattern-type'),'most are typed from Turkish');
 assert.ok(typed.some(i=>i.study),'new patterns are studied once before being typed');
 const own=D.buildRound(cards,P.emptyPatternProgress(),'d',1e9,'compose');
 assert.ok(own.filter(i=>!i.study).every(i=>i.kind==='compose'));
 // a pattern answered right many times is still offered in the typing mode even if not due
 const rows=P.rowsFor('Regel');const settled={version:1,items:{[rows[0].id]:{attempts:6,correct:6,streak:5,last:1e9-1000,due:1e9+9e9}}};
 assert.ok(D.buildRound(cards,settled,'d',1e9,'type').some(i=>i.row.id===rows[0].id));
});
test('shadowing rounds are listening steps only: no questions, no progress changes',()=>{
 const D=bundle('components/pattern-drill.tsx');
 const mk=(id,word)=>({id,word,meaning:'x',article:'',due:0,interval:0,reviews:1,partOfSpeech:'verb'});
 const cards=['Regel','Frage','warten'].map((w,i)=>mk('c'+i,w));
 const r=D.buildRound(cards,P.emptyPatternProgress(),'d',1e9,'shadow');
 assert.ok(r.length>0&&r.length<=8&&r.every(i=>i.kind==='shadow'&&i.study===true));
 assert.equal(new Set(r.map(i=>i.row.id)).size,r.length,'each pattern once');
});
