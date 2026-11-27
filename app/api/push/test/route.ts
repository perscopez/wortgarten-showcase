import {deliveryError} from '../../../../lib/push-diagnostics';
import {readBody,ready,response,validToken,validSubscription,sendPush} from '../../../../lib/push';
import {hash,pushStore} from '../../../../lib/vercel-push-store';
export async function POST(req:Request){
 if(!ready())return response({error:'Bildirim altyapısı hazır değil.'},503);
 let data;try{data=await readBody(req);}catch{return response({error:'Geçersiz bildirim isteği.'},400);}
 if(!validToken(data?.token))return response({error:'Geçersiz cihaz.'},400);
 const token_hash=hash(data.token);
 try{
  const r=await pushStore<{status:string;subscription?:unknown}>('test',{token_hash});
  if(r.status==='missing')return response({error:'Önce bildirimleri aç.'},404);
  if(r.status==='throttled')return response({error:'Yeni test için bir dakika bekle.'},429);
  if(r.status!=='ok'||!validSubscription(r.subscription))throw Error('Invalid subscription');
  const delivery=await sendPush(r.subscription,true);
  delivery.body?.cancel().catch(()=>{});
  if(delivery.status===404||delivery.status===410){
   await pushStore('remove',{token_hash,endpoint_hash:hash(r.subscription.endpoint)});
   return response({error:'Abonelik sona erdi. Bildirimleri yeniden etkinleştir.'},410);
  }
  return delivery.ok?response({accepted:true}):response({error:'Push servisi bildirimi kabul etmedi.',status:delivery.status},502);
 }catch(e){return response(deliveryError(e),500);}
}
