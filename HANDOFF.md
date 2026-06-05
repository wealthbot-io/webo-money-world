# Webo's Money World — Build Brief

A free, kid-facing financial-literacy demo for wealthbot.io. Top-of-funnel brand
content. **Strictly educational. No real money, no RIAs, no personalized advice,
no named stocks or companies to buy.** Everything is metaphor and arithmetic.

The current `webo-money-world.html` is a visual/UX prototype. The layout, styling,
character, and copy are in place. **Most interactions are stubbed or non-functional
and need to be wired up.** This brief defines what "working" means for each piece.

No em dashes in any user-facing copy.

---

## 1. Stack target

The prototype is a single self-contained HTML file. Target integration is the
existing Wealthbot stack: **Laravel + Alpine.js + GCP Cloud Run + Terraform**.

Two acceptable paths, pick based on where this lives:
- **Standalone marketing micro-app**: keep it as static HTML/JS + Alpine, served
  as its own route (e.g. `/learn` or a subdomain). Simplest. Recommended for MVP.
- **Inside the app**: port the markup into a Blade view, move state into an Alpine
  component, and proxy the AI call through a Laravel controller (see §4).

Either way: refactor the inline `<script>` into an Alpine component (`x-data`)
rather than the current vanilla-JS globals.

---

## 2. State model

Single source of truth. Persist to `localStorage` (standalone) or a lightweight
user record (in-app) so progress survives reload.

```
{
  stars: int,                 // 1 per lesson completed
  lessons: [                  // ordered; index = lesson position
    { id, completed: bool }
  ],
}
```

Rules:
- Lesson N is **locked** until lesson N-1 is `completed`.
- Completing a lesson: idempotent. Re-finishing must NOT award a second star.
- World props (§3) are a pure function of which lessons are completed.

---

## 3. The World hub

Webo stands in a scene. As lessons complete, props fade/pop in. This is the
progress reward and must be driven by state, not one-off DOM toggles.

| Lesson completed | Prop appears        | Element id    |
|------------------|---------------------|---------------|
| 1 (Three Jars)   | three labeled jars  | `propJars`    |
| 2 (Magic Penny)  | money tree          | `propTree`    |
| 3 (Planting)     | fueled rocket       | `propRocket`  |

- Props use the `.prop` / `.prop.on` CSS pattern already present (opacity +
  transform transition). Add `.on` when the matching lesson is complete.
- Progress dots and the star counter in the header bind to state.
- Tapping Webo shows a random encouraging tip (cosmetic; already works, keep it).

Designed to grow: a 4th lesson should mean adding one row to the lessons array,
one flow function, and one prop. Keep that extensibility.

---

## 4. Ask Webo (the AI feature — most important)

A chat where a child asks money questions in their own words and Webo answers.
Powered by Claude. This is the signature feature and the live demo of the
product's conversational layer.

**The prototype calls `https://api.anthropic.com/v1/messages` directly from the
browser. That only works inside the Claude.ai artifact sandbox. It will NOT work
in production and must be replaced.**

Production contract:
- Browser POSTs the user message + short conversation history to a **Laravel
  backend endpoint** (e.g. `POST /api/webo/ask`).
- The Laravel controller holds the Anthropic API key server-side (never ship the
  key to the client), calls the Messages API, and returns Webo's reply.
- Model: current Sonnet. `max_tokens` ~300 is plenty for short kid answers.
- Pass the conversation history so follow-ups have context.

**System prompt (keep these guardrails, tune wording freely):**
> You are Webo, a friendly cheerful robot money buddy for children ages 6 to 10.
> Explain money, saving, and growing money with simple words, short sentences,
> and fun comparisons (jars, seeds, snowballs, piggy banks). Keep answers to 2 to
> 4 short sentences with an emoji or two. Always warm and encouraging. Never give
> specific investment advice, never name specific companies or stocks to buy,
> never discuss anything scary or not kid-appropriate. If asked something off
> topic, gently steer back to money in a playful way.

**Required safety additions for a kid-facing product:**
- **Input + output moderation.** Run user input and model output through a
  moderation/safety check before display. Block and replace anything unsafe with
  a gentle Webo redirect. Do not rely on the system prompt alone.
- **Rate limiting** per session/IP on the endpoint to control cost and abuse.
- **No PII collection.** Do not ask the child for name, age, location, etc. Do
  not log message content tied to any identifier.
- **COPPA awareness.** This targets under-13s. Before any public launch, confirm
  with counsel (MarketCounsel / Faison) what COPPA and "no data collection"
  posture is required. Default to collecting nothing.
- Graceful failure: on API/network error, Webo says something friendly and the
  UI stays usable (prototype already does this — preserve it).

---

## 5. The three lessons

Each lesson is a short guided flow ending in a completion that awards a star and
advances the world. Flows are mostly built in the prototype but need state wiring
and the lock/idempotency rules above.

**Lesson 1 — The Three Jars** (earning, spending, saving)
- Kid has 6 coins, taps to drop each into Spend / Save / Grow jars.
- Jar fill animates; "coins left" counts down; finish enabled at 0 left.
- Webo gives feedback based on the split (used all three / all spend / other).
- Teaches: money has different jobs.

**Lesson 2 — The Magic Penny** (compound growth)
- Slider day 1 to 30. A penny doubles daily. Value + bar chart update live.
- At day 30 the penny passes $1,000,000; reveal the ~$5.3M payoff.
- Teaches: doubling/compounding, slow then huge, start early.

**Lesson 3 — Planting Seeds** (diversification)
- Kid plants 6 seeds; outcomes are mixed (thrive / slow / one fails), shuffled.
- Because many were planted, one failure doesn't sink the result.
- Teaches: spreading out keeps you safe. No real tickers, pure metaphor.

Verify the math and the randomization, confirm each flow reaches a completion
state, and make completion write to the state model.

---

## 6. Definition of done

- [ ] State persists across reload; locking + idempotent completion enforced.
- [ ] All three lesson flows fully playable start to finish.
- [ ] World props, progress dots, star count all driven by state.
- [ ] Ask Webo works via a server-side endpoint; no API key in the client.
- [ ] Moderation on Ask Webo input and output; rate limiting on the endpoint.
- [ ] No PII collected or logged; COPPA posture confirmed before public launch.
- [ ] Mobile-first layout verified (primary audience is phone/tablet).
- [ ] Adding a 4th lesson requires only: array entry + flow fn + prop. Confirm.
- [ ] Copy contains no em dashes; nothing implies real money or advice.

## 7. Out of scope for this pass
Accounts/login, real rewards or currency, leaderboards, multi-language, analytics
beyond basic anonymous counts. Note them as future, do not build them now.
