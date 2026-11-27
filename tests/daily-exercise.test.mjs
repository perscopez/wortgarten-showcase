import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {outputFiles:[file]}=buildSync({entryPoints:['lib/daily-exercise.ts'],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['../components/*']});
const mod={exports:{}};new Function('module','exports','require',file.text)(mod,mod.exports,require);
const m=mod.exports;
const card=(id,o={})=>({id,due:0,interval:0,reviews:0,word:id,meaning:id+'-tr',article:'',...o});

test('cloze finds nouns, inflected nouns and conjugated verbs in the example',()=>{
 assert.deepEqual(m.clozeFor('Wir haben eine Entscheidung getroffen.','Entscheidung','Bir karar verdik.'),{before:'Wir haben eine ',answer:'Entscheidung',after:' getroffen.',translation:'Bir karar verdik.'});
 assert.equal(m.clozeFor('Ich warte auf den Bus.','warten').answer,'warte');
 assert.equal(m.clozeFor('Die Kinder spielen im Garten.','Kind').answer,'Kinder');
 assert.equal(m.clozeFor('Er antwortet nicht.','antworten').answer,'antwortet');
 assert.equal(m.clozeFor('Das ist schön.','warten'),null,'word missing → no cloze');
 assert.equal(m.clozeFor('Wir gehen nach Hause.','nach Hause'),null,'multi-word headwords use typed recall');
});
test('exercise kind follows the queue round and whether the word is new',()=>{
 const info={example:'Ich warte auf den Bus.',translation:'Otobüsü bekliyorum.'};
 assert.equal(m.exerciseFor({round:0},false,card('warten'),info,false),'intro');
 assert.notEqual(m.exerciseFor({round:0},false,card('warten'),info,true),'intro','already answered today → no second intro');
 assert.ok(['choice','listen','pattern','build-pattern','build-sentence'].includes(m.exerciseFor({round:0},false,card('warten',{reviews:3}),info,false)));
 // 'warten' has a pattern, which may take the typed round; a word without patterns keeps the word question
 assert.equal(m.exerciseFor({round:1},true,card('zzzunbekannt',{reviews:3,example:'Das ist zzzunbekannt hier.',translation:'x'}),info,false),'cloze');
 assert.equal(m.exerciseFor({round:1},true,card('Tisch',{reviews:3,article:'der'}),{example:'',translation:''},false),'recall');
 assert.equal(m.exerciseFor({round:2},true,card('warten'),info,true),'recall','first retry is hinted production');
 assert.equal(m.exerciseFor({round:3},true,card('warten'),info,true),'reverse-choice','last retry is a choice scaffold');
});
test('choices hold the right answer once, three distinct distractors, and are stable per seed',()=>{
 const target=card('Tisch',{article:'der',partOfSpeech:'noun',meaning:'masa'});
 const pool=[target,card('Stuhl',{article:'der',partOfSpeech:'noun',meaning:'sandalye'}),card('Lampe',{article:'die',partOfSpeech:'noun',meaning:'lamba'}),card('gehen',{partOfSpeech:'verb',meaning:'gitmek'}),card('Bett',{article:'das',partOfSpeech:'noun',meaning:'yatak'}),card('Kopie',{meaning:'masa'})];
 const a=m.buildChoices(target,pool,'meaning','2026-11-12'),b=m.buildChoices(target,pool,'meaning','2026-11-12');
 assert.deepEqual(a,b);assert.equal(a.length,4);assert.equal(a.filter(c=>c.correct).length,1);
 assert.equal(new Set(a.map(c=>c.label)).size,4,'a duplicate meaning is never offered twice');
 assert.ok(!a.some(c=>c.label==='gitmek'),'same word type is preferred');
 assert.ok(m.buildChoices(target,pool,'word','x').some(c=>c.correct&&c.label==='der Tisch'));
});
test('ratings are suggested from the check, streak and summary come from recorded answers',()=>{
 assert.equal(m.suggestedRating('correct'),2);assert.equal(m.suggestedRating('article'),1);assert.equal(m.suggestedRating('choice-wrong'),0);assert.equal(m.suggestedRating('gave-up'),0);
 const r=(v,o)=>m.autoRating(v,{ms:3000,round:1,production:true,hinted:false,...o});
 assert.equal(r('correct'),3,'fast unaided recall on the scheduled round is easy');
 assert.equal(r('correct',{ms:12000}),2,'slow recall is not easy');
 assert.equal(r('correct',{hinted:true}),1,'assisted recall returns for an unaided attempt');
 assert.equal(r('correct',{round:0}),2,'round 0 never skips the production round');
 assert.equal(r('correct',{round:2}),2,'a retry after a miss is never easy');
 assert.equal(r('choice-right',{production:false}),2,'recognition is never easy');
 assert.equal(r('umlaut'),2);assert.equal(r('close'),1);assert.equal(r('wrong'),0);
 const answers=[{id:'a',rating:0,at:1},{id:'b',rating:2,at:2},{id:'a',rating:2,at:3},{id:'c',rating:3,at:4}];
 assert.equal(m.currentStreak({answers}),3);
 assert.deepEqual(m.sessionSummary({answers,newIds:['c','z']}),{answers:4,correct:3,assisted:0,accuracy:75,words:3,hard:['a'],met:['c']});
});
test('daily page uses the exercise flow and patterns show Turkish',()=>{
 const ui=fs.readFileSync('components/daily-vocabulary.tsx','utf8');
 assert.ok(ui.includes('<DailyExercise '));assert.ok(ui.includes('sessionSummary(session)'));
 const data=JSON.parse(fs.readFileSync('data/compact-card-data.json','utf8'));
 for(const group of ['nouns','verbPatterns','adjectives'])for(const [w,rows] of Object.entries(data[group]))for(const r of rows)assert.ok(r[0]&&r[1],`${group}/${w} needs German and Turkish`);
});
test('a miss comes back until answered (successive relearning) and starters no longer end the session',()=>{
 const {outputFiles:[f]}=buildSync({entryPoints:['lib/daily-vocabulary.ts'],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['../components/*']});
 const d={exports:{}};new Function('module','exports','require',f.text)(d,d.exports,require);const v=d.exports;
 const base={version:1,day:'2026-11-12',elapsed:0,answers:[],finished:false,queue:[{id:'a',reverse:true,round:1},{id:'b',reverse:false,round:0}]};
 let s=v.advanceDaily(base,0,1);assert.deepEqual(s.queue.map(i=>[i.id,i.round]),[['b',0],['a',2]]);
 s=v.advanceDaily(s,2,2);s=v.advanceDaily(s,0,3);assert.deepEqual(s.queue.map(i=>[i.id,i.round]),[['a',3]],'second miss → last retry');
 s=v.advanceDaily(s,0,4);assert.equal(s.queue.length,0,'capped after two retries');
 const seeds=['seed-1','seed-2','seed-3'].map(id=>({id,due:0,interval:0,reviews:0,word:id==='seed-1'?'warten':id==='seed-2'?'helfen':'gehen',meaning:'x',article:''}));
 const started={...base,queue:[{id:'seed-2',reverse:false,round:0}],answers:[{id:'seed-1',rating:2,at:1}]};
 assert.equal(v.continueDailySession(started,seeds).queue.length,1,'starter-only learners keep their queue');
});
test('focus mode hides navigation and wrong answers must be corrected before continuing',()=>{
 const page=fs.readFileSync('app/page.tsx','utf8'),ui=fs.readFileSync('components/daily-exercise.tsx','utf8');
 assert.ok(page.includes("'app-shell'+(dailyWordsActive?' is-studying':'')"));
 assert.ok(ui.includes('const canContinue=done&&(!needsFix||fixed)&&!busy;'));
 assert.ok(!ui.includes('RATINGS'),'no free self-rating buttons');
});
test('about a third of known words become a listening exercise, never new or multi-word ones',()=>{
 const info={example:'',translation:''};
 const kinds=Array.from({length:300},(_,i)=>m.exerciseFor({round:0},false,card('w'+i,{reviews:2}),info,false,'2026-11-12'));
 const listen=kinds.filter(k=>k==='listen').length;
 assert.ok(listen>70&&listen<170,'listen share '+listen);
 assert.equal(m.exerciseFor({round:0},false,card('zzz yyy',{reviews:4}),info,false,'x'),'choice','multi-word headword without patterns');
 assert.equal(m.exerciseFor({round:0},false,card('neu'),info,false,'x'),'intro');
});
test('preposition quiz: governed patterns only, right answer once, no contracted give-aways',()=>{
 const q=m.patternQuizFor('warten','2026-11-12');
 assert.equal(q.answer,'auf');assert.equal(q.governed,'Akkusativ');assert.equal(q.after,'jemanden/etwas warten');assert.equal(q.tr,'birini / bir şeyi beklemek');
 assert.equal(q.options.length,4);assert.equal(q.options.filter(o=>o.correct).length,1);assert.equal(new Set(q.options.map(o=>o.label)).size,4);
 assert.deepEqual(m.patternQuizFor('warten','2026-11-12'),q,'stable per day');
 assert.equal(m.patternQuizFor('freuen','x').before,'sich','reflexive verbs are found without "sich"');
 assert.equal(m.patternQuizFor('Arbeit','x').governed,'Dativ','"bei der Arbeit sein" now states its case');
 assert.equal(m.patternQuizFor('helfen','x').answer,'bei','helfen now has "jemandem bei etwas helfen · bei + Dativ"');
 const info={example:'',translation:''};
 assert.notEqual(m.exerciseFor({round:0},false,card('warten',{reviews:1}),info,false,'d'),'pattern','needs two reviews first');
 const kinds=new Set(Array.from({length:60},(_,i)=>m.exerciseFor({round:0},false,card('warten',{id:'w'+i,word:'warten',reviews:3}),info,false,'d')));
 assert.ok(kinds.has('pattern'));
});
test('one more round for missed words is offered until the daily goal is reached',()=>{
 const {outputFiles:[f]}=buildSync({entryPoints:['lib/daily-vocabulary.ts'],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'},external:['../components/*']});
 const d={exports:{}};new Function('module','exports','require',f.text)(d,d.exports,require);const v=d.exports;
 const done={version:1,day:'2026-11-12',elapsed:60000,answers:[],finished:true,queue:[]};
 const next=v.hardRound(done,['a','b','a']);
 assert.equal(next.finished,false);assert.deepEqual(next.queue,[{id:'a',reverse:true,round:2},{id:'b',reverse:true,round:2}]);
 assert.ok(v.readDailySession(JSON.stringify(next),null),'still a valid, syncable session');
 assert.equal(v.hardRound({...done,elapsed:v.DAILY_TARGET_MS},['a']).finished,true);
 assert.equal(v.hardRound(done,[]),done);
});
test('the Turkish prompt for typing the German word never contains that word, but keeps the rest of the hint',()=>{
 const p=m.promptMeaning;
 assert.equal(p({word:'bewerben'},'(sich um etwas bewerben) başvurmak; (etwas bewerben) tanıtımını / reklamını yapmak'),'(sich um etwas ＿＿＿) başvurmak; (etwas ＿＿＿) tanıtımını / reklamını yapmak');
 assert.equal(p({word:'helfen'},'yardım etmek (+ Dativ · Wem?)'),'yardım etmek (+ Dativ · Wem?)');
 assert.equal(p({word:'Haus'},'ev; Haus bina'),'ev; ＿＿＿ bina');
 assert.equal(p({word:'die Wirtschaft'},'ekonomi; Wirtschaft'),'ekonomi; ＿＿＿');
 assert.equal(p({word:'an'},'yanında'),'yanında','very short words are left alone');
 assert.ok(!/bewerb/i.test(p({word:'bewerben'},'(sich bewerbend) bewerbung')));
});

test('Salat receives a real Turkish recall clue without revealing the German answer',()=>{
 const clue=m.recallPrompt({word:'Salat'},'salata');
 assert.match(clue,/sebzeler/);
 assert.doesNotMatch(clue,/salat|＿＿＿/i);
 assert.equal(m.recallPrompt({word:'Tennis'},'tennis'),'');
});

test('a missed article is isolated and a lexical retry can change the sentence',()=>{
 const c=card('a',{word:'Salat',article:'der',meaning:'salata',reviews:1});
 const info={example:'Möchtest du einen Salat zum Mittagessen?',translation:'Öğle yemeğinde salata ister misin?'};
 assert.equal(m.exerciseFor({round:2,retry:{kind:'article'}},false,c,info,true),'article');
 const other=m.clozeCandidate(c,info,info.example);
 assert.equal(other.source.de,'Ich nehme den Salat ohne Zwiebeln.');
 assert.equal(m.exerciseFor({round:2,retry:{kind:'context',previousSentence:info.example}},false,c,info,true),'cloze');
});

test('achten has a corrected sense example and its preposition transfers to a fresh context',()=>{
 const fixture=card('a',{word:'achten',meaning:'saygı duymak',example:'Alle achten ihn.',translation:'Herkes onu ziyaret eder.'});
 assert.equal(m.exampleOf(fixture,{example:'',translation:''}).translation,'Herkes ona saygı duyar.');
 const quiz=m.patternQuizFor('achten');
 assert.equal(quiz.answer,'auf');
 assert.equal(m.contextualPatternQuiz('achten',quiz,2).full,'Sie achtet auf den Preis.');
 assert.equal(m.contextualPatternQuiz('achten',quiz,3).full,'Achte bitte auf die Durchsage.');
});
