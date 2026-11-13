---
tags: [horizon, reference, manifest]
source: horizon/docs/native-mods.md, docs/api/mod-files.md, launcher/src/native_mods/api.rs, horizon-mods/native/smp (via Horizon Quests and Organa)
verified_on: 2026-11-13
---
# Native mods: structure and manifest

Back: [[Horizon - Overview]]

## Three ways to write code
1. **Trait mod (typed API)**: `[api] path = "api"`. The crate exports `pub fn hooks() -> Box<dyn horizon_client::mod_api::Hooks>`. Methods `(&self, host, event) -> Flow` return `Flow::Continue` or `Flow::Cancel`. Scaffold: `cargo horizon-mod new <path> --template native --horizon <commit>`. **Used by the Organa prototype**: it has every block entity, mob drawing and machine GUI hook we need ([[ADR-001 Native Rust mod with the typed API]]).
2. **Mixin bundle + helpers** (the `smp` style, used by Horizon Quests): `[[injection]]` with `hook` + `hook_version` or a `Game::native_*` target, a helper file per injection and `bindings`. A helper can turn `&mut Game` into `&mut dyn Host`.
3. **Trait injections**: `trait_method = "x"` generates `inject_<mod_id>_<x>`.

Some hooks and helpers are in the catalog but **not yet in the trait** (seen at `1453e0e`: `player_command`, `screen_key_pressed_pre`, `screen_char_typed_pre`, `player_respawned`, `server_data_loaded`; helpers `player`, `sidebar`). Those need a mixin helper alongside the trait.

## Trait mod layout (Organa prototype, `fdc87ae`)
```toml
# horizon-mixin.toml
[mod]
id = "crimson_eclipse"
version = "0.1.0"

[compatibility]
horizon_revision = "<commit, 40 hex>"

[api]
path = "api"
```
```toml
# api/Cargo.toml
[dependencies]
horizon-client = { git = "https://github.com/horizon-rust/horizon", rev = "<commit>" }
log = "0.4"
```
```rust
use horizon_client::mod_api::{Hooks, Host};
pub fn hooks() -> Box<dyn Hooks> { Box::new(Mod) }
struct Mod;
impl Hooks for Mod { /* one method per hook */ }
```
- State goes through `&self`, so `Send + Sync`: keep it in a `Mutex` or atomics. One instance serves both the window's game and the server's game.
- The `Hooks` and `Host` traits are **generated at build time** from `native-hooks.json`: read them in the launcher's build output, `%APPDATA%\horizon-launcher\native\target\<profile>\build\horizon-client-*\out\mod_api_generated.rs` and `mod_api_generated_host.rs`. Read, never guess.
- **The pure crate is copied into `api/src/`** by the build script. At `fdc87ae` the launcher copies the `[api]` crate to `native-api/<id>/` and rewrites only `horizon-client` and inter-mod dependencies, so `[api]` cannot depend on a `[[crate]]` of the bundle (`../core` would point to `native-api/core`). Recheck at the new pin: `main` (`b5e7227`) documented `organa-core = { path = "../core" }` with `[[crate]] id = "core"`.
- `horizon_mods` is not re-exported by `horizon-client`: for `Vec<horizon_mods::content::Block>` push `Default::default()` and fill fields by inference.

## `horizon-mixin.toml`: known keys
```toml
[mod]
id = "crimson_eclipse"           # a-z, 0-9, _
version = "0.1.0"
priority = 100

[compatibility]
horizon_revision = "<commit 40 hex>"   # MUST equal the one in compatibility.json

[api]                      # only for a trait mod
path = "api"

[dependencies]             # other typed mods (optional)

[[module]]                 # mixin style: file becomes crate::game::<name>
[[injection]]              # mixin style: hook + hook_version, kind, helper, bindings
[[crate]]                  # internal crate of the bundle
```

## `compatibility.json` (registry)
```json
{ "game": "26.3", "hooks": 411,
  "horizon_repository": "https://github.com/horizon-rust/horizon", "horizon_revision": "<commit>",
  "horizon_mixins_repository": "https://github.com/horizon-rust/horizon-mixins", "horizon_mixins_revision": "<commit>" }
```
`hooks` is the **minimum** `NATIVE_HOOKS_API`. (411 at `fdc87ae`; 415 on `main` `b5e7227`.)

## `horizon-native.json` (inside the package)
`schema: 1`, `id`, `version`, `game: "26.3"`, `horizon`, `mixins` (40 hex), `hooks`. **An unknown field makes the file get rejected.**

## Constraints
- Allowed crates: **only those in Horizon's `Cargo.lock`**; no path or git crates besides `horizon-client`. Available: `serde`, `serde_json`, `toml`, `uuid`, `parking_lot`, `once_cell`, `rand`, `log` (0.4.34), `flate2`, `chrono`… The pure crate has no dependency at all.
- A `.hnmod` holds only `.rs`, `.toml`, `data/`, README, LICENSE. PNGs, models and lang go in the content half (`assets/`).
- `RUSTFLAGS=-D warnings`: **a warning fails the build**.
- No `include_str!` / `#[path]` / external `mod` in a bundle module, even under `#[cfg(test)]`: `horizon-mixins apply` fails with `E_MODULE` (Horizon Quests).
- A target function's body has no `cfg` and no macros; helpers and modules may.
- Build error codes: `E_TARGET_NOT_FOUND`, `E_MODULE`, `E_HOOK_CATALOG`, `E_MODULE_CONFLICT`, `E_HOOK_UNKNOWN`, `E_HOOK_VERSION`, `E_CRATE_DEPENDENCY`. A rejected mod is skipped on a client build, fails a server export.
- Installation: `<instance>/horizon-native-mods/` (code), `<instance>/horizon-mods/` (content); on/off in `horizon-mods.txt` (`mod.<id>:true`).
