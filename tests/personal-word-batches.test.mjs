import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildSync} from 'esbuild';

function load(entry){
 const built=buildSync({entryPoints:[entry],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
 const module={exports:{}};
 new Function('module','exports','require',built)(module,module.exports,createRequire(import.meta.url));
 return module.exports;
}
const backup=load('lib/backup-import.ts');
const patterns=load('lib/pattern-practice.ts');
const sync=load('lib/sync-engine.ts');
const owner='11111111-1111-1111-1111-111111111111';
const build=(id,extra={})=>({id,word:'ankommen',meaning:'varmak',partOfSpeech:'verb',article:'',plural:'',example:'',translation:'',reviews:0,due:0,interval:0,created:1,...extra});

test('a personal batch imports, practises and backs up validated custom patterns',()=>{
 const card=build('a',{patterns:[['am Gleis ankommen · an + Dativ','peronda varmak']]});
 const parsed=backup.parseCardBackup({version:2,cards:[card]});
 const stored=backup.applyCardImport([],parsed.cards,backup.defaultImportChoices([],parsed.cards)).cards[0];
 const row=patterns.rowsFor(stored).find(r=>r.phrase==='am Gleis ankommen');
 assert.equal(row?.tr,'peronda varmak');
 assert.ok(patterns.rankPatterns(stored,null).some(p=>p.row.id===row.id));
 assert.deepEqual(backup.parseCardBackup({version:2,cards:[stored]}).cards[0].patterns,card.patterns);
 assert.throws(()=>backup.parseCardBackup({cards:[{...card,patterns:[['am … ankommen','varmak']]}]}),/Kalıbın/);
});

test('backup merges richer definitions and the stronger full schedule while protecting homographs',()=>{
 const local=build('local',{reviews:6,due:125,interval:5});
 const incoming=build('phone',{meaning:'varmak; ulaşmak',example:'Der Zug kommt an.',translation:'Tren varıyor.',reviews:1,due:40,interval:2});
 const choices=backup.defaultImportChoices([local],[incoming]);
 const saved=backup.applyCardImport([local],[incoming],choices);
 assert.equal(saved.cards.length,1);
 assert.equal(saved.cards[0].meaning,incoming.meaning);
 assert.deepEqual([saved.cards[0].reviews,saved.cards[0].due,saved.cards[0].interval],[6,125,5]);
 const verb=build('v',{word:'kosten',meaning:'fiyatı olmak'});
 const noun=build('n',{word:'Kosten',meaning:'giderler',article:'die',partOfSpeech:'noun'});
 assert.equal(backup.importCandidates([verb],noun).length,0);
});

test('two compatible cards inside one batch become one and both IDs are mapped',()=>{
 const a=build('a'),b=build('b',{meaning:'varmak; ulaşmak',reviews:4,due:140});
 const saved=backup.applyCardImport([],[a,b],backup.defaultImportChoices([],[a,b]));
 assert.equal(saved.cards.length,1);
 assert.equal(saved.cards[0].reviews,4);
 assert.equal(saved.idMap.a,'a');
 assert.equal(saved.idMap.b,'a');
});

test('sync resolves simultaneous edits to a real card and does not sum repetitions',()=>{
 const key='card:a',base=build('a');
 const snapshot=card=>({[key]:card});
 const remote=(version,body)=>({key,version,body,deleted:false});
 const paired=sync.reconcileSync(sync.newSyncState(owner),owner,[remote(1,base)]);
 const local=build('a',{reviews:9,interval:6,due:900});
 const cloud=build('a',{reviews:3,interval:2,due:200,meaning:'varmak; ulaşmak',example:'Der Zug kommt an.',translation:'Tren varıyor.'});
 const observed=sync.observeSyncSnapshot(paired,owner,snapshot(local));
 const done=sync.reconcileSync(observed,owner,[remote(2,cloud)]);
 const result=sync.materializeSync(done,owner)[key];
 assert.equal(done.items[key].conflict,undefined);
 assert.deepEqual([result.reviews,result.due,result.interval,result.meaning],[9,900,6,cloud.meaning]);
});
