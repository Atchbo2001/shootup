import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [sourceArg] = process.argv.slice(2);
if (!sourceArg) throw new Error('Usage: node apply-patches.mjs <tosios-source>');

const root = path.resolve(sourceArg);
const builderDir = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '3.2.0';
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
];

async function read(relative) {
    return fs.readFile(path.join(root, relative), 'utf8');
}

async function assertContains(relative, marker) {
    const text = await read(relative);
    if (!text.includes(marker)) throw new Error(`${relative} is missing required marker: ${marker}`);
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
await assertContains('packages/common/src/constants.ts', 'scattergun');
await assertContains('packages/server/src/states/GameState.ts', 'startPlayerReload');
await assertContains('packages/server/src/states/GameState.ts', 'spawnStartingArmory');
await assertContains('packages/client/src/screens/Game/components/HUD/WeaponStatus.tsx', 'RELOADING');
await assertContains('packages/server/src/index.ts', "const VERSION = '3.2.0'");

console.log(`[patch] Applied Shring Shooter Arsenal ${VERSION} to pinned TOSIOS ${UPSTREAM}`);
