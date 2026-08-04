const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:31025';

function waitFor(predicate, timeoutMs = 15000, message = 'Timed out waiting for movement state') {
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

async function leave(room) {
    try { await room?.leave(); } catch {}
}

function player(room, sessionId) {
    return room.state?.players?.get(sessionId);
}

function point(entity) {
    return { x: entity.x, y: entity.y };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

(async () => {
    const clientA = new Client(url);
    const clientB = new Client(url);
    let roomA;
    let roomB;

    try {
        roomA = await clientA.create('game', {
            playerName: 'Move-Alpha',
            roomName: 'CI Movement Isolation',
            roomMap: 'small',
            roomMaxPlayers: 4,
            mode: 'outbreak',
            privateRoom: true,
        });
        roomB = await clientB.joinById(roomA.id, { playerName: 'Move-Bravo' });

        await waitFor(
            () => roomA.state?.players?.size === 2 && roomB.state?.players?.size === 2,
            15000,
            'Movement clients did not synchronize',
        );
        await waitFor(
            () => roomA.state?.game?.state === 'game' && player(roomA, roomA.sessionId)?.isAlive,
            25000,
            'Movement room did not become active',
        );

        const local = () => player(roomA, roomA.sessionId);
        const remote = () => player(roomB, roomA.sessionId);
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ];

        let timestamp = Date.now();
        let selectedDirection = null;
        let firstStepDistance = 0;

        for (const direction of directions) {
            const before = point(local());
            timestamp += 1;
            roomA.send('move', { type: 'move', ts: timestamp, value: direction });
            await waitFor(
                () => local()?.ack === timestamp,
                5000,
                `Movement acknowledgement ${timestamp} did not synchronize`,
            );
            firstStepDistance = distance(before, point(local()));
            if (firstStepDistance > 0.25) {
                selectedDirection = direction;
                break;
            }
        }

        assert.ok(selectedDirection, 'Player could not move in any cardinal direction');
        assert.ok(firstStepDistance > 0.25, 'Authoritative movement did not change position');

        await waitFor(
            () => remote() && distance(point(local()), point(remote())) < 0.01,
            5000,
            'Remote client did not receive the authoritative movement snapshot',
        );

        const movementAck = timestamp;
        const targetRotation = 1.234;
        const rotationTimestamp = movementAck + 1000;
        roomA.send('rotate', {
            type: 'rotate',
            ts: rotationTimestamp,
            value: { rotation: targetRotation },
        });
        await waitFor(
            () => Math.abs(local()?.rotation - targetRotation) < 0.001,
            5000,
            'Authoritative rotation did not synchronize',
        );
        assert.equal(
            local().ack,
            movementAck,
            'Rotation timestamp overwrote the movement-only acknowledgement',
        );

        const burstStart = point(local());
        for (let index = 0; index < 24; index += 1) {
            timestamp += 1;
            roomA.send('move', {
                type: 'move',
                ts: timestamp,
                value: selectedDirection,
            });
        }
        const finalAck = timestamp;
        await waitFor(
            () => local()?.ack === finalAck,
            5000,
            'Server did not process the complete monotonic movement burst',
        );
        await waitFor(
            () => remote() && distance(point(local()), point(remote())) < 0.01,
            5000,
            'Clients did not converge on the same post-burst position',
        );

        console.log(JSON.stringify({
            ok: true,
            clients: 2,
            simulationHz: 60,
            snapshotHz: 30,
            firstStepDistance,
            burstDistance: distance(burstStart, point(local())),
            movementAck,
            rotationTimestamp,
            finalAck,
            rotationPreservedMovementAck: true,
            clientsConverged: true,
        }));
    } finally {
        await leave(roomB);
        await leave(roomA);
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
