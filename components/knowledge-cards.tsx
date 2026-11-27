'use client';

import { useMemo, useState } from 'react';
import { buildKnowledgeDeck, balancedKnowledgeOrder, filterKnowledgeDeck, createKnowledgeSession, currentKnowledgeCard, revealKnowledgeAnswer, assessKnowledgeCard, skipKnowledgeCard, deferKnowledgeCard, finishKnowledgeSession, type KnowledgeCard, type KnowledgeCategory, type KnowledgeLength, type KnowledgeSession } from '../lib/knowledge-cards';

export function KnowledgeFace({card}:{card:KnowledgeCard}){
  return <section className="knowledge-card" aria-label="Kartın ön yüzü">
    <p>{card.category}</p><h2>{card.title}</h2><p>{card.prompt}</p>
  </section>;
}

function Answer({card,onSpeak}:{card:KnowledgeCard;onSpeak?:(text:string)=>void}){
  if(card.kind==='table')return <section className="knowledge-card" aria-label="Tablo yanıtı">
    <p>{card.table.level} · {card.table.category}</p><h2>{card.table.title}</h2><p>{card.table.summary}</p>
    <div className="table-scroll" role="region" aria-label={`${card.table.title} tablosu`} tabIndex={0}>
      <table><thead><tr><th scope="col">Hâl / konu</th>{card.table.columns.map((column,i)=><th key={`${i}-${column}`} scope="col">{column}</th>)}</tr></thead><tbody>
        {card.table.rows.map((row,i)=><tr key={`${i}-${row.label}`}><th scope="row">{row.label}</th>{row.cells.map((cell,j)=><td key={`${j}-${cell}`}>{cell}</td>)}</tr>)}
      </tbody></table>
    </div>
    {card.table.notes.map((note,i)=><p key={i}>{note}</p>)}<Sources sources={card.table.sources}/>

  </section>;
  if(card.kind==='rule')return <section className="knowledge-card" aria-label="Kural yanıtı">
    <p>{card.rule.level} · {card.rule.topic}</p><h2>{card.rule.title}</h2><p>{card.rule.shortTR}</p>
    {card.rule.examples.map(example=><p key={example.id}><strong>{example.de}</strong> — {example.tr} <small>{example.context}</small></p>)}
    {card.rule.counterexamples.map((example,i)=><p key={i}><strong>Karşı örnek:</strong> {example.de}<br/><strong>Düzeltme:</strong> {example.correction}<br/>{example.why}</p>)}
    {card.rule.limitations.map((text,i)=><p key={i}>{text}</p>)}<Sources sources={card.rule.sources}/>
    {onSpeak&&<button type="button" onClick={()=>onSpeak(card.rule.examples.map(e=>e.de.trim().replace(/\.+$/,'')).join('. '))}>Kuralı dinle</button>}
  </section>;
  const german=card.pattern.example.parts.map(part=>part.text).join('');
  const cases=card.pattern.complements.map(c=>`${c.preposition?`${c.preposition} + `:''}${c.case} (${c.role}${c.requirement==='optional'?'; isteğe bağlı':''})`).join(' · ');
  return <section className="knowledge-card" aria-label="Rektion yanıtı">
    <p>Rektion · seçilmiş kullanım</p><h2>{card.lemma}</h2><p><strong>{card.pattern.pattern}</strong></p><p>{cases}</p><p>{card.pattern.explanation}</p>
    <p><strong>{german}</strong><br/>{card.pattern.example.translation}</p>
    {card.notes.map((note,i)=><p key={i}>{note}</p>)}<Sources sources={card.pattern.sources}/>
    {onSpeak&&<button type="button" onClick={()=>onSpeak(german)}>Örneği dinle</button>}
  </section>;
}
function Sources({sources}:{sources:{label:string;url:string}[]}){return <p><strong>Kaynaklar:</strong> {sources.map((source,i)=><span key={`${source.url}-${i}`}>{i>0?' · ':''}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>;}

export default function KnowledgeCards({onBack,onSpeak}:{onBack:()=>void;onSpeak?:(text:string)=>void}){
  const deck=useMemo(()=>buildKnowledgeDeck(),[]);
  const [category,setCategory]=useState<KnowledgeCategory>('Tümü');const [query,setQuery]=useState('');const [length,setLength]=useState<KnowledgeLength>(20);
  const [session,setSession]=useState<KnowledgeSession|null>(null);
  const filtered=useMemo(()=>filterKnowledgeDeck(deck,category,query),[deck,category,query]);
  const start=()=>setSession(createKnowledgeSession(balancedKnowledgeOrder(filtered),length));
  const card=session?currentKnowledgeCard(session):null;
  const move=(next:KnowledgeSession)=>setSession(next);
  return <section className="knowledge-cards">
    <p className="micro">Serbest bilgi pratiği: sonuçlar bu oturuma aittir; kelime tekrar takvimini değiştirmez.</p><header><button type="button" onClick={onBack}>← Geri</button><h1>Bilgi kartları</h1><p>Tabloları, kuralları ve fiil kalıplarını hatırlamaya çalış; yanıtı açınca tam kaynağı gör.</p></header>
    {!session&&<section className="knowledge-controls" aria-label="Oturum ayarları">
      <label>Kategori <select value={category} onChange={e=>setCategory(e.target.value as KnowledgeCategory)}>{(['Tümü','Tablolar','Kurallar','Rektion'] as const).map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Ara <input value={query} onChange={e=>setQuery(e.target.value)} type="search" placeholder="Konu veya fiil"/></label>
      <label>Oturum uzunluğu <select value={length} onChange={e=>setLength(e.target.value==='all'?'all':Number(e.target.value) as 10|20)}><option value="10">10 kart</option><option value="20">20 kart</option><option value="all">Tüm eşleşmeler ({filtered.length})</option></select></label>
      <p>{filtered.length} bilgi kartı</p><button type="button" onClick={start} disabled={!filtered.length}>Oturumu başlat</button>
    </section>}
    {session&&card&&<section>
      <p>Kart {Math.min(session.index+1,session.queue.length)} / {session.queue.length} · Benzersiz yanıt: {session.answeredIds.length} · Deneme: {session.attempts}</p>
      <KnowledgeFace card={card}/>
      {!session.revealed?<div className="knowledge-controls"><button type="button" onClick={()=>move(revealKnowledgeAnswer(session))}>Yanıtı göster</button><button type="button" onClick={()=>move(skipKnowledgeCard(session))}>Atla</button><button type="button" disabled={session.index>=session.queue.length-1} onClick={()=>move(deferKnowledgeCard(session))}>Sonraya bırak</button><button type="button" onClick={()=>move(finishKnowledgeSession(session))}>Oturumu bitir</button></div>:<>
        <Answer card={card} onSpeak={onSpeak}/><div className="knowledge-controls"><button type="button" onClick={()=>move(assessKnowledgeCard(session,false))}>Bilemedim</button><button type="button" onClick={()=>move(assessKnowledgeCard(session,true))}>Bildim</button><button type="button" onClick={()=>move(skipKnowledgeCard(session))}>Değerlendirmeden geç</button></div>
      </>}
    </section>}
    {session&&!card&&<section className="knowledge-card" aria-live="polite"><h2>Oturum tamamlandı</h2><p>{session.answeredIds.length} benzersiz kart yanıtlandı · {session.attempts} değerlendirme · {session.knownIds.length} bildim · {session.missedIds.length} bilemedim · {session.skipped} atlandı.</p><p>Bu yalnızca bu oturumun özeti; kalıcı aralıklı tekrar veya SRS kaydı oluşturulmadı.</p><button type="button" onClick={()=>setSession(null)}>Yeni oturum</button></section>}
  </section>;
}
