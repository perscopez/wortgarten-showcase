import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSync} from 'esbuild';

function loadTs(entry) {
  const out = buildSync({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    target: 'node22',
  });
  const mod = {exports: {}};
  const fn = new Function('exports', 'require', 'module', out.outputFiles[0].text);
  fn(mod.exports, () => { throw new Error('unexpected require'); }, mod);
  return mod.exports;
}

const qt = loadTs('lib/quick-trainers.ts');

test('QUICK_TRAINERS defines all 4 expected 5-minute trainers', () => {
  assert.deepEqual(qt.QUICK_TRAINERS.map((t) => t.kind), ['artikel', 'praepositionen', 'konjugation', 'verbinden']);
});

test('der/die/das pool has 500+ verified nouns and excludes ambiguous/flagged nouns', () => {
  const sampleCards = [
    {id: '1', word: 'Tisch', article: 'der', plural: 'Tische', meaning: 'masa'},
    {id: '2', word: 'Band', article: 'der', meaning: 'cilt', articleAmbiguous: true},
    {id: '3', word: 'Zeitung', article: 'die', meaning: 'gazete', qualityFlag: {status: 'pending'}},
    {id: '4', word: 'gehen', article: '', meaning: 'gitmek'},
  ];
  const fullPool = qt.buildArtikelPool(sampleCards);
  assert.ok(fullPool.length >= 500, `expected >=500 verified nouns, got ${fullPool.length}`);
  const round = qt.buildArtikelRound(sampleCards, 20, 'test-seed');
  assert.equal(round.length, 20);
  const words = new Set(fullPool.map((i) => i.word));
  assert.equal(words.has('Band'), false, 'ambiguous noun must be excluded');
  assert.equal(words.has('Zeitung'), false, 'flagged noun must be excluded');
  assert.equal(words.has('gehen'), false, 'verb without article must be excluded');
  for (const item of fullPool) {
    assert.ok(['der', 'die', 'das'].includes(item.article), `invalid article for ${item.word}`);
    assert.ok(item.meaning.length > 0, `empty meaning for ${item.word}`);
  }
  for (const item of round) {
    assert.equal(qt.checkArtikelAnswer(item, item.article).ok, true);
    const wrong = item.article === 'der' ? 'die' : 'der';
    assert.equal(qt.checkArtikelAnswer(item, wrong).ok, false);
  }
});

test('Präpositionen bank has 80 unique items (20 per CEFR level A1–B2) with 4 distinct options', () => {
  assert.ok(qt.PRAEPOSITION_BANK.length >= 80, `expected >=80 prepositions, got ${qt.PRAEPOSITION_BANK.length}`);
  const ids = new Set();
  const sentences = new Set();
  const perLevel = {A1: 0, A2: 0, B1: 0, B2: 0};
  for (const item of qt.PRAEPOSITION_BANK) {
    assert.equal(ids.has(item.id), false, `duplicate id ${item.id}`);
    ids.add(item.id);
    const full = `${item.before} ${item.answer} ${item.after}`.trim().toLocaleLowerCase('de');
    assert.equal(sentences.has(full), false, `duplicate sentence ${full}`);
    sentences.add(full);
    perLevel[item.level]++;
    assert.equal(item.options.length, 4, `${item.id} must have 4 options`);
    assert.equal(new Set(item.options).size, 4, `${item.id} options must be unique`);
    assert.ok(item.options.includes(item.answer), `${item.id} options must contain answer`);
    assert.ok((item.before.length > 0 || item.after.length > 0) && item.translation.length > 0);
  }
  for (const lvl of ['A1', 'A2', 'B1', 'B2']) {
    assert.ok(perLevel[lvl] >= 20, `expected >=20 items for ${lvl}, got ${perLevel[lvl]}`);
    const round = qt.buildPraepositionenRound(lvl, 15, 'test-seed');
    assert.equal(round.length, 15, `level ${lvl} should produce 15 items`);
    for (const item of round) {
      assert.equal(item.level, lvl);
      assert.equal(new Set(item.options).size, 4);
      assert.ok(item.options.includes(item.answer));
    }
  }
});

test('Konjugation bank has 100 unique verbs (25 per level = 1,800 forms) and grades accurately', () => {
  assert.ok(qt.KONJUGATION_BANK.length >= 100, `expected >=100 verbs, got ${qt.KONJUGATION_BANK.length}`);
  const seen = new Set();
  const perLevel = {A1: 0, A2: 0, B1: 0, B2: 0};
  for (const verb of qt.KONJUGATION_BANK) {
    assert.equal(seen.has(verb.infinitive), false, `duplicate verb ${verb.infinitive}`);
    seen.add(verb.infinitive);
    perLevel[verb.level]++;
    assert.equal(verb.praesens[3], verb.praesens[5], `wir and sie/Sie Präsens must match for ${verb.infinitive}`);
    assert.equal(verb.praeteritum[0], verb.praeteritum[2], `ich and er/sie/es Präteritum must match for ${verb.infinitive}`);
    assert.equal(verb.praeteritum[3], verb.praeteritum[5], `wir and sie/Sie Präteritum must match for ${verb.infinitive}`);
    for (const tense of ['praesens', 'praeteritum', 'perfekt']) {
      for (let p = 0; p < 6; p++) {
        const form = qt.conjugateVerb(verb, tense, p);
        assert.ok(form && form.trim().length > 0, `empty form for ${verb.infinitive} ${tense} ${p}`);
        if (tense === 'perfekt') {
          assert.match(form, /^(habe|hast|hat|haben|habt|bin|bist|ist|sind|seid) /, `Perfekt must start with aux: ${form}`);
        }
      }
    }
  }
  for (const lvl of ['A1', 'A2', 'B1', 'B2']) {
    assert.ok(perLevel[lvl] >= 25, `expected >=25 verbs for ${lvl}, got ${perLevel[lvl]}`);
  }
  const item = {id: 't', infinitive: 'fahren', meaning: 'sürmek', level: 'A1', tense: 'praesens', personIndex: 1, pronoun: 'du', answer: 'fährst'};
  assert.equal(qt.checkKonjugationAnswer(item, 'fährst'), 'correct');
  assert.equal(qt.checkKonjugationAnswer(item, 'du fährst'), 'correct');
  assert.equal(qt.checkKonjugationAnswer(item, 'faehrst'), 'umlaut');
  assert.equal(qt.checkKonjugationAnswer(item, 'fahrst'), 'wrong');
  assert.equal(qt.checkKonjugationAnswer(item, '   '), 'empty');
});

test('Verbinden trainer builds unambiguous shuffled boards across all 4 modes including 40 antonyms', () => {
  assert.ok(qt.ANTONYM_PAIRS.length >= 40, `expected >=40 antonym pairs, got ${qt.ANTONYM_PAIRS.length}`);
  const sampleCards = [
    {id: 'c1', word: 'Haus', article: 'das', meaning: 'ev'},
    {id: 'c2', word: 'Buch', article: 'das', meaning: 'kitap'},
    {id: 'c3', word: 'Tisch', article: 'der', meaning: 'masa'},
  ];
  for (const mode of ['words', 'rection', 'patterns', 'antonyms']) {
    const boards = qt.buildVerbindenRound(sampleCards, mode, 3, 5, 'test-seed');
    assert.equal(boards.length, 3, `mode ${mode} should produce 3 full boards`);
    for (const b of boards) {
      assert.equal(b.pairs.length, 5);
      assert.equal(b.rightOrder.length, b.pairs.length);
      const leftSet = new Set(b.pairs.map((p) => p.left.toLocaleLowerCase('de')));
      const rightSet = new Set(b.pairs.map((p) => p.right.toLocaleLowerCase('tr')));
      assert.equal(leftSet.size, b.pairs.length, `ambiguous duplicate left in ${mode}/${b.id}`);
      assert.equal(rightSet.size, b.pairs.length, `ambiguous duplicate right in ${mode}/${b.id}`);
      const sameOrder = b.pairs.every((p, i) => p.id === b.rightOrder[i]);
      assert.equal(sameOrder, false, `right column must be shuffled in ${mode}/${b.id}`);
    }
  }
});

test('QuickTrainers UI preserves translate=no, SVG line drawing, and error-log wiring', () => {
  const ui = fs.readFileSync('components/quick-trainers.tsx', 'utf8');
  assert.ok(ui.includes('translate="no"'), 'German trainer cards must set translate="no"');
  assert.ok(ui.includes('<svg className="qt-svg"'), 'Verbinden must render SVG connection lines');
  assert.ok(ui.includes('recordError('), 'Mistakes must be logged to Hata Defteri');
  assert.ok(ui.includes('onPointerDown') && ui.includes('onPointerMove'), 'Verbinden must support drag-to-connect');
});
