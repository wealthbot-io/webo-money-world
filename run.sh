#!/usr/bin/env bash
# Webo's Money World — local dev.
#
# Full stack (lessons + Ask Webo): needs the Vercel CLI so the /api/ask Node
# function runs locally. Put ANTHROPIC_API_KEY in .env first (copy .env.example).
#
#   npm i -g vercel      # once
#   ./run.sh             # -> vercel dev on http://localhost:3000
#
# Front-end only (lessons + world; Ask Webo shows a friendly "getting ready"
# message): any static server works, e.g.  (cd public && python3 -m http.server 8000)
set -euo pipefail
cd "$(dirname "$0")"

if command -v vercel >/dev/null 2>&1; then
  echo "Starting full stack via 'vercel dev' (loads .env, serves public/ + /api/ask)..."
  exec vercel dev
fi

echo "Vercel CLI not found. Serving the FRONT-END ONLY from ./public (Ask Webo needs 'vercel dev' or a deploy)."
echo "Install the Vercel CLI for the full stack:  npm i -g vercel"
PORT="${PORT:-8000}"
cd public
if command -v python3 >/dev/null 2>&1; then
  echo "Front-end at http://localhost:${PORT}/"
  exec python3 -m http.server "${PORT}"
elif command -v php >/dev/null 2>&1; then
  echo "Front-end at http://localhost:${PORT}/"
  exec php -S "localhost:${PORT}"
else
  echo "No static server found (need python3 or php)."
  exit 1
fi
