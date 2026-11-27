import {dailyMeaning,type DailyCard,type DailyItem,type DailySession} from './daily-vocabulary';
import {checkTypedAnswer,type TypedResult} from './typed-answer';
import type {Rating} from './review-scheduler';
import {candidatesFor,studyExamples,type Candidate} from './examples';
import {choosePattern,patternRows,phraseOf,rowsFor,type PatternPick,type PatternProgress,type PatternRow} from './pattern-practice';
export {patternRows,phraseOf};

/**
 * Exercise chosen for one queue item. The session schema stays unchanged (id/reverse/round),
 * so sessions keep syncing between devices; the exercise is derived from it.
 *  - intro  : first meeting with a new word, then a meaning choice
 *  - choice : German → pick the Turkish meaning (4 options)
 *  - cloze  : Turkish sentence + German sentence with the word blanked, type it
 *  - recall : Turkish meaning → type the German word (with article)
 *  - reverse-choice : Turkish → pick the German word (relearning after a miss)
 *  - pattern : which preposition does this word take? (Rektion; for words seen at least twice)
 *  - listen : hear the German word, type it (dictation)
 *  - build-sentence : Turkish sentence → put the German words in order (word order, from real examples)
 *  - build-pattern : Turkish pattern → put the German collocation together
 *  - pattern-fill : a pattern with one word missing, type it
 *  - pattern-type : Turkish pattern → type the whole German pattern
 *  - pattern-case : which case does the preposition of this pattern take? (Akkusativ / Dativ / Genitiv)
 */
export type ExerciseKind='intro'|'choice'|'listen'|'pattern'|'build-sentence'|'build-pattern'|'pattern-fill'|'pattern-type'|'pattern-case'|'cloze'|'recall'|'reverse-choice'|'article';
/** Exercises that practise one specific pattern and report to its own progress. */
export const PATTERN_KINDS:readonly ExerciseKind[]=['pattern','build-pattern','pattern-fill','pattern-type','pattern-case'];
export const isPatternKind=(k:ExerciseKind)=>PATTERN_KINDS.includes(k);
export type Cloze={before:string;answer:string;after:string;translation:string};
export type Choice={id:string;label:string;correct:boolean};

const ARTICLES=/^(der|die|das)\s+/i;
const lower=(s:string)=>s.normalize('NFC').toLocaleLowerCase('de');

/** The best example for a card (own sentence, reviewed sentence, then Tatoeba). */
export function exampleOf(card:Pick<DailyCard,'word'|'example'|'translation'>,info:{example:string;translation:string}){
 const c=candidatesFor(card,info)[0];return c?{example:c.de,translation:c.tr}:{example:'',translation:''};
}
/** First example sentence in which the headword (or an inflected form) can be blanked. */
export function clozeCandidate(card:Pick<DailyCard,'word'|'example'|'translation'>,info:{example:string;translation:string},exclude?:string):{cloze:Cloze;source:Candidate}|null{
 for(const c of studyExamples(card,info)){if(c.de===exclude||!c.tr)continue;const cloze=clozeFor(c.de,card.word,c.tr);if(cloze)return{cloze,source:c};}
 return null;
}
/** Which pattern exercise fits the pattern's progress: harder with every success. */
export function patternKindFor(pick:PatternPick):ExerciseKind{
 if(pick.tier===0)return patternQuizOfRow(pick.row,'x')?'pattern':'build-pattern';
 if(pick.tier===1)return caseQuizOfRow(pick.row)&&seeded(pick.row.id+':tier1')()<0.5?'pattern-case':'build-pattern';
 if(pick.tier===2)return fillQuizOfRow(pick.row,pick.row.word,'x')?'pattern-fill':'build-pattern';
 return 'pattern-type';
}
const FUNCTION_WORDS=new Set(['an','auf','aus','bei','für','gegen','in','mit','nach','über','um','unter','von','vor','zu','zum','zur','im','am','vom','beim','ins','ans','bis','durch','ohne','seit','der','die','das','ein','und','oder','dass','weil']);
/** Dictation works for single content words; lone function words ("in", "im", "um") are ambiguous to hear. */
export const listenable=(word:string)=>{const w=spokenForm(word);return !!w&&!w.includes(' ')&&!FUNCTION_WORDS.has(w.toLocaleLowerCase('de'));};
export function exerciseFor(item:Pick<DailyItem,'round'|'retry'>,reverse:boolean,card:Pick<DailyCard,'id'|'reviews'|'word'|'article'|'patterns'|'example'|'translation'>,info:{example:string;translation:string},answeredToday:boolean,seed='',patterns?:PatternProgress|null,now=Date.now()):ExerciseKind{
 if(item.retry?.kind==='article'&&/^(der|die|das)$/.test(card.article||''))return 'article';
 if(item.retry?.kind==='context')return clozeCandidate(card,info,item.retry.previousSentence)?'cloze':item.round===2?'recall':'reverse-choice';
 if(item.retry?.kind==='pattern'){
  const retry=item.retry;
  const row=rowsFor(card).find(r=>r.id===retry.patternId);
  if(row){
   if(retry.focus==='case'&&caseQuizOfRow(row))return 'pattern-case';
   if(retry.focus==='preposition'&&patternQuizOfRow(row,seed))return 'pattern';
   return 'pattern-type';
  }
 }
 // Retries after a miss: a pattern that was just missed comes back typed (with a hint); otherwise a hinted recall, then a choice as the last scaffold.
 if(item.round===2){const pick=choosePattern(card,patterns,seed,now);return pick&&pick.rank===0?'pattern-type':'recall';}
 if(item.round>=3)return 'reverse-choice';
 if(!reverse){
  if(card.reviews===0&&!answeredToday)return 'intro';
  // A pattern that is new, due or just missed takes about every second question of its word: patterns are not optional.
  const pick=card.reviews>=1?choosePattern(card,patterns,seed,now):null;
  if(pick&&pick.rank<=2&&seeded(card.id+':pat:'+seed+':'+card.reviews)()<0.5)return patternKindFor(pick);
  const pool:[ExerciseKind,number][]=[['choice',3]];
  if(card.reviews>=1&&listenable(card.word))pool.push(['listen',2]);
  if(card.reviews>=2&&buildQuizFor(card.word,'sentence',seed,card,info))pool.push(['build-sentence',2]);
  const total=pool.reduce((n,[,w])=>n+w,0);let pick2=seeded(card.id+':kind:'+seed+':'+card.reviews)()*total;
  for(const [kind,w] of pool){if(pick2<w)return kind;pick2-=w;}
  return 'choice';
 }
 // The typed (production) round is shared with patterns: a pattern that needs practice replaces the word question about half the time.
 const pick=card.reviews>=1?choosePattern(card,patterns,seed,now):null;
 if(pick&&pick.rank<=2&&seeded(card.id+':patr:'+seed+':'+card.reviews)()<0.5)return patternKindFor(pick);
 return clozeCandidate(card,info)?'cloze':'recall';
}

const VERB_ENDINGS=new Set(['','e','st','t','en','n','et','est','te','ten','tet','test','end']);
const NOUN_PLURAL_ENDINGS=new Set(['e','en','er','ern','n','s']);
const INSEPARABLE=/^(be|emp|ent|er|ge|miss|ver|zer)/;
function umlautStem(s:string){
 const m=s.match(/^(.*?)(au|[aou])([^aeiouyäöü]*)$/);
 if(!m)return '';
 const v=m[2]==='au'?'äu':m[2]==='a'?'ä':m[2]==='o'?'ö':'ü';
 return m[1]+v+m[3];
}
/**
 * Finds the headword (or an inflected form of it) in the example sentence.
 * Verbs match their whole stem plus a verb ending (warten → warte, wartet), never a shorter prefix, so
 * "Gehalt" or "gehört" are not mistaken for gehen. Nouns and adjectives match the whole word plus a short
 * declension ending (Frage → Fragen, but not the verb form "Fragt"); very short words must match exactly.
 */
export function clozeFor(example:string|undefined,word:string,translation=''):Cloze|null{
 if(!example||!word||word.includes(' '))return null;
 const bare=word.replace(ARTICLES,'');
 const isCapital=/^\p{Lu}/u.test(bare);
 const lemma=lower(bare);
 const isVerb=/^\p{Ll}/u.test(bare)&&/(en|ln|rn)$/.test(lemma)&&lemma.length>=4;
 const stem=isVerb?lemma.replace(/(e?n|ern|eln)$/,''):lemma;
 const maxExtra=lemma.length<=3?0:lemma.length<=5?2:3;
 // nouns on -um/-on/-us form their plural on -en (Medium → Medien, Studium → Studien)
 const pluralStem=!isVerb&&isCapital&&/(um|on|us)$/.test(lemma)?lemma.slice(0,-2):'';
 const umlautNoun=!isVerb&&isCapital&&lemma.length>=3?umlautStem(lemma):'';
 const participle=!isVerb||stem.length<3||INSEPARABLE.test(lemma)||/ieren$/.test(lemma)?'':(/[dt]$/.test(stem)?`ge${stem}et`:`ge${stem}t`);
 const tokens=[...example.matchAll(/[\p{L}\p{M}]+/gu)];
 let best:RegExpMatchArray|undefined;
 for(const [i,t] of tokens.entries()){
  if(isCapital&&!/^\p{Lu}/u.test(t[0]))continue;
  const w=lower(t[0]);
  if(w===lemma){best=t;break;}
  if(isVerb){
   // a capitalised word inside the sentence is a noun, not a verb form
   if(i>0&&/^\p{Lu}/u.test(t[0]))continue;
   if(!best&&stem.length>=3&&w.startsWith(stem)&&VERB_ENDINGS.has(w.slice(stem.length)))best=t;
   if(!best&&participle&&(w===participle||w===`ge${stem}en`))best=t;
  }else{
   if(w.startsWith(lemma)&&w.length-lemma.length<=maxExtra&&(!isCapital||w.slice(lemma.length)!=='t')){best=t;break;}
   if(!best&&pluralStem.length>=3&&w.startsWith(pluralStem)&&Math.abs(w.length-lemma.length)<=2)best=t;
   if(!best&&umlautNoun&&w.startsWith(umlautNoun)&&NOUN_PLURAL_ENDINGS.has(w.slice(umlautNoun.length)))best=t;
  }
 }
 if(!best||best.index===undefined)return null;
 return{before:example.slice(0,best.index),answer:best[0],after:example.slice(best.index+best[0].length),translation};
}

/** Deterministic shuffle so options do not jump around on re-render or between devices. */
function seeded(seed:string){let h=2166136261;for(let i=0;i<seed.length;i++){h^=seed.charCodeAt(i);h=Math.imul(h,16777619);}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%100000)/100000;};}

const kindOf=(c:DailyCard)=>c.partOfSpeech||(/^(der|die|das)$/.test(c.article||'')?'noun':'other');
/** What can sensibly be typed or spoken for a headword: grammar items like "weil + Nebensatz" or "um … zu" lose their placeholders. */
export const spokenForm=(word:string)=>word.replace(/\s*\+.*$/,'').replace(/…|\.\.\./g,' ').replace(/\s+/g,' ').trim();
export const wordLabel=(c:Pick<DailyCard,'word'|'article'>)=>[c.article,spokenForm(c.word)].filter(Boolean).join(' ');
/** The first Turkish meaning, which is what the choices and the typed prompt show. */
function firstSense(raw:string):string{
 let depth=0;
 for(let i=0;i<raw.length;i++){
  const ch=raw[i];
  if(ch==='(')depth++;
  else if(ch===')'&&depth>0)depth--;
  else if(depth===0&&(ch===';'||(ch===','&&!/^\s*(?:\.\.\.|…)/.test(raw.slice(i+1)))))return raw.slice(0,i).trim();
 }
 return raw.trim();
}
/**
 * The Turkish meaning as a prompt for "type / pick the German word": German usage hints in it may contain the answer
 * ("(sich um etwas bewerben) başvurmak"), so the word itself, in any form, is blanked while the rest of the hint stays.
 */
export function promptMeaning(card:Pick<DailyCard,'word'>,meaning:string){
 const lemma=card.word.normalize('NFC').trim().replace(/^(?:sich\s+)?(?:(?:der|die|das)\s+)?/i,'').toLocaleLowerCase('de');
 if(lemma.length<3||/\s/.test(lemma))return meaning;
 const stem=lemma.length>=6?lemma.replace(/(?:e?n|ern|eln)$/,''):lemma;
 const safe=stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const masked=meaning.replace(new RegExp('(?<![\\p{L}])'+safe+'[\\p{L}]*','giu'),'＿＿＿');
 return /\p{L}/u.test(masked.replace(/\([^)]*＿＿＿[^)]*\)/g,''))?masked:'';

}
const contextualMeaning:Readonly<Record<string,string>>={
 salat:'Genellikle çiğ sebzelerle hazırlanan, soğuk servis edilen yemek.',
};
export function recallPrompt(card:Pick<DailyCard,'word'>,meaning:string){
 return promptMeaning(card,meaning)||contextualMeaning[lower(card.word.replace(ARTICLES,''))]||'';
}
export const meaningLabel=(c:Pick<DailyCard,'word'|'meaning'|'article'|'qualityFlag'>&Partial<Pick<DailyCard,'example'|'translation'|'partOfSpeech'>>)=>firstSense(dailyMeaning(c as DailyCard)?.meaning||c.meaning||'').toLocaleLowerCase('tr');
/** Other words of the learner that mean the same in Turkish: a typed or chosen answer can legitimately be one of them. */
export function synonymsOf(card:DailyCard,pool:DailyCard[]):DailyCard[]{
 const mine=meaningLabel(card);if(!mine)return[];
 return pool.filter(c=>c.id!==card.id&&meaningLabel(c)===mine);
}

/** Correct answer plus up to three distractors from the learner's own words, same word type first. */
export function buildChoices(card:DailyCard,pool:DailyCard[],direction:'meaning'|'word',seed:string,meaningOf?:(c:DailyCard)=>string):Choice[]{
 // meaningOf: German explanations on German cards; words without one are left out as distractors.
 const label=(c:DailyCard)=>direction==='meaning'?(meaningOf?meaningOf(c):firstSense(dailyMeaning(c)?.meaning||c.meaning||'')):wordLabel(c);
 const maxLength=meaningOf&&direction==='meaning'?140:60;
 const right=label(card);
 const random=seeded(card.id+':'+seed+':'+direction);
 const used=new Set([lower(right)]);
 // Asking for the German word: a word with the same Turkish meaning would be a second right answer.
 const mine=meaningLabel(card);
 const others=pool.filter(c=>c.id!==card.id&&dailyMeaning(c)&&(direction==='meaning'||meaningLabel(c)!==mine)).map(c=>({c,l:label(c),r:random()}))
  .filter(o=>o.l&&o.l.length<=maxLength).sort((a,b)=>Number(kindOf(b.c)===kindOf(card))-Number(kindOf(a.c)===kindOf(card))||a.r-b.r);
 const picked:Choice[]=[];
 for(const o of others){if(picked.length===3)break;if(used.has(lower(o.l)))continue;used.add(lower(o.l));picked.push({id:o.c.id,label:o.l,correct:false});}
 const all=[...picked,{id:card.id,label:right,correct:true}];
 return all.map(o=>({o,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.o);
}

export type Verdict=TypedResult|'choice-right'|'choice-wrong'|'gave-up';
export const isGood=(v:Verdict)=>v==='correct'||v==='umlaut'||v==='choice-right';
export const isMiss=(v:Verdict)=>v==='wrong'||v==='gave-up'||v==='choice-wrong';
/**
 * Rating comes from the check, not from self-assessment (learners overestimate what they know).
 *  - miss → 0, article mistake / one-letter typo → 1, correct → 2
 *  - 3 ("easy") only for a fast, unaided production answer on the scheduled recall round;
 *    rating 3 drops the card's remaining items, so it is never given on round 0 or on retries.
 */
export function autoRating(v:Verdict,{ms,round,production,hinted,pattern=false}:{ms:number;round:number;production:boolean;hinted:boolean;pattern?:boolean}):Rating{
 // A missed pattern should not count as a forgotten word (no lapse), but the word still comes back.
 if(isMiss(v))return pattern?1:0;
 if(v==='close'||v==='article'||hinted&&isGood(v))return 1;
 if(!pattern&&production&&round===1&&!hinted&&v==='correct'&&ms<7000)return 3;
 return 2;
}
/** Kept for callers that only know the verdict. */
export function suggestedRating(result:Verdict):Rating{return autoRating(result,{ms:Infinity,round:0,production:false,hinted:false});}

export function gradeCloze(input:string,cloze:Cloze){return checkTypedAnswer(input,{word:cloze.answer,article:''});}
export function gradeRecall(input:string,card:Pick<DailyCard,'word'|'article'>){return checkTypedAnswer(input,{word:spokenForm(card.word),article:card.article});}

/** Consecutive correct answers at the end of the session. */
export function currentStreak(session:Pick<DailySession,'answers'>|null){let n=0;for(const a of [...(session?.answers||[])].reverse()){if(a.rating<2)break;n++;}return n;}

export type SessionSummary={answers:number;correct:number;assisted:number;accuracy:number;words:number;hard:string[];met:string[]};
/** Built from the session's recorded answers only. */
export function sessionSummary(session:Pick<DailySession,'answers'|'newIds'>|null):SessionSummary{
 const answers=session?.answers||[];
 const last=new Map<string,Rating>();const worst=new Map<string,Rating>();
 for(const a of answers){last.set(a.id,a.rating);worst.set(a.id,Math.min(worst.get(a.id)??3,a.rating) as Rating);}
 const correct=answers.filter(a=>a.rating>=2).length;
 return{answers:answers.length,correct,assisted:answers.filter(a=>a.assisted).length,accuracy:answers.length?Math.round(correct/answers.length*100):0,words:last.size,
  hard:[...worst].filter(([,r])=>r<=1).map(([id])=>id),met:(session?.newIds||[]).filter(id=>last.has(id))};
}

const PREPOSITIONS=['an','auf','aus','bei','für','gegen','in','mit','nach','über','um','unter','von','vor','zu'];
const CONTRACTED:Record<string,string>={zum:'zu',zur:'zu',am:'an',im:'in',vom:'von',beim:'bei',ins:'in',ans:'an'};
export type PatternQuiz={before:string;answer:string;after:string;governed:string;tr:string;full:string;options:Choice[]};

/**
 * Rektion quiz for one pattern: "auf jemanden/etwas warten · auf + Akkusativ"
 * → "___ jemanden/etwas warten", options auf / an / für / mit. Only patterns that state the
 * governed case are used, and contracted forms (zum, am …) are skipped as they give the case away.
 */
export function patternQuizOfRow(row:PatternRow,seed=''):PatternQuiz|null{
 const governed=row.de.match(/(Akkusativ|Dativ|Genitiv)\)?$/)?.[1];if(!governed)return null;
 const explicit=row.de.match(/·\s*([a-zäöüß]+)\s*\+\s*(Akkusativ|Dativ|Genitiv)/i)?.[1]?.toLocaleLowerCase('de');
 const tokens=row.phrase.split(' '),lowTokens=tokens.map(t=>t.toLocaleLowerCase('de'));
 const at=explicit?lowTokens.lastIndexOf(explicit):lowTokens.findIndex(t=>PREPOSITIONS.includes(t));
 if(at<0||!PREPOSITIONS.includes(lowTokens[at])||lowTokens.some(t=>Object.hasOwn(CONTRACTED,t)))return null;
 const answer=lowTokens[at],random=seeded(row.word.trim().normalize('NFC')+':prep:'+seed);
 // A preposition that also occurs elsewhere in the pattern ("von etwas zu etwas") would be a second right answer.
 const wrong=PREPOSITIONS.filter(x=>x!==answer&&!lowTokens.includes(x)).map(x=>({x,r:random()})).sort((a,b)=>a.r-b.r).slice(0,3).map(o=>o.x);
 const options=[...wrong.map(x=>({id:x,label:x,correct:false})),{id:answer,label:answer,correct:true}].map(o=>({o,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.o);
 return{before:tokens.slice(0,at).join(' '),answer:tokens[at],after:tokens.slice(at+1).join(' '),governed,tr:row.tr,full:row.phrase,options};
}
const reviewedPrepositionContexts:Readonly<Record<string,readonly [string,string,string][]>>={
 'achten|auf':[['Sie achtet','den Preis.','Fiyata dikkat ediyor.'],['Achte bitte','die Durchsage.','Lütfen anonsa dikkat et.']],
 'warten|auf':[['Ich warte','den Bus.','Otobüsü bekliyorum.'],['Wir warten','eine Antwort.','Bir yanıt bekliyoruz.']],
};
/** A checked sentence that transfers the same preposition to a real situation. */
export function contextualPatternQuiz(word:string,quiz:PatternQuiz,round:number):PatternQuiz{
 const rows=reviewedPrepositionContexts[lower(word)+'|'+quiz.answer];
 if(!rows?.length)return quiz;
 const [before,after,tr]=rows[(round-2+rows.length)%rows.length];
 return {...quiz,before,after,tr,full:[before,quiz.answer,after].join(' ')};
}
/** First pattern of a word that can be quizzed on its preposition. */
export function patternQuizFor(word:string,seed=''):PatternQuiz|null{
 for(const row of rowsFor(word)){const q=patternQuizOfRow(row,seed);if(q)return q;}
 return null;
}

export type CaseQuiz={prep:string;governed:string;tr:string;full:string;options:Choice[]};
/** Rektion: which case does the preposition of this pattern govern? Only patterns that state "prep + Case". */
export function caseQuizOfRow(row:PatternRow):CaseQuiz|null{
 const m=row.de.match(/·\s*([a-zäöüß]+)\s*\+\s*(Akkusativ|Dativ|Genitiv)/i);
 if(!m)return null;
 const prep=m[1].toLocaleLowerCase('de'),governed=m[2];
 if(!row.phrase.toLocaleLowerCase('de').split(/\s+/).includes(prep))return null;
 const cases=['Akkusativ','Dativ','Genitiv'];
 return{prep,governed,tr:row.tr,full:row.phrase,options:cases.map(c=>({id:c,label:c,correct:c===governed}))};
}

export type BuildChip={id:number;text:string};
export type BuildQuiz={kind:'sentence'|'pattern';tr:string;solution:string[];chips:BuildChip[];end:string;full:string;source?:Candidate};
function shuffleChips(solution:string[],random:()=>number){
 const chips=solution.map((t,i)=>({id:i,text:t})).map(c=>({c,r:random()})).sort((a,b)=>a.r-b.r).map(x=>x.c);
 // Make sure it is visibly mixed: too many tokens in their right place → rotate.
 for(let guard=0;guard<2&&chips.length>2&&chips.filter((c,i)=>c.text===solution[i]).length>chips.length/2;guard++)chips.push(chips.shift()!,chips.shift()!);
 if(chips.every((c,i)=>c.text===solution[i])&&chips.length>1)chips.push(chips.shift()!);
 return chips;
}
/** "Put it in order" for one pattern. */
export function buildQuizOfRow(row:PatternRow,seed=''):BuildQuiz|null{
 const solution=row.phrase.split(/\s+/).filter(Boolean);
 if(solution.length<2)return null;
 return{kind:'pattern',tr:row.tr,solution,chips:shuffleChips(solution,seeded(row.id+':build:'+seed)),end:'',full:row.phrase};
}
/**
 * "Put it in order" exercise. Sentences come from real examples (4–10 words, with Turkish),
 * collocations from the curated patterns. The shuffle is stable per day and never the solution.
 */
export function buildQuizFor(word:string,kind:'sentence'|'pattern',seed='',card?:{example?:string;translation?:string},info?:{example?:string;translation?:string}):BuildQuiz|null{
 const random=seeded(word+':build:'+kind+':'+seed);
 if(kind==='pattern'){
  const rows=rowsFor(word).filter(r=>r.phrase.split(/\s+/).length<=6);
  if(!rows.length)return null;
  return buildQuizOfRow(rows[Math.floor(random()*rows.length)],seed);
 }
 const options=studyExamples({word,example:card?.example,translation:card?.translation},{example:info?.example,translation:info?.translation}).filter(c=>c.tr&&c.de.split(/\s+/).length>=4&&c.de.split(/\s+/).length<=10);
 if(!options.length)return null;
 const source=options[Math.floor(random()*options.length)],text=source.de;
 const end=text.match(/[.!?]+$/)?.[0]||'';
 const solution=text.slice(0,text.length-end.length).split(/\s+/).filter(Boolean);
 if(solution.length<2)return null;
 return{kind:'sentence',tr:source.tr,solution,chips:shuffleChips(solution,random),end,full:text,source};
}
// ---- word order: more than one order can be right ----
const PREP_WORDS=new Set([...PREPOSITIONS,'zum','zur','im','am','vom','beim','ins','ans','durch','ohne','seit','bis','hinter','während','wegen','trotz','neben','zwischen','statt','außer']);
const PLACEHOLDERS=new Set(['jemanden','jemandem','jemand','jemandes','etwas','mich','mir','dich','dir','ihn','ihm','uns','euch','ihnen','man']);
const DETERMINERS=new Set(['der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines','mein','meine','meinen','meinem','meiner','dein','deine','deinen','deinem','sein','seine','seinen','seinem','ihr','ihre','ihren','ihrem','unser','unsere','kein','keine','keinen','keinem','jeden','jede','jedes','jedem','diesen','diese','dieses','diesem','nicht']);
const QUESTION_FIRST=new Set(['wann','warum','was','wer','wen','wem','wessen','wie','wo','woher','wohin','welche','welcher','welches','welchen','welchem','hast','habt','haben','bist','seid','sind','ist','kannst','könnt','können','kann','musst','müsst','müssen','muss','willst','wollt','wollen','will','sollst','sollt','sollen','soll','darfst','dürft','dürfen','darf','möchtest','möchtet','möchten','magst','mögt','mögen','wirst','werdet','werden','wird','machst','macht','gehst','geht','kommst','kommt','gibst','gibt','nimmst','nimmt','brauchst','braucht']);
const low=(t:string)=>t.toLocaleLowerCase('de').replace(/[.,;:!?]+$/,'');
const sameWords=(a:string[],b:string[])=>a.length===b.length&&[...a].sort().join('\u0001')===[...b].sort().join('\u0001');
function permutations<T>(items:T[]):T[][]{
 if(items.length<=1)return[items];
 return items.flatMap((x,i)=>permutations([...items.slice(0,i),...items.slice(i+1)]).map(rest=>[x,...rest]));
}
/**
 * Other word orders of a pattern that are just as correct. A pattern that ends in its verb is made of a
 * verb plus complements ("jemanden", "über etwas", "zu einer Feier"); the complements may swap places
 * (über etwas jemanden benachrichtigen) but never split up or move behind the verb. "sich" stays first.
 */
export function alternativeOrders(solution:string[]):string[][]{
 const n=solution.length,last=solution[n-1]||'';
 const verbFinal=/^[a-zäöüß]+(en|ln|rn)$/.test(last)||['sein','werden','haben','tun'].includes(last);
 if(n<3||!verbFinal)return[solution];
 const pinned=low(solution[0])==='sich'?[solution[0]]:[];
 const groups:string[][]=[];
 for(let i=pinned.length;i<n-1;i++){
  const t=low(solution[i]),prevIsPrep=i>pinned.length&&PREP_WORDS.has(low(solution[i-1]));
  const starts=i===pinned.length||PREP_WORDS.has(t)||(PLACEHOLDERS.has(t)&&!prevIsPrep);
  if(starts||!groups.length)groups.push([solution[i]]);else groups[groups.length-1].push(solution[i]);
 }
 if(groups.length<2||groups.length>4)return[solution];
 return permutations(groups).map(g=>[...pinned,...g.flat(),last]);
}
/**
 * Free word order in a sentence: the finite verb stays in second place, a final verb form stays last, and
 * a determiner or preposition keeps its noun right behind it ("dem Kind", "jeden Tag", "mit dem Bus").
 * This accepts "Heute habe ich Zeit" for "Ich habe heute Zeit" without accepting "Ich helfe Kind dem Tag".
 */
export function plausibleSentenceOrder(placed:string[],solution:string[]):boolean{
 const n=solution.length;
 const sameCaseInsensitive=placed.length===n&&[...placed.map(low)].sort().join('\u0001')===[...solution.map(low)].sort().join('\u0001');
 if(n<4||!sameCaseInsensitive)return false;
 if(QUESTION_FIRST.has(low(solution[0]))||/\?$/.test(solution[n-1]))return false;
 // A sentence-final verb form (…gelesen, …kommen, …gemacht) stays at the end; a final noun or adverb may move.
 const lastIsVerb=/^\p{Ll}[\p{L}]*(en|t|n)[.,!?]*$/u.test(solution[n-1]);
 if(lastIsVerb&&low(placed[n-1])!==low(solution[n-1]))return false;
 const verb=low(solution[1]),vAt=placed.findIndex(w=>low(w)===verb);
 const vorfeldOk=vAt===1||(vAt>=2&&vAt<=3&&PREP_WORDS.has(low(placed[0]))&&low(placed[vAt+1]||'')===low(solution[0]));
 if(!vorfeldOk)return false;
 for(let i=0;i<n-1;i++){
  const t=low(solution[i]);
  const isAttrAdj=i>=2&&/^[a-zäöüß]+(e|en|er|es|em)$/.test(solution[i])&&!/^(heute|gerade|lange|immer|wieder|schon|gerne)$/.test(t)&&/^\p{Lu}/u.test(solution[i+1]);
  if(!DETERMINERS.has(t)&&!PREP_WORDS.has(t)&&!isAttrAdj)continue;
  if(solution.filter(x=>low(x)===t).length>1)continue;
  const j=placed.findIndex(w=>low(w)===t);
  if(low(placed[j+1]||'')!==low(solution[i+1]))return false;
 }
 return true;
}
/** 'correct' exact order, 'alt' another valid order, 'close' same words in an unnatural order, 'wrong' otherwise. */
export function gradeBuild(placed:string[],solution:string[],kind?:'sentence'|'pattern'):'correct'|'alt'|'close'|'wrong'{
 if(placed.length===solution.length&&placed.every((t,i)=>t===solution[i]))return 'correct';
 if(!sameWords(placed,solution)){
  if(kind==='sentence'&&plausibleSentenceOrder(placed,solution))return 'alt';
  return 'wrong';
 }
 if(kind==='pattern'&&alternativeOrders(solution).some(o=>o.every((t,i)=>t===placed[i])))return 'alt';
 if(kind==='sentence'&&plausibleSentenceOrder(placed,solution))return 'alt';
 return 'close';
}

// ---- fill the missing word / type the whole pattern ----
const FILLER=new Set(['der','die','das','den','dem','des','ein','eine','einen','einem','einer','eines','jemanden','jemandem','jemand','etwas','sich','mir','dir','ihm','ihr','uns','euch','ihnen','man','und','oder','nicht','kein','keine',...PREPOSITIONS]);
export type FillQuiz={before:string;answer:string;after:string;tr:string;full:string};
/** One content word of the pattern is blanked: the partner of the headword when there is one, otherwise the headword itself. */
export function fillQuizOfRow(row:PatternRow,word:string,seed=''):FillQuiz|null{
 void seed;
 const tokens=row.phrase.split(/\s+/).filter(Boolean),head=lower(word.replace(/^sich\s+/,''));
 const picks=tokens.map((raw,i)=>({t:raw.replace(/[.,;:!?]+$/,''),punct:raw.match(/[.,;:!?]+$/)?.[0]||'',i})).filter(({t})=>t.length>=4&&!t.includes('/')&&!FILLER.has(lower(t)));
 if(!picks.length)return null;
 const isHead=(t:string)=>{const l=lower(t);return l===head||l.startsWith(head.slice(0,Math.max(3,head.length-2)));};
 const pick=picks.find(({t})=>!isHead(t))||picks[0];
 const rest=tokens.slice(pick.i+1).join(' ');
 return{before:tokens.slice(0,pick.i).join(' '),answer:pick.t,after:pick.punct?(rest?pick.punct+' '+rest:pick.punct):rest,tr:row.tr,full:row.phrase};
}
function levenshtein(a:string,b:string){
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++)row[j]=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}
 return prev[b.length];
}
const flat=(s:string)=>lower(s).replace(/[.,;:!?"'„“”()]/g,'').replace(/\s+/g,' ').trim();
const ascii=(s:string)=>s.replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss');
/** Typed pattern: exact, umlaut transliteration, near miss (same words in another order, or one–two letters off) or wrong. */
export function gradePhrase(input:string,phrase:string):'correct'|'umlaut'|'close'|'wrong'|null{
 const a=flat(input),b=flat(phrase);
 if(!a)return null;
 if(a===b)return 'correct';
 if(ascii(a)===ascii(b))return 'umlaut';
 // Another valid order of the complements is just as right as the one in the book.
 if(alternativeOrders(phrase.split(/\s+/).filter(Boolean)).some(o=>flat(o.join(' '))===a))return 'correct';
 if(a.split(' ').sort().join(' ')===b.split(' ').sort().join(' '))return 'close';
 return b.length>=10&&levenshtein(a,b)<=2?'close':'wrong';
}
/** "g••• e••• R••• v••••" for a typed pattern hint: the first letter of every word. */
export const phraseSkeleton=(phrase:string)=>phrase.split(/\s+/).map(w=>[...w].map((c,i)=>i===0||/[/\-]/.test(c)?c:'•').join('')).join(' ');
