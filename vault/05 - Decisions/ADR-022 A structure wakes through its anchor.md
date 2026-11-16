---
tags: [adr, structures, code]
status: accepted
date: 2026-11-16
---
# ADR-022: A structure wakes through its anchor

## Context
- Bastien asked for the colossus to glow and change at night, and for 64 px textures (2026-11-16, after 0.4.0).
- A template is placed once by worldgen; nothing knows afterwards where the structure stands. Scanning chunks block by block is too slow; random ticks are too slow and too random for a lit wave.
- Horizon at `9f42064`: a mod block gets a block entity on any template (`block_entity`), which ticks server-side while players are near (`block_entity_ticks`, `block_entity_tick`, with a `Host`); `set_block_property_with(pos, key, value, flags)` changes one property; the `emissive` hook pairs a block sprite with a full-bright overlay ([[Horizon hooks and API]] § A9).

## Decision
- **Each awakening structure carries one anchor block** (`crimson_eclipse:colossus_anchor`, hidden in the colossus' heart, facing south as built). Its block entity ticks; every half second it gives each block of the structure's **wake table** the `lit` the pure core says for now, and nothing else.
- The **wake table is generated** from the preview builder by `tools/export-structure.mjs` (`crates/crimson-core/src/<name>_wake.rs`): each block whose awake state only turns `lit` on, its offset from the anchor and its delay (the preview's seconds × 100 ticks after the eclipse begins). The world turns a template by quarter turns; the anchor's facing tells how many (`crimson_core::wake`).
- Timing is stateless: awake from the eclipse to dawn, from the clock and the night's phase. A block that is not there (unloaded, replaced) is skipped and tried again.
- **Glow by state**: each of our blocks has a declared `lit` state with `state_light`; its lit model uses a `_lit` texture with an emissive overlay, so the glow comes and goes with the state.

## Consequences
- The same mechanism serves the next structures (the lantern tree): a builder, an anchor, a generated table.
- Moving parts (the colossus raising its head, the heart beating) are not states: they need a block entity renderer (`block_entity_submit`, standalone models), later.
- A colossus placed before 0.5.1 never wakes: before 0.5.0 it has no anchor, in 0.5.0 its anchor has no block entity (the template must carry the anchor's `nbt` `{id}`; worldgen does not call the `block_entity` hook).
