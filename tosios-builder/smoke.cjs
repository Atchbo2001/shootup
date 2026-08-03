const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:31025';

function waitFor(predicate, timeoutMs = 15000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
            try {
                if (predicate()) {
                    clearInterval(timer);
                    resolve();
                } else if (Date.now() - started > timeoutMs) {
                    clearInterval(timer);
                    reject(new Error('Timed out waiting for synchronized room state'));
                }
            } catch (error) {
                clearInterval(timer);
                reject(error);
            }
        }, 100);
    });
}

(async () => {
    const clientA = new Client(url);
    const clientB = new Client(url);
    let roomA;
    let roomB;

    try {
        roomA = await clientA.create('game', {
            playerName: 'CI-Alpha',
            roomName: 'CI Shring Room',
            roomMap: 'small',
            roomMaxPlayers: 4,
            mode: 'deathmatch',
        });

        roomB = await clientB.joinById(roomA.id, { playerName: 'CI-Bravo' });

        assert.equal(roomA.id, roomB.id, 'Both clients must join the same room');
        await waitFor(() => roomA.state?.players?.size === 2 && roomB.state?.players?.size === 2);

        const namesA = [...roomA.state.players.values()].map(player => player.name).sort();
        const namesB = [...roomB.state.players.values()].map(player => player.name).sort();
        assert.deepEqual(namesA, ['CI-Alpha', 'CI-Bravo']);
        assert.deepEqual(namesB, namesA);

        const rooms = await clientA.getAvailableRooms('game');
        assert.ok(rooms.some(room => room.roomId === roomA.id), 'Created room must be listed');

        console.log(JSON.stringify({
            ok: true,
            roomId: roomA.id,
            clients: 2,
            players: namesA,
        }));
    } finally {
        try { await roomB?.leave(); } catch {}
        try { await roomA?.leave(); } catch {}
    }
})().catch(error => {
    console.error(error);
    process.exit(1);
});
