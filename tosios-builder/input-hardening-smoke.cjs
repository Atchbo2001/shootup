const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:31027';
const healthUrl = process.env.TEST_HEALTH_URL || 'http://127.0.0.1:31027/health';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

(async () => {
    const client = new Client(url);
    let room;
    try {
        room = await client.create('game', {
            playerName: '  CI-Hardening\u0000  ',
            roomName: '  Hostile Packet Test\u0007  ',
            roomMap: 'citadel',
            roomMaxPlayers: 'not-a-number',
            mode: 'outbreak',
            privateRoom: true,
        });

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
        await sleep(750);
        const afterMalformed = await health();

        const validTs = Date.now() + 1;
        room.send('rotate', { type: 'rotate', ts: validTs, value: { rotation: 0.75 } });
        room.send('move', { type: 'move', ts: validTs + 1, value: { x: 1, y: 0 } });
        await sleep(500);
        const afterValid = await health();

        assert.equal(afterMalformed.uptimeSeconds <= afterValid.uptimeSeconds, true);
        console.log(JSON.stringify({
            ok: true,
            version: afterValid.version,
            inputHardening: afterValid.inputHardening,
            malformedPacketsRejected: malformed.length,
            validPacketsStillAccepted: true,
            serverStayedAlive: true,
        }));
    } finally {
        await leave(room);
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
