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
entry_marker = '# Phase 5: Link everything together'
assert entry_marker in src, "Could not find WASM link stage"
entry_block = r'''
echo ""
echo "--- Phase 4b: Bridge original Tux Paint startup into Emscripten main() ---"
echo "Original startup symbol:"
"$LLVM_NM" -g --defined-only --format=posix "$BUILDDIR/obj/tuxpaint.o" |
  grep -E 'tuxpaint_web_main|SDL_main|main' || true
cat > "$BUILDDIR/tuxpaint-main-bridge.c" <<'WRAPPER'
extern int tuxpaint_web_main(int argc, char **argv);
int main(int argc, char **argv) {
  return tuxpaint_web_main(argc, argv);
}
WRAPPER
emcc -O2 -DSDL_MAIN_HANDLED -c "$BUILDDIR/tuxpaint-main-bridge.c" -o "$BUILDDIR/obj/tuxpaint-main-bridge.o"
echo "Compiled explicit main() bridge."

echo "--- Phase 4c: Generate original Tux Paint gperf configuration parser ---"
if ! command -v gperf >/dev/null 2>&1; then
  echo "Installing gperf to generate original settings parser"
  sudo apt-get update -qq
  sudo apt-get install -y -qq gperf
fi
gperf "$SRCDIR/src/parse.gperf" > "$BUILDDIR/obj/parse_step1.c"
sed -e 's/^const struct/static const struct/' -e 's/_GNU/_TUX/' "$BUILDDIR/obj/parse_step1.c" > "$BUILDDIR/obj/parse.c"
emcc "${COMMON_FLAGS[@]}" -c "$BUILDDIR/obj/parse.c" -o "$BUILDDIR/obj/parse.o"
echo "Original gperf command-line parser compiled"

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
# The upstream build hides real compiler failures behind '| head -50' pipes:
# shells without pipefail see head exit 0 while tuxpaint.o never exists.
# Do not discard or truncate C compiler output; surface the first root error.
src = src.replace('set -e\n', 'set -euo pipefail\n', 1)
src = src.replace('2>&1 | head -50', '2>&1')
src = src.replace('2>&1 | head -20', '2>&1')
# Supply the missing font-config, Pango and FriBidi compatibility declarations
# before compiling the full native Tux Paint source. The upstream scaffold
# lacked these includes and definitions, which were hidden by the head pipe.
tux = Path("src/tuxpaint.c")
tux_src = tux.read_text()
bad_include = '#include "wasm/magic_static_registry.h"'
assert bad_include in tux_src, "Tux Paint magic header include changed"
tux_src = tux_src.replace(bad_include, '#include "magic_static_registry.h"')
tux_src = '#ifdef __EMSCRIPTEN__\n#include <fontconfig/fontconfig.h>\n#endif\n' + tux_src
tux.write_text(tux_src)

pango = Path("wasm/stubs/pango/pango.h")
pango_src = pango.read_text()
pango_end = '#endif /* __PANGO_H__ */'
assert pango_end in pango_src, "Pango stub include guard changed"
pango_src = pango_src.replace(pango_end, '''
static inline const char *pango_font_family_get_name(const PangoFontFamily *family)
{
  (void)family;
  return "Sans";
}
''' + pango_end)
pango.write_text(pango_src)

fribidi = Path("wasm/stubs/fribidi/fribidi.h")
fribidi_src = fribidi.read_text()
bidi_marker = '#define FRIBIDI_TYPE_LTR 0x0010'
assert bidi_marker in fribidi_src, "FriBidi stub type changed"
fribidi_src = fribidi_src.replace(bidi_marker, bidi_marker + '\n#define FRIBIDI_TYPE_WL FRIBIDI_TYPE_LTR', 1)
fribidi.write_text(fribidi_src)
# Scope the WebAssembly static Magic registry separately from the disabled
# desktop dlopen() path: both declare common locals in the upstream scaffold.
start_magic = 'static void load_magic_plugins(void)\n{\n#ifdef __EMSCRIPTEN__\n'
end_magic = '  goto magic_plugins_loaded;\n#endif /* __EMSCRIPTEN__ */'
assert start_magic in tux_src and end_magic in tux_src, "Magic static initialization changed"
tux_src = tux_src.replace(start_magic, start_magic + '  {\n', 1)
tux_src = tux_src.replace(end_magic, '  goto magic_plugins_loaded;\n  }\n#endif /* __EMSCRIPTEN__ */', 1)

# Native libpaper does not exist in browser builds; its help enumerator is
# not needed and the actual callers are gated on PAPER_H.
paper_section = '#if !defined(WIN32) && !defined(__APPLE__) && !defined(__BEOS__) && !defined(__HAIKU__) && !defined(__ANDROID__)\n/**\n * FIXME\n */\nstatic void show_available_papersizes'
assert paper_section in tux_src, "Libpaper help section changed"
tux_src = tux_src.replace(paper_section,
  '#if !defined(WIN32) && !defined(__APPLE__) && !defined(__BEOS__) && !defined(__HAIKU__) && !defined(__ANDROID__) && !defined(__EMSCRIPTEN__)\n/**\n * FIXME\n */\nstatic void show_available_papersizes',1)
# Explicitly avoid SDL2 preprocessor rewriting main() and make startup
# a unique exported native symbol for the separate link bridge.
main_signature = 'int main(int argc, char *argv[])'
assert tux_src.count(main_signature) == 1, "Expected exactly one Tux Paint startup function"
tux_src = tux_src.replace(main_signature, 'int tuxpaint_web_main(int argc, char *argv[])', 1)
# Browsers without shared-memory PThreads cannot create SDL worker threads.
# The original startup became stuck immediately after this fontconfig thread
# failure, leaving the native splash displayed indefinitely. Use the bundled
# TTF font files without starting a Pango/cache worker in WebAssembly.
font_begin = '  /* Let Pango & fontcache do their work without locking up */'
font_end = '  medium_font = TuxPaint_Font_OpenFont'
assert tux_src.count(font_begin) == 1 and tux_src.count(font_end) == 1, "Font worker section changed"
first = tux_src.index(font_begin)
last = tux_src.index(font_end, first)
original_font_thread = tux_src[first:last]
tux_src = tux_src[:first] + '''#ifdef __EMSCRIPTEN__
  fontconfig_thread_done = 1;
  fprintf(stderr, "[TPTRACE] PANGO_WORKER_SKIPPED (native browser mode)\\n");
  fflush(stderr);
#else
''' + original_font_thread + '''
#endif /* __EMSCRIPTEN__ */

''' + tux_src[last:]

# Diagnostic stage markers: the native canvas can show its original splash
# while initialization is blocked. We require reaching the actual editor.
trace_points = [
    ("CONFIG_COMPLETE", "  setup();"),
    ("PANGO_SETUP", "/* Let Pango & fontcache do their work without locking up */"),
    ("MEDIUM_FONT", "  medium_font = TuxPaint_Font_OpenFont"),
    ("CANVAS_ALLOCATION", "/* Create drawing canvas: */"),
    ("LOAD_IMAGES", "/* Load other images: */"),
    ("LOAD_BRUSHES", "/* Load brushes: */"),
    ("LOAD_FONTS", "/* Load system fonts: */"),
    ("LOAD_MAGIC", "/* Load magic tool plugins: */"),
    ("MAGIC_RETURNED", "/* Load shape icons: */"),
    ("BUILD_COLORS", "/* Generate color selection buttons: */"),
    ("BUTTON_LABELS", "  create_button_labels();"),
    ("SETUP_COMPLETE", "/* Seed random-number generator: */"),
    ("EDITOR_READY", "  mainloop();"),
]
for stage, loc in trace_points:
    assert tux_src.count(loc) == 1, f"Trace insertion marker changed: {stage} ({loc})"
    statement = '  fprintf(stderr, "[TPTRACE] ' + stage + '\\n"); fflush(stderr);\n'
    tux_src = tux_src.replace(loc, statement + loc, 1)

# SDL_Delay runs synchronously in the original desktop application's mainloop
# and starves the browser's main JS/rendering thread. Replace the delays in
# this native C file with Emscripten Asyncify's cooperative sleep.
assert tux_src.count('SDL_Delay(') >= 10, "Native event loop layout changed"
tux_src = '#ifdef __EMSCRIPTEN__\n#include <emscripten.h>\n#endif\n' + tux_src
tux_src = tux_src.replace('SDL_Delay(', 'emscripten_sleep(')
# Original Magic effects ship icons and audio in their own directories, not
# in data/images or data/sounds. Preload them into the runtime paths expected
# by the unmodified native plugin APIs.
magic_asset_marker = '# Create savedir structure in preloaded data'
assert magic_asset_marker in src, "Upstream asset stage changed"
src = src.replace(magic_asset_marker, r'''
echo "  Preloading original Magic images and sound effects..."
mkdir -p "$DATADIR/images/magic" "$DATADIR/sounds/magic"
cp -r "$SRCDIR/magic/icons/." "$DATADIR/images/magic/"
cp -r "$SRCDIR/magic/sounds/." "$DATADIR/sounds/magic/"
''' + magic_asset_marker, 1)

# Trace each statically linked Magic plugin before initialization so a
# slow or broken third-party effect can be isolated safely.
magic_loop = '  for (sp = 0; sp < num_static; sp++)\n  {\n'
assert tux_src.count(magic_loop) == 1, "Native static Magic loader changed"
tux_src = tux_src.replace(magic_loop, magic_loop +
  '    fprintf(stderr, "[TPMAGIC] START %d/%d %s\\n", sp + 1, num_static, splugins[sp].name); fflush(stderr);\n', 1)
tux.write_text(tux_src)
p.write_text(src)
PY
