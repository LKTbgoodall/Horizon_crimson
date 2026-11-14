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

## Rejected
- A zone of the Overworld (far away or high up): not a real other level, no loading crossing, the Overworld's own sky and mobs leak in.
- The Nether: its ceiling, lava ocean and fixed fog fight the pale look.
- Waiting for Horizon to load data pack dimensions: not in our hands; an upstream contribution is possible later, and the region can move into a real dimension then without changing the generator.

## To check before coding
- ❓ `chunk_load` fires in the End and `native_edit_blocks` can write a whole new chunk without a visible pop for a player nearby.
- ❓ The End's own sky and its void fog can be fully covered by our pass.
- ❓ A player can be sent to unloaded End coordinates safely (fall into the void while chunks arrive).

## Consequences
- A pure `pale-realm` generator module (seeded, tested with `cargo test`).
- The fault in game ends with the teleport; the Realm arrival look needs its own preview first (the current one is a placeholder).
