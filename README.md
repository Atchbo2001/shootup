# Shring Shooter

Shring Shooter is the Shring Network deployment of the MIT-licensed TOSIOS browser multiplayer shooter.

This repository contains the reproducible source overlay, validation suite, Pterodactyl startup files, and GitHub Actions workflow used to build a precompiled flat deployment ZIP.

## Deployment target

- Public URL: `https://shootup.shring.net`
- Pterodactyl allocation: `192.168.1.65:31025`
- Egg/image: Node.js 22
- Startup command: `bash ./start.sh`
- Account required: no

Pterodactyl does not compile the game. GitHub Actions downloads the pinned upstream source, verifies and applies the Shring overlay, compiles the browser and server bundles, runs multiplayer smoke tests, validates the exact packaged runtime, and publishes the ready-to-extract artifact.

## Build provenance

- Upstream: `halftheopposite/TOSIOS`
- Pinned upstream commit: `98de136e524d25c5877adc9523c9445bc2b4a262`
- Upstream license: MIT
- Current Shring release: `3.2.0`

The generated deployment ZIP includes the complete modified source and upstream license.

## Current scope

Version 3.2.0 includes:

- solo and cooperative Outbreak wave survival
- boss rounds, drops, downing, bleed-out, and teammate revives
- private unlisted rooms with shareable room URLs
- deathmatch and team deathmatch
- sidearm, SMG, rifle, and scattergun
- server-authoritative ammunition, fire rate, damage, range, and timed reloads
- weapon pickups, ammunition crates, starting armories, enemy drops, and wave rewards
- desktop and mobile weapon/ammo/reload HUD

Persistent accounts, XP, unlocks, attachments, and additional maps remain later roadmap milestones.
