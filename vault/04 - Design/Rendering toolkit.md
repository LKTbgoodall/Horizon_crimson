---
tags: [design, rendering]
status: living
date: 2026-11-14
---
# Rendering toolkit

Back: [[Concept]] · API details: [[Horizon hooks and API]] § A8, § C

How the looks of [[Events]] can be made on Horizon `9f42064` (read in the source; only the block entity part was seen in game, on Cagebound).

| Tool | What for | Status |
|---|---|---|
| `Hooks::render` → `RenderHooks::world_drawn` | our own wgpu passes after the world: glow / bloom, shock waves, sky cracks, beams, trails | ✅ in the typed trait; draft in Cagebound's `fx.rs`, never compiled |
| `RenderHooks::render_needs` | keep the world's depth for our passes (depth 0 = sky) | ✅ |
| `RenderHooks::world_warp` | WGSL that bends terrain and entity vertices: quakes, rift swirls | ✅ read, never tried |
| `visuals` (coloured lights) | red glow on the land, flashes | ✅ seen working on Cagebound |
| `world_primitives` | beams to the sky, lines, text | ✅ read |
| `native_biome_colors` + refresh | darker crimson grass and leaves during the blood moon | ✅ read (a refresh rebuilds sections: once per phase, not per frame) |
| `compute_fog_color` | crimson fog | ✅ read |
| `camera_shake`, `compute_fov` | impacts | ✅ read |
| `standalone_models` + `draw_model` | real models (crystals, monoliths) with our HD textures instead of code boxes | ✅ read |
| controlled particles | shards, embers, rain | ✅ read (compiled API) |
| `music_layers`, sounds | heartbeat, deep cracks | ✅ read |
