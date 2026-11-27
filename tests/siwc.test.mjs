import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require','TextEncoder','TextDecoder','crypto','fetch',f.text)(mod,mod.exports,require,TextEncoder,TextDecoder,globalThis.crypto,globalThis.fetch);return mod.exports;};
const S=bundle('lib/siwc.ts');
const cfg=S.siwcConfig({OPENAI_SIWC_CLIENT_ID:'oaiapp_test',SIWC_SESSION_SECRET:'x'.repeat(40)},'https://wg.example');
const form=s=>Object.fromEntries(new URLSearchParams(s));

test('the feature stays off until a client id and a long session secret are configured',()=>{
 assert.equal(S.siwcConfig({},'https://x'),null);
 assert.equal(S.siwcConfig({OPENAI_SIWC_CLIENT_ID:'a',SIWC_SESSION_SECRET:'short'},'https://x'),null);
 assert.equal(cfg.redirectUri,'https://wg.example/api/ai/callback');
 assert.equal(S.siwcConfig({OPENAI_SIWC_CLIENT_ID:'a',SIWC_SESSION_SECRET:'y'.repeat(32),SIWC_REDIRECT_URI:'https://r/cb'},'https://x').redirectUri,'https://r/cb');
});
test('the authorize URL carries PKCE S256, state, nonce, the plan scope and the API resource',async()=>{
 const tx={state:'st',nonce:'no',verifier:'v'.repeat(43)};
 const u=new URL(await S.authorizeUrl(cfg,tx));
 assert.equal(u.origin+u.pathname,S.SIWC_AUTHORIZE);
 assert.equal(u.searchParams.get('response_type'),'code');assert.equal(u.searchParams.get('client_id'),'oaiapp_test');
 assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('code_challenge'),await S.pkceChallenge(tx.verifier));
 assert.ok(u.searchParams.get('scope').split(' ').includes('chatgpt.tokens.use.direct'));assert.equal(u.searchParams.get('resource'),'https://api.openai.com/v1');
 assert.equal(u.searchParams.get('state'),'st');assert.equal(u.searchParams.get('redirect_uri'),cfg.redirectUri);
});
test('PKCE matches the RFC 7636 example',async()=>{assert.equal(await S.pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');});
test('sealed cookies round-trip, reject tampering and a wrong secret',async()=>{
 const sealed=await S.seal({rt:'refresh-token'},cfg.sessionSecret);
 assert.deepEqual(await S.unseal(sealed,cfg.sessionSecret),{rt:'refresh-token'});
 assert.equal(await S.unseal(sealed,'z'.repeat(40)),null);
 assert.equal(await S.unseal(sealed.slice(0,-3)+'AAA',cfg.sessionSecret),null);assert.equal(await S.unseal(undefined,cfg.sessionSecret),null);
 assert.notEqual(await S.seal({rt:'refresh-token'},cfg.sessionSecret),sealed,'fresh IV each time');
});
test('code exchange and refresh send the right form; the secret travels only as Basic auth',async()=>{
 const calls=[];const f=async(url,init)=>{calls.push({url,init});return new Response(JSON.stringify({access_token:'at',refresh_token:'rt2',scope:'openid chatgpt.tokens.use.direct'}),{status:200});};
 const t=await S.exchangeCode(cfg,'CODE','VERIFIER',f);assert.equal(t.access_token,'at');
 const b=form(calls[0].init.body);assert.equal(b.grant_type,'authorization_code');assert.equal(b.code,'CODE');assert.equal(b.code_verifier,'VERIFIER');assert.equal(b.redirect_uri,cfg.redirectUri);assert.equal(calls[0].init.headers.Authorization,undefined);
 const secretCfg={...cfg,clientSecret:'shh'};await S.refreshTokens(secretCfg,'RT',f);
 const r=form(calls[1].init.body);assert.equal(r.grant_type,'refresh_token');assert.equal(r.refresh_token,'RT');assert.equal(r.resource,'https://api.openai.com/v1');assert.ok(!('client_secret' in r)&&!JSON.stringify(r).includes('shh'));
 assert.equal(calls[1].init.headers.Authorization,'Basic '+btoa('oaiapp_test:shh'));
 assert.ok(S.hasPlanScope(t.scope));assert.ok(!S.hasPlanScope('openid email'));
});
test('token errors surface their OAuth code; refresh failures are recognised',async()=>{
 const f=async()=>new Response(JSON.stringify({error:'invalid_grant'}),{status:400});
 await assert.rejects(()=>S.refreshTokens(cfg,'RT',f),e=>e.code==='invalid_grant'&&S.REFRESH_FAILURES.has(e.code));
});
const sse=(events)=>new Response(new ReadableStream({start(c){for(const e of events)c.enqueue(new TextEncoder().encode('data: '+JSON.stringify(e)+'\n\n'));c.close();}}));
test('streamed answers count only after response.completed; failures raise their code',async()=>{
 const ok=await S.readResponseStream(sse([{type:'response.output_text.delta',delta:'{"a":'},{type:'response.output_text.delta',delta:'1}'},{type:'response.completed'}]).body);assert.equal(ok,'{"a":1}');
 await assert.rejects(()=>S.readResponseStream(sse([{type:'response.output_text.delta',delta:'x'}]).body),e=>e.code==='incomplete_response');
 await assert.rejects(()=>S.readResponseStream(sse([{type:'error',error:{code:'subscription_sharing_usage_limit_exceeded'}}]).body),e=>e.code==='subscription_sharing_usage_limit_exceeded');
});
test('respond sends store:false, stream:true, no unsupported fields, and the bearer token',async()=>{
 let seen;const f=async(url,init)=>{seen={url,init};return sse([{type:'response.output_text.delta',delta:'ok'},{type:'response.completed'}]);};
 assert.equal(await S.respond('AT','m1','be brief','hello',f),'ok');
 const body=JSON.parse(seen.init.body);assert.equal(seen.url,'https://api.openai.com/v1/responses');assert.equal(seen.init.headers.Authorization,'Bearer AT');
 assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(body.model,'m1');assert.equal(body.instructions,'be brief');
 for(const k of ['temperature','max_output_tokens','top_p','user','metadata','previous_response_id'])assert.ok(!(k in body),k);
 assert.equal(body.input[0].role,'user');
 await assert.rejects(()=>S.respond('AT','m','i','t',async()=>new Response(JSON.stringify({error:{code:'subscription_sharing_user_not_eligible'}}),{status:403})),e=>e.code==='subscription_sharing_user_not_eligible'&&e.status===403);
});
test('the model is the configured one or the first listed model of the account',async()=>{
 assert.equal(await S.pickModel('AT','fixed'),'fixed');
 const f=async()=>new Response(JSON.stringify({data:[{slug:'hidden',visibility:'hide'},{slug:'listed-1',visibility:'list'},{slug:'listed-2',visibility:'list'}]}));
 assert.equal(await S.pickModel('AT','',f),'listed-1');
 await assert.rejects(()=>S.pickModel('AT','',async()=>new Response('{}',{status:500})),e=>e.code==='models_unavailable');
});
test('feedback is parsed defensively: at most two notes, valid verdicts only',()=>{
 const good=S.parseFeedback('```json\n{"verdict":"hata","corrected":"Ich fahre mit dem Bus.","notes":["a","b","c",""]}\n```','x');
 assert.equal(good.verdict,'hata');assert.equal(good.notes.length,2);assert.equal(good.corrected,'Ich fahre mit dem Bus.');
 assert.equal(S.parseFeedback('{"verdict":"maybe","corrected":"x","notes":[]}','x'),null);assert.equal(S.parseFeedback('no json','x'),null);
 assert.equal(S.parseFeedback('{"verdict":"dogru","corrected":"","notes":[]}','orig').corrected,'orig');
});
test('the learner text is framed as data, not instructions',()=>{
 assert.match(S.FEEDBACK_INSTRUCTIONS,/never instructions/);
 assert.equal(S.feedbackInput('Ich lerne.','Deutsch lernen','Almanca öğrenmek'),'<pattern>Deutsch lernen</pattern>\n<meaning>Almanca öğrenmek</meaning>\n<sentence>Ich lerne.</sentence>');
});
