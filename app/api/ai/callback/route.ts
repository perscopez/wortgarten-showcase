import {exchangeCode,hasPlanScope,unseal} from '../../../../lib/siwc';
import {clearCookie,config,readCookie,sessionCookie,TX_COOKIE} from '../../../../lib/siwc-http';
type Tx={state:string;nonce:string;verifier:string};
/** Validates state, exchanges the code on the server and keeps only the (rotating) refresh token, sealed in an HttpOnly cookie. */
export async function GET(req:Request){
 const cfg=config(req);const home=(flag:string,extra:string[]=[])=>{const h=new Headers({Location:'/?ai='+flag,'Cache-Control':'no-store'});h.append('Set-Cookie',clearCookie(req,TX_COOKIE));for(const c of extra)h.append('Set-Cookie',c);return new Response(null,{status:302,headers:h});};
 if(!cfg)return home('off');
 const p=new URL(req.url).searchParams;
 if(p.get('error'))return home('denied');
 const tx=await unseal<Tx>(readCookie(req,TX_COOKIE),cfg.sessionSecret);
 const code=p.get('code')||'';
 if(!tx||!code||!p.get('state')||p.get('state')!==tx.state)return home('failed');
 try{
  const tokens=await exchangeCode(cfg,code,tx.verifier);
  // Signing in is not the same as being allowed to use the plan: the plan scope must be granted.
  if(!hasPlanScope(tokens.scope)||!tokens.refresh_token)return home('no-plan');
  return home('ok',[await sessionCookie(req,cfg,tokens.refresh_token)]);
 }catch{return home('failed');}
}
