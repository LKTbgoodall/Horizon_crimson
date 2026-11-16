---
tags: [adr, index]
updated: 2026-11-14
---
# Decision index

| ADR | Decision | Status | Date |
|---|---|---|---|
| [[ADR-001 Native Rust mod with the typed API]] | Native Rust mod, typed API | accepted | 2026-11-09 |
| [[ADR-002 Pure core, thin glue]] | Rules in a pure crate, glue translates | accepted | 2026-11-09 |
| [[ADR-003 Hook points over raw injections]] | Catalog hooks only | accepted | 2026-11-13 |
| [[ADR-004 Obsidian vault as project memory]] | Numbered English vault | accepted | 2026-11-13 |
| [[ADR-012 Version numbers]] | Semver for 0.x, tag what was tested | accepted | 2026-11-13 |
| [[ADR-013 One combined hmod]] | Ship one `.hmod` with code and content | accepted | 2026-11-13 |
| [[ADR-014 Fresh start as Crimson Eclipse]] | New folder and name, blood moon as the stage | proposed | 2026-11-14 |
| [[ADR-015 Rendering through our own GPU passes]] | Signature looks through `RenderHooks` passes and real models | accepted | 2026-11-14 |
| [[ADR-016 C1 rise and the Pale Realm]] | Rise = C1 with real fissures opening onto the Pale Realm; its main structure is the Spire | accepted (its break replaced by ADR-017) | 2026-11-14 |
| [[ADR-017 The sky is a thick shell]] | The break is B1: one fracture network of facets and slabs; slabs crack, come loose and fall | accepted | 2026-11-14 |
| [[ADR-018 The Pale Realm lives in the far End]] | No custom dimension in Horizon: the Pale Realm is a mod-generated region of the End, reached by a real level change | proposed | 2026-11-14 |
| [[ADR-019 Structures for the blood moon]] | Structures join the mod: vanilla-format structures animated by our anchor blocks, ruins by day and awake under the blood moon | proposed | 2026-11-15 |
| [[ADR-020 Structure previews in real blocks]] | One shared preview engine: real vanilla blocks and states, our own blocks, everything on the grid, Minecraft light, vanilla textures read from the player's jar, never committed | accepted | 2026-11-16 |
| [[ADR-022 A structure wakes through its anchor]] | A hidden anchor block entity lights its structure's blocks (a generated wake table) under the blood moon; our blocks glow through `lit` states and emissive overlays | accepted | 2026-11-16 |
| [[ADR-021 One builder for the preview and the game]] | A structure is one builder in `preview/structures/`, drawn by its page and exported to the game's template with full states, loot, air, and a support check | accepted | 2026-11-16 |

ADRs 001 to 013 come from Cagebound (numbers kept, the Cagebound-specific ones left out).
