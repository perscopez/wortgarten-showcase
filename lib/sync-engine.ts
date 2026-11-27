/** Provider-independent CAS state. Contains private data: persist locally, never log. */
import {isMergeCard,mergeCardVersions} from './card-merge';
import {LEARNING_KEYS} from './learning-backup';
export type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
export type SyncValue={deleted:boolean;body:Json};
export type RemoteItem=SyncValue&{key:string;version:number};
export type SyncSlot={base:RemoteItem|null;pending?:SyncValue;conflict?:RemoteItem};
export type SyncState={version:1;owner:string;items:Record<string,SyncSlot>;mirror?:{expected:Record<string,Json>;target:Record<string,Json>}};
export type SyncMutation=SyncValue&{key:string;expected_version:number};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertOwner(owner:string){if(!UUID.test(owner))throw Error('Doğrulanmış hesap kimliği gerekli.');}
export function assertEntityKey(key:string){if(!/^(card|learning|setting):[^\u0000-\u001f\u007f]{1,500}$/.test(key)||key.includes('__proto__'))throw Error('Geçersiz senkronizasyon anahtarı.');}
export function canonicalJson(value:Json):string{if(value===null||typeof value!=='object'){const text=JSON.stringify(value);if(text===undefined||typeof value==='number'&&!Number.isFinite(value))throw Error('Geçersiz veri.');return text;}if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalJson(value[k])).join(',')+'}';}
export function equalValue(a:SyncValue,b:SyncValue){return a.deleted===b.deleted&&(a.deleted||canonicalJson(a.body)===canonicalJson(b.body));}
export function newSyncState(owner:string):SyncState{assertOwner(owner);return{version:1,owner,items:{}};}
export function checkSyncOwner(state:SyncState,owner:string){assertOwner(owner);if(state.version!==1||state.owner!==owner)throw Error('Bu yerel eşleme başka bir hesaba ait. Otomatik aktarım durduruldu.');}
export function validRemoteItem(value:unknown):value is RemoteItem{try{const v=value as RemoteItem;assertEntityKey(v.key);return Number.isSafeInteger(v.version)&&v.version>0&&typeof v.deleted==='boolean'&&(canonicalJson(v.body).length<=2000000);}catch{return false;}}
function record(value:Json):value is Record<string,Json>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function same(a:Json|undefined,b:Json|undefined){return a===undefined||b===undefined?a===b:canonicalJson(a)===canonicalJson(b);}
const reviewFields=['due','interval','reviews','reviewState'];
const definitionFields=['word','article','plural','meaning','partOfSpeech','articleAmbiguous','example','translation','inflections','rection','source','photo','patterns'];
const enrichmentFields=['inflections','rection','source','photo'];
function fieldsOf(body:Record<string,Json>,keys:string[]){return Object.fromEntries(keys.filter(key=>Object.hasOwn(body,key)).map(key=>[key,body[key]]));}

/** Independently installed catalog cards only. Keep real edits and two sets of reviews visible. */
function mergeCatalogCard(local:Record<string,Json>,remote:Record<string,Json>){
 const metadata=['created','informationCheckedAt',...reviewFields,...enrichmentFields];
 const content=(card:Record<string,Json>)=>Object.fromEntries(Object.entries(card).filter(([key])=>!metadata.includes(key)));
 if(!same(content(local),content(remote)))return;
 const left=fieldsOf(local,reviewFields),right=fieldsOf(remote,reviewFields);
 if(local.reviews!==0&&remote.reviews!==0&&!same(left,right))return;
 const merged={...content(remote),...(remote.reviews===0?left:right)};
 for(const key of enrichmentFields){
  const a=local[key],b=remote[key];
  if(a!==undefined&&b!==undefined&&!same(a,b))return;
  if(b!==undefined)merged[key]=b;
  else if(a!==undefined)merged[key]=a;
 }
 for(const [key,extreme] of [['created',Math.min],['informationCheckedAt',Math.max]] as const){
  const values=[local[key],remote[key]].filter((value):value is number=>typeof value==='number');
  if(values.length)merged[key]=extreme(...values);
 }
 return merged;
}

function mergeRecordChanges(base:Record<string,Json>,local:Record<string,Json>,remote:Record<string,Json>,relatedFields:string[][]=[],preferred?:Record<string,Json>){
 const fields=[...new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])];
 const groups=[...relatedFields,...fields.filter(key=>!relatedFields.some(group=>group.includes(key))).map(key=>[key])];
 const entries:[string,Json][]=[];
 for(const keys of groups){
  const old=fieldsOf(base,keys),left=fieldsOf(local,keys),right=fieldsOf(remote,keys);
  if(same(left,right)||same(old,left))entries.push(...Object.entries(right));
  else if(same(old,right))entries.push(...Object.entries(left));
  else if(preferred)entries.push(...Object.entries(fieldsOf(preferred,keys)));
  else return;
 }
 return Object.fromEntries(entries);
}

function mergeDayArrays(left:Json|undefined,right:Json|undefined){
 if(!record(left??null)||!record(right??null))return;
 const out:Record<string,Json>={};
 for(const day of new Set([...Object.keys(left as Record<string,Json>),...Object.keys(right as Record<string,Json>)])){
  const a=(left as Record<string,Json>)[day]??[],b=(right as Record<string,Json>)[day]??[];
  if(!Array.isArray(a)||!Array.isArray(b)||!a.every(x=>typeof x==='string')||!b.every(x=>typeof x==='string'))return;
  out[day]=[...new Set([...(b as string[]),...(a as string[])])];
 }
 return out;
}

/** Independent exercises can sync together. Overlapping attempts still need a decision. */
function mergeLearningProgress(key:string,base:Record<string,Json>,local:Record<string,Json>,remote:Record<string,Json>){
 const name=key.slice('learning:'.length);
 if(LEARNING_KEYS.slice(0,3).some(k=>k===name))return mergeRecordChanges(base,local,remote);
 const field=name===LEARNING_KEYS[3]||name==='wortgarten-table-recall-v1'?'progress':name==='wortgarten-pattern-progress-v1'?'items':name==='wortgarten-rule-session-v1'?'sessions':null;
 if(field){
  const entryMap=(body:Record<string,Json>)=>body.version===1&&Object.keys(body).length===2&&Object.hasOwn(body,field)&&record(body[field])?body[field]:undefined;
  const old=entryMap(base),left=entryMap(local),right=entryMap(remote);
  if(!old||!left||!right)return;
  const merged=mergeRecordChanges(old,left,right);
  if(!merged)return;
  if(name==='wortgarten-pattern-progress-v1'){
   const keys=Object.keys(merged);
   if(keys.length>3000)for(const k of keys.sort((a,b)=>(Number((merged[a] as any)?.last)||0)-(Number((merged[b] as any)?.last)||0)).slice(0,keys.length-3000))delete merged[k];
  }
  return{version:1,[field]:merged};
 }
 if(name==='wortgarten-rules-v1'){
  if(local.version!==1||remote.version!==1||!record(local.items)||!record(remote.items))return;
  const oldItems=record(base.items)?base.items:{};
  const items=mergeRecordChanges(oldItems,local.items,remote.items);
  const introducedByDay=mergeDayArrays(local.introducedByDay??{},remote.introducedByDay??{});
  if(!items||!introducedByDay)return;
  const expA=record(local.exposures??null)?local.exposures as Record<string,Json>:undefined;
  const expB=record(remote.exposures??null)?remote.exposures as Record<string,Json>:undefined;
  let exposures:Record<string,Json>|undefined;
  if(expA||expB){
   exposures={};
   for(const id of new Set([...Object.keys(expA||{}),...Object.keys(expB||{})])){
    const da=expA?.[id],db=expB?.[id];
    const pick=typeof da==='string'&&typeof db==='string'?(da>=db?da:db):(typeof da==='string'?da:db);
    if(typeof pick!=='string')return;
    exposures[id]=pick;
   }
  }
  return{version:1,items,introducedByDay,...(exposures?{exposures}:{})};
 }
 if(name==='wortgarten-daily-introductions-v1'){
  if(local.version!==1||remote.version!==1)return;
  const days=mergeDayArrays(local.days,remote.days);
  return days?{version:1,days}:undefined;
 }
 if(name==='wortgarten-table-session-v1'){
  if(same(local,remote)||same(base,local))return remote;
  if(same(base,remote))return local;
  return;
 }
 if(name==='wortgarten-daily-route-v1'){
  if(same(local,remote)||same(base,local))return remote;
  if(same(base,remote))return local;
  if(typeof local.day!=='string'||typeof remote.day!=='string')return;
  if(local.day!==remote.day)return local.day>remote.day?local:remote;
  const rank=(r:Record<string,Json>)=>[r.completed===true?1:0,Number(r.stage)||0,Number(r.elapsedMs)||0];
  const [ca,sa,ea]=rank(local),[cb,sb,eb]=rank(remote);
  if(ca>=cb&&sa>=sb&&ea>=eb)return local;
  if(cb>=ca&&sb>=sa&&eb>=ea)return remote;
  return;
 }
 if(name==='wortgarten-daily-vocabulary-v1'){
  if(same(local,remote)||same(base,local))return remote;
  if(same(base,remote))return local;
  if(typeof local.day!=='string'||typeof remote.day!=='string')return;
  if(local.day!==remote.day)return local.day>remote.day?local:remote;
  if(!Array.isArray(local.answers)||!Array.isArray(remote.answers))return;
  const total=(r:Record<string,Json>)=>(Number(r.earlier)||0)+(Number(r.elapsed)||0);
  const isPrefix=(short:Json[],long:Json[])=>short.length<=long.length&&short.every((x,i)=>same(x,long[i]));
  if(isPrefix(local.answers,remote.answers)&&total(remote)>=total(local))return remote;
  if(isPrefix(remote.answers,local.answers)&&total(local)>=total(remote))return local;
  return;
 }
}

function mergeConcurrent(key:string,base:SyncValue|null,local:SyncValue,remote:SyncValue):SyncValue|undefined{
 if(local.deleted||remote.deleted||!record(local.body)||!record(remote.body))return;
 if(base&&(base.deleted||!record(base.body)))return;
 const old=base?.body;
 let body:Record<string,Json>|undefined;
 if(key.startsWith('learning:')){
  const name=key.slice(9);
  const empty:Record<string,Json>=name===LEARNING_KEYS[3]||name==='wortgarten-table-recall-v1'?{version:1,progress:{}}:name==='wortgarten-pattern-progress-v1'?{version:1,items:{}}:name==='wortgarten-rule-session-v1'?{version:1,sessions:{}}:name==='wortgarten-rules-v1'?{version:1,items:{},introducedByDay:{}}:name==='wortgarten-daily-introductions-v1'?{version:1,days:{}}:{};
  body=mergeLearningProgress(key,old&&record(old)?old:empty,local.body,remote.body);
 }
 if(key.startsWith('card:')){
  const preferred=isMergeCard(local.body)&&isMergeCard(remote.body)&&local.body.id===remote.body.id
   ?JSON.parse(JSON.stringify(mergeCardVersions(remote.body,local.body))) as Record<string,Json>
   :undefined;
  const isCatalog=/^card:(seed|pack)-/.test(key)&&local.body.id===key.slice(5)&&remote.body.id===key.slice(5);
  if(old&&record(old))body=mergeRecordChanges(old,local.body,remote.body,[reviewFields,definitionFields],preferred);
  else if(isCatalog){
   body=mergeCatalogCard(local.body,remote.body);
   if(!body&&(local.body.reviews===0||remote.body.reviews===0))body=preferred;
  }
  else body=preferred;
 }
 return body?{deleted:false,body}:undefined;
}
/** Snapshot must be complete. Only call after explicit first pairing; never on an unready/empty UI. */
export function observeSyncSnapshot(state:SyncState,owner:string,snapshot:Record<string,Json>):SyncState{
 checkSyncOwner(state,owner);const items={...state.items};
 for(const key of new Set([...Object.keys(items),...Object.keys(snapshot)])){
  assertEntityKey(key);const slot=items[key]||{base:null};const present=Object.hasOwn(snapshot,key);
  const value:SyncValue=present?{deleted:false,body:snapshot[key]}:{deleted:true,body:null};
  if(!present&&!slot.base&&!slot.conflict){delete items[key];continue;}
  const prior=slot.pending||slot.base;
  if(prior&&equalValue(prior,value))continue;
  items[key]={...slot,pending:value};
  if(slot.base&&equalValue(slot.base,value)&&!slot.conflict)items[key]={base:slot.base};
 }
 return{...state,items};
}
/** Full server inventory, including tombstones. Missing rows are NOT deletion signals. */
export function reconcileSync(state:SyncState,owner:string,remote:RemoteItem[]):SyncState{
 checkSyncOwner(state,owner);const items={...state.items};const seen=new Set<string>();
 for(const row of remote){if(!validRemoteItem(row)||seen.has(row.key))throw Error('Sunucu senkronizasyon yanıtı geçersiz.');seen.add(row.key);const slot=items[row.key]||{base:null};
  if(slot.base&&row.version<slot.base.version)continue;
  if(slot.pending){
   if(equalValue(slot.pending,row))items[row.key]={base:row};
   else if((slot.base?.version||0)!==row.version){
    const merged=mergeConcurrent(row.key,slot.base,slot.pending,row);
    items[row.key]=merged
     ?equalValue(merged,row)?{base:row}:{base:row,pending:merged}
     :{...slot,conflict:row};
   }
  }
  else items[row.key]={base:row};
 }
 return{...state,items};
}
export function syncMutations(state:SyncState,owner:string):SyncMutation[]{checkSyncOwner(state,owner);return Object.entries(state.items).filter(([,s])=>s.pending&&!s.conflict).map(([key,s])=>({key,expected_version:s.base?.version||0,...s.pending!}));}
export function resolveSyncConflict(state:SyncState,owner:string,key:string,choice:'local'|'remote'):SyncState{
 checkSyncOwner(state,owner);const slot=state.items[key];if(!slot?.conflict)throw Error('Çözülecek çakışma yok.');return{...state,items:{...state.items,[key]:choice==='remote'?{base:slot.conflict}:{base:slot.conflict,pending:slot.pending}}};
}
export function materializeSync(state:SyncState,owner:string):Record<string,Json>{checkSyncOwner(state,owner);const output:Record<string,Json>={};for(const[key,s]of Object.entries(state.items)){const v=s.pending||s.base;if(v&&!v.deleted)output[key]=v.body;}return output;}

/** Local writes made during network I/O are retained; overlapping remote edits become explicit conflicts. */
export function rebaseDuringSync(state:SyncState,owner:string,before:Record<string,Json>,now:Record<string,Json>):SyncState{
 checkSyncOwner(state,owner);const items={...state.items};
 for(const key of new Set([...Object.keys(before),...Object.keys(now)])){
  const oldPresent=Object.hasOwn(before,key),present=Object.hasOwn(now,key);
  if(oldPresent===present&&(!present||same(before[key],now[key])))continue;
  const slot=items[key]||{base:null};
  const local:SyncValue=present?{deleted:false,body:now[key]}:{deleted:true,body:null};
  const old:SyncValue=oldPresent?{deleted:false,body:before[key]}:{deleted:true,body:null};
  const remote=slot.conflict??slot.base;
  if(!remote||equalValue(remote,old)){items[key]={...slot,pending:local};continue;}
  if(equalValue(remote,local)){items[key]={base:remote};continue;}
  const merged=mergeConcurrent(key,oldPresent?old:null,local,remote);
  items[key]=merged
   ?equalValue(merged,remote)?{base:remote}:{base:remote,pending:merged}
   :{base:slot.base,pending:local,conflict:remote};
 }
 return{...state,items};
}
