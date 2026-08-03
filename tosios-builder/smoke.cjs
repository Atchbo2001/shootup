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
        }, 100);
    });
}

async function leave(room) {
    try { await room?.leave(); } catch {}
}

(async () => {
    const clientA = new Client(url);
    const clientB = new Client(url);
    let outbreakA;
    let outbreakB;
    let pvpA;
    let pvpB;

    try {
        outbreakA = await clientA.create('game', {
            playerName: 'CI-Alpha',
            roomName: 'CI Private Outbreak',
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
            20000,
            'Outbreak wave did not start',
        );

        assert.equal(outbreakB.state.game.mode, 'outbreak');
        assert.equal(outbreakB.state.game.wave, outbreakA.state.game.wave);
        assert.equal(outbreakB.state.monsters.size, outbreakA.state.monsters.size);
        assert.equal(typeof outbreakA.state.game.bossWave, 'boolean');
        assert.ok(outbreakA.state.game.enemiesRemaining > 0);

        const outbreakNames = [...outbreakA.state.players.values()].map(player => player.name).sort();
        assert.deepEqual(outbreakNames, ['CI-Alpha', 'CI-Bravo']);
        for (const player of outbreakA.state.players.values()) {
            assert.equal(typeof player.score, 'number');
            assert.equal(typeof player.revives, 'number');
            assert.equal(typeof player.downed, 'boolean');
        }

        const listedWhilePrivate = await clientA.getAvailableRooms('game');
        assert.ok(
            !listedWhilePrivate.some(room => room.roomId === outbreakA.id),
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
            listedPublic.some(room => room.roomId === pvpA.id),
            'Public deathmatch room must remain visible',
        );

        console.log(JSON.stringify({
            ok: true,
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
        await leave(pvpB);
        await leave(pvpA);
        await leave(outbreakB);
        await leave(outbreakA);
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
