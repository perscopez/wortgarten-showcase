/** Session navigation only. These helpers never touch review counters, outcomes or due dates. */
export type SessionSize=5|10;
export function sessionSize(value:unknown):SessionSize{return value===10?10:5;}
export function shortSessionIds(ids:string[],size:SessionSize=5){return [...new Set(ids)].slice(0,sessionSize(size));}
export function skipSessionItem(ids:string[]){return ids.slice(1);}
export function deferSessionItem(ids:string[]){return ids.length>1?[...ids.slice(1),ids[0]]:[...ids];}
export function nextSessionCandidates<T extends {id:string}>(items:T[],excluded:string[],max:number){const ignore=new Set(excluded);return items.filter(item=>!ignore.has(item.id)).slice(0,Math.max(0,Math.floor(max)));}
export function sessionRemaining(limit:number,answered:number){return Math.max(0,sessionSize(limit)-Math.max(0,answered));}
