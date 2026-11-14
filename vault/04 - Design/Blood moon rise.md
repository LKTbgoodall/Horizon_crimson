---
tags: [design, events, blood-moon]
status: spec (from Bastien's answers, 2026-11-14)
date: 2026-11-14
---
# Blood moon rise

Back: [[Concept]] · [[Events]]

The rise is the first thing anyone sees of the mod, so it is **an event in its own right**. Bastien's words: something insane, people should be shocked and hypnotised by the show for the whole eclipse.

## Trigger
- **Full moon nights only**, so it stays rare (a chance roll on vanilla full moons; the exact odds are still open).
- Triggering it in other ways (ritual, item) is for later.
- **Test command**: jumps to dusk and forces tonight's moon to be a blood moon.

## Timeline
| Phase | When | What |
|---|---|---|
| **Omens** | sunset (tick 12200) | the sunset is too red, animals get nervous, a low sound in the distance. No text: you feel it coming |
| **Eclipse** | moonrise (ticks 13400 to 14600: the real moon is 10° up, then 30°), **about 1 minute**, slow | an eclipse shadow eats the moon while it **cracks**; the sky reacts the whole time (see below) |
| **The eye** | end of the eclipse (climax) | the moon **splits open like an eyelid** and an eye appears in the slit |
| **Night** | until dawn | the eye **follows the player**: it blinks now and then and its pupil shrinks when you stare at it |
| **Dawn** | sunrise | the eye closes, the crack seals up, a golden wave burns the crimson away ([[Events]] #11) |

## During the eclipse (all of these)
- Red sky and fog closing in.
- The stars go out.
- Grass and leaves darken to burgundy.
- Red moonlight across the whole world, with tinted shadows.
- A **flame corona** ripples around the shadow, with filaments stretching out.
- A **blood aurora**: red and black curtains dancing across the sky.
- **Cracks in the sky** that run out from the moon like glass.

## The eye
- **Style**: a mix of **reptile/dragon** (slit vertical pupil, orange-red iris, glowing veins) and **cosmic** (the pupil is a black-hole void, the iris holds a red nebula with stars).
- It opens in a crack across the moon, which stays whole otherwise: a lid, not a shatter.

## Sound
(Cues in `crimson-core::sound`. Bastien turned down vanilla noises (the nether portal's): since 0.1.4 the sounds are the mod's own, synthesised by `tools/make-sounds.py`.)
- A heartbeat that starts slow and speeds up through the eclipse.
- A low rumbling drone that builds.
- A **huge crack** at the climax, echoing in the distance.

## Player experience
- **The player stays in control**: nothing takes the camera. The show is meant to be strong enough that people stop on their own. No mob spawns during the eclipse minute.
- **Seen from everywhere**: red light comes in through windows and the sound carries through walls, so people want to go outside.

## Chosen staging: C · The Abyss (Bastien, 2026-11-14)
Bastien's words: C is extraordinary; he loves **the sky breaking and showing space behind it**. That torn sky is the signature of the rise: keep it, and push it rather than tone it down.
- The moon **swells** (about 2.4 times) as it rises while a **spiral void** eats it from the centre.
- Stars are **dragged toward the moon** and stretched before they go out.
- Sky cracks are a **spider web** (radial lines and ring segments) centred on the moon; **cells of the web tear open on a void** with a violet nebula and stars.
- Aurora in **spiral arms** around the moon; corona as a swirling accretion ring.
- Climax: ~~about 2 s of total darkness~~ **a hush** (Bastien, in game: the blackout is "chelou", not a fan): for about 2 s the corona falls back into the moon, the light dips to 70 %, the sound stops; then a flash and a **giant eye**, mostly cosmic (nebula iris, void pupil), opening over 2.5 s.
- Reference for every number: version C in `preview/blood-moon-rise.html` (`VERS[2]`, the `uVer==2` branches).
- A and B stay in the preview as a source of ideas (B's snap opening and shock wave), not as the plan.

## Climax push (2026-11-14)
Bastien on C in game: cool, but not masterclass enough; he asked for something truly incredible, naming the break behind the moon and the eye opening. Three candidates in `preview/abyss-climax.html` (same minute, only those two moments change):
- **C1 · Shell of Light**: the sky is a shell with blinding light behind it. Impact-glass cracks run from the moon, white-hot at the tip then cooling red; at the climax the near shards blow out and god rays pour through (and through the trees). The eye strains open against strands of flesh that stretch and snap, snaps wide with an overshoot, a third eyelid sweeps across, then the pupil locks on.
- **C2 · Glass Abyss**: shards bend the sky behind them, glint and split light like a prism, then fall away in a wave onto deep space (galaxy spiralling into the moon). No lid: the void that ate the moon was a pupil dilated in the dark; at the flash it snaps into a slit on a spring and the iris ignites, hottest where just uncovered.
- **C3 · The Sky Opens**: one jagged rift grows across the sky in steps on the heartbeat; at the climax it lights up horizon to horizon and the sky opens like an eyelid (~110° wide). The moon becomes the pupil of an eye the size of the sky, which follows the player.
- Shared tech: crack network is one-pass F2-F1 Voronoi in log-polar coordinates (radial axis squeezed 0.42, jittered) on integer PCG hashes; god rays are one radial blur of the bright pass toward the moon (extra pass in `world_drawn`, ❓ in game).

### Bastien's pick: C1, with real fissures (2026-11-14)
He prefers **C1**, but disliked the web around the moon: it moved with the moon and only grew outward, so it did not read as the sky breaking. What he loves in C3 is that a **real crack is created**. So C1's break is now:
- **Fissures fixed in the sky** (world directions), never in the moon's frame. Each is a jagged polyline (random walk on the sphere, step 0.03 rad, kinks) planned once on the CPU (`planFissures` in the preview; in game: the pure core) and drawn from a segment texture, chunks of 8 with a bounding cap.
- **Every crack has a visible cause**: born at the moon's edge or off an existing crack, on a heartbeat. Its tip runs fast then slows (bright flare at the tip, a crackle, a small flicker of light and shake), then it stays where it was born while the moon rises on.
- **A main fault** torn from the moon on both sides, climbing into the sky, pushed further in six stages (C3's rift idea); branches split off it; more cracks leave the moon's edge, faster near the climax.
- Cracks widen and their glow spreads with age (light seeping through). At the climax 14 cracks shoot out all around the moon at high speed, then branch; a few shards next to the moon blow out onto the light. The moon-centred web only exists in that small blown-out zone after the climax.
- The eye (strands, third eyelid, lock-on) is unchanged.

### Behind the shell: another world (2026-11-14)
Bastien: much better, but inside the breaks it is just light; he wants things passing behind, as if it were another world. Now the holes and the old, wide fissures open onto **the other side** (`otherSide` in the preview, world-fixed azimuth / elevation, it follows neither the moon nor the camera):
- Its own abyss: dark crimson and violet, with stars and a far red sun.
- **An upside-down land** hanging over it: dark rock, hanging spires, lava rivers, little lights, its edge lit from below.
- **Leviathans** swimming past: a near one crossing behind the moon through the eclipse and the night, a far hazy one going the other way. Dark silhouette lit from behind, spines on the back, fins below, rows of glowing spots, a glowing eye.
- Hole edges are thin and hot now; the shell's thickness shows as shadow inside the edge. The corona and the flash stay on our side of the shell (they do not cover the holes). Blown shards vanish whole.

### One system: the fissures open (2026-11-14)
Bastien on the previous version: messy; no leviathan visible; breaks next to things that are not breaks, hexagons; one crack unlike the others (the wide bands of the climax web); zones that are neither sky nor the other world (shaded cell edges). So C1 now has **one crack system only**:
- The moon-centred cell web is gone from C1 (C2 and C3 keep theirs). No more hexagons: the land's lava is ridged noise, not Voronoi.
- **The fissures themselves open**: the two lips part into a lens (widest in the middle of the crack, closed at the tips), a little through the eclipse, wide at the climax. The whole crack is one shape (union of its segments) so the lips are clean. Inside: the other world, with the lips' thickness in shadow; outside: a thin hot rim.
- Openings: main fault 0.08 rad, climax cracks 0.014 to 0.03, moon-edge cracks 0.01, branches 0.006.
- **The other world is anchored to the main fault**: its frame is the great circle through the fault's ends, and the fault's own line inside it (48 samples). So the upside-down land hangs over the rift, a glow runs along it, and the leviathan swims along it: it enters at the right around 1:20, its head reaches the moon around 1:32 and it passes behind. It is big (half the rift's height), dark against the glow, spots and a glowing eye.
- Preview aid: `?dbg=1` shows the other world everywhere.
- The upside-down land is only a band (0.07 to 0.12 rad thick) hanging over the rift, not a lid over everything above it (Bastien saw the upper windows full of black and orange rock instead of the violet). Higher up: the violet abyss, with far floating islands (upside-down mountains, hazy). *(Superseded by the ocean, below.)*

### The other world is an ocean (2026-11-14)
Bastien: the leviathan is just a black shape; he wants something almost realistic, a dragon or a sea monster like the Loch Ness one, living in its own world (not glued to the rift, passing behind it); drop the black and orange rock; no stars, no cosmos look: a real other universe.
- **Art direction**: a cold, deep **ocean** in teal and blue-green, lit from a surface far above: light shafts, rippling caustics near the top, drifting particles, depth haze. Teal through red cracks is the strongest "other universe" contrast we have. No rock, no stars, no red sun; the fault-anchored frame is gone (world-fixed azimuth / elevation).
- **The creature**: a sea serpent seen side-on, drawn as a shaded tube lit from above. Dark olive-brown back with mottling and overlapping scales, pale belly with ventral plates, bony knobs along the back, broken wet sheen, caustics on its back. It has a translucent red-orange dorsal frill on spines, two pairs of rowing fins with bony rays, a tail fin, and a dragon skull (snout, nostril, jaw line, brow, amber slit eye, two swept-back horns). The swimming wave runs down its body.
- **Its own path**: the near one (1.6 times bigger) crosses from right to left from 1:00 to 1:44 and passes behind the moon around 1:30; a far one, smaller and hazy, goes the other way higher up. Seen only through the openings.

### Not an ocean: three worlds to pick from (2026-11-14)
Bastien turned the ocean down ("trouvons autre chose"). Rather than guess again, C1 now has **three other-world candidates** (buttons W1 to W3, key W, `?w=1..3`). The serpent dragon stays in all three (now flying); its light and skin come from the world (`gLc`, `gBack`, `gBelly`, `gFrill`, `gDap`):
- **W1 · Storm Realm**: slate storm clouds drifting, lightning every 2 to 3 s lighting the clouds from inside, visible bolts, rain in front; the dragon (slate, deep red frill) is lit by the flashes.
- **W2 · Pale Realm**: bone-white fog, a black sun with a thin bright ring, giant ribs rising far off in the fog, drifting ash; a pale dragon.
- **W3 · Upside-down Overworld**: another overworld in broad daylight hanging over the sky, seen from below: blocky ground (grass, forests, water, sand) 12 blocks up, blocky clouds under it, blue sky; a green dragon flies below.

**Bastien's verdict (2026-11-14)**: no to the upside-down overworld (removed). Yes to Storm. Pale is the most interesting (a truly white world, to push), but you could not see anything: it must show that a real world is there, not a white backdrop. And the long-term goal: **players will be able to go into this other world later**, so it must be a real place.
- **Pale Realm, now a place**: its own horizon (0.24 rad up in our sky) and ground, pale dunes running to it in perspective in the fog. Black monoliths with broken tops stand at distances from 44 to 110, and the ribs of something huge are half buried at 42. A **colossus** walks slowly far off (distance 85, about 37 units tall): long legs striding, long arms, head in the fog; it crosses behind the moon area during the night. In its sky: a bigger black sun with a thin bright ring and fine rays, floating black shards, drifting fog banks, ash; the dragon turns dark so it stands out on the white.
- **Bastien loves it** ("c'est ce que je recherchais"). His notes, applied:
  - The near serpent passing right in front: too close, removed. The far one, high and hazy, is "masterclass" because it is far: we are just there, watching. Now two far ones on different paths.
  - The block monoliths: useless, removed.
  - The big arched shapes behind (he reads them as a Stranger Things-like demon form): keep. The colossus stays too.
  - No ground: we are looking at the sky, so it is the other world's sky. Far below, thick fog; the ribs and the colossus rise out of it, as if the ground were much lower (later: tops of structures are fine, a ground is not).
- **Next pass (Bastien: "on commence à tenir un truc")**: the arched demon shapes are too big and on both sides, too much: removed. The stick-figure colossus showing its feet: no. Now **one supernatural presence**: a giant **Minecraft-like mob** (blocky: cube head, box torso and limbs; probably a mob Bastien will add), **far and hazy** so it cannot be made out well and can be modelled freely later, but clearly something walking, and imposing. Its feet are far below, lost in the fog (the ground is much lower); only its upper body shows, striding and bobbing, with two faint eyes. It walks through the big right-hand window during the night (from about 1:18 to the end).
- Bastien: you can still read the cubes; it must be **a shadow that walks**. Now: no edges (very wide soft falloff), no eyes, a darker blur whose opacity breathes with the fog. The blocky proportions stay underneath, only as a hint.
- Bastien: still reads as a cubic character; wants **a black shadow with two eyes you notice**. Now an organic, near-black figure: round head, tall body, long thin arms, all smoothly merged, smoky edges rising, the bottom dissolving into the fog; two bright white eyes with a faint halo that blink now and then. Distance 85, it walks through the big right window at night.
- **The main structure** (Bastien, 2026-11-14): the Pale Realm needs its main structure, probably the heart of the zone players will go to: high and imposing, seen from the sky. Four candidates in the preview (buttons S1 to S4, key S, `?s=1..4`), all dark silhouettes far off on the left of the moon, base lost in the fog, glimpsed through the cracks:
  - **S1 · Spire**: a colossal black needle tower with ledges and side spikes, two broken rings turning slowly around it, a pale light pulsing at the tip.
  - **S2 · Gate**: a giant arch on two pillars with capitals and a spiked crown; inside, a swirling black void with specks (a way through, fits the travel idea).
  - **S3 · Floating citadel**: an upside-down mountain floating over the fog, towers with pointed roofs on top, chains hanging down into the fog, slowly bobbing.
  - **S4 · Dead tree**: a colossal black tree, branches spreading across the white sky, swaying a little.
  - **Bastien picked S1 · Spire** (2026-11-14) → [[ADR-016 C1 rise and the Pale Realm]]. The other candidates stay in the preview for reference.
- Default world is now W2 (`?w=1` for Storm). Ground objects use local units at their own distance, so they can later become real places in a dimension.

### First look in game, 0.2.0 → 0.2.1 (2026-11-14)
Bastien's screenshots of 0.2.0: the openings looked like blobs ("des pâtés"), not breaks; a big hole where the moon had been (crack roots ringing its old place); no sound on new cracks; remove the tall shadow; and the monsters were too visible: people must not know what awaits them.
- **Cracks**: openings cut to about a third, lips faceted (piecewise straight width, no smoothing), cracks start under the moon (no empty disc). A sound per crack (`fissure.ogg`) and a small jolt.
- **What flies there**: three winged things roam the Pale Realm's fog all night, on wrapping paths, never stopping. They are invisible except when a flash lights the fog right behind one (every 6.5 s or so, behind the one nearest the moon): for about 1.5 s, an abstract black winged shape against the light. Like seeing a shape in a cloud in a lightning flash. The flash leaks through the cracks near it.
- Removed: the black shadow walker, the far serpents (the Spire stays).
- **0.2.1 seen in game**: the holes were too small to see the other world and the lens-shaped openings still did not look like real breaks (tubes, veins). 0.2.2: thin crack lines again, and the holes come from **falling shards**: convex pentagons with one side on a crack, straight edges and corners, breaking off on either side of the main fault every few steps (bigger further out), on some moon cracks and on most climax cracks; a few fall during the eclipse, most at the climax; each drops out over 0.3 s with a burning edge, and closes at dawn.
- **Dawn** (Bastien, seen at sunrise in 0.2.0): the holes close and vanish. `fissures::seal`: the lips close over the first 20 s of dawn (tick 22800) with a golden seam along each crack, the lines fade 15 s later, before sunrise.

## Next
- Preview page with **3 truly different stagings** of the full minute: done, `preview/blood-moon-rise.html` (A · The Wound, B · Shattered Sky, C · The Abyss; see the journal of 2026-11-14). Bastien picked **C**.
- In the preview the eye's pupil drifts toward where the player looks and narrows when the crosshair is on the moon: a proposal for "follows the player", to confirm.
