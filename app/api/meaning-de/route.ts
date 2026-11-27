import {createRateLimiter,clientKey,tooManyRequests,LOOKUP_CACHE} from '../../../lib/rate-limit';
import {cleanWiki,germanSection,baseForm} from '../../../lib/dictionary';
import {parseGermanMeanings,GERMAN_MEANING_SOURCE} from '../../../lib/german-meaning';
// German explanations for words that are not in the bundled list. One Wiktionary page per request, two at most for inflected forms.
const limiter=createRateLimiter({limit:60,windowMs:60000});
async function page(word:string,signal:AbortSignal){
 try{const r=await fetch(GERMAN_MEANING_SOURCE+encodeURIComponent(word.replace(/ /g,'_'))+'?action=raw',{headers:{'User-Agent':'Wortgarten/1.1 vocabulary-learning'},signal});if(!r.ok)return '';return await r.text();}catch{return '';}
}
export async function GET(req:Request){
 const allowed=limiter.check(clientKey(req));if(!allowed.ok)return tooManyRequests(allowed.retryAfter);
 const word=(new URL(req.url).searchParams.get('word')||'').normalize('NFC').trim().replace(/^(der|die|das)\s+/i,'');
 if(!/^[\p{L}][\p{L}\p{M}' -]{0,79}$/u.test(word))return Response.json({error:'Gib ein deutsches Wort ein.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const signal=AbortSignal.any([req.signal,AbortSignal.timeout(8000)]);
 const upper=word.charAt(0).toLocaleUpperCase('de')+word.slice(1),lower=word.charAt(0).toLocaleLowerCase('de')+word.slice(1);
 for(const candidate of [...new Set([word,upper,lower])]){
  let wiki=await page(candidate,signal);let found=candidate;
  if(!germanSection(wiki))continue;
  const lemma=baseForm(wiki);if(lemma){const base=await page(lemma,signal);if(germanSection(base)){wiki=base;found=lemma;}}
  const meaning=parseGermanMeanings(germanSection(wiki),cleanWiki);
  if(meaning)return Response.json({word:found,meaning,source:GERMAN_MEANING_SOURCE+encodeURIComponent(found)},{headers:{'Cache-Control':LOOKUP_CACHE}});
 }
 return Response.json({word,meaning:''},{status:404,headers:{'Cache-Control':'public, max-age=0, s-maxage=3600'}});
}
