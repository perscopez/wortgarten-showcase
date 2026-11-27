import test from 'node:test';import assert from 'node:assert/strict';import {buildSync} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bundle=(entry)=>{const {outputFiles:[f]}=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.json':'json'}});const mod={exports:{}};new Function('module','exports','require',f.text)(mod,mod.exports,require);return mod.exports;};
const E=bundle('lib/error-log.ts');
test('misses are classified by exercise kind; article-only slips are told from spelling',()=>{
 assert.equal(E.classifyError('pattern','auf',''),'edat');assert.equal(E.classifyError('pattern-case','Akkusativ',''),'hal');
 assert.equal(E.classifyError('build-pattern','a b',''),'siralama');assert.equal(E.classifyError('pattern-type','x y',''),'kalip');
 assert.equal(E.classifyError('recall','der Mann','die Mann'),'artikel');assert.equal(E.classifyError('recall','der Mann','der Mamn'),'yazim');
 assert.equal(E.classifyError('recall','der Mann','Mann'),'artikel','missing article counts as article');
});
test('the log is capped, newest first, validated, and summarised by type over two weeks',()=>{
 let log=E.emptyErrorLog();const now=1e12;
 for(let i=0;i<350;i++)log=E.addError(log,{at:now-i,type:i%3?'edat':'hal',word:'w'+i,expected:'e',given:'g'});
 assert.equal(log.entries.length,300);assert.equal(log.entries[0].word,'w349');
 const old=E.addError(E.emptyErrorLog(),{at:now-30*86400000,type:'yazim',word:'x',expected:'x',given:''});
 assert.equal(E.summarizeErrors(old,now).total,0,'older than 14 days is not counted');
 const s=E.summarizeErrors(log,now);assert.equal(s.top,'edat');assert.equal(s.total,300);
 assert.throws(()=>E.parseErrorLog({version:1,entries:[{at:1,type:'nope',word:'',expected:'',given:''}]}));
 assert.deepEqual(E.parseErrorLog(null),E.emptyErrorLog());
});
test('long strings are clipped',()=>{const l=E.addError(E.emptyErrorLog(),{at:1,type:'yazim',word:'x'.repeat(500),expected:'y'.repeat(500),given:'z'.repeat(500)});assert.equal(l.entries[0].word.length,160);});
test('reimporting a file preserves both devices’ mistakes without duplicating events',()=>{
 const entry={at:1,type:'edat',word:'warten',expected:'auf',given:'für'};
 const later={...entry,at:2,given:'über'};
 const restored=E.mergeErrorLogs({version:1,entries:[entry]},{version:1,entries:[later,entry]});
 assert.deepEqual(restored.entries.map(e=>e.at),[2,1]);
 assert.throws(()=>E.parseErrorLog({version:1,entries:[{...entry,type:'constructor'}]}));
});
