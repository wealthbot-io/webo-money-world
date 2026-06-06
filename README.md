# Webo's Money World

A free, kid-facing financial-literacy demo for wealthbot.io. Top-of-funnel brand
content. Strictly educational: no real money, no RIAs, no personalized advice.

## What's here (MVP)

A working standalone micro-app:

- **`index.html`** — the front-end. Refactored into an **Alpine.js** component.
  Three playable lessons (Three Jars, Magic Penny, Planting Seeds), a state-driven
  World hub (props pop in as lessons complete), progress dots, and a star counter.
  Progress **persists in `localStorage`**; lessons **lock** until the previous one is
  done; completion is **idempotent** (re-finishing never awards a second star).
- **`api/ask.js`** — the **Ask Webo** proxy as a **Vercel Node serverless function**
  (`POST /api/ask`). Holds the Anthropic API key server-side (never shipped to the
  browser), applies starter safety guardrails (input + output moderation, per-IP rate
  limiting), and returns short, kid-friendly replies. Rate limiting uses Upstash/Vercel
  KV when configured, else best-effort per-instance.
- **`prototype/webo-money-world.html`** — the original single-file visual prototype
  (kept for reference).

See **HANDOFF.md** for the full build brief and the definition of done.

## Running it locally

Full stack (lessons + Ask Webo) uses the Vercel CLI so the `/api/ask` function runs:

```bash
npm i -g vercel               # once
cp .env.example .env          # then put your real ANTHROPIC_API_KEY in .env
./run.sh                      # -> vercel dev on http://localhost:3000
```

Front-end only (no key needed) works with any static server:

```bash
npx serve
```

The three lessons, world, and persistence all work with **no key**. Setting
`ANTHROPIC_API_KEY` lights up the **Ask Webo** chat. Without a key (or running
front-end-only), Ask Webo replies with a friendly "getting ready" message and the
rest of the app stays fully usable.

## Deploying to Vercel

The repo is Vercel-ready (`vercel.json`): the repo root is the static site, `api/ask.js`
is a serverless function, `prototype/` and local files are excluded via `.vercelignore`.

```bash
vercel            # link the project (first run) + deploy a preview
vercel --prod     # promote to production
```

Then set environment variables in the Vercel dashboard (Project -> Settings ->
Environment Variables):

- `ANTHROPIC_API_KEY` (required)
- `WEBO_MODEL` (optional)
- For durable rate limiting across instances, add a Vercel KV / Upstash Redis store
  and its `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`
  + `KV_REST_API_TOKEN`). Without it, rate limiting is best-effort per-instance.

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

A **real moderation model** (the regex screen is a responsible starter, not enough for
under-13s), **COPPA counsel sign-off** before any public launch, a durable KV-backed
rate limiter (wired but optional), accounts/login, analytics. These are the next steps.

Deploy target is **Vercel** (see above): static front-end on the edge + the Node
`/api/ask` function. The Anthropic key lives only in Vercel env vars.

## Contributing / deploy workflow

`main` is protected: changes land via pull request, and Vercel deploys automatically.

1. Branch off `main` (`git checkout -b feat/my-change`).
2. Open a PR. Vercel builds a **preview deployment** and posts its URL + a status check on the PR.
3. Merge to `main`. Vercel deploys to **production** (https://webo-money-world.vercel.app).

Force pushes and branch deletion on `main` are disabled, and the Vercel preview check must pass before a PR can merge.
