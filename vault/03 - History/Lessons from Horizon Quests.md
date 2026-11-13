---
tags: [history, lessons]
status: reference
date: 2026-11-13
source: Horizon_quest vault (Home, journal 2026-11-10 to 13, ADR-003/013/014/015, Build, test and tools)
---
# Lessons from Horizon Quests

Back: [[00 - Home]]

Horizon Quests (`D:\dev\mod_minecraft\Horizon_quest`) is Bastien's FTB Quests-style native mod: from nothing to v0.20.0 in four days (2026-11-10 to 13), tested in game in solo and LAN, feature-frozen for 1.0.0. What carries over:

## Workflow
- **The vault as memory** works: read Home and the latest journal first, write the journal and Home at the end. Kept here ([[ADR-004 Obsidian vault as project memory]]).
- **Commit and push after each step**, without asking: Bastien tests by pulling on another PC. English commit messages, LKTbgoodall as the only author, no attribution lines.
- **Visual choices: preview first.** Bastien turned down several looks only after seeing them coded. Show a faithful HTML preview page with candidates (as for the dependency lines, picked from a preview page) before coding any style. Previews kept in the vault.
- Bastien gives feedback as numbered points after a test; each point becomes a fix or a question. He delegates creative choices but turns down what he finds ugly or illogical, quickly.
- Version numbers ([[ADR-012 Version numbers]]): x.y.Z fix, x.Y.0 feature, 1.0.0 public. Bump when coded; tag only what was tested in game.

## Code
- **Pure modules + thin glue**: hundreds of tests run without the game. Same rule here, in a pure crate ([[ADR-002 Pure core, thin glue]]).
- **Type-check the glue before asking for a test** (`tools/check-glue.ps1` / `.sh`): it caught a real break a stub had missed. Never call engine methods outside the catalog.
- A bundle module must not use `include_str!`, `#[path]` or an external `mod`, even in tests (`E_MODULE`).
- No dead-code allowances, no warning: the build uses `-D warnings`.
- Single-player host vs LAN guests behave differently in many hooks (XP, advancements, inventories): test both.
- GUI textures over 1024 × 512 are silently dropped from the atlas (lines vanished once).
- `horizon-ctl` can drive a built game and take screenshots: use it to check looks before bothering Bastien.

## Shipping
- **One combined `.hmod`** (content + code) is the file to publish ([[ADR-013 One combined hmod]]). Launchers before the fix of horizon-rust/horizon#15933 (fix: horizon-rust/horizon#16007) built the code but dropped the content; check the fix has shipped in a launcher release before relying on it.
- Re-pin on the newest Nightly before submitting: the registry compiles there.
- The registry accepts native mods (human review of every line).
- Keep README, CHANGELOG, a making-of doc and a release checklist (`release/`) from early on.

## Tools to copy and adapt in phase 1
From `Horizon_quest/tools/`: `build-mod.ps1` / `build-mod.sh` (package, combined `.hmod`, install, build), `check-glue.ps1` / `check-glue.sh` (glue type-check). Adapt to the typed API (`[api]`) and to copying the pure crate in, as Organa's script did.
