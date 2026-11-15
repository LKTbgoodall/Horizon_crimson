---
tags: [adr, design, structures]
status: proposed
date: 2026-11-15
---
# ADR-019: Structures for the blood moon

## Context
- On 2026-11-15 Bastien wanted a structures mod ("masterclass", animated, small ones everywhere, immense ones). Claude first made a separate folder (`D:\dev\mod_minecraft\wonders`, working name "Wonders"); Bastien then decided: "we'll do it all in Crimson, they'll be structures for the mod".
- Horizon (`9f42064`) generates vanilla-format structures shipped in a content mod, with its own terrain-fitting and start-check extensions. Code-side world generation (`chunk_generate`) and template reading (`structure_template`) are still ⏳ not numbered. Animation needs code ([[Horizon hooks and API]] § D).

## Options considered
1. **Vanilla-format structures + our anchor blocks inside them**: + worldgen, terrain fitting, far terrain for free; + animation where it is needed / − giant shapes bounded by jigsaw limits.
2. **Everything placed by code at chunk load** (`edit_blocks`): + any size or shape / − fights worldgen in the Overworld (neighbours, decoration), no far-terrain view. Fine in the Pale Realm, where our generator owns the land.
3. **Wait for `chunk_generate`**: + full control / − blocked on Horizon.

## Decision (proposed)
- Structures are part of Crimson Eclipse: [[Structures]]. Proposed tie: **ruins by day, awake under the blood moon**.
- Overworld: option 1. Pale Realm: its own generator (option 2, [[ADR-018 The Pale Realm lives in the far End]]).
- The `wonders` folder's useful notes were merged here (Horizon § D, the catalogue reworked for the blood moon, the pipeline).

## Consequences
- Need a way to author NBT templates ([[How a structure is made]]).
- Check in game early: a content structure generates, our block entity inside it ticks and draws, the far terrain shows it.

## Links
- [[Structures]] · [[How a structure is made]] · [[Decision index]]
