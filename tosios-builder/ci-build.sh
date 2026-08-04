#!/usr/bin/env bash
set -euo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
UPSTREAM_COMMIT="${UPSTREAM_COMMIT:?UPSTREAM_COMMIT is required}"
RELEASE_VERSION="${RELEASE_VERSION:?RELEASE_VERSION is required}"
ZIP_NAME="${ZIP_NAME:?ZIP_NAME is required}"
SOURCE="$ROOT/work/source"
PACKAGE="$ROOT/package"

rm -rf "$ROOT/work" "$PACKAGE"
mkdir -p "$SOURCE"
curl --fail --location --retry 5 --retry-delay 3 \
  --output "$ROOT/work/tosios.tar.gz" \
  "https://github.com/halftheopposite/TOSIOS/archive/${UPSTREAM_COMMIT}.tar.gz"
tar -xzf "$ROOT/work/tosios.tar.gz" --strip-components=1 -C "$SOURCE"
test -f "$SOURCE/package.json"
test -f "$SOURCE/LICENSE"

node "$ROOT/tosios-builder/apply-patches.mjs" "$SOURCE"
node "$ROOT/tosios-builder/map-layout-check.cjs" "$SOURCE"
node "$ROOT/tosios-builder/movement-check.cjs" "$SOURCE"

npm install --global yarn@1.22.22
(
  cd "$SOURCE"
  yarn install --frozen-lockfile --non-interactive
  BUILD_MODE=production NODE_ENV=production yarn build
)

test -s "$SOURCE/packages/client/public/script.js"
test -s "$SOURCE/packages/server/dist/index.js"
test -s "$SOURCE/packages/common/src/maps/citadel.json"
test -s "$SOURCE/packages/common/src/maps/catacombs.json"
test -s "$SOURCE/packages/common/src/maps/encounters.json"
grep -q "Royal Guard Boss Arena" "$SOURCE/packages/common/src/maps/encounters.json"
grep -q "Bone Colossus Arena" "$SOURCE/packages/common/src/maps/encounters.json"
grep -q "selectOutbreakEncounter" "$SOURCE/packages/server/src/states/GameState.ts"
grep -q "activeEncounter.rewardPoint" "$SOURCE/packages/server/src/states/GameState.ts"
grep -q "siegeMaps: true" "$SOURCE/packages/server/src/index.ts"
grep -q "namedEncounterZones: true" "$SOURCE/packages/server/src/index.ts"
! grep -q "TOREMOVE_MAX_FPS_MS" "$SOURCE/packages/client/src/game/Game.ts"
! grep -q "tosios.online" "$SOURCE/packages/client/public/index.html"

cd "$SOURCE"
SERVER_HOST=127.0.0.1 SERVER_PORT=31025 PORT=31025 NODE_ENV=production \
  node packages/server/dist/index.js > server-test.log 2>&1 &
SERVER_PID=$!
cleanup_source_server() {
  kill -TERM "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  cat server-test.log 2>/dev/null || true
}
trap cleanup_source_server EXIT

for attempt in $(seq 1 90); do
  if curl --fail --silent http://127.0.0.1:31025/health > health.json; then
    grep -q '"version":"3.5.0"' health.json
    grep -q '"siegeMaps":true' health.json
    grep -q '"namedEncounterZones":true' health.json
    grep -q '"hunterAI":true' health.json
    grep -q '"smoothMovement":true' health.json
    break
  fi
  kill -0 "$SERVER_PID" 2>/dev/null
  test "$attempt" -lt 90
  sleep 1
done

cp "$ROOT/tosios-builder/smoke.cjs" ./smoke.cjs
cp "$ROOT/tosios-builder/hunter-ai-smoke.cjs" ./hunter-ai-smoke.cjs
cp "$ROOT/tosios-builder/siege-map-smoke.cjs" ./siege-map-smoke.cjs
node smoke.cjs
node hunter-ai-smoke.cjs
node siege-map-smoke.cjs
curl --fail --silent http://127.0.0.1:31025/api/status > status.json
grep -q '"citadel"' status.json
grep -q '"catacombs"' status.json
grep -q '"named-encounter-zones"' status.json
grep -q '"map-authored-spawn-gates"' status.json
grep -q '"encounter-reward-points"' status.json
grep -q '"grid-a-star-pathfinding"' status.json
grep -q '"four-weapon-arsenal"' status.json
grep -q '"team deathmatch"' status.json
cat health.json
cat status.json

cleanup_source_server
trap - EXIT
rm -f smoke.cjs hunter-ai-smoke.cjs siege-map-smoke.cjs server-test.log health.json status.json

rm -rf node_modules packages/client/node_modules packages/common/node_modules packages/server/node_modules
NODE_ENV=production yarn install --production --frozen-lockfile --non-interactive
test -d node_modules/express
test -d node_modules/cors

mkdir -p "$PACKAGE"
rsync -a --delete \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'images' \
  --exclude 'scripts/dev.sh' \
  "$SOURCE/" "$PACKAGE/"
cp "$ROOT/tosios-builder/start.sh" "$PACKAGE/start.sh"
cp "$ROOT/tosios-builder/README-FIRST.md" "$PACKAGE/README-FIRST.md"
chmod +x "$PACKAGE/start.sh"
cat > "$PACKAGE/VERSION.json" <<JSON
{
  "version": "${RELEASE_VERSION}",
  "upstream": "halftheopposite/TOSIOS",
  "upstreamCommit": "${UPSTREAM_COMMIT}",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "publicUrl": "https://shootup.shring.net",
  "port": 31025,
  "guestPlay": true,
  "simulationHz": 60,
  "snapshotHz": 30,
  "hunterAI": true,
  "pathfinding": "grid-a-star",
  "globalOutbreakAggro": true,
  "siegeMaps": ["citadel", "catacombs"],
  "namedEncounterZones": true,
  "encounterDirector": "map-authored-spawn-gates",
  "gameplay": "Siege Maps, named encounters, Hunter AI, Smooth Movement, Outbreak co-op, four-weapon Arsenal, deathmatch, and team deathmatch"
}
JSON

test -x "$PACKAGE/start.sh"
test -s "$PACKAGE/packages/client/public/script.js"
test -s "$PACKAGE/packages/server/dist/index.js"
test -s "$PACKAGE/packages/common/src/maps/citadel.json"
test -s "$PACKAGE/packages/common/src/maps/catacombs.json"
test -d "$PACKAGE/node_modules/express"
grep -q '"version": "3.5.0"' "$PACKAGE/VERSION.json"
grep -q '"namedEncounterZones": true' "$PACKAGE/VERSION.json"

cd "$PACKAGE"
SERVER_HOST=127.0.0.1 SERVER_PORT=31026 NODE_ENV=production \
  bash ./start.sh > package-test.log 2>&1 &
PACKAGE_PID=$!
cleanup_package_server() {
  kill -TERM "$PACKAGE_PID" 2>/dev/null || true
  wait "$PACKAGE_PID" 2>/dev/null || true
  cat package-test.log 2>/dev/null || true
}
trap cleanup_package_server EXIT
for attempt in $(seq 1 90); do
  if curl --fail --silent http://127.0.0.1:31026/health > package-health.json; then
    grep -q '"version":"3.5.0"' package-health.json
    grep -q '"siegeMaps":true' package-health.json
    grep -q '"namedEncounterZones":true' package-health.json
    curl --fail --silent http://127.0.0.1:31026/ | grep -q "Shring Shooter"
    curl --fail --silent http://127.0.0.1:31026/api/status | grep -q '"map-authored-spawn-gates"'
    cat package-health.json
    break
  fi
  kill -0 "$PACKAGE_PID" 2>/dev/null
  test "$attempt" -lt 90
  sleep 1
done
cleanup_package_server
trap - EXIT
rm -f package-test.log package-health.json

cd "$ROOT"
rm -f "$ZIP_NAME" "$ZIP_NAME.sha256"
(
  cd "$PACKAGE"
  zip -r -6 "$ROOT/$ZIP_NAME" .
)
sha256sum "$ZIP_NAME" > "$ZIP_NAME.sha256"
unzip -t "$ZIP_NAME"
stat -c 'ZIP size: %s bytes' "$ZIP_NAME"
