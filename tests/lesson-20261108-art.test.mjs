import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
const {reviewedAssets:assets}=JSON.parse(fs.readFileSync('lib/lesson-20261108-art.json','utf8'));
test('lesson art consists of attributable local photos and static OpenMoji diagrams',()=>{
 assert.equal(assets.length,104);
 assert.equal(assets.filter(x=>x.kind==='image').length,12);
 assert.equal(new Set(assets.map(x=>x.assetId)).size,assets.length);
 for(const a of assets){
  const b=fs.readFileSync('public'+a.path);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),a.sha256);
  assert(a.author&&a.source.startsWith('https://')&&a.licenseUrl.startsWith('https://'));
  if(a.kind==='image')assert.deepEqual([...b.subarray(0,2)],[255,216]);
  else{const t=b.toString();assert(t.includes('viewBox="0 0 640 320"'));assert(!/<(?:script|image|foreignObject)\b|\son[a-z]+=|href=/i.test(t));}
 }
});
