import { test } from 'node:test';
import assert from 'node:assert';
import { weboHtml, speech, escapeHtml, mergeProgress, prefersReducedMotion } from '../lib/lesson-kit.mjs';

test('escapeHtml encodes the dangerous HTML characters', () => {
  assert.strictEqual(escapeHtml('<b>"x"</b> & y'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y');
  assert.strictEqual(escapeHtml('plain'), 'plain');
  assert.strictEqual(escapeHtml(42), '42');
});

test('speech wraps text in a bubble with the Webo avatar', () => {
  const html = speech('hello money');
  assert.ok(html.includes('hello money'));
  assert.ok(html.includes('class="speech"'));
  assert.ok(html.includes('class="bubble"'));
  assert.ok(html.includes(weboHtml()));
});

test('mergeProgress ORs completed flags and never downgrades a local star', () => {
  const lessons = [
    { id: 'jars', completed: true },
    { id: 'penny', completed: false },
    { id: 'seeds', completed: false },
  ];
  mergeProgress(lessons, { lessons: [
    { id: 'jars', completed: false },  // must NOT downgrade the local true
    { id: 'penny', completed: true },  // upgrades
    { id: 'ghost', completed: true },  // unknown id ignored
  ] });
  assert.strictEqual(lessons.find((l) => l.id === 'jars').completed, true);
  assert.strictEqual(lessons.find((l) => l.id === 'penny').completed, true);
  assert.strictEqual(lessons.find((l) => l.id === 'seeds').completed, false);
  assert.strictEqual(lessons.length, 3, 'unknown ids do not add entries');
});

test('mergeProgress tolerates a missing/garbage blob', () => {
  const lessons = [{ id: 'jars', completed: false }];
  assert.doesNotThrow(() => mergeProgress(lessons, null));
  assert.doesNotThrow(() => mergeProgress(lessons, {}));
  assert.doesNotThrow(() => mergeProgress(lessons, { lessons: 'nope' }));
  assert.strictEqual(lessons[0].completed, false);
});

test('prefersReducedMotion is safe to call without a window (returns false)', () => {
  assert.strictEqual(prefersReducedMotion(), false);
});

import { pickHint } from '../lib/lesson-kit.mjs';

const reg = [{ id: 'a', tip: 'tip A' }, { id: 'b', tip: 'tip B' }, { id: 'c', tip: 'tip C' }];
const prog = (...done) => reg.map((l, i) => ({ id: l.id, name: 'Lesson ' + l.id.toUpperCase(), completed: done.includes(i) }));

test('pickHint nudges toward the first lesson when nothing is earned yet', () => {
  assert.match(pickHint(reg, prog(), 0.9), /Ready for "Lesson A"/);
});

test('pickHint splits between the next-lesson nudge and an earned tip', () => {
  assert.match(pickHint(reg, prog(0), 0.2), /Ready for "Lesson B"/);
  assert.strictEqual(pickHint(reg, prog(0), 0.7), 'tip A');
  assert.strictEqual(pickHint(reg, prog(0, 1), 0.99), 'tip B'); // never past the last earned tip
});

test('pickHint celebrates when every lesson is done', () => {
  assert.match(pickHint(reg, prog(0, 1, 2), 0.1), /finished every lesson/);
});

import { pickSuggestions, GENERIC_ASKS } from '../lib/lesson-kit.mjs';

const reg2 = [{ id: 'a', ask: ['A1?', 'A2?'] }, { id: 'b', ask: ['B1?', 'B2?'] }, { id: 'c' }];
const prog2 = (...done) => reg2.map((l, i) => ({ id: l.id, completed: done.includes(i) }));

test('pickSuggestions falls back to generic starters before any lesson is earned', () => {
  assert.deepStrictEqual(pickSuggestions(reg2, prog2()), GENERIC_ASKS);
});

test('pickSuggestions follows the most recently earned lesson, then fills with generics', () => {
  assert.deepStrictEqual(pickSuggestions(reg2, prog2(0, 1)), ['B1?', 'B2?', GENERIC_ASKS[0], GENERIC_ASKS[1]]);
});

test('pickSuggestions honours an explicit focus (opened from a reward card) and tolerates a lesson without chips', () => {
  assert.deepStrictEqual(pickSuggestions(reg2, prog2(0, 1), 0), ['A1?', 'A2?', GENERIC_ASKS[0], GENERIC_ASKS[1]]);
  assert.deepStrictEqual(pickSuggestions(reg2, prog2(2), 2), GENERIC_ASKS);
});
