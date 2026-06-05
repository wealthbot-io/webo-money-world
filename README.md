# Webo's Money World

A free, kid-facing financial-literacy demo for wealthbot.io. Top-of-funnel brand
content. Strictly educational: no real money, no RIAs, no personalized advice.

## What's here (MVP)

A working standalone micro-app:

- **`public/index.html`** — the front-end. Refactored into an **Alpine.js** component.
  Three playable lessons (Three Jars, Magic Penny, Planting Seeds), a state-driven
  World hub (props pop in as lessons complete), progress dots, and a star counter.
  Progress **persists in `localStorage`**; lessons **lock** until the previous one is
  done; completion is **idempotent** (re-finishing never awards a second star).
- **`public/api/ask.php`** — the **Ask Webo** server-side proxy. Holds the Anthropic
  API key server-side (never shipped to the browser), applies starter safety
  guardrails (input + output moderation, per-IP rate limiting), and returns short,
  kid-friendly replies.
- **`prototype/webo-money-world.html`** — the original single-file visual prototype
  (kept for reference).

See **HANDOFF.md** for the full build brief and the definition of done.

## Running it locally

Requires PHP 8 (`php -v`).

```bash
cp .env.example .env          # then put your real ANTHROPIC_API_KEY in .env
./run.sh                      # serves http://localhost:8000/
```

The three lessons, world, and persistence all work with **no key**. Setting
`ANTHROPIC_API_KEY` lights up the **Ask Webo** chat. Without a key, Ask Webo replies
with a friendly "getting ready" message and the rest of the app stays fully usable.

## Status against the definition of done (HANDOFF.md §6)

| Item | Status |
|------|--------|
| State persists across reload; locking + idempotent completion | Done |
| All three lesson flows fully playable | Done |
| World props, progress dots, star count driven by state | Done |
| Ask Webo via a server-side endpoint; no key in the client | Done |
| Moderation on Ask Webo input and output; rate limiting | Starter screen done; needs a real moderation model before launch |
| No PII collected or logged; COPPA posture confirmed | No PII logged; COPPA sign-off with counsel is a launch gate |
| Mobile-first layout | Inherited from the prototype (480px column); needs device QA |
| Adding a 4th lesson = array entry + flow fn + prop | Confirmed (see the comment on the `lessons` array) |
| Copy contains no em dashes; nothing implies real money/advice | Done |

## Not in this pass (deliberately)

Deploy (Dockerfile / Cloud Run / Terraform), a real moderation model, COPPA counsel
sign-off, accounts/login, analytics. These are the next steps once the MVP direction
is confirmed.
