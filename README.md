# Shring Outbreak

Shring Outbreak is the Shring Network deployment of the open-source Suroi browser shooter.

This repository contains the reproducible production build pipeline, Shring-specific source patches, runtime gateway, Pterodactyl startup files, and GitHub Actions workflow used to create a precompiled flat ZIP.

## Deployment target

- Public URL: `https://shootup.shring.net`
- Pterodactyl allocation: `192.168.1.65:31025`
- Egg: Node.js 22
- Startup command: `bash ./start.sh`
- Account required: no

The Pterodactyl server does not compile the game. GitHub Actions performs the memory-intensive sprite and Vite build, smoke-tests the packaged runtime, and publishes the ready-to-extract artifact.

## Build provenance

- Upstream: `HasangerGames/suroi`
- Pinned upstream commit: `85df5067b19a876cac4304232cc1e68ff1b07c7f`
- License: GNU GPL version 3

The generated deployment ZIP includes the complete modified source and upstream license notices.

## Current scope

This release provides the stable Suroi multiplayer battle-royale base under Shring branding with guest play. Zombie waves, vehicles, construction, and persistent progression are not claimed as implemented yet.
