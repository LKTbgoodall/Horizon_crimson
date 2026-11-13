---
tags: [adr]
status: accepted
date: 2026-11-13
---
# ADR-012: Version numbers

## Decision
As Horizon Quests (its ADR-013, accepted by Bastien):
- **x.y.Z**: a small addition or a fix.
- **x.Y.0**: a new feature.
- **1.0.0**: the first public release on playhorizon.dev.
- Bump when coded, tested in game or not; the journal says what is still to test. A git tag marks only versions tested in game.

## Consequences
- Every number goes into the manifests, the content `horizon-mod.toml` and the code's version constant together.

## Links
- [[Decision index]]
