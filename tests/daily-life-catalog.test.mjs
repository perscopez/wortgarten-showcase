import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import vm from 'node:vm';

const bundled = buildSync({
  entryPoints: [decodeURIComponent(new URL('../lib/daily-life-catalog.ts', import.meta.url).pathname)],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});
const module = { exports: {} };
vm.runInNewContext(bundled.outputFiles[0].text, { exports: module.exports, module });
const { DAILY_LIFE_CATALOG } = module.exports;
const categories = ['market', 'ulaşım', 'doktor', 'ev', 'sohbet'];
const levels = ['A1', 'A2', 'B1-bridge'];

test('catalog contains two bilingual original dialogs per requested category', () => {
  assert.equal(DAILY_LIFE_CATALOG.length, 10);
  assert.deepEqual([...new Set(DAILY_LIFE_CATALOG.map((dialog) => dialog.category))].sort(), [...categories].sort());
  for (const category of categories) {
    assert.equal(DAILY_LIFE_CATALOG.filter((dialog) => dialog.category === category).length, 2, category);
  }
  const ids = DAILY_LIFE_CATALOG.map((dialog) => dialog.id);
  assert.equal(new Set(ids).size, ids.length, 'dialog IDs must be unique');

  for (const dialog of DAILY_LIFE_CATALOG) {
    assert.ok(dialog.id && dialog.title && dialog.targets.length > 0);
    assert.ok(levels.includes(dialog.level), dialog.level);
    assert.ok(dialog.turns.length >= 4 && dialog.turns.length <= 6, dialog.id);
    for (const turn of dialog.turns) {
      assert.ok(turn.speaker.trim() && turn.de.trim() && turn.tr.trim(), `${dialog.id} has an empty turn`);
    }
    assert.equal(dialog.provenance.kind, 'original');
    assert.ok(dialog.provenance.note.trim());
    assert.ok(Array.isArray(dialog.provenance.references));
  }
});

test('each dialog has one contextual choice and one exact-answer fill exercise', () => {
  const exerciseIds = [];
  let exerciseCount = 0;
  for (const dialog of DAILY_LIFE_CATALOG) {
    assert.equal(dialog.exercises.length, 2, dialog.id);
    assert.deepEqual(Array.from(dialog.exercises, (exercise) => exercise.kind).sort(), ['choice', 'fill']);
    for (const exercise of dialog.exercises) {
      exerciseCount += 1;
      exerciseIds.push(exercise.id);
      assert.ok(exercise.id && exercise.prompt.trim() && exercise.sentence.trim());
      assert.ok(exercise.translation.trim() && exercise.explanation.trim());
      assert.ok(Array.isArray(exercise.answers) && exercise.answers.length > 0);
      if (exercise.kind === 'choice') {
        assert.ok(Array.isArray(exercise.options) && exercise.options.length >= 2, exercise.id);
        assert.equal(new Set(exercise.options).size, exercise.options.length, exercise.id);
        for (const answer of exercise.answers) assert.ok(exercise.options.includes(answer), `${exercise.id}: answer is not an option`);
        assert.ok(!exercise.sentence.includes(exercise.answers[0]), `${exercise.id}: sentence reveals its answer`);
      } else {
        assert.equal((exercise.sentence.match(/___/g) ?? []).length, 1, `${exercise.id}: expected exactly one blank`);
        assert.equal(exercise.options, undefined);
      }
    }
  }
  assert.equal(exerciseCount, 20);
  assert.equal(new Set(exerciseIds).size, exerciseIds.length, 'exercise IDs must be unique');
});

test('ticket and moving-box wording remain clear after naturalness review',()=>{const ticket=DAILY_LIFE_CATALOG.find(d=>d.id==='transport-ticket-a1');assert(ticket.turns.some(t=>t.de.includes('Eine einfache Fahrt')));assert(!JSON.stringify(ticket).includes('Einzeln'));const home=DAILY_LIFE_CATALOG.find(d=>d.id==='home-neighbor-a1');assert(home.turns.some(t=>t.de.includes('diese Kiste tragen')));assert(!JSON.stringify(home).includes('Eine Kiste wäre toll'));});
