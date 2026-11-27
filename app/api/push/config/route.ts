import {keys,ready,response} from '../../../../lib/push';
import {checkPushCrypto,type CryptoCheck} from '../../../../lib/push-diagnostics';
export const dynamic='force-dynamic';
let cached:CryptoCheck|undefined;let checkedAt=0;
export async function GET(){
 if(!ready())return response({ready:false,publicKey:null,cryptoReady:false,code:'PUSH_NOT_CONFIGURED'});
 const k=keys();
 if(!cached||Date.now()-checkedAt>600000){
  const check=await checkPushCrypto(k).catch(()=>({ok:false,code:'PUSH_ENCRYPTION_FAILED' as const,errorName:'Error'}));
  if(check.ok){cached=check;checkedAt=Date.now();}else{cached=undefined;}
  return response({ready:true,publicKey:k.publicKey,cryptoReady:check.ok,code:check.code,errorName:check.errorName});
 }
 return response({ready:true,publicKey:k.publicKey,cryptoReady:cached.ok,code:cached.code,errorName:cached.errorName});
}
