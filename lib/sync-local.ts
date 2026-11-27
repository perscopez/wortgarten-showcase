import {indexedCardAdapter} from './card-storage';
import {LEARNING_KEYS,exportLearning} from './learning-backup';
import {EXTENDED_KEYS,exportExtendedLearning,validExtendedRecord} from './extended-learning-backup';
import {readLearningValue,updateLearningValue} from './learning-records';
import {parseCardBackup} from './backup-import';
import {canonicalJson,checkSyncOwner,type SyncState,type Json} from './sync-engine';
import type {SyncStore} from './sync-coordinator';
let cardAdapter:ReturnType<typeof indexedCardAdapter<{id:string}>>|undefined;
const STATE_KEY='wortgarten-sync-state-v1';
const REMINDER_PREFERENCE='wortgarten-reminder-preference-v1';
function reminderPreference(value:unknown):value is {hour:number;timezone:string}{const v=value as any;if(!v||!Number.isInteger(v.hour)||v.hour<0||v.hour>23||typeof v.timezone!=='string'||v.timezone.length>100)return false;try{new Intl.DateTimeFormat('en',{timeZone:v.timezone});return true;}catch{return false;}}
export const SYNC_DIRECTION='wortgarten-review-direction';
function json(value:unknown):Json{return JSON.parse(JSON.stringify(value));}
export function syncStore(owner:string):SyncStore{return{read:async()=>{const state=await readLearningValue(STATE_KEY) as SyncState|null;if(state)checkSyncOwner(state,owner);return state;},update:change=>updateLearningValue(STATE_KEY,current=>{if(current)checkSyncOwner(current as SyncState,owner);const state=change(current as SyncState|null);checkSyncOwner(state,owner);return state;})};}
export async function captureSyncSnapshot():Promise<Record<string,Json>>{
 cardAdapter ||= indexedCardAdapter<{id:string}>(indexedDB);const cards=await cardAdapter.read();if(!cards)throw Error('Yerel kelime deposu henüz hazır değil.');
 const snapshot:Record<string,Json>={};for(const card of cards){if(!card.id||snapshot['card:'+card.id])throw Error('Yerel kart kimlikleri geçersiz.');snapshot['card:'+card.id]=json(card);}
 const legacy=exportLearning(localStorage);for(const key of LEARNING_KEYS)snapshot['learning:'+key]=json(legacy[key]);
 const extended=await exportExtendedLearning();for(const[key,value]of Object.entries(extended.records))snapshot['learning:'+key]=json(value);
 const direction=localStorage.getItem(SYNC_DIRECTION);if(['de-tr','tr-de','mixed'].includes(direction||''))snapshot['setting:review-direction']=direction;
 try{const value=JSON.parse(localStorage.getItem(REMINDER_PREFERENCE)||localStorage.getItem('wortgarten-push-v1')||'null');if(reminderPreference(value))snapshot['setting:reminder-preferences']={hour:value.hour,timezone:value.timezone};}catch{}
 return snapshot;
}
/** Validate all incoming scopes before any write. Device credentials are deliberately unsupported. */
export function validateSyncSnapshot(snapshot:Record<string,Json>){
 const rawCards:Record<string,Json>[]=[];for(const[key,value]of Object.entries(snapshot)){
  if(key.startsWith('card:')){if(!value||typeof value!=='object'||Array.isArray(value)||value.id!==key.slice(5))throw Error('Sunucu kart kimliği geçersiz.');rawCards.push(value);}
  else if(key.startsWith('learning:')){const id=key.slice(9);if((EXTENDED_KEYS as readonly string[]).includes(id)){if(!validExtendedRecord(id,value))throw Error('Sunucu öğrenme kaydı geçersiz.');}else if(!(LEARNING_KEYS as readonly string[]).includes(id)||!value||typeof value!=='object'||Array.isArray(value))throw Error('Desteklenmeyen öğrenme alanı.');}
  else if(key==='setting:reminder-preferences'){if(!reminderPreference(value))throw Error('Hatırlatma saati geçersiz.');}
  else if(key!=='setting:review-direction'||typeof value!=='string'||!['de-tr','tr-de','mixed'].includes(value))throw Error('Desteklenmeyen senkronizasyon alanı.');
 }
 // Uses the same bounded defensive parser as file import; sanitized cards are returned after validation.
 const parsed=parseCardBackup({version:2,cards:rawCards});if(parsed.cards.length!==rawCards.length)throw Error('Sunucu kartları doğrulanamadı.');
 if(!parsed.cards.every((card,i)=>card.id===(rawCards[i] as any)?.id))throw Error('Sunucu kart kimliği geçersiz.');
 for(let i=0;i<rawCards.length;i++){
  const raw=rawCards[i] as any,clean=parsed.cards[i];
  if((raw.source&&!clean.source)||(raw.photo&&!clean.photo)||(raw.photo?.source&&!clean.photo?.source)||(raw.photo?.licenseUrl&&!clean.photo?.licenseUrl)||(raw.inflections&&!clean.inflections)||(raw.rection&&!clean.rection))throw Error('Sunucu kartlarında güvenli olmayan bağlantı veya yapı var.');
 }
 const legacyInput=Object.fromEntries(LEARNING_KEYS.map(key=>[key,snapshot['learning:'+key]||{}]));const safe=exportLearning({getItem:key=>JSON.stringify(legacyInput[key as keyof typeof legacyInput]),setItem:()=>{}});for(const key of LEARNING_KEYS){const value=snapshot['learning:'+key];if(value!==undefined&&canonicalJson(value)!==canonicalJson(json(safe[key])))throw Error('Sunucu beceri kaydı geçersiz.');}
 return{cards:parsed.cards.map((clean,i)=>{const next={...(rawCards[i] as Record<string,unknown>),...clean};if(clean.photo===undefined)delete next.photo;if(clean.inflections===undefined)delete next.inflections;if(clean.rection===undefined)delete next.rection;if(clean.informationCheckedAt===undefined)delete next.informationCheckedAt;return next as unknown as {id:string};})};
}
/** IDB cards, six learning records, and rollback snapshot commit in ONE transaction.
 * Legacy localStorage scopes are guarded and mirrored; pending recovery survives a partial failure. */
export async function applySyncSnapshot(expected:Record<string,Json>,target:Record<string,Json>,owner:string){
 const{cards}=validateSyncSnapshot(target);const current=await captureSyncSnapshot();if(canonicalJson(current)!==canonicalJson(expected))throw Error('Bu sırada cihazdaki kayıt değişti. Senkronizasyon yeniden denenecek.');
 const legacyBefore=Object.fromEntries([...LEARNING_KEYS,SYNC_DIRECTION,REMINDER_PREFERENCE].map(k=>[k,localStorage.getItem(k)]));
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{let ended=false;const request=indexedDB.open('wortgarten-local-v1',1);const timer=setTimeout(()=>{ended=true;reject(Error('Yerel veritabanı açılamadı.'));},5000);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};request.onsuccess=()=>{if(ended){request.result.close();return;}clearTimeout(timer);resolve(request.result);};request.onerror=()=>{clearTimeout(timer);reject(request.error);};});
 try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');const requests=['cards',...EXTENDED_KEYS].map(key=>({key,req:store.get(key)}));let remaining=requests.length;let failure:unknown;let aborted=false;
  function abort(error:unknown){if(aborted)return;aborted=true;failure=error;try{tx.abort();}catch{}}
  for(const{req}of requests){req.onerror=()=>abort(req.error);req.onsuccess=()=>{if(--remaining)return;try{
   const actual:Record<string,Json>={};const raw=requests[0].req.result;if(raw?.version!==1||!Array.isArray(raw.cards))throw Error('Cihaz kartları okunamadı.');for(const card of raw.cards)actual['card:'+card.id]=json(card);
   for(const key of LEARNING_KEYS)actual['learning:'+key]=json(exportLearning(localStorage)[key]);
   for(const{key,req}of requests.slice(1)){if(req.result!==undefined){if(req.result.version!==1)throw Error('Cihaz öğrenme kaydı okunamadı.');actual['learning:'+key]=json(req.result.value);}}
   const direction=localStorage.getItem(SYNC_DIRECTION);if(['de-tr','tr-de','mixed'].includes(direction||''))actual['setting:review-direction']=direction;
   try{const preference=JSON.parse(localStorage.getItem(REMINDER_PREFERENCE)||localStorage.getItem('wortgarten-push-v1')||'null');if(reminderPreference(preference))actual['setting:reminder-preferences']={hour:preference.hour,timezone:preference.timezone};}catch{}
   if(canonicalJson(actual)!==canonicalJson(expected))throw Error('Yerel veri senkronizasyon sırasında değişti; üzerine yazılmadı.');
   store.put({version:1,value:{owner,createdAt:Date.now(),before:actual,after:target}},'wortgarten-sync-recovery-v1');
   store.put({version:1,cards},'cards');for(const key of EXTENDED_KEYS){const value=target['learning:'+key];if(value!==undefined)store.put({version:1,value},key);else store.delete(key);}
   for(const key of LEARNING_KEYS){const value=target['learning:'+key];if(value!==undefined)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}
   const reminder=target['setting:reminder-preferences'];if(reminder!==undefined)localStorage.setItem(REMINDER_PREFERENCE,JSON.stringify(reminder));else localStorage.removeItem(REMINDER_PREFERENCE);
   const nextDirection=target['setting:review-direction'];if(typeof nextDirection==='string')localStorage.setItem(SYNC_DIRECTION,nextDirection);else localStorage.removeItem(SYNC_DIRECTION);
  }catch(e){abort(e);}};}
  tx.oncomplete=()=>resolve();tx.onabort=()=>{for(const[key,value]of Object.entries(legacyBefore)){try{const staged=key===SYNC_DIRECTION?(target['setting:review-direction']??null):key===REMINDER_PREFERENCE?(target['setting:reminder-preferences']!==undefined?JSON.stringify(target['setting:reminder-preferences']):null):(target['learning:'+key]!==undefined?JSON.stringify(target['learning:'+key]):null);if(localStorage.getItem(key)===staged){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}catch{}}reject(failure||tx.error||Error('Yerel eşitleme kaydedilemedi; tekrar dene.'));};tx.onerror=()=>{/* onabort reports the durable result */};
 });}finally{db.close();}
 window.dispatchEvent(new Event('wortgarten-learning-changed'));
}
