---
tags: [design, events]
status: proposals
date: 2026-11-14
---
# Events

Back: [[Concept]]

Proposals for what can happen during a blood moon. Nothing picked yet. Each names how it would be drawn ([[Rendering toolkit]]).

| # | Event | What the player sees | How |
|---|---|---|---|
| 1 | **The rise** (always) | the moon turns red and grows, crimson sky and fog, darker grass, a slow heartbeat | sky / fog colour, live biome colours, our GPU pass over the sky, music layer |
| 2 | **The cracked sky** | cracks run across the sky around the moon like broken glass, with a deep crack sound; red light bleeds through | GPU pass on sky pixels (depth 0), shards as particles |
| 3 | **Blood meteors** | burning red streaks cross the sky; each impact: shock wave, camera shake, a smoking crater with a crimson crystal | GPU glow trail, shock wave pass, camera shake, crater blocks |
| 4 | **Crimson corruption** | from each crystal, red crystal spreads over the ground, trees crystallise, glowing veins pulse; harvestable; burns away at dawn | blocks set over time, emissive textures, coloured lights, glow pass |
| 5 | **Crimson monoliths** | giant crystal spires grow in pulses, beams to the moon, energy arcs between them | models, beam primitives, glow arcs |
| 6 | **Red lightning** | red lightning strikes leave glowing scorch marks and charged crystals | glow pass bolts, coloured light flashes, decals |
| 7 | **Rifts** | tears open in the air, reality swirls around them (the ground itself bends), mobs come out with glowing eyes | `world_warp` swirl, glow pass, spawns |
| 8 | **The watcher** | a pupil opens in the red moon and follows the player | GPU pass over the moon |
| 9 | **Crimson rain** | glowing red rain, puddles that reflect the moon | particles, glow |
| 10 | **The ground quake** | the terrain ripples in waves, faults glow from below | `world_warp` waves, glow |
| 11 | **Dawn's cleansing** (always) | a golden light wave sweeps from the horizon and burns the crimson to ash | GPU pass, block changes, particles |

Possible chain for a night: rise → cracked sky → meteors → corruption and monoliths → (rifts or red lightning) → dawn's cleansing.
