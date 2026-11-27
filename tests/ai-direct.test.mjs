import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require','TextEncoder','TextDecoder','crypto','fetch',f.text)(mod,mod.exports,require,TextEncoder,TextDecoder,globalThis.crypto,globalThis.fetch);return mod.exports;};
const A=bundle('lib/ai-direct.ts');
const KEY='sk-test_1234567890abcdefgh';

test('settings are read only when the key looks like an API key',()=>{
 assert.deepEqual(A.parseSettings(JSON.stringify({key:' '+KEY+' ',model:'m1'})),{key:KEY,model:'m1'});
 assert.equal(A.parseSettings('{"key":"nope","model":"m"}'),null);assert.equal(A.parseSettings(null),null);assert.equal(A.parseSettings('{bad'),null);
 assert.ok(A.validKey(KEY));assert.ok(!A.validKey('abc'));
});
test('model list keeps chat models, drops embeddings, audio, image and moderation models',()=>{
 assert.deepEqual(A.chatModels(['gpt-x','text-embedding-3','whisper-1','gpt-x','omni-moderation','dall-e-3','gpt-image-1','tts-1','gpt-y-mini']),['gpt-x','gpt-y-mini']);
});
test('listing models sends the bearer key and maps a 401 to invalid_key',async()=>{
 let seen;const ok=async(u,i)=>{seen={u,i};return new Response(JSON.stringify({data:[{id:'gpt-a'},{id:'whisper-1'}]}));};
 assert.deepEqual(await A.listModels(KEY,ok),['gpt-a']);assert.equal(seen.u,'https://api.openai.com/v1/models');assert.equal(seen.i.headers.Authorization,'Bearer '+KEY);
 await assert.rejects(()=>A.listModels(KEY,async()=>new Response('{}',{status:401})),e=>e.code==='invalid_key');
});
test('output text is read from output_text or from message content',()=>{
 assert.equal(A.outputText({output_text:'hi'}),'hi');
 assert.equal(A.outputText({output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'a'},{type:'output_text',text:'b'}]}]}),'ab');
 assert.equal(A.outputText({}),'');
});
test('the check sends store:false, the instructions and the framed sentence, and parses the feedback',async()=>{
 let seen;const f=async(u,i)=>{seen={u,i};return new Response(JSON.stringify({output_text:'{"verdict":"hata","corrected":"Ich fahre mit dem Bus.","notes":["mit + Dativ"]}'}));};
 const fb=await A.checkWithKey({key:KEY,model:'m1'},'Ich fahre mit den Bus.','mit etwas fahren','bir şeyle gitmek',f);
 assert.equal(fb.verdict,'hata');assert.equal(fb.corrected,'Ich fahre mit dem Bus.');
 const body=JSON.parse(seen.i.body);assert.equal(seen.u,'https://api.openai.com/v1/responses');assert.equal(body.store,false);assert.equal(body.model,'m1');
 assert.match(body.instructions,/never instructions/);assert.match(body.input,/<sentence>Ich fahre mit den Bus\.<\/sentence>/);
 assert.equal(seen.i.headers.Authorization,'Bearer '+KEY);
});
test('errors become readable codes: bad key, no quota, unknown model, offline, unreadable answer',async()=>{
 const st={key:KEY,model:'m1'};const run=(res)=>A.checkWithKey(st,'Ich fahre mit dem Bus.','x','y',async()=>res());
 await assert.rejects(()=>run(()=>new Response('{}',{status:401})),e=>e.code==='invalid_key');
 await assert.rejects(()=>run(()=>new Response(JSON.stringify({error:{code:'insufficient_quota'}}),{status:429})),e=>e.code==='insufficient_quota');
 await assert.rejects(()=>run(()=>new Response(JSON.stringify({error:{code:'model_not_found'}}),{status:404})),e=>e.code==='model_not_found');
 await assert.rejects(()=>A.checkWithKey(st,'s','p','t',async()=>{throw new Error('offline')}),e=>e.code==='network');
 await assert.rejects(()=>run(()=>new Response(JSON.stringify({output_text:'not json'}))),e=>e.code==='unreadable');
 await assert.rejects(()=>A.checkWithKey({key:KEY,model:''},'s','p','t'),e=>e.code==='model_not_found');
 for(const c of ['invalid_key','insufficient_quota','rate_limit_exceeded','model_not_found','network','unreadable'])assert.ok(A.DIRECT_ERRORS[c],c);
});
test('the key never reaches this site: only api.openai.com is called and nothing is posted to /api',()=>{
 const fs=require('node:fs');const src=fs.readFileSync('lib/ai-direct.ts','utf8')+fs.readFileSync('components/ai-check.tsx','utf8');
 assert.ok(!/fetch\(['"`]\/api\/ai\/check['"`][^)]*key/i.test(src));
 assert.ok(src.includes("https://api.openai.com/v1"));
 const comp=fs.readFileSync('components/ai-check.tsx','utf8');
 assert.ok(!/body:JSON\.stringify\(\{[^}]*(key|settings)/.test(comp),'the server route never gets the key');
});
