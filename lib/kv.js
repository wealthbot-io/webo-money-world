// Shared Vercel KV / Upstash Redis helpers + fail-open rate limiting.
//
// Used by /api/ask.js (rate limiting + cost ceiling) and /api/progress.js
// (anonymous cross-device resume codes). CommonJS so it bundles into each
// serverless function. There is no shared in-memory state across functions at
// runtime (each /api file is its own bundle/instance) - KV is the durable layer;
// the in-memory paths below are only a per-instance best-effort fallback.

// Resolve KV creds. Vercel's Marketplace KV/Upstash integration prefixes the env
// vars with the store name (e.g. WEBO_MONEY_WORLD_KV_REST_API_URL), so match the
// exact generic names first, then any var ENDING with the expected suffix. (We
// want the read-WRITE token, so the read-only `..._READ_ONLY_TOKEN` is excluded
// by suffix.)
function resolveEnv(suffixes) {
  for (const s of suffixes) if (process.env[s]) return process.env[s];
  const keys = Object.keys(process.env);
  for (const s of suffixes) {
    const k = keys.find((name) => name.endsWith(s));
    if (k && process.env[k]) return process.env[k];
  }
  return '';
}
const kvUrl = () => resolveEnv(['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']);
const kvToken = () => resolveEnv(['KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN']);
const kvConfigured = () => !!(kvUrl() && kvToken());

// Low-level Upstash REST command (array form). Returns the parsed JSON
// ({ result } | { error }) or null when KV is unconfigured / errors.
async function kvCmd(args) {
  const url = kvUrl(), token = kvToken();
  if (!url || !token) return null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  }
}

// INCR a key (set TTL on first hit). Returns the post-incr count, or null when
// KV is not configured / errors (caller then uses the in-memory fallback).
async function kvIncr(key, ttl) {
  const j = await kvCmd(['INCR', key]);
  if (!j || typeof j.result !== 'number') return null;
  if (j.result === 1) await kvCmd(['EXPIRE', key, String(ttl)]);
  return j.result;
}

// GET a string value. Returns the value, or null when missing / unconfigured.
async function kvGet(key) {
  const j = await kvCmd(['GET', key]);
  if (!j || j.result == null) return null;
  return j.result;
}

// SET with TTL (seconds). When nx=true, only sets if the key does not exist.
// Returns true on success, false otherwise (incl. NX collision / unconfigured).
async function kvSet(key, value, ttl, nx = false) {
  const args = ['SET', key, value, 'EX', String(ttl)];
  if (nx) args.push('NX');
  const j = await kvCmd(args);
  return !!(j && j.result === 'OK');
}

// ---- Rate limiting ----------------------------------------------------------
// All limits FAIL OPEN: a transient KV error must never block a child.
const memBuckets = new Map(); // bucket -> [timestamps] (in-memory fallback)
let memDay = -1, memDayCount = 0;

// Windowed limit. true = allowed. KV-durable, else in-memory per instance.
async function limitOk(bucket, max, window) {
  const count = await kvIncr(`webo:rl:${bucket}`, window);
  if (count !== null) return count <= max;
  const now = Date.now() / 1000;
  const arr = (memBuckets.get(bucket) || []).filter((t) => t > now - window);
  if (arr.length >= max) { memBuckets.set(bucket, arr); return false; }
  arr.push(now);
  memBuckets.set(bucket, arr);
  return true;
}

// Global daily request ceiling (cost cap / circuit breaker). true = under it.
async function underGlobalCeiling(max) {
  const day = Math.floor(Date.now() / 86400000);
  const count = await kvIncr(`webo:cost:${day}`, 90000); // ~25h TTL
  if (count !== null) return count <= max;
  if (memDay !== day) { memDay = day; memDayCount = 0; }
  memDayCount += 1;
  return memDayCount <= max;
}

module.exports = {
  resolveEnv, kvUrl, kvToken, kvConfigured, kvCmd,
  kvIncr, kvGet, kvSet, limitOk, underGlobalCeiling,
};
