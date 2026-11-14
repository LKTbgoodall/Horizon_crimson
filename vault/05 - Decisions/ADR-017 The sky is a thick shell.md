---
tags: [adr, design]
status: accepted
date: 2026-11-14
---
# ADR-017: The sky is a thick shell that breaks in slabs (B1)

## Context
- [[ADR-016 C1 rise and the Pale Realm]] made the break out of fissure lines (polylines on the sphere) with pentagon shards stuck on them. Six versions in game (0.2.0 to 0.2.5) never looked like a real break: Bastien, on 0.2.5, "not realistic, not natural", and this is the most important part of the mod.
- Why it failed: the sky had no thickness; cracks and holes were two separate systems; the shell left standing never moved; pieces fell as flat shapes; everything glowed orange.
- `preview/sky-break.html` showed four candidates. Bastien picked **B1 · Impact glass, as first written** (he liked it better before it was tuned).

## Decision
- **One fracture network** decides everything: facets (one-pass Voronoi on whole cells, log-polar around the impact) grouped into slabs. Cracks are slab borders, a hole is a fallen slab's outline, a falling piece is that very slab.
- The **pure core** (`crimson-core::shell`) decides: the impact, when the crack front jumps, how far it runs per direction, each slab's centre, whether and when it falls, its dice. The **shader** finds the facet and slab of a pixel with the same integer hash and the plan's slab table, and draws.
- The Pale Realm, the Spire, the flying things and the dawn healing of ADR-016 stay.

## Consequences
- `fissures.rs` and its three storage buffers are gone; one buffer of 2360 floats.
- The facet search (25 hashed cells) runs on every sky pixel, up to four times on a hole pixel, plus once per falling slab near the pixel: the frame rate is to check in game.
- The facet hash exists twice (Rust and WGSL) and must stay bit-identical; only the Spire's slab depends on it on the Rust side.
- The impact is fixed in the sky; the moon moves on during the night and uncovers the fine facets at the impact.
