# Shring Tux Paint (original WebAssembly port)

This deployment runs the original Tux Paint 0.9.35 program compiled to WebAssembly, not a visual copy. It is based on https://github.com/hefi46/tuxpaint-web at commit 635f6a86f0085066f5c513fdc1224388b5bebd96, which contains the original Tux Paint source and graphics/sounds. Tux Paint is licensed under the GNU GPL v2; see https://tuxpaint.org/download/source/ and the upstream COPYING.txt. Retain all original copyright/licensing credits.

Build: .github/workflows/build-tuxpaint-browser.yml builds the upstream WASM port, smoke-tests it, publishes a public GitHub release containing a flat Pterodactyl package and its SHA256.

Deploy: upload/extract the release artifact to /home/container on the existing Shring Shootup Pterodactyl server, preserving its existing Pterodactyl backups. Startup command: sh ./start.sh, Docker image: Node 22. The server serves the compiled program and its original assets on SERVER_PORT, default 31025. /health returns a runtime artifact existence check.

Collaboration: intentionally not enabled; each visitor gets their own native-in-browser drawing session. Shared realtime editing would require adapting engine state/drawing commands, not simply sharing images. Save/open persistence requires IDBFS integration and validation; don't claim it until tested.
