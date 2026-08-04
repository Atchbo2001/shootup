# Smooth Movement v3.3.0 verification gates

This branch must not be promoted unless GitHub Actions verifies all of the following:

- every source overlay reconstructs to its recorded SHA-256 checksum
- 10 seconds of simulated movement produces exactly 600 fixed steps at 20, 30, 60, 90, 120, 144, and 240 FPS
- the client and authoritative server compile from the pinned TOSIOS source under Node.js 22
- the server runs at 60 Hz and publishes authoritative state at 30 Hz
- movement updates change position and produce monotonic movement acknowledgements
- later rotation timestamps do not overwrite movement acknowledgements
- two connected clients converge on the same authoritative position after a movement burst
- Outbreak, Arsenal firing and reloads, private-room hiding, and public classic PvP remain functional
- the exact packaged Pterodactyl runtime starts and reports v3.3.0 movement health fields
- the flat deployment ZIP passes archive and SHA-256 integrity checks
