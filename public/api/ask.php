<?php

declare(strict_types=1);

/**
 * Webo's Money World — "Ask Webo" server-side proxy.
 *
 * The browser POSTs the recent conversation here; this endpoint holds the
 * Anthropic API key server-side, applies kid-facing safety guardrails
 * (input + output moderation, per-IP rate limiting), calls the Messages API,
 * and returns a short, friendly reply. The key NEVER reaches the client.
 *
 * Configuration (environment variables):
 *   ANTHROPIC_API_KEY  (required)  the server-side key
 *   WEBO_MODEL         (optional)  defaults to a current Sonnet
 *   WEBO_RATE_MAX      (optional)  max requests per window per IP (default 30)
 *   WEBO_RATE_WINDOW   (optional)  window in seconds (default 600)
 *
 * SAFETY NOTE (read before any public launch):
 *   The moderation below is a STARTER screen, not a substitute for a real
 *   moderation model. This product targets under-13s. Before launch, confirm
 *   the COPPA / "collect nothing" posture with counsel (MarketCounsel / Faison)
 *   and route input + output through a dedicated moderation model. See HANDOFF.md.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/** Emit a JSON reply Webo can say, and stop. Never leak internals to a child. */
function webo_say(string $reply, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['reply' => $reply], JSON_UNESCAPED_UNICODE);
    exit;
}

// Friendly, kid-safe canned lines. No em dashes anywhere in user-facing copy.
const WEBO_REDIRECT = "Ooh, let us keep it about money and saving! \u{1F916} Try asking me how money grows, or what a piggy bank is for!";
const WEBO_FALLBACK = "Hmm, my circuits got a little fuzzy! \u{1F916} Try asking me again in a fun money way!";
const WEBO_BUSY     = "Whew, lots of questions! \u{1F4A8} Give me a tiny moment, then ask me again!";

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    webo_say(WEBO_FALLBACK, 405);
}

$apiKey = getenv('ANTHROPIC_API_KEY') ?: '';
if ($apiKey === '') {
    // Misconfiguration: stay friendly to the child, signal clearly to the operator log.
    error_log('[webo] ANTHROPIC_API_KEY is not set');
    webo_say("I am getting ready to chat! \u{1F916} Ask me again in a little bit!", 503);
}

// ---------- parse + validate input ----------
$raw = file_get_contents('php://input') ?: '';
if (strlen($raw) > 20000) {
    webo_say(WEBO_REDIRECT, 413);
}
$body = json_decode($raw, true);
$messages = (is_array($body) && isset($body['messages']) && is_array($body['messages'])) ? $body['messages'] : null;
if ($messages === null || count($messages) === 0) {
    webo_say(WEBO_FALLBACK, 400);
}

// Keep only well-formed {role, content} turns; cap length and count.
$MAX_TURNS = 12;
$MAX_CHARS = 500;
$clean = [];
foreach (array_slice($messages, -$MAX_TURNS) as $m) {
    if (!is_array($m)) continue;
    $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $content = is_string($m['content'] ?? null) ? trim($m['content']) : '';
    if ($content === '') continue;
    if (mb_strlen($content) > $MAX_CHARS) $content = mb_substr($content, 0, $MAX_CHARS);
    $clean[] = ['role' => $role, 'content' => $content];
}
if (count($clean) === 0 || end($clean)['role'] !== 'user') {
    webo_say(WEBO_FALLBACK, 400);
}
$lastUser = end($clean)['content'];

// ---------- per-IP rate limit (token-bucket in a temp file; no content stored) ----------
$rateMax    = (int) (getenv('WEBO_RATE_MAX') ?: 30);
$rateWindow = (int) (getenv('WEBO_RATE_WINDOW') ?: 600);
if (!webo_rate_ok(webo_client_ip(), $rateMax, $rateWindow)) {
    webo_say(WEBO_BUSY, 429);
}

// ---------- input moderation (starter screen) ----------
if (webo_is_unsafe($lastUser)) {
    // Do not call the model on unsafe input; gently redirect.
    webo_say(WEBO_REDIRECT);
}

// ---------- call Anthropic ----------
$model = getenv('WEBO_MODEL') ?: 'claude-sonnet-4-5';
$system = "You are Webo, a friendly, cheerful robot money buddy for children ages 6 to 10. "
    . "Explain money, saving, and growing money with simple words, short sentences, and fun comparisons "
    . "(jars, seeds, snowballs, piggy banks). Keep answers to 2 to 4 short sentences with an emoji or two. "
    . "Always be warm and encouraging. Never give specific investment advice, never name specific companies "
    . "or stocks to buy, and never discuss anything scary or not kid appropriate. If asked something off topic, "
    . "gently steer back to money in a playful way. Do not use em dashes.";

$payload = json_encode([
    'model' => $model,
    'max_tokens' => 300,
    'system' => $system,
    'messages' => $clean,
], JSON_UNESCAPED_UNICODE);

[$ok, $reply] = webo_call_anthropic($apiKey, $payload);
if (!$ok) {
    webo_say(WEBO_FALLBACK, 502);
}

// ---------- output moderation ----------
$reply = trim($reply);
if ($reply === '' || webo_is_unsafe($reply)) {
    webo_say(WEBO_FALLBACK);
}

webo_say($reply);

// ===================================================================
// Helpers
// ===================================================================

function webo_client_ip(): string
{
    // Cloud Run / proxies put the real client first in X-Forwarded-For.
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($xff !== '') {
        $first = trim(explode(',', $xff)[0]);
        if ($first !== '') return $first;
    }
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Sliding-window rate limit. Stores only timestamps keyed by a hash of the IP
 * (no IP in plaintext, no message content) in the system temp dir.
 */
function webo_rate_ok(string $ip, int $max, int $window): bool
{
    $file = sys_get_temp_dir() . '/webo_rl_' . sha1($ip);
    $now = time();
    $fp = @fopen($file, 'c+');
    if ($fp === false) return true; // fail open: never block a child over a temp-file hiccup
    try {
        flock($fp, LOCK_EX);
        $stamps = array_filter(array_map('intval', explode(',', (string) stream_get_contents($fp))));
        $stamps = array_values(array_filter($stamps, fn($t) => $t > $now - $window));
        if (count($stamps) >= $max) return false;
        $stamps[] = $now;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, implode(',', $stamps));
        return true;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

/**
 * Starter content screen. Intentionally conservative for a kid audience: it
 * blocks clearly adult / violent / self-harm / drug / hate / strong-profanity
 * content and redirects. This is NOT a real moderation model. Replace before
 * public launch (see SAFETY NOTE at the top of this file).
 */
function webo_is_unsafe(string $text): bool
{
    $t = mb_strtolower($text);
    $patterns = [
        '/\b(sex|sexual|porn|nude|naked|nsfw|breast|penis|vagina)\b/u',
        '/\b(kill|murder|gun|shoot|stab|bomb|terror|gore|blood)\b/u',
        '/\b(suicide|self\s*harm|kill myself|cut myself|hurt myself)\b/u',
        '/\b(cocaine|heroin|meth|weed|marijuana|vape|cigarette|alcohol|drunk|beer|wine)\b/u',
        '/\b(fuck|shit|bitch|asshole|cunt|dick|bastard)\b/u',
        '/\b(nigger|faggot|retard)\b/u',
    ];
    foreach ($patterns as $p) {
        if (preg_match($p, $t) === 1) return true;
    }
    return false;
}

/**
 * Call the Anthropic Messages API. Returns [bool ok, string replyText].
 * On any error returns [false, '']; never throws to the caller.
 */
function webo_call_anthropic(string $apiKey, string $payload): array
{
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
        ],
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($resp === false || $code < 200 || $code >= 300) {
        error_log('[webo] anthropic call failed: http=' . $code . ' err=' . $err);
        return [false, ''];
    }
    $data = json_decode((string) $resp, true);
    if (!is_array($data) || !isset($data['content']) || !is_array($data['content'])) {
        return [false, ''];
    }
    $text = '';
    foreach ($data['content'] as $block) {
        if (is_array($block) && ($block['type'] ?? '') === 'text') {
            $text .= ($block['text'] ?? '');
        }
    }
    return [true, $text];
}
