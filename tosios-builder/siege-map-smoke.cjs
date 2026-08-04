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

function centroid(points) {
    return {
        x: points.reduce((sum, item) => sum + item.x, 0) / points.length,
        y: points.reduce((sum, item) => sum + item.y, 0) / points.length,
    };
}

function nearestDistance(monster, players) {
    return players.reduce((nearest, player) => Math.min(nearest, distance(point(monster), player)), Infinity);
}

async function verifySiegeMap(mapName, startTile, expectedEncounters) {
    const clientA = new Client(url);
    const clientB = new Client(url);
    let roomA;
    let roomB;
    try {
        roomA = await clientA.create('game', {
            playerName: `${mapName}-Alpha`,
            roomName: `CI ${mapName} Siege`,
            roomMap: mapName,
            roomMaxPlayers: 4,
            mode: 'outbreak',
            privateRoom: true,
        });
        roomB = await clientB.joinById(roomA.id, { playerName: `${mapName}-Bravo` });
        await waitFor(
            () => roomA.state?.players?.size === 2 && roomB.state?.players?.size === 2,
            15000,
            `${mapName} clients did not synchronize`,
        );
        await waitFor(
            () =>
                roomA.state?.game?.mapName === mapName &&
                roomA.state?.game?.mode === 'outbreak' &&
                roomA.state?.game?.state === 'game' &&
                roomA.state?.game?.wave >= 1 &&
                roomA.state?.game?.encounterName &&
                roomA.state?.monsters?.size >= 6,
            30000,
            `${mapName} authored encounter did not start`,
        );

        assert.ok(
            expectedEncounters.includes(roomA.state.game.encounterName),
            `${mapName} returned unknown encounter ${roomA.state.game.encounterName}`,
        );
        assert.equal(roomB.state.game.encounterName, roomA.state.game.encounterName);

        const players = Array.from(roomA.state.players.values()).map(point);
        const playerCenter = centroid(players);
        const authoredStart = { x: (startTile.x + 0.5) * 32, y: (startTile.y + 0.5) * 32 };
        assert.ok(
            distance(playerCenter, authoredStart) <= 48,
            `${mapName} players did not spawn at the authored holdout: ${JSON.stringify({ playerCenter, authoredStart })}`,
        );

        const activeProps = Array.from(roomA.state.props).filter((prop) => prop.active).map((prop) => prop.type);
        for (const expected of ['weapon-smg', 'weapon-rifle', 'weapon-scattergun', 'ammo-crate']) {
            assert.ok(activeProps.includes(expected), `${mapName} authored armory is missing ${expected}`);
        }

        const tracked = new Map();
        const bins = new Set();
        for (const [id, monster] of roomA.state.monsters.entries()) {
            const initial = point(monster);
            const initialDistance = nearestDistance(monster, players);
            const angle = Math.atan2(initial.y - playerCenter.y, initial.x - playerCenter.x);
            bins.add(Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 8) % 8);
            tracked.set(id, {
                initial,
                initialDistance,
                minimumDistance: initialDistance,
                maximumTravel: 0,
            });
        }
        assert.ok(tracked.size >= 6, `${mapName} did not create a full first wave`);
        assert.ok(
            Array.from(tracked.values()).some((entry) => entry.initialDistance >= 260),
            `${mapName} did not use a distant encounter gate`,
        );
        assert.ok(bins.size >= 2, `${mapName} wave did not attack from multiple fronts`);

        const sampleUntil = Date.now() + 6500;
        while (Date.now() < sampleUntil) {
            const currentPlayers = Array.from(roomA.state.players.values())
                .filter((player) => player.lives > 0)
                .map(point);
            for (const [id, metrics] of tracked.entries()) {
                const monster = roomA.state.monsters.get(id);
                if (!monster || !currentPlayers.length) continue;
                metrics.minimumDistance = Math.min(metrics.minimumDistance, nearestDistance(monster, currentPlayers));
                metrics.maximumTravel = Math.max(metrics.maximumTravel, distance(metrics.initial, point(monster)));
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const results = Array.from(tracked.values()).map((metrics) => ({
            initialDistance: Math.round(metrics.initialDistance),
            closedDistance: Math.round(metrics.initialDistance - metrics.minimumDistance),
            maximumTravel: Math.round(metrics.maximumTravel),
        }));
        const moved = results.filter((result) => result.maximumTravel >= 14);
        const pursued = results.filter((result) => result.closedDistance >= 45);
        assert.ok(
            moved.length >= Math.ceil(results.length * 0.6),
            `${mapName} monsters did not circulate through authored routes: ${JSON.stringify(results)}`,
        );
        assert.ok(
            pursued.length >= 1,
            `${mapName} monsters did not close distance through authored routes: ${JSON.stringify(results)}`,
        );

        return {
            map: mapName,
            encounter: roomA.state.game.encounterName,
            clients: 2,
            monsters: results.length,
            attackFronts: bins.size,
            moved: moved.length,
            pursuers: pursued.length,
            authoredStart: true,
            authoredArmory: true,
        };
    } finally {
        await leave(roomB);
        await leave(roomA);
    }
}

(async () => {
    const citadel = await verifySiegeMap(
        'citadel',
        { x: 20, y: 16 },
        ['Citadel Courtyard', 'Throne Hall Siege', 'West Armory Breach', 'East Armory Breach', 'Southern Forge Holdout'],
    );
    const catacombs = await verifySiegeMap(
        'catacombs',
        { x: 21, y: 18 },
        ['Central Ossuary', 'Northwest Crypt', 'Northeast Crypt', 'Southwest Crypt', 'Southeast Crypt'],
    );
    console.log(JSON.stringify({
        ok: true,
        siegeMaps: [citadel, catacombs],
        namedEncounterZones: true,
        mapAuthoredSpawnGates: true,
        mapAuthoredArmories: true,
        hunterAIRegression: true,
    }));
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
