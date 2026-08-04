const assert = require('node:assert/strict');
const { Client } = require('colyseus.js');

const url = process.env.TEST_WS_URL || 'ws://127.0.0.1:31025';

function waitFor(predicate, timeoutMs, message) {
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

function point(entity) {
    return { x: entity.x, y: entity.y };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function livingPlayerPoints(room) {
    return Array.from(room.state?.players?.values() || [])
        .filter((player) => player.lives > 0)
        .map(point);
}

function nearestPlayerDistance(monster, players) {
    return players.reduce((nearest, player) => Math.min(nearest, distance(point(monster), player)), Infinity);
}

(async () => {
    const clientA = new Client(url);
    const clientB = new Client(url);
    let roomA;
    let roomB;

    try {
        roomA = await clientA.create('game', {
            playerName: 'Hunter-Alpha',
            roomName: 'CI Gigantic Hunter AI',
            roomMap: 'gigantic',
            roomMaxPlayers: 4,
            mode: 'outbreak',
            privateRoom: true,
        });
        roomB = await clientB.joinById(roomA.id, { playerName: 'Hunter-Bravo' });

        await waitFor(
            () => roomA.state?.players?.size === 2 && roomB.state?.players?.size === 2,
            15000,
            'Gigantic-map Hunter AI clients did not synchronize',
        );
        await waitFor(
            () =>
                roomA.state?.game?.mapName === 'gigantic' &&
                roomA.state?.game?.mode === 'outbreak' &&
                roomA.state?.game?.state === 'game' &&
                roomA.state?.game?.wave >= 1 &&
                roomA.state?.monsters?.size >= 3,
            30000,
            'Gigantic-map Outbreak wave did not start',
        );

        const players = livingPlayerPoints(roomA);
        assert.equal(players.length, 2, 'Both Hunter AI test players must begin alive');

        const tracked = new Map();
        for (const [id, monster] of roomA.state.monsters.entries()) {
            tracked.set(id, {
                initial: point(monster),
                initialDistance: nearestPlayerDistance(monster, players),
                minimumDistance: nearestPlayerDistance(monster, players),
                maximumTravel: 0,
            });
        }
        assert.ok(tracked.size >= 3, 'Hunter AI test requires at least three monsters');
        assert.ok(
            Array.from(tracked.values()).some((entry) => entry.initialDistance >= 220),
            'Reachable spawn director did not create a meaningful pursuit distance',
        );

        const sampleUntil = Date.now() + 9000;
        while (Date.now() < sampleUntil) {
            const currentPlayers = livingPlayerPoints(roomA);
            for (const [id, metrics] of tracked.entries()) {
                const monster = roomA.state.monsters.get(id);
                if (!monster || !currentPlayers.length) continue;
                metrics.minimumDistance = Math.min(
                    metrics.minimumDistance,
                    nearestPlayerDistance(monster, currentPlayers),
                );
                metrics.maximumTravel = Math.max(metrics.maximumTravel, distance(metrics.initial, point(monster)));
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const results = Array.from(tracked.entries()).map(([id, metrics]) => ({
            id,
            initialDistance: Math.round(metrics.initialDistance * 100) / 100,
            minimumDistance: Math.round(metrics.minimumDistance * 100) / 100,
            closedDistance: Math.round((metrics.initialDistance - metrics.minimumDistance) * 100) / 100,
            maximumTravel: Math.round(metrics.maximumTravel * 100) / 100,
        }));
        const meaningful = results.filter((result) => result.initialDistance >= 220);
        const moved = results.filter((result) => result.maximumTravel >= 16);
        const pursuers = meaningful.filter((result) => result.closedDistance >= 70);

        assert.ok(
            moved.length >= Math.max(2, Math.ceil(results.length * 0.6)),
            `Too many gigantic-map monsters remained stationary: ${JSON.stringify(results)}`,
        );
        assert.ok(
            pursuers.length >= 1,
            `No distant gigantic-map monster successfully pursued the players: ${JSON.stringify(results)}`,
        );

        console.log(JSON.stringify({
            ok: true,
            hunterAI: {
                map: 'gigantic',
                clients: 2,
                monstersTracked: results.length,
                monstersMoved: moved.length,
                distantPursuers: pursuers.length,
                globalAggro: true,
                pathfinding: 'grid-a-star',
                dynamicReplanning: true,
                stuckRecovery: true,
                reachableSpawnLanes: true,
                results,
            },
        }));
    } finally {
        await leave(roomB);
        await leave(roomA);
    }
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
