# Shring Shooter

Shring Shooter is the Shring Network deployment of the MIT-licensed TOSIOS browser multiplayer shooter.

This repository contains the reproducible source overlays, validation suite, Pterodactyl startup files, and GitHub Actions workflow used to build a precompiled flat deployment ZIP.

## Deployment target

- Public URL: `https://shootup.shring.net`
- Pterodactyl allocation: `192.168.1.65:31025`
- Egg/image: Node.js 22
- Startup command: `bash ./start.sh`
- Account required: no

Pterodactyl does not compile the game. GitHub Actions downloads the pinned upstream source, verifies and applies every Shring overlay, compiles the browser and server bundles, runs multiplayer smoke tests, validates the exact packaged runtime, and publishes the ready-to-extract artifact.

## Build provenance

- Upstream: `halftheopposite/TOSIOS`
- Pinned upstream commit: `98de136e524d25c5877adc9523c9445bc2b4a262`
- Upstream license: MIT
- Current Shring release candidate: `3.4.0`

The generated deployment ZIP includes the complete modified source and upstream license.

## Current scope

Version 3.4.0 includes all previous Smooth Movement, Arsenal, and Outbreak gameplay plus the Hunter AI milestone:

- global Outbreak awareness across small and gigantic maps
- nearest-living-player target selection with stable retargeting
- tile-grid A* routes around collision walls
- path replanning as players move or routes become stale
- direct pursuit when line of sight opens
- stuck detection, forced rerouting, and recovery steering
- reachable multi-lane wave spawning around the player group
- fixed 60 Hz local and server movement simulation
- 30 Hz authoritative server snapshots and smooth network correction
- solo and cooperative Outbreak wave survival
- boss rounds, drops, downing, bleed-out, and teammate revives
- private unlisted rooms with shareable room URLs
- deathmatch and team deathmatch
- sidearm, SMG, rifle, and scattergun
- server-authoritative ammunition, firing, damage, range, and timed reloads
- weapon pickups, ammunition crates, armories, enemy drops, and wave rewards

The next roadmap milestone is purpose-built Outbreak maps and encounter layouts. Attachments, expanded enemies and bosses, and persistent Shring accounts remain later milestones.
