# Shring Shooter: Outbreak v3.1.0 — Pterodactyl package

This package is a Shring-modified build of the MIT-licensed TOSIOS browser multiplayer shooter.

## Deployment target

- Public URL: `https://shootup.shring.net`
- Pterodactyl allocation: `192.168.1.65:31025`
- Egg/image: Node.js 22
- Startup command: `bash ./start.sh`
- Account required: no
- Existing nginx/WebSocket proxy and TLS certificate: unchanged

## Install

1. Stop the Pterodactyl server.
2. Remove the previous game files.
3. Extract the flat ZIP directly into `/home/container`.
4. Set startup to `bash ./start.sh`.
5. Start the server.

Do not run an install or build command on Pterodactyl. The browser client and Node server are already compiled and production dependencies are included.

## Verify

```bash
curl -fsS http://192.168.1.65:31025/health
curl -fsS https://shootup.shring.net/health
```

## Outbreak mode

- one-player solo or cooperative rooms
- server-authoritative escalating waves
- grunt, runner, tank, and boss enemies
- boss wave every five rounds
- no player-versus-player damage in Outbreak
- points for damage and kills
- health and temporary rapid-fire drops
- downed players, 15-second bleed-out, and teammate revives
- press `E` near a downed teammate to revive; mobile players receive a revive button
- wave, enemy, boss, score, revive, power-up, and bleed-out HUD information
- hit markers and Outbreak announcements
- endless progression until the squad is eliminated

## Rooms and classic modes

- public room browser
- optional private unlisted rooms joined through the shared room URL
- deathmatch and team deathmatch remain available
- small and gigantic maps
- desktop and mobile controls
- up to 16 players depending on room settings

This is the first major Outbreak milestone. It does not yet include the later roadmap's full weapon arsenal, attachments, additional maps, persistent accounts, or progression system.
