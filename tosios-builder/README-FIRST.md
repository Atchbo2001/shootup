# Shring Shooter v3.0.0 — Pterodactyl package

This package is a Shring-branded build of the MIT-licensed TOSIOS browser multiplayer shooter.

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

No install or build command should run on Pterodactyl. The browser client and Node server are already compiled and production dependencies are included.

## Verify

```bash
curl -fsS http://192.168.1.65:31025/health
curl -fsS https://shootup.shring.net/health
```

## Gameplay in this release

This release intentionally keeps TOSIOS gameplay intact:

- public room browser
- private room creation by sharing the room link
- deathmatch and team deathmatch
- small and gigantic maps
- desktop and mobile controls
- server-authoritative movement, bullets, monsters, health potions, lobby, and match state

It is not presented as a zombie or co-op conversion. Those changes require separate gameplay work after this stable base is deployed and tested.
