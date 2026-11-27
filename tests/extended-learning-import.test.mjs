import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';

const collected=buildSync({entryPoints:['lib/extended-learning-backup.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const module={exports:{}};
new Function('module','exports','require',collected)(module,module.exports,createRequire(import.meta.url));
const {prepareExtendedLearningImport}=module.exports;

const key='wortgarten-daily-vocabulary-v1';
const item={id:'phone-id',reverse:false,round:0};
const session={
 version:1,day:'2026-11-17',elapsed:15000,finished:false,
 queue:[item,{...item,id:'deleted-card'}],
 answers:[{id:'phone-id',at:1794900000000,rating:2}],
 knownIds:['phone-id','deleted-card'],newIds:['phone-id'],skipped:['deleted-card'],
};
test('a restored daily checkpoint points to the merged card ID throughout',()=>{
 const input={version:1,records:{[key]:session}};
 const restored=prepareExtendedLearningImport(input,{'phone-id':'desktop-id'})[key];
 assert.deepEqual(restored.queue,[{...item,id:'desktop-id'}]);
 assert.equal(restored.answers[0].id,'desktop-id');
 assert.deepEqual(restored.knownIds,['desktop-id']);
 assert.deepEqual(restored.newIds,['desktop-id']);
 assert.deepEqual(restored.skipped,[]);
 assert.equal(restored.finished,false);
 assert.equal(session.queue[0].id,'phone-id');
});
test('invalid learning records can be rejected before the card import starts',()=>{
 const input={version:1,records:{[key]:{...session,elapsed:-1}}};
 assert.throws(()=>prepareExtendedLearningImport(input),/geçersiz/);
});
