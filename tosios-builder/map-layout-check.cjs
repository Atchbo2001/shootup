const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourceArg = process.argv[2];
if (!sourceArg) throw new Error('Usage: node map-layout-check.cjs <patched-source>');
const root = path.resolve(sourceArg);
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const authored = readJson('packages/common/src/maps/encounters.json');
const constants = read('packages/common/src/constants.ts');

const names = ['citadel', 'catacombs'];
for (const name of names) {
    assert.match(constants, new RegExp(`['"]${name}['"]`), `${name} missing from MAPS_NAMES`);
    assert.ok(authored.details[name], `${name} map details missing`);
    const layout = authored.layouts[name];
    assert.ok(layout, `${name} encounter layout missing`);
    assert.ok(layout.zones.length >= 5, `${name} needs at least five encounter zones`);
    assert.ok(layout.zones.some((zone) => zone.boss), `${name} needs a boss arena`);

    const map = readJson(`packages/common/src/maps/${name}.json`);
    assert.ok(map.width >= 40, `${name} is not a large authored map`);
    assert.ok(map.height >= 32, `${name} is not a large authored map`);
    assert.equal(map.layers.length, 5, `${name} must contain five Tiled layers`);
    const expectedSize = map.width * map.height;
    const layers = Object.fromEntries(map.layers.map((layer) => [layer.name, layer]));
    for (const required of ['ground', 'walls', 'decor', 'spawners', 'collisions']) {
        assert.ok(layers[required], `${name} missing ${required} layer`);
        assert.equal(layers[required].data.length, expectedSize, `${name} ${required} size mismatch`);
    }
    const spawnerCount = layers.spawners.data.filter(Boolean).length;
    assert.ok(spawnerCount >= 8, `${name} needs at least eight multiplayer spawn tiles`);

    const blocked = new Set();
    layers.collisions.data.forEach((gid, index) => {
        if (gid) blocked.add(`${index % map.width}:${Math.floor(index / map.width)}`);
    });
    for (let x = 0; x < map.width; x += 1) {
        assert.ok(blocked.has(`${x}:0`), `${name} north boundary is open`);
        assert.ok(blocked.has(`${x}:${map.height - 1}`), `${name} south boundary is open`);
    }
    for (let y = 0; y < map.height; y += 1) {
        assert.ok(blocked.has(`0:${y}`), `${name} west boundary is open`);
        assert.ok(blocked.has(`${map.width - 1}:${y}`), `${name} east boundary is open`);
    }

    function expandedBlocked(rings) {
        let result = new Set(blocked);
        for (let ring = 0; ring < rings; ring += 1) {
            const next = new Set(result);
            for (const key of result) {
                const [x, y] = key.split(':').map(Number);
                for (let dy = -1; dy <= 1; dy += 1) {
                    for (let dx = -1; dx <= 1; dx += 1) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height) next.add(`${nx}:${ny}`);
                    }
                }
            }
            result = next;
        }
        return result;
    }

    function reachableFrom(point, rings) {
        const forbidden = expandedBlocked(rings);
        const startKey = `${point.x}:${point.y}`;
        assert.ok(!forbidden.has(startKey), `${name} start ${startKey} lacks clearance for ring ${rings}`);
        const seen = new Set([startKey]);
        const queue = [point];
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const current = queue[cursor];
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const x = current.x + dx;
                const y = current.y + dy;
                const key = `${x}:${y}`;
                if (x < 0 || y < 0 || x >= map.width || y >= map.height || forbidden.has(key) || seen.has(key)) continue;
                seen.add(key);
                queue.push({ x, y });
            }
        }
        return seen;
    }

    const regularReachable = reachableFrom(layout.start, 0);
    const bossReachable = reachableFrom(layout.start, 1);
    const authoredPoints = [
        layout.start,
        ...layout.startArmory,
        ...layout.zones.flatMap((zone) => [zone.center, zone.rewardPoint, ...zone.spawnPoints]),
    ];
    for (const point of authoredPoints) {
        const key = `${point.x}:${point.y}`;
        assert.ok(regularReachable.has(key), `${name} authored point ${key} is not reachable`);
    }
    for (const zone of layout.zones) {
        const points = [zone.center, zone.rewardPoint, ...(zone.boss ? zone.spawnPoints : [])];
        for (const point of points) {
            const key = `${point.x}:${point.y}`;
            assert.ok(bossReachable.has(key), `${name} boss route cannot reach ${zone.name} at ${key}`);
        }
    }

    const openTiles = expectedSize - blocked.size;
    assert.ok(openTiles >= expectedSize * 0.55, `${name} is too cramped for encounter movement`);
    console.log(JSON.stringify({
        map: name,
        width: map.width,
        height: map.height,
        spawners: spawnerCount,
        encounterZones: layout.zones.length,
        bossArena: layout.zones.find((zone) => zone.boss).name,
        openTiles,
        regularConnectedTiles: regularReachable.size,
        bossConnectedTiles: bossReachable.size,
    }));
}

console.log(JSON.stringify({ ok: true, siegeMaps: names, mapAuthoredEncounters: true }));
