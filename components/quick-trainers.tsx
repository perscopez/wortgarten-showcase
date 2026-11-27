'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Link2,MapPin,PencilLine,RotateCcw,Tag} from 'lucide-react';
import SpeakButton from './speak-button';
import {recordError} from '../lib/error-log';
import {
 QUICK_TRAINERS,
 buildArtikelRound,
 buildKonjugationRound,
 buildPraepositionenRound,
 buildVerbindenRound,
 checkArtikelAnswer,
 checkKonjugationAnswer,
 type ArticleValue,
 type CefrLevel,
 type KonjugationTense,
 type QuickCardInput,
 type QuickTrainerKind,
 type VerbindenMode,
} from '../lib/quick-trainers';

interface Props{
 cards:QuickCardInput[];
 initialKind?:QuickTrainerKind|null;
 onBack:()=>void;
}

type MissRecord={prompt:string;expected:string;given:string;note?:string};
type LineCoord={id:string;x1:number;y1:number;x2:number;y2:number;color:string};

const LEVELS:CefrLevel[]=['all','A1','A2','B1','B2'];
const TENSES:[KonjugationTense,string][]=[['praesens','Präsens'],['praeteritum','Präteritum'],['perfekt','Perfekt']];
const VERBINDEN_MODES:[VerbindenMode,string][]=[['words','Kelimeler'],['rection','Fiil + Hâl'],['patterns','Kalıplar'],['antonyms','Zıt anlamlar']];
const PAIR_COLORS=['#2f7a4d','#2a62a0','#b66d1d','#8b468f','#227c84'];

function TrainerIcon({kind}:{kind:QuickTrainerKind}){
 if(kind==='artikel')return <Tag size={22} className="qt-icon qt-icon-artikel"/>;
 if(kind==='praepositionen')return <MapPin size={22} className="qt-icon qt-icon-praep"/>;
 if(kind==='konjugation')return <PencilLine size={22} className="qt-icon qt-icon-konj"/>;
 return <Link2 size={22} className="qt-icon qt-icon-verb"/>;
}

export function QuickTrainerLauncher({onSelect}:{onSelect:(kind:QuickTrainerKind)=>void}){
 return <section className="panel qt-launcher" aria-labelledby="qt-launcher-title">
  <div className="qt-launcher-head">
   <p id="qt-launcher-title" className="qt-eyebrow">HIZLI ANTRENMAN · HER BİRİ ~5 DK</p>
  </div>
  <div className="qt-grid">
   {QUICK_TRAINERS.map(t=><button key={t.kind} type="button" className="qt-card" onClick={()=>onSelect(t.kind)}>
    <span className="qt-card-icon" aria-hidden="true"><TrainerIcon kind={t.kind}/></span>
    <span className="qt-card-body">
     <strong lang="de">{t.title}</strong>
     <span>{t.subtitle}</span>
    </span>
   </button>)}
  </div>
 </section>;
}

function fmtElapsed(ms:number){
 const s=Math.max(1,Math.round(ms/1000));
 const m=Math.floor(s/60),r=s%60;
 return m?`${m} dk ${r} sn`:`${r} sn`;
}

export default function QuickTrainers({cards,initialKind=null,onBack}:Props){
 const [kind,setKind]=useState<QuickTrainerKind|null>(initialKind);
 const [seed,setSeed]=useState(()=>String(Date.now()));
 const [level,setLevel]=useState<CefrLevel>('all');
 const [tense,setTense]=useState<KonjugationTense>('praesens');
 const [vMode,setVMode]=useState<VerbindenMode>('words');

 // Shared round state
 const [idx,setIdx]=useState(0);
 const [correctCount,setCorrectCount]=useState(0);
 const [totalAttempts,setTotalAttempts]=useState(0);
 const [streak,setStreak]=useState(0);
 const [misses,setMisses]=useState<MissRecord[]>([]);
 const [finished,setFinished]=useState(false);
 const [startedAt,setStartedAt]=useState(()=>Date.now());
 const [answered,setAnswered]=useState<{ok:boolean;umlaut?:boolean;given:string;expected:string;note?:string}|null>(null);

 // Konjugation input
 const [typed,setTyped]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);

 // Verbinden board state
 const [boardIdx,setBoardIdx]=useState(0);
 const [selectedLeft,setSelectedLeft]=useState<string|null>(null);
 const [matched,setMatched]=useState<Record<string,string>>({});
 const [wrongPair,setWrongPair]=useState<{left:string;right:string}|null>(null);
 const [dragLine,setDragLine]=useState<{x1:number;y1:number;x2:number;y2:number}|null>(null);
 const [lines,setLines]=useState<LineCoord[]>([]);
 const boardRef=useRef<HTMLDivElement>(null);
 const leftRefs=useRef<Record<string,HTMLButtonElement|null>>({});
 const rightRefs=useRef<Record<string,HTMLButtonElement|null>>({});
 const draggingLeft=useRef<string|null>(null);

 useEffect(()=>{
  if(initialKind)setKind(initialKind);
 },[initialKind]);

 const resetSession=useCallback((nextSeed?:string)=>{
  setSeed(nextSeed||String(Date.now()));
  setIdx(0);
  setCorrectCount(0);
  setTotalAttempts(0);
  setStreak(0);
  setMisses([]);
  setFinished(false);
  setAnswered(null);
  setTyped('');
  setBoardIdx(0);
  setSelectedLeft(null);
  setMatched({});
  setWrongPair(null);
  setDragLine(null);
  setLines([]);
  setStartedAt(Date.now());
 },[]);

 const openTrainer=(k:QuickTrainerKind)=>{
  setKind(k);
  resetSession();
 };

 const artikelItems=useMemo(()=>buildArtikelRound(cards,15,seed),[cards,seed]);
 const praepItems=useMemo(()=>buildPraepositionenRound(level,12,seed),[level,seed]);
 const konjItems=useMemo(()=>buildKonjugationRound(tense,level,12,seed),[tense,level,seed]);
 const verbBoards=useMemo(()=>buildVerbindenRound(cards,vMode,3,5,seed),[cards,vMode,seed]);

 const currentArtikel=kind==='artikel'?artikelItems[idx]:undefined;
 const currentPraep=kind==='praepositionen'?praepItems[idx]:undefined;
 const currentKonj=kind==='konjugation'?konjItems[idx]:undefined;
 const currentBoard=kind==='verbinden'?verbBoards[boardIdx]:undefined;

 const totalSteps=kind==='artikel'?artikelItems.length:kind==='praepositionen'?praepItems.length:kind==='konjugation'?konjItems.length:verbBoards.length;
 const currentStep=kind==='verbinden'?boardIdx:idx;

 const advanceStep=useCallback(()=>{
  setAnswered(null);
  setTyped('');
  if(idx+1>=totalSteps){setFinished(true);}else{setIdx(i=>i+1);}
 },[idx,totalSteps]);

 const answerArtikel=useCallback((choice:ArticleValue)=>{
  if(!currentArtikel||answered)return;
  const res=checkArtikelAnswer(currentArtikel,choice);
  setTotalAttempts(n=>n+1);
  if(res.ok){
   setCorrectCount(n=>n+1);
   setStreak(s=>s+1);
  }else{
   setStreak(0);
   setMisses(m=>[...m,{prompt:currentArtikel.word,expected:`${currentArtikel.article} ${currentArtikel.word}`,given:`${choice} ${currentArtikel.word}`,note:currentArtikel.cue}]);
   recordError({type:'artikel',word:currentArtikel.word,expected:`${currentArtikel.article} ${currentArtikel.word}`,given:`${choice} ${currentArtikel.word}`});
  }
  setAnswered({ok:res.ok,given:choice,expected:currentArtikel.article,note:res.cue});
 },[currentArtikel,answered]);

 const answerPraep=useCallback((choice:string)=>{
  if(!currentPraep||answered)return;
  const ok=choice.toLocaleLowerCase('de')===currentPraep.answer.toLocaleLowerCase('de');
  setTotalAttempts(n=>n+1);
  if(ok){
   setCorrectCount(n=>n+1);
   setStreak(s=>s+1);
  }else{
   setStreak(0);
   setMisses(m=>[...m,{prompt:`${currentPraep.before} ___ ${currentPraep.after}`,expected:currentPraep.answer,given:choice,note:currentPraep.note}]);
   recordError({type:'edat',word:`${currentPraep.before} ${currentPraep.answer} ${currentPraep.after}`,expected:currentPraep.answer,given:choice});
  }
  setAnswered({ok,given:choice,expected:currentPraep.answer,note:currentPraep.note});
 },[currentPraep,answered]);

 const submitKonjugation=useCallback(()=>{
  if(!currentKonj)return;
  if(answered){advanceStep();return;}
  const verdict=checkKonjugationAnswer(currentKonj,typed);
  if(verdict==='empty')return;
  const ok=verdict==='correct'||verdict==='umlaut';
  setTotalAttempts(n=>n+1);
  if(ok){
   setCorrectCount(n=>n+1);
   setStreak(s=>s+1);
  }else{
   setStreak(0);
   setMisses(m=>[...m,{prompt:`${currentKonj.pronoun} (${currentKonj.infinitive})`,expected:currentKonj.answer,given:typed.trim()}]);
   recordError({type:'cekim',word:currentKonj.infinitive,expected:`${currentKonj.pronoun} ${currentKonj.answer}`,given:typed.trim()});
  }
  setAnswered({ok,umlaut:verdict==='umlaut',given:typed.trim(),expected:currentKonj.answer});
 },[currentKonj,answered,typed,advanceStep]);

 // Focus input when new konjugation item appears
 useEffect(()=>{
  if(kind==='konjugation'&&!finished&&!answered){
   inputRef.current?.focus();
  }
 },[kind,idx,finished,answered]);

 // Keyboard shortcuts for Artikel & Präpositionen
 useEffect(()=>{
  if(!kind||finished||kind==='verbinden'||kind==='konjugation')return;
  const onKey=(e:KeyboardEvent)=>{
   const target=e.target as HTMLElement|null;
   if(target?.closest('input,textarea,select'))return;
   if(answered){
    if(e.key==='Enter'||e.key===' '){e.preventDefault();advanceStep();}
    return;
   }
   if(kind==='artikel'){
    if(e.key==='1'||e.key.toLowerCase()==='r'){e.preventDefault();answerArtikel('der');}
    else if(e.key==='2'||e.key.toLowerCase()==='e'){e.preventDefault();answerArtikel('die');}
    else if(e.key==='3'||e.key.toLowerCase()==='s'){e.preventDefault();answerArtikel('das');}
   }else if(kind==='praepositionen'&&currentPraep){
    const n=Number(e.key);
    if(n>=1&&n<=currentPraep.options.length){e.preventDefault();answerPraep(currentPraep.options[n-1]);}
   }
  };
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[kind,finished,answered,advanceStep,answerArtikel,answerPraep,currentPraep]);

 // Verbinden SVG line calculation
 const recomputeLines=useCallback(()=>{
  const container=boardRef.current;
  if(!container||!currentBoard){setLines([]);return;}
  const rect=container.getBoundingClientRect();
  const next:LineCoord[]=[];
  const entries=Object.entries(matched);
  entries.forEach(([leftId,rightId],i)=>{
   const lEl=leftRefs.current[leftId];
   const rEl=rightRefs.current[rightId];
   if(!lEl||!rEl)return;
   const lr=lEl.getBoundingClientRect();
   const rr=rEl.getBoundingClientRect();
   next.push({
    id:leftId,
    x1:lr.right-rect.left,
    y1:lr.top+lr.height/2-rect.top,
    x2:rr.left-rect.left,
    y2:rr.top+rr.height/2-rect.top,
    color:PAIR_COLORS[i%PAIR_COLORS.length],
   });
  });
  setLines(next);
 },[matched,currentBoard]);

 useEffect(()=>{
  if(kind!=='verbinden'||finished)return;
  recomputeLines();
  const el=boardRef.current;
  if(!el||typeof ResizeObserver==='undefined')return;
  const ro=new ResizeObserver(()=>recomputeLines());
  ro.observe(el);
  window.addEventListener('resize',recomputeLines);
  return()=>{ro.disconnect();window.removeEventListener('resize',recomputeLines);};
 },[kind,finished,recomputeLines,boardIdx]);

 const tryConnect=useCallback((leftId:string,rightId:string)=>{
  if(!currentBoard||matched[leftId])return;
  const alreadyUsedRight=Object.values(matched).includes(rightId);
  if(alreadyUsedRight)return;
  setTotalAttempts(n=>n+1);
  if(leftId===rightId){
   const nextMatched={...matched,[leftId]:rightId};
   setMatched(nextMatched);
   setCorrectCount(n=>n+1);
   setStreak(s=>s+1);
   setSelectedLeft(null);
   setWrongPair(null);
   if(Object.keys(nextMatched).length===currentBoard.pairs.length){
    window.setTimeout(()=>{
     if(boardIdx+1>=verbBoards.length){setFinished(true);}
     else{setBoardIdx(b=>b+1);setMatched({});setSelectedLeft(null);setWrongPair(null);setLines([]);}
    },650);
   }
  }else{
   setStreak(0);
   const pair=currentBoard.pairs.find(p=>p.id===leftId);
   const picked=currentBoard.pairs.find(p=>p.id===rightId);
   if(pair&&picked){
    setMisses(m=>[...m,{prompt:pair.left,expected:pair.right,given:picked.right}]);
    recordError({type:'anlam',word:pair.left,expected:pair.right,given:picked.right});
   }
   setWrongPair({left:leftId,right:rightId});
   setSelectedLeft(null);
   window.setTimeout(()=>setWrongPair(null),550);
  }
 },[currentBoard,matched,boardIdx,verbBoards.length]);

 const onLeftPointerDown=(leftId:string,e:React.PointerEvent<HTMLButtonElement>)=>{
  if(matched[leftId])return;
  const container=boardRef.current;
  if(!container)return;
  const rect=container.getBoundingClientRect();
  const lr=e.currentTarget.getBoundingClientRect();
  draggingLeft.current=leftId;
  setSelectedLeft(leftId);
  setDragLine({x1:lr.right-rect.left,y1:lr.top+lr.height/2-rect.top,x2:e.clientX-rect.left,y2:e.clientY-rect.top});
 };

 const onBoardPointerMove=(e:React.PointerEvent<HTMLDivElement>)=>{
  if(!draggingLeft.current||!boardRef.current)return;
  const rect=boardRef.current.getBoundingClientRect();
  setDragLine(prev=>prev?{...prev,x2:e.clientX-rect.left,y2:e.clientY-rect.top}:null);
 };

 const onBoardPointerUp=(e:React.PointerEvent<HTMLDivElement>)=>{
  const leftId=draggingLeft.current;
  draggingLeft.current=null;
  setDragLine(null);
  if(!leftId)return;
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-right-id]');
  const rightId=target?.dataset.rightId;
  if(rightId)tryConnect(leftId,rightId);
 };

 const insertChar=(ch:string)=>{
  setTyped(prev=>prev+ch);
  inputRef.current?.focus();
 };

 // Hub view (no trainer selected)
 if(!kind){
  return <section className="qt-page" aria-label="Hızlı antrenman">
   <div className="heading-row">
    <div>
     <h1>Hızlı antrenman</h1>
     <p className="lead">Her biri yaklaşık 5 dakikalık dört odak egzersizi: artikel, edat, fiil çekimi ve eşleştirme.</p>
    </div>
    <button type="button" className="secondary" onClick={onBack}><ArrowLeft size={16}/> Bugün</button>
   </div>
   <QuickTrainerLauncher onSelect={openTrainer}/>
  </section>;
 }

 const meta=QUICK_TRAINERS.find(t=>t.kind===kind)!;
 const accuracy=totalAttempts?Math.round((correctCount/totalAttempts)*100):100;

 return <section className="qt-page" aria-label={meta.title}>
  <div className="qt-topbar">
   <button type="button" className="secondary" onClick={()=>setKind(null)}><ArrowLeft size={16}/> Tüm antrenmanlar</button>
   <div className="qt-progress-wrap">
    <div className="focus-progress" role="progressbar" aria-valuemin={0} aria-valuemax={Math.max(1,totalSteps)} aria-valuenow={finished?totalSteps:currentStep}>
     <span style={{width:`${Math.min(100,((finished?totalSteps:currentStep)/Math.max(1,totalSteps))*100)}%`}}/>
    </div>
    <span className="micro">{finished?totalSteps:currentStep+1} / {Math.max(1,totalSteps)}</span>
   </div>
   {streak>=3&&<b className="streak-badge" aria-label={`${streak} doğru üst üste`}>🔥 {streak}</b>}
  </div>

  <div className="qt-header">
   <span className="qt-card-icon" aria-hidden="true"><TrainerIcon kind={kind}/></span>
   <div>
    <h1 lang="de">{meta.title}</h1>
    <p className="micro">{meta.subtitle} · {meta.badge}</p>
   </div>
  </div>

  {/* Filters per mode */}
  {kind==='praepositionen'&&!finished&&<div className="qt-filters" role="group" aria-label="Seviye seç">
   {LEVELS.map(lv=><button key={lv} type="button" className={'filter-chip'+(level===lv?' active':'')} aria-pressed={level===lv} onClick={()=>{setLevel(lv);resetSession();}}>{lv==='all'?'Tümü (A1–B2)':lv}</button>)}
  </div>}

  {kind==='konjugation'&&!finished&&<div className="qt-filter-stack">
   <div className="qt-filters" role="group" aria-label="Zaman seç">
    {TENSES.map(([t,label])=><button key={t} type="button" className={'filter-chip'+(tense===t?' active':'')} aria-pressed={tense===t} onClick={()=>{setTense(t);resetSession();}}>{label}</button>)}
   </div>
   <div className="qt-filters" role="group" aria-label="Seviye seç">
    {LEVELS.map(lv=><button key={lv} type="button" className={'filter-chip'+(level===lv?' active':'')} aria-pressed={level===lv} onClick={()=>{setLevel(lv);resetSession();}}>{lv==='all'?'Tümü':lv}</button>)}
   </div>
  </div>}

  {kind==='verbinden'&&!finished&&<div className="qt-filters" role="group" aria-label="Eşleştirme türü">
   {VERBINDEN_MODES.map(([m,label])=><button key={m} type="button" className={'filter-chip'+(vMode===m?' active':'')} aria-pressed={vMode===m} onClick={()=>{setVMode(m);resetSession();}}>{label}</button>)}
  </div>}

  {/* Summary */}
  {finished?<div className="panel summary-panel">
   <h2>Antrenman tamam!</h2>
   <dl className="tiles">
    <div><dt>Doğruluk</dt><dd>%{accuracy}</dd></div>
    <div><dt>Doğru</dt><dd>{correctCount} / {totalAttempts}</dd></div>
    <div><dt>Süre</dt><dd>{fmtElapsed(Date.now()-startedAt)}</dd></div>
   </dl>
   {misses.length>0&&<section className="result-block">
    <h3>Tekrar bakılacaklar ({misses.length})</h3>
    <ul className="qt-miss-list">
     {misses.slice(0,12).map((m,i)=><li key={i}><strong lang="de">{m.prompt}</strong><span>Doğrusu: <b lang="de">{m.expected}</b>{m.given?` · Sen: ${m.given}`:''}</span>{m.note&&<small>{m.note}</small>}</li>)}
    </ul>
   </section>}
   <div className="panel-actions">
    <button type="button" className="primary" onClick={()=>resetSession()}><RotateCcw size={16}/> Yeni tur başlat</button>
    <button type="button" className="secondary" onClick={()=>setKind(null)}>Diğer antrenmanlar</button>
   </div>
  </div>:

  /* 1. der/die/das */
  kind==='artikel'&&currentArtikel?<article className="panel qt-stage" translate="no">
   <p className="eyebrow">ARTİKEL SEÇ · {idx+1}/{artikelItems.length}</p>
   <h2 className="qt-word" lang="de">
    {answered?<span className={'article-color article-'+currentArtikel.article}>{currentArtikel.article} </span>:<span className="qt-gap">___ </span>}
    {currentArtikel.word}
   </h2>
   <p className="qt-meaning" lang="tr">{currentArtikel.meaning}</p>
   <div className="qt-artikel-row">
    {(['der','die','das'] as ArticleValue[]).map((art,i)=><button key={art} type="button" disabled={!!answered}
     className={'qt-art-btn qt-art-'+art+(answered&&currentArtikel.article===art?' is-right':'')+(answered&&answered.given===art&&!answered.ok?' is-wrong':'')}
     onClick={()=>answerArtikel(art)}>
     <kbd>{i+1}</kbd> <span lang="de">{art}</span>
    </button>)}
   </div>
   {answered&&<div className={'exercise-feedback '+(answered.ok?'good':'bad')} role="status">
    <p>{answered.ok?'✓ Doğru!':`✗ Doğrusu: ${currentArtikel.article} ${currentArtikel.word}`}</p>
    <p className="micro">{currentArtikel.cue}{currentArtikel.plural?` · Çoğul: die ${currentArtikel.plural}`:''}</p>
    <div className="qt-feedback-actions">
     <SpeakButton de={`${currentArtikel.article} ${currentArtikel.word}`} label="Dinle"/>
     <button type="button" className="primary" onClick={advanceStep}>{idx+1<artikelItems.length?'Sonraki →':'Özeti gör'}</button>
    </div>
   </div>}
  </article>:

  /* 2. Präpositionen */
  kind==='praepositionen'&&currentPraep?<article className="panel qt-stage" translate="no">
   <p className="eyebrow">EDAT SEÇ · {currentPraep.level} · {idx+1}/{praepItems.length}</p>
   <p className="qt-sentence" lang="de">
    {currentPraep.before}{' '}
    <span className={'cloze-gap'+(answered?' filled':'')}>{answered?currentPraep.answer:'＿＿＿'}</span>{' '}
    {currentPraep.after}
   </p>
   <p className="qt-meaning" lang="tr">{currentPraep.translation}</p>
   <div className="qt-options">
    {currentPraep.options.map((opt,i)=><button key={opt} type="button" disabled={!!answered}
     className={'qt-opt-btn'+(answered&&opt===currentPraep.answer?' is-right':'')+(answered&&answered.given===opt&&!answered.ok?' is-wrong':'')}
     onClick={()=>answerPraep(opt)}>
     <kbd>{i+1}</kbd> <span lang="de">{opt}</span>
    </button>)}
   </div>
   {answered&&<div className={'exercise-feedback '+(answered.ok?'good':'bad')} role="status">
    <p>{answered.ok?'✓ Doğru!':`✗ Doğrusu: ${currentPraep.answer}`} · <span className={'case-pill case-'+currentPraep.governed.toLowerCase()}>{currentPraep.governed}</span></p>
    <p className="micro">{currentPraep.note}</p>
    <div className="qt-feedback-actions">
     <SpeakButton de={`${currentPraep.before} ${currentPraep.answer} ${currentPraep.after}`} label="Cümleyi dinle"/>
     <button type="button" className="primary" onClick={advanceStep}>{idx+1<praepItems.length?'Sonraki →':'Özeti gör'}</button>
    </div>
   </div>}
  </article>:

  /* 3. Konjugation */
  kind==='konjugation'&&currentKonj?<article className="panel qt-stage" translate="no">
   <p className="eyebrow">{TENSES.find(t=>t[0]===tense)?.[1].toUpperCase()} · {currentKonj.level} · {idx+1}/{konjItems.length}</p>
   <h2 className="qt-word" lang="de">{currentKonj.infinitive}</h2>
   <p className="qt-meaning" lang="tr">{currentKonj.meaning}</p>
   <form className="qt-konj-form" onSubmit={e=>{e.preventDefault();submitKonjugation();}}>
    <label className="qt-konj-row">
     <span className="qt-pronoun" lang="de">{currentKonj.pronoun}</span>
     <input ref={inputRef} value={typed} disabled={!!answered} autoComplete="off" autoCapitalize="none" spellCheck={false}
      placeholder={tense==='perfekt'?'ör. hat gemacht':'çekimli biçimi yaz…'}
      aria-label={`${currentKonj.pronoun} ${currentKonj.infinitive} çekimi`}
      onChange={e=>setTyped(e.target.value)}/>
    </label>
    {!answered&&<div className="qt-umlaut-bar" aria-label="Almanca karakterler">
     {['ä','ö','ü','ß'].map(ch=><button key={ch} type="button" className="secondary qt-char-btn" onClick={()=>insertChar(ch)}>{ch}</button>)}
     <button type="submit" className="primary" disabled={!typed.trim()}>Kontrol et</button>
    </div>}
   </form>
   {answered&&<div className={'exercise-feedback '+(answered.ok?(answered.umlaut?'near':'good'):'bad')} role="status">
    <p>{answered.ok?(answered.umlaut?`✓ Doğru (yazım: ${currentKonj.answer})`:'✓ Doğru!'):`✗ Doğrusu: ${currentKonj.pronoun} ${currentKonj.answer}`}</p>
    <div className="qt-feedback-actions">
     <SpeakButton de={`${currentKonj.pronoun.split('/')[0]} ${currentKonj.answer}`} label="Dinle"/>
     <button type="button" className="primary" onClick={advanceStep}>{idx+1<konjItems.length?'Sonraki →':'Özeti gör'}</button>
    </div>
   </div>}
  </article>:

  /* 4. Verbinden */
  kind==='verbinden'&&currentBoard?<article className="panel qt-stage" translate="no">
   <p className="eyebrow">EŞLEŞTİR · TAHTA {boardIdx+1}/{verbBoards.length}</p>
   <p className="micro">Soldan sağa çizgi çek ya da önce sol, sonra sağ karta dokun.</p>
   <div ref={boardRef} className="qt-verbinden" onPointerMove={onBoardPointerMove} onPointerUp={onBoardPointerUp} onPointerCancel={()=>{draggingLeft.current=null;setDragLine(null);}}>
    <svg className="qt-svg" aria-hidden="true">
     {lines.map(l=>{
      const dx=Math.max(28,Math.abs(l.x2-l.x1)*0.45);
      return <path key={l.id} d={`M ${l.x1} ${l.y1} C ${l.x1+dx} ${l.y1}, ${l.x2-dx} ${l.y2}, ${l.x2} ${l.y2}`} stroke={l.color} strokeWidth={3} fill="none" strokeLinecap="round"/>;
     })}
     {dragLine&&(()=>{
      const dx=Math.max(24,Math.abs(dragLine.x2-dragLine.x1)*0.45);
      return <path d={`M ${dragLine.x1} ${dragLine.y1} C ${dragLine.x1+dx} ${dragLine.y1}, ${dragLine.x2-dx} ${dragLine.y2}, ${dragLine.x2} ${dragLine.y2}`} stroke="var(--accent)" strokeWidth={2.5} strokeDasharray="6 5" fill="none" strokeLinecap="round"/>;
     })()}
    </svg>
    <div className="qt-col">
     {currentBoard.pairs.map(p=>{
      const isMatched=!!matched[p.id];
      const isSel=selectedLeft===p.id;
      const isWrong=wrongPair?.left===p.id;
      return <button key={p.id} ref={el=>{leftRefs.current[p.id]=el;}} type="button" disabled={isMatched}
       className={'qt-pair qt-pair-left'+(isMatched?' is-matched':'')+(isSel?' is-selected':'')+(isWrong?' is-wrong':'')}
       onPointerDown={e=>onLeftPointerDown(p.id,e)}
       onClick={()=>{if(!isMatched)setSelectedLeft(prev=>prev===p.id?null:p.id);}}>
       <span lang="de">{p.left}</span>
      </button>;
     })}
    </div>
    <div className="qt-col">
     {currentBoard.rightOrder.map(rid=>{
      const p=currentBoard.pairs.find(x=>x.id===rid)!;
      const isMatched=Object.values(matched).includes(rid);
      const isWrong=wrongPair?.right===rid;
      return <button key={rid} ref={el=>{rightRefs.current[rid]=el;}} type="button" disabled={isMatched}
       data-right-id={rid}
       className={'qt-pair qt-pair-right'+(isMatched?' is-matched':'')+(isWrong?' is-wrong':'')}
       onClick={()=>{if(selectedLeft)tryConnect(selectedLeft,rid);}}>
       <span lang={vMode==='rection'||vMode==='antonyms'?'de':'tr'}>{p.right}</span>
      </button>;
     })}
    </div>
   </div>
  </article>:<div className="panel"><p className="muted">Bu filtre için uygun öğe bulunamadı.</p></div>}
 </section>;
}
