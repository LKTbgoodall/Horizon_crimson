---
tags: [home, moc]
updated: 2026-11-14
---
# 🌑 Crimson Eclipse: home

> **A blood moon mod for Horizon** (Minecraft Java 26.3 rewritten in Rust): on blood moon nights the world goes through spectacular events, the TikTok kind. Rendering first.
> This vault is the project's memory: read it instead of old conversations.

## 📍 Where we are
| | |
|---|---|
| **Phase** | **Phase 1** (2026-11-14). Bastien picked staging **C · The Abyss** from the preview (`preview/blood-moon-rise.html`). The repo skeleton, the pure core `crimson-core` (38 tests) and the glue 0.1.0 are written: night logic, `/crimson` test command, red fog, camera shake, and the **sky pass for staging C** (`sky_pass.rs`: one full-screen draw in `world_drawn`, WGSL ported from the preview). **0.1.0 ran in game** (2026-11-14, `cagebound-dev`): the pass draws, Bastien sent screenshots and four problems. **0.1.1** answers them (real moon path, amber moon, hash fix for white shapes, soft horizon, sound from vanilla events) and **0.1.2** removes the vanilla clouds during the blood moon (Bastien: they are in the way); **0.1.2 seen in game**: the moon is on the real one (confirmed), but the vanilla moon showed through ours during the omens; 0.1.3 fixed that (seen). **0.1.4** answers his look at 0.1.3: our own synthesised sounds (he disliked the nether portal noise), one-pass crack maths (amber shapes in the moon), a hush instead of the blackout (he disliked it), clean torn sky pieces; **0.1.5** fixes the stars he saw stretched in 0.1.4; checked and validated, not seen yet. His verdict on the sounds, the hush and the moon's cracks in 0.1.4 is still to come |
| **Proven before** | On Cagebound (same author, same Horizon pin `9f42064`): a typed-API native mod built and ran in game; block entity drawing, hologram text, coloured lights, glue checked against the pin before any build → [[From Cagebound]] |
| **Key choices** | Blood moon as the trigger for events ([[ADR-014 Fresh start as Crimson Eclipse]]); rendering through our own GPU passes ([[ADR-015 Rendering through our own GPU passes]]) |
| **Blocking** | Nothing |

## ➡️ Next step
1. **Bastien**: build **0.2.5** (shards that really break and fall, a window onto the Spire, clean big holes from falling shards, thin cracks opening big angular holes, crack sounds, hidden flying things, dawn sealing; `mod/README.md` § New in 0.2.5) and look at it in game. Build 0.1.5 was (`tools\build-mod.ps1 -Instance cagebound-dev`) and run the test in `mod/README.md`; confirm the name; still to tell: how the preview runs (frame rate), the sound direction, the eye's gaze rule.
2. **Claude**: fix what 0.2.0 shows in game; then port C1's eye, the god rays, crack sounds and shake (moon position, depth, colours), then bloom, burgundy foliage (`biome_colors`), embers, sound.

## 🗺️ Vault map
### 01 · Project
- [[Vision and goals]] · [[Roadmap]] · [[Open questions]] · [[Glossary]]

### 02 · Horizon (the platform)
- [[Horizon - Overview]] · [[Native mods - structure and manifest]]
- [[Horizon hooks and API]]: ⭐ the API reference (§ A8 spectacle toolbox, § C what the pin really has)
- [[Content mods and textures]] · [[Build, test and tools]] · [[Publishing and mod policy]] · [[Links and resources]]

### 03 · History
- [[From Cagebound]]: what worked in game, the traps, the GPU effects draft
- [[Lessons from Horizon Quests]]

### 04 · Design
- [[Concept]]: ⭐ the mod and Bastien's rules
- [[Events]]: ⭐ the event catalogue
- [[Blood moon rise]]: ⭐ spec of the rise (first impression)
- [[Rendering toolkit]]: how each look is made on Horizon

### 05 · Decisions
- [[Decision index]]

### 06 · Journal
- One note per session, `YYYY-MM-DD`

## 🔁 Session routine
**Start**: this page → the latest journal note → the [[Roadmap]].
**End**: journal, roadmap, this page, [[Open questions]], ADRs, Horizon notes if something changed.

## 📏 Conventions
- Every project file in **English**; chat with Bastien in French.
- Frontmatter: `tags`, `status`, `date` / `verified_on`, `source` for reference notes.
- API status: ✅ available · ⏳ pending · ❌ does not exist · ❓ unknown. Horizon facts name the commit they were read on.
