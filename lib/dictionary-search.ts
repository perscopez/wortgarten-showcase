/** Server-only bounded suggestions over the shipped licensed WikDict dictionary. Never auto-correct. */
import {discoverySenses} from './discovery-senses';
import {stripArticle} from './dictionary';
import raw from './dictionary-data.json';
const dictionary=raw as unknown as{words:Record<string,[string[],string]>;aliases:Record<string,string[]>};
export type DictionarySuggestion={word:string;article:string;meaning:string;kind:'translation'|'spelling'|'exact';distance?:number};
const entries=Object.entries(dictionary.words);
const de=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase('de');
const tr=(s:string)=>s.normalize('NFC').trim().toLocaleLowerCase('tr');
export function boundedEditDistance(a:string,b:string,max=2){if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];let low=i;for(let j=1;j<=b.length;j++){next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));low=Math.min(low,next[j]);}if(low>max)return max+1;prev=next;}return prev[b.length];}
export function dictionarySearch(query:string,intent:'tr'|'de',limit=8):DictionarySuggestion[]{
 const text=query.normalize('NFC').replace(/\s+/g,' ').trim();if(text.length<2||text.length>40)return[];const count=Math.max(0,Math.min(8,Math.floor(limit)));if(!count)return[];
 if(intent==='tr'){const needle=tr(text);return entries.map(([word,[meanings,article]])=>{const lower=meanings.map(tr);const rank=lower.some(x=>x===needle)?0:lower.some(x=>x.startsWith(needle))?1:lower.some(x=>x.includes(needle))?2:99;return{word,article,meanings,rank};}).filter(r=>r.rank<99).sort((a,b)=>a.rank-b.rank||a.word.localeCompare(b.word,'de')).slice(0,count).map(r=>({word:r.word,article:r.article,meaning:r.meanings.slice(0,5).join('; '),kind:'translation'}));}
 const stripped=stripArticle(text);
 const checked=discoverySenses(stripped);if(checked.length)return checked.slice(0,count).map(s=>({word:s.word,article:s.article,meaning:s.meaning,kind:'exact'}));
 const needle=de(stripped);const exact=entries.filter(([word])=>de(word)===needle).map(([word,[meanings,article]])=>({word,article,meaning:meanings.slice(0,5).join('; '),kind:'exact' as const}));
 if(exact.length)return exact.slice(0,count);const lemmas=Object.hasOwn(dictionary.aliases,needle)?dictionary.aliases[needle]:[];if(lemmas.length)return [...new Set(lemmas)].filter(word=>Object.hasOwn(dictionary.words,word)).slice(0,count).map(word=>({word,article:dictionary.words[word][1],meaning:dictionary.words[word][0].slice(0,5).join('; '),kind:'exact'}));
 if(needle.length<3||needle.length>32)return[];let compared=0;const candidates:{word:string;meanings:string[];article:string;distance:number}[]=[];
 for(const[word,[meanings,article]]of entries){const candidate=de(word);if(Math.abs(candidate.length-needle.length)>2||candidate[0]!==needle[0])continue;if(++compared>2500)break;const distance=boundedEditDistance(needle,candidate);if(distance<=2)candidates.push({word,meanings,article,distance});}
 return candidates.sort((a,b)=>a.distance-b.distance||a.word.localeCompare(b.word,'de')).slice(0,count).map(r=>({word:r.word,article:r.article,meaning:r.meanings.slice(0,5).join('; '),kind:'spelling',distance:r.distance}));
}
