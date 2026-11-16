---
tags: [adr, structures, pipeline]
status: accepted
date: 2026-11-16
---
# ADR-021: One builder for the preview and the game

## Context
- Bastien picked the Kneeling Colossus (rounds 1 to 4, [[Structures]]) and asked for the real structure (2026-11-16).
- [[How a structure is made]] left the authoring open (A: he builds in game; B: Claude generates templates from code; C: both).
- The preview engine ([[ADR-020 Structure previews in real blocks]]) already builds every structure block by block, on the grid, with vanilla ids and states.

## Decision
- **Option B, from the preview's own builder.** A structure is one builder file in `preview/structures/` (here `kneeling-colossus.js`), drawn by its preview page and turned into the game's template by `tools/export-structure.mjs` (Node, no dependency): what Bastien approved is what generates.
- The exporter writes **full block states** (a template places its blocks with no neighbour update): stairs corners, fence, pane and wall connections, persistent leaves (`CE.blocks.gameState`), our blocks' state defaults (`gameProps`), the **day state** (the blood moon's changes stay the mod code's job), **loot tables** for containers by room (`builder.loot(e)`), and the **air** the builder marks (`W.AIR`: crypt, stair shaft, a clearing over the dais).
- **Nothing holds to nothing**: `CE.kit.needs` / `unsupported` / `settle` encode what each block needs to stay (hanging lanterns, candles, carpets, banners, vines, ladders, bells); builders call `K.settle(W)`, and the exporter refuses a template with an unsupported block.
- Our blocks' textures come from the preview painters (`tools/make-block-textures.mjs`); their declarations, models and the worldgen files from `tools/write-colossus-content.mjs`.

## Consequences
- Changing a structure means changing its builder, checking the preview, re-running the three tools, and committing the generated files.
- The template is static: animations (head, heart, petals) and the awakening need the mod's code (anchor blocks, [[ADR-019 Structures for the blood moon]]).
- Textures are 16 px (the painters' grid); Bastien's 64 px wish ([[Content mods and textures]]) is a later pass.
