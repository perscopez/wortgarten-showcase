/**
 * Picks short, learner-friendly German sentences with a Turkish translation from Tatoeba search results.
 * Tatoeba sentences are CC BY 2.0 FR; the author and sentence id are kept so credit can be shown.
 * Used by the example-collection script's twin on the server (`/api/examples`) for words outside the bundled list.
 */
export type TatoebaExample={id:number;de:string;tr:string;by:string};
type Result={id:number;text:string;lang:string;user?:{username?:string}|null;translations?:{lang:string;text:string}[][]};

const BLOCKED=/\b(Sex|töten|Mord|Vergewalt\w*|Hitler|Nazi\w*|Porno\w*|ficken|Scheiße|Arsch)\b/i;
const NAMES=/\b(Tom|Maria|Mary|John)\b/;
const tokens=(s:string)=>s.match(/[\p{L}\p{M}]+/gu)||[];

/** Same loose matching the exercises use to blank a word: the word itself, a longer form, or its verb stem. */
function matches(token:string,key:string){
 const t=token.toLocaleLowerCase('de');
 if(t===key)return true;
 if(t.startsWith(key)&&t.length-key.length<=3)return true;
 const stem=key.replace(/(eln|ern|en|n)$/,'');
 return stem.length>=3&&t.startsWith(stem.slice(0,Math.max(3,Math.min(stem.length,key.length-2))))&&Math.abs(t.length-key.length)<=3;
}

/**
 * Tatoeba's search is stem based ("helfen" also finds "Hilf ihm."), so a sentence the search returned is accepted
 * even when no token matches the word literally; sentences where it does match are simply ranked first.
 */
export function pickExamples(results:Result[],word:string,meaning='',limit=3):TatoebaExample[]{
 const key=word.toLocaleLowerCase('de');
 const stems=(meaning.match(/[\p{L}]{4,}/gu)||[]).slice(0,3).map(m=>m.slice(0,4).toLocaleLowerCase('tr'));
 const scored:{rank:[number,number,number,number];item:TatoebaExample}[]=[];
 for(const r of results){
  const text=(r.text||'').trim();
  if(r.lang!=='deu'||!text||BLOCKED.test(text))continue;
  const tr=(r.translations||[]).flat().find(t=>t?.lang==='tur')?.text?.trim();
  if(!tr)continue;
  const n=tokens(text).length;
  if(n<3||n>11||text.length>85||/\d/.test(text))continue;
  const ratio=tr.length/Math.max(1,text.length);
  if(ratio<0.4||ratio>2.6)continue;
  const hit=tokens(text).some(t=>matches(t,key));
  const fits=stems.length>0&&stems.some(s=>tr.toLocaleLowerCase('tr').includes(s));
  scored.push({rank:[hit?0:1,fits?0:1,NAMES.test(text)?1:0,n],item:{id:r.id,de:text,tr,by:r.user?.username||''}});
 }
 scored.sort((a,b)=>a.rank[0]-b.rank[0]||a.rank[1]-b.rank[1]||a.rank[2]-b.rank[2]||a.rank[3]-b.rank[3]);
 const out:TatoebaExample[]=[],seen=new Set<string>();
 for(const {item} of scored){const k=item.de.toLocaleLowerCase('de');if(seen.has(k))continue;seen.add(k);out.push(item);if(out.length===limit)break;}
 return out;
}

export function tatoebaUrl(word:string){
 return 'https://tatoeba.org/en/api_v0/search?'+new URLSearchParams({from:'deu',to:'tur',query:word,orphans:'no',unapproved:'no',sort:'relevance',trans_filter:'limit'});
}
