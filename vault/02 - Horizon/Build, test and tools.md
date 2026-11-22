---
tags: [horizon, build, tools]
source: horizon docs/native-mods.md, docs/native-client.md, horizon-mods native.py; Horizon Quests' and Organa's build scripts
verified_on: 2026-11-13
---
# Build, test and tools

Back: [[Horizon - Overview]]

> [!danger] Rule
> « *Trusting native code is the player's decision, never an agent's.* »
> Commands with `--trust-native-code` (`native-build`, the build script) are **run by Bastien**, never by Claude. Claude prepares code, packages and commands.

## The launcher (playing and testing)
```powershell
horizon-launcher native-build <folder> --instance NAME --trust-native-code
horizon-launcher settings native-profile dev          # rebuild ~6x faster, game ~2x slower
horizon-launcher settings native-profile performance
horizon-launcher versions                             # Nightlies available
```
- Bastien's PC: launcher `%LOCALAPPDATA%\Programs\Horizon Launcher\horizon-launcher.exe` (not on PATH; a windowed app, so `Start-Process -Wait`, not `&`), data `%APPDATA%\horizon-launcher` (`native/build.log`, `native/source/<rev>/`, `native/target/`, `versions/`), instances `%APPDATA%\horizon\instances\` (default `mon-horizon`), game log `latest.log` of the instance.
- The launcher brings **its own Rust 1.99.1** (`x86_64-pc-windows-gnu`). First build ≈ 4-8 min, then ≈ 45 s for a helper change, ≈ 11 s for the mod crate.
- **`native-build <folder>` alone does not install the mod**: the next build from the launcher drops it. Install for real: put the package in the instance (`horizon-native-mods/`, `horizon-mods/`), add `mod.<id>:true` to `horizon-mods.txt`, then `native-build --instance <instance>` with no folder. The build script does all of it.

## Build script (to write in phase 1, from Horizon Quests')
`tools/build-mod.ps1` and its bash twin `tools/build-mod.sh` (Horizon Quests, modelled on Organa's):
1. copy the pure crate into the bundle's `api/src/` (Organa's need, see [[Native mods - structure and manifest]]);
2. pack **one combined `.hmod`** (content + native bundle), reproducible (fixed dates, sorted entries, `/` separators, files only);
3. install into the instance (cut in two for launchers that can't read native content yet), enable, build.
Flags used before: `-NoBuild`, `-NoInstall`, `-Uninstall`, `-Combined`.
Windows blocks `.ps1` by default: `powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1`.

## Unit tests (no game)
```sh
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cargo test
```
- All rules live in the pure crate ([[Rendering toolkit]]). Fuzz: random sequences of actions checking that no item and no specimen is lost or duplicated. Long run (PowerShell): `$env:CAGEBOUND_FUZZ_SEEDS=2000; cargo test --release --test fuzz -- --nocapture`.
- Organa's fuzz found a real item loss at save time (saving right after a break, before the next tick): the fuzz pays.
- Stress example: Organa's engine moved 12,800 items in 0.25 ms per tick (budget 50 ms); graph recompile 46 ms for ~26,000 blocks (global, to make per network).

## Type-check the glue without running the game
`cargo test` never compiles the glue. Horizon Quests' `tools/check-glue.ps1` / `.sh` does, on a PC whose launcher built the pin once: `horizon-mixins apply --workspace <launcher's source copy> --mods <bundle> --out build/check/stage`, then `cargo check -p horizon-client --locked` in the stage. Nothing runs, no `--trust-native-code`: **Claude may run it**, and must before asking for any in-game test. Organa did the same by hand (`cargo check -p mod-organa` and `clippy` on a copy of the stage).
- Hand-copied signatures prove nothing about visibility: a stub crate once missed a real build break (`native_as_player` private).
- Horizon's own crates give two warnings in the stage; read the ones naming our files.

## Look at the sky pass without the game (2026-11-22)
- `tools/sky-preview.sh` renders the **real** WGSL of `sky_pass.rs` offscreen with wgpu 30.0.1 (Horizon's patched naga and wgpu-hal from `ext/src-<rev>/third_party`), over a synthetic scene (rolling land, water, night sky; reversed `Depth32Float`, 0 = sky; `Bgra8Unorm` like the game's frame), with the uniforms `crimson_core::sky_uniforms::uniforms` packs for the game too, tonight's break and the eye stepped from the eclipse's start.
- Output: `build/sky-preview/out/sheet.png` (rows the views `moon`, `horizon`, `up`, `away`; columns the seconds since the eclipse began, omens negative) and each frame. Options: `-t -30,0,60`, `-v moon,up`, `--size 960x540`, `--day 3`. 36 frames in about 2.4 s on the dev PC's RX 9070 XT (Vulkan).
- The land is not the game's (no blocks, no vanilla fog or clouds): judge the sky, the moon, the break and the eye; the land's grade only roughly. Idea from [[From Orbital Laser]].
- `tools/check-shader.sh` validates the same WGSL with naga and checks the uniform size against `sky_uniforms.rs`.

## Re-pinning on a new Nightly
- Update `horizon_revision`, the horizon-mixins revision and `hooks` everywhere together (manifest, `compatibility.json`, scripts).
- If the launcher has not built that Nightly yet: `git archive <rev>` of a Horizon clone into `ext/src-<rev>`, delete its symlinks (horizon-mixins refuses them: `E_INVALID_PATH`), write the full revision into `.horizon-revision`, then run the glue check against it.

## `horizon-ctl`: playing the game from a script
Each installed version ships `horizon-ctl` next to the game. It drives a running game like a player and answers JSON (`horizon-ctl mcp` serves it over MCP): `launch --world NAME --wait`, `state`, `screen`, `messages`, `screenshot`, `logs`, `quit`, moving, mining, placing, attacking. Docs: Horizon `docs/native-client.md` § "Agent control". Claude can launch a build Bastien made, look at a machine and take screenshots; building stays Bastien's.

## Dedicated server
```powershell
horizon-launcher native-build <folder> --server-output <DIR> --version <TAG> --trust-native-code
horizon-server --dir <SERVER> config set engine.path=<DIR>\horizon-engine.exe
horizon-server --dir <SERVER> run
```

## Windows pitfalls
- **Smart App Control** blocks freshly compiled programs (os error 4551): turn it off.
- Non-ASCII profile path: the build moves to `ProgramData\horizon-launcher-<id>`.
- `RUSTFLAGS`, `CARGO_*`, `~/.cargo/config.toml` are ignored by the launcher.
- If `cargo` is unknown in an open window: `$env:Path = [Environment]::GetEnvironmentVariable("Path","User") + ";" + [Environment]::GetEnvironmentVariable("Path","Machine") + ";$HOME\.cargo\bin"`.
- To play: Minecraft Java 26.3 launched once, then the Horizon launcher.

## Learned with Crimson Eclipse 0.1.0 (2026-11-13)
- A native build starts from the Horizon the instance plays when its other native mods pin that one: an instance whose mods were built on `fdc87ae` refuses a mod needing hooks 415 ("Horizon fdc87ae doesn't have the native hook points these mods use"). Test in a separate instance (`horizon-launcher instance create crimson_eclipse-dev`) and build it with `native-build --update` (`build-mod.ps1 -Instance crimson_eclipse-dev -Update`).
- `draw_cube` with `uv: None` bakes UVs from the box's position: any box outside 0..16 texels samples the atlas around its sprite (a patchwork). Always give explicit UVs.
