---
tags: [adr]
status: accepted
date: 2026-11-09
---
# ADR-002: Pure core, thin glue

## Context
Horizon's mod API changes every day and the mod crate cannot be tested without the game. The game rules (specimen moves, cycles, levels, transport) must be trustworthy: the invariant depends on them.

## Decision
All rules live in a **pure crate** (`crimson-core`): no dependency, no Horizon type, deterministic, tested with `cargo test` and fuzz. The hook layer translates events into core calls and applies the results; it does not decide.

## Consequences
- + Fuzz finds real bugs (Organa's found an item loss at save time).
- + A Horizon API change touches the glue only.
- − Some duplication of types between core and glue.
- The glue is type-checked against the pin before any in-game test ([[Build, test and tools]]).

## Links
- [[Rendering toolkit]] · [[Decision index]]
