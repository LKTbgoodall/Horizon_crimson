---
tags: [horizon, links, reference]
verified_on: 2026-11-13
---
# Links and resources

## Project
- Repository: none yet ([[Open questions]])
- Sister project: Horizon Quests, `D:\dev\mod_minecraft\Horizon_quest`, https://github.com/LKTbgoodall/Horizon_quest. Its vault holds the full Horizon notes this one was distilled from (smp patterns, quest-specific API, release checklist).
- Old Organa folder (no git): `D:\dev\mod_minecraft\organa`. Prototype code worth reading: `crates/organa-core/src/specimen.rs`, `press.rs`, `mod/organa/api/src/menagerie.rs`, `glue.rs`, `diag.rs`, `tools/texgen/`, `tools/build-mod.ps1`, `mod/content/`. Its French vault is the raw history.

## Horizon: website
- Home: https://playhorizon.dev · Catalog: https://playhorizon.dev/mods · Submit: https://playhorizon.dev/mods/submit · Policy: https://playhorizon.dev/mods/policy · Hub (roadmap): https://playhorizon.dev/hub
- Docs: https://playhorizon.dev/docs (make-a-mod, mod-manifest, mod-code, test-a-mod, publish-a-mod, apis, content-mods)

## Horizon: GitHub
- Engine: https://github.com/horizon-rust/horizon (MIT). Hook catalog: `docs/native-mods.md`, `native-hooks.json`; hook code: `crates/horizon-client/src/game/native_hooks.rs`, `native_entities.rs`, `native_block_entity_draw.rs`, `native_mob_draw.rs`, `native_components.rs`; mobs: `crates/horizon-client/src/mobs/` (`render.rs`, `model_layers.rs`, `species.rs`); content format: `docs/mods.md`, `horizon-mods/src/content.rs`.
- Registry and tools: https://github.com/horizon-rust/horizon-mods (`native/tools/native.py`, examples `native/smp` and small ones)
- Mixins: https://github.com/horizon-rust/horizon-mixins
- Native mod template: https://github.com/horizon-rust/horizon-native-mod-template
- AE2 for Horizon (big native mod with content): https://github.com/Joeypc6/AE2-Horizon (read to understand; check its license before reusing anything)
- Discord: https://discord.gg/HcTeMZxe5E
- Useful old PRs and issues: #3996 block entities, #4055 slots, #5061 screens, #6216 typed API, #6300 blocks declared in code, #15933 / #16007 combined `.hmod` content.

## Local copies
Clone Horizon and horizon-mods **outside the repo or in `ext/`** (gitignored). The launcher also keeps the pinned source in `%APPDATA%\horizon-launcher\native\source\<rev>\`: read it there when it matches the pin.

## Commits seen
- `fdc87ae` (`nightly-2026-11-08`, API 411): what the Organa prototype was read and built on.
- `b5e7227` (`main` on 2026-11-09, API 415).
- `9f42064` (`nightly-2026-11-13`): Horizon Quests' current pin, first Nightly with native `.hmod` content.
