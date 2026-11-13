---
tags: [horizon, reference]
source: playhorizon.dev/docs, github.com/horizon-rust/horizon/docs (via Horizon Quests and Organa notes)
verified_on: 2026-11-13
---
# Horizon: overview

> « Horizon is Minecraft: Java Edition 26.3 rewritten in Rust. » It is installed through a small launcher and runs on the game files of **your own** copy of Minecraft.

## What it is (and what it is not)
- A **clean-room reimplementation** in Rust of the client, the game logic and a dedicated server (`horizon-server`). Not to confuse with Pumpkin, FerrumC or Valence, which are servers only.
- **NOT a modloader**: Java jars (Forge, Fabric, NeoForge) do not load and Java Mixins do not apply. Every mod is rewritten.
- Game version: **Java Edition 26.3 only**. Older worlds are upgraded.
- Platforms: Linux x86-64 (Vulkan), macOS 12+, **Windows x64 or ARM64** (Vulkan or DX12).
- Horizon license: **MIT**. It contains no Minecraft code or assets. Not an official product.
- Launcher seen on 2026-11-13: 0.2.63. Newest Nightly seen: `nightly-2026-11-13-9f42064` (the first with native `.hmod` content support in the game).

## Mod types
| Type | File | Content | For us |
|---|---|---|---|
| **Content mod** | `.hmod` | data only: blocks, items, models, recipes, loot tables, textures, lang (`horizon-mod.toml`) | our blocks, items, textures |
| **Native mod** | `.hnmod` | **Rust code compiled into the game** (`horizon-mixin.toml`), not sandboxed | ✅ all the behaviour |
| **Combined** | `.hmod` with `horizon-native.json` + `mixins/<id>/` + `assets/` + `data/` | code and content, same id in both manifests | 🎯 the file we ship ([[Lessons from Horizon Quests]]) |

Details: [[Native mods - structure and manifest]] · [[Content mods and textures]]

## Client and server sides
- A single binary contains several `Game`s: the window, the singleplayer integrated server and the dedicated server. Each hook declares its side (`server`, `client` or `both`).
- **Singleplayer / LAN host**: mods run in the host's game **and** in its integrated server.
- **Joining a server**: only client hooks act.
- **Dedicated server**: needs an engine export compiled with `--server-output` ([[Build, test and tools]]).
- Native mods are **not** part of the mod check at connection: no compatibility handshake yet.

## Stability
| API | Level |
|---|---|
| Native mod API | **experimental**, moves every day |
| `/api/v1` server control API | stable |

**Hook points** are only ever added and their contracts are frozen (a change produces a `_v2`). **Injections on raw functions** can break on every commit. → hook points only ([[ADR-003 Hook points over raw injections]]).

The newest model API (`bake_layer`, `draw_model_part`, `layer_definitions`, number `@API:model_layers@` at `fdc87ae`) is the one we lean on most for drawing mobs: the most likely to move. Recheck it at every re-pin.

## Ecosystem
- Catalog: https://playhorizon.dev/mods (158 projects, 133 native, on 2026-11-10). Notable ports: JEI, Create, AE2, Jade.
- Native publishing is open (submit page, human review of every line) → [[Publishing and mod policy]].

Links: [[Links and resources]]
