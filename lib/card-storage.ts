/** Durable local card storage. Network synchronization is a separate, opt-in layer. */
export const LEGACY_CARDS_KEY='wortgarten-v1';
export type CardAdapter<T>={read:()=>Promise<T[]|null>;write:(cards:T[])=>Promise<void>;initialize?:(cards:T[])=>Promise<T[]>;update?:(change:(cards:T[])=>T[])=>Promise<T[]>};
type LegacyStorage={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void};
export function createCardRepository<T>({legacy,primary}:{legacy:LegacyStorage;primary?:CardAdapter<T>}){
 let adapter:CardAdapter<T>|undefined;let current:T[]=[];let loaded=false;let pending:Promise<unknown>=Promise.resolve();let location:'IndexedDB'|'localStorage'='localStorage';
 const fallback:CardAdapter<T>={async read(){const raw=legacy.getItem(LEGACY_CARDS_KEY);if(raw===null)return null;const data=JSON.parse(raw);if(!Array.isArray(data))throw Error('Eski kelime kaydı geçerli bir liste değil.');return data},async write(cards){legacy.setItem(LEGACY_CARDS_KEY,JSON.stringify(cards))}};
 return {
  async load(seeds:T[]){let stored:T[]|null=null;let primaryAvailable=false;if(primary){stored=await primary.read();primaryAvailable=true}
   if(stored!==null){if(!Array.isArray(stored))throw Error('Kelime kaydı okunamadı; eski veriler korunuyor.');adapter=primary;location='IndexedDB';current=stored;loaded=true;return {cards:current,location};}
   const old=await fallback.read();current=old===null?seeds:old;
   if(primary&&primaryAvailable){
    if(primary.initialize){
     try{current=await primary.initialize(current);adapter=primary;location='IndexedDB';}
     catch(error){
      if((error as {name?:string}|null)?.name!=='QuotaExceededError')throw error;
      const installed=await primary.read();
      if(installed!==null){current=installed;adapter=primary;location='IndexedDB';}
      else{adapter=fallback;location='localStorage';}
     }
    }
    else{try{await primary.write(current);adapter=primary;location='IndexedDB'}catch{adapter=fallback;location='localStorage'}}
   }else adapter=fallback;
   loaded=true;return {cards:current,location};
  },
  /** The update is evaluated against the last committed state, not a stale render. */
  update(change:T[]|((previous:T[])=>T[])):Promise<T[]>{const job=pending.catch(()=>{}).then(async()=>{if(!loaded||!adapter)throw Error('Yerel kayıt henüz hazır değil.');const calculate=(previous:T[])=>{const next=typeof change==='function'?change(previous):change;if(!Array.isArray(next))throw Error('Geçersiz kelime listesi.');return next;};const next=adapter.update?await adapter.update(calculate):calculate(current);if(!adapter.update)await adapter.write(next);current=next;return next});pending=job;return job;},
  refresh():Promise<T[]>{const job=pending.catch(()=>{}).then(async()=>{if(!loaded||!adapter)throw Error('Yerel kayıt hazır değil.');const latest=await adapter.read();if(latest===null)throw Error('Yerel kayıt kayboldu; değiştirilmedi.');current=latest;return current;});pending=job;return job;},
  get location(){return location},
 };
}
export function indexedCardAdapter<T>(factory:IDBFactory):CardAdapter<T>{
 let connection:Promise<IDBDatabase>|undefined;
 function open(){if(connection)return connection;connection=new Promise<IDBDatabase>((resolve,reject)=>{let ended=false;const request=factory.open('wortgarten-local-v1',1);const timeout=setTimeout(()=>{ended=true;connection=undefined;reject(Error('Yerel veritabanı açılamadı.'))},5000);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records')};request.onsuccess=()=>{if(ended){request.result.close();return}clearTimeout(timeout);const db=request.result;db.onversionchange=()=>{db.close();connection=undefined};db.onclose=()=>{connection=undefined;};resolve(db)};request.onerror=()=>{clearTimeout(timeout);connection=undefined;reject(request.error||Error('Yerel veritabanı açılamadı.'))};request.onblocked=()=>{/* timeout retains existing data; never delete a database */}});return connection;}
 async function mutate(change:(cards:T[]|null)=>T[],onlyIfMissing=false){
  const db=await open();
  return new Promise<T[]>((resolve,reject)=>{
   const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),req=store.get('cards');
   let next:T[],failure:unknown;
   req.onsuccess=()=>{
    try{
     const record=req.result;
     if(record!==undefined&&(record?.version!==1||!Array.isArray(record.cards)))throw Error('Kelime kaydı okunamadı.');
     const before:T[]|null=record===undefined?null:record.cards;
     next=change(before);
     if(!Array.isArray(next))throw Error('Geçersiz kelime listesi.');
     if(before===null||!onlyIfMissing)store.put({version:1,cards:next},'cards');
    }catch(e){failure=e;tx.abort();}
   };
   req.onerror=()=>{failure=req.error;};
   tx.oncomplete=()=>resolve(next);
   tx.onabort=()=>reject(failure||tx.error||Error('Kelime güncellenemedi.'));
  });
 }
 return {
  initialize:cards=>mutate(current=>current??cards,true),
  update:change=>mutate(current=>{if(current===null)throw Error('Kelime kaydı okunamadı.');return change(current);}),
  async read(){const db=await open();return new Promise<T[]|null>((resolve,reject)=>{const transaction=db.transaction('records','readonly');const request=transaction.objectStore('records').get('cards');request.onsuccess=()=>{const record=request.result;if(record===undefined){resolve(null);return}if(record?.version!==1||!Array.isArray(record.cards)){reject(Error('Kelime kaydı geçersiz.'));return}resolve(record.cards)};request.onerror=()=>reject(request.error);transaction.onabort=()=>reject(transaction.error||Error('Kelime kaydı okunamadı.'))})},
  async write(cards){await mutate(()=>cards);},
 };
}
export function cardStorageError(error:unknown){const e=error as {name?:string};return e?.name==='QuotaExceededError'?'Cihazın site depolama alanı dolu. Bu değişiklik kaydedilmedi; eski kelimelerin korunuyor. Yedek al ve cihazda boş alan aç. Tarayıcı/site verilerini silme.':'Bu değişiklik cihazda kalıcı kaydedilemedi. Eski kelimelerin korunuyor; tekrar dene veya yedek al. Tarayıcı/site verilerini silme.';}
