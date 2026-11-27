import {config,readSession,noStore} from '../../../../lib/siwc-http';
/** Is ChatGPT sign-in available here, and is this browser signed in? Never returns a token. */
export async function GET(req:Request){
 const cfg=config(req);
 if(!cfg)return Response.json({configured:false,signedIn:false},{headers:noStore});
 return Response.json({configured:true,signedIn:!!(await readSession(req,cfg))},{headers:noStore});
}
