import {ERROR_TEXT,FEEDBACK_INSTRUCTIONS,REFRESH_FAILURES,SiwcError,feedbackInput,parseFeedback,pickModel,refreshTokens,respond} from '../../../../lib/siwc';
import {clearCookie,config,readSession,sessionCookie,SESSION_COOKIE,noStore} from '../../../../lib/siwc-http';
import {createRateLimiter,clientKey} from '../../../../lib/rate-limit';
export const maxDuration = 60;
const limiter=createRateLimiter({limit:12,windowMs:60000});
const clean=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max*4).normalize('NFC').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
/** AI check of one learner sentence, billed to the learner's own ChatGPT plan. Only the sentence and its pattern leave the app. */
export async function POST(req:Request){
 const cfg=config(req);
 if(!cfg)return Response.json({error:'off',message:'ChatGPT girişi bu sitede etkin değil.'},{status:404,headers:noStore});
 const allowed=limiter.check(clientKey(req));if(!allowed.ok)return Response.json({error:'rate_limited',message:'Çok sık kontrol istendi. Biraz bekleyip tekrar dene.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(allowed.retryAfter)}});
 const session=await readSession(req,cfg);
 if(!session)return Response.json({error:'signed_out',message:'Önce ChatGPT ile giriş yap.'},{status:401,headers:noStore});
 const body=await req.json().catch(()=>null) as {sentence?:unknown;phrase?:unknown;tr?:unknown}|null;
 const sentence=clean(body?.sentence,300),phrase=clean(body?.phrase,160),tr=clean(body?.tr,160);
 if(sentence.length<4||!phrase)return Response.json({error:'bad_request',message:'Kontrol edilecek bir cümle yaz.'},{status:400,headers:noStore});
 const headers=new Headers(noStore);
 try{
  const tokens=await refreshTokens(cfg,session.rt);
  if(tokens.refresh_token)headers.append('Set-Cookie',await sessionCookie(req,cfg,tokens.refresh_token));
  const model=await pickModel(tokens.access_token,cfg.model);
  const text=await respond(tokens.access_token,model,FEEDBACK_INSTRUCTIONS,feedbackInput(sentence,phrase,tr));
  const feedback=parseFeedback(text,sentence);
  if(!feedback)return Response.json({error:'unreadable',message:'Yapay zekâ cevabı okunamadı. Tekrar dene.'},{status:502,headers});
  return Response.json({feedback},{headers});
 }catch(e){
  const code=e instanceof SiwcError?e.code:'unknown';
  if(REFRESH_FAILURES.has(code)||code==='subscription_sharing_invalid_user'){headers.append('Set-Cookie',clearCookie(req,SESSION_COOKIE));return Response.json({error:'signed_out',message:'ChatGPT oturumun sona erdi. Yeniden giriş yap.'},{status:401,headers});}
  const status=code==='subscription_sharing_usage_limit_exceeded'?429:code==='subscription_sharing_user_not_eligible'?403:502;
  const msg=Object.hasOwn(ERROR_TEXT,code)?ERROR_TEXT[code]:'Yapay zekâ kontrolü şu an yapılamadı. Biraz sonra tekrar dene.';
  return Response.json({error:code,message:msg},{status,headers});
 }
}
