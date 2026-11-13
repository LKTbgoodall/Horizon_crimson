---
tags: [history, lessons]
status: reference
date: 2026-11-14
source: D:\dev\mod_minecraft\cagebound (vault, journal 2026-11-13, code)
---
# From Cagebound

Cagebound (`D:\dev\mod_minecraft\cagebound`, paused on 2026-11-14) was a tech mod where captured mobs run machines. It reached 0.1.1 in game in two days. What carries over:

## What worked in game (2026-11-13, instance `cagebound-dev`, Nightly `9f42064`)
- A **typed-API native mod** (`[api] path = "api"`, `impl Hooks`) built by the launcher and ran: block entity, its tick, a hidden container, chests read with `move_items`, sounds, particles, coloured lights (`visuals`), block entity drawing (`draw_cube`, `draw_model_part` of the vanilla creeper, `draw_item`), and **text drawn in the world** (`draw_text`, glowing) for a hologram, upright and readable.
- The pure core + glue split: 32 tests and a fuzz caught real bugs before the game did.

## Tools ready in `tools/` (renamed for this mod)
- `check-glue.sh`: assembles the [api] crate (core copied next to the glue, `lib.rs` written), points it at `ext/src-<rev>` with **Horizon's own `[patch.crates-io]`** and lock, runs clippy `-D warnings`. Types were right on the first try thanks to it.
- `assemble-api.sh`, `build-mod.ps1` (`-Instance`, `-Update`, `-Combined`, `-Uninstall`). Their hand-written file lists will change with this mod's glue files.
- Getting the pinned source: shallow fetch of the Nightly into `ext/src-9f42064` (see the header of `check-glue.sh`).

## Traps already hit
- **Instance pin**: `mon-horizon` plays `fdc87ae` because its other mods were built for it; a mod needing hooks 415 fails there. Test in `cagebound-dev` (already on `9f42064`).
- **`draw_cube` UVs**: with `uv: None` the UVs follow the box's position; outside 0..16 texels they read the atlas around the sprite (a patchwork). Always give explicit UVs.
- Horizon can't empty a hand slot reliably inside a click: `take_items` (plain stacks, main hand first) + `give_stack` instead.
- During a block entity's own tick its container is out of the world: move items from `level_tick_post`.

## The look Bastien turned down
Code boxes with vanilla textures (posts, rings, tube) looked cheap next to the TikTok videos: "je veux pas ça, j'aime pas". Hence [[ADR-015 Rendering through our own GPU passes]].

## The GPU effects draft
`cagebound/mod/cagebound/api/src/fx.rs`: a `RenderHooks` implementation written against wgpu 30 as Horizon uses it (Horizon's own `entity_outline.rs` as the model): a selective glow (camera-facing halos and electric arcs drawn into an `Rgba16Float` texture tested against the world's depth, two blur passes, added onto the frame) and a shock wave (frame copied, redrawn bent in a ring). **Never compiled.** Start from it.
