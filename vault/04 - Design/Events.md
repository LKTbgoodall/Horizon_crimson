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

## Crossing to the Pale Realm (proposals, 2026-11-14)
Bastien's goal: the player can go to the other world (the Pale Realm, seen through the broken sky). Six candidates, none picked yet:

| # | Name | Trigger | What the player sees |
|---|---|---|---|
| P1 | **The Upfall** | a sky shard (dropped by falling shards) used under a hole in the sky | gravity flips, the player falls up toward the hole, the Overworld spins away below, crossing the thick shell, landing upside down on the dunes |
| P2 | **The Blood Fault** | an eclipse blade struck into the ground | a glowing red fault zigzags 30 blocks, the ground splits and blocks fall into a void; below, the Pale Realm's sky, upside down; the player jumps, the camera flips mid-fall |
| P3 | **The Moon Beam** | four crimson crystals placed in a ritual circle at the peak | beams rise to the moon, the moon answers with a pillar of red light, the player is lifted up the beam through a hole in the sky |
| P4 | **The Swallowing Eye** | looking at the watcher's eye too long (or an offering) | the pupil dilates, the moon comes down and fills the screen, the player is swallowed through the pupil |
| P5 | **The Blood Mirror** | a pool of blood (crimson rain) reflecting the moon | the reflection shows the Pale Realm instead of the sky; the player sinks into it, the camera goes under, the world flips and they rise out of the Realm's own pool |
| P6 | **The Tear** | a crimson gauntlet, hold and drag | the air rips like fabric and glass along the drag, burning edges, the Pale Realm behind it with its own light and wind; the player steps through |

Technical question: can Horizon host a real custom dimension, and teleport into it? → [[Open questions]].

### Bastien's verdict on P1-P6 (2026-11-14)
All "mid, no real animation", except the ground fault (P2), which needs a huge animation with real blocks. Four fault candidates in `preview/the-fault.html` (real instanced blocks, every motion in the vertex shader, scrubbable timeline), all ending with the same dive into the fault, a turn-over and the Pale Realm:

| # | Name | The opening |
|---|---|---|
| F1 ✅ picked (big) | **The Strike** | a red bolt from the moon, a shock wave ripples the land, the fault races out both ways, the ground crumbles block by block with glowing edges, the lips keep breaking off |
| F2 | **The Upheaval** | the ground swells along a line with spreading glowing cracks, then erupts; hundreds of blocks stay hanging over the chasm, turning slowly |
| F3 | **The Tectonic Tear** | three jolts pull the two plates apart, the edges bend down, lava pours from the walls, crimson crystals grow out of the rock |
| F4 | **The Maelstrom** | the top of the fault is torn into a spinning helix of blocks sucked down along the chasm into the light |
