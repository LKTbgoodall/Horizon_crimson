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

## Next
- Preview page with **3 truly different stagings** of the full minute: done, `preview/blood-moon-rise.html` (A · The Wound, B · Shattered Sky, C · The Abyss; see the journal of 2026-11-14). Bastien picked **C**.
- In the preview the eye's pupil drifts toward where the player looks and narrows when the crosshair is on the moon: a proposal for "follows the player", to confirm.
