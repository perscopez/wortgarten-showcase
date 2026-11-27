'use client';
import {useEffect,useRef,useState} from 'react';
import {EXAM_LISTENING,EXAM_NOTICE,EXAM_READING,EXAM_SPEAKING,EXAM_WRITING} from '../lib/exam-a2';
import {readAloud} from '../lib/read-aloud';
import {sentenceNotes} from '../lib/sentence-check';
import type {ReadingQuestion} from '../lib/readings';

type Skill='menu'|'lesen'|'horen'|'schreiben'|'sprechen';
const countWords=(s:string)=>(s.match(/[\p{L}'’-]+/gu)||[]).length;

function Questions({items,onScore}:{items:{title:string;questions:ReadingQuestion[]}[];onScore:(right:number,total:number)=>void}){
 const flat=items.flatMap(i=>i.questions.map(q=>({...q,title:i.title})));
 const [picked,setPicked]=useState<(number|null)[]>(flat.map(()=>null));
 const done=picked.every(p=>p!==null);
 const right=picked.filter((p,i)=>p===flat[i].answer).length;
 useEffect(()=>{if(done)onScore(right,flat.length);},[done]);// eslint-disable-line react-hooks/exhaustive-deps
 return <>{flat.map((q,qi)=><fieldset key={qi} className="reading-q"><legend lang="de"><small className="muted">{q.title} · </small>{qi+1}. {q.q}</legend>{q.options.map((o,oi)=>{const d=picked[qi]!==null;return <button key={oi} type="button" lang="de" disabled={d} className={'choice'+(d&&oi===q.answer?' is-right':'')+(picked[qi]===oi&&oi!==q.answer?' is-wrong':'')} onClick={()=>setPicked(p=>p.map((v,i)=>i===qi?oi:v))}>{o}</button>;})}</fieldset>)}
  {done&&<p className={'exercise-feedback '+(right===flat.length?'good':'near')} role="status">{right} / {flat.length} doğru</p>}</>;
}

function Recorder(){
 const [url,setUrl]=useState('');const [rec,setRec]=useState(false);const [err,setErr]=useState('');const [left,setLeft]=useState(60);
 const r=useRef<MediaRecorder|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const startingRef=useRef(false);
 const mountedRef=useRef(true);
 useEffect(()=>{mountedRef.current=true;return()=>{mountedRef.current=false;if(r.current&&r.current.state==='recording'){try{r.current.stop();}catch{}}streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;};},[]);
 useEffect(()=>{if(!rec)return;const t=setInterval(()=>setLeft(v=>v<=1?0:v-1),1000);return()=>clearInterval(t);},[rec]);
 useEffect(()=>{if(rec&&left<=0&&r.current?.state==='recording')r.current.stop();},[rec,left]);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 const ok=typeof navigator!=='undefined'&&!!navigator.mediaDevices?.getUserMedia&&typeof MediaRecorder!=='undefined';
 async function start(){
  if(startingRef.current||rec)return;
  startingRef.current=true;setErr('');setLeft(60);
  try{
   const m=await navigator.mediaDevices.getUserMedia({audio:true});
   if(!mountedRef.current){m.getTracks().forEach(t=>t.stop());return;}
   streamRef.current=m;
   const mr=new MediaRecorder(m),chunks:Blob[]=[];
   mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   mr.onstop=()=>{m.getTracks().forEach(t=>t.stop());if(streamRef.current===m)streamRef.current=null;if(!mountedRef.current)return;setUrl(u=>{if(u)URL.revokeObjectURL(u);return URL.createObjectURL(new Blob(chunks,{type:mr.mimeType||'audio/webm'}));});setRec(false);};
   r.current=mr;mr.start();setRec(true);
  }
  catch{if(mountedRef.current)setErr('Mikrofona erişilemedi. Cevabını kaydetmeden yüksek sesle söyleyebilirsin.');}
  finally{startingRef.current=false;}
 }
 return <div className="recorder">{ok?<div className="exercise-actions">{!rec?<button type="button" className="secondary" onClick={()=>void start()}>● Konuşmaya başla (1 dk)</button>:<button type="button" className="secondary" onClick={()=>{if(r.current?.state==='recording')r.current.stop();}}>■ Bitir · {left} sn</button>}</div>:<p className="muted">Bu tarayıcı kayıt desteklemiyor; cevabını yüksek sesle söyle.</p>}{url&&<audio controls src={url} aria-label="Kendi kaydın"/>}{err&&<p className="exercise-feedback near" role="status">{err}</p>}<p className="micro">Kayıt yalnızca bu cihazda kalır ve puanlanmaz.</p></div>;
}

export default function ExamPractice(){
 const [skill,setSkill]=useState<Skill>('menu');
 const [scores,setScores]=useState<Partial<Record<Skill,[number,number]>>>({});
 const [plays,setPlays]=useState<Record<string,number>>({});
 const [playingId,setPlayingId]=useState<string|null>(null);
 const stopSpeakRef=useRef<(()=>void)|null>(null);
 const [text,setText]=useState<Record<string,string>>({});
 const [checked,setChecked]=useState<Record<string,boolean[]>>({});
 const score=(s:Skill)=>(right:number,total:number)=>setScores(p=>({...p,[s]:[right,total]}));
 function stopListening(){stopSpeakRef.current?.();stopSpeakRef.current=null;setPlayingId(null);}
 useEffect(()=>()=>stopListening(),[]);
 function openSkill(next:Skill){stopListening();if(next==='horen')setPlays({});setSkill(next);}
 function toggleListen(id:string,de:string){
  if(playingId===id){stopListening();return;}
  if((plays[id]||0)>=2)return;
  stopListening();
  setPlays(p=>({...p,[id]:(p[id]||0)+1}));
  try{
   setPlayingId(id);
   stopSpeakRef.current=readAloud([{text:de,lang:'de-DE'}],()=>{stopSpeakRef.current=null;setPlayingId(curr=>curr===id?null:curr);});
  }catch{setPlayingId(null);}
 }
 const back=<button type="button" className="text-button" onClick={()=>openSkill('menu')}>← Sınav menüsü</button>;

 if(skill==='lesen')return <div><header className="page-head">{back}<h1>Lesen</h1><p className="page-sub">Metinleri oku, soruları cevapla</p></header>
  {EXAM_READING.map(t=><section key={t.id} className="panel"><h2>{t.title}</h2><p className="reading-text" lang="de">{t.de}</p></section>)}
  <section className="panel"><Questions items={EXAM_READING} onScore={score('lesen')}/></section></div>;

 if(skill==='horen')return <div><header className="page-head">{back}<h1>Hören</h1><p className="page-sub">Her metni en fazla iki kez dinleyebilirsin</p></header>
  {EXAM_LISTENING.map(t=>{const n=plays[t.id]||0,isPlaying=playingId===t.id;return <section key={t.id} className="panel"><h2>{t.title}</h2>
   <p>{n<2||isPlaying?<button type="button" className="text-button speak-button" aria-pressed={isPlaying} aria-label={isPlaying?'Durdur':n===0?'Dinle':'Bir kez daha dinle'} onClick={()=>toggleListen(t.id,t.de)}>{isPlaying?'⏹ Durdur':'🔊 '+(n===0?'Dinle':'Bir kez daha dinle')}</button>:<span className="muted">İki dinleme hakkın bitti.</span>} <span className="muted">({n}/2)</span></p></section>;})}
  <section className="panel"><Questions items={EXAM_LISTENING} onScore={score('horen')}/></section></div>;

 if(skill==='schreiben')return <div><header className="page-head">{back}<h1>Schreiben</h1><p className="page-sub">30–60 kelimelik kısa metin</p></header>
  {EXAM_WRITING.map(t=>{const v=text[t.id]||'',n=countWords(v),ticks=checked[t.id]||t.points.map(()=>false);
   const notes=v.trim()?v.split(/(?<=[.!?])\s+/).flatMap(s=>sentenceNotes(s,'')).slice(0,3):[];
   return <section key={t.id} className="panel"><h2>{t.title}</h2><p lang="de">{t.prompt}</p><ul>{t.points.map(p=><li key={p} lang="de">{p}</li>)}</ul>
    <textarea lang="de" rows={6} value={v} maxLength={600} autoCapitalize="sentences" autoCorrect="off" spellCheck={false} aria-label={t.title} onChange={e=>setText(x=>({...x,[t.id]:e.target.value}))}/>
    <p className={n>=t.minWords&&n<=t.maxWords?'muted':'exercise-feedback near'}>{n} kelime · hedef {t.minWords}–{t.maxWords}</p>
    {notes.length>0&&<div className="exercise-feedback near"><b>Otomatik notlar</b> (kural tabanlı; her hatayı yakalamaz):<ul>{notes.map((m,i)=><li key={i}>{m.text}</li>)}</ul></div>}
    <p><b>Kontrol listesi</b> — metninde var mı?</p><ul className="compose-checks">{t.points.map((p,i)=><li key={p}><label><input type="checkbox" checked={ticks[i]} onChange={e=>setChecked(c=>({...c,[t.id]:ticks.map((x,j)=>j===i?e.target.checked:x)}))}/> {p}</label></li>)}</ul></section>;})}</div>;

 if(skill==='sprechen')return <div><header className="page-head">{back}<h1>Sprechen</h1><p className="page-sub">Yüksek sesle konuş, istersen kaydet</p></header>
  {EXAM_SPEAKING.map(t=><section key={t.id} className="panel"><h2>{t.title}</h2><p lang="de">{t.prompt}</p><ul>{t.points.map(p=><li key={p} lang="de">{p}</li>)}</ul><Recorder/></section>)}</div>;

 return <div className="exam-menu"><header className="page-head"><h1>Sınav hazırlığı · A2</h1><p className="page-sub">Dört beceri, kısa denemeler</p></header>
  <p className="notice">{EXAM_NOTICE}</p>
  <ul className="reading-cards">{([['lesen','Lesen','2 metin · 6 soru'],['horen','Hören','3 dinleme · 9 soru'],['schreiben','Schreiben','2 yazma görevi'],['sprechen','Sprechen','2 konuşma kartı']] as const).map(([k,t,d])=><li key={k}><button type="button" className="reading-card" onClick={()=>openSkill(k)}><b>{t}</b><span>{scores[k]?`${scores[k]![0]}/${scores[k]![1]} doğru`:d}</span></button></li>)}</ul></div>;
}
