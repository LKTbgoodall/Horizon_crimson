---
tags: [adr, design, horizon]
status: proposed
date: 2026-11-14
---
# ADR-018: The Pale Realm lives in the far End

## Context
- Bastien wants a real other world reached through the fault (F1 · The Strike, `preview/the-fault.html`).
- Horizon `9f42064` has no custom dimension: three hard-coded levels (`enum Dim { Overworld, Nether, End }`), data pack dimensions are not loaded → [[Horizon hooks and API]] § Levels and crossing.
- Bastien, on hearing it: "find a way for us to have a dimension".

## Decision (proposed)
The Pale Realm is a **reserved region of the End**, far from the vanilla islands (for example around x = 2 000 000), made entirely by the mod:
- **Its own level**: crossing is a real change of level (loading screen, its own chunks), by `native_run_command` `execute in minecraft:the_end run tp <player> ...`, fired when the player falls into the fault.
- **Its own terrain**: on `chunk_load` with `is_new` inside the region, the mod overwrites the chunk with `native_edit_blocks` from a generator in the pure crate (dunes, black monoliths, buried ribs, the Spire). Before the crossing, `native_chunk_load_request` loads the landing area so the player arrives in a finished world.
- **Its own sky and fog**: our sky pass draws the Pale Realm sky (pale haze, black sun) when the client level is the End and the camera is in the region; `compute_fog_color` / `render_fog` give its fog.
- **Its own rules**: vanilla End spawns cancelled in the region (`entity_join_level`), our own creatures later.
- **The way back**: to decide (dawn, a rift, death).
- The vanilla End (main island, dragon, outer islands) stays untouched outside the region.

## Bastien: "no, I really want a new dimension" (2026-11-14)
A real new level needs the engine: `Dim` is a three-value enum used at 255 places in 31 files of `horizon-client` (`game/levels.rs` `open_level(dim: Dim)`). No mod can add one through hooks. The way to a real dimension is a contribution to Horizon:
- mod API work (a native mod declaring its own level: id, dimension type, and its chunks from a mod generator) goes to the mod API fork `arismoko/horizon` (CONTRIBUTING.md); data pack dimensions as vanilla loads them would go to `horizon-rust/horizon`;
- ideas go first to the suggestion queue (playhorizon.dev/hub or `/suggest` on Discord), not to issues; pull requests should stay under ~500 lines, so the work splits (string level ids instead of `Dim`, then registering a level, then the mod hook).
Update: Horizon's issue #11282 already turns `Dim` into a level key and plans data pack levels; our part is the mod side → [[Proposal - mod dimensions]]. Plan if Bastien agrees: suggest it, then contribute; meanwhile the far-End region carries the Realm with the same pure generator, so the move to a real dimension later changes only the glue.

## Rejected
- A zone of the Overworld (far away or high up): not a real other level, no loading crossing, the Overworld's own sky and mobs leak in.
- The Nether: its ceiling, lava ocean and fixed fog fight the pale look.
- Waiting for Horizon to load data pack dimensions: not in our hands; an upstream contribution is possible later, and the region can move into a real dimension then without changing the generator.

## Option found 2026-11-17: replace the whole End with the Realm
The Sift's Horizon port replaces the End with its own dimension through a data pack (`data/minecraft/dimension/the_end.json`), and Horizon `9f42064` honours it ([[Horizon hooks and API]] § Levels). For us: the Pale Realm's terrain, biomes and structures could come from Horizon's own worldgen (noise settings, density functions, surface rules) instead of our generator writing blocks. Cost: worlds with the mod lose the vanilla End (dragon, End cities, elytra), and it only applies to chunks generated after. **Bastien, 2026-11-17: keep the vanilla End.** The Realm does not replace the End; the far-End region (our generator) stays the way until Horizon has real mod dimensions.

## To check before coding
- ❓ `chunk_load` fires in the End and `native_edit_blocks` can write a whole new chunk without a visible pop for a player nearby.
- ❓ The End's own sky and its void fog can be fully covered by our pass.
- ❓ A player can be sent to unloaded End coordinates safely (fall into the void while chunks arrive).

## Consequences
- A pure `pale-realm` generator module (seeded, tested with `cargo test`).
- The fault in game ends with the teleport; the Realm arrival look needs its own preview first (the current one is a placeholder).
