import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const load=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require','TextEncoder','TextDecoder','crypto','fetch','process',f.text)(mod,mod.exports,require,TextEncoder,TextDecoder,globalThis.crypto,(...a)=>globalThis.fetch(...a),process);return mod.exports;};
const siwc=load('lib/siwc.ts'),http=load('lib/siwc-http.ts');
const routes={status:load('app/api/ai/status/route.ts'),login:load('app/api/ai/login/route.ts'),callback:load('app/api/ai/callback/route.ts'),check:load('app/api/ai/check/route.ts'),logout:load('app/api/ai/logout/route.ts')};
const ORIGIN='https://wg.example',SECRET='s'.repeat(40);
const withEnv=async(env,fn)=>{const old={...process.env};Object.assign(process.env,env);try{return await fn();}finally{for(const k of Object.keys(env))if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}};
const ON={OPENAI_SIWC_CLIENT_ID:'oaiapp_test',SIWC_SESSION_SECRET:SECRET};
const req=(path,init={})=>new Request(ORIGIN+path,init);
const cookieOf=res=>res.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');

test('without configuration every AI route is off',async()=>{
 delete process.env.OPENAI_SIWC_CLIENT_ID;
 assert.deepEqual(await (await routes.status.GET(req('/api/ai/status'))).json(),{configured:false,signedIn:false});
 assert.equal((await routes.login.GET(req('/api/ai/login'))).status,404);
 assert.equal((await routes.check.POST(req('/api/ai/check',{method:'POST',body:'{}'}))).status,404);
});
test('login redirects to OpenAI with PKCE and sets a sealed HttpOnly transaction cookie',async()=>withEnv(ON,async()=>{
 const res=await routes.login.GET(req('/api/ai/login'));
 assert.equal(res.status,302);const loc=new URL(res.headers.get('location'));assert.equal(loc.origin,'https://auth.openai.com');assert.equal(loc.searchParams.get('code_challenge_method'),'S256');
 const set=res.headers.getSetCookie()[0];assert.match(set,/HttpOnly/);assert.match(set,/SameSite=Lax/);assert.match(set,/Secure/);
 assert.ok(!set.includes(loc.searchParams.get('state')),'the state is sealed, not readable');
}));
test('callback rejects a wrong state and an error answer, and never stores a session',async()=>withEnv(ON,async()=>{
 const login=await routes.login.GET(req('/api/ai/login'));const tx=cookieOf(login);
 const bad=await routes.callback.GET(req('/api/ai/callback?code=c&state=nope',{headers:{cookie:tx}}));
 assert.equal(bad.headers.get('location'),'/?ai=failed');assert.ok(!bad.headers.getSetCookie().some(c=>c.startsWith('wg_ai_session=')&&!/Max-Age=0/.test(c)));
 assert.equal((await routes.callback.GET(req('/api/ai/callback?error=access_denied'))).headers.get('location'),'/?ai=denied');
}));
async function signIn(scope){
 const login=await routes.login.GET(req('/api/ai/login'));const state=new URL(login.headers.get('location')).searchParams.get('state');
 const real=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({access_token:'at',refresh_token:'rt1',scope}),{status:200});
 try{return await routes.callback.GET(req('/api/ai/callback?code=c&state='+state,{headers:{cookie:cookieOf(login)}}));}finally{globalThis.fetch=real;}
}
test('callback stores the refresh token only when the plan scope was granted',async()=>withEnv(ON,async()=>{
 const ok=await signIn('openid chatgpt.tokens.use.direct');assert.equal(ok.headers.get('location'),'/?ai=ok');
 const session=ok.headers.getSetCookie().find(c=>c.startsWith('wg_ai_session=')&&!/Max-Age=0/.test(c));assert.ok(session);assert.match(session,/HttpOnly/);assert.ok(!session.includes('rt1'),'sealed');
 const no=await signIn('openid email');assert.equal(no.headers.get('location'),'/?ai=no-plan');assert.ok(!no.headers.getSetCookie().some(c=>c.startsWith('wg_ai_session=')&&!/Max-Age=0/.test(c)));
}));
test('the check route refreshes, rotates the cookie, calls the Responses API and returns parsed feedback',async()=>withEnv({...ON,OPENAI_SIWC_MODEL:'m-test'},async()=>{
 const cfg=siwc.siwcConfig(process.env,ORIGIN);const sealed=await siwc.seal({rt:'rt-old'},cfg.sessionSecret);
 const seen=[];const real=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{seen.push(String(url));
  if(String(url).includes('oauth/token'))return new Response(JSON.stringify({access_token:'AT',refresh_token:'rt-new'}),{status:200});
  return new Response(new ReadableStream({start(c){const e=t=>c.enqueue(new TextEncoder().encode('data: '+JSON.stringify(t)+'\n\n'));e({type:'response.output_text.delta',delta:'{"verdict":"kucuk-hata","corrected":"Ich fahre mit dem Bus.","notes":["mit + Dativ"]}'});e({type:'response.completed'});c.close();}}));};
 try{
  const res=await routes.check.POST(req('/api/ai/check',{method:'POST',headers:{cookie:'wg_ai_session='+encodeURIComponent(sealed)},body:JSON.stringify({sentence:'Ich fahre mit den Bus.',phrase:'mit etwas fahren',tr:'bir şeyle gitmek'})}));
  assert.equal(res.status,200);const data=await res.json();assert.equal(data.feedback.verdict,'kucuk-hata');assert.equal(data.feedback.notes[0],'mit + Dativ');
  const rotated=res.headers.getSetCookie().find(c=>c.startsWith('wg_ai_session='));assert.ok(rotated);
  assert.equal((await siwc.unseal(decodeURIComponent(rotated.split(';')[0].slice('wg_ai_session='.length)),cfg.sessionSecret)).rt,'rt-new');
  assert.deepEqual(seen.map(u=>new URL(u).pathname),['/api/accounts/oauth/token','/v1/responses']);
 }finally{globalThis.fetch=real;}
}));
test('the check route needs a session, validates input, and maps plan errors',async()=>withEnv(ON,async()=>{
 const none=await routes.check.POST(req('/api/ai/check',{method:'POST',body:'{}'}));assert.equal(none.status,401);assert.equal((await none.json()).error,'signed_out');
 const cfg=siwc.siwcConfig(process.env,ORIGIN);const cookie='wg_ai_session='+encodeURIComponent(await siwc.seal({rt:'r'},cfg.sessionSecret));
 const short=await routes.check.POST(req('/api/ai/check',{method:'POST',headers:{cookie},body:JSON.stringify({sentence:'Hi',phrase:'x'})}));assert.equal(short.status,400);
 const real=globalThis.fetch;
 try{
  globalThis.fetch=async(url)=>String(url).includes('oauth/token')?new Response(JSON.stringify({error:'invalid_grant'}),{status:400}):new Response('{}',{status:500});
  const expired=await routes.check.POST(req('/api/ai/check',{method:'POST',headers:{cookie},body:JSON.stringify({sentence:'Ich fahre mit dem Bus.',phrase:'mit etwas fahren',tr:''})}));
  assert.equal(expired.status,401);assert.ok(expired.headers.getSetCookie().some(c=>/wg_ai_session=;/.test(c)&&/Max-Age=0/.test(c)),'dead session is cleared');
  globalThis.fetch=async(url)=>String(url).includes('oauth/token')?new Response(JSON.stringify({access_token:'AT'}),{status:200}):new Response(JSON.stringify({data:[{slug:'m'}]}),{status:200});
  const limited=await (async()=>{globalThis.fetch=async(url)=>String(url).includes('oauth/token')?new Response(JSON.stringify({access_token:'AT'}),{status:200}):String(url).endsWith('/models')?new Response(JSON.stringify({data:[{slug:'m'}]})):new Response(JSON.stringify({error:{code:'subscription_sharing_usage_limit_exceeded'}}),{status:429});return routes.check.POST(req('/api/ai/check',{method:'POST',headers:{cookie},body:JSON.stringify({sentence:'Ich fahre mit dem Bus.',phrase:'mit etwas fahren',tr:''})}));})();
  assert.equal(limited.status,429);assert.match((await limited.json()).message,/kullanım sınırı/i);
 }finally{globalThis.fetch=real;}
}));
