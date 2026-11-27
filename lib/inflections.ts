/** Source-backed German forms. Never completes a paradigm by guessing endings. */
export type InflectionCell = string[];
export type InflectionTableData = {
  title: string;
  columns: string[];
  rows: { label: string; cells: InflectionCell[] }[];
};
export type Inflections = {
  version: 1;
  edited?: boolean;
  lemma: string;
  tables: InflectionTableData[];
  sources: { label: string; url: string }[];
  license: { label: string; url: string };
  warnings: string[];
};
const cases = ['Nominativ', 'Akkusativ', 'Dativ', 'Genitiv'];
const persons = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie'];
const license = { label: 'Wiktionary · CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' };
export const wiktionaryUrl = (lemma: string) => `https://de.wiktionary.org/wiki/${encodeURIComponent(lemma.replace(/ /g, '_'))}`;
function text(value: string): string {
  return value.replace(/<!--[^]*?-->/g, '').replace(/<ref\b[^>]*>[^]*?<\/ref>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, ' / ').replace(/<[^>]*>/g, '')
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, '$1').replace(/'{2,}/g, '')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}
function clean(value: string): string | null {
  const out = text(value);
  return !out || /\{\{|\}\}|^[-—–?]+$/.test(out) ? null : out;
}
/** Keep language boundaries: e.g. English 'Gift' must not leak into German Gift. */
function germanSection(wiki: string): string {
  const sections = wiki.split(/(?=^==[^=].*?==\s*$)/m);
  const german = sections.filter(s => /^==[^\n]*\{\{Sprache\|Deutsch\}\}/.test(s));
  return german.join('\n');
}
function templates(wiki: string, name: string): string[] {
  const out: string[] = []; let at = 0;
  while ((at = wiki.indexOf(`{{${name}`, at)) !== -1) {
    const start = at; let depth = 0, end = at;
    for (; end < wiki.length - 1; end++) {
      const pair = wiki.slice(end, end + 2);
      if (pair === '{{') { depth++; end++; }
      else if (pair === '}}') { depth--; end++; if (depth === 0) { end++; break; } }
    }
    if (depth === 0) out.push(wiki.slice(start, end));
    at = Math.max(start + 2, end);
  }
  return out;
}
function fields(template: string): Map<string, string> {
  const out = new Map<string, string>();
  // Named top-level fields begin on their own line in the supported overview templates.
  for (const match of template.matchAll(/^\|([^=\n]+)=([^]*?)(?=\n\||\n\}\}|$)/gm)) out.set(match[1].trim(), match[2].trim());
  return out;
}
function values(fields: Map<string, string>, key: string): string[] {
  return [...new Set([...fields].filter(([k]) => k === key || k.startsWith(key + '*') || new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\d+$`).test(k))
    .map(([, v]) => clean(v)).filter((v): v is string => v !== null))];
}
const articles: Record<string, string[]> = { m: ['der', 'den', 'dem', 'des'], f: ['die', 'die', 'der', 'der'], n: ['das', 'das', 'dem', 'des'] };
export function parseInflections(wiki: string, lemma = ''): Inflections {
  const german = germanSection(wiki);
  const result: Inflections = { version: 1, lemma, tables: [], sources: [{label: 'Wiktionary: ' + lemma, url: wiktionaryUrl(lemma)}], license, warnings: [] };
  for (const [index, template] of templates(german, 'Deutsch Substantiv Übersicht').entries()) {
    const f = fields(template); const genders = values(f, 'Genus').filter(g => g in articles);
    const rows = cases.map((c, i) => ({ label: c, cells: [
      values(f, c + ' Singular').flatMap(v => v.split(/\s*\/\s*/).filter(Boolean)).flatMap(form => genders.length === 1 ? [`${articles[genders[0]][i]} ${form}`] : [form]),
      values(f, c + ' Plural').flatMap(v => v.split(/\s*\/\s*/).filter(Boolean)).map(form => `${['die', 'die', 'den', 'der'][i]} ${form}`),
    ] }));
    result.tables.push({ title: 'İsim · dört hâl' + (index ? ` (${index + 1})` : ''), columns: ['Tekil', 'Çoğul'], rows });
    if (genders.length !== 1) result.warnings.push('Artikel belirsiz veya birden fazla cinsiyet var; kaynak maddesindeki anlamı kontrol et.');
  }
  for (const [index, template] of templates(german, 'Deutsch Verb Übersicht').entries()) {
    const f = fields(template), suffix = index ? ` (${index + 1})` : '';
    result.tables.push({title: 'Fiil · Indikativ Aktiv' + suffix, columns: ['Präsens', 'Präteritum', 'Perfekt'], rows: persons.map(p => ({ label: p, cells: [values(f, `Präsens_${p === 'er/sie/es' ? 'er, sie, es' : p}`), values(f, `Präteritum_${p === 'er/sie/es' ? 'er, sie, es' : p}`), []] }))});
    result.tables.push({ title: 'Fiil · temel biçimler' + suffix, columns: ['Kaynakta verilen'], rows: [
      { label: 'Hilfsverb', cells: [values(f, 'Hilfsverb')] }, { label: 'Partizip II', cells: [values(f, 'Partizip II')] },
    ] });
    const extraRows = [
      {label:'Imperativ · du',cells:[values(f,'Imperativ Singular')]},
      {label:'Imperativ · ihr',cells:[values(f,'Imperativ Plural')]},
      ...persons.map(p=>({label:'Konjunktiv II · '+p,cells:[values(f,`Konjunktiv II_${p==='er/sie/es'?'er, sie, es':p}`)]})),
    ];
    if(extraRows.some(r=>r.cells[0].length))result.tables.push({title:'Fiil · ek biçimler (kaynakta varsa)' + suffix,columns:['Kaynakta verilen'],rows:extraRows});
  }
  for (const template of templates(german, 'Deutsch Adjektiv Übersicht')) {
    const f = fields(template);
    result.tables.push({title:'Sıfat · karşılaştırma', columns:['Kaynakta verilen'], rows:['Positiv','Komparativ','Superlativ'].map(label => ({ label, cells:[values(f,label)] }))});
    result.warnings.push('Sıfat tablosu karşılaştırma dereceleridir; artikel/hâl çekimi değildir. Superlativ kaynak biçimiyle gösterilir (ör. besten → am besten).');
  }
  if (!result.tables.length) result.warnings.push('Desteklenen Almanca çekim tablosu bulunamadı. Temel biçimi seçerek yeniden dene.');
  return result;
}
/** Reads rendered Wiktionary Flexion tables, not their generative raw templates. */
export function parseVerbFlexionHtml(html: string): Partial<Record<'Präsens' | 'Präteritum' | 'Perfekt', InflectionCell[]>> {
  const out: Partial<Record<'Präsens' | 'Präteritum' | 'Perfekt', InflectionCell[]>> = {};
  for (const match of html.matchAll(/<table\b[^>]*>([^]*?)<\/table>/gi)) {
    const rows = [...match[1].matchAll(/<tr\b[^>]*>([^]*?)<\/tr>/gi)].map(r => [...r[1].matchAll(/<t[dh]\b[^>]*>([^]*?)<\/t[dh]>/gi)].map(c => text(c[1])));
    for (let heading = 0; heading < rows.length; heading++) {
      const tense = rows[heading]?.[0];
      if (rows[heading].length !== 1 || (tense !== 'Präsens' && tense !== 'Präteritum' && tense !== 'Perfekt')) continue;
      // Only a known source layout: first grammatical block Aktiv, first mood Indikativ.
      const headerPerson = rows[heading + 1]?.[0] === 'Person' || rows[heading + 2]?.[0] === 'Person';
      if (!headerPerson || rows[heading + 1]?.[1] !== 'Aktiv' || rows[heading + 2]?.[1] !== 'Indikativ' || out[tense]) continue;
      const body = rows.slice(heading + 3, heading + 9);
      const forms = persons.map((p, i) => {
        const label = `${i % 3 + 1}. Person ${i < 3 ? 'Singular' : 'Plural'}`;
        const row = body.find(r => r[0] === label); const source = row?.[1] || '';
        const prefix = p === 'er/sie/es' ? /^er\s*\/\s*sie\s*\/\s*es\s+/ : new RegExp(`^${p}\\s+`);
        if (!prefix.test(source)) return [];
        const v = clean(source.replace(prefix, '')); return v ? [v] : [];
      });
      out[tense] = forms;
    }
  }
  return out;
}
export async function fetchInflections(lemma: string, wiki?: string, fetcher: typeof fetch = fetch): Promise<Inflections> {
  const url = wiktionaryUrl(lemma);
  let raw = wiki;
  if (raw === undefined) {
    try { const r = await fetcher(`${url}?action=raw`, {headers:{'User-Agent':'Wortgarten/1.1 vocabulary-learning'},signal:AbortSignal.timeout(7000)}); raw = r.ok ? await r.text() : ''; } catch { raw = ''; }
  }
  const result = parseInflections(raw, lemma);
  const verb = result.tables.find(t => t.title === 'Fiil · Indikativ Aktiv');
  if (verb) {
    const flexionUrl = wiktionaryUrl('Flexion:' + lemma);
    try {
      const r = await fetcher(flexionUrl, {headers:{'User-Agent':'Wortgarten/1.1 vocabulary-learning'},signal:AbortSignal.timeout(7000)});
      if (r.ok) {
        const forms = parseVerbFlexionHtml(await r.text());
        let used = false;
        ['Präsens', 'Präteritum', 'Perfekt'].forEach((tense, j) => {
          const column = forms[tense as keyof typeof forms];
          column?.forEach((cell, i) => { if (cell.length) { verb.rows[i].cells[j] = cell; used = true; } });
        });
        if (used) result.sources.push({label:'Wiktionary: Flexion ' + lemma, url:flexionUrl});
      }
    } catch { /* source outage: preserve verified raw cells */ }
    if (verb.rows.some(r => r.cells.some(c => !c.length))) result.warnings.push('Fiilin bazı kişi/zaman biçimleri kaynaktan doğrulanamadı; eksikler türetilmedi.');
  }
  return result;
}
