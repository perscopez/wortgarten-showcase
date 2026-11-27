import data from './frequency-de.json';

/** Frequency-ranked German nouns and verbs (from subtitle frequencies) that the learner has not saved yet. */
export type FrequentWord={word:string;rank:number;kind:'n'|'v'};
const words=(data as unknown as {words:[string,number,'n'|'v'][]}).words;
const norm=(s:string)=>s.normalize('NFC').trim().replace(/^(?:sich\s+)?(?:(?:der|die|das)\s+)?/i,'').toLocaleLowerCase('de');
export const FREQUENCY_SOURCE=data as {source:string;license:string;url:string};

export function nextFrequentWords(known:Iterable<string>,limit=8,skip=0):FrequentWord[]{
 if(limit<=0)return[];
 const have=new Set([...known].map(norm));
 const out:FrequentWord[]=[];let skipped=0;
 for(const [word,rank,kind] of words){
  if(have.has(norm(word)))continue;
  if(skipped<skip){skipped++;continue;}
  out.push({word,rank,kind});if(out.length>=limit)break;
 }
 return out;
}
/** Share of the first `top` frequency-ranked words (nouns and verbs only) that the learner has saved. */
export function frequencyCoverage(known:Iterable<string>,top=300){
 const clampedTop=Math.max(0,top);
 const have=new Set([...known].map(norm));
 const pool=words.slice(0,clampedTop);
 const hit=pool.filter(([w])=>have.has(norm(w))).length;
 return{hit,total:pool.length};
}
