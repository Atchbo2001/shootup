# Shring Shooter: Siege Maps v3.5.0 — Pterodactyl package

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

## Siege Maps milestone

### Outbreak Citadel

- central Citadel Courtyard cooperative start
- Throne Hall Siege and two Armory Breach encounters
- Southern Forge Holdout
- looping flank corridors and multiple attack fronts
- Royal Guard boss arena

### Ashen Catacombs

- central Ossuary cooperative start
- northwest, northeast, southwest, and southeast crypt encounters
- looping corridors and alternate retreat routes
- fixed opening armory
- Bone Colossus boss arena

### Encounter systems

- the active encounter name is synchronized to every client and displayed in the Outbreak HUD
- team starts and opening armories are authored per map
- waves use map-authored spawn gates instead of arbitrary positions
- rewards are delivered to the active holdout reward point
- map topology, boss clearance, spawn coverage, and two-player pursuit are release gates

## Existing gameplay

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

The health response for this package reports version `3.5.0`, `siegeMaps: true`, `namedEncounterZones: true`, `hunterAI: true`, and `smoothMovement: true`.

The next roadmap milestone expands enemy and boss variety with stronger combat roles and map-specific encounter behavior.
