const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:31027';
const healthUrl = process.env.TEST_HEALTH_URL || 'http://127.0.0.1:31027/health';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitFor(predicate, timeoutMs = 10000, message = 'Timed out waiting for synchronized room state') {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            try {
                if (predicate()) {
                    clearInterval(timer);
                    resolve();
                } else if (Date.now() - started > timeoutMs) {
                    clearInterval(timer);
                    reject(new Error(message));
                }
            } catch (error) {
                clearInterval(timer);
                reject(error);
            }
        }, 50);
    });
}

async function health() {
    const response = await fetch(healthUrl);
    assert.equal(response.status, 200, 'Health endpoint must remain available');
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.version, '3.5.1');
    assert.equal(body.inputHardening, true);
    return body;
}

async function leave(room) {
    try { await room?.leave(); } catch {}
}

function player(room) {
    return room.state?.players?.get(room.sessionId);
}

(async () => {
    const client = new Client(url);
    let room;
    try {
        room = await client.create('game', {
            playerName: '  CI-Hardening\u0000  ',
            roomName: '  Hostile Packet Test\u0007  ',
            roomMap: 'small',
            roomMaxPlayers: 'not-a-number',
            mode: 'deathmatch',
            privateRoom: true,
        });

        // Consume optional rejection feedback so expected server-side validation
        // can never become an unhandled test-client error.
        const inputErrors = [];
        room.onMessage('input-error', (payload) => inputErrors.push(payload));

        await waitFor(
            () => player(room),
            10000,
            'The hardening test player did not synchronize',
        );

        const now = Date.now();
        const malformed = [
            ['rotate', {}],
            ['rotate', { ts: now, value: {} }],
            ['rotate', { ts: now, value: { rotation: null } }],
            ['rotate', { ts: now, value: { rotation: '1.2' } }],
            ['shoot', {}],
            ['shoot', { ts: now, value: { angle: null } }],
            ['shoot', { ts: now, value: { angle: 'bad' } }],
            ['move', {}],
            ['move', { ts: now, value: {} }],
            ['move', { ts: now, value: { x: 0, y: 0 } }],
            ['move', { ts: now, value: { x: 99, y: 99 } }],
            ['move', { ts: 'bad', value: { x: 1, y: 0 } }],
            ['unknown', { ts: now, value: {} }],
        ];

        for (const [type, payload] of malformed) room.send(type, payload);
        await sleep(1000);
        await health();

        assert.ok(player(room), 'Malformed packets disconnected or removed the player');

        const targetRotation = 0.75;
        const validTs = Date.now() + 1;
        room.send('rotate', {
            type: 'rotate',
            ts: validTs,
            value: { rotation: targetRotation },
        });
        await waitFor(
            () => Math.abs((player(room)?.rotation ?? Number.NaN) - targetRotation) < 0.001,
            5000,
            'A valid rotation was not accepted after malformed packets were rejected',
        );

        const afterValid = await health();
        assert.ok(player(room), 'Player synchronization was lost after valid recovery input');

        console.log(JSON.stringify({
            ok: true,
            version: afterValid.version,
            inputHardening: afterValid.inputHardening,
            malformedPacketsSent: malformed.length,
            optionalRejectionMessagesObserved: inputErrors.length,
            playerStayedSynchronized: true,
            validRotationAcceptedAfterAttack: true,
            serverStayedAlive: true,
        }));
    } finally {
        await leave(room);
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
