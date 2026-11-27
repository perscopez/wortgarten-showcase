'use client';
import {useState} from 'react';
import {GRAMMAR_REFERENCE,REFERENCE_CATEGORIES,REFERENCE_LEVELS,REFERENCE_ATTRIBUTION,REFERENCE_CHECKED,searchGrammarReference,type ReferenceCategory,type ReferenceLevel,type GrammarReferenceTable} from '../lib/grammar-reference';

/** One reference table: title, summary, scrollable table with a sticky first column, notes and sources. */
export function GrammarReferenceDetail({table:t,expand=false}:{table:GrammarReferenceTable;expand?:boolean}){
 return <details className="ref-table" open={expand}>
  <summary><span className="ref-title">{t.title}</span><span className="ref-meta"><span className={'ref-level ref-level-'+(t.level==='A1–A2'?'a':t.level==='B1'?'b':'c')}>{t.level}</span>{t.category}</span></summary>
  <div className="ref-body">
   <p className="ref-summary">{t.summary}</p>
   <div className="ref-scroll" role="region" aria-label={t.title+' · yatay kaydırılabilir tablo'} tabIndex={0}>
    <table>
     <caption className="sr-only">{t.title}</caption>
     <thead><tr><th scope="col"/>{t.columns.map(c=><th key={c} scope="col">{c}</th>)}</tr></thead>
     <tbody>{t.rows.map(r=><tr key={r.label}><th scope="row">{r.label}</th>{r.cells.map((cell,i)=><td key={i}>{cell}</td>)}</tr>)}</tbody>
    </table>
   </div>
   <ul className="ref-notes">{t.notes.map(note=><li key={note}>{note}</li>)}</ul>
   <p className="ref-sources">Kaynaklar: {t.sources.map((s,i)=><span key={s.url}>{i>0?' · ':''}<a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></span>)}</p>
  </div>
 </details>;
}
export default function GrammarReference({onBack}:{onBack:()=>void}){
 void onBack;
 const [query,setQuery]=useState('');const [category,setCategory]=useState<ReferenceCategory|'Tümü'>('Tümü');const [level,setLevel]=useState<ReferenceLevel|'Tümü'>('Tümü');
 const results=searchGrammarReference(query,category,level);
 const filtered=!!query.trim()||category!=='Tümü'||level!=='Tümü';
 return <div className="grammar-reference">
  <div className="heading-row"><div><h1>Tablolar</h1><p className="lead">{GRAMMAR_REFERENCE.length} kısa dil bilgisi tablosu: hâller, zamirler, fiiller, edatlar, sayılar, zaman.</p></div></div>
  <section className="ref-filters" aria-label="Tablo arama ve filtreleme">
   <div className="search-box"><input id="grammar-reference-search" type="search" aria-label="Tablolarda ara" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ara: einem, Genitiv, mir, sıfat, Perfekt…"/></div>
   <div className="library-filters" role="group" aria-label="Kategori">
    {(['Tümü',...REFERENCE_CATEGORIES] as const).map(c=><button key={c} type="button" className={'filter-chip'+(category===c?' active':'')} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}
   </div>
   <div className="library-filters" role="group" aria-label="Çalışma katmanı">
    {(['Tümü',...REFERENCE_LEVELS] as const).map(l=><button key={l} type="button" className={'filter-chip'+(level===l?' active':'')} aria-pressed={level===l} onClick={()=>setLevel(l)}>{l==='Tümü'?'Tüm seviyeler':l}</button>)}
   </div>
   <p className="muted" role="status" aria-live="polite">{results.length} tablo{filtered&&<> · <button type="button" className="text-button" onClick={()=>{setQuery('');setCategory('Tümü');setLevel('Tümü');}}>Filtreleri temizle</button></>}</p>
  </section>
  <div className="ref-list">{results.length?results.map(t=><GrammarReferenceDetail key={t.id} table={t} expand={!!query.trim()||t.id==='cases'}/>):<p className="notice">Eşleşen tablo yok. Daha kısa bir sözcük dene veya filtreleri temizle.</p>}</div>
  <details className="ref-about"><summary>Kapsam ve kaynaklar</summary>
   <p>Bu, bütün Almanca dil bilgisinin eksiksiz kitabı değildir: seçilmiş A1–B1 çekimleri ve birkaç ileri ayrıntı. İstisnaları ve fiile özel kullanımları gerektiğinde kaynaklardan kontrol et. Katmanlar önerilen çalışma sırasıdır, resmî sınav müfredatı değildir.</p>
   <p>Tablolar uygulamaya gömülüdür; yüklendikten sonra internet istemez. Dış kaynak bağlantıları internet gerektirir. Kaynak kontrol tarihi: {REFERENCE_CHECKED}. {REFERENCE_ATTRIBUTION}</p>
  </details>
 </div>;
}
