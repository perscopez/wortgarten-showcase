'use client';
import {useCallback,useEffect,useState} from 'react';
import type {Feedback} from '../lib/siwc';
import {AI_KEY_STORAGE,AiDirectError,DIRECT_ERRORS,checkWithKey,listModels,parseSettings,validKey,type AiKeySettings} from '../lib/ai-direct';

type Status={configured:boolean;signedIn:boolean};
const VERDICT={dogru:['good','Doğru görünüyor'],'kucuk-hata':['near','Küçük bir hata var'],hata:['miss','Düzeltilmesi gereken hata var']} as const;
const readSettings=()=>{try{return parseSettings(localStorage.getItem(AI_KEY_STORAGE));}catch{return null;}};
const mask=(k:string)=>k.slice(0,3)+'…'+k.slice(-4);

/**
 * Optional AI check of the learner's own sentence. Two ways in: ChatGPT sign-in (when the site has it configured)
 * or the learner's own OpenAI API key, which stays in this browser and is used straight from it.
 */
export default function AiSentenceCheck({sentence,phrase,tr}:{sentence:string;phrase:string;tr:string}){
 const [status,setStatus]=useState<Status>({configured:false,signedIn:false});
 const [settings,setSettings]=useState<AiKeySettings|null>(null);
 const [keyInput,setKeyInput]=useState('');
 const [models,setModels]=useState<string[]>([]);
 const [model,setModel]=useState('');
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<Feedback|null>(null);
 const [message,setMessage]=useState('');
 const refresh=useCallback(()=>{fetch('/api/ai/status',{cache:'no-store'}).then(r=>r.json()).then(setStatus).catch(()=>setStatus({configured:false,signedIn:false}));},[]);
 useEffect(()=>{setSettings(readSettings());refresh();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[refresh]);
 const save=(s:AiKeySettings|null)=>{setSettings(s);try{if(s)localStorage.setItem(AI_KEY_STORAGE,JSON.stringify(s));else localStorage.removeItem(AI_KEY_STORAGE);}catch{/* private mode */}};

 async function connect(){
  setBusy(true);setMessage('');
  try{
   const list=await listModels(keyInput);
   if(!list.length){setMessage('Bu anahtarla kullanılabilir bir model bulunamadı.');return;}
   const def=list.find(m=>/^(gpt-4\.1-mini|gpt-4o-mini|gpt-5-mini)$/.test(m))||list.find(m=>/mini/.test(m))||list[0];
   setModels(list);setModel(m=>m&&list.includes(m)?m:def);
  }catch(e){setMessage(DIRECT_ERRORS[e instanceof AiDirectError?e.code:'network']||'Anahtar doğrulanamadı.');}
  finally{setBusy(false);}
 }
 async function check(){
  setBusy(true);setMessage('');setResult(null);
  try{
   if(status.signedIn){
    const res=await fetch('/api/ai/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sentence,phrase,tr})});
    const data=await res.json().catch(()=>null);
    if(res.ok&&data?.feedback&&Object.hasOwn(VERDICT,data.feedback.verdict))setResult(data.feedback);
    else{setMessage(data?.message||'Yapay zekâ kontrolü yapılamadı.');if(data?.error==='signed_out')setStatus(s=>({...s,signedIn:false}));}
   }else if(settings){
    setResult(await checkWithKey(settings,sentence,phrase,tr));
   }
  }catch(e){setMessage(DIRECT_ERRORS[e instanceof AiDirectError?e.code:'network']||'Yapay zekâ kontrolü yapılamadı.');}
  finally{setBusy(false);}
 }
 async function signOut(){await fetch('/api/ai/logout',{method:'POST'}).catch(()=>{});setResult(null);refresh();}
 const ready=status.signedIn||!!settings;

 return <details className="ai-check" aria-label="Yapay zekâ kontrolü" open={ready}>
  <summary>Yapay zekâ ile kontrol</summary>
  <div className="ai-body">
   {ready&&<div className="panel-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>void check()}>{busy?'Kontrol ediliyor…':'Cümlemi kontrol et'}</button></div>}
   {message&&<p className="exercise-feedback near" role="status">{message}</p>}
   {result&&<div className={'exercise-feedback '+VERDICT[result.verdict][0]} role="status"><b>{VERDICT[result.verdict][1]}</b>
    {result.verdict!=='dogru'&&<p lang="de" className="ai-corrected">{result.corrected}</p>}
    {result.notes.length>0&&<ul>{result.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>}
    <p className="micro">Yapay zekâ yanılabilir; şüphen varsa kuralı tablolardan kontrol et.</p></div>}
   {status.configured&&(status.signedIn
    ?<p className="muted">ChatGPT ile bağlısın. <button type="button" className="text-button" onClick={()=>void signOut()}>Oturumu kapat</button></p>
    :<p className="muted"><a href="/api/ai/login" target="_blank" rel="noopener">ChatGPT ile giriş yap</a> (kullanım ChatGPT planından sayılır)</p>)}
   {settings?<div className="ai-key">
    <p className="muted">OpenAI API anahtarı kayıtlı (<code>{mask(settings.key)}</code>) · model: <code>{settings.model}</code></p>
    <button type="button" className="text-button" onClick={()=>{save(null);setModels([]);setKeyInput('');setResult(null);}}>Anahtarı sil</button>
   </div>:<div className="ai-key">
    <label>OpenAI API anahtarın
     <input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={keyInput} placeholder="sk-…" onChange={e=>{setKeyInput(e.target.value);setModels([]);}}/>
    </label>
    {models.length===0?<button type="button" className="secondary" disabled={busy||!validKey(keyInput)} onClick={()=>void connect()}>{busy?'Bakılıyor…':'Anahtarı doğrula'}</button>
     :<><label>Model<select value={model} onChange={e=>setModel(e.target.value)}>{models.map(m=><option key={m}>{m}</option>)}</select></label>
      <button type="button" className="primary" disabled={!model} onClick={()=>{save({key:keyInput.trim(),model});setKeyInput('');setModels([]);}}>Kaydet</button></>}
    <p className="micro">Anahtar yalnızca bu tarayıcıda saklanır, bu sitenin sunucusuna gönderilmez. Cümlen ve kalıbın doğrudan OpenAI’ye gider; ücret API hesabından düşer. Paylaşılan bir cihazda kullanma.</p>
   </div>}
  </div>
 </details>;
}
