import {deliverPushRequest} from './push-transport';
import {PushDeliveryError,safePushErrorName,safePushErrorDetail} from './push-diagnostics';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {pushStoreConfigured} from './vercel-push-store';

export function keys(){return {publicKey:process.env.VAPID_PUBLIC_KEY||'',privateKey:process.env.VAPID_PRIVATE_KEY||'',subject:process.env.VAPID_SUBJECT||''};}
export function ready(){const k=keys();return !!(pushStoreConfigured()&&k.publicKey&&k.privateKey&&k.subject);}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
export function validToken(token:unknown):token is string{return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token);}
export function validEndpoint(endpoint:unknown):endpoint is string{try{if(typeof endpoint!=='string'||endpoint.length>2500)return false;const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com')||u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
export async function readBody(req:Request){
 const url=new URL(req.url),origin=req.headers.get('origin'),proto=req.headers.get('x-forwarded-proto')?.split(',')[0].trim()||url.protocol.replace(/:$/,''),host=req.headers.get('x-forwarded-host')?.split(',')[0].trim()||req.headers.get('host')||url.host;
 if((origin!==url.origin&&origin!==`${proto}://${host}`)||req.headers.get('sec-fetch-site')==='cross-site'||!req.headers.get('content-type')?.includes('application/json')||Number(req.headers.get('content-length')||0)>10000||!req.body)throw Error('Geçersiz istek.');
 const reader=req.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let bytes=0,body='';
 for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>10000){await reader.cancel();throw Error('İstek çok büyük.');}body+=decoder.decode(value,{stream:true});}
 return JSON.parse(body+decoder.decode());
}
export type PushSubscriptionData={endpoint:string;expirationTime:null;keys:{p256dh:string;auth:string}};
function b64Bytes(v:unknown,len:number){if(typeof v!=='string')return false;const clean=v.replace(/=+$/,'');if(!/^[-_a-zA-Z0-9]+$/.test(clean))return false;try{return atob(clean.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-clean.length%4)%4)).length===len;}catch{return false;}}
export function validSubscription(s:unknown):s is PushSubscriptionData{
 const sub=s as PushSubscriptionData|undefined;
 return !!(validEndpoint(sub?.endpoint)&&b64Bytes(sub?.keys?.p256dh,65)&&b64Bytes(sub?.keys?.auth,16));
}
export async function sendPush(subscription:PushSubscriptionData,test=false){
 if(!validSubscription(subscription))throw Error('Desteklenmeyen push aboneliği.');
 let payload;try{
  payload=await buildPushPayload({data:{title:test?'Wortgarten hazır 🌿':'Birkaç kelime seni bekliyor 🌿',body:test?'Bu gerçek bir Web Push bildirimi.':'Kelime veya gramer tekrarının zamanı geldi.',url:'/?study=1',tag:test?'wortgarten-test':'wortgarten-daily'},options:{ttl:3600,urgency:'normal'}},subscription,keys());
 }catch(e){throw new PushDeliveryError('PUSH_CRYPTO_FAILED',safePushErrorName(e),safePushErrorDetail(e));}
 try{return await deliverPushRequest(subscription.endpoint,payload);}catch(e){throw new PushDeliveryError('PUSH_NETWORK_FAILED',safePushErrorName(e),safePushErrorDetail(e));}
}
