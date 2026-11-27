import {revoke} from '../../../../lib/siwc';
import {clearCookie,config,readSession,SESSION_COOKIE,noStore} from '../../../../lib/siwc-http';
export async function POST(req:Request){
 const cfg=config(req);
 if(cfg){const s=await readSession(req,cfg);if(s)await revoke(cfg,s.rt);}
 return Response.json({ok:true},{headers:{'Set-Cookie':clearCookie(req,SESSION_COOKIE),...noStore}});
}
