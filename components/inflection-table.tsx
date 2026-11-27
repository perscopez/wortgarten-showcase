import type { Inflections } from '@/lib/inflections';

/** Pure rendering: saved cards remain readable offline, with no live calls. */
export function InflectionTable({ data, lang='de' }: { data?: Inflections | null; lang?: 'de'|'tr' }) {
  const pick=(de:string,tr:string)=>lang==='tr'?tr:de;
  if (!data) return null;
  return <section className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4" aria-label={pick('Formentabellen','Kelime çekim tabloları')}>
    <div><h3 className="font-semibold">{pick('Formen','Çekimler')} · {data.lemma}</h3><p className="mt-1 text-xs text-stone-500">{data.edited?pick('Einige Felder dieser Karte wurden von Hand geändert; vergleiche mit der Quelle.','Bu kartın bazı hücreleri elle düzenlendi; kaynakla karşılaştır.'):pick('Nur Formen, die in der Quelle belegt sind. Fehlende Felder werden nicht geraten.','Yalnız kaynakta doğrulanan biçimler. Bulunamayan alanlar tahmin edilmez.')}</p></div>
    {data.tables.map((table, index) => <details key={index} className="space-y-2" open={!/ek biçimler|weitere Formen/.test(table.title)}>
      <summary className="cursor-pointer text-sm font-semibold">{table.title}</summary>
      <div className="word-table-scroll overflow-x-auto rounded-lg border border-stone-200" role="region" aria-label={table.title+pick(' · seitlich scrollbar',' tablosu, yana kaydırılabilir')} tabIndex={0}><table className="w-full min-w-[300px] text-left text-sm">
        <thead className="bg-stone-100"><tr><th scope="col" className="px-3 py-2">{pick('Fall / Person','Hâl / kişi')}</th>{table.columns.map(c => <th key={c} scope="col" className="px-3 py-2">{c}</th>)}</tr></thead>
        <tbody>{table.rows.map(row => <tr key={row.label} className="border-t border-stone-200"><th scope="row" className="px-3 py-2 font-medium">{row.label}</th>{row.cells.map((cell,i) => <td key={i} className="px-3 py-2">{cell.length ? cell.join(' / ') : <span className="text-xs italic text-stone-500">{pick('nicht belegt','bulunamadı')}</span>}</td>)}</tr>)}</tbody>
      </table></div>
    </details>)}
    {lang==='tr'&&data.warnings.length > 0 && <ul className="space-y-1 text-xs text-amber-800">{data.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul>}
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">{data.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline">{s.label}</a>)}<a href={data.license.url} target="_blank" rel="noreferrer" className="underline">{data.license.label}</a></div>
  </section>;
}
