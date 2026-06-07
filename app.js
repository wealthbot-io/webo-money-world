function weboWorld() {
  return {
    // ---------- shared Webo SVG (string, reused in several spots) ----------
    weboSvg: `<svg viewBox="0 0 140 170">
      <line x1="70" y1="14" x2="70" y2="30" stroke="#e08e0b" stroke-width="4"/>
      <circle cx="70" cy="9" r="6" fill="#ffb938"/>
      <rect x="38" y="28" width="64" height="54" rx="18" fill="#f5a623"/>
      <rect x="46" y="36" width="48" height="38" rx="13" fill="#14263f"/>
      <circle class="eye" cx="60" cy="55" r="6.5" fill="#4fd1c5"/>
      <circle class="eye" cx="80" cy="55" r="6.5" fill="#4fd1c5"/>
      <circle cx="62" cy="53" r="2" fill="#eaf2ff"/><circle cx="82" cy="53" r="2" fill="#eaf2ff"/>
      <path d="M62 66 Q70 72 78 66" stroke="#4fd1c5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="32" y="46" width="8" height="18" rx="4" fill="#e08e0b"/>
      <rect x="100" y="46" width="8" height="18" rx="4" fill="#e08e0b"/>
      <rect x="44" y="84" width="52" height="50" rx="16" fill="#f5a623"/>
      <rect x="52" y="92" width="36" height="34" rx="11" fill="#f5e6c8"/>
      <rect x="28" y="90" width="12" height="34" rx="6" fill="#e08e0b"/>
      <rect x="100" y="90" width="12" height="34" rx="6" fill="#e08e0b"/>
      <rect x="54" y="132" width="13" height="26" rx="6" fill="#e08e0b"/>
      <rect x="73" y="132" width="13" height="26" rx="6" fill="#e08e0b"/>
    </svg>`,

    // ---------- single source of truth (persisted) ----------
    // To add a 4th lesson: add one entry here, one flow fn (flowFor maps id -> fn),
    // and one prop div bound to lessons[3].completed. Nothing else changes.
    lessons: [
      { id: 'jars',  no: 'LESSON 1', name: 'The Three Jars',  sub: 'Earning, spending & saving', icon: '\u{1FAD9}', completed: false },
      { id: 'penny', no: 'LESSON 2', name: 'The Magic Penny', sub: 'How money grows over time',  icon: '\u{1FA99}', completed: false },
      { id: 'seeds', no: 'LESSON 3', name: 'Planting Seeds',  sub: 'Why we spread money around', icon: '\u{1F331}', completed: false },
      { id: 'needs', no: 'LESSON 4', name: 'Needs vs Wants',  sub: 'What we must have vs what is nice', icon: '\u{1F9FA}', completed: false },
      { id: 'goal',  no: 'LESSON 5', name: 'Saving for a Goal', sub: 'Patience pays off', icon: '\u{1FA81}', completed: false },
      { id: 'earn',  no: 'LESSON 6', name: 'Earning Money', sub: 'Work turns into coins', icon: '\u{1F4AA}', completed: false },
    ],

    STORAGE_KEY: 'webo-money-world.v1',

    // ---------- transient UI state ----------
    hint: 'Tap Webo to say hi!',
    overlayOpen: false, overlayTitle: '', currentLesson: 0,
    rewardOpen: false, rewardTitle: '', rewardText: '',
    chatOpen: false, chatBusy: false, chatInput: '',
    chatHistory: [],   // [{role, content}] sent to the backend for context
    messages: [],      // [{who:'bot'|'me', html}] rendered in the log
    suggestions: ['Why does money grow?', 'What is saving?', 'Is it bad to spend money?', 'What is a stock?'],

    // ---------- derived ----------
    get stars() { return this.lessons.filter(l => l.completed).length; },
    isLocked(i) { return i > 0 && !this.lessons[i - 1].completed; },
    hasAsked() { return this.messages.some(m => m.who === 'me'); },

    // ---------- lifecycle ----------
    init() {
      this.load();
      this.seedStars();
    },

    load() {
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved && Array.isArray(saved.lessons)) {
          saved.lessons.forEach(sl => {
            const l = this.lessons.find(x => x.id === sl.id);
            if (l) l.completed = !!sl.completed;
          });
        }
      } catch (e) { /* corrupt storage -> start fresh, never throw at a child */ }
    },

    save() {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
          stars: this.stars,
          lessons: this.lessons.map(l => ({ id: l.id, completed: l.completed })),
        }));
      } catch (e) { /* private mode / quota -> progress just will not persist */ }
    },

    // ---------- cross-device progress code (anonymous, no PII; see /api/progress) ----------
    codeOpen: false, codeBusy: false, myCode: '', codeInput: '', codeMsg: '', codeMsgKind: '',

    openCodeModal() {
      this.myCode = ''; this.codeInput = ''; this.codeMsg = ''; this.codeMsgKind = '';
      this.codeOpen = true;
    },

    // The blob sent to the cloud: lesson completion only, never anything identifying.
    progressBlob() {
      return { v: 1, stars: this.stars, lessons: this.lessons.map(l => ({ id: l.id, completed: l.completed })) };
    },

    async saveToCloud() {
      this.codeBusy = true; this.codeMsg = ''; this.codeMsgKind = ''; this.myCode = '';
      try {
        const res = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: this.progressBlob() }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.code) {
          this.myCode = data.code;
        } else {
          this.codeMsg = data.error || 'Could not get a code right now. Please try again later!';
          this.codeMsgKind = 'err';
        }
      } catch (e) {
        this.codeMsg = 'Could not get a code right now. Please try again later!';
        this.codeMsgKind = 'err';
      } finally {
        this.codeBusy = false;
      }
    },

    async restoreFromCloud() {
      const code = (this.codeInput || '').trim();
      if (!code) return;
      this.codeBusy = true; this.codeMsg = ''; this.codeMsgKind = '';
      try {
        const res = await fetch('/api/progress?code=' + encodeURIComponent(code));
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.progress) {
          this.applyProgress(data.progress);
          this.codeMsg = 'Your stars are here! \u{2B50}';
          this.codeMsgKind = 'ok';
        } else {
          this.codeMsg = data.error || 'That code did not work. Please check it and try again!';
          this.codeMsgKind = 'err';
        }
      } catch (e) {
        this.codeMsg = 'That code did not work. Please check it and try again!';
        this.codeMsgKind = 'err';
      } finally {
        this.codeBusy = false;
      }
    },

    // Merge restored progress into local state. Never DOWNGRADE: a star earned on
    // this device is kept even if the restored code does not have it (OR the flags).
    applyProgress(blob) {
      if (!blob || !Array.isArray(blob.lessons)) return;
      blob.lessons.forEach(sl => {
        const l = this.lessons.find(x => x.id === sl.id);
        if (l && sl.completed) l.completed = true;
      });
      this.save();
    },

    seedStars() {
      const c = this.$refs.worldStars;
      for (let i = 0; i < 26; i++) {
        const s = document.createElement('i');
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 70 + '%';
        s.style.animationDelay = Math.random() * 3 + 's';
        c.appendChild(s);
      }
    },

    statusIcon(i) {
      if (this.lessons[i].completed)
        return '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#5ed47a"/><path d="M7 12l3.5 3.5L17 9" stroke="#0a1628" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      if (this.isLocked(i))
        return '<svg viewBox="0 0 24 24" fill="#9fb4d4"><path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 8H9V7a3 3 0 016 0z"/></svg>';
      return '<svg viewBox="0 0 24 24" fill="none" stroke="#f5a623" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
    },

    // ---------- lesson navigation ----------
    openLesson(i) {
      if (this.isLocked(i)) return;
      this.currentLesson = i;
      this.overlayTitle = this.lessons[i].name;
      this.overlayOpen = true;
      this.$nextTick(() => {
        const flow = { jars: this.lessonJars, penny: this.lessonPenny, seeds: this.lessonSeeds, needs: this.lessonNeeds, goal: this.lessonGoal, earn: this.lessonEarn }[this.lessons[i].id];
        flow.call(this);
      });
    },
    closeOverlay() { this.overlayOpen = false; },

    // Render one lesson "screen" into the scaffold: `bodyHtml` fills the scrollable
    // body (intro -> stage -> feedback sub-regions), `actionsHtml` fills the pinned
    // footer (the primary button). A new lesson just calls this with the two slots.
    renderStep(bodyHtml, actionsHtml) {
      this.$refs.ovBody.innerHTML = bodyHtml;
      this.$refs.ovActions.innerHTML = actionsHtml || '';
      this.$refs.ovBody.scrollTop = 0;
    },

    // ---------- completion (idempotent: re-finishing never awards a 2nd star) ----------
    complete(i, text) {
      if (!this.lessons[i].completed) {
        this.lessons[i].completed = true;
        this.save();
      }
      this.overlayOpen = false;
      this.fireConfetti();
      this.rewardTitle = ['Three Jars done!', 'Magic unlocked!', 'You did it!', 'Needs vs Wants done!', 'Patience pays off!', 'You are an earner!'][i] || 'You did it!';
      this.rewardText = text;
      this.rewardOpen = true;
    },

    speech(text) {
      return `<div class="speech"><div class="mini-webo">${this.weboSvg}</div><div class="bubble">${text}</div></div>`;
    },

    // ===== LESSON 1: Three Jars =====
    lessonJars() {
      const self = this;
      let coins = 6;
      const jars = { spend: 0, save: 0, grow: 0 };
      this.renderStep(`
        <div class="lesson-intro">${this.speech("You earned <b>6 gold coins</b> for helping out! \u{1FA99} Now, where should they go? Tap a jar to drop a coin in!")}</div>
        <div class="lesson-stage">
          <div class="coins-left">Coins left: <b id="coinsLeft">6</b></div>
          <div class="jar-game">
            <div class="jar-col spend" data-j="spend"><div class="jar-big"><div class="jar-fill" style="height:0"></div></div><div class="jar-label" style="color:var(--red)">SPEND</div><div class="jar-amt" id="amt-spend">0 coins</div></div>
            <div class="jar-col save" data-j="save"><div class="jar-big"><div class="jar-fill" style="height:0"></div></div><div class="jar-label" style="color:var(--teal)">SAVE</div><div class="jar-amt" id="amt-save">0 coins</div></div>
            <div class="jar-col grow" data-j="grow"><div class="jar-big"><div class="jar-fill" style="height:0"></div></div><div class="jar-label" style="color:var(--green)">GROW</div><div class="jar-amt" id="amt-grow">0 coins</div></div>
          </div>
        </div>
        <div class="feedback info show" style="display:block">\u{1F4A1} <b>Spend</b> is for fun stuff now. <b>Save</b> is for something bigger soon. <b>Grow</b> is money that makes MORE money later!</div>
      `, `<button class="btn" id="jarDone" disabled>Drop all your coins first</button>`);

      const body = this.$refs.ovBody;
      const cl = body.querySelector('#coinsLeft');
      const btn = this.$refs.ovActions.querySelector('#jarDone');
      body.querySelectorAll('.jar-col').forEach(col => {
        col.querySelector('.jar-big').onclick = () => {
          if (coins <= 0) return;
          const j = col.dataset.j; jars[j]++; coins--;
          cl.textContent = coins;
          col.querySelector('.jar-fill').style.height = Math.min(jars[j] * 16, 100) + '%';
          body.querySelector('#amt-' + j).textContent = jars[j] + ' coins';
          if (coins === 0) { btn.disabled = false; btn.textContent = 'See what Webo thinks →'; }
        };
      });
      btn.onclick = () => {
        let msg;
        if (jars.grow >= 1 && jars.save >= 1 && jars.spend >= 1)
          msg = "Wow, you used <b>all three jars</b>! That is exactly how smart money helpers do it. A little fun, a little saved, and some set aside to grow. \u{1F31F}";
        else if (jars.spend === 6)
          msg = "Ooh, you spent it all on fun! That is okay sometimes, but if you <b>save</b> and <b>grow</b> a little too, you will have even more later. Let us remember that! \u{1F49B}";
        else
          msg = "Nice choices! The big secret is that the <b>Grow</b> jar is magic. Keep some coins there and they turn into MORE coins over time. You will see how in the next lesson! ✨";
        self.renderStep(`<div class="lesson-intro">${self.speech(msg)}</div>`, `<button class="btn" id="finJar">Finish Lesson ⭐</button>`);
        self.$refs.ovActions.querySelector('#finJar').onclick = () => self.complete(0, "You learned the 3 Jars! Webo's world just got its first jars. \u{1FAD9}");
      };
    },

    // ===== LESSON 2: Magic Penny =====
    lessonPenny() {
      const self = this;
      this.renderStep(`
        <div class="lesson-intro">${this.speech("Here is a brain-bender! \u{1F92F} Would you rather have <b>$1,000,000 today</b>... or <b>one penny</b> that <b>doubles every day</b> for 30 days? Slide to find out what the penny becomes!")}</div>
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
      const root = this.$refs.ovBody;
      const bars = root.querySelector('#pBars');
      for (let i = 0; i < 30; i++) { const b = document.createElement('div'); b.className = 'penny-bar'; b.style.height = '2px'; bars.appendChild(b); }
      const barEls = [...bars.children];
      const slider = root.querySelector('#pSlider');
      const pVal = root.querySelector('#pVal'), pDay = root.querySelector('#pDay'), pFb = root.querySelector('#pFb'), pVs = root.querySelector('#pVs');
      const pDone = this.$refs.ovActions.querySelector('#pDone');
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
      pDone.onclick = () => self.complete(1, "You discovered compound growth! A money tree just sprouted in Webo's world. \u{1F333}");
    },

    // ===== LESSON 3: Planting Seeds =====
    lessonSeeds() {
      const self = this;
      this.renderStep(`
        <div class="lesson-intro">${this.speech("Time to plant! \u{1F331} You have <b>6 seeds</b>. Tap each patch to plant one. Here is the secret: some seeds grow big, some grow slow, and some... will not grow at all. Nobody knows which! So what should we do?")}</div>
        <div class="lesson-stage">
          <div class="seed-field" id="seedField"></div>
        </div>
        <div class="feedback info show" style="display:block" id="seedFb">Plant all 6 seeds and see what happens! \u{1F33E}</div>
      `, `<button class="btn" id="seedDone" disabled>Plant all 6 seeds</button>`);
      const root = this.$refs.ovBody;
      const field = root.querySelector('#seedField');
      const outcomes = this.shuffle(['grown', 'grown', 'slow', 'grown', 'failed', 'slow']);
      let planted = 0;
      const fb = root.querySelector('#seedFb'), btn = this.$refs.ovActions.querySelector('#seedDone');
      for (let i = 0; i < 6; i++) {
        const s = document.createElement('div'); s.className = 'seed'; s.textContent = '\u{1F7EB}';
        s.onclick = () => {
          if (s.classList.contains('planted')) return;
          s.classList.add('planted');
          const o = outcomes[i];
          setTimeout(() => {
            if (o === 'grown') { s.classList.add('grown'); s.textContent = '\u{1F333}'; }
            else if (o === 'slow') { s.classList.add('slow'); s.textContent = '\u{1F331}'; }
            else { s.classList.add('failed'); s.textContent = '\u{1F342}'; }
          }, 250);
          planted++;
          if (planted === 6) {
            btn.disabled = false; btn.textContent = 'See what Webo learned →';
            fb.innerHTML = 'Look! Some grew into big trees \u{1F333}, some are still growing \u{1F331}, and one did not make it \u{1F342}.';
            fb.className = 'feedback good show';
          }
        };
        field.appendChild(s);
      }
      btn.onclick = () => {
        self.renderStep(
          `<div class="lesson-intro">${self.speech("Here is the big idea: because we planted <b>lots of different seeds</b>, it did not matter that one failed. The others still grew! \u{1F333}<br><br>Smart money helpers call this <b>not putting all your eggs in one basket</b>. Spreading out keeps you safe. You are a natural! \u{1F31F}")}</div>`,
          `<button class="btn" id="finSeed">Finish Lesson ⭐</button>`
        );
        self.$refs.ovActions.querySelector('#finSeed').onclick = () => self.complete(2, "You learned to spread things out! Webo's rocket is fueled and ready. \u{1F680}");
      };
    },

    // ===== LESSON 4: Needs vs Wants =====
    lessonNeeds() {
      const self = this;
      const items = this.shuffle([
        { emoji: '\u{1F34E}', name: 'an apple',       need: true,  why: 'our bodies need food to grow strong' },
        { emoji: '\u{1F9F8}', name: 'a teddy bear',    need: false, why: 'toys are fun, but we can live without them' },
        { emoji: '\u{1F3E0}', name: 'a home',          need: true,  why: 'everyone needs a safe place to live' },
        { emoji: '\u{1F36C}', name: 'candy',           need: false, why: 'it is yummy to want, but not something we need' },
        { emoji: '\u{1F9E5}', name: 'a warm coat',     need: true,  why: 'we need warm clothes when it is cold' },
        { emoji: '\u{1F3AE}', name: 'a video game',    need: false, why: 'it is fun to want, not a need' },
      ]);
      let score = 0;

      const card = (i) => {
        const it = items[i];
        const isLast = i === items.length - 1;
        self.renderStep(`
          <div class="lesson-intro">${self.speech("Some things we <b>need</b> to live, and some are just nice to <b>want</b>. Tap the right basket for each one! \u{1F9FA}")}</div>
          <div class="lesson-stage">
            <div class="nw-progress">Item <b>${i + 1}</b> of ${items.length}</div>
            <div class="nw-item">${it.emoji}<div class="nw-name">${it.name}</div></div>
            <div class="nw-choices">
              <button class="choice nw-need" data-need="true">\u{2705} Need</button>
              <button class="choice nw-want" data-need="false">\u{2728} Want</button>
            </div>
            <div class="feedback" id="nwFb"></div>
          </div>
        `, `<button class="btn" id="nwNext" disabled>Pick Need or Want</button>`);

        const body = self.$refs.ovBody;
        const fb = body.querySelector('#nwFb');
        const next = self.$refs.ovActions.querySelector('#nwNext');
        body.querySelectorAll('.nw-choices .choice').forEach((b) => {
          b.onclick = () => {
            const chose = b.dataset.need === 'true';
            body.querySelectorAll('.nw-choices .choice').forEach((x) => { x.disabled = true; });
            body.querySelector(it.need ? '.nw-need' : '.nw-want').classList.add('correct');
            const name = it.name.charAt(0).toUpperCase() + it.name.slice(1);
            if (chose === it.need) {
              score++;
              fb.innerHTML = `Yes! \u{1F31F} ${name} is a <b>${it.need ? 'need' : 'want'}</b> because ${it.why}.`;
              fb.className = 'feedback good show';
            } else {
              b.classList.add('wrong');
              fb.innerHTML = `Good thinking! Actually ${it.name} is a <b>${it.need ? 'need' : 'want'}</b> because ${it.why}.`;
              fb.className = 'feedback info show';
            }
            next.disabled = false;
            next.textContent = isLast ? 'See what Webo thinks →' : 'Next →';
          };
        });
        next.onclick = () => {
          if (!isLast) { card(i + 1); return; }
          self.renderStep(
            `<div class="lesson-intro">${self.speech(`Awesome sorting! \u{1F9FA} You got <b>${score} of ${items.length}</b>. The big idea: <b>needs come first</b> (food, a home, warm clothes), then we can choose <b>wants</b> with what is left. \u{1F49B}`)}</div>`,
            `<button class="btn" id="nwFin">Finish Lesson ⭐</button>`
          );
          self.$refs.ovActions.querySelector('#nwFin').onclick = () => self.complete(3, "You learned needs vs wants! A basket of goodies appeared in Webo's world. \u{1F9FA}");
        };
      };
      card(0);
    },

    // ===== LESSON 5: Saving for a Goal =====
    lessonGoal() {
      const self = this;
      const GOAL = 5;   // coins needed for the kite
      let saved = 0;    // coins in the goal jar
      let week = 1;     // current week
      let spent = 0;    // times the kid chose to spend instead of save

      const finish = () => {
        const msg = spent === 0
          ? `Wow, you saved every single week! \u{1F451} That is super patience. Saving a little at a time gets you the BIG thing.`
          : `You got your kite! \u{1FA81} Saving instead of spending right away got you something bigger. Patience pays off!`;
        self.renderStep(
          `<div class="lesson-intro">${self.speech(msg)}</div>`,
          `<button class="btn" id="goalFin">Finish Lesson ⭐</button>`
        );
        self.$refs.ovActions.querySelector('#goalFin').onclick =
          () => self.complete(4, "You saved for a goal! A kite is flying in Webo's world now. \u{1FA81}");
      };

      const round = () => {
        const pct = Math.round((saved / GOAL) * 100);
        self.renderStep(`
          <div class="lesson-intro">${self.speech(`You really want this kite \u{1FA81}. It costs <b>${GOAL} coins</b>. Each week you get <b>1 coin</b>. Save it for the kite, or spend it on a treat right now?`)}</div>
          <div class="lesson-stage">
            <div class="goal-top">\u{1FA81} <span class="goal-count">${saved} / ${GOAL}</span></div>
            <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
            <div class="goal-week">Week <b>${week}</b> &middot; you have <b>1 coin</b> \u{1FA99}</div>
            <div class="goal-choices">
              <button class="choice goal-save">\u{1F4B0} Save it for the kite</button>
              <button class="choice goal-spend">\u{1F36C} Spend it on candy</button>
            </div>
            <div class="feedback" id="goalFb"></div>
          </div>
        `, `<button class="btn" id="goalNext" disabled>Pick Save or Spend</button>`);

        const body = self.$refs.ovBody;
        const fb = body.querySelector('#goalFb');
        const next = self.$refs.ovActions.querySelector('#goalNext');
        const choices = body.querySelectorAll('.goal-choices .choice');
        const fill = body.querySelector('.goal-fill');
        const count = body.querySelector('.goal-count');

        const lockAndAdvance = (label) => {
          choices.forEach((x) => { x.disabled = true; });
          next.disabled = false;
          next.textContent = label;
        };

        body.querySelector('.goal-save').onclick = () => {
          saved++;
          week++;
          fill.style.width = Math.round((saved / GOAL) * 100) + '%';
          count.textContent = `${saved} / ${GOAL}`;
          body.querySelector('.goal-save').classList.add('correct');
          if (saved >= GOAL) {
            fb.innerHTML = `You did it! \u{1F389} Your kite jar is full. Waiting really paid off! \u{1FA81}`;
            fb.className = 'feedback good show';
            lockAndAdvance('Fly the kite →');
            next.onclick = finish;
            return;
          }
          fb.innerHTML = `Great choice! \u{1F31F} Your kite jar is filling up. Just <b>${GOAL - saved}</b> to go!`;
          fb.className = 'feedback good show';
          lockAndAdvance('Next week →');
          next.onclick = () => round();
        };

        body.querySelector('.goal-spend').onclick = () => {
          spent++;
          week++;
          body.querySelector('.goal-spend').classList.add('wrong');
          fb.innerHTML = `Yum, candy! \u{1F36C} But the coin is gone, so the kite is still <b>${GOAL - saved}</b> coins away. Patience is tricky!`;
          fb.className = 'feedback info show';
          lockAndAdvance('Next week →');
          next.onclick = () => round();
        };
      };

      round();
    },

    // ===== LESSON 6: Earning Money =====
    lessonEarn() {
      const self = this;
      const jobs = [
        { emoji: '\u{1FAB4}', name: 'Water the plants', coins: 2 },
        { emoji: '\u{1F9F9}', name: 'Tidy your toys',   coins: 2 },
        { emoji: '\u{1F436}', name: 'Walk the dog',     coins: 2 },
        { emoji: '\u{1F373}', name: 'Help make lunch',  coins: 2 },
      ];
      let earned = 0;
      let done = 0;

      const finish = () => {
        self.renderStep(
          `<div class="lesson-intro">${self.speech(`Amazing! \u{1F4AA} You earned <b>${earned} coins</b> by helping out. That is how earning works: your <b>effort</b> turns into money. The more you help, the more you can earn, then you can save it, grow it, and reach your goals! \u{1FA99}`)}</div>`,
          `<button class="btn" id="earnFin">Finish Lesson ⭐</button>`
        );
        self.$refs.ovActions.querySelector('#earnFin').onclick =
          () => self.complete(5, "You learned how to earn money by helping! A pile of coins appeared in Webo's world. \u{1FA99}");
      };

      self.renderStep(`
        <div class="lesson-intro">${self.speech("Money does not just appear. You can <b>earn</b> it by helping out and doing a good job! \u{1F4AA} Tap each chore to do it and watch your coins grow.")}</div>
        <div class="lesson-stage">
          <div class="earn-total">\u{1FA99} <span class="earn-count">0</span> coins earned</div>
          <div class="earn-jobs">
            ${jobs.map((j, idx) => `<button class="choice earn-job" data-i="${idx}">${j.emoji} ${j.name} <span class="earn-pay">+${j.coins} \u{1FA99}</span></button>`).join('')}
          </div>
          <div class="feedback" id="earnFb"></div>
        </div>
      `, `<button class="btn" id="earnNext" disabled>Do all your chores</button>`);

      const body = self.$refs.ovBody;
      const fb = body.querySelector('#earnFb');
      const next = self.$refs.ovActions.querySelector('#earnNext');
      const count = body.querySelector('.earn-count');

      body.querySelectorAll('.earn-job').forEach((b) => {
        b.onclick = () => {
          if (b.disabled) return;
          const j = jobs[+b.dataset.i];
          b.disabled = true;
          b.classList.add('correct');
          earned += j.coins;
          done++;
          count.textContent = earned;
          fb.innerHTML = `Nice work! \u{1F31F} You earned <b>${j.coins} coins</b> for that. Great helping!`;
          fb.className = 'feedback good show';
          if (done === jobs.length) {
            next.disabled = false;
            next.textContent = 'See what Webo thinks →';
            next.onclick = finish;
          }
        };
      });
    },

    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },

    // ---------- hero Webo tap (cosmetic) ----------
    tapWebo(el) {
      const hints = ["Money grows when you are patient! \u{1F331}", "Three jars: Spend, Save, Grow! \u{1FAD9}", "Tiny coins become BIG over time! ✨", "Spread your seeds around! \u{1F333}", "You are doing great, buddy! \u{1F49B}"];
      this.hint = hints[Math.floor(Math.random() * hints.length)];
      el.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12px) scale(1.06)' }, { transform: 'translateY(0) scale(1)' }], { duration: 500, easing: 'ease-out' });
    },

    fireConfetti() {
      const colors = ['#f5a623', '#4fd1c5', '#5ed47a', '#ff7b6b', '#9d7bea', '#ffb938'];
      for (let i = 0; i < 40; i++) {
        const c = document.createElement('div'); c.className = 'confetti';
        c.style.left = Math.random() * 100 + '%';
        c.style.background = colors[i % colors.length];
        c.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        document.body.appendChild(c);
        const fall = 600 + Math.random() * 700;
        c.animate([{ transform: `translateY(0) rotate(0)`, opacity: 1 }, { transform: `translateY(${window.innerHeight + 40}px) rotate(${Math.random() * 720}deg)`, opacity: .2 }], { duration: fall + 1400, easing: 'cubic-bezier(.3,.6,.5,1)' });
        setTimeout(() => c.remove(), fall + 1500);
      }
    },

    // ================= ASK WEBO (server-proxied Claude) =================
    openChat() {
      this.chatOpen = true;
      if (this.messages.length === 0) {
        this.messages.push({ who: 'bot', html: "Hi there! I'm Webo \u{1F916} Ask me ANYTHING about money and I'll explain it in a fun way. What do you want to know?" });
      }
      this.$nextTick(() => { const i = document.querySelector('.chat-input input'); if (i) i.focus(); });
    },

    scrollChat() { this.$nextTick(() => { const log = this.$refs.chatLog; if (log) log.scrollTop = log.scrollHeight; }); },

    async sendChat(preset) {
      const text = (preset !== undefined ? preset : this.chatInput).trim();
      if (!text || this.chatBusy) return;
      this.chatInput = '';
      this.messages.push({ who: 'me', html: this.escapeHtml(text) });
      this.chatHistory.push({ role: 'user', content: text });
      this.chatBusy = true;
      this.scrollChat();
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // send only the recent turns for context; the server holds the system prompt + key
          body: JSON.stringify({ messages: this.chatHistory.slice(-12), clientId: this.clientId() }),
        });
        const data = await res.json().catch(() => ({}));
        const reply = (data && typeof data.reply === 'string' && data.reply.trim())
          ? data.reply.trim()
          : "Hmm, my circuits got a little fuzzy! \u{1F916} Try asking me again!";
        this.messages.push({ who: 'bot', html: this.escapeHtml(reply).replace(/\n/g, '<br>') });
        this.chatHistory.push({ role: 'assistant', content: reply });
      } catch (e) {
        this.messages.push({ who: 'bot', html: "Oops, my antenna lost signal! \u{1F4E1} Ask me again in a moment!" });
      }
      this.chatBusy = false;
      this.scrollChat();
    },

    // Anonymous per-browser id for per-session rate limiting. Random, no PII;
    // persisted in localStorage. Lets kids sharing one IP each get their own budget.
    clientId() {
      const KEY = 'webo-money-world.cid';
      try {
        let id = localStorage.getItem(KEY);
        if (!id) {
          id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '-' + Math.random().toString(36).slice(2));
          id = id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
          localStorage.setItem(KEY, id);
        }
        return id;
      } catch (e) {
        return ''; // private mode / no storage -> fall back to IP-only limiting
      }
    },

    escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
  };
}
