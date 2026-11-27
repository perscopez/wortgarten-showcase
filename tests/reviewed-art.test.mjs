import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const root = path.resolve(decodeURIComponent(new URL('..', import.meta.url).pathname));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'lib/reviewed-art.json'), 'utf8'));
const module = { exports: {} };
const js = buildSync({ entryPoints: [path.join(root, 'lib/reviewed-art.ts')], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
vm.runInNewContext(js, { module, exports: module.exports, require: createRequire(import.meta.url), console });
const { reviewedArtFor } = module.exports;

test('every curated archive entry has unique identity, allowed local PNG path, checksum and archive provenance', () => {
  assert.equal(manifest.reviewedAssets.length, 70);
  assert.equal(new Set(manifest.reviewedAssets.map((x) => x.assetId)).size, 70);
  const conceptsByArchive = new Map();
  for (const asset of manifest.reviewedAssets) {
    assert.equal(asset.kind, 'illustration');
    assert.equal(asset.reviewStatus, 'reviewed');
    assert.match(asset.path, /^\/vocabulary-art\/(openmoji|twemoji)\/[a-z0-9-]+\.png$/);
    assert.match(asset.source, /^https:\/\/raw\.githubusercontent\.com\/(hfg-gmuend\/openmoji|jdecked\/twemoji)\//);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    assert.ok(asset.word && asset.author && asset.license && asset.licenseUrl);
    const local = path.join(root, 'public', asset.path.slice(1));
    const bytes = fs.readFileSync(local);
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `${asset.assetId} is PNG`);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.assetId);
    const allowed = asset.archive === 'openmoji'
      ? ['17.0.0', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/']
      : ['17.0.3', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'];
    assert.equal(asset.version, allowed[0]);
    assert.equal(asset.license, allowed[1]);
    assert.equal(asset.licenseUrl, allowed[2]);
    const key = `${asset.archive}:${asset.conceptId}`;
    conceptsByArchive.set(key, (conceptsByArchive.get(key) || 0) + 1);
  }
  assert.equal(conceptsByArchive.size, 70);
});

test('lookup is exact noun matching, returns illustrations as local same-origin assets', () => {
  const items = reviewedArtFor('Apfel');
  assert.equal(items.length, 2);
  assert.ok(items.every((x) => x.kind === 'illustration' && x.match === 'curated' && x.url.startsWith('/vocabulary-art/')));
  assert.equal(reviewedArtFor(' APFEL ').length, 2);
  assert.equal(reviewedArtFor('Apfelsaft').length, 0);
  assert.equal(reviewedArtFor('Telefon').length, 1, 'a real photo replaces the emoji drawings');
  assert.equal(reviewedArtFor('Telefon')[0].kind, 'image');
  assert.equal(reviewedArtFor('Glühbirne').length, 2);
});

test('ambiguous fish token never auto-selects the animal illustration without explicit animal sense', () => {
  assert.equal(reviewedArtFor('Fisch').length, 0);
  assert.equal(reviewedArtFor('Fische').length, 0);
  assert.equal(reviewedArtFor('Fisch', 'food').length, 0);
  assert.equal(reviewedArtFor('Fisch', 'animal').length, 2);
});

test('no alias points to multiple concepts inside a single archive', () => {
  for (const archive of ['openmoji', 'twemoji']) {
    const aliasConcept = new Map();
    for (const asset of manifest.reviewedAssets.filter((x) => x.archive === archive)) {
      for (const alias of [asset.word, ...asset.aliases]) {
        const key = alias.normalize('NFC').trim().toLocaleLowerCase('de-DE');
        assert.ok(!aliasConcept.has(key) || aliasConcept.get(key) === asset.conceptId, `${archive} alias ${alias}`);
        aliasConcept.set(key, asset.conceptId);
      }
    }
  }
});
