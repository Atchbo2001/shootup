# Shring Shooter

Shring Shooter is the Shring Network deployment of the MIT-licensed TOSIOS browser multiplayer shooter.

This repository contains the reproducible source overlays, validation suite, Pterodactyl startup files, and GitHub Actions workflow used to build a precompiled flat deployment ZIP.

## Deployment target

- Public URL: `https://shootup.shring.net`
- Pterodactyl allocation: `192.168.1.65:31025`
- Egg/image: Node.js 22
- Startup command: `bash ./start.sh`
- Account required: no

Pterodactyl does not compile the game. GitHub Actions reconstructs every checksum-pinned Shring overlay, compiles the browser and server bundles, validates map topology, runs multiplayer gameplay tests, starts the exact packaged runtime, and publishes the ready-to-extract artifact.

## Build provenance

- Upstream: `halftheopposite/TOSIOS`
- Pinned upstream commit: `98de136e524d25c5877adc9523c9445bc2b4a262`
- Upstream license: MIT
- Current Shring release candidate: `3.5.0`

The generated deployment ZIP includes the complete modified source and upstream license.

## Current scope

Version 3.5.0 adds the Siege Maps milestone:

- **Outbreak Citadel** with a central courtyard, throne hall, armory breaches, forge holdout, looping flanks, and Royal Guard boss arena
- **Ashen Catacombs** with a central ossuary, four crypt wings, alternate loops, and Bone Colossus boss arena
- named encounter zones synchronized to every player
- authored cooperative starting positions and fixed opening armories
- map-authored enemy gates that attack from multiple fronts
- wave rewards delivered at the active holdout
- boss-compatible routes and two-player runtime verification in both maps
- friendly map names and encounter names in the browser and in-game HUD

It also retains Hunter AI pathfinding, fixed-step Smooth Movement, the four-weapon Arsenal, cooperative Outbreak waves, revives, private rooms, Deathmatch, and Team Deathmatch.

The next roadmap milestone expands enemy and boss variety with clearer combat roles and stronger encounter identity.
