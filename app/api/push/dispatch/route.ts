import {hash,cronAuthorized,pushStore} from '../../../../lib/vercel-push-store';
import {ready,response,sendPush,validSubscription} from '../../../../lib/push';
export const maxDuration=60;
export const dynamic='force-dynamic';
// Vercel Cron sends GET with `Bearer $CRON_SECRET`; external schedulers may POST with the Wortgarten-specific secret.
function authorized(req:Request){const header=req.headers.get('authorization');return cronAuthorized(header,process.env.WORTGARTEN_PUSH_CRON_SECRET)||cronAuthorized(header,process.env.CRON_SECRET);}
export async function GET(req:Request){return dispatch(req);}
export async function POST(req:Request){return dispatch(req);}
async function dispatch(req:Request){
 if(!authorized(req))return response({error:'Yetkisiz.'},401);
 if(!ready())return response({error:'Bildirim altyapısı hazır değil.'},503);
 try{
  let sent=0,failed=0,expired=0;
  for(let batch=0;batch<5;batch++){
   const rows=await pushStore<{token_hash:string;subscription:unknown;local_day:string}[]>('claim_due');
   // Each claim is atomic; concurrent invocations cannot double-send a day's reminder.
   for(let i=0;i<rows.length;i+=10)await Promise.all(rows.slice(i,i+10).map(async row=>{
    const {token_hash,subscription,local_day}=row;
    if(!validSubscription(subscription)){
     const ep=typeof (subscription as {endpoint?:unknown})?.endpoint==='string'?(subscription as {endpoint:string}).endpoint:'';
     if(ep)await pushStore('remove',{token_hash,endpoint_hash:hash(ep)}).catch(()=>{});
     failed++;return;
    }
    const endpoint_hash=hash(subscription.endpoint);
    try{
     const delivery=await sendPush(subscription);
     delivery.body?.cancel().catch(()=>{});
     if(delivery.ok){sent++;return;}
     if(delivery.status===404||delivery.status===410){await pushStore('remove',{token_hash,endpoint_hash});expired++;return;}
    }catch(e){
     if((e as {code?:string})?.code==='PUSH_CRYPTO_FAILED'){await pushStore('remove',{token_hash,endpoint_hash}).catch(()=>{});failed++;return;}
    }
    failed++;await pushStore('release',{token_hash,endpoint_hash,local_day}).catch(()=>{});
   }));
   if(rows.length!==20)break;
  }
  return response({ok:true,sent,failed,expired});
 }catch{return response({error:'Bildirim kontrolü tamamlanamadı.'},503);}
}
