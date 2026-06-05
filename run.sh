#!/usr/bin/env bash
# Webo's Money World — local dev server.
# Loads .env (for ANTHROPIC_API_KEY etc.) and serves ./public with PHP's built-in server.
# The front-end is at  http://localhost:8000/  and the proxy at  /api/ask.php
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a; source .env; set +a
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "warning: ANTHROPIC_API_KEY is not set. The lessons work, but 'Ask Webo' will reply with a friendly 'getting ready' message until you set it (copy .env.example to .env)."
fi

PORT="${PORT:-8000}"
echo "Webo's Money World running at http://localhost:${PORT}/"
exec php -S "localhost:${PORT}" -t public
