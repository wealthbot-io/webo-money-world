import { test } from 'node:test';
import assert from 'node:assert';
import { monthsToGoal, GOAL, INCOME, PLAN_SAVE, GUESS_SAVE, PLAN } from '../lessons/helpers.mjs';

test('a plan reaches the goal sooner than guessing', () => {
  assert.ok(monthsToGoal(GOAL, PLAN_SAVE) < monthsToGoal(GOAL, GUESS_SAVE));
});

test('monthsToGoal rounds up to whole months and guards zero', () => {
  assert.strictEqual(monthsToGoal(30, 4), 8);
  assert.strictEqual(monthsToGoal(30, 2), 15);
  assert.strictEqual(monthsToGoal(30, 0), Infinity);
});

test('the plan spends no more than the family has each month', () => {
  // save 4 + rainy-day 1 + seeds 1 = 6 = INCOME
  assert.strictEqual(PLAN_SAVE + 1 + 1, INCOME);
  assert.strictEqual(PLAN.length, 3);
});

test('brand tie-in copy stays clean: no products, tickers, or advice words', () => {
  const text = JSON.stringify(PLAN).toLowerCase();
  for (const bad of ['buy ', 'stock', 'fund', 'invest in', 'wealthbot']) assert.ok(!text.includes(bad), bad);
});
