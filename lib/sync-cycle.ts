import {canonicalJson,materializeSync,rebaseDuringSync,type SyncState,type Json} from './sync-engine';
import {createSyncCoordinator,type SyncProvider,type SyncStore} from './sync-coordinator';
type Snapshot=Record<string,Json>;
export type SyncDevice={capture:()=>Promise<Snapshot>;apply:(expected:Snapshot,target:Snapshot,owner:string)=>Promise<void>;canApply:()=>boolean};
/** Durable receive checkpoint prevents a crash between cloud pull and local apply from reverting cloud data. */
export async function runSyncCycle(owner:string,provider:SyncProvider,store:SyncStore,device:SyncDevice):Promise<{state:SyncState;applied:boolean;waiting:boolean}>{
 let state=await store.read();if(!state)throw Error('Önce bu cihazı hesabına bağla.');
 async function mirror(){
  if(!state?.mirror)return false;if(!device.canApply())return false;
  const current=await device.capture();let {expected,target}=state.mirror;
  if(canonicalJson(current)!==canonicalJson(target)){
   if(canonicalJson(current)!==canonicalJson(expected)){
    state=await store.update(s=>{if(!s?.mirror)throw Error('Eşitleme kontrol noktası değişti.');const rebased=rebaseDuringSync(s,owner,s.mirror.expected,current);return{...rebased,mirror:{expected:current,target:materializeSync(rebased,owner)}};});
    expected=state.mirror!.expected;target=state.mirror!.target;
   }
   if(canonicalJson(current)!==canonicalJson(target)){
    if(!device.canApply())return false;
    await device.apply(expected,target,owner);
   }
  }
  state=await store.update(s=>{if(!s)throw Error('Yerel eşleme kayboldu.');return{...s,mirror:undefined};});return true;
 }
 if(state.mirror){const applied=await mirror();return{state:state!,applied,waiting:!applied};}
 const before=await device.capture(),coordinator=createSyncCoordinator(owner,provider,store);await coordinator.observe(before);state=await coordinator.run();
 const current=await device.capture();state=await store.update(s=>{if(!s)throw Error('Yerel eşleme kayboldu.');const next=rebaseDuringSync(s,owner,before,current);const target=materializeSync(next,owner);return canonicalJson(target)===canonicalJson(current)?next:{...next,mirror:{expected:current,target}};});
 const applied=await mirror();return{state:state!,applied,waiting:!!state!.mirror};
}
