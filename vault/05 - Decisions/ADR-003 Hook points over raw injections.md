---
tags: [adr]
status: accepted
date: 2026-11-13
---
# ADR-003: Hook points over raw injections

## Context
Catalog hook points (`native-hooks.json`) are only ever added and their contracts are frozen. A raw `target` injection can break on any commit. Engine methods outside the catalog can be private (`native_as_player` broke a Horizon Quests build).

## Decision
Use **only catalog hook points and helpers**. ⏳ pending hooks (no number) are not used. A raw injection only as a last resort, with its own ADR.

## Consequences
- + Re-pinning is cheap.
- − Some features wait on hooks or need fallbacks.

## Links
- [[Decision index]]
