/**
 * Best-effort, per-instance sliding window. It does not replace a shared limiter,
 * but stops one client from looping expensive dictionary/image lookups on a warm instance.
 */
export type RateLimiter={check:(key:string,now?:number)=>{ok:boolean;retryAfter:number}};

export function createRateLimiter({limit,windowMs,maxKeys=5000}:{limit:number;windowMs:number;maxKeys?:number}):RateLimiter{
 const hits=new Map<string,number[]>();
 return{check(key,now=Date.now()){
  const recent=(hits.get(key)||[]).filter(t=>t>now-windowMs);
  if(recent.length>=limit){hits.delete(key);hits.set(key,recent);return{ok:false,retryAfter:Math.max(1,Math.ceil((recent[0]+windowMs-now)/1000))};}
  recent.push(now);hits.delete(key);hits.set(key,recent);
  // Map keeps insertion order: drop the least recently seen clients first.
  while(hits.size>maxKeys)hits.delete(hits.keys().next().value!);
  return{ok:true,retryAfter:0};
 }};
}

/** Four seeded FNV-1a passes; dependency-free so routes stay bundleable in tests. */
function fnv(text:string,seed:number){let h=seed>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
/** Hashed so raw IP addresses are never kept as map keys. */
export function clientKey(req:Request){
 const ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
 return fnv(ip,2166136261)+fnv(ip,3735928559)+fnv(ip,1540483477)+fnv(ip,2654435761);
}

export function tooManyRequests(retryAfter:number){
 return Response.json({error:'Çok fazla arama yapıldı. Biraz bekleyip yeniden dene.'},{status:429,headers:{'Retry-After':String(retryAfter),'Cache-Control':'no-store'}});
}

/** Shared CDN cache for complete, user-independent lookup results. */
export const LOOKUP_CACHE='public, max-age=0, s-maxage=21600, stale-while-revalidate=86400';
