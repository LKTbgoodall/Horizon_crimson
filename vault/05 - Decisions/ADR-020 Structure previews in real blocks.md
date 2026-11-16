---
tags: [adr, design, structures, preview]
status: accepted
date: 2026-11-16
---
# ADR-020: Structure previews in real blocks, on the grid

## Context
- On 2026-11-16 Bastien said he will ask for many structures and wants a truer picture of them: the real Minecraft blocks with their real textures, our own blocks allowed, and the Minecraft rule that a thing sits in one block ("a chest cannot be between two blocks").
- The first structure preview (`preview/abandoned-building.html`, 2026-11-15) drew procedural block types with shader-made textures, plus free boxes at fractional positions (pews, candles, banners, the chest, the bell, door leaves). Those free boxes broke the rule.
- The repo may hold no Mojang asset (CLAUDE.md). This PC has no Minecraft install, and Bastien turned down downloading the client jar here (2026-11-16).

## Decision
- **One shared engine** for every structure preview: `preview/lib/` (`blocks.js` registry and shapes, `world.js` grid, light and mesher, `textures.js`, `viewer.js`). A page only builds blocks and says what moves.
- **Real blocks only**: vanilla ids and state syntax (`oak_stairs[facing=east,half=top]`), shapes written from the vanilla pixel sizes (stairs with corner shapes, slabs, fences, walls and panes that connect, doors, trapdoors, lanterns, chains, candles, torches, chest, bell, banners, vines, plants, water). Ours are `crimson_eclipse:*` with textures painted in code.
- **The grid rule is code**: `W.set()` throws on a non-integer position. Moving parts are blocks (or anchor-block models) that sit on the grid at rest; the player figure stands in a cell. Day/night changes are block state changes (`awake`: candles `lit=true`, water to our blood water).
- **Minecraft lighting**: sky light and block light levels (0 to 15) spread through the grid, smooth lighting and corner shading, warm vanilla light and our red light, each light source with its awakening delay.
- **Textures by name, never copied**: the player's own client jar is read either in the page ("Load real textures…", kept in the browser's IndexedDB) or by `tools/extract-textures.mjs` into `preview/vanilla/textures.js` (gitignored). Without them, painted stand-ins, flagged on the page.
- `preview/block-palette.html` shows every block the engine has, with the id on hover.

## Consequences
- New structure previews are fast to write and read like Minecraft; what we draw can be turned into a real template block for block.
- The shapes are ours: a block whose vanilla model is exotic needs a shape written for it (add it to `blocks.js`).
- A PowerShell extractor was blocked by the antivirus on this PC (written file quarantined at once); the extractor is a Node script and the in-page reader needs nothing.
- Vanilla animated textures show their first frame.
