import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'lib/new-word-scenes.json'),'utf8'));
const rows=manifest.reviewedAssets;
// Optional exported card snapshot (sync export, never committed). The coverage check runs only when it is provided.
const snapshotPath=process.env.WORTGARTEN_CARD_SNAPSHOT||'';
const hasSnapshot=!!snapshotPath&&fs.existsSync(snapshotPath);
const current=hasSnapshot?JSON.parse(fs.readFileSync(snapshotPath,'utf8')).map(x=>x.body):[];
const expected=current.filter(c=>!c.photo);
const hashFile=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

test('exactly covers every current photo-less card by word and exact meaning',{skip:hasSnapshot?false:'private card snapshot not present (set WORTGARTEN_CARD_SNAPSHOT)'},()=>{
 assert.equal(current.length,276);assert.equal(expected.length,107);assert.equal(rows.length,107);
 const key=x=>`${x.word}\0${x.meaning}`;
 assert.deepEqual(new Set(rows.map(key)),new Set(expected.map(key)));
});

test('each new diagram has local hashed SVG, unique identity, and complete license provenance',()=>{
 const ids=new Set(),paths=new Set();
 for(const row of rows){
  assert.ok(row.assetId&&!ids.has(row.assetId));ids.add(row.assetId);
  assert.equal(row.conceptId,row.assetId);assert.ok(row.path.startsWith('/vocabulary-art/teaching-scenes/new-')&&row.path.endsWith('.svg'));
  assert.ok(!paths.has(row.path));paths.add(row.path);
  assert.equal(row.archive,'wortgarten');assert.equal(row.kind,'illustration');assert.equal(row.reviewStatus,'reviewed');
  assert.equal(row.license,'CC BY 4.0');assert.equal(row.compositionLicense,'CC BY 4.0');
  assert.equal(row.licenseUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(row.componentLicense,'ISC; MIT for Feather-derived glyphs');
  assert.equal(row.source,'https://wortgarten-beta.vercel.app/visual-sources.html');
  assert.deepEqual(row.aliases,[]);assert.ok(row.motifs.length>=2&&row.motifs.length<=3);
  const file=path.join(root,'public',row.path.slice(1));assert.ok(fs.existsSync(file));assert.equal(hashFile(file),row.sha256,row.word);
  assert.match(fs.readFileSync(file,'utf8'),/EĞİTİMSEL ÇAĞRIŞIM ŞEMASI/);
 }
 const notice=fs.readFileSync(path.join(root,'public/vocabulary-art/teaching-scenes/LUCIDE-LICENSE.txt'),'utf8');
 assert.match(notice,/ISC License/);assert.match(notice,/The MIT License/);
});

test('new-scene generation has not invalidated the accepted 130-card archive',()=>{
 const prior=JSON.parse(fs.readFileSync(path.join(root,'lib/teaching-scenes.json'),'utf8')).reviewedAssets;
 assert.equal(prior.length,130);
 for(const row of prior){const file=path.join(root,'public',row.path.slice(1));assert.ok(fs.existsSync(file));assert.equal(hashFile(file),row.sha256,row.word);}
});

test('manifest excludes private card IDs and notes',()=>{
 for(const row of rows){assert.equal('id' in row,false);assert.equal('note' in row,false);assert.equal('notes' in row,false);}
});
