import {checkSyncOwner,newSyncState,observeSyncSnapshot,reconcileSync,syncMutations,type SyncState,type Json,type RemoteItem,type SyncMutation} from './sync-engine';
export type SyncProvider={inventory:(owner:string)=>Promise<RemoteItem[]>;commit:(owner:string,ops:SyncMutation[])=>Promise<{accepted:boolean;item:RemoteItem}[]>};
/** Storage implementation MUST serialize update and retain queue with local snapshot atomically. */
export type SyncStore={read:()=>Promise<SyncState|null>;update:(change:(state:SyncState|null)=>SyncState)=>Promise<SyncState>};
export function createSyncCoordinator(owner:string,provider:SyncProvider,store:SyncStore){let flight:Promise<SyncState>|undefined;
 async function observe(snapshot:Record<string,Json>){return store.update(state=>{if(!state)throw Error('Önce bu cihazı doğrulanmış hesabına eşleştir.');return observeSyncSnapshot(state,owner,snapshot);});}
 async function pair(snapshot:Record<string,Json>,confirmed:boolean){if(!confirmed)throw Error('İlk aktarım önizlemesi onaylanmalı.');return store.update(state=>{if(state){checkSyncOwner(state,owner);return state;}return observeSyncSnapshot(newSyncState(owner),owner,snapshot);});}
 function run(){if(flight)return flight;flight=(async()=>{
  let state=await store.read();if(!state)throw Error('Bu cihaz henüz eşlenmedi.');checkSyncOwner(state,owner);
  // Pull before push. Preserve local pending changes and surface remote conflicts.
  const remote=await provider.inventory(owner);state=await store.update(current=>{if(!current)throw Error('Yerel eşleme kayboldu.');return reconcileSync(current,owner,remote);});
  const queued=syncMutations(state,owner);
  for(let i=0;i<queued.length;i+=100){const batch=queued.slice(i,i+100);const response=await provider.commit(owner,batch);
   // The store reducer reads CURRENT state so typing/review during a network request is not lost.
   state=await store.update(current=>{if(!current)throw Error('Yerel eşleme kayboldu.');return reconcileSync(current,owner,response.map(r=>r.item));});
  }
  return state;
 })().finally(()=>{flight=undefined;});return flight;}
 return{pair,observe,run};
}
