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
| **Phase** | **Phase 0: fresh start** (2026-11-14). Folder, vault and tools set up from Cagebound and Horizon Quests. No code |
| **Proven before** | On Cagebound (same author, same Horizon pin `9f42064`): a typed-API native mod built and ran in game; block entity drawing, hologram text, coloured lights, glue checked against the pin before any build → [[From Cagebound]] |
| **Key choices** | Blood moon as the trigger for events ([[ADR-014 Fresh start as Crimson Eclipse]]); rendering through our own GPU passes ([[ADR-015 Rendering through our own GPU passes]]) |
| **Blocking** | Nothing |

## ➡️ Next step
1. **Claude**: an animated preview page with 3 different stagings of the [[Blood moon rise]] (preview first).
2. **Bastien**: pick or mix one, confirm the name; then phase 1 ([[Roadmap]]).

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
