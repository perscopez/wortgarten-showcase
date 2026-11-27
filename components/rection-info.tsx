import type { RectionData } from '@/lib/rection';
const caseStyle = {Dativ:'bg-sky-100 text-sky-900',Akkusativ:'bg-amber-100 text-amber-950',Genitiv:'bg-violet-100 text-violet-900'};
/** Offline rendering of the same curated information saved with each card. Turkish notes are shown only on Turkish cards. */
export function RectionInfo({ data, lang='de' }: { data?: RectionData | null; lang?: 'de'|'tr' }) {
  const tr=lang==='tr',pick=(de:string,trText:string)=>tr?trText:de;
  if (!data) return null;
  return <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4" aria-label={pick('Ergänzungen, Fälle und Wendungen','Tamlayıcı hâlleri ve kullanım kalıpları')}>
    <div><h3 className="font-semibold">{pick('Welche Ergänzung, welcher Fall?','Hangi tamlayıcı, hangi hâl?')}</h3>{tr&&<p className="mt-1 text-xs text-stone-500">{data.summary}</p>}</div>
    {data.patterns.map((pattern,i) => <article key={i} className="space-y-2 rounded-xl bg-stone-50 p-3">
      <h4 className="text-sm font-semibold">{pattern.pattern}</h4>
      {tr&&<p className="text-xs text-stone-600">{pattern.explanation}</p>}
      <ul className="space-y-1 text-xs">{pattern.complements.map((c,j)=><li key={j}><span className={`rounded px-1.5 py-0.5 ${caseStyle[c.case]}`}>{c.case}</span>{!c.preposition&&<span> ({c.case==='Dativ'?'Wem?':c.case==='Akkusativ'?'Wen? / Was?':'Wessen?'})</span>}{tr&&<> · {c.role}</>}{c.preposition ? ` · ${c.preposition}` : ''} · {c.requirement === 'optional' ? pick('Ergänzung optional','tamlayıcı isteğe bağlı') : pick('Fall der Ergänzung in dieser Verwendung','bu kullanımda tamlayıcının hâli')}</li>)}</ul>
      <p className="text-sm leading-7" lang="de">{pattern.example.parts.map((part,j)=>part.case ? <mark key={j} className={`rounded px-1 ${caseStyle[part.case]}`} title={part.case}>{part.text}<span className="sr-only"> ({part.case})</span></mark> : <span key={j}>{part.text}</span>)}</p>
      {tr&&<p className="text-xs text-stone-500">{pattern.example.translation}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-stone-500">{pattern.sources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="underline">{source.label}</a>)}</div>
    </article>)}
    {tr&&data.notes.length > 0 && <ul className="space-y-1 text-xs text-stone-500">{data.notes.map((note,i)=><li key={i}>{note}</li>)}</ul>}
  </section>;
}
