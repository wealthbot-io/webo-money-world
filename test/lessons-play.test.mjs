// Plays every lesson to its star in a lightweight DOM (linkedom), the way a child
// would tap through it. Catches a wired-wrong button, a dead end, or a lesson that
// never calls finish() BEFORE it deploys. Runs under plain `npm test`; no browser.
//
// TO ADD A LESSON: add a driver below keyed by its id (the registry test fails
// until every lesson has one). A driver clicks through the happy path using the
// tiny helpers; it should end with the lesson's Finish button.
import { test } from 'node:test';
import assert from 'node:assert';
import { parseHTML } from 'linkedom';
import { LESSONS } from '../lessons/index.mjs';
import { speech } from '../lib/lesson-kit.mjs';

// ---- a minimal browser: enough for lessons (innerHTML, querySelector, onclick,
// classList, dataset, style, disabled, animate) -------------------------------
function makeDom() {
  const { window, document } = parseHTML('<!doctype html><html><body><div id="ovBody"></div><div id="ovActions"></div></body></html>');
  globalThis.window = window;
  globalThis.document = document;
  // Web Animations API is not in linkedom; lessons only fire-and-forget it.
  window.Element.prototype.animate = () => ({ onfinish: null });
  return { body: document.getElementById('ovBody'), actions: document.getElementById('ovActions') };
}

// The same ctx the app hands a lesson (app.mjs _lessonCtx), minus the app. Every
// rendered step is captured so we can assert on copy and on dead ends.
function makeCtx(dom) {
  const steps = [];
  const finished = [];
  const ctx = {
    renderStep(bodyHtml, actionsHtml) {
      dom.body.innerHTML = bodyHtml;
      dom.actions.innerHTML = actionsHtml || '';
      steps.push({ body: bodyHtml, actions: actionsHtml || '' });
    },
    speech,
    shuffle: (a) => a, // deterministic
    finish: (text) => finished.push(text),
    reduceMotion: true, // lessons skip their setTimeout waits, so play-through is synchronous
    get ovBody() { return dom.body; },
    get ovActions() { return dom.actions; },
  };
  return { ctx, steps, finished };
}

// ---- tap helpers: behave like a real click on a real button ------------------
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];
function click(elOrSel) {
  const el = typeof elOrSel === 'string' ? q(elOrSel) : elOrSel;
  assert.ok(el, `expected an element for ${elOrSel}`);
  assert.ok(!el.disabled, `${elOrSel} is disabled (dead end?)`);
  assert.strictEqual(typeof el.onclick, 'function', `${elOrSel} has no click handler`);
  el.onclick({ currentTarget: el, target: el });
}
// Click `sel` repeatedly (advancing with `next` between rounds) until `until` exists.
function clickUntil(sel, next, until, max = 30) {
  for (let i = 0; i < max; i++) {
    if (q(until)) return;
    click(sel); click(next);
  }
  assert.ok(q(until), `never reached ${until}`);
}

// ---- one driver per lesson: the happy path a child would take -----------------
const DRIVERS = {
  jars() {
    const jars = qa('.jar-big');
    for (let i = 0; i < 6; i++) click(jars[i % 3]);
    click('#jarDone'); click('#finJar');
  },
  penny() {
    const s = q('#pSlider'); s.value = '30'; s.oninput();
    click('#pDone');
  },
  seeds() {
    qa('.seed').forEach((s) => click(s));
    click('#seedDone'); click('#finSeed');
  },
  needs() {
    clickUntil('.nw-need', '#nwNext', '#nwFin', 10);
    click('#nwFin');
  },
  goal() {
    clickUntil('.goal-save', '#goalNext', '#goalFin', 10);
    click('#goalFin');
  },
  earn() {
    qa('.earn-job').forEach((b) => click(b));
    click('#earnNext'); click('#earnFin');
  },
  giving() {
    click('#giveShare'); click('#giveShare');
    click('#giveNext'); click('#giveFin');
  },
  safe() {
    click('#pocketCheck'); click('#safeBtn'); // pocket -> piggy
    click('#safeBtn');                        // piggy -> bank
    click('#safeBtn');                        // lock coins (reveal is synchronous under reduceMotion)
    click('#safeBtn');                        // finish
  },
  taxes() {
    qa('.house').forEach((h) => click(h));
    click('#taxBtn'); click('#taxFin');
  },
  debt() {
    click('.debt-wait'); click('#debtNext'); // one wait, so the "interest" ending is exercised
    clickUntil('.debt-pay', '#debtNext', '#debtFin', 10);
    click('#debtFin');
  },
  credit() {
    click('#ccTap'); click('#ccTap');
    click('.cc-late'); click('#ccGo');       // one late month
    click('.cc-pay'); click('#ccGo'); click('#ccNext');
    click('[data-a="free"]');                 // wrong answer first: must not finish
    assert.ok(q('#ccFin').disabled, 'a wrong quiz answer must not unlock Finish');
    click('[data-a="promise"]'); click('#ccFin');
  },
  helpers() {
    click('#mhGo');
    for (let i = 0; i < 4; i++) click('#mhAsk');
    click('#mhRace'); click('#mhRace');       // race runs synchronously under reduceMotion
    click('[data-a="toys"]');
    assert.ok(q('#mhFin').disabled, 'a wrong quiz answer must not unlock Finish');
    click('[data-a="plan"]'); click('#mhFin');
  },
};

test('every lesson in the registry has a play-through driver', () => {
  for (const l of LESSONS) assert.ok(DRIVERS[l.id], `lessons/${l.id}.mjs needs a driver in test/lessons-play.test.mjs`);
});

for (const lesson of LESSONS) {
  test(`lesson "${lesson.id}" plays to its star`, () => {
    const dom = makeDom();
    const { ctx, steps, finished } = makeCtx(dom);
    lesson.run(ctx);
    assert.ok(steps.length >= 1, 'run() renders a first step');

    DRIVERS[lesson.id]();

    assert.strictEqual(finished.length, 1, 'finish() is called exactly once');
    assert.ok(finished[0].length > 10, 'finish() carries reward text');
    for (const s of steps) {
      const html = s.body + s.actions;
      assert.ok(!html.includes('—'), `step copy has an em dash: ${html.slice(0, 80)}`);
      assert.ok(/<button/.test(s.actions) || /<button|<input|onclick/.test(s.body), 'every step has something to tap');
    }
  });

  test(`lesson "${lesson.id}" first screen has no enabled Finish (no skipping the lesson)`, () => {
    const dom = makeDom();
    const { ctx } = makeCtx(dom);
    lesson.run(ctx);
    const fin = qa('#ovActions button').find((b) => /Finish/.test(b.textContent));
    assert.ok(!fin || fin.disabled, 'Finish must not be tappable before the lesson is played');
  });
}
