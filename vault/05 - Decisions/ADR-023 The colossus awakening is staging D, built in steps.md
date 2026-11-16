---
tags: [adr, structures, rendering]
status: accepted
date: 2026-11-16
---
# ADR-023: The colossus awakening is staging D, built in steps

## Context
- 0.5.2 in game: the colossus lights, but Bastien finds it plain ("just lit, that's all").
- `preview/colossus-awakening.html`: round 1 (A The Heart, B The Moon's Call, C The Guardian), round 2 (D The Moon's Gift, E The Heart Guardian) from what he kept ([[Structures]] § The colossus awakening).
- Bastien picked **D**, without the souls streaming into the heart: "just make the heart beat". He loves the moon's beam onto the head.

## Decision
- The awakening is **D**: the moon's beam comes down onto the crown and stays all night; the light runs down him from the top; the heart takes it in one great beat and keeps beating; the sword fills from the guard down with sparks up the blade; a ring round the dais lights and red mist rolls over it; the braziers flare; eight shards burst from the helm to circle the head; he lifts his face to the moon.
- **No** souls, no light wave through the veins, no lasers from the crown or the eyes, no shockwave on the ground.
- The timing lives in the colossus builder (`preview/structures/kneeling-colossus.js`, [[ADR-021 One builder for the preview and the game]]); the game reads it through the wake table at **60 ticks a preview second** (the 5 to 16 s awakening runs from 300 to 960 ticks after the eclipse begins, inside the eclipse's 1200).
- Built in steps, each one tested in game before the next:
  1. **Timing** (0.6.0): crown, eyes, veins and lanterns from the top down, heart, sword from the guard down, candles, braziers. Lit states only, no new code.
  2. **The moon's beam** onto the crown: our GPU pass (`world_drawn`, as the sky pass), from the moon's real position to the anchor's crown, seen from far.
  3. **Particles and mist**: sparks up the blade, embers over the braziers, red mist round the dais (`send_particles`, the fog hook).
  4. **The ring** round the dais: our blocks set into the dais floor (a crimson vein ring, rune stone spokes), in the template and the wake table.
  5. **What moves**: the heart beating, the head lifting, the shards circling (block entity models drawn by the anchor, seen within 64 blocks; the helm and heart blocks hidden while drawn).

## Consequences
- Each step is a version Bastien builds and looks at; the preview stays the reference.
- Step 5 needs reading Horizon's block entity drawing (`block_entity_submit`, `native_draw_model`, `BlockEntityDraw`) before coding: [[Open questions]].
