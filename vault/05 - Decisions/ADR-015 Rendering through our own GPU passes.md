---
tags: [adr]
status: accepted
date: 2026-11-14
---
# ADR-015: Rendering through our own GPU passes

## Context
- Cagebound's in-game look (boxes drawn with `draw_cube` and vanilla textures) was turned down.
- At the pin `9f42064`, the typed trait has `Hooks::render(&self) -> Option<&dyn RenderHooks>`; `RenderHooks::world_drawn` gets the wgpu device, queue and encoder, the frame's colour target and depth, the camera and its view-projection. Horizon re-exports wgpu 30. Our glue check can type-check it.

## Decision
The signature looks are made with our own GPU passes (glow / bloom, shock waves, sky effects, trails), plus real models with HD textures, not with code boxes. Block entity drawing stays for what it does well (models, items, text).

## Consequences
- + The TikTok level becomes reachable.
- − wgpu code is the most fragile part (API changes across wgpu versions): pin-check every re-pin, keep passes small and switchable, skip all work when nothing is in view.
- No public mod using `RenderHooks` was found to learn from: Horizon's own `entity_outline.rs` is the model.

## Links
- [[Rendering toolkit]] · [[Decision index]]
