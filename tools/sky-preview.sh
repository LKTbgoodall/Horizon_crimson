#!/usr/bin/env bash
# Looks at the sky pass without the game: renders the real WGSL of
# mod/crimson_eclipse/api/src/sky_pass.rs offscreen with wgpu, over a synthetic
# scene (rolling land, water, a night sky), with the uniforms crimson-core packs
# for the game (crimson_core::sky_uniforms), at the seconds and from the views
# asked for, and lays them out on one contact sheet.
#
#   tools/sky-preview.sh                          # the default moments and views
#   tools/sky-preview.sh -t -30,0,10,30,60,90     # seconds since the eclipse began (the omens are negative)
#   tools/sky-preview.sh -v moon,horizon,up,away  # the views (see tools/sky-preview/main.rs)
#   tools/sky-preview.sh --size 960x540 --day 3
#
# Writes build/sky-preview/out/sheet.png (rows: the views, columns: the moments)
# and each frame beside it. The scene is not the game's world, only like it (its
# depth is reversed like the game's, 0 is the sky); the pass, its uniforms and
# tonight's break are the game's own. Built against Horizon's wgpu and naga at
# the pin (its patched copies in ext/src-<rev>/third_party), like
# tools/check-shader.sh. Nothing of the game is run.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rev="$(sed -n 's/.*"horizon_revision": "\([0-9a-f]*\)".*/\1/p' "$root/mod/compatibility.json")"
src="${HORIZON_SOURCE:-$root/ext/src-${rev:0:7}}"
[ -d "$src/third_party/naga" ] || { echo "No Horizon source at $src (see tools/check-glue.sh)" >&2; exit 1; }
if command -v cygpath >/dev/null; then
  src_m="$(cygpath -m "$src")"; root_m="$(cygpath -m "$root")"
else
  src_m="$src"; root_m="$root"
fi
out="$root/build/sky-preview"
mkdir -p "$out/src"
cat > "$out/Cargo.toml" <<EOF
[package]
name = "sky-preview"
version = "0.0.0"
edition = "2021"
publish = false

[dependencies]
crimson-core = { path = "$root_m/crates/crimson-core" }
wgpu = { version = "30.0.1", default-features = false, features = ["std", "parking_lot", "vulkan", "metal", "dx12", "wgsl"] }
pollster = "0.4"
png = "0.18"

[patch.crates-io]
wgpu-hal = { path = "$src_m/third_party/wgpu-hal" }
naga = { path = "$src_m/third_party/naga" }

[profile.dev]
opt-level = 1

[workspace]
EOF
[ -f "$out/Cargo.lock" ] || cp "$src/Cargo.lock" "$out/Cargo.lock"
cp "$root/tools/sky-preview/main.rs" "$out/src/main.rs"
cd "$out"
CARGO_TARGET_DIR="$out/target" cargo run --quiet -- \
  --shader "$root_m/mod/crimson_eclipse/api/src/sky_pass.rs" --out "$root_m/build/sky-preview/out" "$@"
