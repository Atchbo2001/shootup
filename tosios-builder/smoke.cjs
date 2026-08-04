const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:31025';

function waitFor(predicate, timeoutMs = 20000, message = 'Timed out waiting for synchronized room state') {
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

function propTypes(room) {
    return Array.from(room.state?.props || []).filter((prop) => prop.active).map((prop) => prop.type);
}

function bulletsFor(room, playerId) {
    return Array.from(room.state?.bullets || []).filter((bullet) => bullet.playerId === playerId);
}

function point(entity) {
    return { x: entity.x, y: entity.y };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

async function verifyMovement(roomA, roomB) {
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

    return {
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
    };
}

(async () => {
    const clientA = new Client(url);
    const clientB = new Client(url);
    let outbreakA;
    let outbreakB;
    let pvpA;
    let pvpB;
    let movementA;
    let movementB;

    try {
        outbreakA = await clientA.create('game', {
            playerName: 'CI-Alpha',
            roomName: 'CI Private Arsenal',
            roomMap: 'small',
            roomMaxPlayers: 4,
            mode: 'outbreak',
            privateRoom: true,
        });
        outbreakB = await clientB.joinById(outbreakA.id, { playerName: 'CI-Bravo' });

        assert.equal(outbreakA.id, outbreakB.id, 'Outbreak clients must join the same room');
        await waitFor(
            () => outbreakA.state?.players?.size === 2 && outbreakB.state?.players?.size === 2,
            15000,
            'Outbreak clients did not synchronize',
        );
        await waitFor(
            () =>
                outbreakA.state?.game?.mode === 'outbreak' &&
                outbreakA.state?.game?.state === 'game' &&
                outbreakA.state?.game?.wave >= 1 &&
                outbreakA.state?.monsters?.size > 0,
            25000,
            'Outbreak wave did not start',
        );

        assert.equal(outbreakB.state.game.mode, 'outbreak');
        assert.equal(outbreakB.state.game.wave, outbreakA.state.game.wave);
        assert.equal(outbreakB.state.monsters.size, outbreakA.state.monsters.size);
        assert.equal(typeof outbreakA.state.game.bossWave, 'boolean');
        assert.ok(outbreakA.state.game.enemiesRemaining > 0);

        const outbreakNames = [...outbreakA.state.players.values()].map((item) => item.name).sort();
        assert.deepEqual(outbreakNames, ['CI-Alpha', 'CI-Bravo']);
        for (const item of outbreakA.state.players.values()) {
            assert.equal(item.weapon, 'sidearm');
            assert.equal(item.ammo, 12);
            assert.equal(item.reserveAmmo, 72);
            assert.equal(item.reloadingEndsAt, 0);
            assert.equal(typeof item.score, 'number');
            assert.equal(typeof item.revives, 'number');
            assert.equal(typeof item.downed, 'boolean');
        }

        const armory = propTypes(outbreakA);
        for (const expected of ['weapon-smg', 'weapon-rifle', 'weapon-scattergun', 'ammo-crate']) {
            assert.ok(armory.includes(expected), `Starting armory is missing ${expected}`);
        }

        const alpha = () => player(outbreakA, outbreakA.sessionId);
        outbreakA.send('shoot', { type: 'shoot', ts: Date.now(), value: { angle: 0 } });
        await waitFor(
            () => alpha()?.ammo === 11 && bulletsFor(outbreakA, outbreakA.sessionId).length > 0,
            5000,
            'Authoritative sidearm shot did not consume ammunition or synchronize a bullet',
        );
        const sidearmBullet = bulletsFor(outbreakA, outbreakA.sessionId).sort((a, b) => b.shotAt - a.shotAt)[0];
        assert.equal(sidearmBullet.weapon, 'sidearm');
        assert.equal(sidearmBullet.damage, 2);
        assert.equal(sidearmBullet.speed, 5.2);
        assert.equal(sidearmBullet.maxDistance, 640);

        outbreakA.send('reload', { type: 'reload', ts: Date.now(), value: {} });
        await waitFor(
            () => alpha()?.reloadingEndsAt > Date.now(),
            3000,
            'Server did not start the manual reload',
        );
        await waitFor(
            () => alpha()?.reloadingEndsAt === 0 && alpha()?.ammo === 12 && alpha()?.reserveAmmo === 71,
            5000,
            'Server did not complete the timed reload with correct magazine accounting',
        );

        const listedWhilePrivate = await clientA.getAvailableRooms('game');
        assert.ok(
            !listedWhilePrivate.some((room) => room.roomId === outbreakA.id),
            'Private Outbreak room must not appear in the public room browser',
        );

        await leave(outbreakB);
        outbreakB = undefined;
        await leave(outbreakA);
        outbreakA = undefined;

        pvpA = await clientA.create('game', {
            playerName: 'CI-Alpha',
            roomName: 'CI Public PvP',
            roomMap: 'small',
            roomMaxPlayers: 4,
            mode: 'deathmatch',
            privateRoom: false,
        });
        pvpB = await clientB.joinById(pvpA.id, { playerName: 'CI-Bravo' });

        await waitFor(
            () => pvpA.state?.players?.size === 2 && pvpB.state?.players?.size === 2,
            15000,
            'Classic PvP clients did not synchronize',
        );
        assert.equal(pvpA.state.game.mode, 'deathmatch');

        const listedPublic = await clientA.getAvailableRooms('game');
        assert.ok(
            listedPublic.some((room) => room.roomId === pvpA.id),
            'Public deathmatch room must remain visible',
        );

        await leave(pvpB);
        pvpB = undefined;
        await leave(pvpA);
        pvpA = undefined;

        movementA = await clientA.create('game', {
            playerName: 'Move-Alpha',
            roomName: 'CI Movement Isolation',
            roomMap: 'small',
            roomMaxPlayers: 4,
            mode: 'deathmatch',
            privateRoom: true,
        });
        movementB = await clientB.joinById(movementA.id, { playerName: 'Move-Bravo' });
        await waitFor(
            () => movementA.state?.players?.size === 2 && movementB.state?.players?.size === 2,
            15000,
            'Movement clients did not synchronize',
        );
        await waitFor(
            () => movementA.state?.game?.state === 'game',
            25000,
            'Movement room did not become active',
        );
        const movement = await verifyMovement(movementA, movementB);

        console.log(JSON.stringify({
            ok: true,
            smoothMovement: movement,
            arsenal: {
                weapons: ['sidearm', 'smg', 'rifle', 'scattergun'],
                startingArmory: true,
                authoritativeShot: true,
                timedReload: true,
            },
            outbreak: {
                clients: 2,
                wave: 1,
                privateRoomHidden: true,
                synchronizedPlayers: outbreakNames,
            },
            classicPvP: {
                clients: 2,
                publicRoomListed: true,
            },
        }));
    } finally {
        await leave(movementB);
        await leave(movementA);
        await leave(pvpB);
        await leave(pvpA);
        await leave(outbreakB);
        await leave(outbreakA);
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
