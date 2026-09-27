import { test } from 'node:test';
import assert from 'node:assert';
import { lessonCard } from '../grownups.mjs';
import { LESSONS } from '../lessons/index.mjs';

test('every lesson renders a grown-ups card with what it teaches and a try-at-home idea', () => {
  LESSONS.forEach((l, i) => {
    const html = lessonCard(l, i);
    assert.match(html, new RegExp(`Lesson ${i + 1}`));
    assert.ok(html.includes(l.grownups.teaches.split(' ')[0]), 'teaches text present');
    assert.match(html, /Try at home:/);
    assert.ok(!html.includes('—'));
  });
});

test('lessonCard escapes HTML in copy', () => {
  const html = lessonCard({ icon: 'x', name: '<b>x</b>', grownups: { teaches: 'a <script>', tryAtHome: 'b' } }, 0);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
});
