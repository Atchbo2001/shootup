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
- Current Shring release candidate: `3.3.0`

The generated deployment ZIP includes the complete modified source and upstream license.

## Current scope

Version 3.3.0 includes all previous Arsenal and Outbreak gameplay plus the Smooth Movement milestone:

- fixed 60 Hz local and server movement simulation independent of monitor refresh rate
- 30 Hz authoritative server snapshots
- frame-rate-independent interpolation for remote players and enemies
- movement-only acknowledgement sequencing so aim updates cannot corrupt reconciliation
- bounded input replay and stale-command cleanup
- soft blending for normal network corrections
- hard position snaps reserved for respawns, teleports, and large errors
- solo and cooperative Outbreak wave survival
- boss rounds, drops, downing, bleed-out, and teammate revives
- private unlisted rooms with shareable room URLs
- deathmatch and team deathmatch
- sidearm, SMG, rifle, and scattergun
- server-authoritative ammunition, firing, damage, range, and timed reloads
- weapon pickups, ammunition crates, starting armories, enemy drops, and wave rewards
- desktop and mobile weapon/ammo/reload HUD

Purpose-built maps and encounter layouts are the next roadmap milestone. Persistent accounts, XP, unlocks, attachments, and expanded enemies remain later milestones.
