---
tags: [adr]
status: accepted
date: 2026-11-09
---
# ADR-001: Native Rust mod with the typed API

## Context
Horizon runs no Java mods. Behaviour (capturing mobs, ticking machines, drawing mobs in blocks, machine GUIs) needs code. Horizon offers three ways to write native code ([[Native mods - structure and manifest]]). Bastien chose Horizon knowing the mod can never enter a Java pack like ATM.

## Options considered
1. **Typed API** (`[api]`, `impl Hooks`): + every block entity, mob drawing and GUI hook is there; the Organa prototype built and ran with it / − some catalog hooks are not in the trait yet.
2. **Mixin bundle** (smp style, Horizon Quests): + reaches every catalog hook / − more boilerplate per hook.

## Decision
A native Rust mod written against the **typed API**, as the prototype. Hooks missing from the trait may go through a mixin helper in the same bundle when needed.

## Consequences
- Signatures come from the generated `Hooks` / `Host` traits of the pinned build: read them, never guess.
- The pure crate is copied into `api/src/` while `[api]` cannot depend on a `[[crate]]` (recheck at the new pin).

## Links
- [[Decision index]]
