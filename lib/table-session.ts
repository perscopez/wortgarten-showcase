/** Additive version-1 checkpoint metadata. Legacy page size and attempt token are never renumbered. */
import {sessionSize} from './short-session';
export function restoreTableSessionNavigation(saved:any,knownIds:string[]){
 const size=saved.pageSize===undefined?12:saved.pageSize;if(![5,10,12].includes(size))throw Error('Tablo taslağı bölüm boyutu geçersiz.');
 if(saved.limit!==undefined&&saved.limit!==5&&saved.limit!==10)throw Error('Tablo oturum sınırı geçersiz.');
 for(const key of ['sessionCount','sessionCorrect'])if(saved[key]!==undefined&&(!Number.isInteger(saved[key])||saved[key]<0||saved[key]>10000))throw Error('Tablo oturum sayacı geçersiz.');
 const allowed=new Set(knownIds);const safeIds=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=knownIds.length&&new Set(v).size===v.length&&v.every(id=>typeof id==='string'&&allowed.has(id));
 for(const key of ['excluded','omitted','skipped','deferred','deferredQueue','sessionIds'])if(saved[key]!==undefined&&!safeIds(saved[key]))throw Error('Tablo oturumunun atlama listesi geçersiz; taslak korunuyor.');
 const ids=saved.sessionIds||saved.cellIds.slice(saved.page*size,saved.page*size+size);
 if(size!==12&&ids.length>sessionSize(saved.limit))throw Error('Tablo oturum havuzu sınırı aşıyor.');
 return{pageSize:size,limit:sessionSize(saved.limit),legacy:size===12,sessionIds:ids as string[],excluded:(saved.excluded||[]) as string[],omitted:(saved.omitted||[]) as string[],skipped:(saved.skipped||[]) as string[],deferred:(saved.deferred||[]) as string[],deferredQueue:(saved.deferredQueue||[]) as string[]};
}
