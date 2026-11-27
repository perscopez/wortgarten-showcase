import {germanSection,cleanWiki} from './dictionary';
/** Only literal Turkish dictionary translations; never translates a German definition by guessing. */
export async function quickDictionarySource(word:string,request:typeof fetch=fetch,signal?:AbortSignal){
 const deadline=signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000);
 const variants=[...new Set([word,word.toLocaleLowerCase('de'),word.charAt(0).toLocaleUpperCase('de')+word.slice(1)])];
 for(const candidate of variants){try{const source='https://de.wiktionary.org/wiki/'+encodeURIComponent(candidate);const r=await request(source+'?action=raw',{signal:deadline,headers:{'User-Agent':'Wortgarten/2.0 dictionary-only'}});if(!r.ok)continue;const raw=await r.text();if(raw.length>600000)continue;const section=germanSection(raw);if(!section)continue;const terms=[...section.matchAll(/\{\{Ü(?:t|xx4|xx)?\|tr\|([^|}]+)/g)].map(m=>cleanWiki(m[1]).trim()).filter(s=>s&&s.length<120&&!/[{}<>]/.test(s));if(!terms.length)continue;const genera=[...new Set([...section.matchAll(/(?:^|\n)\s*\|?Genus(?:\s*\d*)?\s*=\s*([mfn])\b/g)].map(m=>m[1]))];const article=genera.length===1?({m:'der',f:'die',n:'das'}[genera[0]]||''):'';return{word:candidate,article,plural:'',meaning:[...new Set(terms)].slice(0,4).join('; '),example:'',translation:'',source};}catch{if(deadline.aborted)break;}}
 return undefined;
}
