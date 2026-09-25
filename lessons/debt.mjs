// LESSON 10: The Owe-Snowball - borrowing and debt (#12). The mirror image of the
// Magic Penny: a little extra each week you wait makes what you owe grow. Tone is
// cause-and-effect, never scary or shaming. Prop is placed via prop.pos (no art file yet; the SVG renders).

export const BORROW = 6;   // coins borrowed for the ball
export const PAY = 2;      // coins the kid can pay back each week
export const EXTRA = 1;    // the "little extra" (interest) added for each week of waiting
export const MAX_WAITS = 3; // after this, Webo steers to paying back (the lesson stays short)

// Pure: what is owed after one week's choice. Paying never goes below zero.
export function nextOwe(owe, action) {
  if (action === 'pay') return Math.max(0, owe - PAY);
  if (action === 'wait') return owe + EXTRA;
  return owe;
}

// Snowball size in px for the amount owed (grows gently, stays on screen).
export function ballSize(owe) {
  return Math.min(120, 36 + owe * 9);
}

export default {
  id: 'debt',
  no: 'LESSON 10',
  name: 'The Owe-Snowball',
  sub: 'Borrow carefully, pay back soon',
  icon: '\u{2603}\u{FE0F}',
  rewardTitle: 'Snowball melted!',
  prop: {
    pos: { left: '27%', bottom: '6px' },
    html: `<svg width="40" height="52" viewBox="0 0 48 62">
          <circle cx="24" cy="44" r="16" fill="#eaf2ff"/>
          <circle cx="24" cy="20" r="11" fill="#eaf2ff"/>
          <circle cx="20" cy="18" r="1.6" fill="#0a1628"/><circle cx="28" cy="18" r="1.6" fill="#0a1628"/>
          <path d="M24 21 L31 23 L24 24 Z" fill="#f5a623"/>
          <path d="M14 29 Q24 34 34 29" stroke="#ff7b6b" stroke-width="4" fill="none" stroke-linecap="round"/>
          <rect x="16" y="4" width="16" height="6" rx="2" fill="#4fd1c5"/>
          <circle cx="24" cy="40" r="1.8" fill="#9fb4d4"/><circle cx="24" cy="47" r="1.8" fill="#9fb4d4"/>
        </svg>`,
  },
  run(ctx) {
    let owe = BORROW;
    let week = 1;
    let waits = 0;
    let paidTotal = 0;

    const finish = () => {
      const extra = paidTotal - BORROW;
      const msg = extra === 0
        ? `You paid it all back <b>fast</b>, so you paid just <b>${BORROW} coins</b>. No extra at all! \u{1F31F} Borrowing is okay when you pay it back soon.`
        : `You paid back <b>${paidTotal} coins</b> for a ${BORROW}-coin ball. The <b>${extra} extra</b> came from waiting. That extra is called <b>interest</b>. Paying back soon keeps the snowball tiny! \u{2603}\u{FE0F}`;
      ctx.renderStep(
        `<div class="lesson-intro">${ctx.speech(msg)}</div>`,
        `<button class="btn" id="debtFin">Finish Lesson ⭐</button>`
      );
      ctx.ovActions.querySelector('#debtFin').onclick =
        () => ctx.finish("You learned how borrowing works! A friendly snowman moved into Webo's world. \u{2603}\u{FE0F}");
    };

    const round = () => {
      const canWait = waits < MAX_WAITS;
      const size = ballSize(owe);
      ctx.renderStep(`
        <div class="lesson-intro">${ctx.speech(week === 1
          ? `You borrowed <b>${BORROW} coins</b> from a friend to get a ball right now \u{26BD}. That is a promise to pay them back! Each week you have <b>${PAY} coins</b>. Pay some back, or wait?`
          : `Week <b>${week}</b>! You still owe <b>${owe}</b>. Pay ${PAY} back, or wait one more week?`)}</div>
        <div class="lesson-stage">
          <div class="goal-top">You owe <span class="goal-count">${owe} coins</span></div>
          <div class="debt-stage">
            <div class="debt-ball" role="img" aria-label="Owe-snowball: ${owe} coins"
                 style="width:${size}px;height:${size}px">${owe}</div>
          </div>
          <div class="goal-choices">
            <button class="choice debt-pay">\u{1FA99} Pay back ${Math.min(PAY, owe)} coins</button>
            ${canWait ? `<button class="choice debt-wait">\u{23F3} Wait and pay later</button>` : ''}
          </div>
          <div class="feedback" id="debtFb"></div>
        </div>
      `, `<button class="btn" id="debtNext" disabled>${canWait ? 'Pick Pay or Wait' : 'Pay back to keep going'}</button>`);

      const body = ctx.ovBody;
      const fb = body.querySelector('#debtFb');
      const next = ctx.ovActions.querySelector('#debtNext');
      const choices = body.querySelectorAll('.goal-choices .choice');
      const lock = (label, onNext) => {
        choices.forEach((x) => { x.disabled = true; });
        next.disabled = false;
        next.textContent = label;
        next.onclick = onNext;
      };

      if (!canWait) {
        fb.innerHTML = `The snowball is getting big! \u{2744}\u{FE0F} Let's start paying it back so it melts away.`;
        fb.className = 'feedback info show';
      }

      body.querySelector('.debt-pay').onclick = () => {
        const pay = Math.min(PAY, owe);
        paidTotal += pay;
        owe = nextOwe(owe, 'pay');
        week++;
        body.querySelector('.debt-pay').classList.add('correct');
        if (owe === 0) {
          fb.innerHTML = `All paid back! \u{1F389} The snowball melted away. Your friend is happy you kept your promise.`;
          fb.className = 'feedback good show';
          lock('See what Webo says →', finish);
          return;
        }
        fb.innerHTML = `Nice! \u{1F31F} The snowball shrank to <b>${owe}</b>.`;
        fb.className = 'feedback good show';
        lock('Next week →', round);
      };

      const waitBtn = body.querySelector('.debt-wait');
      if (waitBtn) waitBtn.onclick = () => {
        waits++;
        owe = nextOwe(owe, 'wait');
        week++;
        waitBtn.classList.add('wrong');
        fb.innerHTML = `You waited, so a <b>little extra</b> got added. The snowball rolled bigger: now you owe <b>${owe}</b>. \u{2744}\u{FE0F}`;
        fb.className = 'feedback info show';
        lock('Next week →', round);
      };
    };

    round();
  },
};
