---
tags: [design, structures, pipeline]
status: proposed
date: 2026-11-15
---
# How a structure is made

Back: [[Structures]] · API: [[Horizon hooks and API]] § D · Decision: [[ADR-019 Structures for the blood moon]]

Three layers, from what Horizon offers at `9f42064` (read, nothing tried yet).

## 1. Shape
- **Overworld**: vanilla-format structures in the content half: templates (NBT) in `data/crimson_eclipse/structure/`, and structure, structure set, template pool, processor list JSON in `data/crimson_eclipse/worldgen/`. Worldgen places them (and the far terrain should show them). Terrain fitting with `horizon:enhanced_terrain_adaptation`, placement rules with `horizon:start_checks`. Tiny decorations can be features added to vanilla biomes.
- **Pale Realm**: the Realm's pure generator writes its structures with the terrain (`native_edit_blocks` on new chunks, [[ADR-018 The Pale Realm lives in the far End]]).

## 2. Life: our own blocks inside the structures
- The templates contain **our blocks with block entities** ("anchors"): an altar crystal, a lantern cage, an eye, a bell... Each draws its animated model client side (`block_entity_submit`, standalone models, lights, particles, sounds) and keeps its state server side.
- They read the night from `crimson-core`: asleep by day, awake under the blood moon, put to sleep by dawn's cleansing.
- Far or huge motions (the Moon Anchor's beam, the Colossus' eyes, the Spire's rings) go through a **GPU pass** fed by the list of loaded anchors: block entity drawing stops at 64 blocks.

## 3. Change: runtime edits
- Awakenings (the chapel's doors, the fault opening): `native_edit_blocks`, falling blocks, `set_block`. Later, `structure_template` (⏳) to place a template block by block.

## Authoring the shapes (to decide with Bastien)
- **A. Bastien builds in game** with structure blocks (if Horizon saves them, ❓), Claude adds anchors, pools and JSON.
- **B. Claude generates** templates from code (a generator in `tools/` writing NBT): parametric, good for huge or regular shapes (rings, towers, a colossus from primitives).
- **C. Both**: generator for big geometry, hand detailing in game.
- Every look goes through a preview page first (`preview/`), built with the shared engine `preview/lib/` ([[ADR-020 Structure previews in real blocks]]): real vanilla blocks and states, our `crimson_eclipse:*` blocks, **every block in one cell** (`W.set` refuses anything else), day/night as block state changes, Minecraft light. Hover shows each block's id and position, so a preview can be turned into a template block for block. All blocks: `preview/block-palette.html`.
