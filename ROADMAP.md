# Shring Shooter roadmap

## Completed

- v3.0.0 — stable TOSIOS multiplayer foundation
- v3.1.0 — cooperative Outbreak waves, boss rounds, drops, revives, private rooms, and combat HUD
- v3.2.0 — sidearm, SMG, rifle, scattergun, magazines, reserve ammunition, authoritative reloads, pickups, ammo crates, armories, and wave rewards
- v3.3.0 — Smooth Movement: fixed 60 Hz simulation, 30 Hz snapshots, refresh-rate-independent interpolation, movement-only acknowledgements, bounded replay, and soft network correction
- v3.4.0 — Hunter AI: global Outbreak awareness, nearest-player targeting, tile-grid A* routing, dynamic replanning, stuck recovery, reachable spawn lanes, and gigantic-map pursuit testing
- v3.5.0 — Siege Maps: Outbreak Citadel, Ashen Catacombs, named encounter zones, authored cooperative starts, fixed armories, multi-front spawn gates, holdout reward points, boss arenas, topology validation, and two-client runtime tests in both maps
- v3.5.1 — Network Hardening: validated gameplay packets, malformed and non-finite input rejection, safe room defaults, label sanitization, per-client action-rate limiting, defensive queue validation, and hostile-packet package testing

## Release verification standard

Every release candidate must pass checksum verification for every source overlay, production compilation under Node.js 22, map and movement checks, multiplayer gameplay regressions, exact packaged-runtime startup, hostile-packet survival, and final ZIP integrity validation before promotion.

## Planned after Network Hardening

- broader enemy and boss variety with clearer battlefield roles, attacks, silhouettes, and encounter behavior
- weapon attachments and deeper weapon balance
- stronger wave modifiers, special rounds, and map-specific events
- persistent Shring accounts, XP, unlocks, statistics, and leaderboards
