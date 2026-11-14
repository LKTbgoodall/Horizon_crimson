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
- [ ] 0.1.0 built and seen in game (Bastien)
- [ ] Our GPU passes (`RenderHooks`): selective glow / bloom, start from Cagebound's `fx.rs`
- [ ] The rise of the blood moon in game: red moon and sky, fog, grass colour, heartbeat
- [ ] In-game test in `cagebound-dev`

## Phase 2: the first signature event 🔴
- [ ] The event Bastien picks first, at full quality (models, textures, passes, sound)

## Phase 3: more events and rewards 🟠
- [ ] Two or three more events, chained by the scheduler
- [ ] Crimson crystals and what they make

## Phase 4: release 🟡
- [ ] Balance, docs, release checklist, 1.0.0 on playhorizon.dev
