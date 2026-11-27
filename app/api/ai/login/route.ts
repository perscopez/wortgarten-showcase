import {authorizeUrl,randomToken,seal} from '../../../../lib/siwc';
import {config,cookie,TX_COOKIE,noStore} from '../../../../lib/siwc-http';
/** Starts the authorization code + PKCE flow. The verifier and state live in a short-lived sealed cookie. */
export async function GET(req:Request){
 const cfg=config(req);
 if(!cfg)return Response.json({error:'ChatGPT girişi bu sitede etkin değil.'},{status:404,headers:noStore});
 const tx={state:randomToken(),nonce:randomToken(),verifier:randomToken(48)};
 return new Response(null,{status:302,headers:{Location:await authorizeUrl(cfg,tx),'Set-Cookie':cookie(req,TX_COOKIE,await seal(tx,cfg.sessionSecret),600),...noStore}});
}
