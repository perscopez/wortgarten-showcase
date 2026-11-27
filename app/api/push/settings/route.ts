import {readBody,ready,response,validToken,validSubscription} from '../../../../lib/push';
import {hash,pushStore} from '../../../../lib/vercel-push-store';

export async function POST(req:Request){
 if(!ready())return response({error:'Bildirim altyapısı hazır değil.'},503);
 let data;try{data=await readBody(req);}catch{return response({error:'Geçersiz bildirim isteği.'},400);}
 if(!validToken(data?.token))return response({error:'Geçersiz cihaz anahtarı.'},400);
 const token_hash=hash(data.token);
 try{
  if(data.enabled===false){await pushStore('remove',{token_hash});return response({enabled:false});}
  if(!Number.isInteger(data.hour)||data.hour<0||data.hour>23||typeof data.timezone!=='string'||data.timezone.length>80)return response({error:'Geçersiz saat.'},400);
  if(data.timezone!=='UTC'&&!/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)+$/.test(data.timezone))return response({error:'Geçersiz saat dilimi.'},400);
  try{new Intl.DateTimeFormat('en',{timeZone:data.timezone});}catch{return response({error:'Geçersiz saat dilimi.'},400);}
  const nextDue=data.nextDue;
  if(nextDue!==null&&(!Number.isSafeInteger(nextDue)||nextDue<0||nextDue>Date.now()+86400000*3650))return response({error:'Geçersiz tekrar zamanı.'},400);
  const args:Record<string,unknown>={token_hash,hour:data.hour,timezone:data.timezone,next_due:nextDue};
  if(data.subscription){
   if(!validSubscription(data.subscription))return response({error:'Geçersiz push aboneliği.'},400);
   const {endpoint,keys:{auth,p256dh}}=data.subscription;
   Object.assign(args,{endpoint_hash:hash(endpoint),subscription:{endpoint,expirationTime:null,keys:{auth,p256dh}},
    client_hash:hash(req.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()||'unknown')});
  }
  const result=await pushStore<{status:string}>('settings',args);
  if(result.status==='missing')return response({error:'Önce bildirimleri etkinleştir.'},404);
  if(result.status==='throttled')return response({error:'Bir dakika sonra yeniden dene.'},429);
  if(result.status==='conflict')return response({error:'Bu abonelik başka bir cihaz anahtarına bağlı. Bildirimleri yeniden aç.'},409);
  if(result.status==='ok')return response({enabled:true});
  throw Error('Invalid result');
 }catch{return response({error:'Bildirim ayarı kaydedilemedi. Yeniden dene.'},503);}
}
