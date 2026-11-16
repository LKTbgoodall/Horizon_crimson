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
- **His look at round 2 (2026-11-16)**: the temple and the citadel are empty and too plain ("unis"), no good. He likes the colossus a lot, but wants things inside to search (chests...) and is not a fan of its face. "Propose two other structures."
- **Round 3** in `preview/structures-round-3.html`:
  - **A · The Kneeling Colossus, deeper**: a new face (great helm, T-shaped visor, eyes burning deep in the slit, a crown of gold with crystal points) and a dungeon inside: a door between the knees, a stair tower, a spiral from a crypt under the dais (tombs, a treasure room behind iron bars, chests, barrels, eternal soul lanterns) up through a reliquary in the pelvis (shelves, chests, a table) to the heart chamber; a pilgrims' camp left behind outside.
  - **B · Wreck of the Sky Galleon**: a galleon of the old moon-watchers that fell from the sky, aground in a cradle of rock, foremast broken, port side torn open, cargo spilled. Hold of barrels, chests and moon crystal; gun deck with hammocks, tables, sea chests; captain's cabin behind gold-framed stern windows; a crow's nest with a chest. Awakening: crystal keel and figurehead light, lanterns, the bell, the whole ship lifts off its rocks and strains at its anchor chains.
  - **C · The Lantern Tree**: a colossal pale oak on arched roots, hung with dozens of iron lanterns; stairs wind up to two ring platforms with plank huts (a chest in each), a watch bell, cages hanging from the branches with loot; a hall inside the trunk; a ladder down to a crypt where the roots hold a crimson heart. Awakening: leaves turn blood red from the trunk outwards, lanterns light, eyeblossoms open, the heart beats, the bell rings.
- **His look at round 3 (2026-11-16, with screenshots)**: the colossus' head is not straight, and square on a round body; the galleon, no; the lantern tree he likes a lot, but wants "something mad at the top".
- **Round 4** in `preview/structures-round-4.html`:
  - **A · The Kneeling Colossus**: the whole statue now sits on one column of blocks (it was centred between two, so the T visor and the eyes were half a block off); a round helm (barbute) with the T visor, eyes deep in the slit (our helm eye block, eye on its front face only), a gold circlet with twelve crystal points set symmetrically, the tallest over the visor.
  - **B · The Lantern Tree** with its crown: a sealed pod of pale wood on top of a taller trunk; under the blood moon it turns to crystal and blooms, eight petals opening one after the other into a lotus, and in its heart an orb of crystal with one great iris that rises, turns its pupil to the moon and fires at it.
- **Kept (2026-11-16)**: the Kneeling Colossus. "Fais la vraie structure": **0.4.0 makes it generate in the world** ([[ADR-021 One builder for the preview and the game]]): template `kneeling_colossus.nbt` (56 × 63 × 58, 38 362 blocks, 31 containers with loot), rare in open biomes, static (day state); our blocks Crimson Crystal, Crystal Cluster, Crimson Vein, Helm Eye, Vigil Lantern. Its preview is now `preview/kneeling-colossus.html`. Not yet: the awakening (code), 64 px textures. The lantern tree is liked too: next candidate.

## What Bastien wants in a structure (learned from rounds 1 to 4)
- **Imposing**: big, a strong silhouette, readable from far (round 1 was too small and plain).
- **Never plain**: no wide walls of one block; mix materials, depth (pillars, buttresses, trims, recesses), details everywhere ("unis c'est nul").
- **Full inside, things to search**: rooms that make sense, chests, barrels, a treasure room, loot in odd places (cages, a crow's nest). An empty shell is a fail.
- A figure (the colossus) works for him; its face must look designed, not two red dots in a band.
- **Symmetric things are symmetric on the grid**: a figure or a face is centred on one column of blocks (odd width), so a visor, eyes or a crown line up. He notices half a block.
- **Shapes agree**: no square head on a round body.
- **Everything stands on something**: no cluster, point or plant floating or set on the wrong block; check it in code, not only by eye.
- **A crowning moment**: the top of a big structure must be something mad (the tree's blooming crystal lotus).

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
