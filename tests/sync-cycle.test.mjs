import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {buildSync} from 'esbuild';
const box={module:{exports:{}},exports:{},console};vm.runInNewContext(buildSync({entryPoints:['lib/sync-cycle.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text,box);const{runSyncCycle}=box.module.exports;const owner='11111111-1111-1111-1111-111111111111';
function setup(){let state={version:1,owner,items:{}},snapshot={};let allowed=true;const store={read:async()=>state,update:async fn=>(state=fn(state))};const provider={inventory:async()=>[{key:'card:new',body:{id:'new',note:'cloud'},deleted:false,version:1}],commit:async()=>[]};const device={capture:async()=>snapshot,apply:async(_,target)=>{snapshot=target;},canApply:()=>allowed};return{store,provider,device,read:()=>snapshot,allow:v=>allowed=v};}
test('cloud receive applies and durable mirror clears',async()=>{const t=setup(),r=await runSyncCycle(owner,t.provider,t.store,t.device);assert.equal(r.applied,true);assert.equal(t.read()['card:new'].note,'cloud');assert.equal((await t.store.read()).mirror,undefined);});
test('busy practice defers receive without reverting cloud on next run',async()=>{const t=setup();t.allow(false);const a=await runSyncCycle(owner,t.provider,t.store,t.device);assert.equal(a.waiting,true);assert.ok((await t.store.read()).mirror);t.allow(true);await runSyncCycle(owner,t.provider,t.store,t.device);assert.equal(t.read()['card:new'].note,'cloud');});
test('crash after apply before checkpoint clear does not lose downloaded card',async()=>{const t=setup();t.allow(false);await runSyncCycle(owner,t.provider,t.store,t.device);const s=await t.store.read();await t.device.apply({},s.mirror.target);t.allow(true);const r=await runSyncCycle(owner,t.provider,t.store,t.device);assert.equal(r.applied,true);assert.equal(t.read()['card:new'].note,'cloud');});
test('remote arrives during practice, later local edits rebase without a permanent mirror error',async()=>{const t=setup();t.allow(false);await runSyncCycle(owner,t.provider,t.store,t.device);await t.device.apply({}, {'card:local':{id:'local',note:'new during review'}});t.allow(true);const r=await runSyncCycle(owner,t.provider,t.store,t.device);assert.equal(r.waiting,false);assert.equal(t.read()['card:local'].note,'new during review');assert.equal(t.read()['card:new'].note,'cloud');assert.ok((await t.store.read()).items['card:local'].pending);});
test('overlapping local edit while receive deferred keeps explicit remote conflict',async()=>{const t=setup();t.allow(false);await runSyncCycle(owner,t.provider,t.store,t.device);await t.device.apply({}, {'card:new':{id:'new',note:'local competing edit'}});t.allow(true);await runSyncCycle(owner,t.provider,t.store,t.device);assert.equal(t.read()['card:new'].note,'local competing edit');assert.equal((await t.store.read()).items['card:new'].conflict.body.note,'cloud');});
test('a session starting during the checkpoint read defers incoming data',async()=>{
 const t=setup();t.allow(false);
 await runSyncCycle(owner,t.provider,t.store,t.device);
 t.allow(true);
 const capture=t.device.capture;
 t.device.capture=async()=>{t.allow(false);return capture();};
 const result=await runSyncCycle(owner,t.provider,t.store,t.device);
 assert.equal(result.waiting,true);
 assert.equal(t.read()['card:new'],undefined);
 assert.ok((await t.store.read()).mirror);
});
