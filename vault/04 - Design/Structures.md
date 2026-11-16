---
tags: [design, structures, catalogue]
status: brainstorm
date: 2026-11-15
---
# Structures

Back: [[Concept]] · How they are made: [[How a structure is made]] · How each motion is drawn: [[Rendering toolkit]]

## Bastien's brief (2026-11-15, his words, translated)
He first wanted a separate structures mod, then: "we'll do it all in Crimson, they'll be structures for the mod".
- "Really about structures", "mega stylish", "masterclass", "with animations".
- "Little structures everywhere", "very, very stylish ones", "sometimes immense things".
- "Suggest ideas, ask me questions, we do it together."

## Bastien's answers (2026-11-15)
- Awake under the blood moon or always alive: **both, depending on the structure**.
- Gameplay to start: **scenery and loot**.
- Workflow: Claude proposes, we refine together, Claude codes, Bastien edits in game or says what to change.
- **First structure: a stylish abandoned building, quite big.** Round 1 in `preview/abandoned-building.html`.
- **His look at round 1 (2026-11-16)**: the observatory, he does not much like; the chapel is not good enough; the manor is empty and looks like a school, not imposing. "Propose other things."
- **Round 2** in `preview/grand-structures.html` (imposing, furnished inside, real blocks on the grid):
  - **A · Citadel of the Vigil**: a fortress on a hill, 63 × 63, 62 high: crenellated walls, four round towers with witch-hat roofs, a gatehouse with a portcullis, a 45-block keep (great hall with long tables, throne, chandeliers, fireplace; library and armoury; a crystal chamber). Awakening: portcullis rises, braziers catch round the walls, keep doors open, lanterns and windows light floor by floor, the crystal crown on the roof lifts and fires at the sky.
  - **B · The Kneeling Colossus**: a 55-block stone knight kneeling on a round dais, hands on a crimson crystal sword, a crystal heart in his chest seen through a crack (loot inside), a red cape. Awakening: braziers round the dais, the heart beats, red veins spread from it, the sword lights from point to pommel, the eyes open, the head lifts to the moon.
  - **C · Temple of the Red Moon**: a black-and-gold stepped temple, 57 wide and 30 high, a grand stairway, an avenue of obelisks between two long pools, a hall of pillars and tombs inside, a shrine on the summit, a great ring floating above. Awakening: obelisk tips light towards the temple, pools turn to blood, braziers climb the stairs and tiers, the altar crystal fires through the shrine into the ring, the ring turns and sends the beam to the moon.
- Vanilla villages allowed later; first something of our own.

## The idea that ties them to the mod (proposed)
**By day they are ruins; under the blood moon they wake up.** The Overworld's structures are what is left of the people who watched the red moon before us: quiet, mossy, cracked by day. When the moon turns red they come alive with it (crystals rise, eyes open, bells toll, beams reach for the moon) and fall asleep again at dawn's cleansing. The Pale Realm's structures (the Spire, monoliths, ribs) are the other side: always alive, and seen through the broken sky before they are reached.

Three sizes: **small** (common, everywhere), **medium** (rare, a destination), **immense** (very rare, a landmark seen from far).

## Small: common, everywhere (Overworld)
| # | Name | By day | Under the blood moon | Tech |
|---|---|---|---|---|
| S1 | **Moon altar** | a black-stone altar with a dull red crystal | the crystal lifts, spins and sends a thin beam to the moon | anchor block, model, beam primitive, light |
| S2 | **Weeping obelisk** | a cracked obelisk | its cracks bleed red light, red drops fall from them | emissive model, particles |
| S3 | **Vigil lanterns** | a dead tree hung with iron lantern cages | the lanterns turn red, swing toward the moon, creak | articulated models, lights, sound |
| S4 | **Fallen shard** | a slab of pale glass stuck in the ground (a piece of the sky's shell) | it glows and shows the Pale Realm inside it, like a window | model + small GPU window (reuses the sky pass' Realm) |
| S5 | **Bone ring** | giant ribs half buried in a circle | the ribs glow from inside, a slow heartbeat | models, light, our heartbeat sound |
| S6 | **Watcher's pillar** | a pillar with a carved closed eye | the eye opens and follows the player, like the moon's | articulated model (lid, pupil) |
| S7 | **Old crater** | a grassy crater with a dead crystal | the crystal pulses again and veins light up across the crater | emissive blocks, lights |

## Medium: rare, a destination (Overworld)
| # | Name | By day | Under the blood moon | Tech |
|---|---|---|---|---|
| M1 | **Moonwatch observatory** | a ruined observatory on a peak | the dome opens by itself, the telescope tracks the red moon; looking into it shows the eye up close | models, moon angle (§ A8), GPU lens |
| M2 | **Chapel of the Eclipse** | a gothic chapel, sealed doors | red stained glass lights up, bells toll at the rise, the doors open onto an altar (loot, ritual) | lights, models, block edits, sounds |
| M3 | **Chained monolith** | a black monolith hanging in the air, held by four chains | it strains upward toward the moon, the chains tighten and grind | models, sounds, shake |
| M4 | **Vigil bell tower** | a tall bell tower | its bell rings the rise for the whole region (heard far): the warning | articulated bell, far sound |
| M5 | **Eclipse well** | a deep stone well | a pillar of red light rises from it to the sky | GPU beam, particles |
| M6 | **Sleeping head** | a colossal stone head, half buried, mossy | its eyes light red and turn to the player | models, lights |

## Immense: very rare, landmarks seen from far
| # | Name | Where | What makes it a wonder | Tech |
|---|---|---|---|---|
| L1 | **The Spire** (decided, [[ADR-016 C1 rise and the Pale Realm]]) | Pale Realm | the colossal black needle seen through the sky, broken rings turning around it, a pale light at the tip; the heart of the Realm | pure generator + `edit_blocks`, GPU rings |
| L2 | **The Frozen Fault** | Overworld | the scar of an old fault (F1/F2 of [[Events]]): a canyon where hundreds of blocks still hang in the air, turning slowly over a crimson glow; under the blood moon it can open toward the Realm | jigsaw + anchors, GPU glow, `world_warp` |
| L3 | **Kneeling Colossus** | Overworld | a ~150-block titan of black stone kneeling on a planted sword, a crimson crystal heart; under the blood moon the heart beats and the eyes light up, seen from far; a dungeon inside | jigsaw pieces, GPU glow, awakening |
| L4 | **Moon Anchor** | Overworld | a tower of rings pointing at the moon; at the blood moon the rings spin up and fire a beam into it | GPU rings and beam, models |
| L5 | **Fallen slab** | Overworld | a huge piece of the sky's thick shell ([[ADR-017 The sky is a thick shell]]) that fell and half buried itself; its cracks shine with the Realm's light | jigsaw, GPU window |
| L6 | **The Ribs** | Pale Realm | the fossil of a world-serpent, ribs as arches over the dunes | pure generator |
| L7 | **Black sun temple** | Pale Realm | a temple under the black sun, its ring reflected in a still pool | pure generator, GPU |

## Notes
- Small ones are the volume: they make the world feel watched. Medium ones are reasons to travel. Immense ones are what people film.
- Overworld structures go through worldgen (content half); Pale Realm structures through the Realm's pure generator ([[ADR-018 The Pale Realm lives in the far End]]).
