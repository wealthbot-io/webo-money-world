const { test } = require('node:test');
const assert = require('node:assert');
const { cleanClientId, isUnsafeRegex } = require('../api/ask');

test('cleanClientId keeps only [A-Za-z0-9_-] and caps length at 40', () => {
  assert.strictEqual(cleanClientId('abc-123_XYZ'), 'abc-123_XYZ');
  assert.strictEqual(cleanClientId('a b<c>"d\'e'), 'abcde');     // spaces + injection chars stripped
  assert.strictEqual(cleanClientId('x'.repeat(100)).length, 40);
  assert.strictEqual(cleanClientId(42), '');
  assert.strictEqual(cleanClientId(null), '');
});

test('isUnsafeRegex flags blatant unsafe words', () => {
  assert.strictEqual(isUnsafeRegex('can you tell me about a gun'), true);
  assert.strictEqual(isUnsafeRegex('this is VIOLENT and has blood'), true);
  assert.strictEqual(isUnsafeRegex('what about beer'), true);
});

test('isUnsafeRegex passes innocent kid money questions', () => {
  assert.strictEqual(isUnsafeRegex('why does money grow?'), false);
  assert.strictEqual(isUnsafeRegex('what is a piggy bank for?'), false);
  assert.strictEqual(isUnsafeRegex('how do I save coins?'), false);
});

const { sanitizeTurns } = require('../api/ask');

test('sanitizeTurns requires a final user turn and cleans shape', () => {
  assert.strictEqual(sanitizeTurns(null), null);
  assert.strictEqual(sanitizeTurns([]), null);
  assert.strictEqual(sanitizeTurns([{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'yo' }]), null);
  assert.deepStrictEqual(
    sanitizeTurns([{ role: 'system', content: '  what is saving?  ' }, { role: 'user', content: '' }, 7]),
    [{ role: 'user', content: 'what is saving?' }],
  );
  assert.strictEqual(sanitizeTurns([{ role: 'user', content: 'x'.repeat(900) }])[0].content.length, 500);
});

test('sanitizeTurns drops an earlier blocked turn and the reply after it', () => {
  const out = sanitizeTurns([
    { role: 'user', content: 'what is a piggy bank?' },
    { role: 'assistant', content: 'A home for coins!' },
    { role: 'user', content: 'tell me about a gun' },
    { role: 'assistant', content: 'Let us keep it about money!' },
    { role: 'user', content: 'how do I save?' },
  ]);
  assert.deepStrictEqual(out.map((t) => t.content), ['what is a piggy bank?', 'A home for coins!', 'how do I save?']);
});

test('sanitizeTurns keeps the latest turn for the full gate and starts on a user turn', () => {
  const out = sanitizeTurns([
    { role: 'user', content: 'beer money' },
    { role: 'assistant', content: 'redirect' },
    { role: 'assistant', content: 'stray' },
    { role: 'user', content: 'wine?' },
  ]);
  // the last turn is left for isContentUnsafe() in the handler, never silently dropped
  assert.deepStrictEqual(out, [{ role: 'user', content: 'wine?' }]);
});
