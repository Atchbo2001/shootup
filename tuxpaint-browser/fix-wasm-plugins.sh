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
for name in "${MAGIC_SOURCES[@]}"; do
  obj="${BUILDDIR}/obj/magic/${name}.o"
  mapfile -t exported_data < <(
    llvm-nm -g --defined-only --format=posix "${obj}" |
    awk '$2 ~ /^[BCDGRSV]$/ {print $1}'
  )
  if ((${#exported_data[@]})); then
    rename_flags=()
    for sym in "${exported_data[@]}"; do
      case "${sym}" in
        "${name}_"*) continue ;;
      esac
      rename_flags+=("-D${sym}=${name}_${sym}")
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
p.write_text(src)
PY
