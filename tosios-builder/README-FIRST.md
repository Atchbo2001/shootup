# Shring Shooter: Arsenal v3.2.0 — Pterodactyl package

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

## Arsenal milestone

- Sidearm: balanced starter weapon
- SMG: high rate of fire and large magazine
- Rifle: high damage, velocity, and range
- Scattergun: seven-pellet close-range blast
- server-authoritative damage, ammunition, rate of fire, range, and reload timing
- magazines and reserve ammunition
- manual reload with `R` and automatic reload on an empty magazine
- mobile reload control
- weapon pickups and ammunition crates
- starting armory in Outbreak and map armories in classic PvP
- weapon and ammo drops from enemies
- weapon plus ammo reward between cleared waves
- weapon-colored projectiles and a dedicated weapon/ammo/reload HUD
- improved synchronization for recycled remote projectiles

## Existing gameplay

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

Persistent accounts, XP, unlocks, attachments, and additional maps remain later roadmap milestones.
