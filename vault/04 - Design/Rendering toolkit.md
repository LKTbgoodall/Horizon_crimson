---
tags: [design, rendering]
status: living
date: 2026-11-14
---
# Rendering toolkit

Back: [[Concept]] · API details: [[Horizon hooks and API]] § A8, § C · Techniques from another mod: [[From Orbital Laser]]

How the looks of [[Events]] can be made on Horizon `9f42064` (read in the source; only the block entity part was seen in game, on Cagebound).

| Tool | What for | Status |
|---|---|---|
| `Hooks::render` → `RenderHooks::world_drawn` | our own wgpu passes after the world: glow / bloom, shock waves, sky cracks, beams, trails | ✅ in the typed trait; `sky_pass.rs` type-checks against the pin (2026-11-14), never run; bloom draft in Cagebound's `fx.rs` |
| `RenderHooks::render_needs` | keep the world's depth for our passes (depth 0 = sky) | ✅ |
| `RenderHooks::world_warp` | WGSL that bends terrain and entity vertices: quakes, rift swirls. Its optional `world_fragment` paints every terrain pixel (a way to redden the world) | ✅ read, never tried |
| Sky (moon, stars) | no hook at the pin: paint over the vanilla sky in `world_drawn` where depth is 0 | ❌ hook · ✅ overdraw read, never tried |
| `visuals` (coloured lights) | red glow on the land, flashes | ✅ seen working on Cagebound |
| `world_primitives` | beams to the sky, lines, text | ✅ read |
| `native_biome_colors` + refresh | darker crimson grass and leaves during the blood moon | ✅ read (a refresh rebuilds sections: once per phase, not per frame) |
| `compute_fog_color` | crimson fog | ✅ read |
| `camera_shake`, `compute_fov` | impacts | ✅ read |
| `standalone_models` + `draw_model` | real models (crystals, monoliths) with our HD textures instead of code boxes | ✅ read |
| controlled particles | shards, embers, rain | ✅ read (compiled API) |
| `music_layers`, sounds | heartbeat, deep cracks | ✅ read |
| Anchor block entities in [[Structures]] | altar crystals, lantern cages, eyes, bells: animated models with `spin` / `rotate_about`, up to 64 blocks away | ✅ seen (Cagebound's block entity drawing) |
| `native_edit_blocks`, falling blocks | structure awakenings (doors opening, a fault splitting) and the Pale Realm's generator | ✅ read |
| Offscreen pass preview + WGSL check | look at our WGSL at any second without the game; real naga errors | ⏳ idea from [[From Orbital Laser]] (`tools/preview`, `tools/wgslcheck`; wgpu and naga 30.0.1 are in the pin's lock) |
| `structure_template` | a structure that builds itself block by block | ⏳ not numbered at `9f42064` |
