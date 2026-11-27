import {fetchInflections} from '../../../lib/inflections';
import {createRateLimiter,clientKey,tooManyRequests} from '../../../lib/rate-limit';
const limiter=createRateLimiter({limit:60,windowMs:60000});
export async function GET(req:Request){
 const allowed=limiter.check(clientKey(req));if(!allowed.ok)return tooManyRequests(allowed.retryAfter);
 const word=(new URL(req.url).searchParams.get('word')||'').normalize('NFC').trim();
 if(!/^[\p{L}][\p{L}\p{M} -]{0,79}$/u.test(word))return Response.json({error:'Geçerli bir Almanca kelime yaz.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const signal=AbortSignal.any([req.signal,AbortSignal.timeout(8000)]);
 const result=await fetchInflections(word,undefined,(url,init)=>fetch(url,{...init,signal}));
 return Response.json(result,{headers:{'Cache-Control':result.tables.length?'public, max-age=3600':'no-store'}});
}
