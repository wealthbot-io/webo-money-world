// LESSON 2: The Magic Penny - how money grows over time (compound growth).
export default {
  id: 'penny',
  no: 'LESSON 2',
  name: 'The Magic Penny',
  sub: 'How money grows over time',
  icon: '\u{1FA99}',
  rewardTitle: 'Magic unlocked!',
  prop: {
    cls: 'prop-tree',
    html: `<svg viewBox="0 0 78 110">
          <rect x="34" y="60" width="10" height="48" rx="3" fill="#7a5230"/>
          <circle cx="39" cy="40" r="26" fill="#3fae5c"/>
          <circle cx="22" cy="50" r="17" fill="#5ed47a"/>
          <circle cx="56" cy="50" r="17" fill="#5ed47a"/>
          <circle cx="39" cy="30" r="18" fill="#6ee0a0"/>
          <circle cx="28" cy="38" r="3" fill="#f5a623"/><circle cx="50" cy="35" r="3" fill="#f5a623"/><circle cx="40" cy="52" r="3" fill="#f5a623"/>
        </svg>`,
  },
  run(ctx) {
    ctx.renderStep(`
      <div class="lesson-intro">${ctx.speech("Here is a brain-bender! \u{1F92F} Would you rather have <b>$1,000,000 today</b>... or <b>one penny</b> that <b>doubles every day</b> for 30 days? Slide to find out what the penny becomes!")}</div>
      <div class="lesson-stage">
        <div class="penny-display">
          <div class="penny-day">Day <span id="pDay">1</span></div>
          <div class="penny-val" id="pVal">$0.01</div>
          <div class="penny-vs" id="pVs">vs $1,000,000 today</div>
        </div>
        <div class="penny-bar-wrap" id="pBars"></div>
        <input type="range" min="1" max="30" value="1" id="pSlider">
      </div>
      <div class="feedback info show" style="display:block" id="pFb">Start at day 1 and slide all the way to day 30...</div>
    `, `<button class="btn" id="pDone" disabled>Slide to day 30 first</button>`);
    const root = ctx.ovBody;
    const bars = root.querySelector('#pBars');
    for (let i = 0; i < 30; i++) { const b = document.createElement('div'); b.className = 'penny-bar'; b.style.height = '2px'; bars.appendChild(b); }
    const barEls = [...bars.children];
    const slider = root.querySelector('#pSlider');
    const pVal = root.querySelector('#pVal'), pDay = root.querySelector('#pDay'), pFb = root.querySelector('#pFb'), pVs = root.querySelector('#pVs');
    const pDone = ctx.ovActions.querySelector('#pDone');
    let reached30 = false;
    const val = (d) => 0.01 * Math.pow(2, d - 1);
    const fmt = (n) => n >= 1000 ? '$' + Math.round(n).toLocaleString() : '$' + n.toFixed(2);
    function update() {
      const d = +slider.value;
      pDay.textContent = d;
      const v = val(d);
      pVal.textContent = fmt(v);
      const max = val(30);
      barEls.forEach((b, i) => { b.style.height = (i < d ? Math.max((val(i + 1) / max) * 100, 1.5) : 0.5) + '%'; });
      if (v > 1000000) { pVs.textContent = '\u{1F389} BEATS $1,000,000!'; pVal.style.color = 'var(--green)'; }
      else { pVs.textContent = 'vs $1,000,000 today'; pVal.style.color = 'var(--orange)'; }
      if (d === 30 && !reached30) {
        reached30 = true; pDone.disabled = false; pDone.textContent = 'Whoa! Finish Lesson ⭐';
        pFb.innerHTML = '\u{1F92F} The penny becomes <b>over $5 MILLION</b>! That is the magic of money <b>doubling</b> again and again. Slow at first, then HUGE. That is why we start growing money early!';
        pFb.className = 'feedback good show';
      }
    }
    slider.oninput = update; update();
    pDone.onclick = () => ctx.finish("You discovered compound growth! A money tree just sprouted in Webo's world. \u{1F333}");
  },
};
