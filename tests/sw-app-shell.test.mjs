import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ORIGIN='https://test.example';
function load({online=true,cacheNames=[]}={}){
 const handlers={},store=new Map(),deleted=[];
 const cache={
  match:async(key)=>store.get(typeof key==='string'?key:new URL(key.url).pathname)??store.get('/'),
  put:async(key,value)=>{const k=typeof key==='string'?key:new URL(key.url).pathname;store.delete(k);store.set(k,value);},
  keys:async()=>[...store.keys()].map(k=>({url:ORIGIN+k})),
  delete:async(r)=>store.delete(new URL(r.url).pathname),
 };
 const context={URL,Request,
  caches:{open:async()=>cache,keys:async()=>cacheNames,delete:async(n)=>{deleted.push(n);return true;}},
  fetch:async(req)=>{if(!online)throw Error('offline');const url=typeof req==='string'?req:req.url;return {ok:true,redirected:false,url,clone(){return {from:new URL(url,ORIGIN).pathname};}};},
  self:{location:{origin:ORIGIN},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>{handlers[name]=fn;}},
 };
 vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),context);
 return {handlers,store,deleted};
}
async function navigate(handlers,path){let response;const request=new Request(ORIGIN+path);Object.defineProperty(request,'mode',{value:'navigate'});handlers.fetch({request,respondWith:r=>{response=r;}});return await response;}

test('only the app shell is stored as the offline start page',async()=>{
 const {handlers,store}=load();
 await navigate(handlers,'/visual-sources.html');
 assert.equal(store.has('/'),false,'an attribution page must not become the offline app');
 await navigate(handlers,'/?study=1');
 assert.equal(store.get('/').from,'/');
});

test('activation removes caches from earlier service worker versions only',async()=>{
 const {handlers,deleted}=load({cacheNames:['wortgarten-offline-v16','wortgarten-offline-v17','wortgarten-offline-v18','unrelated']});
 let done;handlers.activate({waitUntil:p=>{done=p;}});await done;
 assert.deepEqual(deleted.sort(),['wortgarten-offline-v16','wortgarten-offline-v17']);
});

test('hashed build files are capped so old deploys do not fill device storage',async()=>{
 const {handlers,store}=load();
 for(let i=0;i<230;i++){let r;handlers.fetch({request:{url:`${ORIGIN}/_next/static/chunks/c${i}.js`,method:'GET'},respondWith:x=>{r=x;}});await r;}
 await new Promise(r=>setTimeout(r,20));
 const build=[...store.keys()].filter(k=>k.startsWith('/_next/static/'));
 assert.ok(build.length<=200,`kept ${build.length}`);
 assert.ok(store.has('/_next/static/chunks/c229.js'),'newest file is kept');
});
