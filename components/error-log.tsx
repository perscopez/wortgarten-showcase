'use client';
import {useEffect,useState} from 'react';
import {ERROR_LABELS,ERROR_LOG_KEY,emptyErrorLog,parseErrorLog,summarizeErrors,type ErrorLog} from '../lib/error-log';
import {readLearningValue,writeLearningValue} from '../lib/learning-records';

/** Mistakes by type over the last two weeks, a pointer to the right practice, and the most recent slips. */
export default function ErrorLogView({onGo}:{onGo:(page:string)=>void}){
 const [log,setLog]=useState<ErrorLog|null>(null);
 const [failed,setFailed]=useState(false);
 const [confirmClear,setConfirmClear]=useState(false);
 const [clearing,setClearing]=useState(false);
 const [clearFailed,setClearFailed]=useState(false);
 useEffect(()=>{
  let alive=true;
  const load=()=>readLearningValue(ERROR_LOG_KEY).then(v=>{if(alive){setFailed(false);setLog(parseErrorLog(v));}}).catch(()=>{if(alive){setFailed(true);setLog(emptyErrorLog());}});
  void load();
  window.addEventListener('wortgarten-learning-changed',load);
  return()=>{alive=false;window.removeEventListener('wortgarten-learning-changed',load);};
 },[]);
 if(!log)return <p className="muted" role="status">Yükleniyor…</p>;
 const sum=summarizeErrors(log);const max=Math.max(1,...sum.list.map(x=>x.count));
 const goal=sum.top==='cekim'?'formfinder':sum.top==='artikel'?'articles':sum.top==='hal'?'grammar':sum.top==='yazim'||sum.top==='anlam'||sum.top==='baglam'?'home':'patterns';
 async function clear(){
  if(clearing)return;
  setClearing(true);setClearFailed(false);
  try{
   const empty=emptyErrorLog();
   await writeLearningValue(ERROR_LOG_KEY,empty);
   setLog(empty);setConfirmClear(false);
  }catch{setClearFailed(true);}
  finally{setClearing(false);}
 }
 return <div className="error-log">
  <header className="page-head"><h1>Hata defteri</h1><p className="page-sub">Son 14 gün · {sum.total} hata</p></header>
  {failed&&<p className="notice">Hata defteri okunamadı; boş gösteriliyor.</p>}
  {sum.total===0?<p className="panel empty">Son 14 günde kayıtlı hata yok.</p>:
   <section className="panel"><h2>En sık hata türleri</h2>
    <ul className="error-bars">{sum.list.map(x=><li key={x.type}><span className="error-name">{ERROR_LABELS[x.type].label}</span><span className="error-bar"><i style={{width:Math.max(6,x.count/max*100)+'%'}}/></span><b>{x.count}</b></li>)}</ul>
    {sum.top&&<><p><b>En sık hatan: {ERROR_LABELS[sum.top].label}.</b> {ERROR_LABELS[sum.top].hint}</p><div className="panel-actions"><button type="button" className="primary" onClick={()=>onGo(goal)}>Bu hata için çalış</button></div></>}
   </section>}
  {log.entries.length>0&&<section className="panel"><div className="list-head"><h2>Son hatalar</h2>{!confirmClear&&<button type="button" className="text-button" onClick={()=>setConfirmClear(true)}>Defteri temizle</button>}</div>
    {confirmClear&&<div className="panel-actions">
     <p>Bu cihazdaki {log.entries.length} hata kaydı silinecek.</p>
     <button type="button" className="secondary" disabled={clearing} onClick={()=>void clear()}>Kayıtları sil</button>
     <button type="button" className="text-button" disabled={clearing} onClick={()=>{setConfirmClear(false);setClearFailed(false);}}>Vazgeç</button>
    </div>}
    {clearFailed&&<p className="notice" role="status">Defter temizlenemedi. Kayıtların korunuyor.</p>}
    <ul className="word-rows error-list">{log.entries.slice(0,20).map((e,i)=><li key={e.at+':'+i}><span><b lang="de">{e.word&&e.expected&&e.word!==e.expected?`${e.word} → ${e.expected}`:e.expected||e.word}</b><small className="muted"> · {ERROR_LABELS[e.type].label}</small></span><span lang="de" className="muted">{e.given?'yazdığın: '+e.given:''}</span></li>)}</ul>
   </section>}
 </div>;
}
