import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [sourceArg] = process.argv.slice(2);
if (!sourceArg) throw new Error('Usage: node apply-input-hardening.mjs <tosios-source>');

const root = path.resolve(sourceArg);
const builderDir = path.dirname(fileURLToPath(import.meta.url));
const archiveParts = [
    'input-hardening-patches.b64.chunk000',
    'input-hardening-patches.b64.chunk001',
    'input-hardening-patches.b64.chunk002',
    'input-hardening-patches.b64.chunk003',
    'input-hardening-patches.b64.chunk004',
];
const expectedSha256 = '946f4cef2e02cc80b54a03568cb88df6c5075468d64b7dc7940a5a190d357e6a';

const before = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
if (before.name !== 'shring-shooter' || before.version !== '3.5.0') {
    throw new Error(`Input hardening expects Shring Shooter 3.5.0, got ${before.name}@${before.version}`);
}

const encoded = (await Promise.all(
    archiveParts.map((part) => fs.readFile(path.join(builderDir, part), 'utf8')),
)).join('');
const archive = Buffer.from(encoded.replace(/\s+/g, ''), 'base64');
const digest = createHash('sha256').update(archive).digest('hex');
if (digest !== expectedSha256) {
    throw new Error(`Input hardening checksum mismatch: expected ${expectedSha256}, got ${digest}`);
}

const archivePath = path.join(root, '.shring-input-hardening.tar.gz');
await fs.writeFile(archivePath, archive);
try {
    execFileSync('tar', ['-xzf', archivePath, '-C', root], { stdio: 'inherit' });
} finally {
    await fs.rm(archivePath, { force: true });
}

const after = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
if (after.name !== 'shring-shooter' || after.version !== '3.5.1') {
    throw new Error(`Unexpected hardened package identity: ${after.name}@${after.version}`);
}

const room = await fs.readFile(path.join(root, 'packages/server/src/rooms/GameRoom.ts'), 'utf8');
const state = await fs.readFile(path.join(root, 'packages/server/src/states/GameState.ts'), 'utf8');
const server = await fs.readFile(path.join(root, 'packages/server/src/index.ts'), 'utf8');
for (const marker of [
    'ACTIONS_PER_SECOND_MAX',
    'normalizeAction',
    'Number.isFinite',
    'normalizeAngle',
]) {
    if (!room.includes(marker)) throw new Error(`GameRoom.ts is missing hardening marker: ${marker}`);
}
if (!state.includes('this.actions.length >= 500')) {
    throw new Error('GameState.ts is missing defensive action queue validation');
}
if (!server.includes("const VERSION = '3.5.1'")) {
    throw new Error('Server version was not updated to 3.5.1');
}
if (!server.includes('inputHardening: true')) {
    throw new Error('Health endpoint is missing inputHardening');
}

console.log(`[patch] Applied verified Network Input Hardening overlay ${digest}`);
