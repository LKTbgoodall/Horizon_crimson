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
(0.1.1 plays these with vanilla sound events pitched down, as stand-ins; cues in `crimson-core::sound`.)
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
- Climax: about **2 s of total darkness**, then a flash and a **giant eye**, mostly cosmic (nebula iris, void pupil), opening over 2.5 s.
- Reference for every number: version C in `preview/blood-moon-rise.html` (`VERS[2]`, the `uVer==2` branches).
- A and B stay in the preview as a source of ideas (B's snap opening and shock wave), not as the plan.

## Next
- Preview page with **3 truly different stagings** of the full minute: done, `preview/blood-moon-rise.html` (A · The Wound, B · Shattered Sky, C · The Abyss; see the journal of 2026-11-14). Bastien picked **C**.
- In the preview the eye's pupil drifts toward where the player looks and narrows when the crosshair is on the moon: a proposal for "follows the player", to confirm.
