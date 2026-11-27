import {siwcConfig,unseal,seal,type SiwcConfig} from './siwc';
export const TX_COOKIE='wg_ai_tx',SESSION_COOKIE='wg_ai_session';
export const config=(req:Request)=>siwcConfig(process.env,new URL(req.url).origin);
export function readCookie(req:Request,name:string){
 const raw=req.headers.get('cookie')||'';
 for(const part of raw.split(/;\s*/)){const i=part.indexOf('=');if(i>0&&part.slice(0,i)===name){try{return decodeURIComponent(part.slice(i+1));}catch{return undefined;}}}
 return undefined;
}
export function cookie(req:Request,name:string,value:string,maxAge:number){
 const secure=new URL(req.url).protocol==='https:'||req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()==='https'?'; Secure':'';
 return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export const clearCookie=(req:Request,name:string)=>cookie(req,name,'',0);
export type SessionData={rt:string};
export async function readSession(req:Request,cfg:SiwcConfig){const s=await unseal<SessionData>(readCookie(req,SESSION_COOKIE),cfg.sessionSecret);return typeof s?.rt==='string'&&s.rt.length>0?s:null;}
export async function sessionCookie(req:Request,cfg:SiwcConfig,rt:string){return cookie(req,SESSION_COOKIE,await seal({rt},cfg.sessionSecret),60*60*24*30);}
export const noStore={'Cache-Control':'no-store'};
