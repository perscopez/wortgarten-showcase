import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {buildSync} from 'esbuild';import {indexedDB,IDBFactory} from 'fake-indexeddb';
const box={module:{exports:{}},exports:{},console,setTimeout,clearTimeout};vm.runInNewContext(buildSync({entryPoints:['lib/card-storage.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,box);const{createCardRepository,indexedCardAdapter}=box.module.exports;
test('two stale browser repositories evaluate in a shared atomic IDB transaction',async()=>{const legacy={getItem:()=>null,setItem:()=>{}};const a=createCardRepository({legacy,primary:indexedCardAdapter(indexedDB)}),b=createCardRepository({legacy,primary:indexedCardAdapter(indexedDB)});await a.load([{id:'original'}]);await b.load([]);await Promise.all([a.update(p=>[...p,{id:'a'}]),b.update(p=>[...p,{id:'b'}])]);const fresh=await a.refresh();assert.deepEqual(Array.from(fresh,c=>c.id),['original','a','b']);});
test('a second tab opening the empty database cannot overwrite the first tab’s initialized cards',async()=>{
 const db=new IDBFactory(),legacy={getItem:()=>null,setItem:()=>{}};
 const adapter=indexedCardAdapter(db);
 let resumeRead,readCompleted;
 const paused=new Promise(resolve=>{resumeRead=resolve;});
 const waiting=new Promise(resolve=>{readCompleted=resolve;});
 const slow=createCardRepository({legacy,primary:{...adapter,async read(){
  const snapshot=await adapter.read();
  readCompleted();await paused;return snapshot;
 }}});
 const opening=slow.load([{id:'stale'}]);
 await waiting;
 const fast=createCardRepository({legacy,primary:indexedCardAdapter(db)});
 await fast.load([{id:'seed'}]);
 await fast.update(cards=>[...cards,{id:'saved'}]);
 resumeRead();
 assert.deepEqual(Array.from((await opening).cards,c=>c.id),['seed','saved']);
});
