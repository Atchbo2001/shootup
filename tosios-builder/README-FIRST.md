# Shring Shooter: Smooth Movement v3.3.0 — Pterodactyl package

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

## Smooth Movement milestone

- fixed 60 Hz movement simulation on the browser client and authoritative server
- consistent movement speed at 20, 30, 60, 90, 120, 144, and 240 FPS
- 30 Hz authoritative server snapshots
- frame-rate-independent interpolation for remote players and enemies
- movement-only acknowledgement sequencing; rotation updates no longer overwrite movement acknowledgements
- bounded input replay and cleanup of acknowledged or stale commands
- small network corrections blended smoothly instead of immediately snapping the local player
- hard correction preserved for respawns, teleports, and large position errors
- large remote teleports still snap immediately instead of sliding across the map

## Existing Arsenal and gameplay

- sidearm, SMG, rifle, and scattergun
- server-authoritative ammunition, damage, range, firing rate, and reload timing
- weapon pickups, ammunition crates, armories, enemy drops, and wave rewards
- solo and cooperative Outbreak rooms
- escalating waves, four enemy classes, and boss rounds
- health and rapid-fire drops
- downing, bleed-out, and teammate revives
- private unlisted rooms with shareable URLs
- deathmatch and team deathmatch
- desktop and mobile controls

## Verify

```bash
curl -fsS http://192.168.1.65:31025/health
curl -fsS https://shootup.shring.net/health
```

The health response for this package reports version `3.3.0`, `smoothMovement: true`, `simulationHz: 60`, and `snapshotHz: 30`.

Purpose-built maps and encounter layouts are the next roadmap milestone.
