import {createHash,timingSafeEqual} from 'node:crypto';
import {validateSyncConfig} from './sync-provider';
export type PushAction='health'|'settings'|'remove'|'test'|'claim_due'|'release';
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const cronAuthorized=(value:string|null,expected:string|undefined)=>{
 if(!expected||!value?.startsWith('Bearer '))return false;
 return timingSafeEqual(Buffer.from(hash(value.slice(7)),'hex'),Buffer.from(hash(expected),'hex'));
};
export function pushStoreConfigured(){
 const cfg=validateSyncConfig({url:process.env.SUPABASE_URL,publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY});
 const secret=process.env.WORTGARTEN_PUSH_STORE_SECRET;
 return cfg&&secret&&/^[0-9a-f]{64}$/.test(secret)?{...cfg,secret}:null;
}
export async function pushStore<T>(action:PushAction,args:Record<string,unknown>={}):Promise<T>{
 const cfg=pushStoreConfigured();if(!cfg)throw Error('Notification store unavailable');
 const r=await fetch(cfg.url+'/rest/v1/rpc/wortgarten_push_store',{
  method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},
  body:JSON.stringify({p_secret:cfg.secret,p_action:action,p_args:args}),signal:AbortSignal.timeout(6000),cache:'no-store',redirect:'error',
 });
 if(!r.ok)throw Error('Notification store rejected the operation');
 return await r.json() as T;
}
