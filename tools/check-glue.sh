#!/usr/bin/env bash
# Type-checks and lints the mod's glue against the pinned Horizon source,
# without building or running the game (no --trust-native-code: Claude may run it).
#
# 1. Assembles the [api] crate as tools/build-mod.ps1 does: crates/crimson-core/src
#    copied next to the hand-written glue, lib.rs written from the core's lib.rs.
# 2. Points its horizon-client dependency at a local copy of Horizon at the pin
#    (ext/src-<rev>, or $HORIZON_SOURCE), with Horizon's own Cargo.lock.
# 3. cargo clippy on that crate with -D warnings, as the launcher's build would fail on any warning.
#
# Get the source once:  git init ext/src-<rev7> && cd ext/src-<rev7> && git remote add origin
#   https://github.com/horizon-rust/horizon && git fetch --depth 1 origin <rev> && git checkout FETCH_HEAD
#   (delete its CLAUDE.md symlink, write the revision into .horizon-revision)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rev="$(sed -n 's/.*"horizon_revision": "\([0-9a-f]*\)".*/\1/p' "$root/mod/compatibility.json")"
src="${HORIZON_SOURCE:-$root/ext/src-${rev:0:7}}"
[ -d "$src/crates/horizon-client" ] || { echo "No Horizon source at $src (see the header of this script)" >&2; exit 1; }

out="$root/build/check"
api="$out/api"
rm -rf "$api"
mkdir -p "$api/src"
# Shared by build-mod: the core's modules, then the glue.
"$root/tools/assemble-api.sh" "$api/src"
src_win="$src"
if command -v cygpath >/dev/null; then src_win="$(cygpath -m "$src")"; fi
sed -e "s#^horizon-client = .*#horizon-client = { path = \"$src_win/crates/horizon-client\" }#" \
    "$root/mod/crimson_eclipse/api/Cargo.toml" > "$api/Cargo.toml"
# Horizon's own [patch.crates-io] (its forks of wgpu-hal, naga, mimalloc), as paths into the source.
{
  printf '\n[workspace]\n\n[patch.crates-io]\n'
  sed -n '/^\[patch.crates-io\]/,/^\[profile/p' "$src/Cargo.toml" | grep -E '^[a-z0-9_-]+ = \{ path = ' |
    sed -e "s#path = \"#path = \"$src_win/#"
  printf '\n[profile.dev]\ndebug = "line-tables-only"\n'
} >> "$api/Cargo.toml"
cp "$src/Cargo.lock" "$api/Cargo.lock"

echo "Checking the glue against Horizon ${rev:0:7} (nothing is run)..."
cd "$api"
CARGO_TARGET_DIR="$out/target" cargo clippy --message-format short -p mod-crimson-eclipse -- -D warnings
echo "The glue type-checks, with no warning."
