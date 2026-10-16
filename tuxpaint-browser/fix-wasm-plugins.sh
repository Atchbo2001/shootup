#!/bin/sh
set -eu

# Upstream Tux Paint loads its Magic tools as separate shared libraries.
# WebAssembly statically links them, so their non-API globals must be unique.
python3 - <<'PY'
from pathlib import Path
p = Path("wasm/build.sh")
src = p.read_text()
marker = "# Phase 4: Prepare data assets for preloading"
assert marker in src, "Upstream WASM build layout changed"
patch = r'''
echo ""
echo "--- Phase 3b: Isolate Magic plugin global state for static WASM linking ---"
LLVM_NM="$(command -v llvm-nm || true)"
if [ -z "$LLVM_NM" ]; then
  for version in 21 20 19 18 17 16 15 14; do
    if command -v "llvm-nm-$version" >/dev/null 2>&1; then
      LLVM_NM="$(command -v "llvm-nm-$version")"
      break
    fi
  done
fi
if [ -z "$LLVM_NM" ]; then
  echo "No LLVM symbol inspector installed; installing LLVM 19..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq llvm-19
  LLVM_NM="$(command -v llvm-nm-19)"
fi
echo "Symbol inspector: $LLVM_NM"
for name in "${MAGIC_SOURCES[@]}"; do
  obj="${BUILDDIR}/obj/magic/${name}.o"
  mapfile -t exported_data < <(
    "$LLVM_NM" -g --defined-only --format=posix "${obj}" |
    awk '$2 ~ /^[BCDGRSV]$/ {print $1}'
  )
  if ((${#exported_data[@]})); then
    rename_flags=()
    for sym in "${exported_data[@]}"; do
      case "${sym}" in
        "${name}_"*) continue ;;
      esac
      rename_flags+=("-D${sym}=tuxwasmprivate_${name}_${sym}")
    done
    if ((${#rename_flags[@]})); then
      echo "  Namespacing ${name} (${#rename_flags[@]} globals)"
      emcc "${COMMON_FLAGS[@]}" \
        -I"${SRCDIR}/src" -include float.h \
        -Dsnd_effects=${name}_snd_effects \
        -Duse_sound=${name}_use_sound \
        "${rename_flags[@]}" \
        -c "${SRCDIR}/magic/src/${name}.c" \
        -o "${obj}"
    fi
  fi
done
'''
src = src.replace(marker, patch + "\n" + marker, 1)
# Add a main bridge if SDL2 exposes SDL_main rather than main.
entry_marker = '# Phase 5: Linking'
assert entry_marker in src, "Could not find WASM link stage"
entry_block = r'''
echo ""
echo "--- Phase 4b: Verify and bridge native C entrypoint ---"
echo "Tux Paint translation unit entrypoint symbols:"
"$LLVM_NM" --defined-only --format=posix "$BUILDDIR/obj/tuxpaint.o" |
  grep -E '(^|[[:space:]])(main|SDL_main|tuxpaint_main)([[:space:]]|$)' || true
if "$LLVM_NM" --defined-only --format=posix "$BUILDDIR/obj/tuxpaint.o" | grep -qE '^main[[:space:]]'; then
  echo "Original native main() is present"
elif "$LLVM_NM" --defined-only --format=posix "$BUILDDIR/obj/tuxpaint.o" | grep -qE '^SDL_main[[:space:]]'; then
  echo "Original SDL_main() exists; adding compatible main bridge"
  cat > "$BUILDDIR/tuxpaint-main-bridge.c" <<'WRAPPER'
extern int SDL_main(int argc, char **argv);
int main(int argc, char **argv) { return SDL_main(argc, argv); }
WRAPPER
  emcc "${COMMON_FLAGS[@]}" -c "$BUILDDIR/tuxpaint-main-bridge.c" -o "$BUILDDIR/obj/tuxpaint-main-bridge.o"
else
  echo "ERROR: Tux Paint compiled object exports neither main nor SDL_main"
  "$LLVM_NM" --defined-only --format=posix "$BUILDDIR/obj/tuxpaint.o" | head -60
  exit 1
fi
'''
src=src.replace(entry_marker,entry_block+'\n'+entry_marker,1)

# Emscripten 4 does not automatically retain the original C entry point
# when linking this explicit list of .o files. The original build silently
# optimized out the entire Tux Paint application into a 9 KB WASM stub.
link_marker = '  -sASYNCIFY'
assert link_marker in src, "WASM linker argument section changed"
src = src.replace(link_marker, '  -sEXPORTED_FUNCTIONS=\'["_main","_malloc","_free"]\' \\\n  -sINVOKE_RUN=1 \\\n  -sASYNCIFY', 1)
# SDL2 headers redefine main() as SDL_main() unless SDL_MAIN_HANDLED is set.
# The original Emscripten build therefore had SDL_main but no C main, so
# Emscripten silently emitted a dead 9 KB WASM instead of launching the app.
sdl_marker = '  -sUSE_SDL=2'
assert sdl_marker in src, "SDL compile flags changed"
src = src.replace(sdl_marker, '  -DSDL_MAIN_HANDLED\n  -sUSE_SDL=2', 1)
p.write_text(src)
PY
