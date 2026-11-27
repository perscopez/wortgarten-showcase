// Builds German copies of the Wortgarten illustrations (public/vocabulary-art/<dir>-de/).
// Turkish labels are translated; the Turkish gloss under the word in lesson/audit art is dropped,
// because German cards explain the word in German next to the picture.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'vocabulary-art');
export const GERMAN_ART_DIRS = ['teaching-scenes', 'lesson-20261108', 'audit-20261109'];
export const LABELS = {
  'EĞİTİMSEL ÇAĞRIŞIM ŞEMASI': 'LERNSCHEMA · BILDASSOZIATION',
  'ALMANCA · GÖRSEL ÇAĞRIŞIM': 'DEUTSCH · BILDASSOZIATION',
  'ARDINDAN': 'DANACH', 'AYNI ZAMAN': 'GLEICHZEITIG', 'AZ ÖNCE': 'GERADE EBEN', 'BUGÜN': 'HEUTE',
  'BİR GÜN': 'EINES TAGES', 'BİR ZAMANLAR': 'EINST', 'BİRAZDAN': 'GLEICH', 'BİRKAÇ GÜN ÖNCE': 'VOR EIN PAAR TAGEN',
  'DAHA SONRA': 'SPÄTER', 'DEVAM': 'WEITER', 'DÜN': 'GESTERN', 'EVVELSİ GÜN': 'VORGESTERN', 'GELECEK': 'ZUKUNFT',
  'GELECEKTE': 'IN ZUKUNFT', 'GEÇENLERDE': 'NEULICH', 'GEÇMİŞ': 'VERGANGENHEIT', 'GÜNÜMÜZDE': 'HEUTZUTAGE',
  'HEMEN · BEKLEMEDEN': 'SOFORT · OHNE WARTEN', 'KARŞIT': 'GEGENTEIL', 'O ZAMANLAR': 'DAMALS', 'SONRA': 'NACHHER',
  'UYGUN': 'PASSEND', 'YAKINDA': 'BALD', 'YAKLAŞIK · KESİN DEĞİL': 'CA. · NICHT GENAU', 'ÖNCE': 'VORHER',
  'İLK': 'ZUERST', 'ŞİMDİ': 'JETZT', 'ŞİMDİ · TAM ŞU AN': 'GENAU JETZT',
};
const TURKISH = /[çğıİşÇĞŞ]|[öüÖÜ](?=.*[çğışÇĞİŞ])/;

export function germanSvg(svg, dir) {
  const gloss = dir !== 'teaching-scenes';
  return svg.replace(/<text([^>]*)>([^<]*)<\/text>/g, (whole, attrs, text) => {
    if (gloss && /font-size="19"/.test(attrs)) return '';
    const de = LABELS[text];
    if (!de) return whole;
    // Longer German labels shrink so they stay inside their boxes.
    const next = attrs.replace(/font-size="(\d+(?:\.\d+)?)"/, (m, size) => {
      const scaled = Math.max(Number(size) * 0.6, Math.min(Number(size), Number(size) * (Math.max(text.length, 10) + 2) / (de.length + 2)));
      return `font-size="${Math.round(scaled * 10) / 10}"`;
    });
    return `<text${next}>${de}</text>`;
  });
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  let count = 0; const left = new Set();
  for (const dir of GERMAN_ART_DIRS) {
    const out = path.join(root, `${dir}-de`);
    fs.mkdirSync(out, { recursive: true });
    for (const name of fs.readdirSync(path.join(root, dir)).filter((n) => n.endsWith('.svg'))) {
      const svg = germanSvg(fs.readFileSync(path.join(root, dir, name), 'utf8'), dir);
      for (const [, t] of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) if (TURKISH.test(t)) left.add(t);
      fs.writeFileSync(path.join(out, name), svg); count++;
    }
  }
  console.log(`${count} German illustrations written.`);
  if (left.size) { console.error('Turkish text left:', [...left]); process.exitCode = 1; }
}
