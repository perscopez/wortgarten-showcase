import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSync} from 'esbuild';
const {outputFiles:[file]}=buildSync({entryPoints:['lib/progress.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const mod={exports:{}};new Function('module','exports',file.text)(mod,mod.exports);
const {learningProgress}=mod.exports;
const DAY=86400000,now=new Date(2026,10,12,15).getTime();
const state=(...ats)=>({version:1,ease:2.3,lapses:0,successDays:1,lastAdvancedDay:null,lastReviewedAt:ats.at(-1),scheduledDue:now,events:ats.map(at=>({at,rating:2,phase:'scheduled'}))});
const card=(id,o={})=>({id,due:now+DAY,interval:0,reviews:0,...o});

test('groups cards into settled, learning and fresh from recorded intervals',()=>{
 const p=learningProgress([card('a',{reviews:5,interval:30}),card('b',{reviews:2,interval:4,due:now-1}),card('c',{due:now-1})],now);
 assert.deepEqual([p.total,p.settled,p.learning,p.fresh,p.due],[3,1,1,1,1],'an unseen card is fresh, not due');
});
test('streak counts consecutive study days and survives until today ends',()=>{
 const reviewed=card('a',{reviews:3,interval:2,reviewState:state(now-3*DAY,now-2*DAY,now-DAY)});
 assert.equal(learningProgress([reviewed],now).streak,3,'yesterday still counts before studying today');
 const today=card('b',{reviews:1,interval:1,reviewState:state(now-1000)});
 assert.equal(learningProgress([reviewed,today],now).streak,4);
 const gap=card('c',{reviews:1,interval:1,reviewState:state(now-3*DAY)});
 assert.equal(learningProgress([gap],now).streak,0);
});
test('week chart has seven days ending today with per-day answer counts',()=>{
 const p=learningProgress([card('a',{reviews:2,interval:1,reviewState:state(now-DAY,now-500,now-100)})],now);
 assert.equal(p.week.length,7);assert.deepEqual(p.week.slice(-2).map(d=>d.count),[1,2]);assert.equal(p.activeDays,2);
});
