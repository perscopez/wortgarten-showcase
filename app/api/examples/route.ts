import {pickExamples,tatoebaUrl} from '../../../lib/tatoeba';
import {createRateLimiter,clientKey,tooManyRequests} from '../../../lib/rate-limit';
const limiter=createRateLimiter({limit:40,windowMs:60000});
/** Example sentences for words outside the bundled list. Public, user-independent, cached at the edge for a month. */
export async function GET(req:Request){
 const allowed=limiter.check(clientKey(req));if(!allowed.ok)return tooManyRequests(allowed.retryAfter);
 const p=new URL(req.url).searchParams;
 const word=(p.get('word')||'').normalize('NFC').trim(),meaning=(p.get('meaning')||'').slice(0,120);
 if(!/(?=.*\p{L})^[\p{L}-]{2,40}$/u.test(word))return Response.json({error:'Geçerli tek bir Almanca kelime yaz.'},{status:400,headers:{'Cache-Control':'no-store'}});
 try{
  const r=await fetch(tatoebaUrl(word),{headers:{'User-Agent':'Wortgarten-learning-app'},signal:AbortSignal.any([req.signal,AbortSignal.timeout(8000)])});
  if(!r.ok)throw Error('upstream '+r.status);
  const data=await r.json() as {results?:Parameters<typeof pickExamples>[0]};
  const examples=pickExamples(data.results||[],word,meaning);
  return Response.json({source:'Tatoeba',license:'CC BY 2.0 FR',examples},{headers:{'Cache-Control':examples.length?'public, max-age=0, s-maxage=2592000, stale-while-revalidate=86400':'public, max-age=0, s-maxage=86400'}});
 }catch{return Response.json({examples:[]},{status:502,headers:{'Cache-Control':'no-store'}});}
}
