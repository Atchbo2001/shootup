#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
BASE_SCRIPT="$ROOT/tosios-builder/ci-build.sh"
TEMP_SCRIPT="$ROOT/.ci-build-v3.5.1.generated.sh"

python3 - "$BASE_SCRIPT" "$TEMP_SCRIPT" <<'PY'
from pathlib import Path
import sys
source = Path(sys.argv[1]).read_text()
needle = 'node "$ROOT/tosios-builder/apply-patches.mjs" "$SOURCE"'
replacement = needle + '\nnode "$ROOT/tosios-builder/apply-input-hardening.mjs" "$SOURCE"'
if needle not in source:
    raise SystemExit('Unable to locate the base overlay application step')
source = source.replace(needle, replacement, 1)
source = source.replace('3.5.0', '3.5.1')
Path(sys.argv[2]).write_text(source)
PY
chmod +x "$TEMP_SCRIPT"
trap 'rm -f "$TEMP_SCRIPT"' EXIT
bash "$TEMP_SCRIPT"

cd "$ROOT/package"
SERVER_HOST=127.0.0.1 SERVER_PORT=31027 PORT=31027 NODE_ENV=production \
  bash ./start.sh > input-hardening-package-test.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill -TERM "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  cat input-hardening-package-test.log 2>/dev/null || true
  rm -f input-hardening-package-test.log
}
trap cleanup EXIT

for attempt in $(seq 1 90); do
  if curl --fail --silent http://127.0.0.1:31027/health > /dev/null; then
    break
  fi
  kill -0 "$SERVER_PID" 2>/dev/null
  test "$attempt" -lt 90
  sleep 1
done

TEST_WS_URL=ws://127.0.0.1:31027 \
TEST_HEALTH_URL=http://127.0.0.1:31027/health \
node "$ROOT/tosios-builder/input-hardening-smoke.cjs"

cleanup
trap - EXIT
rm -f "$TEMP_SCRIPT"
