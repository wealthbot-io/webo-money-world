// LESSON 12: Money Helpers - what a money helper (a wealth manager / coach) does
// (#14). The brand tie-in lesson, so it is kept especially clean: a helper makes a
// PLAN with a family; the plan reaches a goal faster than guessing. Strictly
// educational: no real advice, no products, no "buy this", no em dashes. Prop is
// placed via prop.pos (no art file yet; the SVG renders).

export const GOAL = 30;      // coins for the family's camping tent
export const INCOME = 6;     // coins the family has left each month
export const PLAN_SAVE = 4;  // coins the plan puts toward the tent each month
export const GUESS_SAVE = 2; // what guessing manages on average (some months slip)

// Pure: whole months to reach a goal at a steady amount per month.
export function monthsToGoal(goal, perMonth) {
  if (perMonth <= 0) return Infinity;
  return Math.ceil(goal / perMonth);
}

// The three pieces of the helper's plan (each one echoes an earlier lesson).
export const PLAN = [
  { emoji: '\u{1F3D5}\u{FE0F}', title: `Save ${PLAN_SAVE} coins a month for the tent`, why: 'a little every month adds up to the big thing (like the kite!)' },
  { emoji: '\u{2602}\u{FE0F}', title: 'Keep 1 coin in a rainy-day jar', why: 'surprises happen, and a safe jar means no borrowing' },
  { emoji: '\u{1F331}', title: 'Plant 1 coin as seeds', why: 'seeds grow slowly into more coins over time' },
];

export default {
  id: 'helpers',
  no: 'LESSON 12',
  name: 'Money Helpers',
  sub: 'A coach for your money plan',
  icon: '\u{1F4CB}',
  rewardTitle: 'You have a plan!',
  prop: {
    pos: { left: '66%', bottom: '150px' },
    html: `<svg width="34" height="44" viewBox="0 0 34 44">
          <rect x="2" y="6" width="30" height="36" rx="4" fill="#e08e0b"/>
          <rect x="5" y="10" width="24" height="29" rx="2" fill="#f5e6c8"/>
          <rect x="11" y="2" width="12" height="7" rx="2" fill="#4fd1c5"/>
          <path d="M9 18 l3 3 5 -6" stroke="#5ed47a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M9 27 l3 3 5 -6" stroke="#5ed47a" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="19" y="17" width="8" height="2.5" rx="1" fill="#9fb4d4"/>
          <rect x="19" y="26" width="8" height="2.5" rx="1" fill="#9fb4d4"/>
        </svg>`,
  },
  run(ctx) {
    const planMonths = monthsToGoal(GOAL, PLAN_SAVE);
    const guessMonths = monthsToGoal(GOAL, GUESS_SAVE);

    // Step 4: a one-question check that a helper is a planner, not a money-giver.
    const quiz = () => {
      ctx.renderStep(`
        <div class="lesson-intro">${ctx.speech('Last one! \u{1F914} What does a money helper do?')}</div>
        <div class="lesson-stage">
          <div class="goal-choices">
            <button class="choice" data-a="free">\u{1F381} Gives families free money</button>
            <button class="choice" data-a="plan">\u{1F4CB} Helps families make a smart plan</button>
            <button class="choice" data-a="toys">\u{1F9F8} Picks which toys you should buy</button>
          </div>
          <div class="feedback" id="mhQuizFb"></div>
        </div>
      `, `<button class="btn" id="mhFin" disabled>Pick an answer</button>`);
      const fb = ctx.ovBody.querySelector('#mhQuizFb');
      const fin = ctx.ovActions.querySelector('#mhFin');
      ctx.ovBody.querySelectorAll('.choice').forEach((b) => {
        b.onclick = () => {
          if (b.dataset.a === 'plan') {
            b.classList.add('correct');
            ctx.ovBody.querySelectorAll('.choice').forEach((x) => { x.disabled = true; });
            fb.innerHTML = `Yes! \u{1F31F} A money helper is like a coach: they help a family make a <b>plan</b> and stick to it. The family still makes its own choices!`;
            fb.className = 'feedback good show';
            fin.disabled = false;
            fin.textContent = 'Finish Lesson ⭐';
            fin.onclick = () => ctx.finish("You learned what a money helper does! A plan clipboard is pinned up in Webo's world. \u{1F4CB}");
          } else {
            b.classList.add('wrong');
            b.disabled = true;
            fb.innerHTML = b.dataset.a === 'free'
              ? `Nope! \u{1F605} Nobody hands out free money. A helper helps you plan the money you already have. Try again!`
              : `Not quite! \u{1F605} A helper does not pick things for you. They help with the big plan. Try again!`;
            fb.className = 'feedback info show';
          }
        };
      });
    };

    // Step 3: the race. Guessing vs the plan, month by month.
    const race = () => {
      ctx.renderStep(`
        <div class="lesson-intro">${ctx.speech(`Now let's watch! \u{1F3C1} One Bear family <b>guesses</b> each month. The other follows the <b>helper's plan</b>. Who gets the tent first?`)}</div>
        <div class="lesson-stage">
          <div class="race-row">
            <div class="race-label">\u{1F937} Guessing <span class="race-months" id="guessM">0 months</span></div>
            <div class="goal-bar"><div class="goal-fill race-guess" style="width:0"></div></div>
          </div>
          <div class="race-row">
            <div class="race-label">\u{1F4CB} With a plan <span class="race-months" id="planM">0 months</span></div>
            <div class="goal-bar"><div class="goal-fill race-plan" style="width:0"></div></div>
          </div>
          <div class="feedback" id="mhRaceFb"></div>
        </div>
      `, `<button class="btn" id="mhRace">Start the race \u{1F3C1}</button>`);

      const body = ctx.ovBody;
      const btn = ctx.ovActions.querySelector('#mhRace');
      const fb = body.querySelector('#mhRaceFb');
      const guessFill = body.querySelector('.race-guess');
      const planFill = body.querySelector('.race-plan');
      const guessM = body.querySelector('#guessM');
      const planM = body.querySelector('#planM');

      const finishRace = () => {
        fb.innerHTML = `The plan family got the tent in <b>${planMonths} months</b>. Guessing took <b>${guessMonths}</b>! Same coins, but a <b>plan</b> made them go further. \u{1F3D5}\u{FE0F}`;
        fb.className = 'feedback good show';
        btn.disabled = false;
        btn.textContent = 'One more thing →';
        btn.onclick = quiz;
      };

      btn.onclick = () => {
        btn.disabled = true;
        btn.textContent = 'Racing...';
        let month = 0;
        const step = () => {
          month++;
          const g = Math.min(GOAL, month * GUESS_SAVE);
          const p = Math.min(GOAL, month * PLAN_SAVE);
          guessFill.style.width = Math.round(g / GOAL * 100) + '%';
          planFill.style.width = Math.round(p / GOAL * 100) + '%';
          if (month <= guessMonths) guessM.textContent = `${Math.min(month, guessMonths)} months`;
          if (month <= planMonths) planM.textContent = `${Math.min(month, planMonths)} months`;
          if (month >= guessMonths) { finishRace(); return; }
          if (ctx.reduceMotion) step(); else setTimeout(step, 320);
        };
        step();
      };
    };

    // Step 2: build the plan. Tap "Ask the helper" three times; each tap adds a piece.
    const plan = () => {
      let revealed = 0;
      ctx.renderStep(`
        <div class="lesson-intro">${ctx.speech(`The Bear family \u{1F43B} wants a camping tent that costs <b>${GOAL} coins</b>. They have <b>${INCOME} coins</b> left each month, but they are not sure what to do. Let's ask a money helper!`)}</div>
        <div class="lesson-stage">
          <div class="goal-top">\u{1F3D5}\u{FE0F} Tent: <span class="goal-count">${GOAL} coins</span></div>
          <ul class="plan-list" id="planList" aria-live="polite">
            ${PLAN.map((_, i) => `<li class="plan-item" data-i="${i}"><span class="plan-emoji">\u{2753}</span><span class="plan-text">Plan piece ${i + 1}</span></li>`).join('')}
          </ul>
          <div class="feedback" id="mhFb"></div>
        </div>
      `, `<button class="btn" id="mhAsk">\u{1F4CB} Ask the helper</button>`);

      const body = ctx.ovBody;
      const btn = ctx.ovActions.querySelector('#mhAsk');
      const fb = body.querySelector('#mhFb');
      btn.onclick = () => {
        if (revealed >= PLAN.length) { race(); return; }
        const piece = PLAN[revealed];
        const li = body.querySelector(`.plan-item[data-i="${revealed}"]`);
        li.classList.add('on');
        li.querySelector('.plan-emoji').textContent = piece.emoji;
        li.querySelector('.plan-text').innerHTML = `<b>${piece.title}</b>`;
        fb.innerHTML = `The helper says: <b>${piece.title}</b>, because ${piece.why}.`;
        fb.className = 'feedback good show';
        revealed++;
        btn.textContent = revealed < PLAN.length ? `\u{1F4CB} Ask for piece ${revealed + 1}` : 'See the plan in action →';
      };
    };

    // Step 1: what a money helper is (coach metaphor).
    ctx.renderStep(`
      <div class="lesson-intro">${ctx.speech(`A sports coach helps you get better at a game, right? \u{26BD} A <b>money helper</b> is a grown-up whose job is helping families make a smart <b>money plan</b>: how much to save, keep safe, and grow. I am a little robot version of that! \u{1F916}`)}</div>
      <div class="lesson-stage">
        <div class="helper-cards">
          <div class="helper-card"><div class="helper-emoji">\u{26BD}</div><div class="helper-t">A coach helps you <b>play</b> better</div></div>
          <div class="helper-card"><div class="helper-emoji">\u{1F4CB}</div><div class="helper-t">A money helper helps you <b>plan</b> better</div></div>
        </div>
      </div>
    `, `<button class="btn" id="mhGo">Meet the Bear family \u{1F43B}</button>`);
    ctx.ovActions.querySelector('#mhGo').onclick = plan;
  },
};
