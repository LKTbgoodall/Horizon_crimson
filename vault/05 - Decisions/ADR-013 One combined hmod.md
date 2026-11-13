---
tags: [adr]
status: accepted
date: 2026-11-13
---
# ADR-013: One combined .hmod

## Context
The mod has code and content (textures, models, lang). Horizon Quests found (its ADR-014): a native registry entry may name a `.hmod` with content; the launcher snapshots it under `native-content/<id>/`. Launchers before the fix of horizon-rust/horizon#15933 (horizon-rust/horizon#16007) built the code and dropped the content.

## Decision
Ship **one combined `.hmod`**: `horizon-mod.toml`, `assets/`, `data/`, `horizon-native.json`, `mixins/<id>/` at the top level, same id in both manifests. The build script packs it; install may still cut it in two for older launchers.

## Consequences
- Check the launcher fix has shipped before relying on the single file.
- Fallback if needed: Horizon Quests' ADR-015 (embedding the content pack, AE2's method), which needs a raw injection and its own ADR here.

## Links
- [[Publishing and mod policy]] · [[Decision index]]
