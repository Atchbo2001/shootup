import fs from 'node:fs/promises';
import path from 'node:path';

const [sourceArg] = process.argv.slice(2);
if (!sourceArg) throw new Error('Usage: node apply-patches.mjs <tosios-source>');

const root = path.resolve(sourceArg);
const VERSION = '3.0.0';
const UPSTREAM = '98de136e524d25c5877adc9523c9445bc2b4a262';

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

await replace('package.json', text => {
  const pkg = JSON.parse(text);
  pkg.name = 'shring-shooter';
  pkg.version = VERSION;
  pkg.description = 'Shring-hosted build of the MIT-licensed TOSIOS browser shooter.';
  return `${JSON.stringify(pkg, null, 4)}\n`;
});

await replace('packages/common/src/constants.ts', text => text
  .replace("export const APP_TITLE = 'TOSIOS';", "export const APP_TITLE = 'Shring Shooter';")
  .replace('export const WS_PORT = 3001;', 'export const WS_PORT = 31025;'));

await write('packages/client/src/screens/Home/components/Header.tsx', `import { Constants } from '@tosios/common';
import React from 'react';
import { Helmet } from 'react-helmet';
import { Space, Text, View } from '../../../components';

export function Header(): React.ReactElement {
    return (
        <>
            <Helmet>
                <title>{\`${'${Constants.APP_TITLE}'} - Home\`}</title>
                <meta name="description" content="A fast browser multiplayer shooter hosted by the Shring Network." />
            </Helmet>
            <View flex center column style={{ width: 700, maxWidth: '100%' }}>
                <Text style={{ color: '#ffffff', fontSize: 40, fontWeight: 'bold', textAlign: 'center' }}>
                    SHRING SHOOTER
                </Text>
                <Space size="xs" />
                <Text style={{ color: '#ddd7e8', fontSize: 13, textAlign: 'center' }}>
                    Create a room, share it with friends, and play directly in your browser.
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
  .replaceAll('The Open-Source IO Shooter is an open-source multiplayer game in the browser.', 'A fast browser multiplayer shooter hosted by the Shring Network.')
  .replaceAll('https://tosios.online/', 'https://shootup.shring.net/')
  .replaceAll('https://tosios.online/banner.jpg', 'https://shootup.shring.net/banner.jpg')
  .replaceAll('content="TOSIOS"', 'content="Shring Shooter"'));

await replace('packages/client/public/manifest.json', text => {
  const manifest = JSON.parse(text);
  manifest.short_name = 'Shring Shooter';
  manifest.name = 'Shring Shooter';
  manifest.description = 'Browser multiplayer shooter hosted by the Shring Network.';
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
    });
});

app.use(express.static(PUBLIC_DIR, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));
app.get('*', (_req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));

server.onShutdown(() => console.log('[Shring Shooter] Shutting down'));

server.listen(PORT, HOST);
console.log(\`[Shring Shooter] v${VERSION} listening on http://${HOST}:${PORT}\`);
console.log('[Shring Shooter] Guest rooms enabled; no account required');
`);

await write('SHRING-MODIFICATIONS.md', `# Shring Shooter modifications\n\nThis project is a modified deployment of TOSIOS.\n\n- Upstream: https://github.com/halftheopposite/TOSIOS\n- Pinned upstream commit: ${UPSTREAM}\n- Upstream license: MIT\n- Shring release: ${VERSION}\n- Public URL: https://shootup.shring.net\n\nChanges include Shring branding, same-origin secure WebSocket deployment, Pterodactyl port handling, health/status endpoints, removal of the public Colyseus monitor, and production packaging. Gameplay remains TOSIOS deathmatch/team-deathmatch in this release.\n`);

console.log(`[patch] Applied Shring Shooter ${VERSION} patches to ${root}`);
