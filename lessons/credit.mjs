// LESSON 11: The Pay-Later Card - credit cards (#13). The applied version of the
// Owe-Snowball: a pay-later card is a promise to pay. Pay the whole bill on Bill
// Day and it costs nothing extra; wait and the bill grows. Ends with a one-question
// check that a card is not free money. Cause-and-effect, never encouraging spending,
// no card brands, no em dashes. Prop is placed via prop.pos (no art file yet).

export const PRICE = 10;    // coins for the book
export const LATE_FEE = 2;  // extra added to the bill for each month it waits
export const MAX_LATE = 2;  // after this, Webo steers to paying (the lesson stays short)

// Pure: the bill after it has waited `lateMonths` Bill Days.
export function billAfter(lateMonths) {
  return PRICE + Math.max(0, lateMonths) * LATE_FEE;
}

// A kid-sized pay-later card (no brand, no numbers that look real).
function cardHtml(label) {
  return `<div class="paycard" aria-hidden="true">
      <div class="paycard-chip"></div>
      <div class="paycard-name">PAY-LATER CARD</div>
      <div class="paycard-label">${label}</div>
    </div>`;
}

export default {
  id: 'credit',
  no: 'LESSON 11',
  name: 'The Pay-Later Card',
  sub: 'Credit cards are a promise',
  icon: '\u{1F4B3}',
  rewardTitle: 'Card smart!',
  prop: {
    pos: { left: '23%', bottom: '96px' },
    html: `<svg width="46" height="32" viewBox="0 0 46 32">
          <rect x="1" y="1" width="44" height="30" rx="5" fill="#4fd1c5"/>
          <rect x="1" y="7" width="44" height="6" fill="#0a1628" opacity=".55"/>
          <rect x="6" y="17" width="9" height="7" rx="1.5" fill="#ffb938"/>
          <circle cx="34" cy="22" r="4" fill="#f5a623"/><circle cx="38" cy="22" r="4" fill="#ff7b6b" opacity=".85"/>
        </svg>`,
  },
  run(ctx) {
    let late = 0;

    // Step 4: a one-question check, so the big idea sticks.
    const quiz = () => {
      ctx.renderStep(`
        <div class="lesson-intro">${ctx.speech('Quick question before your star! \u{1F914} Is a pay-later card <b>free money</b>?')}</div>
        <div class="lesson-stage">
          <div class="goal-choices">
            <button class="choice" data-a="free">\u{1F381} Yes, free stuff!</button>
            <button class="choice" data-a="promise">\u{1F91D} No, it is a promise to pay</button>
          </div>
          <div class="feedback" id="ccQuizFb"></div>
        </div>
      `, `<button class="btn" id="ccFin" disabled>Pick an answer</button>`);
      const fb = ctx.ovBody.querySelector('#ccQuizFb');
      const fin = ctx.ovActions.querySelector('#ccFin');
      ctx.ovBody.querySelectorAll('.choice').forEach((b) => {
        b.onclick = () => {
          if (b.dataset.a === 'promise') {
            b.classList.add('correct');
            ctx.ovBody.querySelectorAll('.choice').forEach((x) => { x.disabled = true; });
            fb.innerHTML = `Yes! \u{1F31F} The card pays now, and you <b>promise</b> to pay it all back. It is a tool, not free money.`;
            fb.className = 'feedback good show';
            fin.disabled = false;
            fin.textContent = 'Finish Lesson ⭐';
            fin.onclick = () => ctx.finish("You learned how a pay-later card works! A shiny card landed in Webo's world. \u{1F4B3}");
          } else {
            b.classList.add('wrong');
            b.disabled = true;
            fb.innerHTML = `Hmm, not quite! \u{1F914} Remember the bill? Everything bought with the card has to be paid back. Try the other answer!`;
            fb.className = 'feedback info show';
          }
        };
      });
    };

    // Step 3: what happened, compared with paying on Bill Day.
    const result = () => {
      const paid = billAfter(late);
      const extra = paid - PRICE;
      const msg = extra === 0
        ? `You paid the <b>whole bill on Bill Day</b>, so the book cost just <b>${PRICE} coins</b>. Nothing extra! \u{1F389} That is the pay-later trick.`
        : `You paid <b>${paid} coins</b> for a ${PRICE}-coin book. The <b>${extra} extra</b> is called <b>interest</b>, and it came from waiting. Paying the whole bill on Bill Day means paying nothing extra! \u{1F4A1}`;
      ctx.renderStep(
        `<div class="lesson-intro">${ctx.speech(msg)}</div>`,
        `<button class="btn" id="ccNext">One more thing →</button>`
      );
      ctx.ovActions.querySelector('#ccNext').onclick = quiz;
    };

    // Step 2: Bill Day. Pay the whole bill, or let it wait a month.
    const billDay = () => {
      const bill = billAfter(late);
      const canWait = late < MAX_LATE;
      ctx.renderStep(`
        <div class="lesson-intro">${ctx.speech(late === 0
          ? `It is <b>Bill Day</b>! \u{1F4EC} The card sent a bill for your book. Pay it all now, or pay later?`
          : `Another Bill Day! \u{1F4EC} Waiting made the bill bigger. What now?`)}</div>
        <div class="lesson-stage">
          <div class="cc-bill" role="status">\u{1F9FE} Bill: <b>${bill} coins</b></div>
          <div class="goal-week">Book price: <b>${PRICE} coins</b>${late ? ` &middot; months waited: <b>${late}</b>` : ''}</div>
          <div class="goal-choices">
            <button class="choice cc-pay">\u{2705} Pay the whole bill</button>
            ${canWait ? `<button class="choice cc-late">\u{1F4C5} Pay it next month</button>` : ''}
          </div>
          <div class="feedback" id="ccFb"></div>
        </div>
      `, `<button class="btn" id="ccGo" disabled>${canWait ? 'Pick Pay or Later' : 'Pay the bill to keep going'}</button>`);

      const body = ctx.ovBody;
      const fb = body.querySelector('#ccFb');
      const go = ctx.ovActions.querySelector('#ccGo');
      const choices = body.querySelectorAll('.goal-choices .choice');
      const lock = (label, onGo) => {
        choices.forEach((x) => { x.disabled = true; });
        go.disabled = false;
        go.textContent = label;
        go.onclick = onGo;
      };

      if (!canWait) {
        fb.innerHTML = `The bill keeps growing while it waits! \u{1F4C8} Time to pay it off.`;
        fb.className = 'feedback info show';
      }

      body.querySelector('.cc-pay').onclick = () => {
        body.querySelector('.cc-pay').classList.add('correct');
        fb.innerHTML = `Paid! \u{2705} The bill is all done and the promise is kept.`;
        fb.className = 'feedback good show';
        lock('See what happened →', result);
      };
      const lateBtn = body.querySelector('.cc-late');
      if (lateBtn) lateBtn.onclick = () => {
        late++;
        lateBtn.classList.add('wrong');
        fb.innerHTML = `Okay, it can wait. But waiting adds <b>${LATE_FEE} extra coins</b>, so next month the bill is <b>${billAfter(late)}</b>.`;
        fb.className = 'feedback info show';
        lock('Next Bill Day →', billDay);
      };
    };

    // Step 1: buy now with the card (a promise to pay later).
    ctx.renderStep(`
      <div class="lesson-intro">${ctx.speech(`This is a <b>pay-later card</b> \u{1F4B3}. Grown-ups use one to buy something <b>now</b> and pay for it <b>later</b>. It is a <b>promise</b> to pay the money back! Let's buy a <b>${PRICE}-coin book</b> \u{1F4D8} with it.`)}</div>
      <div class="lesson-stage">
        ${cardHtml('Tap to pay later')}
        <div class="feedback" id="ccTapFb"></div>
      </div>
    `, `<button class="btn" id="ccTap">\u{1F4B3} Tap the card to buy the book</button>`);
    const tap = ctx.ovActions.querySelector('#ccTap');
    tap.onclick = () => {
      const card = ctx.ovBody.querySelector('.paycard');
      card.classList.add('tapped');
      card.querySelector('.paycard-label').textContent = 'Book bought! \u{1F4D8}';
      const fb = ctx.ovBody.querySelector('#ccTapFb');
      fb.innerHTML = `You got the book right away! \u{1F4D8} But you did not pay yet. A <b>bill</b> is coming on <b>Bill Day</b>.`;
      fb.className = 'feedback good show';
      tap.textContent = 'Wait for Bill Day →';
      tap.onclick = billDay;
    };
  },
};
