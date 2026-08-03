#!/usr/bin/env bash
set -euo pipefail

cd /home/container 2>/dev/null || cd "$(dirname "$0")"

export NODE_ENV="${NODE_ENV:-production}"
export SERVER_HOST="${SERVER_HOST:-0.0.0.0}"
export SERVER_PORT="${SERVER_PORT:-31025}"
export PORT="$SERVER_PORT"

if [ ! -f ./packages/server/dist/index.js ]; then
    echo "[start] ERROR: compiled TOSIOS server is missing" >&2
    exit 1
fi

if [ ! -f ./packages/client/public/script.js ]; then
    echo "[start] ERROR: compiled browser client is missing" >&2
    exit 1
fi

if [ ! -d ./node_modules ]; then
    echo "[start] ERROR: packaged production dependencies are missing" >&2
    exit 1
fi

exec node ./packages/server/dist/index.js
