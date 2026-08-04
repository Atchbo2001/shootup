import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [sourceArg] = process.argv.slice(2);
if (!sourceArg) throw new Error('Usage: node apply-patches.mjs <tosios-source>');

const root = path.resolve(sourceArg);
const builderDir = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '3.5.0';
const UPSTREAM = '98de136e524d25c5877adc9523c9445bc2b4a262';

const PATCHES = [
    {
        name: 'Outbreak base',
        sha256: '6d63b728145108cde9f77ad5e6e5d8fffc44031d747b51f0cb36e2d75e266911',
        parts: [
            'outbreak-patches.b64.001',
            'outbreak-patches.b64.002',
            'outbreak-patches.b64.003',
        ],
    },
    {
        name: 'Arsenal milestone',
        sha256: 'ee482797159d07389806bb009f0c10a0830d8c27d74aae5900b5d5e47afdfe5c',
        parts: [
            'arsenal-patches.b64.001',
            'arsenal-patches.b64.002',
            'arsenal-patches.b64.003',
            'arsenal-patches.b64.004.1',
            'arsenal-patches.b64.004.2',
            'arsenal-patches.b64.004.3',
            'arsenal-patches.b64.004.4',
            'arsenal-patches.b64.004.5',
            'arsenal-patches.b64.004.6',
            'arsenal-patches.b64.005',
            'arsenal-patches.b64.006',
            'arsenal-patches.b64.007',
        ],
    },
    {
        name: 'Smooth Movement milestone',
        sha256: 'f42d57d644a165900cd114a7af1b217329c2a82661b0815145133d29e10feb00',
        parts: [
            'smooth-movement-patches.b64.001',
            'smooth-movement-patches.b64.002',
            'smooth-movement-patches.b64.003',
            'smooth-movement-patches.b64.004',
        ],
    },
    {
        name: 'Hunter AI milestone',
        sha256: 'd25c8ffb7c6379e97d638ed38d34f7a4959829f005a0929507b309440509f9f7',
        parts: [
            'hunter-ai-patches.b64.chunk000a',
            'hunter-ai-patches.b64.chunk000b',
            'hunter-ai-patches.b64.chunk000c',
            'hunter-ai-patches.b64.chunk000d',
            'hunter-ai-patches.b64.chunk000e',
            'hunter-ai-patches.b64.chunk000f',
            'hunter-ai-patches.b64.chunk000g',
            'hunter-ai-patches.b64.chunk001',
            'hunter-ai-patches.b64.chunk002',
            'hunter-ai-patches.b64.chunk003',
            'hunter-ai-patches.b64.chunk004',
            'hunter-ai-patches.b64.chunk005',
        ],
    },
    {
        name: 'Siege Maps milestone',
        sha256: 'bb17a665254219b9445ccd0df0271afc36ddf534e9edc244fe98aa3ed621d89b',
        parts: [
            'siege-maps-patches.b64.chunk000',
            'siege-maps-patches.b64.chunk001',
            'siege-maps-patches.b64.chunk002',
            'siege-maps-patches.b64.chunk003',
            'siege-maps-patches.b64.chunk004',
            'siege-maps-patches.b64.chunk005',
            'siege-maps-patches.b64.chunk006',
            'siege-maps-patches.b64.chunk007',
        ],
    },
];

async function read(relative) {
    return fs.readFile(path.join(root, relative), 'utf8');
}

async function assertContains(relative, marker) {
    const text = await read(relative);
    if (!text.includes(marker)) throw new Error(`${relative} is missing required marker: ${marker}`);
}

async function assertNotContains(relative, marker) {
    const text = await read(relative);
    if (text.includes(marker)) throw new Error(`${relative} still contains forbidden marker: ${marker}`);
}

async function applyArchive(definition, index) {
    const chunks = await Promise.all(
        definition.parts.map((part) => fs.readFile(path.join(builderDir, part), 'utf8')),
    );
    const archive = Buffer.from(chunks.join('').replace(/\s+/g, ''), 'base64');
    const digest = createHash('sha256').update(archive).digest('hex');
    if (digest !== definition.sha256) {
        throw new Error(`${definition.name} checksum mismatch: expected ${definition.sha256}, got ${digest}`);
    }

    const archivePath = path.join(root, `.shring-patches-${index}.tar.gz`);
    await fs.writeFile(archivePath, archive);
    try {
        execFileSync('tar', ['-xzf', archivePath, '-C', root], { stdio: 'inherit' });
    } finally {
        await fs.rm(archivePath, { force: true });
    }
    console.log(`[patch] Applied verified ${definition.name} overlay ${digest}`);
}

await assertContains('package.json', 'halftheopposite/tosios');
await assertContains('LICENSE', 'MIT License');
for (let index = 0; index < PATCHES.length; index += 1) {
    await applyArchive(PATCHES[index], index);
}

const pkg = JSON.parse(await read('package.json'));
if (pkg.name !== 'shring-shooter' || pkg.version !== VERSION) {
    throw new Error(`Unexpected patched package identity: ${pkg.name}@${pkg.version}`);
}

await assertContains('packages/common/src/constants.ts', 'export const WEAPONS');
await assertContains('packages/common/src/constants.ts', "'citadel'");
await assertContains('packages/common/src/constants.ts', "'catacombs'");
await assertContains('packages/common/src/constants.ts', 'SIMULATION_STEP_MS');
await assertContains('packages/common/src/constants.ts', 'OUTBREAK_MONSTER_SIGHT = 100000');
await assertContains('packages/common/src/maps/encounters.json', 'Royal Guard Boss Arena');
await assertContains('packages/common/src/maps/encounters.json', 'Bone Colossus Arena');
await assertContains('packages/common/src/maps/index.ts', "import citadel from './citadel.json'");
await assertContains('packages/common/src/maps/index.ts', "import catacombs from './catacombs.json'");
await assertContains('packages/server/src/navigation/GridNavigation.ts', 'class GridNavigation');
await assertContains('packages/server/src/entities/Monster.ts', 'persistentPursuit');
await assertContains('packages/server/src/entities/Game.ts', 'encounterName');
await assertContains('packages/server/src/states/GameState.ts', 'selectOutbreakEncounter');
await assertContains('packages/server/src/states/GameState.ts', 'outbreakSpawnPoints');
await assertContains('packages/server/src/states/GameState.ts', 'activeEncounter.rewardPoint');
await assertContains('packages/server/src/states/GameState.ts', 'monster.update(this.players, this.navigation)');
await assertContains('packages/server/src/states/GameState.ts', 'Movement acknowledgement is intentionally not changed by rotation');
await assertContains('packages/client/src/game/Game.ts', 'encounterName');
await assertContains('packages/client/src/screens/Game/components/HUD/OutbreakStatus.tsx', 'encounter');
await assertContains('packages/client/src/game/Game.ts', 'movementAccumulator');
await assertContains('packages/server/src/index.ts', "const VERSION = '3.5.0'");
await assertContains('packages/server/src/index.ts', 'hunterAI: true');
await assertContains('packages/server/src/index.ts', 'siegeMaps: true');
await assertContains('packages/server/src/index.ts', 'namedEncounterZones: true');
await assertNotContains('packages/server/src/states/GameState.ts', 'player.ack = Math.max');

console.log(`[patch] Applied Shring Shooter Siege Maps ${VERSION} to pinned TOSIOS ${UPSTREAM}`);
