# Shring Shooter: Hunter AI v3.4.0 — Pterodactyl package

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

## Hunter AI milestone

- Outbreak enemies acquire players across the entire map instead of waiting for close-range sight
- enemies select the nearest living player and change targets only when another player is meaningfully closer
- tile-grid A* pathfinding routes enemies around walls on the gigantic map
- routes are recalculated as players move and when a path becomes stale
- enemies switch back to direct pursuit when line of sight opens
- stalled enemies force a new path and use recovery steering instead of remaining pinned to a wall
- wave enemies spawn through reachable lanes around the player group rather than arbitrary unreachable locations
- gigantic-map multiplayer pursuit is part of the release gate

## Existing gameplay

- fixed 60 Hz movement simulation and 30 Hz authoritative snapshots
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

The health response for this package reports version `3.4.0`, `hunterAI: true`, `globalOutbreakAggro: true`, `gridPathfinding: true`, and `encounterDirector: true`.

The next roadmap milestone is purpose-built Outbreak maps and encounter layouts.
