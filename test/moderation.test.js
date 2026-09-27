// The full moderation gate, with fetch stubbed per provider (no network, no keys).
const { test } = require('node:test');
const assert = require('node:assert');
const { moderate, moderateLLM, moderateSecondProvider } = require('../api/ask');

const realFetch = global.fetch;
// Route by URL: anthropic -> `haiku`, openai -> `openai`. Each is a JSON payload,
// the string 'throw' (network failure), or { status } for a non-2xx.
function stub({ haiku, openai }) {
  const calls = [];
  global.fetch = async (url, opts) => {
    const which = url.includes('anthropic') ? haiku : openai;
    calls.push({ url, body: JSON.parse(opts.body) });
    if (which === 'throw') throw new Error('down');
    if (which && which.status) return { ok: false, status: which.status, json: async () => ({}) };
    return { ok: true, json: async () => which };
  };
  return calls;
}
const haikuSays = (safe) => ({ content: [{ type: 'text', text: JSON.stringify({ safe }) }] });
const openaiSays = (flagged) => ({ results: [{ flagged }] });
function restore() { global.fetch = realFetch; delete process.env.OPENAI_API_KEY; }

test('moderateLLM maps the classifier output to safe / unsafe / error', async () => {
  try {
    stub({ haiku: haikuSays(true) });  assert.strictEqual(await moderateLLM('k', 'hi'), 'safe');
    stub({ haiku: haikuSays(false) }); assert.strictEqual(await moderateLLM('k', 'hi'), 'unsafe');
    stub({ haiku: { content: [{ type: 'text', text: 'Sure! Here is my answer' }] } });
    assert.strictEqual(await moderateLLM('k', 'hi'), 'error', 'unparseable is an error, never safe');
    stub({ haiku: { status: 529 } });  assert.strictEqual(await moderateLLM('k', 'hi'), 'error');
    stub({ haiku: 'throw' });          assert.strictEqual(await moderateLLM('k', 'hi'), 'error');
  } finally { restore(); }
});

test('safe input passes the gate without touching the second provider when it is off', async () => {
  const calls = stub({ haiku: haikuSays(true) });
  try {
    const v = await moderate('k', 'why does money grow?', 'input');
    assert.deepStrictEqual(v, { unsafe: false });
    assert.strictEqual(calls.length, 1);
    assert.ok(calls[0].url.includes('anthropic'));
  } finally { restore(); }
});

test('regex-missed but unsafe text is blocked by the classifier, with no API call for regex hits', async () => {
  const calls = stub({ haiku: haikuSays(false) });
  try {
    const v = await moderate('k', 'how do I hurt another kid', 'input');
    assert.deepStrictEqual(v, { unsafe: true, layer: 'llm', error: false });
    assert.strictEqual(calls.length, 1);
    const r = await moderate('k', 'tell me about a gun', 'input');
    assert.deepStrictEqual(r, { unsafe: true, layer: 'regex', error: false });
    assert.strictEqual(calls.length, 1, 'regex short-circuits before any model call');
  } finally { restore(); }
});

test('fail-closed: a classifier outage blocks, and is reported as an error (not a content hit)', async () => {
  try {
    stub({ haiku: 'throw' });
    assert.deepStrictEqual(await moderate('k', 'what is a piggy bank?', 'input'), { unsafe: true, layer: 'llm', error: true });
    stub({ haiku: { status: 500 } });
    assert.strictEqual((await moderate('k', 'what is a piggy bank?', 'output')).unsafe, true);
  } finally { restore(); }
});

test('second provider: runs alongside Haiku when configured; either vendor can block; its outage fails closed', async () => {
  process.env.OPENAI_API_KEY = 'test';
  try {
    let calls = stub({ haiku: haikuSays(true), openai: openaiSays(false) });
    assert.deepStrictEqual(await moderate('k', 'hi', 'input'), { unsafe: false });
    assert.strictEqual(calls.length, 2, 'both providers consulted');
    assert.ok(calls.some((c) => c.url.includes('openai')));

    stub({ haiku: haikuSays(true), openai: openaiSays(true) });
    assert.deepStrictEqual(await moderate('k', 'hi', 'input'), { unsafe: true, layer: 'second', error: false });

    stub({ haiku: haikuSays(false), openai: openaiSays(false) });
    assert.strictEqual((await moderate('k', 'hi', 'input')).layer, 'llm');

    stub({ haiku: haikuSays(true), openai: 'throw' });
    assert.deepStrictEqual(await moderate('k', 'hi', 'input'), { unsafe: true, layer: 'second', error: true });

    stub({ haiku: haikuSays(true), openai: { results: [] } });
    assert.strictEqual(await moderateSecondProvider('hi'), 'error', 'malformed response is an error, never safe');
  } finally { restore(); }
});

test('moderation never sends more than 2000 chars of text to a classifier', async () => {
  const calls = stub({ haiku: haikuSays(true) });
  try {
    await moderate('k', 'a'.repeat(5000), 'input');
    assert.strictEqual(calls[0].body.messages[0].content.length, 2000);
  } finally { restore(); }
});
