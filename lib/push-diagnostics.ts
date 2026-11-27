import {buildPushPayload,vapidHeaders} from '@block65/webcrypto-web-push';
export type PushKeys={publicKey:string;privateKey:string;subject:string};
export type CryptoCheck={ok:boolean;code:'READY'|'PUSH_KEY_FORMAT'|'PUSH_VAPID_FAILED'|'PUSH_ENCRYPTION_FAILED';errorName?:string};
const safeName=(error:unknown)=>{const n=(error as {name?:string})?.name;return ['Error','TypeError','RangeError','DataError','OperationError','NotSupportedError','InvalidAccessError','InvalidCharacterError','SyntaxError'].includes(n||'')?(n||'Error'):'Error'};
const encode=(b:ArrayBuffer|Uint8Array)=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
/** Synthetic in-memory subscription only. Never sends a request or uses a real endpoint. */
export async function checkPushCrypto(keys:PushKeys):Promise<CryptoCheck>{
 if(!/^[\w-]{87}$/.test(keys.publicKey||'')||!/^[\w-]{43}$/.test(keys.privateKey||'')||!/^(mailto:|https:\/\/)/.test(keys.subject||''))return {ok:false,code:'PUSH_KEY_FORMAT'};
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
 const subscription={endpoint:'https://web.push.apple.com/self-check-not-a-recipient',expirationTime:null,keys:{p256dh:encode(await crypto.subtle.exportKey('raw',pair.publicKey)),auth:encode(crypto.getRandomValues(new Uint8Array(16)))}};
 try{await vapidHeaders(subscription,keys)}catch(e){return {ok:false,code:'PUSH_VAPID_FAILED',errorName:safeName(e)}}
 try{await buildPushPayload({data:{selfCheck:true}},subscription,keys);return {ok:true,code:'READY'}}catch(e){return {ok:false,code:'PUSH_ENCRYPTION_FAILED',errorName:safeName(e)}}
}
export class PushDeliveryError extends Error{constructor(public code:'PUSH_CRYPTO_FAILED'|'PUSH_NETWORK_FAILED',public errorName:string,public detail=''){super(code);this.name='PushDeliveryError'}}
export function deliveryError(error:unknown){return error instanceof PushDeliveryError?{code:error.code,error:error.code==='PUSH_CRYPTO_FAILED'?'Sunucu bildirim şifrelemesini tamamlayamadı. Kelimelerin korunuyor; sorun telefon izninden önce oluştu.':'Sunucu push hizmetine ulaşamadı. İnternet/servis bağlantısı yeniden denenmeli.'}:{code:'PUSH_INTERNAL_ERROR',error:'Bildirim sunucusunda işlem tamamlanamadı.'}}
export function safePushErrorName(error:unknown){return safeName(error)}

export function safePushErrorDetail(error:unknown){return String((error as {message?:string})?.message||'').replace(/https?:\/\/[^\s]+/gi,'[url]').replace(/[\w.+-]+@[\w.-]+/g,'[email]').replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[ip]').replace(/(?:[a-f0-9]{1,4}:){2,}[a-f0-9:]+/gi,'[ip]').replace(/[A-Za-z0-9_+\/=-]{20,}/g,'[value]').replace(/[\r\n]/g,' ').slice(0,180)}
