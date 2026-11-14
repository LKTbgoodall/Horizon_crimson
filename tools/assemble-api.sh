#!/usr/bin/env bash
# Writes the mod's [api] sources into $1: the pure core's modules
# (crates/crimson-core/src) next to the hand-written glue
# (mod/crimson_eclipse/api/src), and a lib.rs made of the core's lib.rs plus the glue modules.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
dest="$1"
core="$root/crates/crimson-core/src"
glue="$root/mod/crimson_eclipse/api/src"
handwritten="client.rs glue.rs server.rs sky_pass.rs"
mkdir -p "$dest"
for f in "$core"/*.rs; do
  name="$(basename "$f")"
  [ "$name" = lib.rs ] && continue
  case " $handwritten " in *" $name "*) echo "crimson-core must not have $name" >&2; exit 1;; esac
  cp "$f" "$dest/$name"
done
for name in $handwritten; do cp "$glue/$name" "$dest/$name"; done
{
  echo "// Written by tools/assemble-api.sh from crates/crimson-core/src/lib.rs: do not edit."
  cat "$core/lib.rs"
  echo
  for name in $handwritten; do echo "mod ${name%.rs};"; done
  echo
  echo "pub use glue::hooks;"
} > "$dest/lib.rs"
