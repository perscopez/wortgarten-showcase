import {DAILY_SESSION_KEY,readDailySession,dailyTotal} from './daily-vocabulary';
import {parseRuleProgress,parseRuleSession} from './rule-practice';
import {parseTableRecallValue} from './table-recall';
import {parseIntroductions} from './daily-introductions';
import {parseDailyRoute} from './daily-route';
import {readLearningValue,updateLearningValue} from './learning-records';
import {parsePatternProgress} from './pattern-practice';
import {ERROR_LOG_KEY,mergeErrorLogs,parseErrorLog} from './error-log';
import type {DailySession} from './daily-vocabulary';
export const EXTENDED_KEYS=['wortgarten-rules-v1','wortgarten-table-recall-v1','wortgarten-daily-introductions-v1','wortgarten-daily-route-v1','wortgarten-rule-session-v1','wortgarten-table-session-v1',DAILY_SESSION_KEY,'wortgarten-pattern-progress-v1'] as const;
const FILE_BACKUP_KEYS=[...EXTENDED_KEYS,ERROR_LOG_KEY] as const;
function object(v:unknown):v is Record<string,any>{return !!v&&typeof v==='object'&&!Array.isArray(v);}
/** Known record containers only; feature parsers validate contents before use. */
export function validExtendedRecord(key:string,v:unknown){try{if(!object(v)||v.version!==1)return false;if(key===DAILY_SESSION_KEY)return !!readDailySession(JSON.stringify(v),null);if(key==='wortgarten-pattern-progress-v1'){parsePatternProgress(v);return true;}if(key===EXTENDED_KEYS[0]){parseRuleProgress(v);return true;}if(key===EXTENDED_KEYS[1])return parseTableRecallValue(v).valid;if(key===EXTENDED_KEYS[2]){parseIntroductions(v);return true;}if(key===EXTENDED_KEYS[3])return !!parseDailyRoute(v);if(key===EXTENDED_KEYS[4]){if(!object(v.sessions))return false;for(const dto of Object.values(v.sessions))parseRuleSession(dto);return true;}if(key===EXTENDED_KEYS[5])return typeof v.tableId==='string'&&Array.isArray(v.cellIds)&&object(v.signatures)&&Object.values(v.signatures).every(s=>typeof s==='string')&&object(v.values)&&Object.values(v.values).every(s=>typeof s==='string'&&s.length<=80)&&(v.results===null||object(v.results)&&Object.values(v.results).every(o=>['correct','assisted','wrong','revealed'].includes(o)))&&['partial','full'].includes(v.mode)&&Number.isInteger(v.page)&&v.page>=0&&typeof v.hint==='boolean'&&typeof v.token==='string';return false;}catch{return false;}}

export function mergeExtendedRecord(key:string,existing:unknown,incoming:unknown,mode:'computer'|'phone'|'more-attempts'='computer'):unknown{if(!validExtendedRecord(key,incoming))throw Error('Yeni öğrenme yedeği geçersiz.');if(existing===null)return incoming;if(!validExtendedRecord(key,existing))throw Error('Eski öğrenme kaydı okunamadı; değiştirilmedi.');if(key===DAILY_SESSION_KEY){const a=readDailySession(JSON.stringify(existing),null)!,b=readDailySession(JSON.stringify(incoming),null)!;return b.day>a.day||b.day===a.day&&dailyTotal(b)>dailyTotal(a)?b:a;}const a=existing as Record<string,any>,b=incoming as Record<string,any>;if(key===EXTENDED_KEYS[3])return b.day>a.day||b.day===a.day&&(Number(b.completed)>Number(a.completed)||b.completed===a.completed&&(b.stage>a.stage||b.stage===a.stage&&b.elapsedMs>a.elapsedMs))?b:a;const entries=(old:Record<string,any>,phone:Record<string,any>)=>{const out={...old};for(const[id,p]of Object.entries(phone)){if(!old[id]||mode==='phone'||mode==='more-attempts'&&(p?.attempts||0)>(old[id]?.attempts||0))out[id]=p;}return out;};const days=(old:Record<string,string[]>,phone:Record<string,string[]>)=>Object.fromEntries([...new Set([...Object.keys(old||{}),...Object.keys(phone||{})])].map(day=>[day,[...new Set([...(old?.[day]||[]),...(phone?.[day]||[])])]]));if(key==='wortgarten-pattern-progress-v1'){const items=entries(a.items,b.items),keys=Object.keys(items);if(keys.length>3000)for(const k of keys.sort((x,y)=>(items[x]?.last||0)-(items[y]?.last||0)).slice(0,keys.length-3000))delete items[k];return{version:1,items};}if(key===EXTENDED_KEYS[4])return{version:1,sessions:{...b.sessions,...a.sessions}};if(key===EXTENDED_KEYS[0]){const exposures={...b.exposures,...a.exposures};for(const[id,day]of Object.entries(b.exposures||{}))if(!exposures[id]||String(day)>String(exposures[id]))exposures[id]=day;return{...b,...a,items:entries(a.items,b.items),introducedByDay:days(a.introducedByDay,b.introducedByDay),exposures};}if(key===EXTENDED_KEYS[1])return{...a,progress:entries(a.progress,b.progress)};if(key===EXTENDED_KEYS[2]){const days={...b.days};for(const [day,ids]of Object.entries(a.days)){if(!Array.isArray(ids)||!Array.isArray(days[day]||[]))throw Error('Konu kotası yedeği okunamadı.');days[day]=[...new Set([...days[day]||[],...ids])];}return{version:1,days};}return a;}
export async function exportExtendedLearning(includeLocal=false){
 const records:Record<string,unknown>={};
 for(const key of includeLocal?FILE_BACKUP_KEYS:EXTENDED_KEYS){
  const value=await readLearningValue(key);
  if(value!==null)records[key]=value;
 }
 return{version:1,records};
}

function remapDailySession(session:DailySession,cardIds:Record<string,string>):DailySession{
 const remap=(id:string)=>Object.hasOwn(cardIds,id)?cardIds[id]:undefined;
 const remapIds=(ids:string[])=>[...new Set(ids.map(remap).filter((id):id is string=>id!==undefined))];
 const remapItems=<T extends {id:string}>(items:T[])=>items.flatMap(item=>{
  const id=remap(item.id);
  return id===undefined?[]:[{...item,id}];
 });
 const queue=remapItems(session.queue);
 return {
  ...session,queue,answers:remapItems(session.answers),finished:session.finished||!queue.length,
  ...(session.knownIds?{knownIds:remapIds(session.knownIds)}:{}),
  ...(session.newIds?{newIds:remapIds(session.newIds)}:{}),
  ...(session.skipped?{skipped:remapIds(session.skipped)}:{}),
 };
}

export function prepareExtendedLearningImport(input:unknown,cardIds?:Record<string,string>){
 if(input===undefined)return {};
 if(!object(input)||input.version!==1||!object(input.records))throw Error('Öğrenme yedeği okunamadı.');
 const records:Record<string,unknown>={};
 for(const key of FILE_BACKUP_KEYS){
  const value=input.records[key];
  if(value===undefined)continue;
  if(key===ERROR_LOG_KEY){records[key]=parseErrorLog(value);continue;}
  if(!validExtendedRecord(key,value))throw Error('Öğrenme yedeğindeki kayıt geçersiz.');
  const session=key===DAILY_SESSION_KEY&&cardIds&&readDailySession(JSON.stringify(value),null);
  records[key]=session&&cardIds?remapDailySession(session,cardIds):value;
 }
 return records;
}

export async function restoreExtendedLearning(input:unknown,mode:'computer'|'phone'|'more-attempts'='computer',cardIds?:Record<string,string>){
 const records=prepareExtendedLearningImport(input,cardIds);
 for(const [key,incoming] of Object.entries(records)){
  await updateLearningValue(key,existing=>key===ERROR_LOG_KEY
   ?mergeErrorLogs(parseErrorLog(existing),parseErrorLog(incoming))
   :mergeExtendedRecord(key,existing,incoming,mode));
 }
}
