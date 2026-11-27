'use client';
import {useMemo,useRef,useState} from 'react';
import SpeakButton from './speak-button';
import Reading from './reading';
import {TYPE_LABEL,buildFormItems,checkFormAnswer,usableGroups,type FormItem,type FormMode} from '../lib/form-finder';
import {recordError} from '../lib/error-log';
import type {InflectionPracticeCard} from '../lib/inflection-practice';

const MODES:[FormMode,string,string][]=[
 ['mix','Karışık','yaz, tanı, geri bul: hepsi'],
 ['write','Yazarak','biçimi kendin üret'],
 ['recognize','Tanıyarak','biçimden hücreyi ya da sözlük biçimini bul'],
];
const today=()=>new Date().toISOString().slice(0,10);

function TableView({item}:{item:FormItem}){
 const hit=new Set(item.table.hit.map(([r,c])=>r+':'+c));
 return <div className="ff-scroll"><table className="ff-table"><thead><tr><th/>{item.table.columns.map(c=><th key={c}>{c==='Kaynakta verilen'?'':c}</th>)}</tr></thead>
  <tbody>{item.table.rows.map((row,ri)=><tr key={row.label}><th>{row.label}</th>{row.cells.map((cell,ci)=><td key={ci} className={hit.has(ri+':'+ci)?'hit':''} lang="de">{cell.join(' / ')||'–'}</td>)}</tr>)}</tbody></table></div>;
}

/** Form finding: type another form, recognise which cell a form is, or find the base form, from the learner's own inflection tables. */
export default function FormFinder({cards,onGo}:{cards:InflectionPracticeCard[];onGo:(page:string)=>void}){
 const [mode,setMode]=useState<FormMode>('mix');
 const [advanced,setAdvanced]=useState(false);
 const [items,setItems]=useState<FormItem[]>([]);
 const [index,setIndex]=useState(0);
 const [round,setRound]=useState(0);
 const [text,setText]=useState('');
 const [picked,setPicked]=useState<number|null>(null);
 const [verdict,setVerdict]=useState<'correct'|'close'|'wrong'|null>(null);
 const [right,setRight]=useState(0);
 const [phase,setPhase]=useState<'setup'|'run'|'done'>('setup');
 const input=useRef<HTMLInputElement>(null);
 const usable=useMemo(()=>usableGroups(cards,advanced),[cards,advanced]);
 const item=items[index];

 function start(){
  const built=buildFormItems(cards,{mode,advanced,seed:today()+':'+round,size:10});
  if(!built.length)return;
  setItems(built);setIndex(0);setRight(0);setText('');setPicked(null);setVerdict(null);setRound(r=>r+1);setPhase('run');
 }
 function finish(v:'correct'|'close'|'wrong',shown:string){
  setVerdict(v);
  if(v==='correct')setRight(n=>n+1);
  else recordError({type:'cekim',word:item.word,expected:item.answers[0],given:shown});
 }
 function check(e:React.FormEvent){e.preventDefault();if(verdict||!text.trim())return;finish(checkFormAnswer(item,text),text.trim());}
 function choose(i:number){if(verdict||!item.choices)return;setPicked(i);finish(item.choices[i].correct?'correct':'wrong',item.choices[i].label);}
 function next(){
  if(index+1>=items.length){setPhase('done');return;}
  setIndex(index+1);setText('');setPicked(null);setVerdict(null);
  setTimeout(()=>input.current?.focus(),50);
 }

 if(phase==='run'&&item){
  const done=verdict!==null,good=verdict==='correct';
  return <section className="daily-words form-finder" aria-label="Biçim bul">
   <div className="focus-bar"><button type="button" className="focus-pause" onClick={()=>setPhase('setup')} aria-label="Çık">✕</button>
    <div className="focus-progress" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={index}><span style={{width:(index+(done?1:0))/items.length*100+'%'}}/></div>
    <span className="focus-time">{index+1}/{items.length}</span></div>
   <article className="exercise exercise-form">
    <p className="eyebrow">{TYPE_LABEL[item.type]}</p>
    {item.type==='produce'&&<><h2 className="exercise-prompt" lang="de">{item.word}</h2><p className="ff-ask">{item.target}</p></>}
    {item.type==='transform'&&item.given&&<><p className="ff-given"><span lang="de">{item.given.form}</span><small>{item.given.cell}</small></p><p className="ff-ask">→ {item.target}</p></>}
    {(item.type==='identify'||item.type==='lemma')&&item.given&&<><h2 className="exercise-prompt" lang="de">{item.given.form}</h2><p className="ff-ask">{item.target}</p></>}
    {item.type==='identify'&&item.choices?<div className="exercise-choices" role="group" aria-label="Seçenekler">
     {item.choices.map((c,i)=><button key={c.label} type="button" disabled={done} className={'choice'+(done&&c.correct?' is-right':'')+(picked===i&&!c.correct?' is-wrong':'')} onClick={()=>choose(i)}>{c.label}</button>)}
    </div>:!done&&<form className="exercise-typed" onSubmit={check}>
     <input ref={input} autoFocus lang="de" value={text} maxLength={60} autoCapitalize="none" autoComplete="off" autoCorrect="off" spellCheck={false} aria-label="Biçim" placeholder="yaz…" onChange={e=>setText(e.target.value)}/>
     <div className="daily-umlauts" aria-label="Özel harfler">{['ä','ö','ü','ß'].map(ch=><button type="button" key={ch} className="secondary" onClick={()=>{setText(t=>t+ch);input.current?.focus();}}>{ch}</button>)}</div>
     <div className="exercise-actions"><button className="primary">Kontrol et <kbd>Enter</kbd></button><button type="button" className="text-button" onClick={()=>finish('wrong','')}>Bilmiyorum</button></div>
    </form>}
    {done&&<>
     <p className={'exercise-feedback '+(good?'good':verdict==='close'?'near':'miss')} role="status">{good?'✓ Doğru':verdict==='close'?'Neredeyse: ä ö ü ß ile yaz.':'Doğrusu:'} <b lang={item.type==='identify'?undefined:'de'}>{item.answers.join(' / ')}</b> <SpeakButton de={(item.type==='identify'?item.given?.form:item.answers[0])||''} label="Dinle"/></p>
     <Reading text={(item.type==='identify'?item.given?.form:item.answers[0])||''}/>
     <TableView item={item}/>
     <div className="exercise-actions"><button type="button" className="primary" onClick={next} autoFocus>{index+1>=items.length?'Bitir':'Devam'}</button></div>
    </>}
   </article>
  </section>;
 }

 if(phase==='done')return <section className="form-finder"><header className="page-head"><h1>Tur tamam</h1></header>
  <div className="panel"><dl className="tiles"><div><dt>Doğru</dt><dd>{right}<small> / {items.length}</small></dd></div></dl>
   {right<items.length&&<p className="muted">Yanlışların Hata defterine “Çekim biçimi” olarak yazıldı.</p>}
   <div className="panel-actions"><button type="button" className="primary" onClick={start}>Bir tur daha</button><button type="button" className="secondary" onClick={()=>setPhase('setup')}>Ayarlar</button></div></div></section>;

 return <section className="form-finder"><header className="page-head"><h1>Biçim bul</h1><p className="page-sub">Fiil ve isim çekimlerini üret, tanı, sözlük biçimine geri dön</p></header>
  {usable.length===0?<div className="panel"><p>Çekim tablosu olan kelime bulunamadı. Yeni eklediğin kelimelerin tabloları otomatik gelir; eskiler için Kelimelerim → Araçlar içinden bilgileri tamamla.</p><div className="panel-actions"><button type="button" className="secondary" onClick={()=>onGo('library')}>Kelimelerim’e git</button></div></div>:<>
   <div className="modes">{MODES.map(([k,t,d])=><button key={k} type="button" className={'mode'+(mode===k?' primary-mode':'')} aria-pressed={mode===k} onClick={()=>setMode(k)}><b>{t}</b><span>{d}</span></button>)}</div>
   <label className="ff-adv"><input type="checkbox" checked={advanced} onChange={e=>setAdvanced(e.target.checked)}/> Genitiv, Imperativ ve Konjunktiv de olsun</label>
   <p className="muted">{usable.length} çekim tablosu hazır · kendi kelimelerinden</p>
   <div className="panel-actions"><button type="button" className="primary start-button" onClick={start}>Başla</button></div></>}
 </section>;
}
