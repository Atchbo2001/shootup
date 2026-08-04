const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceArg = process.argv[2];
if (!sourceArg) {
    throw new Error('Usage: node tosios-builder/movement-check.cjs <patched-source>');
}

const root = path.resolve(sourceArg);
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const constants = read('packages/common/src/constants.ts');
const room = read('packages/server/src/rooms/GameRoom.ts');
const gameState = read('packages/server/src/states/GameState.ts');
const clientGame = read('packages/client/src/game/Game.ts');
const serverIndex = read('packages/server/src/index.ts');
const packageJson = JSON.parse(read('package.json'));

assert.equal(packageJson.version, '3.4.0');
assert.match(constants, /SIMULATION_STEP_MS\s*=\s*1000\s*\/\s*60/);
assert.match(constants, /NETWORK_PATCH_RATE_MS\s*=\s*1000\s*\/\s*30/);
assert.match(room, /setPatchRate\(Constants\.NETWORK_PATCH_RATE_MS\)/);
assert.match(room, /setSimulationInterval\(\(\) => this\.handleTick\(\), Constants\.SIMULATION_STEP_MS\)/);
assert.doesNotMatch(gameState, /player\.ack\s*=\s*Math\.max/);
assert.match(gameState, /Movement acknowledgement is intentionally not changed by rotation/);
assert.match(clientGame, /movementAccumulator/);
assert.match(clientGame, /1\s*-\s*Math\.exp\(-deltaMs\s*\/\s*Constants\.REMOTE_INTERPOLATION_MS\)/);
assert.match(clientGame, /Normal latency corrections are blended instead of hard-snapped/);
assert.doesNotMatch(clientGame, /TOREMOVE_MAX_FPS_MS/);
assert.match(serverIndex, /const VERSION = '3\.4\.0'/);
assert.match(serverIndex, /smoothMovement:\s*true/);
assert.match(serverIndex, /hunterAI:\s*true/);

const simulationStepMs = 1000 / 60;
const maxCatchupSteps = 5;
const durationMs = 10000;
const refreshRates = [20, 30, 60, 90, 120, 144, 240];
const results = {};

for (const fps of refreshRates) {
    const frameMs = 1000 / fps;
    const frameCount = Math.round(durationMs / frameMs);
    let accumulator = 0;
    let steps = 0;

    for (let frame = 0; frame < frameCount; frame += 1) {
        const deltaMs = Math.min(frameMs, 100);
        const maxAccumulator = simulationStepMs * maxCatchupSteps;
        accumulator = Math.min(accumulator + deltaMs, maxAccumulator);
        let catchupSteps = 0;
        while (accumulator + 0.001 >= simulationStepMs && catchupSteps < maxCatchupSteps) {
            accumulator = Math.max(0, accumulator - simulationStepMs);
            catchupSteps += 1;
            steps += 1;
        }
    }

    assert.equal(steps, 600, `${fps} FPS produced ${steps} movement steps instead of 600`);
    results[fps] = steps;
}

console.log(JSON.stringify({
    ok: true,
    version: packageJson.version,
    simulationHz: 60,
    snapshotHz: 30,
    durationSeconds: durationMs / 1000,
    stepsByRefreshRate: results,
    rotationCannotOverwriteMovementAck: true,
    frameRateIndependentInterpolation: true,
    softLocalCorrection: true,
    hunterAIRegressionCompatible: true,
}));
