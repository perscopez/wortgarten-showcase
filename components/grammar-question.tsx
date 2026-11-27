'use client';
import {useEffect,useState} from 'react';
import {GRAMMAR_CASES,grammarSource,type GrammarExercise} from '../lib/grammar-practice';
import type {GovernedCase} from '../lib/rection';
type Props={exercise:GrammarExercise;caseAnswer:GovernedCase|null;formAnswer:string|null;onCase:(answer:GovernedCase)=>void;onForm:(answer:string)=>void;onNext:()=>void};
export default function GrammarQuestion({exercise:e,caseAnswer,formAnswer,onCase,onForm,onNext}:Props){
 const [showHint,setShowHint]=useState(false);
 useEffect(()=>{if(caseAnswer===null&&formAnswer===null)setShowHint(false);},[e.id,caseAnswer,formAnswer]);
 const finished=caseAnswer!==null&&formAnswer!==null;const right=caseAnswer===e.case&&formAnswer===e.answer;const source=grammarSource(e);
 return <section className={'grammar-question article-question '+(finished?'answered':'neutral-question')} aria-label="İki adımlı hâl sorusu">
 <div className="eyebrow">{finished?'ÖNCE HÂL, SONRA BİÇİM':caseAnswer===null?'1 / 2 · HANGİ HÂL?':'2 / 2 · HANGİ BİÇİM?'}</div>
 <h2 className="grammar-sentence">{e.before}{finished?<mark className={'case-'+e.case.toLowerCase()}>{e.answer}</mark>:<span aria-label="boşluk">_____</span>}{e.after}</h2>
 <p>{e.translation}</p><p className="micro">Boşluğa gelecek kişi / isim: <b>{e.focus}</b></p>
 {!finished&&<div className="grammar-hint-box"><button type="button" className="text-button" onClick={()=>setShowHint(x=>!x)}>{showHint?'İpucunu gizle':'İpucu göster'}</button>{showHint&&<p className="micro">{e.hint}</p>}</div>}
 {!finished&&caseAnswer===null?<div className="article-options">{GRAMMAR_CASES.map(c=><button key={c} onClick={()=>onCase(c)}>{c}</button>)}</div>:!finished?<><p className="micro">Hâl seçimin kaydedildi. Şimdi biçimi seç; sonuç ikisinden sonra açılacak.</p><div className="article-options">{e.options.map(o=><button key={o} onClick={()=>onForm(o)}>{o}</button>)}</div></>:<div className="article-feedback" aria-live="polite"><p className={'result '+(right?'right':'wrong')}>{right?'İki adım da doğru.':'Birlikte düzeltelim.'}</p><p><b>Hâl:</b> {caseAnswer} {caseAnswer===e.case?'✓':`→ ${e.case}`}<br/><b>Biçim:</b> {formAnswer} {formAnswer===e.answer?'✓':`→ ${e.answer}`}</p><p className="hint">{e.reason}</p>{e.steps?.length>0&&<div className="grammar-steps"><b>Adım adım nasıl ulaşıldı?</b><ol>{e.steps.map(s=><li key={s}>{s.replace(/^\d+\.\s*/,'')}</li>)}</ol></div>}<p><b>Kalıp:</b> {source.pattern}</p><p className="micro">{source.explanation}</p><p className="micro">{source.sources.map((s,i)=><span key={s.url}>{i>0?' · ':''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>{!right&&<p className="retry-message">Bu soru, varsa iki başka sorudan sonra tekrar gelecek.</p>}<button className="primary" onClick={onNext}>Sonraki soru →</button></div>}
 </section>;
}
