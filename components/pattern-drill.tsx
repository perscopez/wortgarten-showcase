'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import DailyExercise,{Board,type PatternMeta} from './daily-exercise';
import SpeakButton from './speak-button';
import Reading from './reading';
import {dailyMeaning,type DailyCard} from '../lib/daily-vocabulary';
import {reviewDay,type Rating} from '../lib/review-scheduler';
import {buildQuizOfRow,gradeBuild,gradePhrase,patternKindFor,phraseSkeleton,type ExerciseKind} from '../lib/daily-exercise';
import {checkComposition,isCopy} from '../lib/compose';
import {classifyError,recordError} from '../lib/error-log';
import {sentenceNotes} from '../lib/sentence-check';
import AiSentenceCheck from './ai-check';
import {PATTERN_KEY,SETTLED_STREAK,emptyPatternProgress,isSettled,parsePatternProgress,patternOverview,rankPatterns,recordPattern,rowsFor,tierOf,type PatternPick,type PatternProgress,type PatternRow,type PatternStat} from '../lib/pattern-practice';
import {readLearningValue,updateLearningValue} from '../lib/learning-records';

export type Mode='mixed'|'weak'|'new'|'type'|'compose'|'shadow';
/** 'compose': the learner writes an original sentence with the pattern. */
export type ItemKind=ExerciseKind|'compose'|'dictate'|'shadow';
export type Item={cardId:string;row:PatternRow;kind:ItemKind;retry:boolean;study:boolean};
type Entry={row:PatternRow;card:DailyCard;stat?:PatternStat};

const MAX_PER_WORD=2;
const today=()=>reviewDay(Date.now());
const startOfDay=()=>{const d=new Date();d.setHours(0,0,0,0);return d.getTime();};
/** A pattern that was tried and keeps going wrong: failed last time or answered right less than two thirds of the time. */
export const isWeak=(s?:PatternStat)=>!!s&&s.attempts>0&&!isSettled(s)&&(s.streak===0||s.correct/s.attempts<2/3);

/** One entry per distinct pattern of the learner's own words, met words first. */
export function patternEntries(cards:DailyCard[],progress:PatternProgress|null):Entry[]{
 const seen=new Set<string>(),out:Entry[]=[];
 const ordered=[...cards].filter(c=>dailyMeaning(c)).sort((a,b)=>Number(b.reviews>0)-Number(a.reviews>0));
 for(const card of ordered)for(const row of rowsFor(card)){if(seen.has(row.id))continue;seen.add(row.id);out.push({row,card,stat:progress?.items[row.id]});}
 return out;
}

/**
 * A round of patterns. Mixed: just missed → due reviews → never practised. Weak: only patterns that keep going wrong.
 * New: only never-practised ones. A pattern that is new to the learner is studied (copied with the model in sight) before it is asked.
 * Difficulty follows each pattern's own progress; at most two patterns per word.
 */
export function buildRound(cards:DailyCard[],progress:PatternProgress,seed:string,now=Date.now(),mode:Mode='mixed',size=10):Item[]{
 const picks:{card:DailyCard;pick:PatternPick}[]=[],seen=new Set<string>();
 const ordered=[...cards].filter(c=>dailyMeaning(c)).sort((a,b)=>Number(b.reviews>0)-Number(a.reviews>0));
 for(const card of ordered){
  let n=0;
  for(const pick of rankPatterns(card,progress,seed,now)){
   if(n>=MAX_PER_WORD)break;
   if(seen.has(pick.row.id))continue;
   const ok=mode==='weak'?isWeak(pick.stat):mode==='new'?!pick.stat:mode==='type'||mode==='compose'||mode==='shadow'?true:pick.rank<=2;
   if(ok){seen.add(pick.row.id);picks.push({card,pick});n++;}
  }
 }
 const rate=(s?:PatternStat)=>s?s.correct/Math.max(1,s.attempts):1;
 picks.sort((a,b)=>mode==='weak'?rate(a.pick.stat)-rate(b.pick.stat)||(a.pick.stat?.due||0)-(b.pick.stat?.due||0):a.pick.rank-b.pick.rank||Number(b.card.reviews>0)-Number(a.card.reviews>0)||(a.pick.stat?.due||0)-(b.pick.stat?.due||0));
 const items:Item[]=[];
 if(mode==='shadow')return picks.slice(0,Math.min(size,8)).map(({card,pick})=>({cardId:card.id,row:pick.row,kind:'shadow' as ItemKind,retry:false,study:true}));
 const canSpeak=typeof window==='undefined'||'speechSynthesis' in window;
 for(const {card,pick} of picks.slice(0,size)){
  if(!pick.stat)items.push({cardId:card.id,row:pick.row,kind:'build-pattern',retry:false,study:true});
  // mixed rounds: patterns that already sit well alternate between typing and writing an own sentence
  const own=pick.tier>=3&&[...pick.row.id+seed].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,7)%2===0;
  const hear=canSpeak&&[...seed+pick.row.id].reduce((h,c)=>(h*17+c.charCodeAt(0))|0,3)%3===0;
  const kind:ItemKind=mode==='type'?(hear?'dictate':'pattern-type'):mode==='compose'||(mode==='mixed'&&own)?'compose':patternKindFor(pick);
  items.push({cardId:card.id,row:pick.row,kind,retry:false,study:false});
 }
 return items;
}

/** Study step for a pattern the learner has not practised yet: read it, listen, build it once with the model in sight. */
function PatternStudy({row,seed,onDone}:{row:PatternRow;seed:string;onDone:()=>void}){
 const quiz=useMemo(()=>buildQuizOfRow(row,seed),[row,seed]);
 const [placed,setPlaced]=useState<number[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const text=(ids:number[])=>ids.map(id=>quiz?.chips.find(c=>c.id===id)?.text||'');
 if(!quiz)return <article className="exercise"><button type="button" className="primary exercise-next" onClick={onDone}>Devam</button></article>;
 const complete=placed.length===quiz.solution.length,wrong=complete&&gradeBuild(text(placed),quiz.solution)!=='correct';
 function put(id:number){
  if(placed.includes(id))return;
  const next=[...placed,id];setPlaced(next);
  if(next.length===quiz!.solution.length&&gradeBuild(text(next),quiz!.solution)==='correct'){
   if(timer.current)clearTimeout(timer.current);
   timer.current=setTimeout(onDone,800);
  }
 }
 return <article className="exercise exercise-copy" aria-label="Yeni kalıp">
  <p className="eyebrow">YENİ KALIP</p>
  <h2 className="exercise-prompt" lang="tr">{row.tr}</h2>
  <p className="copy-model" lang="de">{row.phrase} <SpeakButton de={row.phrase} tr={row.tr} label="Dinle"/></p>
  <Reading text={row.phrase} sentence/>
  <Board chips={quiz.chips} placed={placed} onPlace={put} onRemove={id=>setPlaced(p=>p.filter(x=>x!==id))} end="" locked={complete&&!wrong}/>
  {wrong&&<p className="exercise-feedback near" role="status">Sıra farklı. Bir kelimeyi çıkarıp modele göre düzelt.</p>}
  {complete&&!wrong&&<p className="exercise-feedback good" role="status">✓ Doğru</p>}
 </article>;
}

/** Shadowing: listen, repeat aloud right after (or with) the voice, optionally record yourself and compare. Nothing is scored or uploaded. */
function ShadowStep({row,onDone}:{row:PatternRow;onDone:()=>void}){
 const [supported,setSupported]=useState(false);
 const [recording,setRecording]=useState(false);
 const [url,setUrl]=useState('');
 const [error,setError]=useState('');
 const recorder=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const starting=useRef(false);
 const mounted=useRef(true);
 const urlRef=useRef('');
 useEffect(()=>{
  mounted.current=true;
  setSupported(typeof navigator!=='undefined'&&!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined');
  return()=>{
   mounted.current=false;
   if(recorder.current?.state==='recording'){try{recorder.current.stop();}catch{/* ignore */}}
   stream.current?.getTracks().forEach(t=>t.stop());
  };
 },[]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 async function start(){
  if(starting.current||recording)return;
  starting.current=true;
  setError('');
  let media:MediaStream|null=null;
  try{
   media=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!mounted.current){media.getTracks().forEach(t=>t.stop());return;}
   stream.current=media;
   const rec=new MediaRecorder(media),chunks:Blob[]=[];
   rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   rec.onstop=()=>{
    media?.getTracks().forEach(t=>t.stop());
    if(!mounted.current)return;
    const nextUrl=URL.createObjectURL(new Blob(chunks,{type:rec.mimeType||'audio/webm'}));
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    urlRef.current=nextUrl;
    setUrl(nextUrl);
    setRecording(false);
   };
   recorder.current=rec;rec.start();setRecording(true);
  }catch{
   media?.getTracks().forEach(t=>t.stop());
   if(mounted.current)setError('Mikrofona erişilemedi. İstersen kaydetmeden yalnızca sesli tekrar et.');
  }finally{
   starting.current=false;
  }
 }
 function stop(){if(recorder.current?.state==='recording')recorder.current.stop();}
 return <article className="exercise exercise-shadow" aria-label="Gölgeleme">
  <p className="eyebrow">GÖLGELEME</p>
  <h2 className="exercise-prompt" lang="de">{row.phrase}</h2>
  <Reading text={row.phrase} sentence/>
  <p className="muted" lang="tr">{row.tr}</p>
  <ol className="shadow-steps"><li><SpeakButton de={row.phrase} label="Dinle"/></li><li>Sesin hemen ardından, aynı ritim ve tonlamayla yüksek sesle tekrar et.</li>{supported&&<li>İstersen kaydet ve kendi sesini dinle; fark ettiğin yerleri bir daha dene.</li>}</ol>
  {supported&&<div className="exercise-actions">{!recording?<button type="button" className="secondary" onClick={()=>void start()}>● Kaydet</button>:<button type="button" className="secondary" onClick={stop}>■ Durdur</button>}</div>}
  {url&&<audio controls src={url} aria-label="Kendi kaydın"/>}
  {error&&<p className="exercise-feedback near" role="status">{error}</p>}
  <p className="micro">Kayıt yalnızca bu cihazda tutulur ve gönderilmez; puanlanmaz.</p>
  <div className="exercise-actions"><button type="button" className="primary" onClick={onDone}>Sonraki</button></div>
 </article>;
}

/** Dictation: hear the German pattern and type it. Trains the ear and the spelling together. */
function DictateStep({row,onResult}:{row:PatternRow;onResult:(ok:boolean)=>void}){
 const [text,setText]=useState('');
 const [verdict,setVerdict]=useState<ReturnType<typeof gradePhrase>>(null);
 const [tries,setTries]=useState(0);
 const input=useRef<HTMLInputElement>(null);
 const done=verdict==='correct'||verdict==='umlaut'||tries>=2;
 function check(e:React.FormEvent){
  e.preventDefault();const v=gradePhrase(text,row.phrase);if(!v)return;
  setVerdict(v);setTries(t=>t+1);
 }
 const good=verdict==='correct'||verdict==='umlaut';
 return <article className="exercise exercise-dictate" aria-label="Dinle ve yaz">
  <p className="eyebrow">DİNLE VE YAZ</p>
  <h2 className="exercise-prompt">Duyduğun kalıbı Almanca yaz</h2>
  <p><SpeakButton de={row.phrase} label="Kalıbı dinle"/> <span className="muted" lang="tr">Anlamı: {done?row.tr:'dinledikten sonra görünür'}</span></p>
  {!done?<form className="exercise-typed" onSubmit={check}>
   <input ref={input} lang="de" value={text} maxLength={120} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Duyduğun kalıp" placeholder="buraya yaz" onChange={e=>setText(e.target.value)}/>
   <div className="daily-umlauts" aria-label="Özel harfler">{['ä','ö','ü','ß'].map(ch=><button type="button" key={ch} className="secondary" onClick={()=>{setText(t=>t+ch);input.current?.focus();}}>{ch}</button>)}</div>
   {verdict&&!good&&<p className="exercise-feedback near" role="status">{verdict==='close'?'Çok yakın; bir daha dinle ve düzelt.':'Tutmadı; bir daha dinle ve dene.'}</p>}
   <div className="exercise-actions"><button className="primary">Kontrol et</button><button type="button" className="text-button" onClick={()=>onResult(false)}>Bilmiyorum</button></div>
  </form>:<>
   <p className={'exercise-feedback '+(good?'good':'miss')} role="status">{good?'✓ Doğru':'Doğrusu:'}</p>
   <p className="copy-model" lang="de">{row.phrase}</p>
   <Reading text={row.phrase} sentence/>
   <div className="exercise-actions"><button type="button" className="primary" onClick={()=>onResult(good)}>Devam</button></div>
  </>}
 </article>;
}

/** Write an original sentence with the pattern. The app checks that the pattern is used; the learner checks the grammar. */
const CHECKS=['Fiil doğru yerde (ana cümlede ikinci sırada)','Artikeller ve hâl doğru','Cümle bana ait ve anlamlı'];
function ComposeStep({row,onResult}:{row:PatternRow;onResult:(ok:boolean)=>void}){
 const [text,setText]=useState('');
 const [hint,setHint]=useState(false);
 const [note,setNote]=useState('');
 const [stage,setStage]=useState<'write'|'review'>('write');
 const [ticks,setTicks]=useState<boolean[]>(CHECKS.map(()=>false));
 const input=useRef<HTMLTextAreaElement>(null);
 const caseNote=(row.de.match(/·\s*(.+)$/)||[])[1];
 const autoNotes=stage==='review'?sentenceNotes(text,row.de):[];
 function check(){
  const sentence=text.trim();
  if(isCopy(sentence,row.phrase)){setNote('Kalıbı olduğu gibi yazma; onunla kendi cümleni kur.');return;}
  const r=checkComposition(sentence,row.phrase);
  if(r.status==='empty'){setNote('Önce bir cümle yaz.');return;}
  if(r.status==='missing'){setNote('Cümlende kalıbın şu parçaları yok: '+r.missing.join(', ')+'.');return;}
  if(r.status==='short'){setNote('Cümleyi biraz uzat: özne ve en az bir bilgi daha ekle.');return;}
  setNote('');setStage('review');
 }
 return <article className="exercise exercise-compose" aria-label="Kendi cümleni kur">
  <p className="eyebrow">KENDİ CÜMLENİ KUR</p>
  <h2 className="exercise-prompt" lang="tr">{row.tr}</h2>
  <p className="muted">Bu kalıbı kullanarak Almanca kendi cümleni yaz. Kalıbı görmeden hatırlamaya çalış.</p>
  {hint&&stage==='write'&&<p className="exercise-hint" lang="de" aria-label="İpucu">{phraseSkeleton(row.phrase)}</p>}
  {stage==='write'?<>
   <textarea ref={input} lang="de" rows={3} value={text} maxLength={200} autoCapitalize="sentences" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Almanca cümlen" placeholder="Almanca cümleni yaz…" onChange={e=>{setText(e.target.value);setNote('');}}/>
   <div className="daily-umlauts" aria-label="Özel harfler">{['ä','ö','ü','ß'].map(ch=><button type="button" key={ch} className="secondary" onClick={()=>{setText(t=>t+ch);input.current?.focus();}}>{ch}</button>)}</div>
   {note&&<p className="exercise-feedback near" role="status">{note}</p>}
   <div className="exercise-actions"><button type="button" className="primary" onClick={check}>Kontrol et</button>{!hint&&<button type="button" className="text-button" onClick={()=>setHint(true)}>İpucu</button>}<button type="button" className="text-button" onClick={()=>onResult(false)}>Bilmiyorum</button></div>
  </>:<>
   <p className="compose-own" lang="de">{text.trim()} <SpeakButton de={text.trim()} label="Dinle"/></p>
   <p className="copy-model" lang="de">{row.phrase} <SpeakButton de={row.phrase} tr={row.tr} label="Dinle"/></p>
   <Reading text={row.phrase} sentence/>
   {caseNote&&<p className="muted">Hâl notu: {caseNote}</p>}
   <AiSentenceCheck sentence={text.trim()} phrase={row.phrase} tr={row.tr}/>
   {autoNotes.length>0&&<div className="exercise-feedback near" role="status"><b>Otomatik notlar</b> (kural tabanlı; her hatayı yakalamaz):<ul>{autoNotes.map(n=><li key={n.kind}>{n.text}</li>)}</ul></div>}
   <p>Kalıp cümlende var. Şimdi dürüstçe kontrol et:</p>
   <ul className="compose-checks">{CHECKS.map((c,i)=><li key={c}><label><input type="checkbox" checked={ticks[i]} onChange={e=>setTicks(t=>t.map((v,j)=>j===i?e.target.checked:v))}/> {c}</label></li>)}</ul>
   <div className="exercise-actions"><button type="button" className="primary" disabled={!ticks.every(Boolean)} onClick={()=>onResult(true)}>Doğru, devam</button><button type="button" className="secondary" onClick={()=>onResult(false)}>Hata buldum</button></div>
  </>}
 </article>;
}

const PIPS=SETTLED_STREAK;
function Meter({stat}:{stat?:PatternStat}){
 const filled=Math.min(PIPS,stat?.streak||0);
 return <span className="meter" role="img" aria-label={isSettled(stat)?'Oturdu':stat?`${filled}/${PIPS} seri`:'Yeni'}>{Array.from({length:PIPS},(_,i)=><i key={i} className={i<filled?'on':''}/>)}</span>;
}
const STATUS=[['all','Tümü'],['new','Yeni'],['learning','Öğreniliyor'],['settled','Oturdu'],['weak','Zayıf']] as const;
type Status=typeof STATUS[number][0];
const statusOf=(s?:PatternStat):Exclude<Status,'all'|'weak'>=>!s?'new':isSettled(s)?'settled':'learning';

export default function PatternDrill({cards}:{cards:DailyCard[];onBack?:()=>void}){
 const [progress,setProgress]=useState<PatternProgress|null>(null);
 const [phase,setPhase]=useState<'hub'|'run'|'done'>('hub');
 const [queue,setQueue]=useState<Item[]>([]);
 const [index,setIndex]=useState(0);
 const [size,setSize]=useState(10);
 const [results,setResults]=useState<{row:PatternRow;ok:boolean;before:number;after:number}[]>([]);
 const [filter,setFilter]=useState<Status>('all');
 const [query,setQuery]=useState('');
 const [shown,setShown]=useState(30);
 const missedOnce=useRef(new Set<string>());
 const startTiers=useRef(new Map<string,number>());
 useEffect(()=>{let alive=true;readLearningValue(PATTERN_KEY).then(v=>{if(alive)setProgress(parsePatternProgress(v));}).catch(()=>{if(alive)setProgress(emptyPatternProgress());});return()=>{alive=false;};},[]);
 const seed=today();
 // Only the words that actually have patterns take part in rounds: with thousands of cards this keeps every page and count fast.
 const pcards=useMemo(()=>cards.filter(c=>rowsFor(c).length>0),[cards]);
 const overview=useMemo(()=>patternOverview(pcards,progress),[pcards,progress]);
 const entries=useMemo(()=>patternEntries(pcards,progress),[pcards,progress]);
 const counts=useMemo(()=>{
  const prog=progress||emptyPatternProgress();
  return{mixed:buildRound(pcards,prog,seed,Date.now(),'mixed',size).filter(i=>!i.study).length,weak:buildRound(pcards,prog,seed,Date.now(),'weak',size).filter(i=>!i.study).length,fresh:buildRound(pcards,prog,seed,Date.now(),'new',size).filter(i=>!i.study).length,shadow:buildRound(pcards,prog,seed,Date.now(),'shadow',size).length,type:buildRound(pcards,prog,seed,Date.now(),'type',size).filter(i=>!i.study).length,compose:buildRound(pcards,prog,seed,Date.now(),'compose',size).filter(i=>!i.study).length};
 },[pcards,progress,seed,size]);
 const practisedToday=useMemo(()=>Object.values(progress?.items||{}).filter(s=>s.last>=startOfDay()).length,[progress]);
 const list=useMemo(()=>entries.filter(e=>{
  if(filter==='weak'?!isWeak(e.stat):filter!=='all'&&statusOf(e.stat)!==filter)return false;
  const raw=query.trim();if(!raw)return true;
  const qDe=raw.toLocaleLowerCase('de'),qTr=raw.toLocaleLowerCase('tr');
  return e.row.phrase.toLocaleLowerCase('de').includes(qDe)||e.row.tr.toLocaleLowerCase('tr').includes(qTr);
 }),[entries,filter,query]);

 function begin(items:Item[]){
  if(!progress||!items.length)return;
  missedOnce.current=new Set();startTiers.current=new Map(items.map(i=>[i.row.id,tierOf(progress.items[i.row.id])]));
  setResults([]);setIndex(0);setQueue(items);setPhase('run');
 }
 function start(mode:Mode){if(progress)begin(buildRound(pcards,progress,seed,Date.now(),mode,size));}
 function startOne(e:Entry){
  if(!progress)return;
  const pick=rankPatterns(e.card,progress,seed,Date.now()).find(p=>p.row.id===e.row.id);
  if(!pick)return;
  begin([...(!pick.stat?[{cardId:e.card.id,row:e.row,kind:'build-pattern' as ExerciseKind,retry:false,study:true}]:[]),{cardId:e.card.id,row:e.row,kind:patternKindFor(pick),retry:false,study:false}]);
 }
 function advance(next:Item[]){if(index+1>=next.length)setPhase('done');else setIndex(index+1);}
 function answer(meta:PatternMeta|undefined,item:Item,rating?:Rating){
  const ok=meta?meta.ok:(rating!==undefined&&rating>=2),now=Date.now(),pid=meta?.patternId||item.row.id;
  const updated=recordPattern(progress||emptyPatternProgress(),pid,ok,now);
  const after=tierOf(updated.items[pid]);
  setProgress(updated);
  void updateLearningValue(PATTERN_KEY,prev=>recordPattern(parsePatternProgress(prev),pid,ok,now)).catch(()=>{});
  setResults(r=>[...r,{row:item.row,ok,before:startTiers.current.get(item.row.id)??0,after}]);
  // successive relearning: one more, easier go at the end of the round
  let next=queue;
  if(!ok&&!item.retry&&!missedOnce.current.has(item.row.id)){missedOnce.current.add(item.row.id);next=[...queue,{...item,kind:'build-pattern',retry:true,study:false}];setQueue(next);}
  advance(next);
 }

 const item=phase==='run'?queue[index]:undefined;
 const card=item?cards.find(c=>c.id===item.cardId):undefined;
 const info=card?dailyMeaning(card):null;
 const questions=queue.filter(i=>!i.study).length;
 const answered=results.length;

 if(phase==='run'&&item&&card&&info)return <section className="daily-words is-focus pattern-drill" aria-label="Kalıp antrenmanı">
  <div className="focus-bar">
   <button type="button" className="focus-pause" onClick={()=>setPhase('hub')} aria-label="Çık">✕</button>
   <div className="focus-progress" role="progressbar" aria-label="Tur ilerlemesi" aria-valuemin={0} aria-valuemax={questions} aria-valuenow={answered}><span style={{width:Math.min(100,(questions?answered/questions:index/Math.max(1,queue.length))*100)+'%'}}/></div>
   <span className="focus-time">{questions?`${Math.min(answered+1,questions)}/${questions}`:`${index+1}/${queue.length}`}</span>
  </div>
  <section className="daily-flash">
   {item.kind==='shadow'?<ShadowStep key={'sh:'+item.row.id+index} row={item.row} onDone={()=>advance(queue)}/>
    :item.study
    ?<PatternStudy key={'s:'+item.row.id+index} row={item.row} seed={seed} onDone={()=>advance(queue)}/>
    :item.kind==='dictate'?<DictateStep key={'d:'+item.row.id+index} row={item.row} onResult={ok=>{if(!ok)recordError({type:'kalip',word:item.row.phrase,expected:item.row.phrase,given:''});answer({patternId:item.row.id,ok},item)}}/>
    :item.kind==='compose'?<ComposeStep key={'c:'+item.row.id+index} row={item.row} onResult={ok=>{if(!ok)recordError({type:'cumle',word:item.row.phrase,expected:item.row.phrase,given:''});answer({patternId:item.row.id,ok},item)}}/>
    :<DailyExercise key={item.row.id+':'+item.kind+':'+index} card={card} info={info} kind={item.kind as ExerciseKind} round={item.retry?2:0} pool={cards} seed={seed} busy={false} patterns={progress} forcePatternId={item.row.id} onRate={(r,meta)=>answer(meta,item,r)} onMistake={m=>recordError({type:classifyError(m.kind,m.expected,m.given),word:m.word,expected:m.expected,given:m.given})}/>}
  </section>
 </section>;

 if(phase==='done'){
  if(results.length===0)return <section className="daily-words pattern-drill" aria-label="Kalıp antrenmanı"><header className="page-head"><h1>Gölgeleme tamam</h1></header><div className="panel"><p>Bu kalıpları sesli tekrar ettin. Puan ya da ilerleme değişmez; ağzın ve kulağın için antrenman.</p><div className="panel-actions"><button type="button" className="primary" onClick={()=>setPhase('hub')}>Tamam</button><button type="button" className="secondary" onClick={()=>start('shadow')}>Bir tur daha</button></div></div></section>;
  const first=results.filter((r,i)=>results.findIndex(x=>x.row.id===r.row.id)===i);
  const right=first.filter(r=>r.ok).length;
  const upgraded=first.filter(r=>r.ok&&r.after>r.before);
  const missed=[...new Map(results.filter(r=>!r.ok).map(r=>[r.row.id,r.row])).values()];
  return <section className="daily-words pattern-drill" aria-label="Kalıp antrenmanı">
   <header className="page-head"><h1>Tur tamam</h1></header>
   <div className="panel">
    <dl className="tiles"><div><dt>İlk denemede doğru</dt><dd>{right}<small> / {first.length}</small></dd></div><div><dt>Seviye atlayan</dt><dd>{upgraded.length}</dd></div><div><dt>Oturan kalıp</dt><dd>{overview.settled}<small> / {overview.total}</small></dd></div></dl>
    {upgraded.length>0&&<section className="result-block"><h3>Seviye atladı</h3><ul className="pattern-list">{upgraded.map(r=><li key={r.row.id}><span lang="de">{r.row.phrase}</span><span lang="tr">{r.row.tr}</span><span className="level-up">Seviye {r.before} → {r.after}</span></li>)}</ul></section>}
    {missed.length>0&&<section className="result-block"><h3>Tekrar edilecek</h3><ul className="pattern-list">{missed.map(r=><li key={r.id}><span lang="de">{r.phrase}</span><span lang="tr">{r.tr}</span><SpeakButton de={r.phrase} tr={r.tr} label="Dinle"/></li>)}</ul></section>}
    <div className="panel-actions"><button type="button" className="primary" onClick={()=>setPhase('hub')}>Tamam</button>{counts.mixed>0&&<button type="button" className="secondary" onClick={()=>start('mixed')}>Bir tur daha</button>}</div>
   </div>
  </section>;
 }

 const total=Math.max(1,overview.total);
 return <section className="daily-words pattern-drill" aria-label="Kalıp antrenmanı">
  <header className="page-head"><h1>Kalıplar</h1><p className="page-sub">{practisedToday>0?`Bugün ${practisedToday} kalıp çalıştın`:'Bugün henüz kalıp çalışmadın'}</p></header>
  {!progress?<p className="muted" role="status">Yükleniyor…</p>:overview.total===0?<p className="panel empty">Kalıp çalışmak için önce kelime ekle.</p>:<>
   <div className="panel">
    <div className="stack-bar" role="img" aria-label={`${overview.settled} oturdu, ${overview.learning} öğreniliyor, ${overview.fresh} yeni`}><i className="s" style={{width:overview.settled/total*100+'%'}}/><i className="l" style={{width:overview.learning/total*100+'%'}}/><i className="n" style={{width:overview.fresh/total*100+'%'}}/></div>
    <dl className="tiles"><div><dt><span className="dot s"/>Oturdu</dt><dd>{overview.settled}</dd></div><div><dt><span className="dot l"/>Öğreniliyor</dt><dd>{overview.learning}</dd></div><div><dt><span className="dot n"/>Yeni</dt><dd>{overview.fresh}</dd></div><div><dt>Tekrarı gelen</dt><dd>{overview.due}</dd></div></dl>
   </div>
   <div className="modes">
    <button type="button" className="mode primary-mode" disabled={!counts.mixed} onClick={()=>start('mixed')}><b>Karışık tur</b><span>{counts.mixed?`${counts.mixed} kalıp · tekrarlar ve yeniler`:'Bugünlük tamam'}</span></button>
    <button type="button" className="mode" disabled={!counts.weak} onClick={()=>start('weak')}><b>Zayıf kalıplar</b><span>{counts.weak?`${counts.weak} kalıp`:'Zayıf kalıp yok'}</span></button>
    <button type="button" className="mode" disabled={!counts.fresh} onClick={()=>start('new')}><b>Yeni kalıplar</b><span>{counts.fresh?`${counts.fresh} kalıp · önce çalışılır`:'Hepsi görüldü'}</span></button>
    <button type="button" className="mode" disabled={!counts.type} onClick={()=>start('type')}><b>Yazarak çalış</b><span>{counts.type?`${counts.type} kalıp · Türkçesinden Almancasını yaz`:'Kalıp yok'}</span></button>
    <button type="button" className="mode" disabled={!counts.compose} onClick={()=>start('compose')}><b>Kendi cümleni kur</b><span>{counts.compose?`${counts.compose} kalıp · özgün cümle yaz`:'Kalıp yok'}</span></button>
    <button type="button" className="mode" disabled={!counts.shadow} onClick={()=>start('shadow')}><b>Gölgeleme</b><span>{counts.shadow?`${counts.shadow} kalıp · dinle, tekrar et, kaydet`:'Kalıp yok'}</span></button>
   </div>
   <div className="segment" role="group" aria-label="Tur uzunluğu">{[10,20,30].map(n=><button key={n} type="button" className={size===n?'active':''} aria-pressed={size===n} onClick={()=>setSize(n)}>{n} kalıp</button>)}</div>
   <section className="panel">
    <div className="list-head"><h2>Tüm kalıplar</h2><span className="muted">{list.length}</span></div>
    <div className="library-toolbar"><label className="search-box"><input aria-label="Kalıplarda ara" placeholder="Ara: Almanca veya Türkçe" value={query} onChange={e=>{setQuery(e.target.value);setShown(30);}}/></label></div>
    <div className="library-filters" role="group" aria-label="Kalıpları süz">{STATUS.map(([k,l])=><button key={k} type="button" className={'filter-chip'+(filter===k?' active':'')} aria-pressed={filter===k} onClick={()=>{setFilter(k);setShown(30);}}>{l} <span>{k==='all'?entries.length:k==='weak'?entries.filter(e=>isWeak(e.stat)).length:entries.filter(e=>statusOf(e.stat)===k).length}</span></button>)}</div>
    <ul className="pattern-list rows">{list.slice(0,shown).map(e=><li key={e.row.id}>
     <div className="pl-text"><span lang="de">{e.row.phrase}</span><span lang="tr">{e.row.tr}</span></div>
     <Meter stat={e.stat}/>
     <div className="pl-actions"><SpeakButton de={e.row.phrase} tr={e.row.tr} label="Dinle" iconOnly/><button type="button" className="text-button" onClick={()=>startOne(e)}>Çalış</button></div>
    </li>)}</ul>
    {list.length===0&&<p className="muted">Eşleşen kalıp yok.</p>}
    {list.length>shown&&<button type="button" className="secondary" onClick={()=>setShown(n=>n+30)}>Daha fazla ({list.length-shown})</button>}
   </section>
  </>}
 </section>;
}
