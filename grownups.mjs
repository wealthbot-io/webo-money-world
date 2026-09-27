// For Grown-ups page: renders the lesson guide from the same registry the game
// uses, so the parents' view can never drift from what children play. Pure DOM,
// no Alpine (CSP-clean: script-src 'self').
import { LESSONS } from './lessons/index.mjs';
import { escapeHtml } from './lib/lesson-kit.mjs';

// Exported for tests: the markup for one lesson card.
export function lessonCard(l, i) {
  return `<li class="gu-card">
      <div class="gu-card-head">
        <span class="gu-ico" aria-hidden="true">${l.icon}</span>
        <div>
          <div class="gu-no">Lesson ${i + 1}</div>
          <h3 class="gu-name">${escapeHtml(l.name)}</h3>
        </div>
      </div>
      <p class="gu-teaches"><b>Teaches:</b> ${escapeHtml(l.grownups.teaches)}</p>
      <p class="gu-home"><b>Try at home:</b> ${escapeHtml(l.grownups.tryAtHome)}</p>
    </li>`;
}

export function render(root) {
  root.innerHTML = LESSONS.map(lessonCard).join('');
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('guLessons');
  if (root) render(root);
}
