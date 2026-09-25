import { test } from 'node:test';
import assert from 'node:assert';
import { nextOwe, ballSize, BORROW, PAY, EXTRA, MAX_WAITS } from '../lessons/debt.mjs';

test('paying back shrinks what is owed and never goes below zero', () => {
  assert.strictEqual(nextOwe(6, 'pay'), 6 - PAY);
  assert.strictEqual(nextOwe(1, 'pay'), 0);
  assert.strictEqual(nextOwe(0, 'pay'), 0);
});

test('waiting adds a little extra (interest)', () => {
  assert.strictEqual(nextOwe(6, 'wait'), 6 + EXTRA);
});

test('paying right away costs exactly what was borrowed; waiting costs more', () => {
  const total = (plan) => {
    let owe = BORROW, paid = 0;
    for (const a of plan) { if (a === 'pay') paid += Math.min(PAY, owe); owe = nextOwe(owe, a); }
    while (owe > 0) { paid += Math.min(PAY, owe); owe = nextOwe(owe, 'pay'); }
    return paid;
  };
  assert.strictEqual(total([]), BORROW);
  assert.strictEqual(total(Array(MAX_WAITS).fill('wait')), BORROW + MAX_WAITS * EXTRA);
});

test('the snowball grows with what is owed but stays on screen', () => {
  assert.ok(ballSize(BORROW + MAX_WAITS) > ballSize(BORROW));
  assert.ok(ballSize(1000) <= 120);
});
