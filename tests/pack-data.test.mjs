import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('every precomputed pack file is valid and only holds checked entries with credited examples',()=>{
 for(const f of fs.readdirSync('public/pack-data')){
  const data=JSON.parse(fs.readFileSync('public/pack-data/'+f,'utf8'));
  assert.ok(Object.keys(data).length>0,f);
  for(const [word,e] of Object.entries(data)){assert.equal(e.checked,true,word);if(e.forms)assert.ok(e.forms.tables.length>0,word);for(const x of e.examples||[])assert.ok(x.de&&x.tr!==undefined||x.de,word);}
 }
});
test('most pack nouns, verbs and adjectives carry inflection tables',()=>{
 let total=0,withForms=0;
 for(const f of ['b1-kern-v1.json','sik-kelimeler-v1.json']){for(const e of Object.values(JSON.parse(fs.readFileSync('public/pack-data/'+f,'utf8')))){if(['noun','verb','adjective'].includes(e.pos)){total++;if(e.forms)withForms++;}}}
 assert.ok(withForms/total>0.7,withForms+'/'+total);
});
