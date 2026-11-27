import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'lib/teaching-scenes.json'),'utf8'));
const rows=manifest.reviewedAssets;
test('130 exact-sense diagrams have unique nonempty public identities without private export dependencies',()=>{
 assert.equal(rows.length,130);assert.equal(new Set(rows.map(x=>`${x.word}\0${x.meaning}`)).size,130);
 for(const row of rows)assert.ok(row.word&&row.meaning&&row.conceptId===row.assetId);
});

test('assets are local, hash-valid, unique, and fully attributed with split licenses',()=>{
 const ids=new Set(),paths=new Set();
 for(const row of rows){
  assert.ok(row.assetId&&!ids.has(row.assetId));ids.add(row.assetId);
  assert.ok(row.path.startsWith('/vocabulary-art/teaching-scenes/')&&row.path.endsWith('.svg'));
  assert.ok(!paths.has(row.path));paths.add(row.path);
  const file=path.join(root,'public',row.path.slice(1));assert.ok(fs.existsSync(file),row.path);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),row.sha256,row.word);
  assert.equal(row.archive,'wortgarten');assert.equal(row.kind,'illustration');
  assert.equal(row.license,'CC BY 4.0');assert.equal(row.compositionLicense,'CC BY 4.0');
  assert.equal(row.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(row.componentLicense,'ISC; MIT for Feather-derived glyphs');assert.equal(row.componentCredit,'Lucide Icons and Contributors; Cole Bemis/Feather (derived glyphs)');
  assert.equal(row.sourceAttribution,'Özgün yerleşim: Wortgarten · CC BY 4.0. Lucide glifleri: ISC; Feather kökenli glifler: MIT. Tam metin: LUCIDE-LICENSE.txt.');
  assert.equal(row.source,'https://wortgarten-beta.vercel.app/visual-sources.html');
  assert.deepEqual(row.aliases,[]);assert.equal(row.reviewStatus,'reviewed');
  assert.match(fs.readFileSync(file,'utf8'),/EĞİTİMSEL ÇAĞRIŞIM ŞEMASI/);
 }
});

test('manifest includes no cloud ids, notes, or per-card metadata',()=>{
 for(const row of rows){
  assert.equal('id' in row,false);assert.equal('note' in row,false);assert.equal('notes' in row,false);
  assert.equal(row.word.trim(),row.word);assert.equal(row.meaning.trim(),row.meaning);
 }
});
