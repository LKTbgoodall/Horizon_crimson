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
  - [ ] Port to the mod, step by step: fissure planner in the pure core + segment buffer, opening lenses, the Pale Realm (sky, sun, shards, Spire, shadow, serpents), the god-ray pass
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
