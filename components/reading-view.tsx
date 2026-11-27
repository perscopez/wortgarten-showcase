'use client';
import {useEffect,useRef,useState} from 'react';
import SpeakButton from './speak-button';
import Reading from './reading';
import {READINGS,functionGloss,type Reading as Text} from '../lib/readings';

type Entry={word:string;meaning:string;article:string;plural:string;example:string;translation:string;partOfSpeech?:string};
type Lookup={word:string;busy:boolean;gloss?:string;entry?:Entry;choices?:{id:string;label:string;meaning:string}[];error?:string;saved?:boolean};
function splitReadingSentences(text:string):string[]{
 return text.trim().split(/(?<=[.!?][”“"]?)\s+(?=(?!\d))/).map(s=>s.trim()).filter(Boolean);
}

/** Short reading: read first, tap a word for its meaning and save it, then answer three questions. The Turkish text stays hidden until asked. */
export default function ReadingView({onAdd}:{onAdd:(entry:Entry)=>Promise<boolean>}){
 const [open,setOpen]=useState<Text|null>(null);
 const [showTr,setShowTr]=useState(false);
 const [showRd,setShowRd]=useState(false);
 const [look,setLook]=useState<Lookup|null>(null);
 const [answers,setAnswers]=useState<(number|null)[]>([null,null,null]);
 const abort=useRef<AbortController|null>(null);
 const savingRef=useRef(false);
 useEffect(()=>()=>abort.current?.abort(),[]);

 async function lookup(word:string,sense?:string,index=0){
  abort.current?.abort();const c=new AbortController();abort.current=c;
  const gloss=sense?undefined:functionGloss(word,index);
  if(gloss){setLook({word,busy:false,gloss});return;}
  setLook({word,busy:true});
  try{
   const res=await fetch('/api/quick-word?word='+encodeURIComponent(word)+(sense?'&sense='+encodeURIComponent(sense):''),{signal:AbortSignal.any([c.signal,AbortSignal.timeout(8000)])});
   const data=await res.json();
   if(c.signal.aborted)return;
   if(!res.ok)throw Error(data.error||'Kelime bulunamadı.');
   setLook(data.choices?{word,busy:false,choices:data.choices}:{word,busy:false,entry:data});
  }catch(e){if(!c.signal.aborted)setLook({word,busy:false,error:e instanceof Error?e.message:'Kelime bulunamadı.'});}
 }
 async function save(){
  if(!look?.entry||look.saved||savingRef.current)return;
  const targetWord=look.word,entry=look.entry;
  savingRef.current=true;
  try{
   const ok=await onAdd(entry);
   setLook(l=>l&&l.word===targetWord&&l.entry===entry?{...l,saved:ok}:l);
  }finally{savingRef.current=false;}
 }
 function begin(t:Text){abort.current?.abort();savingRef.current=false;setOpen(t);setShowTr(false);setShowRd(false);setLook(null);setAnswers([null,null,null]);}
 function closeReading(){abort.current?.abort();savingRef.current=false;setLook(null);setOpen(null);}

 if(!open)return <div className="reading-list">
  <header className="page-head"><h1>Okuma</h1><p className="page-sub">Kısa Almanca metinler: oku, bilmediğin kelimeye dokun, sonra soruları cevapla.</p></header>
  <ul className="reading-cards">{READINGS.map(t=><li key={t.id}><button type="button" className="reading-card" onClick={()=>begin(t)}><b>{t.title}</b><span>{t.level} · {Math.max(1,Math.round(t.de.split(/\s+/).length/60))} dk</span></button></li>)}</ul>
 </div>;

 const parts=open.de.match(/[\p{L}'’-]+|[^\p{L}'’-]+/gu)||[];
 const answered=answers.filter(a=>a!==null).length,right=answers.filter((a,i)=>a===open.questions[i].answer).length;
 return <div className="reading-view">
  <header className="page-head"><button type="button" className="text-button" onClick={closeReading}>← Tüm metinler</button><h1>{open.title}</h1><p className="page-sub">{open.level}</p></header>
  <section className="panel">
   <p className="reading-text" lang="de">{parts.map((p,i)=>{const prev=parts.slice(0,i).join('');const atStart=!/[\p{L}]/u.test(prev)||/[.!?][”“"'\s]*$/u.test(prev);return /^[\p{L}]/u.test(p)?<button key={i} type="button" className={'reading-word'+(look?.word===p?' on':'')} onClick={()=>void lookup(p,undefined,atStart?0:i)}>{p}</button>:<span key={i}>{p}</span>;})}</p>
   <div className="panel-actions"><SpeakButton de={open.de} label="Metni dinle"/><button type="button" className="secondary" onClick={()=>setShowTr(v=>!v)}>{showTr?'Türkçesini gizle':'Türkçesini göster'}</button><button type="button" className="secondary" onClick={()=>setShowRd(v=>!v)}>{showRd?'Okunuşu gizle':'Okunuşunu göster'}</button></div>
   {showTr&&<p className="reading-tr" lang="tr">{open.tr}</p>}
   {showRd&&<ul className="reading-rd">{splitReadingSentences(open.de).map((s,i)=><li key={i}><Reading text={s} sentence/></li>)}</ul>}
  </section>
  {look&&<section className="panel reading-look" aria-live="polite">
   {look.gloss&&<div className="entry-card"><div className="entry-head"><b lang="de">{look.word}</b><SpeakButton de={look.word} label="Dinle"/></div><Reading text={look.word}/><p>{look.gloss}</p><p className="muted">Çok sık geçen bir işlev sözcüğü; ayrıca kaydetmen gerekmez.</p></div>}
   {look.busy&&<p className="muted">“{look.word}” aranıyor…</p>}
   {look.error&&<p className="muted">“{look.word}”: {look.error}</p>}
   {look.choices&&<><p className="muted">“{look.word}” için anlam seç:</p>{look.choices.map(c=><button key={c.id} type="button" className="sense-choice" onClick={()=>void lookup(look.word,c.id)}><b>{c.label}</b><span>{c.meaning}</span></button>)}</>}
   {look.entry&&<div className="entry-card"><div className="entry-head"><b lang="de">{look.entry.article&&<span className={'article-color article-'+look.entry.article}>{look.entry.article} </span>}{look.entry.word}</b><SpeakButton de={[look.entry.article,look.entry.word].filter(Boolean).join(' ')} label="Dinle"/></div><Reading text={[look.entry.article,look.entry.word].filter(Boolean).join(' ')}/><p>{look.entry.meaning}</p><button type="button" className="primary" disabled={look.saved} onClick={()=>void save()}>{look.saved?'Kaydedildi':'Kelimelerime ekle'}</button></div>}
  </section>}
  <section className="panel"><h2>Anlama soruları</h2>
   {open.questions.map((q,qi)=><fieldset key={qi} className="reading-q"><legend lang="de">{q.q}</legend>{q.options.map((o,oi)=>{const picked=answers[qi]===oi,done=answers[qi]!==null;return <button key={oi} type="button" lang="de" disabled={done} className={'choice'+(done&&oi===q.answer?' is-right':'')+(picked&&oi!==q.answer?' is-wrong':'')} onClick={()=>setAnswers(a=>a.map((v,i)=>i===qi?oi:v))}>{o}</button>;})}</fieldset>)}
   {answered===open.questions.length&&<p className={'exercise-feedback '+(right===open.questions.length?'good':'near')} role="status">{right} / {open.questions.length} doğru{right<open.questions.length?'. Metne dön, yanlış olanların cevabını cümlede bul.':'. Aferin!'}</p>}
  </section>
 </div>;
}
