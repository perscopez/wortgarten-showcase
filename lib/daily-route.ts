import {learningDay} from './daily-introductions';
export const DAILY_ROUTE_KEY='wortgarten-daily-route-v1';
export const ROUTE_STAGES=[{id:'recall',title:'Dünden hatırla',minutes:2},{id:'table',title:'Tabloyu tamamla',minutes:5},{id:'rule',title:'Kuralı geri çağır',minutes:5},{id:'transfer',title:'Yeni cümleye aktar',minutes:3}] as const;
export type DailyRoute={version:1;day:string;stage:number;elapsedMs:number;completed:boolean;updatedAt:number};
export function newDailyRoute(now=Date.now()):DailyRoute{return{version:1,day:learningDay(now),stage:0,elapsedMs:0,completed:false,updatedAt:now};}
export function parseDailyRoute(value:unknown):DailyRoute|null{if(value===null)return null;const p=value as DailyRoute;if(p?.version!==1||!/^\d{4}-\d{2}-\d{2}$/.test(p.day)||!Number.isInteger(p.stage)||p.stage<0||p.stage>=ROUTE_STAGES.length||!Number.isFinite(p.elapsedMs)||p.elapsedMs<0||p.elapsedMs>86400000||typeof p.completed!=='boolean'||!Number.isFinite(p.updatedAt))throw Error('Günlük rota kaydı okunamadı; mevcut kayıt korunuyor.');return p;}
export function addActiveTime(route:DailyRoute,milliseconds:number,now=Date.now()):DailyRoute{return{...route,elapsedMs:Math.min(86400000,route.elapsedMs+Math.max(0,Math.min(10000,milliseconds))),updatedAt:now};}
export function moveDailyRoute(route:DailyRoute,now=Date.now()):DailyRoute{return route.stage>=ROUTE_STAGES.length-1?{...route,completed:true,updatedAt:now}:{...route,stage:route.stage+1,updatedAt:now};}
export function routeTimeLeft(route:DailyRoute){return Math.max(0,15*60000-route.elapsedMs);}
export function minKnownDue(...values:(number|null|undefined)[]):number|null{const finite=values.filter((x):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0);return finite.length?Math.min(...finite):null;}
