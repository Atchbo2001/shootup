import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [sourceArg] = process.argv.slice(2);
if (!sourceArg) throw new Error('Usage: node apply-patches.mjs <tosios-source>');

const root = path.resolve(sourceArg);
const builderDir = path.dirname(fileURLToPath(import.meta.url));
const VERSION = '3.1.0';
const UPSTREAM = '98de136e524d25c5877adc9523c9445bc2b4a262';
const PATCH_SHA256 = '6d63b728145108cde9f77ad5e6e5d8fffc44031d747b51f0cb36e2d75e266911';
const PATCH_PARTS = [
    'outbreak-patches.b64.001',
    'outbreak-patches.b64.002',
    'outbreak-patches.b64.003',
];

async function read(relative) {
    return fs.readFile(path.join(root, relative), 'utf8');
}

async function write(relative, content) {
    const file = path.join(root, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf8');
}

async function replace(relative, transform) {
    const original = await read(relative);
    const updated = transform(original);
    if (updated === original) console.warn(`[patch] ${relative} was unchanged`);
    await write(relative, updated);
}

async function applyOutbreakArchive() {
    const chunks = await Promise.all(
        PATCH_PARTS.map(part => fs.readFile(path.join(builderDir, part), 'utf8')),
    );
    const archive = Buffer.from(chunks.join('').replace(/\s+/g, ''), 'base64');
    const digest = createHash('sha256').update(archive).digest('hex');
    if (digest !== PATCH_SHA256) {
        throw new Error(`Outbreak patch checksum mismatch: expected ${PATCH_SHA256}, got ${digest}`);
    }

    const archivePath = path.join(root, '.shring-outbreak-patches.tar.gz');
    await fs.writeFile(archivePath, archive);
    try {
        execFileSync('tar', ['-xzf', archivePath, '-C', root], { stdio: 'inherit' });
    } finally {
        await fs.rm(archivePath, { force: true });
    }
    console.log(`[patch] Applied verified Outbreak overlay ${digest}`);
}

await applyOutbreakArchive();

await replace('package.json', text => {
    const pkg = JSON.parse(text);
    pkg.name = 'shring-shooter';
    pkg.version = VERSION;
    pkg.description = 'Shring Shooter with PvP and cooperative Outbreak wave survival.';
    return `${JSON.stringify(pkg, null, 4)}\n`;
});

await write('packages/client/src/screens/Home/components/Header.tsx', `import { Constants } from '@tosios/common';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Space, Text, View } from '../../../components';

export function Header(): React.ReactElement {
    return (
        <>
            <Helmet>
                <title>{Constants.APP_TITLE + ' - Home'}</title>
                <meta name="description" content="Cooperative Outbreak waves and fast browser multiplayer hosted by the Shring Network." />
            </Helmet>
            <View flex center column style={{ width: 700, maxWidth: '100%' }}>
                <Text style={{ color: '#ffffff', fontSize: 40, fontWeight: 'bold', textAlign: 'center' }}>
                    SHRING SHOOTER
                </Text>
                <Space size="xs" />
                <Text style={{ color: '#ddd7e8', fontSize: 13, textAlign: 'center' }}>
                    Survive Outbreak together, or create a classic PvP room with friends.
                </Text>
                <Space size="xxs" />
            </View>
        </>
    );
}
`);

await write('packages/client/src/screens/Home/components/Footer.tsx', `import React from 'react';
import { version } from '../../../../../../package.json';
import { Inline, View } from '../../../components';
import { Text } from '../../../components/Text';
import { GitHubIcon } from '../../../icons';

const URL = 'https://github.com/Atchbo2001/shootup';

export function Footer(): React.ReactElement {
    return (
        <a href={URL} target="_blank" rel="noopener noreferrer">
            <View flex center style={{ color: 'white', fontSize: 14 }}>
                <GitHubIcon />
                <Inline size="xxs" />
                <Text>Source & license (v{version})</Text>
            </View>
        </a>
    );
}
`);

await replace('packages/client/public/index.html', text => text
    .replaceAll('<title>TOSIOS</title>', '<title>Shring Shooter</title>')
    .replaceAll('The Open-Source IO Shooter is an open-source multiplayer game in the browser.', 'Cooperative Outbreak waves and fast browser multiplayer hosted by the Shring Network.')
    .replaceAll('https://tosios.online/', 'https://shootup.shring.net/')
    .replaceAll('https://tosios.online/banner.jpg', 'https://shootup.shring.net/banner.jpg')
    .replaceAll('content="TOSIOS"', 'content="Shring Shooter"'));

await replace('packages/client/public/manifest.json', text => {
    const manifest = JSON.parse(text);
    manifest.short_name = 'Shring Shooter';
    manifest.name = 'Shring Shooter';
    manifest.description = 'Cooperative Outbreak waves and browser multiplayer.';
    manifest.start_url = '/';
    return `${JSON.stringify(manifest, null, 4)}\n`;
});

await write('packages/server/src/index.ts', `import { Constants } from '@tosios/common';
import { Server } from 'colyseus';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { join } from 'path';
import { GameRoom } from './rooms/GameRoom';

const VERSION = '${VERSION}';
const PORT = Number(process.env.PORT || process.env.SERVER_PORT || Constants.WS_PORT);
const HOST = process.env.SERVER_HOST || '0.0.0.0';
const PUBLIC_DIR = join(__dirname, '../../client/public');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(compression());

const httpServer = createServer(app);
const server = new Server({ server: httpServer, express: app });
server.define(Constants.ROOM_NAME, GameRoom);

app.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
        ok: true,
        service: 'shring-shooter',
        version: VERSION,
        upstream: 'TOSIOS',
        guestPlay: true,
        outbreak: true,
        uptimeSeconds: Math.floor(process.uptime()),
    });
});

app.get('/api/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
        ok: true,
        version: VERSION,
        roomName: Constants.ROOM_NAME,
        maps: Constants.MAPS_NAMES,
        modes: Constants.GAME_MODES,
        maxPlayersPerRoom: Constants.ROOM_PLAYERS_MAX,
        features: [
            'outbreak-waves',
            'boss-waves',
            'revives',
            'drops',
            'private-rooms',
            'hit-markers',
        ],
    });
});

app.use(express.static(PUBLIC_DIR, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (_req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));

server.onShutdown(() => console.log('[Shring Shooter] Shutting down'));

server.listen(PORT, HOST);
console.log('[Shring Shooter] v' + VERSION + ' listening on http://' + HOST + ':' + PORT);
console.log('[Shring Shooter] Outbreak co-op, private rooms, and classic PvP enabled');
`);

await write('SHRING-MODIFICATIONS.md', `# Shring Shooter modifications\n\nThis project is a modified deployment of TOSIOS.\n\n- Upstream: https://github.com/halftheopposite/TOSIOS\n- Pinned upstream commit: ${UPSTREAM}\n- Upstream license: MIT\n- Shring release: ${VERSION}\n- Public URL: https://shootup.shring.net\n\nVersion 3.1.0 adds a server-authoritative Outbreak mode with solo/co-op waves, enemy classes, boss waves, scoring, drops, downing, teammate revives, private rooms, hit markers, and an expanded HUD. Existing deathmatch and team deathmatch remain available. The build also includes Shring branding, same-origin secure WebSocket deployment, Pterodactyl port handling, health/status endpoints, and production packaging.\n`);

console.log(`[patch] Applied Shring Shooter ${VERSION} patches to ${root}`);
