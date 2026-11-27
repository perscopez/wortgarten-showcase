import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {outputFiles:[file]}=buildSync({entryPoints:['lib/rate-limit.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false});
const mod={exports:{}};new Function('module','exports','require',file.text)(mod,mod.exports,require);
const {createRateLimiter,clientKey}=mod.exports;

test('limits each client separately within the window and recovers afterwards',()=>{
 const l=createRateLimiter({limit:2,windowMs:1000});
 assert.equal(l.check('a',0).ok,true);assert.equal(l.check('a',10).ok,true);
 const blocked=l.check('a',20);assert.equal(blocked.ok,false);assert.equal(blocked.retryAfter,1);
 assert.equal(l.check('b',20).ok,true,'another client is unaffected');
 assert.equal(l.check('a',1001).ok,true,'window slides');
});
test('memory stays bounded and raw IPs are not kept',()=>{
 const l=createRateLimiter({limit:1,windowMs:1000,maxKeys:3});
 for(const k of ['a','b','c','d'])l.check(k,0);
 assert.equal(l.check('a',1).ok,true,'oldest client was evicted');
 const key=clientKey(new Request('https://x.test',{headers:{'x-vercel-forwarded-for':'203.0.113.9, 10.0.0.1'}}));
 assert.match(key,/^[0-9a-f]{32}$/);assert.ok(!key.includes('203'));
});
test('only complete lookups are shared through the CDN cache; expensive routes are limited',()=>{
 const lookup=fs.readFileSync('app/api/lookup/route.ts','utf8');
 assert.ok(lookup.includes("'Cache-Control':!deadline.aborted&&meaning?LOOKUP_CACHE:'no-store'"));
 for(const r of ['lookup','quick-word','word-inflections'])assert.ok(fs.readFileSync(`app/api/${r}/route.ts`,'utf8').includes('limiter.check(clientKey(req))'),r);
});
test('reminder devices are retained for 120 days of inactivity',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261112150000_wortgarten_push_retention.sql','utf8');
 assert.ok(sql.includes("interval '120 days'"));assert.ok(!sql.includes("interval '30 days'"));
 assert.ok(sql.includes('grant execute on function public.wortgarten_push_store(text,text,jsonb) to anon'));
});
