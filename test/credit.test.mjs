import { test } from 'node:test';
import assert from 'node:assert';
import { billAfter, PRICE, LATE_FEE, MAX_LATE } from '../lessons/credit.mjs';

test('paying on Bill Day costs exactly the price (nothing extra)', () => {
  assert.strictEqual(billAfter(0), PRICE);
});

test('each month of waiting adds the late fee', () => {
  assert.strictEqual(billAfter(1), PRICE + LATE_FEE);
  assert.strictEqual(billAfter(MAX_LATE), PRICE + MAX_LATE * LATE_FEE);
});

test('billAfter never shrinks below the price', () => {
  assert.strictEqual(billAfter(-3), PRICE);
});
