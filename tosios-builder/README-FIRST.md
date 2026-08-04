# Shring Shooter: Network Hardening v3.5.1 — Pterodactyl package

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

## v3.5.1 hotfix

- validates every move, rotate, shoot, reload, and revive packet before simulation
- rejects missing, malformed, non-finite, zero-length, and oversized action values
- normalizes valid angles before applying them
- limits each client to a safe gameplay action rate
- sanitizes player and room labels
- safely defaults invalid room sizes to four players
- adds defense-in-depth checks inside the simulation queue
- includes a hostile-packet regression test against the exact packaged runtime

## Included gameplay

- Outbreak Citadel and Ashen Catacombs with authored starts, armories, holdouts, spawn gates, named zones, and boss arenas
- global Hunter AI awareness, nearest-player targeting, A* routing, dynamic replanning, and stuck recovery
- fixed 60 Hz movement simulation and 30 Hz authoritative snapshots
- sidearm, SMG, rifle, and scattergun
- server-authoritative ammunition, damage, range, firing rate, and reload timing
- cooperative Outbreak waves, boss rounds, drops, downing, bleed-out, and teammate revives
- private unlisted rooms with shareable URLs
- deathmatch and team deathmatch
- desktop and mobile controls

## Verify

```bash
curl -fsS http://192.168.1.65:31025/health
curl -fsS https://shootup.shring.net/health
```

The health response reports version `3.5.1`, `inputHardening: true`, `siegeMaps: true`, `namedEncounterZones: true`, `hunterAI: true`, and `smoothMovement: true`.

The next gameplay milestone expands enemy and boss variety with stronger combat roles and map-specific encounter behavior.
