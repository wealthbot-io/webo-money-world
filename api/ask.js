// Webo's Money World — "Ask Webo" serverless proxy (Vercel Node function).
//
// POST /api/ask  { messages: [{role, content}, ...] }  ->  { reply: "..." }
//
// Holds the Anthropic API key server-side (never shipped to the browser), applies
// kid-facing safety guardrails (input + output moderation, per-IP rate limiting),
// calls the Messages API, and returns a short, friendly reply.
//
// Environment variables (set in the Vercel dashboard):
//   ANTHROPIC_API_KEY            (required)  server-side key
//   WEBO_MODEL                   (optional)  defaults to a current Sonnet
//   WEBO_RATE_MAX                (optional)  max requests per window per IP (default 30)
//   WEBO_RATE_WINDOW             (optional)  window in seconds (default 600)
//   UPSTASH_REDIS_REST_URL/TOKEN (optional)  durable rate limit across instances;
//   (or KV_REST_API_URL/TOKEN)              without it, rate limiting is best-effort
//                                            per-instance (resets on cold start).
//
// SAFETY NOTE (read before any public launch): the moderation below is a STARTER
// screen, not a substitute for a real moderation model. This product targets
// under-13s. Confirm the COPPA / "collect nothing" posture with counsel and route
// input + output through a dedicated moderation model before launch. See HANDOFF.md.

const MODEL = process.env.WEBO_MODEL || 'claude-sonnet-4-5';
const RATE_MAX = parseInt(process.env.WEBO_RATE_MAX || '30', 10);
const RATE_WINDOW = parseInt(process.env.WEBO_RATE_WINDOW || '600', 10);

// Friendly, kid-safe canned lines. No em dashes in any user-facing copy.
const WEBO_REDIRECT = 'Ooh, let us keep it about money and saving! \u{1F916} Try asking me how money grows, or what a piggy bank is for!';
const WEBO_FALLBACK = 'Hmm, my circuits got a little fuzzy! \u{1F916} Try asking me again in a fun money way!';
const WEBO_BUSY = 'Whew, lots of questions! \u{1F4A8} Give me a tiny moment, then ask me again!';
const WEBO_WARMING = 'I am getting ready to chat! \u{1F916} Ask me again in a little bit!';

const SYSTEM_PROMPT =
  'You are Webo, a friendly, cheerful robot money buddy for children ages 6 to 10. ' +
  'Explain money, saving, and growing money with simple words, short sentences, and fun comparisons ' +
  '(jars, seeds, snowballs, piggy banks). Keep answers to 2 to 4 short sentences with an emoji or two. ' +
  'Always be warm and encouraging. Never give specific investment advice, never name specific companies ' +
  'or stocks to buy, and never discuss anything scary or not kid appropriate. If asked something off topic, ' +
  'gently steer back to money in a playful way. Do not use em dashes.';

// Starter content screen. Conservative for a kid audience. NOT a real moderation
// model -- replace before public launch (see SAFETY NOTE above).
const UNSAFE_PATTERNS = [
  /\b(sex|sexual|porn|nude|naked|nsfw|breast|penis|vagina)\b/,
  /\b(kill|murder|gun|shoot|stab|bomb|terror|gore|blood)\b/,
  /\b(suicide|self\s*harm|kill myself|cut myself|hurt myself)\b/,
  /\b(cocaine|heroin|meth|weed|marijuana|vape|cigarette|alcohol|drunk|beer|wine)\b/,
  /\b(fuck|shit|bitch|asshole|cunt|dick|bastard)\b/,
  /\b(nigger|faggot|retard)\b/,
];

function isUnsafe(text) {
  const t = String(text).toLowerCase();
  return UNSAFE_PATTERNS.some((re) => re.test(t));
}

// Per-instance fallback bucket (best effort; not durable across cold starts/instances).
const memBucket = new Map();

async function rateOk(ip) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    // Durable sliding-window-ish limit via Upstash REST: INCR + EXPIRE on first hit.
    const key = `webo:rl:${ip}`;
    try {
      const incr = await fetch(`${url}/incr/${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { result } = await incr.json();
      if (result === 1) {
        await fetch(`${url}/expire/${encodeURIComponent(key)}/${RATE_WINDOW}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      return result <= RATE_MAX;
    } catch (e) {
      return true; // fail open: never block a child over a transient KV error
    }
  }

  // No KV configured -> best-effort in-memory.
  const now = Date.now() / 1000;
  const arr = (memBucket.get(ip) || []).filter((t) => t > now - RATE_WINDOW);
  if (arr.length >= RATE_MAX) {
    memBucket.set(ip, arr);
    return false;
  }
  arr.push(now);
  memBucket.set(ip, arr);
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const say = (reply, status = 200) => res.status(status).json({ reply });

  if (req.method !== 'POST') return say(WEBO_FALLBACK, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[webo] ANTHROPIC_API_KEY is not set');
    return say(WEBO_WARMING, 503);
  }

  // Vercel parses application/json into req.body; tolerate a raw string too.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  const messages = body && Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) return say(WEBO_FALLBACK, 400);

  // Keep only well-formed {role, content} turns; cap length and count.
  const MAX_TURNS = 12;
  const MAX_CHARS = 500;
  const clean = [];
  for (const m of messages.slice(-MAX_TURNS)) {
    if (!m || typeof m !== 'object') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    let content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) continue;
    if (content.length > MAX_CHARS) content = content.slice(0, MAX_CHARS);
    clean.push({ role, content });
  }
  if (clean.length === 0 || clean[clean.length - 1].role !== 'user') return say(WEBO_FALLBACK, 400);
  const lastUser = clean[clean.length - 1].content;

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (!(await rateOk(ip))) return say(WEBO_BUSY, 429);

  // Input moderation: do not call the model on unsafe input; gently redirect.
  if (isUnsafe(lastUser)) return say(WEBO_REDIRECT);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, system: SYSTEM_PROMPT, messages: clean }),
    });
    if (!r.ok) {
      console.error('[webo] anthropic call failed: http=' + r.status);
      return say(WEBO_FALLBACK, 502);
    }
    const data = await r.json();
    const blocks = Array.isArray(data.content) ? data.content : [];
    const text = blocks.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('').trim();

    // Output moderation.
    if (!text || isUnsafe(text)) return say(WEBO_FALLBACK);
    return say(text);
  } catch (e) {
    console.error('[webo] anthropic call threw');
    return say(WEBO_FALLBACK, 502);
  }
};
