---
tags: [horizon, reference, content, textures]
source: horizon docs/mods.md, docs/resource-packs.md, horizon-mods/src/content.rs, horizon-client-render (via Organa, fdc87ae); Horizon Quests
verified_on: 2026-11-13
---
# Content mods and textures

Back: [[Horizon - Overview]]

## Content mod basics
```sh
cargo install --git https://github.com/horizon-rust/horizon cargo-horizon-mod
cargo horizon-mod new my-mod      # template
cargo horizon-mod check file.hmod # the registry's own check
```
- `horizon-mod.toml` at the root, `side = "both"`, `capabilities = ["registries"]` when it declares blocks and items.
- A `.hmod` or a folder with `horizon-mod.toml` in `<instance>/horizon-mods/`, enabled by `mod.<id>:true` in `horizon-mods.txt`.
- Blocks declared in code join the content mod whose id is their namespace.

## 26.3 layout
| What | Where |
|---|---|
| Blocks | `data/<ns>/horizon/block/<x>.json`: a vanilla `template`, `properties` (`hardness`, `explosion_resistance`, `light`, `requires_tool`, `friction`, `map_color`, `sounds`, `random_ticks`, `render_shape`, `occludes`), `state_properties`, `item: true` by default |
| Items | `data/<ns>/horizon/item/<x>.json`: `template`, `max_stack_size` (u8), `rarity`, `components`, `crafting_remainder`, `place_block` (`horizon-mods/src/content.rs` 330) |
| Menus | `data/<ns>/horizon/menu/<x>.json` (`slots`, `data_slots`, `results`) |
| Creative tab | `data/<ns>/horizon/creative_tab/` |
| Item models | `assets/<ns>/items/<x>.json` (`{"model": {"type": "minecraft:model", …}}`) |
| Block models, blockstates | `assets/<ns>/models/block/`, `assets/<ns>/blockstates/` |
| Loot, recipes, tags | `data/<ns>/loot_table/blocks/`, `data/<ns>/recipe/`, `data/<ns>/tags/block/` |
| Lang | `assets/<ns>/lang/en_us.json` |

- Model elements must stay within **-16 to 32** (vanilla limit): an item model reaching 33 does not draw (the press icon bug).
- Textures from 16× to 512× are accepted (`docs/resource-packs.md`).
- `block/` and `item/` textures with an `animation` mcmeta are animated only for layers present in visible sections (`gfx.rs`, `active_animated_layers`).

## Emissive layers (glow)
- Hook `emissive(host, EmissiveEvent { layers: &mut Vec<(&'static str, &'static str)> })`: pairs (base sprite, layer), **32 max**, layers under `assets/<ns>/textures/emissive/`, matched by loaded sprite name (`native_emissive.rs`).
- The shader paints `mix(lit colour, layer.rgb, layer.a)` in opaque and cutout passes only: **the translucent pass draws no emissive layer**. The layer is painted at full light, day and night.
- **A layer is never animated** (it is in no mesh): it stays on frame 0. Make layers single still frames (max glow over the animation).
- Loading drops failures silently (`let _ =`) and keeps the first 32 `emissive/` files **before** sorting.
- ✅ In game (2026-11-09): native emissive works (debug checkerboard drawn on our blocks and on stone).
- No more OptiFine `_e` duplicates: they made the on/off test meaningless.

## Generated textures (Organa's method, to reuse)
- **Textures are generated in code** by a dependency-free Rust tool (`tools/texgen`), no image AI: seamless edges, a coherent palette, frame-by-frame animation and emissive layers come easily (Cagebound's ADR-010).
- Bastien's choice: **64 × 64 minimum** for a truly stylish look (GUI and item icons may stay 16 ×).
- Method: **periodic** value noise and Voronoi on [0, 1)² (neighbours tile), each material returns height, colour, shininess and glow; relief lit from the top left with a wet specular, 3 × 3 supersampling.
- Outputs a day / night isometric **preview page** (`build/preview.html`, served on `localhost:8765`) and a ×4 sheet: the base of "preview first" ([[Lessons from Horizon Quests]]).
- Never copy a vanilla texture: reuse vanilla textures **by name** (polished deepslate, iron block, glass, anvil) and only make ours for what vanilla lacks.
- Organa's generator source stays in `D:\dev\mod_minecraft\organa\tools\texgen` (`press_tex.rs` for the press: steel, hazard stripes, plate, vent, armoured glass in cutout, white flash, dusts).
