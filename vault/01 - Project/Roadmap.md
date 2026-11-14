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
  - [x] Bastien picked **C · The Abyss** (2026-11-14)
- [x] Repo skeleton: workspace, pure crate `crimson-core`, bundle `mod/crimson_eclipse` (typed API), content mod (manifest only) (2026-11-14)
- [x] Pure core: when a blood moon happens, its phases, the rise's timeline (staging C), the eye, the event scheduler; 31 tests (2026-11-14)
- [x] First glue 0.1.0, type-checked against the pin: night tick, `/crimson start|stop|status`, red fog, camera shake (2026-11-14)
- [x] 0.1.0 built and seen in game (Bastien, 2026-11-14): the sky pass draws; four problems reported
- [x] 0.1.1: real moon path, amber moon, white shapes fixed, soft horizon, sound with vanilla events (2026-11-14)
- [x] 0.1.2: vanilla clouds dissolve during the blood moon (2026-11-14)
- [x] 0.1.2 seen in game (Bastien): moon position confirmed; the vanilla moon showed through ours
- [x] 0.1.3: our moon solid from the omens, drawn over the haze (2026-11-14)
- [ ] 0.1.3 seen in game (Bastien): moon, white shapes, horizon, sound, clouds
- [ ] Our own sound files (needs an Ogg encoder: none on the dev PC)
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
