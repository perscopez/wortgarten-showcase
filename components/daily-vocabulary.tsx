'use client';
import {nextFrequentWords,frequencyCoverage} from '../lib/frequency';
import {classifyError,recordError} from '../lib/error-log';
import Reading from './reading';
import {readLearningValue,updateLearningValue} from '../lib/learning-records';
import type {LibraryPhoto} from './library-images';
import {useEffect,useMemo,useRef,useState} from 'react';
import {safeDailyReverse,DAILY_TARGET_MS,DAILY_SESSION_KEY,dailyMeaning,dailySelection,newDailySession,readDailySession,advanceDaily,mergeAddedDailyCards,continueDailySession,extendDailySession,weakCards,weakWordsSession,dailyTotal,tickDailySession,starterOnly,skipDailyCard,hardRound,type DailyCard,type DailyFeedback,type DailySession} from '../lib/daily-vocabulary';
import type {Rating} from '../lib/review-scheduler';
import SpeakButton from './speak-button';
import {useCardLanguage} from '../lib/card-language';
import {bundledExamples,fetchExamples} from '../lib/examples';
import DailyExercise,{type PatternMeta} from './daily-exercise';
import {PATTERN_KEY,emptyPatternProgress,parsePatternProgress,patternOverview,recordPattern,type PatternProgress} from '../lib/pattern-practice';
import {exerciseFor,currentStreak,sessionSummary,type ExerciseKind} from '../lib/daily-exercise';
import {learningProgress,SETTLED_DAYS} from '../lib/progress';
import {QuickTrainerLauncher} from './quick-trainers';
import type {QuickTrainerKind} from '../lib/quick-trainers';
type Entry={word:string;meaning:string;article:string;plural:string;example:string;translation:string;partOfSpeech?:string;source?:string;checked?:boolean;photo?:LibraryPhoto&{archive?:'openmoji'|'twemoji'|'wortgarten'|'wikimedia'}};
type Props={cards:DailyCard[];ready:boolean;onRate:(id:string,rating:Rating,at:number)=>Promise<boolean>;onAdd:(entry:Entry)=>Promise<boolean>;onAddBasics:()=>Promise<number>;onLibrary:()=>void;onActiveChange:(active:boolean)=>void;onSync:()=>void;onPatterns?:()=>void;onQuickTrainer?:(kind:QuickTrainerKind)=>void};
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export default function DailyVocabulary({cards,ready,onRate,onAdd,onAddBasics,onLibrary,onActiveChange,onSync,onPatterns,onQuickTrainer}:Props){
 void onAddBasics;void onLibrary;
 const [autoAdvance,setAutoAdvance]=useState(false);
 useEffect(()=>{try{setAutoAdvance(localStorage.getItem('wortgarten-daily-auto-advance')==='1');}catch{/* storage can be unavailable */}},[]);
 function changeAutoAdvance(enabled:boolean){
  setAutoAdvance(enabled);
  try{localStorage.setItem('wortgarten-daily-auto-advance',enabled?'1':'0');}catch{/* keep current preference for this page */}
 }
 const [session,setSession]=useState<DailySession|null>(null),[loaded,setLoaded]=useState(false),[running,setRunning]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [dateLabel,setDateLabel]=useState(''),[suggestSkip,setSuggestSkip]=useState(0),[word,setWord]=useState(''),[entry,setEntry]=useState<Entry|null>(null),[choices,setChoices]=useState<{id:string;label:string;meaning:string}[]>([]),[lookupBusy,setLookupBusy]=useState(false);
 const live=useRef<DailySession|null>(null),lock=useRef(false),abort=useRef<AbortController|null>(null),lookupId=useRef(0),weakOnlyRef=useRef(false);
 const runningRef=useRef(false);runningRef.current=running;
 const lastStored=useRef('');const readyRef=useRef(false);
 const [patterns,setPatterns]=useState<PatternProgress|null>(null);
 // Pattern progress lives in its own synced record; reload it when another tab or a sync changes it (never while a question is open).
 useEffect(()=>{
  let alive=true;
  const load=()=>{if(runningRef.current)return;readLearningValue(PATTERN_KEY).then(v=>{if(alive)setPatterns(parsePatternProgress(v));}).catch(()=>{if(alive)setPatterns(p=>p||emptyPatternProgress());});};
  load();window.addEventListener('wortgarten-learning-changed',load);
  return()=>{alive=false;window.removeEventListener('wortgarten-learning-changed',load);};
 },[]);
 function recordPatternResult(meta:PatternMeta){
  const now=Date.now();
  setPatterns(prev=>recordPattern(prev||emptyPatternProgress(),meta.patternId,meta.ok,now));
  void updateLearningValue(PATTERN_KEY,prev=>recordPattern(parsePatternProgress(prev),meta.patternId,meta.ok,now)).catch(()=>{});
 }
 function mirror(next:DailySession){try{localStorage.setItem(DAILY_SESSION_KEY,JSON.stringify(next))}catch{}}
 function checkpoint(next:DailySession,requestSync=false){
  const raw=JSON.stringify(next);if(raw===lastStored.current&&!requestSync)return;lastStored.current=raw;
  void updateLearningValue(DAILY_SESSION_KEY,()=>next).then(()=>{if(lastStored.current===raw)mirror(next);if(requestSync)window.dispatchEvent(new Event('wortgarten-daily-checkpoint'))}).catch(()=>{if(lastStored.current===raw)lastStored.current='';setMessage('Oturum eşitleme kaydına yazılamadı. Duraklatıp yeniden dene.');});
 }
 const persist=(next:DailySession)=>{if(next.finished||!next.queue.length||next.elapsed>=DAILY_TARGET_MS){runningRef.current=false;setRunning(false);onActiveChange(false)}live.current=next;setSession(next);checkpoint(next);};
 const maybeContinue=(next:DailySession)=>weakOnlyRef.current?(next.queue.length?next:{...next,finished:true}):continueDailySession(next,cards);
 useEffect(()=>{
  let mounted=true,readId=0;
  const apply=(s:DailySession|null)=>{live.current=s;setSession(s);if(s){lastStored.current=JSON.stringify(s);mirror(s)}};
  const refresh=async(initial=false)=>{const id=++readId;try{
   const value=await readLearningValue(DAILY_SESSION_KEY);
   if(!mounted||id!==readId||runningRef.current||lock.current)return;
   if(initial&&value===null){const legacy=readDailySession(localStorage.getItem(DAILY_SESSION_KEY));if(legacy){await updateLearningValue(DAILY_SESSION_KEY,current=>current??legacy);if(mounted)await refresh(false);return;}}
   const s=readDailySession(JSON.stringify(value));if(JSON.stringify(s)!==JSON.stringify(live.current))apply(s);
  }catch{if(initial&&mounted){try{apply(readDailySession(localStorage.getItem(DAILY_SESSION_KEY)))}catch{}setMessage('Eşitlenen oturum okunamadı; varsa bu cihazın kopyası gösteriliyor.');}}};
  void refresh(true).finally(()=>{if(mounted){readyRef.current=true;setLoaded(true)}});
  const receive=()=>{if(readyRef.current&&!runningRef.current)void refresh()};
  const checkDay=()=>{if(live.current&&!readDailySession(JSON.stringify(live.current))){apply(null);runningRef.current=false;setRunning(false);}};
  const dayTimer=setInterval(checkDay,30000);
  const pause=()=>{checkDay();if(document.hidden&&runningRef.current){runningRef.current=false;setRunning(false);if(live.current)checkpoint(live.current)}};
  const unload=()=>{if(runningRef.current&&live.current)checkpoint(live.current)};
  const elsewhere=(e:StorageEvent)=>{if(e.key===DAILY_SESSION_KEY){runningRef.current=false;setRunning(false);receive()}};
  document.addEventListener('visibilitychange',pause);window.addEventListener('pagehide',unload);window.addEventListener('storage',elsewhere);window.addEventListener('wortgarten-learning-changed',receive);
  return()=>{mounted=false;readyRef.current=false;clearInterval(dayTimer);unload();abort.current?.abort();document.removeEventListener('visibilitychange',pause);window.removeEventListener('pagehide',unload);window.removeEventListener('storage',elsewhere);window.removeEventListener('wortgarten-learning-changed',receive)};
 },[]);
 useEffect(()=>{if(!running)return;let previous=performance.now(),ticks=0;const timer=setInterval(()=>{const s=live.current;if(!s)return;if(s.finished||!s.queue.length){setRunning(false);onActiveChange(false);return}const now=performance.now();const next=tickDailySession(s,now-previous,!document.hidden);const elapsed=next.elapsed;previous=now;live.current=next;setSession(next);if(++ticks%5===0)persist(next);if(elapsed>=DAILY_TARGET_MS){setRunning(false);persist(next)}},1000);return()=>clearInterval(timer)},[running]);
 useEffect(()=>{onActiveChange(running);return()=>onActiveChange(false)},[running,onActiveChange]);
 useEffect(()=>{if(!running&&ready&&loaded&&live.current&&!weakOnlyRef.current){const before=live.current;const merged=mergeAddedDailyCards(before,cards);const next=continueDailySession(merged,cards);if(next!==before)persist(next);}},[cards,running,ready,loaded]);
 const prompt=useRef<HTMLElement>(null);
 const currentItem=session?.queue[0];const current=cards.find(c=>c.id===currentItem?.id);const info=current?dailyMeaning(current):null;
 const reverse=!!current&&!!info&&safeDailyReverse(current.word,info.meaning,!!currentItem?.reverse);
 // Chosen once per question: examples that arrive later must not swap the question under the learner.
 const questionKey=current&&currentItem?current.id+':'+currentItem.round+':'+currentItem.reverse+':'+(session?.answers.length||0):'';
 // eslint-disable-next-line react-hooks/exhaustive-deps
 const exercise=useMemo(()=>current&&info&&currentItem?exerciseFor(currentItem,reverse,current,info,!!session?.answers.some(a=>a.id===current.id),session?.day||'',patterns):'choice' as ExerciseKind,[questionKey]);
 const streak=currentStreak(session);
 const reached=!!session&&session.elapsed>=DAILY_TARGET_MS;const finished=!!session&&(session.finished||reached);
 async function rate(rating:Rating,meta?:PatternMeta,feedback?:DailyFeedback){if(lock.current||!running||!current||!live.current)return;lock.current=true;setBusy(true);const before=live.current;try{const skipWordSrs=!!meta&&!meta.ok&&current.reviews>0;if(!skipWordSrs){const ok=await onRate(current.id,rating,Date.now());if(!ok){setMessage('Değerlendirme kaydedilemedi. Kart atlanmadı; yeniden dene.');setRunning(false);return}}const base=live.current||before;if(weakOnlyRef.current)persist(advanceDaily(base,rating,Date.now(),feedback));else persist(continueDailySession(advanceDaily(base,rating,Date.now(),feedback),cards));setMessage('');if(meta)recordPatternResult(meta)}catch{setMessage('Kayıt tamamlanamadı; kart korunuyor. Yeniden dene.');setRunning(false)}finally{lock.current=false;setBusy(false)}}

 useEffect(()=>{if(!running||!session||!ready||!session.queue.length)return;if(!current||!info){const deadId=session.queue[0].id;const next={...session,queue:session.queue.filter(i=>i.id!==deadId)};next.finished=!next.queue.length;persist(maybeContinue(next));}},[current?.id,!!info,ready,running,session?.queue[0]?.id]);
 function start(){weakOnlyRef.current=false;setMessage('');const previous=live.current;const today=readDailySession(previous?JSON.stringify(previous):null);const next=today?continueDailySession(mergeAddedDailyCards(today,cards),cards):newDailySession(cards);if(!next.queue.length){setMessage('Tekrara uygun kelime yok. Bir kelime ekle; belirsiz veya kontrol için işaretli anlamlar bu oturuma alınmaz.');return}onActiveChange(true);runningRef.current=true;persist(next);setRunning(true)}
 function startWeak(){const next=weakWordsSession(live.current,cards);if(!next){setMessage('Şu an zorlandığın kelime yok.');return}weakOnlyRef.current=true;setMessage('');onActiveChange(true);runningRef.current=true;persist(next);setRunning(true);}
 async function lookup(sense?:string,over?:string){const q=(over??word).trim();if(!q)return;abort.current?.abort();const controller=new AbortController();abort.current=controller;const id=++lookupId.current;setLookupBusy(true);setEntry(null);setChoices([]);setMessage('');try{const res=await fetch('/api/quick-word?word='+encodeURIComponent(q)+(sense?'&sense='+encodeURIComponent(sense):''),{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(8000)])});const data:any=await res.json();if(id!==lookupId.current)return;if(!res.ok)throw Error(data.error||'Kelime bulunamadı.');if(data.choices)setChoices(data.choices);else setEntry(data)}catch(e){if(id===lookupId.current&&!controller.signal.aborted)setMessage(e instanceof Error?e.message:'Bağlantı kurulamadı.')}finally{if(id===lookupId.current)setLookupBusy(false)}}
 async function add(){if(!entry||lock.current)return;lock.current=true;setBusy(true);try{if(await onAdd(entry)){setEntry(null);setWord('');setMessage('Kelime kaydedildi. Son eklenenler önceliğine alındı; günlük yüküne göre sıraya girer.')}else setMessage('Kaydedilemedi; mevcut kelimelerin korunuyor. Yeniden dene.')}catch{setMessage('Kaydedilemedi; yeniden dene.')}finally{lock.current=false;setBusy(false)}}
 useEffect(()=>{
  if(!running||!prompt.current)return;
  const top=prompt.current.getBoundingClientRect().top;
  if(top<0||top>window.innerHeight-180)prompt.current.scrollIntoView({block:'start'});
 },[running,currentItem?.id,currentItem?.reverse,currentItem?.round]);
 const count=session?new Set(session.answers.map(a=>a.id)).size:0;
 const focus=running&&!finished&&!!current&&!!info;
 function pause(){runningRef.current=false;setRunning(false);if(live.current){persist(live.current);checkpoint(live.current,true);}}
 function extend(minutes:number){if(!live.current)return;const next=extendDailySession(live.current,cards,Date.now(),minutes);if(next===live.current){setMessage('Devam edecek kelime bulunamadı.');return}weakOnlyRef.current=false;setMessage('');onActiveChange(true);runningRef.current=true;persist(next);setRunning(true);}
 function again(ids:string[]){if(!live.current)return;const next=hardRound(live.current,ids);if(next===live.current)return;weakOnlyRef.current=true;setMessage('');onActiveChange(true);runningRef.current=true;persist(next);setRunning(true);}
 function skip(){if(!live.current)return;persist(maybeContinue(skipDailyCard(live.current)));}
 useEffect(()=>{if(focus)window.scrollTo({top:0});},[focus]);
 const selection=useMemo(()=>ready&&loaded?dailySelection(cards):[],[cards,ready,loaded]);
 const [exampleVersion,setExampleVersion]=useState(0);
 // Words outside the bundled example list get their sentences fetched once (and remembered on this device):
 // while idle for today's selection, and while studying for the next questions.
 const prefetchKey=running&&session?session.queue.slice(0,8).map(i=>i.id).join(','):selection.map(c=>c.id).join(',');
 useEffect(()=>{
  const ids=prefetchKey?prefetchKey.split(','):[];
  const words=[...new Set(ids.map(id=>cards.find(c=>c.id===id)).filter(Boolean).map(c=>c!))];
  if(!words.length)return;
  let alive=true;const controller=new AbortController();
  (async()=>{for(const c of words){if(!alive)return;if(c.example||bundledExamples(c.word).length)continue;if(await fetchExamples(c.word,c.meaning,controller.signal)&&alive)setExampleVersion(v=>v+1);}})();
  return()=>{alive=false;controller.abort();};
 },[prefetchKey]);// eslint-disable-line react-hooks/exhaustive-deps
 void exampleVersion;
 // The date depends on the visitor's clock and time zone, so it is filled in after hydration (a prerendered date caused a hydration mismatch).
 const appLanguage=useCardLanguage();
 useEffect(()=>{setDateLabel(new Date().toLocaleDateString(appLanguage==='de'?'de-DE':'tr-TR',{weekday:'long',day:'numeric',month:'long'}));},[appLanguage]);
 // These walk every card, so they are computed once per change of the cards, not on every keystroke or timer tick.
 const progress=useMemo(()=>cards.length?learningProgress(cards):null,[cards]);
 const po=useMemo(()=>patternOverview(cards,patterns),[cards,patterns]);
 const known=useMemo(()=>cards.map(c=>c.word),[cards]);
 const suggestions=useMemo(()=>nextFrequentWords(known,8,suggestSkip),[known,suggestSkip]);
 const coverage=useMemo(()=>frequencyCoverage(known,300),[known]);
 const weakCount=useMemo(()=>weakCards(cards).length,[cards]);
 const freshToday=useMemo(()=>selection.filter(c=>!c.reviews).length,[selection]),dueToday=progress?.due||0;
 const summaryRow=(id:string)=>{const c=cards.find(x=>x.id===id);const m=c&&dailyMeaning(c);return c?<li key={id}><span lang="de">{c.article&&<span className={'article-color article-'+c.article}>{c.article} </span>}{c.word}</span><span lang="tr">{m?.meaning||c.meaning}</span></li>:null;};

 if(focus&&current&&info)return <section className="daily-words is-focus" aria-label="Günlük kelime oturumu">
  <div className="focus-bar">
   <button type="button" className="focus-pause" disabled={busy} onClick={pause} aria-label="Duraklat">✕</button>
   <div className="focus-progress" role="progressbar" aria-label="Günlük süre" aria-valuemin={0} aria-valuemax={20} aria-valuenow={Math.floor((session?.elapsed||0)/60000)}><span style={{width:Math.min(100,(session?.elapsed||0)/DAILY_TARGET_MS*100)+'%'}}/></div>
   <span className="focus-time">{time(session?.elapsed||0)}</span>
   {streak>=3&&<b className="streak-badge" aria-label={streak+' doğru üst üste'}>🔥 {streak}</b>}
  </div>
  {message&&<p className="daily-message" role="status">{message}</p>}
  <section ref={prompt} className="daily-flash">
   <DailyExercise key={current.id+':'+exercise+':'+(session?.answers.length||0)} card={current} info={info} kind={exercise} round={currentItem?.round||0} pool={cards} seed={session?.day||''} busy={busy} patterns={patterns} retry={currentItem?.retry} forcePatternId={currentItem?.retry?.kind==='pattern'?currentItem.retry.patternId:undefined} autoAdvance={autoAdvance} onRate={(r,m,f)=>void rate(r,m,f)} onMistake={m=>recordError({type:classifyError(m.kind,m.expected,m.given),word:m.word,expected:m.expected,given:m.given})}/>
  </section>
  <div className="focus-footer"><span>{count} kelime · {session?.answers.length||0} cevap</span><button type="button" className="text-button" disabled={busy} onClick={skip}>Bu kartı atla</button></div>
 </section>;

 
 const resumed=!!session&&(session.elapsed>0||session.answers.length>0);
 return <section className="daily-words home" aria-label="Bugün">
  <header className="page-head"><h1>Bugün</h1><p className="page-sub" suppressHydrationWarning>{dateLabel||'\u00a0'}</p></header>
  {message&&<p className="notice" role="status">{message}</p>}
  {finished?<div className="panel summary-panel">{reached&&<div className="confetti" aria-hidden="true">{Array.from({length:24},(_,i)=><i key={i} style={{left:((i*37)%100)+'%',animationDelay:((i%8)*0.11)+'s',['--c' as string]:['#2f7a4d','#c9962b','#a33c4f','#2a62a0'][i%4]}}/>)}</div>}{(()=>{const sum=sessionSummary(session);const endTomorrow=new Date();endTomorrow.setDate(endTomorrow.getDate()+1);endTomorrow.setHours(23,59,59,999);const tomorrow=cards.filter(c=>c.reviews>0&&c.due<=endTomorrow.getTime()).length;return <>
   <h2>{reached?'Bugünün hedefi tamam':'Tur tamam'}</h2>
   <dl className="tiles"><div><dt>İpucusuz doğruluk</dt><dd>%{sum.accuracy}</dd></div><div><dt>Kelime</dt><dd>{sum.words}</dd></div><div><dt>Cevap</dt><dd>{sum.answers}</dd></div><div><dt>Süre</dt><dd>{time(session?dailyTotal(session):0)}</dd></div></dl>
   {sum.assisted>0&&<p className="muted">İpucuyla doğru: {sum.assisted}</p>}
   {tomorrow>0&&<p className="muted">Yarın {tomorrow} tekrar seni bekliyor.</p>}
   {sum.met.length>0&&<section className="result-block"><h3>Yeni tanıştıkların ({sum.met.length})</h3><ul className="word-rows">{sum.met.slice(0,12).map(summaryRow)}</ul>{sum.met.length>12&&<p className="muted">+{sum.met.length-12}</p>}</section>}
   {sum.hard.length>0&&<section className="result-block"><h3>Zorlandıkların ({sum.hard.length})</h3><ul className="word-rows">{sum.hard.slice(0,12).map(summaryRow)}</ul>{sum.hard.length>12&&<p className="muted">+{sum.hard.length-12}</p>}{!reached&&<button type="button" className="secondary" disabled={busy} onClick={()=>again(sum.hard)}>Zorlandıklarımı bir tur daha çalış</button>}</section>}
   <section className="result-block continue-block"><h3>Bugün devam et</h3><p className="muted">İstersen aynı gün biraz daha çalış; öğrendiklerin ve ilerlemen korunur.</p><div className="panel-actions"><button type="button" className="primary" disabled={busy} onClick={()=>extend(10)}>10 dakika daha</button><button type="button" className="secondary" disabled={busy} onClick={()=>extend(20)}>20 dakika daha</button></div></section></>})()}</div>
  :<div className="panel start-panel">
   {resumed&&session?<><div className="resume"><span>Devam eden oturum</span><b>{time(session.elapsed)} / 20:00</b></div><div className="focus-progress"><span style={{width:Math.min(100,session.elapsed/DAILY_TARGET_MS*100)+'%'}}/></div></>
    :<dl className="tiles"><div><dt>Tekrar</dt><dd>{dueToday}</dd></div><div><dt>Yeni kelime</dt><dd>{freshToday}</dd></div><div><dt>Kalıp tekrarı</dt><dd>{po.due}</dd></div></dl>}
   <button className="primary start-button" disabled={!ready||!loaded||busy||!selection.length} onClick={start}>{resumed?'Devam et':'Başla'}</button>
   <label className="muted"><input type="checkbox" checked={autoAdvance} onChange={e=>changeAutoAdvance(e.target.checked)}/> Doğru cevaptan sonra otomatik geç</label>
   {weakCount>0&&<button type="button" className="secondary weak-button" disabled={!ready||!loaded||busy} onClick={startWeak}>Zorlandığın {Math.min(12,weakCount)} kelimeyi çalış{weakCount>12?' ('+weakCount+' içinden)':''}</button>}
   {progress&&progress.streak>1&&!resumed&&<p className="muted">{progress.streak} gündür üst üste çalışıyorsun.</p>}
   {selection.length>0&&!resumed&&<p className="today-line"><span>Sırada</span>{selection.slice(0,6).map(c=><b key={c.id} lang="de" className={c.reviews?'':'is-new'}>{c.article&&<span className={'article-color article-'+c.article}>{c.article} </span>}{c.word}</b>)}{selection.length>6&&<span>+{selection.length-6}</span>}</p>}
   {!cards.length&&<p className="muted">Henüz kelimen yok. Aşağıdan kelime ekle ya da Kelimelerim sayfasında temel kelimeleri ekle.</p>}
   {ready&&starterOnly(cards)&&<p className="muted">Başlangıç kelimeleri yüklü. <button type="button" className="text-button" onClick={onSync}>Hesabımdaki kelimeleri getir</button></p>}
  </div>}
  {onQuickTrainer&&<QuickTrainerLauncher onSelect={onQuickTrainer}/>}
  <section className="panel add-panel"><h2>Kelime ekle</h2><form className="inline-form" onSubmit={e=>{e.preventDefault();void lookup()}}><input aria-label="Yeni kelime" value={word} maxLength={100} placeholder="Almanca kelime, örn. beantworten" autoCapitalize="none" autoComplete="off" onChange={e=>{setWord(e.target.value);abort.current?.abort();lookupId.current++;setLookupBusy(false);setEntry(null);setChoices([])}}/><button className="secondary" disabled={!ready||busy||lookupBusy||!word.trim()}>{lookupBusy?'Bakılıyor…':'Ara'}</button></form>
   {!entry&&!choices.length&&suggestions.length>0&&<div className="suggest"><p className="muted">Sık kullanılan, henüz eklemediğin kelimeler <span className="suggest-cover">· en sık {coverage.total} isim ve fiilin {coverage.hit}’i kayıtlı</span></p><div className="suggest-chips">{suggestions.map(w=><button key={w.word} type="button" className="chip-suggest" disabled={!ready||busy||lookupBusy} onClick={()=>{setWord(w.word);void lookup(undefined,w.word)}}>{w.word}</button>)}</div><button type="button" className="text-button" onClick={()=>setSuggestSkip(n=>n+8)}>Başkalarını göster</button></div>}
   {choices.map(c=><button key={c.id} className="sense-choice" disabled={lookupBusy} onClick={()=>void lookup(c.id)}><b>{c.label}</b><span>{c.meaning}</span></button>)}
   {entry&&<div className="entry-card"><div className="entry-head"><b lang="de">{entry.article&&<span className={'article-color article-'+entry.article}>{entry.article} </span>}{entry.word}</b><SpeakButton de={[entry.article,entry.word].filter(Boolean).join(' ')} label="Dinle"/></div><Reading text={[entry.article,entry.word].filter(Boolean).join(' ')}/><p>{entry.meaning}</p>{entry.plural&&<p className="muted">Çoğul: die {entry.plural}</p>}{entry.example&&<blockquote className="add-example"><span lang="de">{entry.example}</span>{entry.translation&&<span lang="tr">{entry.translation}</span>}<SpeakButton de={entry.example} tr={entry.translation} label="Cümleyi dinle"/></blockquote>}<button className="primary" disabled={busy} onClick={()=>void add()}>{busy?'Kaydediliyor…':'Kaydet'}</button></div>}
  </section>
  {progress&&(()=>{const p=progress;const max=Math.max(1,...p.week.map(d=>d.count));return <section className="panel" aria-labelledby="progress-title"><div className="list-head"><h2 id="progress-title">İlerleme</h2></div>
   <dl className="tiles"><div title="Sırası gelen tekrarlarda hatırladığın oran"><dt>Hatırlama</dt><dd>{p.recall===null?'—':'%'+p.recall}</dd></div><div><dt>Seri</dt><dd>{p.streak}<small> gün</small></dd></div><div title={'Tekrar aralığı '+SETTLED_DAYS+' günü geçen kelimeler'}><dt>Oturan</dt><dd>{p.settled}</dd></div><div><dt>Öğreniliyor</dt><dd>{p.learning}</dd></div></dl>
   <div className="daily-week" role="img" aria-label={(appLanguage==='de'?'Antworten in den letzten 7 Tagen: ':'Son 7 günde cevap sayısı: ')+p.week.map(d=>d.count).join(', ')}>{p.week.map(d=><div key={d.day} title={d.day+': '+d.count+(appLanguage==='de'?' Antworten':' cevap')}><span style={{height:Math.round(d.count/max*100)+'%'}}/><small>{new Date(d.day+'T12:00:00').toLocaleDateString(appLanguage==='de'?'de-DE':'tr-TR',{weekday:'short'})}</small></div>)}</div>
   {po.total>0&&<div className="pattern-line"><span>Kalıplar: <b>{po.settled}</b> oturdu · <b>{po.learning}</b> öğreniliyor · <b>{po.fresh}</b> yeni</span>{onPatterns&&<button type="button" className="text-button" onClick={onPatterns}>Kalıplar →</button>}</div>}</section>})()}
 </section>;
}
