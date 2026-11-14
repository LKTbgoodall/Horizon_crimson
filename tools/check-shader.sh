#!/usr/bin/env bash
# Validates the sky pass's WGSL with Horizon's own naga (the pinned source's
# patched copy), without the game: parses the SHADER constant of
# mod/crimson_eclipse/api/src/sky_pass.rs, validates it, and checks that the
# uniform block is the size the Rust side uploads. Nothing of the mod is run.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rev="$(sed -n 's/.*"horizon_revision": "\([0-9a-f]*\)".*/\1/p' "$root/mod/compatibility.json")"
src="${HORIZON_SOURCE:-$root/ext/src-${rev:0:7}}"
[ -d "$src/third_party/naga" ] || { echo "No Horizon source at $src (see tools/check-glue.sh)" >&2; exit 1; }
if command -v cygpath >/dev/null; then src="$(cygpath -m "$src")"; root_m="$(cygpath -m "$root")"; else root_m="$root"; fi
out="$root/build/check-shader"
mkdir -p "$out/src"
cat > "$out/Cargo.toml" <<EOF
[package]
name = "check-shader"
version = "0.0.0"
edition = "2021"
publish = false

[dependencies]
naga = { path = "$src/third_party/naga", features = ["wgsl-in"] }

[workspace]
EOF
cp "$src/Cargo.lock" "$out/Cargo.lock"
cat > "$out/src/main.rs" <<'EOF'
use naga::valid::{Capabilities, ValidationFlags, Validator};

fn main() {
    let path = std::env::args().nth(1).expect("the path of sky_pass.rs");
    let rust = std::fs::read_to_string(&path).expect("sky_pass.rs");
    let marker = "pub const SHADER: &str = r#\"";
    let start = rust.find(marker).expect("the SHADER constant") + marker.len();
    let end = start + rust[start..].find("\"#;").expect("the end of SHADER");
    let source = &rust[start..end];
    let floats: usize = rust
        .split("const UNIFORM_FLOATS: usize = ")
        .nth(1)
        .and_then(|rest| rest.split(';').next())
        .and_then(|n| n.trim().parse().ok())
        .expect("UNIFORM_FLOATS");
    let module = match naga::front::wgsl::parse_str(source) {
        Ok(module) => module,
        Err(error) => {
            eprintln!("{}", error.emit_to_string(source));
            std::process::exit(1);
        }
    };
    if let Err(error) = Validator::new(ValidationFlags::all(), Capabilities::empty()).validate(&module) {
        eprintln!("{}", error.emit_to_string(source));
        std::process::exit(1);
    }
    let entries: Vec<&str> = module.entry_points.iter().map(|e| e.name.as_str()).collect();
    for wanted in ["vs", "fs_copy", "fs_blend"] {
        assert!(entries.contains(&wanted), "entry point {wanted} is missing");
    }
    let mut layouter = naga::proc::Layouter::default();
    layouter.update(module.to_ctx()).expect("layout");
    let (handle, _) = module
        .types
        .iter()
        .find(|(_, ty)| ty.name.as_deref() == Some("U"))
        .expect("the uniform struct U");
    let size = layouter[handle].size as usize;
    assert_eq!(size, floats * 4, "struct U is {size} bytes, Rust uploads {}", floats * 4);
    println!("The sky shader is valid WGSL ({} lines, entries {entries:?}, uniforms {size} bytes).", source.lines().count());
}
EOF
cd "$out"
CARGO_TARGET_DIR="$out/target" cargo run --quiet -- "$root_m/mod/crimson_eclipse/api/src/sky_pass.rs"
