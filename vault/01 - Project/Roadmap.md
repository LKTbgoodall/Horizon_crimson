---
tags: [project, roadmap]
status: living
updated: 2026-11-14
---
# Roadmap

Back: [[00 - Home]]

## Phase 0: fresh start ✅ (2026-11-14)
- [x] Folder, vault, tools copied and renamed from Cagebound
- [ ] Bastien picks the first events and confirms the name

## Phase 1: the rendering base and the blood moon 🔴
- [ ] Animated preview of the blood moon and the chosen events; Bastien picks
  - [x] Rise preview page, 3 stagings: `preview/blood-moon-rise.html` (2026-11-14)
  - [x] Climax push of C, 3 candidates (C1 Shell of Light, C2 Glass Abyss, C3 The Sky Opens): `preview/abyss-climax.html` (2026-11-14)
  - [x] Bastien picks a climax candidate: **C1**, with real fissures fixed in the sky instead of the moon-centred web (2026-11-14)
  - [x] C1 reshaped with Bastien: real fissures opening onto the Pale Realm, far serpents, a black shadow walker, the Spire (2026-11-14, [[ADR-016 C1 rise and the Pale Realm]])
  - [x] Port to the mod, first step (0.2.0, 2026-11-14): fissure planner in `crimson-core` (`fissures.rs`, 7 tests) + two storage buffers, opening lenses, the Pale Realm (sky, black sun, shards, Spire, shadow, far serpents) in `sky_pass.rs`. Checked (fmt, clippy, tests, shader, glue), not seen in game
  - [x] The break redone after 0.2.5 ("not natural"): `preview/sky-break.html`, Bastien picked **B1 · Impact glass** (first version); ported as 0.3.0 (`crimson-core::shell`, 11 tests; `sky_pass.rs`), [[ADR-017 The sky is a thick shell]]. Checked (fmt, clippy, tests, shader, glue), not seen in game (2026-11-14)
  - [x] 0.3.0 seen in game (Bastien, 2026-11-14): it runs, "much better, I like it much more"; three things to fix
  - [x] 0.3.1: cracks as rays and cross cracks (no spreading patch), holes only high in the sky and fewer, whole sky under the moon. Checked, not seen in game (2026-11-14)
  - [x] 0.3.1 seen in game (Bastien, 2026-11-14): a thin dark line across the holes; the sky may break under the moon
  - [x] 0.3.2: the line fixed (a fractional power of 0 at the Spire's tip), slabs under the moon fall at the climax. Checked, not seen in game (2026-11-14)
  - [x] 0.3.2 seen in game (Bastien, 2026-11-14): a pinwheel at the zenith in a hole; the low sky looks poor from a mountain
  - [x] 0.3.3: zenith noise on a flat map, cracks fade into the haze near the horizon, graded haze below it. Shader and glue checked, not seen in game (2026-11-14)
  - [x] 0.3.4: the vanilla moon's square hidden where it shows through far water under the horizon (`unmoon`). Shader and glue checked, not seen in game (2026-11-14)
  - [ ] Port the rest: C1's eye (strands, third eyelid, lock-on), the god-ray pass, crack sounds and shake
  - [ ] Check whether a native mod can add a dimension (travel into the Pale Realm)
  - [x] Bastien picked **C · The Abyss** (2026-11-14)
- [x] Repo skeleton: workspace, pure crate `crimson-core`, bundle `mod/crimson_eclipse` (typed API), content mod (manifest only) (2026-11-14)
- [x] Pure core: when a blood moon happens, its phases, the rise's timeline (staging C), the eye, the event scheduler; 31 tests (2026-11-14)
- [x] First glue 0.1.0, type-checked against the pin: night tick, `/crimson start|stop|status`, red fog, camera shake (2026-11-14)
- [x] 0.1.0 built and seen in game (Bastien, 2026-11-14): the sky pass draws; four problems reported
- [x] 0.1.1: real moon path, amber moon, white shapes fixed, soft horizon, sound with vanilla events (2026-11-14)
- [x] 0.1.2: vanilla clouds dissolve during the blood moon (2026-11-14)
- [x] 0.1.2 seen in game (Bastien): moon position confirmed; the vanilla moon showed through ours
- [x] 0.1.3: our moon solid from the omens, drawn over the haze (2026-11-14)
- [x] 0.1.3 seen in game (Bastien): amber shapes in the moon, portal noises disliked, blackout disliked, torn pieces look bugged
- [x] 0.1.4: own sounds, one-pass cracks, hush instead of blackout, torn pieces outlined (2026-11-14)
- [x] 0.1.5: stars of one size, slight stretch near the moon only (seen stretched in 0.1.4) (2026-11-14)
- [ ] 0.1.4 and 0.1.5 judged in game (Bastien): sounds, hush, moon cracks, torn pieces, stars
- [x] Our own sound files: `tools/make-sounds.py` (numpy + soundfile in `build/audio-venv`) (2026-11-14)
- [x] Sky pass written (`RenderHooks::world_drawn`, staging C, frame copy + land grade), type-checked, shader validated (2026-11-14); **not seen in game**
- [ ] Bloom on top of it (from Cagebound's `fx.rs`)
- [ ] The rise of the blood moon in game: red moon and sky, fog, grass colour, heartbeat
- [ ] In-game test in `cagebound-dev`

## Phase 2: the first signature event 🔴
- [ ] The event Bastien picks first, at full quality (models, textures, passes, sound)

## Phase 3: more events and rewards 🟠
- [ ] Two or three more events, chained by the scheduler
- [ ] Crimson crystals and what they make

## Phase 4: release 🟡
- [ ] Balance, docs, release checklist, 1.0.0 on playhorizon.dev

## Structures track (started 2026-11-15) 🟠
- [x] Horizon's structure support read ([[Horizon hooks and API]] § D), first catalogue ([[Structures]]), pipeline ([[How a structure is made]])
- [x] Bastien's answers ([[Open questions]] § Structures, 2026-11-15): both kinds (awake under the blood moon or always alive), scenery and loot first, first structure = a big stylish abandoned building
- [x] Preview page of three candidates, day and blood moon: `preview/abandoned-building.html` (A Chapel of the Eclipse, B Moonwatch Observatory, C Vigil Manor) (2026-11-15)
- [x] Shared preview engine in real blocks, on the grid, with Minecraft light; the three candidates rebuilt in it; block palette page ([[ADR-020 Structure previews in real blocks]], 2026-11-16)
- [x] Bastien's look at round 1 (2026-11-16): none kept (observatory disliked, chapel not good enough, manor empty and not imposing)
- [x] Round 2, three imposing candidates with furnished insides: `preview/grand-structures.html` (A Citadel of the Vigil, B The Kneeling Colossus, C Temple of the Red Moon) (2026-11-16)
- [x] Bastien's look at round 2 (2026-11-16): temple and citadel empty and plain; the colossus liked (more inside, new face)
- [x] Round 3: `preview/structures-round-3.html` (A the colossus deeper with a new face, B Wreck of the Sky Galleon, C The Lantern Tree) (2026-11-16)
- [x] Bastien's look at round 3: the colossus head and the tree kept, the galleon dropped
- [x] Round 4: `preview/structures-round-4.html` (the colossus centred with a round helm; the lantern tree with its blooming crystal crown) (2026-11-16)
- [ ] Bastien loads his real textures (button on the page) and picks one (or mixes), then we refine it on the page
- [x] The colossus kept, its real structure: template from the preview's builder, our blocks, loot, worldgen (0.4.0, [[ADR-021 One builder for the preview and the game]], 2026-11-16)
- [ ] Bastien builds 0.4.0 and looks at the colossus in a new world (test in `mod/README.md`)
- [x] The colossus wakes: an anchor block entity lights 293 blocks in a wave, emissive glow, 64 px textures (0.5.0, [[ADR-022 A structure wakes through its anchor]], 2026-11-16)
- [x] Bastien builds 0.5.0 (2026-11-16): chests floating in the reliquary and heart chamber, no light at night
- [x] 0.5.1: the anchor's block entity in the template, chests on the floor (2026-11-16)
- [x] Bastien builds 0.5.1 (2026-11-16): still dark (worldgen drops mod block entities)
- [x] 0.5.2: anchors found in loaded chunks and set again by command (2026-11-16)
- [x] Bastien builds 0.5.2 and watches a colossus wake (2026-11-16): it lights; his verdict "just lit, that's all": the awakening needs a show
- [x] Preview of the awakening, three stagings: `preview/colossus-awakening.html` (2026-11-16)
- [ ] Bastien picks a staging; build it in the game
- [ ] The colossus moves: head lifting, heart beating (block entity renderer); far terrain checked
- [ ] The lantern tree as the second real structure
- [ ] The first medium structure at full quality
- [ ] A first immense one
