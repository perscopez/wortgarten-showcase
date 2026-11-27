import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {assertOwner,validRemoteItem,type RemoteItem,type SyncMutation} from './sync-engine';
export type SyncConfig={url:string;publishableKey:string};
/** Only an explicit Supabase public key may enter the browser bundle/config. */
export function validateSyncConfig(value:unknown):SyncConfig|null{
 try{const v=value as SyncConfig;const u=new URL(v.url);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.pathname!=='/'||u.username||u.password||u.port)return null;
  if(typeof v.publishableKey!=='string')return null;
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(v.publishableKey)){
   const chunks=v.publishableKey.split('.');if(chunks.length!==3)return null;
   const text=atob(chunks[1].replace(/-/g,'+').replace(/_/g,'/'));const claims=JSON.parse(text);if(claims.role!=='anon'||claims.iss!=='supabase')return null;
  }
  return{url:u.origin,publishableKey:v.publishableKey};
 }catch{return null;}
}
export function makeSyncProvider(config:SyncConfig){const safe=validateSyncConfig(config);if(!safe)throw Error('Senkronizasyon sağlayıcısı yapılandırılmadı.');const client=createClient(safe.url,safe.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'wortgarten-supabase-auth-v1'}});return new SupabaseSyncProvider(client);}
export class SupabaseSyncProvider{
 constructor(readonly client:SupabaseClient){}
 async signUp(email:string,password:string,redirectTo:string){const{error}=await this.client.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}});if(error)throw error;}
 async signIn(email:string,password:string){const{error}=await this.client.auth.signInWithPassword({email,password});if(error)throw error;return this.verifiedUser();}
 async requestOtp(email:string){const {error}=await this.client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error;}
 async verifyOtp(email:string,token:string){const{error}=await this.client.auth.verifyOtp({email,token,type:'email'});if(error)throw error;return this.verifiedUser();}
 async verifiedUser(){const{data,error}=await this.client.auth.getUser();if(error||!data.user?.email_confirmed_at)throw Error('Doğrulanmış e-posta girişi gerekli.');assertOwner(data.user.id);return{id:data.user.id,email:data.user.email||''};}
 async signOut(){const{error}=await this.client.auth.signOut({scope:'local'});if(error)throw error;}
 async inventory(owner:string):Promise<RemoteItem[]>{await this.checkOwner(owner);const output:RemoteItem[]=[];let last='';
  for(;;){let query=this.client.from('wortgarten_sync_items').select('key,body,deleted,version').eq('user_id',owner).order('key').limit(500);if(last)query=query.gt('key',last);const{data,error}=await query;if(error)throw error;if(!data||!data.every(validRemoteItem))throw Error('Sunucu kaydı geçersiz.');output.push(...data);if(output.length>12000)throw Error('Senkronizasyon envanteri sınırı aşıldı; yerel veri değişmedi.');if(data.length<500)break;last=data[data.length-1].key;}
  return output;
 }
 async commit(owner:string,operations:SyncMutation[]):Promise<{accepted:boolean;item:RemoteItem}[]>{await this.checkOwner(owner);if(operations.length>100)throw Error('Senkronizasyon yazma paketi çok büyük.');const{data,error}=await this.client.rpc('wortgarten_sync_commit',{operations});if(error)throw error;if(!Array.isArray(data)||data.length!==operations.length||!data.every(r=>!!r&&typeof r.accepted==='boolean'&&validRemoteItem(r.item)))throw Error('Senkronizasyon onayı geçersiz; kuyruk korunuyor.');return data;}
 private async checkOwner(owner:string){assertOwner(owner);if((await this.verifiedUser()).id!==owner)throw Error('Hesap değişti; senkronizasyon durduruldu.');}
}
