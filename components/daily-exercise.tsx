'use client';
import Reading from './reading';
import {useEffect,useMemo,useRef,useState} from 'react';
import DailyAnswer from './daily-answer';
import DailyWordPhoto from './daily-word-photo';
import SpeakButton from './speak-button';
import {dailyPhoto,type DailyFeedback,type DailyRetry,type DailyCard,type dailyMeaning} from '../lib/daily-vocabulary';
import {autoRating,buildChoices,buildQuizFor,buildQuizOfRow,clozeCandidate,clozeFor,contextualPatternQuiz,fillQuizOfRow,gradeBuild,gradeCloze,gradePhrase,gradeRecall,isGood,isMiss,caseQuizOfRow,isPatternKind,patternQuizOfRow,phraseSkeleton,recallPrompt,spokenForm,synonymsOf,wordLabel,type BuildChip,type ExerciseKind,type Verdict} from '../lib/daily-exercise';
import {choosePattern,rankPatterns,rowsFor,type PatternProgress} from '../lib/pattern-practice';
import {studyExamples,tatoebaLink,type Candidate} from '../lib/examples';
import {checkTypedAnswer,TYPED_FEEDBACK} from '../lib/typed-answer';
import {compactFacts,compactKind} from '../lib/compact-card';
import {getRection} from '../lib/rection';
import {readAloud} from '../lib/read-aloud';
import type {Rating} from '../lib/review-scheduler';
import {useCardLanguage,pick,kindLabel} from '../lib/card-language';
import {shortGermanMeaning,useBundledGermanMeanings,useGermanMeaning} from '../lib/use-german-meaning';
import {findGermanMeaning} from '../lib/german-meaning';
import TurkishHint from './turkish-hint';
import CardLanguageSwitch from './card-language-switch';

type Info=NonNullable<ReturnType<typeof dailyMeaning>>;
export type PatternMeta={patternId:string;ok:boolean};
type Props={card:DailyCard;info:Info;kind:ExerciseKind;round:number;pool:DailyCard[];seed:string;busy:boolean;onRate:(rating:Rating,meta?:PatternMeta,feedback?:DailyFeedback)=>void;onMistake?:(m:{kind:ExerciseKind;word:string;expected:string;given:string})=>void;patterns?:PatternProgress|null;forcePatternId?:string;retry?:DailyRetry;autoAdvance?:boolean};
type Outcome={verdict:Verdict;text?:string;note?:string};

const PROMPTS:Record<string,string>={choice:'ANLAMI HANGİSİ?',listen:'DUYDUĞUNU YAZ',pattern:'HANGİ EDAT?','build-sentence':'CÜMLEYİ KUR','build-pattern':'KALIBI KUR','pattern-fill':'KALIBI TAMAMLA','pattern-type':'KALIBI YAZ','pattern-case':'HANGİ HÂL?','reverse-choice':'ALMANCASI HANGİSİ?',cloze:'CÜMLEYİ TAMAMLA',recall:'ALMANCASINI YAZ',article:'ARTİKELİ SEÇ'};

/** A short vibration on phones: confirms a right answer, nudges on a miss. */
function buzz(pattern:number|number[]){try{navigator.vibrate?.(pattern);}catch{/* not supported */}}
/** "der Tisch" → "der T••••": the article stays, the word keeps only its first letter. */
function mask(answer:string,article=''){const word=article&&answer.startsWith(article+' ')?answer.slice(article.length+1):answer;return (article?article+' ':'')+[...word].map((ch,i)=>i===0||/[\s-]/.test(ch)?ch:'•').join('');}

function ArticleWord({card,big=false}:{card:Pick<DailyCard,'word'|'article'>;big?:boolean}){
 return <span className={'exercise-word'+(big?' exercise-word-big':'')} lang="de">{card.article&&<span className={'article-color article-'+card.article}>{card.article} </span>}{card.word}</span>;
}

/** A sentence with the practised word highlighted, its Turkish meaning, a listen button and credit when it comes from Tatoeba. */
/** The word's explanation on the intro card: German by default, the saved Turkish meaning on Turkish cards or when none is known. */
function CardMeaning({word,meaning}:{word:string;meaning:string}){
 const lang=useCardLanguage();const german=useGermanMeaning(word,lang==='de');
 if(lang==='de'&&german.meaning)return <><p className="intro-meaning" lang="de">{german.meaning}</p><TurkishHint meaning={meaning}/></>;
 return <p className="intro-meaning" lang="tr">{lang==='de'&&!german.loading&&<span className="meaning-fallback" lang="de">Türkische Bedeutung</span>}{meaning}</p>;
}
function Sentence({cand,word,className='result-example'}:{cand:Candidate;word:string;className?:string}){
 const lang=useCardLanguage();const tr=lang==='tr'?cand.tr:'';
 const c=clozeFor(cand.de,word,cand.tr);
 return <blockquote className={className}>
  <p lang="de">{c?<>{c.before}<mark>{c.answer}</mark>{c.after}</>:cand.de}</p>
  {tr&&<p lang="tr">{tr}</p>}
  <Reading text={cand.de} sentence card/>
  <span className="sentence-tools"><SpeakButton de={cand.de} tr={tr} label={pick(lang,'Satz anhören','Cümleyi dinle')} title={cand.de}/>{cand.origin==='tatoeba'&&cand.id&&<a className="credit" href={tatoebaLink(cand.id)} target="_blank" rel="noreferrer">Tatoeba{cand.by?' · '+cand.by:''} · CC BY 2.0 FR</a>}</span>
 </blockquote>;
}

/** Tap-to-order board shared by sentence and collocation exercises. */
export function Board({chips,placed,onPlace,onRemove,end,locked}:{chips:BuildChip[];placed:number[];onPlace:(id:number)=>void;onRemove:(id:number)=>void;end:string;locked:boolean}){
 const byId=new Map(chips.map(c=>[c.id,c]));
 return <div className="build-board">
  <div className={'build-line'+(placed.length?'':' empty')} aria-label="Kurduğun sıra" aria-live="polite">
   {placed.map(id=><button key={id} type="button" className="chip placed" disabled={locked} onClick={()=>onRemove(id)} lang="de">{byId.get(id)?.text}</button>)}
   {placed.length===0&&<span className="build-hint">Kelimelere dokunarak sırala</span>}
   {end&&placed.length>0&&<span className="build-end" aria-hidden="true">{end}</span>}
  </div>
  <div className="build-bank" role="group" aria-label="Kelimeler">
   {chips.map(c=>placed.includes(c.id)?<span key={c.id} className="chip ghost" aria-hidden="true">{c.text}</span>:<button key={c.id} type="button" className="chip" disabled={locked} onClick={()=>onPlace(c.id)} lang="de">{c.text}</button>)}
  </div>
 </div>;
}

export default function DailyExercise({card,info,kind,round,pool,seed,busy,onRate,onMistake,patterns,forcePatternId,retry,autoAdvance}:Props){
 const lang=useCardLanguage(),L=<T,>(g:T,t:T)=>pick(lang,g,t);
 const stopAudioRef=useRef<(()=>void)|null>(null);
 function speak(text:string){stopAudioRef.current?.();try{stopAudioRef.current=readAloud([{text,lang:'de-DE'}],()=>{stopAudioRef.current=null;});}catch{/* speech is optional */}}
 useEffect(()=>()=>stopAudioRef.current?.(),[]);
 // Decided once per question: later changes (e.g. a freshly fetched example) must not swap the question under the learner.
 const [plan]=useState(()=>{
  const canSpeak=typeof window!=='undefined'&&'speechSynthesis' in window;
  const now=Date.now();
  // Which pattern this question is about: forced by the pattern drill, otherwise the one that needs practice most.
  const row=isPatternKind(kind)?(forcePatternId?rowsFor(card).find(r=>r.id===forcePatternId)||null:choosePattern(card,patterns,seed,now)?.row||null):null;
  const prep=kind==='pattern'&&row?patternQuizOfRow(row,seed):null;
  const quiz=prep&&retry?.kind==='pattern'?contextualPatternQuiz(card.word,prep,round):prep;
  const fill=kind==='pattern-fill'&&row?fillQuizOfRow(row,card.word,seed):null;
  const caseQuiz=kind==='pattern-case'&&row?caseQuizOfRow(row):null;
  let build=kind==='build-sentence'?buildQuizFor(card.word,'sentence',seed,card,info):kind==='build-pattern'&&row?buildQuizOfRow(row,seed):null;
  let asked:Exclude<ExerciseKind,'intro'>=kind==='intro'?'recall':kind;
  if(kind==='listen'&&!canSpeak)asked='choice';
  const context=retry?.kind==='context'?retry.previousSentence:undefined;
  const clue=recallPrompt(card,info.meaning);
  const needsContext=kind==='cloze'||kind==='recall'||kind==='intro'||kind==='reverse-choice';
  const cc=needsContext?clozeCandidate(card,info,context):null;
  if(kind==='cloze'&&!cc)asked=clue?'recall':'choice';
  if((asked==='recall'||asked==='reverse-choice')&&!clue)asked=cc?'cloze':'choice';
  if(kind==='build-sentence'&&!build)asked='choice';
  if(isPatternKind(kind)){
   // The harder kinds fall back to ordering the words when the pattern does not fit them.
   if(!row)asked='choice';
   else if(kind==='pattern'&&!quiz||kind==='pattern-fill'&&!fill||kind==='pattern-case'&&!caseQuiz||kind==='build-pattern'&&!build){build=buildQuizOfRow(row,seed);asked=build?'build-pattern':'choice';}
  }
  const cands=studyExamples(card,info);
  // After an answer: show a sentence in which the word is used (own sentence first).
  const sample=cands.find(c=>clozeFor(c.de,card.word,c.tr)&&c.tr)||cands.find(c=>c.tr)||cands[0]||null;
  // New words: the first patterns are copied once with the solution in sight, so they are not just glanced at.
  const copyRows=kind==='intro'?rankPatterns(card,patterns,seed,now).slice(0,2).map(p=>p.row):[];
  return {quiz,fill,caseQuiz,build,cands,cc,asked,clue,sample,row,copyRows};
 });
 const {quiz,fill,caseQuiz,build,cands,cc,asked:askKind,clue,sample,row:patternRow,copyRows}=plan;
 // German cards: choices and "which word is meant?" prompts use German explanations when every needed one is known.
 const germanWords=useBundledGermanMeanings(lang==='de');
 const germanClue=germanWords?shortGermanMeaning(germanWords,card.word):'';
 const germanFull=germanWords?findGermanMeaning(germanWords,card.word):'';
 const patternish=isPatternKind(askKind)&&!!patternRow;
 const cloze=askKind==='cloze'?cc?.cloze||null:null;
 const building=askKind==='build-sentence'||askKind==='build-pattern';
 // Words that mean the same in Turkish: asking for one of them is ambiguous, so a hint is shown and the others are accepted as near misses.
 const synonyms=useMemo(()=>synonymsOf(card,pool),[card,pool]);
 const [stage,setStage]=useState<'learn'|'copy'|'ask'>(kind==='intro'?'learn':'ask');
 const [copyIdx,setCopyIdx]=useState(0);
 const [copyPlaced,setCopyPlaced]=useState<number[]>([]);
 const [text,setText]=useState('');
 const [placed,setPlaced]=useState<number[]>([]);
 const [fixPlaced,setFixPlaced]=useState<number[]>([]);
 const [outcome,setOutcome]=useState<Outcome|null>(null);
 const [rating,setRating]=useState<Rating>(2);
 const [hinted,setHinted]=useState(false);
 const [fix,setFix]=useState('');
 const [fixed,setFixed]=useState(false);
 const [auto,setAuto]=useState(false);
 const started=useRef(0);
 // The parent re-renders every second (session timer); keep the latest callback without restarting timers.
 const rateRef=useRef(onRate);rateRef.current=onRate;
 const input=useRef<HTMLInputElement>(null),fixInput=useRef<HTMLInputElement>(null);
 const answer=askKind==='pattern-type'&&patternRow?patternRow.phrase:askKind==='pattern-fill'&&fill?fill.answer:cloze?cloze.answer:wordLabel(card);
 const typing=askKind==='cloze'||askKind==='recall'||askKind==='listen'||askKind==='pattern-fill'||askKind==='pattern-type';
 const direction=askKind==='reverse-choice'||askKind==='pattern'||askKind==='pattern-case'||askKind==='article'?'word':'meaning';
 const choices=useMemo(()=>askKind==='article'?['der','die','das'].map(label=>({id:label,label,correct:label===card.article})):askKind==='pattern-case'&&caseQuiz?caseQuiz.options:askKind==='pattern'&&quiz?quiz.options:askKind==='choice'||askKind==='reverse-choice'?buildChoices(card,pool,direction,seed,direction==='meaning'&&germanWords&&germanClue?c=>shortGermanMeaning(germanWords,c.word):undefined):[],[card,pool,direction,seed,askKind,quiz,caseQuiz,germanWords,germanClue]);
 const facts=useMemo(()=>{const r=card.rection?.status==='known'?card.rection:getRection(card.word);return compactFacts(card.word,compactKind(card.word,card.partOfSpeech||''),[],r.status==='known'?r.patterns:[]);},[card]);
 const done=!!outcome;
 const needsFix=done&&!isGood(outcome!.verdict);
 const canContinue=done&&(!needsFix||fixed)&&!busy;
 const spokenOnRight=patternish&&patternRow?patternRow.phrase:building&&build?build.full:wordLabel(card);
 const autoMs=autoAdvance!==undefined?4000:building||patternish?2800:askKind==='cloze'?2200:1600;
 const texts=(ids:number[])=>ids.map(id=>build?.chips.find(c=>c.id===id)?.text||'');

 function finish(next:Outcome){
  setOutcome(next);
  if(!isGood(next.verdict)&&next.note!=='pattern-instead-of-word'){
   const expected=building&&build?build.full:askKind==='pattern'&&quiz?quiz.answer:askKind==='pattern-case'&&caseQuiz?caseQuiz.governed:askKind==='article'?card.article:answer;
   onMistake?.({kind:askKind,word:card.word,expected,given:next.text||''});
  }
  setRating(autoRating(next.verdict,{ms:performance.now()-started.current,round,production:typing,hinted,pattern:patternish||askKind==='article'}));
  if(isGood(next.verdict)){speak(spokenOnRight);setAuto((autoAdvance??true)&&!hinted);buzz(14);}else buzz([36,50,36]);
 }
 function choose(i:number){
  const c=choices[i];if(!c||busy)return;
  if(!done){finish({verdict:c.correct?'choice-right':'choice-wrong',text:c.label});return;}
  if(needsFix&&c.correct){setFixed(true);speak(wordLabel(card));}// tapping the right option is the active correction
 }
 function check(){
  if(done||busy)return;
  if(building&&build){if(placed.length<build.solution.length)return;const g=gradeBuild(texts(placed),build.solution,build.kind);finish({verdict:g==='alt'?'correct':g,text:texts(placed).join(' '),note:g==='alt'?'alt-order':undefined});return;}
  if(!text.trim()){finish({verdict:'gave-up'});return;}
  const verdict=askKind==='pattern-type'&&patternRow?gradePhrase(text,patternRow.phrase):askKind==='pattern-fill'&&fill?checkTypedAnswer(text,{word:fill.answer,article:''}):cloze?gradeCloze(text,cloze):gradeRecall(text,card);
  if(askKind==='recall'&&(!verdict||verdict==='wrong')){
   const validPattern=rowsFor(card).some(row=>gradePhrase(text,row.phrase)==='correct');
   if(validPattern){finish({verdict:'close',text,note:'pattern-instead-of-word'});return;}
   const other=synonyms.find(sn=>{const v=gradeRecall(text,sn);return v==='correct'||v==='umlaut';});
   if(other){finish({verdict:'close',text,note:'synonym:'+wordLabel(other)});return;}
  }
  finish({verdict:verdict||'gave-up',text});
 }
 function place(id:number){if(!done)setPlaced(p=>p.includes(id)?p:[...p,id]);}
 function unplace(id:number){if(!done)setPlaced(p=>p.filter(x=>x!==id));}
 function fixPlace(id:number){
  if(!build||fixPlaced.includes(id))return;
  const next=[...fixPlaced,id];
  setFixPlaced(next);
  if(next.length===build.solution.length){
   const g=gradeBuild(texts(next),build.solution,build.kind);
   if(g==='correct'||g==='alt'){setFixed(true);speak(build.full);}
  }
 }
 // A pattern keeps its own memory: it only counts as known when answered right without guessing.
 const metaFor=(r:Rating):PatternMeta|undefined=>patternish&&patternRow&&outcome?{patternId:patternRow.id,ok:isGood(outcome.verdict)&&r>=2}:undefined;
 function feedbackFor():DailyFeedback{
  const assisted=!!outcome&&hinted&&isGood(outcome.verdict);
  const typedPattern=outcome?.note==='pattern-instead-of-word'?rowsFor(card).find(row=>gradePhrase(outcome.text||'',row.phrase)==='correct'):undefined;
  const previousSentence=cloze?cc?.source.de:sample?.de;
  const retry:DailyRetry=typedPattern?{kind:'pattern',patternId:typedPattern.id,focus:patternQuizOfRow(typedPattern,seed)?'preposition':'phrase'}
   :askKind==='article'||outcome?.verdict==='article'?{kind:'article'}
   :patternish&&patternRow?{kind:'pattern',patternId:patternRow.id,focus:askKind==='pattern-case'?'case':quiz||patternQuizOfRow(patternRow,seed)?'preposition':'phrase'}
   :{kind:'context',...(previousSentence&&previousSentence.length<=280?{previousSentence}:{})};
  return {assisted,retry};
 }
 function submit(){if(canContinue)rateRef.current(rating,metaFor(rating),feedbackFor());}
 function guessed(){setAuto(false);setRating(r=>Math.min(r,1) as Rating);}

 useEffect(()=>{if(stage==='learn')speak(wordLabel(card));},[]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(stage==='ask'){started.current=performance.now();if(typing)input.current?.focus();if(askKind==='listen')speak(wordLabel(card));}},[stage,typing]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(needsFix&&typing)fixInput.current?.focus();},[needsFix,typing]);
 // Correct answers move on by themselves; any interaction with the result cancels it.
 useEffect(()=>{if(!auto||!canContinue)return;const t=setTimeout(()=>rateRef.current(rating,metaFor(rating),feedbackFor()),autoMs);return()=>clearTimeout(t);},[auto,canContinue,rating,autoMs]);
 const keyHandlerRef=useRef<(e:KeyboardEvent)=>void>(()=>{});
 keyHandlerRef.current=(e:KeyboardEvent)=>{
  if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||e.isComposing)return;
  const target=e.target as HTMLElement|null;
  const inField=target?.closest('input,textarea,select,[contenteditable="true"]');
  const onAction=target?.closest('button:not(.exercise-next),a,summary');
  if(stage==='learn'){if(e.key==='Enter'&&!inField&&!onAction){e.preventDefault();setStage(copyRows.length?'copy':'ask');}return;}
  if(stage==='copy')return;
  if(done){if(e.key==='Enter'&&!onAction&&(!inField||canContinue)){e.preventDefault();submit();}else if(!inField&&/^[1-4]$/.test(e.key)&&needsFix&&!typing&&!building){e.preventDefault();choose(Number(e.key)-1);}return;}
  if(building){if(e.key==='Enter'&&!onAction){e.preventDefault();check();}return;}
  if(!typing&&!inField&&/^[1-4]$/.test(e.key)){e.preventDefault();choose(Number(e.key)-1);}
 };
 useEffect(()=>{
  const handler=(e:KeyboardEvent)=>keyHandlerRef.current(e);
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[]);

 const verdictClass=outcome?(isGood(outcome.verdict)?'good':isMiss(outcome.verdict)?'miss':'near'):'';
 const feedback=!outcome?'':outcome.note==='pattern-instead-of-word'?'Kalıp doğru. Bu soruda karttaki kelimenin kendisini istiyoruz.':hinted&&isGood(outcome.verdict)?'İpucuyla doğru. Daha sonra ipucusuz tekrar edeceksin.':outcome.note?.startsWith('synonym:')?'Bu da aynı anlama geliyor ('+outcome.note.slice(8)+'), ama burada '+wordLabel(card)+' aranıyordu. Doğrusunu yaz.':outcome.note==='alt-order'?'Bu sıra da doğru! Kitaptaki sıra aşağıda.':askKind==='pattern-type'&&outcome.verdict==='close'?'Çok yakın; kelime sırası ya da bir iki harf farklı.':building?(outcome.verdict==='correct'?'Doğru sıra!':outcome.verdict==='close'?'Kelimeler doğru ama bu sıra doğal değil. Doğru sırayı kur.':'Olmadı. Doğru sırayı görüp yeniden kur.'):outcome.verdict==='choice-right'?'Doğru!':outcome.verdict==='choice-wrong'?'Olmadı. Doğru seçeneğe dokunarak pekiştir.':outcome.verdict==='gave-up'?'Sorun değil. Şimdi doğrusunu yazarak öğren.':TYPED_FEEDBACK[outcome.verdict];

 if(stage==='learn')return <article className="exercise exercise-intro" aria-label={L('Neues Wort kennenlernen','Yeni kelimeyle tanış')}>
  <div className="card-language-row"><CardLanguageSwitch compact/></div>
  <p className="eyebrow">{L('NEUES WORT · KENNENLERNEN','YENİ KELİME · TANIŞ')}</p>
  <div className="intro-hero">
   <div className="intro-main">
    <ArticleWord card={card} big/>
    <SpeakButton de={wordLabel(card)} label={L('Anhören','Dinle')} className="text-button intro-listen"/>
    <Reading text={wordLabel(card)} card/>
    <CardMeaning word={card.word} meaning={info.meaning}/>
    {card.plural&&<p className="micro">{L('Plural','Çoğul')}: <span lang="de">die {card.plural}</span></p>}
    {facts.type&&<p className="micro">{kindLabel(lang,facts.type)}</p>}
   </div>
   <div className="intro-photo"><DailyWordPhoto photo={dailyPhoto(card)} word={card.word}/></div>
  </div>
  {cands.slice(0,2).map(c=><Sentence key={c.de} cand={c} word={card.word} className="intro-example"/>)}
  {facts.patterns.length>0&&<div className="intro-patterns"><h3>{L('Wendungen','Kalıplar')}</h3><ul className="word-result-patterns">{facts.patterns.map(p=><li key={p.de}><span lang="de" className="pattern-de">{p.de}</span>{lang==='tr'&&p.tr&&<span lang="tr" className="pattern-tr">{p.tr}</span>}<SpeakButton de={p.de.replace(/\s*·.*$/,'')} tr={lang==='tr'?p.tr:''} label={L('Anhören','Dinle')}/></li>)}</ul></div>}
  <p className="intro-tip">{lang==='de'?<>Sprich das Wort laut aus{card.article?' – mit Artikel':''}.{copyRows.length?' Bau zuerst die Wendung, dann erinnerst du dich an das Wort.':' Gleich schreibst du es ohne Hilfe.'}</>:<>Kelimeyi sesli söyle{card.article?' — artikeliyle birlikte':''}.{copyRows.length?' Önce kalıbı kur, sonra kelimeyi hatırla.':' Birazdan bakmadan yazacaksın.'}</>}</p>
  <button type="button" className="primary exercise-next" onClick={()=>setStage(copyRows.length?'copy':'ask')}>{copyRows.length?L('Wendung bauen','Kalıbı kur'):L('Mich testen','Kendimi sına')} <kbd>Enter</kbd></button>
 </article>;

 if(stage==='copy'){
  const crow=copyRows[copyIdx];const cq=crow?buildQuizOfRow(crow,seed):null;
  if(!crow||!cq)return <article className="exercise"><button type="button" className="primary exercise-next" onClick={()=>setStage('ask')}>Devam</button></article>;
  const cText=(ids:number[])=>ids.map(id=>cq.chips.find(c=>c.id===id)?.text||'');
  const complete=copyPlaced.length===cq.solution.length;
  const wrongOrder=complete&&gradeBuild(cText(copyPlaced),cq.solution)!=='correct';
  const nextCopy=()=>{setCopyPlaced([]);if(copyIdx+1<copyRows.length)setCopyIdx(copyIdx+1);else setStage('ask');};
  const put=(id:number)=>{
   const next=[...copyPlaced,id];setCopyPlaced(next);
   if(next.length===cq.solution.length&&gradeBuild(cText(next),cq.solution)==='correct'){
    speak(crow.phrase);buzz(14);

   }
  };
  return <article className="exercise exercise-copy" aria-label="Kalıbı kopyala">
   <p className="eyebrow">KALIBI KOPYALA · {copyIdx+1}/{copyRows.length}</p>
   {lang==='tr'&&<h2 className="exercise-prompt" lang="tr">{crow.tr}</h2>}
   <p className="copy-model" lang="de">{crow.phrase} <SpeakButton de={crow.phrase} tr={lang==='tr'?crow.tr:undefined} label="Dinle"/></p><Reading card text={crow.phrase} sentence/>
   <p className="micro">Yukarıdaki kalıbı kelimelere dokunarak aynen kur.</p>
   <Board chips={cq.chips} placed={copyPlaced} onPlace={put} onRemove={id=>setCopyPlaced(p=>p.filter(x=>x!==id))} end="" locked={copyPlaced.length===cq.solution.length&&!wrongOrder}/>
   {wrongOrder&&<p className="exercise-feedback near" role="status">Sıra farklı. Bir kelimeye dokunup çıkar ve modele göre düzelt.</p>}
   {complete&&!wrongOrder&&<><p className="exercise-feedback good" role="status">✓ Doğru</p><button type="button" className="primary exercise-next" onClick={nextCopy}>{copyIdx+1<copyRows.length?'Sonraki kalıp':'Kendimi sına'}</button></>}
  </article>;
 }

 return <article className={'exercise exercise-'+askKind+(verdictClass?' verdict-'+verdictClass:'')} aria-label="Alıştırma" translate="no">
  <p className="eyebrow">{round>=2?'TEKRAR DENE · '+PROMPTS[askKind]:PROMPTS[askKind]}</p>
  {askKind==='choice'&&<h2 className="exercise-prompt"><ArticleWord card={card}/> <SpeakButton de={wordLabel(card)} label="Dinle" className="icon-listen" iconOnly/></h2>}
  {(askKind==='reverse-choice'||askKind==='recall')&&<h2 className="exercise-prompt" lang={germanClue?'de':'tr'}>{germanClue||clue}</h2>}
  {askKind==='recall'&&<p className="micro">{card.article?'İsmi artikeliyle birlikte yaz.':(card.partOfSpeech==='verb'||facts.type==='Fiil')?'Sadece fiilin mastarını yaz.':'Almanca kelimeyi yaz.'}</p>}
  {askKind==='article'&&<><h2 className="exercise-prompt" lang="de"><span aria-hidden="true">___ </span>{card.word}</h2><p className="micro">Kelimenin tekil artikelini seç.</p></>}
  {building&&build&&<h2 className="exercise-prompt exercise-build-prompt" lang="tr">{build.tr}</h2>}
  {askKind==='pattern'&&quiz&&<div className="exercise-cloze exercise-pattern"><p className="cloze-tr" lang="tr">{quiz.tr}</p><p className="cloze-de" lang="de">{quiz.before} <span className={'cloze-gap'+(done?' filled':'')}>{done?quiz.answer:'＿＿'}</span> {quiz.after}</p>{done&&<p className="pattern-case"><b lang="de">{quiz.answer}</b> + {quiz.governed}</p>}</div>}
  {askKind==='pattern-case'&&caseQuiz&&<div className="exercise-cloze exercise-pattern"><p className="cloze-tr" lang="tr">{caseQuiz.tr}</p><p className="cloze-de" lang="de">{caseQuiz.full}</p><p className="case-ask"><b lang="de">{caseQuiz.prep}</b> + {done?<span className="cloze-gap filled">{caseQuiz.governed}</span>:<span className="cloze-gap">＿＿＿</span>}</p></div>}
  {askKind==='pattern-fill'&&fill&&<div className="exercise-cloze exercise-pattern"><p className="cloze-tr" lang="tr">{fill.tr}</p><p className="cloze-de" lang="de">{fill.before} <span className={'cloze-gap'+(done?' filled':'')}>{done?fill.answer:hinted?mask(fill.answer):'＿＿＿'}</span>{/^[.,;:!?]/.test(fill.after)?'':' '}{fill.after}</p></div>}
  {askKind==='pattern-type'&&patternRow&&<><p className="micro">Kalıbın tamamını Almanca yaz.</p><h2 className="exercise-prompt exercise-build-prompt" lang="tr">{patternRow.tr}</h2>{!done&&hinted&&<p className="exercise-hint" lang="de" aria-label="İpucu">{phraseSkeleton(patternRow.phrase)}</p>}</>}
  {askKind==='listen'&&<div className="exercise-listen"><button type="button" className="listen-button" onClick={()=>{speak(wordLabel(card));input.current?.focus();}} aria-label="Kelimeyi tekrar dinle">🔊</button><p className="micro">Dinle ve Almancasını yaz{card.article?' (artikeliyle)':''}. Tekrar dinlemek için dokun.</p></div>}
  {askKind==='cloze'&&cloze&&<div className="exercise-cloze">
   {cloze.translation&&<p className="cloze-tr" lang="tr">{cloze.translation}</p>}
   <p className="cloze-de" lang="de">{cloze.before}<span className={'cloze-gap'+(done?' filled':'')}>{done?cloze.answer:hinted?mask(cloze.answer):'＿＿＿'}</span>{cloze.after}</p>
   <p className="micro">Anlamı: <span lang="tr">{info.meaning}</span></p>
  </div>}
  {askKind==='recall'&&!done&&hinted&&<p className="exercise-hint" lang="de" aria-label="İpucu">{mask(answer.replace(/^(der|die|das)\s+/i,''))}</p>}

  {building&&build&&!done&&<>
   <Board chips={build.chips} placed={placed} onPlace={place} onRemove={unplace} end={build.end} locked={busy}/>
   <div className="exercise-actions"><button type="button" className="primary" disabled={busy||placed.length<build.solution.length} onClick={check}>Kontrol et <kbd>Enter</kbd></button>{placed.length>0&&<button type="button" className="text-button" onClick={()=>setPlaced([])}>Temizle</button>}<button type="button" className="text-button" onClick={()=>finish({verdict:'gave-up'})}>Bilmiyorum</button></div>
  </>}

  {choices.length>0&&<div className="exercise-choices" role="group" aria-label="Seçenekler">{choices.map((c,i)=>{
   const state=!done?'':c.correct?'is-right'+(needsFix&&!fixed?' needs-tap':''):outcome?.text===c.label?'is-wrong':'is-dim';
   return <button key={c.id} type="button" className={'choice '+state} disabled={busy||(done&&(!needsFix||fixed||!c.correct))} onClick={()=>choose(i)} lang={direction==='word'||askKind==='article'||germanWords&&germanClue?'de':'tr'}><kbd>{i+1}</kbd><span>{c.label}</span></button>;
  })}</div>}

  {typing&&!done&&<form className="exercise-typed" onSubmit={e=>{e.preventDefault();check();}}>
   <input ref={input} lang="de" value={text} maxLength={120} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label={askKind==='cloze'||askKind==='pattern-fill'?'Boşluğa gelen kelime':askKind==='listen'?'Duyduğun kelime':askKind==='pattern-type'?'Kalıbın Almancası':'Almancası'} placeholder={askKind==='pattern-type'?'Almanca kalıbı yaz':(askKind==='recall'||askKind==='listen')&&card.article?'isim + artikeli':'buraya yaz'} onChange={e=>setText(e.target.value)}/>
   <div className="daily-umlauts" aria-label="Özel harfler">{['ä','ö','ü','ß'].map(ch=><button type="button" key={ch} className="secondary" onClick={()=>{setText(t=>t+ch);input.current?.focus();}}>{ch}</button>)}</div>
   <div className="exercise-actions"><button className="primary" disabled={busy}>Kontrol et <kbd>Enter</kbd></button>{!hinted&&askKind!=='listen'&&<button type="button" className="text-button" onClick={()=>{setHinted(true);input.current?.focus();}}>İpucu</button>}<button type="button" className="text-button" onClick={()=>finish({verdict:'gave-up'})}>Bilmiyorum</button></div>
  </form>}

  {done&&<div className="exercise-result">
   <p className={'exercise-feedback '+verdictClass} role="status">{verdictClass==='good'?'✓ ':verdictClass==='near'?'≈ ':''}{feedback}{outcome?.text&&(typing||building)&&<> <span className="your-answer">Yazdığın: <b lang="de">{outcome.text}</b></span></>}</p>
   {patternish&&patternRow?<p className="exercise-solution exercise-solution-sentence"><span lang="de">{askKind==='pattern'&&quiz?quiz.full:patternRow.phrase}</span>{lang==='tr'&&<span className="solution-meaning" lang="tr">{askKind==='pattern'&&quiz?quiz.tr:patternRow.tr}</span>}<SpeakButton de={askKind==='pattern'&&quiz?quiz.full:patternRow.phrase} tr={lang==='tr'?(askKind==='pattern'&&quiz?quiz.tr:patternRow.tr):undefined} label="Dinle"/></p>:building&&build?<p className="exercise-solution exercise-solution-sentence"><span lang="de">{build.full}</span><SpeakButton de={build.full} tr={lang==='tr'?build.tr:undefined} label="Dinle"/></p>:<p className="exercise-solution"><ArticleWord card={card} big/> {lang==='tr'?<span className="solution-meaning" lang="tr">= {info.meaning}</span>:germanFull?<span className="solution-meaning" lang="de">= {germanFull}</span>:null}{lang==='de'&&germanFull&&!patternish&&!building&&<TurkishHint key={card.id} meaning={info.meaning}/>}</p>}
   {patternish&&patternRow?<Reading card text={patternRow.phrase} sentence/>:building&&build?<Reading card text={build.full} sentence/>:<Reading card text={wordLabel(card)}/>}
   {needsFix&&typing&&!fixed&&<form className="exercise-fix" onSubmit={e=>{e.preventDefault();}}>
    <label htmlFor="exercise-fix-input">Doğrusunu bir kez yaz: <b lang="de">{answer}</b></label>
    <input id="exercise-fix-input" ref={fixInput} lang="de" value={fix} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} onChange={e=>{const v=e.target.value;setFix(v);const r=askKind==='pattern-type'?gradePhrase(v,answer):checkTypedAnswer(v,{word:answer.replace(/^(der|die|das)\s+/i,''),article:cloze||patternish?'':card.article});if(r==='correct'||r==='umlaut'){setFixed(true);speak(patternish&&patternRow?patternRow.phrase:wordLabel(card));}}}/>
    <div className="daily-umlauts" aria-label="Özel harfler">{['ä','ö','ü','ß'].map(ch=><button type="button" key={ch} className="secondary" onClick={()=>{const v=fix+ch;setFix(v);const r=askKind==='pattern-type'?gradePhrase(v,answer):checkTypedAnswer(v,{word:answer.replace(/^(der|die|das)\s+/i,''),article:cloze||patternish?'':card.article});if(r==='correct'||r==='umlaut'){setFixed(true);speak(patternish&&patternRow?patternRow.phrase:wordLabel(card));}else fixInput.current?.focus();}}>{ch}</button>)}</div>
   </form>}
   {needsFix&&building&&build&&!fixed&&<div className="exercise-fix"><p className="micro">Şimdi doğru sırayı sen kur:</p><Board chips={build.chips} placed={fixPlaced} onPlace={fixPlace} onRemove={id=>setFixPlaced(p=>p.filter(x=>x!==id))} end={build.end} locked={false}/>{fixPlaced.length===build.solution.length&&<button type="button" className="text-button" onClick={()=>setFixPlaced([])}>Yeniden dene</button>}</div>}
   {needsFix&&fixed&&<p className="exercise-fixed" role="status">✓ Pekiştirildi. Bu kelime birazdan yeniden sorulacak.</p>}
   {!building&&!patternish&&askKind!=='cloze'&&sample&&<Sentence cand={sample} word={card.word}/>}
   {askKind==='cloze'&&cc?.source.origin==='tatoeba'&&cc.source.id&&<p className="micro"><a className="credit" href={tatoebaLink(cc.source.id)} target="_blank" rel="noreferrer">Tatoeba{cc.source.by?' · '+cc.source.by:''} · CC BY 2.0 FR</a></p>}
   {building&&build?.source&&build.source.origin==='tatoeba'&&build.source.id&&<p className="micro"><a className="credit" href={tatoebaLink(build.source.id)} target="_blank" rel="noreferrer">Tatoeba{build.source.by?' · '+build.source.by:''} · CC BY 2.0 FR</a></p>}
   <details className="exercise-more" onToggle={()=>setAuto(false)}><summary>Kelimenin tüm bilgileri</summary><DailyAnswer card={card} info={info}/></details>
   <div className="exercise-continue">
    <button type="button" className={'primary exercise-next'+(auto&&canContinue?' is-auto':'')} style={auto&&canContinue?{['--auto-ms' as string]:autoMs+'ms'}:undefined} disabled={!canContinue} onClick={submit}>{busy?'Kaydediliyor…':needsFix&&!fixed?'Önce doğrusunu '+(building?'kur':typing?'yaz':'seç'):'Devam'} {canContinue&&<kbd>Enter</kbd>}</button>
    {isGood(outcome!.verdict)&&rating>1&&<button type="button" className="text-button" onClick={guessed}>Tahmin ettim</button>}
   </div>
  </div>}
 </article>;
}
