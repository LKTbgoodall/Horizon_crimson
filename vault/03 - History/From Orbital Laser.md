---
tags: [history, reference, rendering]
status: reference
date: 2026-11-22
source: https://github.com/Stink-O/orbital-laser (read at 682d9c7, 2026-11-21, v0.5.18)
license: MIT (Copyright (c) 2026 Stink-O)
---
# From Orbital Laser

Back: [[00 - Home]] · [[Rendering toolkit]] · [[Events]]

**Orbital Laser** (Stink-O, MIT) is the Horizon mod of the TikTok videos: 23 "lasers" (strikes) that wreck the land, each one a cinematic sequence of 30 to 90 s drawn by its own WGSL pass. It is exactly the level Bastien wants for Crimson Eclipse. Bastien pointed at it on 2026-11-22.

## ⚠️ What is different from us
- **Not the same API.** It runs as **WebAssembly in Horizon's mod sandbox**, on a **Horizon fork** (`Stink-O/horizon`, branch `mod-api-input-ui-render-world`, release `orbital-mod-api-13`) that adds capabilities stock Horizon does not have: `render.set-data`, `render.set-warp`, `render.hold-world`, `world.edit-blocks`, `world.surface-height`, `world.read-columns`, `world.push-player`, `world.carry-player`, `atlas.block-sprites`... We are a **native mod with the typed API** on stock Horizon `9f42064` ([[ADR-001 Native Rust mod with the typed API]]). **No code can be dropped in as is**: we take techniques, numbers and tooling, and port them to `RenderHooks::world_drawn`.
- **Its passes are post passes**: one full-screen fragment shader after the fork's prelude (world colour, depth, camera, 16 floats of params, a storage table). That is the same shape as our `sky_pass.rs` (full-screen draw reading depth), so its shader *techniques* port well.
- **Licence**: MIT. If we ever copy a block of WGSL or Rust (not just the idea), keep its copyright line in a `NOTICE` and say where it came from. A few of its sounds hold CC0 recordings (credited in its `NOTICE`); its other sounds are synthesised.

## 🔥 News that may hit us
- ❓ **"Horizon's launcher moved to a new mod format on 18 November 2026 and no longer installs `.hnmod` mods"** (its README and `docs/SETUP.md`). Our mod is a combined `.hmod` built by the launcher ([[ADR-013 One combined hmod]]). The launcher's `build.log` on this PC shows a successful native build on **2026-11-18 23:01**, so it still worked that night. **To check** before the next build: the launcher's current mod format, and whether `tools/build-mod.ps1` still fits. → [[Open questions]].
- Horizon removed shader packs on 2026-10-24 (its "Stock Horizon" section). We never used them.

## 🎬 What fits Crimson Eclipse (by event)
| Orbital Laser strike | What we take | For which of ours |
|---|---|---|
| **The Sky Breaks** (`skybreak.wgsl`, 228 KB) | The sky as **one glass pane** at a height (560 blocks), broken at a point: 15 radial cracks out to 7,000 blocks in 0.1 s, forking, then **short slanted chords** that join them, close near the middle and far apart further out, **never lining up into rings** (from a study of glass broken at a point). Each piece shifts out of true and catches the light its own way. The middle falls first as a glittering rain, the outer ring hangs. **Panes** sag 1.3 s, break free one by one 1.45 s apart, tumble 5.3 s, strike low end first, the far end slamming 0.34 s later, and are then **laid as real blocks exactly where the pass drew them** (a test checks it). An **eye ~150 blocks across** behind the hole looks round, finds the player, pupil snaps tight, blinks, flares. The sky **heals** from the edges with a pale seam. | Our cracking sky ([[Blood moon rise]], [[ADR-017 The sky is a thick shell]]): chord pattern for our cracks, falling panes that land as blocks, C1's eye gaze rule, the dawn seal |
| **The Crystal Bloom** (`crystalbloom.wgsl`) | Spires as **convex crystals met exactly plane by plane** (hexagonal prism drawing in under a six-faced tip, faces a little uneven); inside, the ray is **refracted per colour** (dispersion), past cleavage sheets, out the far face. Shards are octahedra met the same way, glitter as points on shells. Sound: modes of struck glass (inharmonic partials, each a pair of sines a hair apart so it shimmers) | Crimson crystal corruption: crystals that grow out of the land and look like real crystal, not boxes |
| **The Colossi** (`colossi.wgsl`, `strike/colossi.rs`) | Giants made from **four pictures → Tripo (3D model) → model2mc (blocks)**; each giant gets **one of five characters** (eager, stiff, showy, brute, wary) so they never move alike; a **glowing line sweeps down** each giant and **what is above it is the real blocks** (pass → blocks hand-off). Motion "in catches, never one glide" | Our Kneeling Colossus' awakening ([[ADR-023 The colossus awakening is staging D, built in steps]]); immense structures in [[Structures]] |
| **The Convergence** (rift, cracks, sky) | A rift with islands seen through it, textured with the game's own blocks | Rifts, the Pale Realm seen through the sky ([[ADR-018 The Pale Realm lives in the far End]]) |
| **Meteor Storm / Six Stars** | Meteors placed by **the same hash in the shader and in the mod**, so each crater opens where its meteor lands; trails, fireball and smoke as noise volumes along the view ray | Blood meteors |
| **Supercell** | Lightning as jagged lines from a seeded hash, met kink by kink (broad bends first, kinks only near them), so a bolt keeps its path from frame to frame | Red lightning |
| **Earthquake / Fold** (`*_warp.wgsl`) | A vertex warp that moves the land (cliffs rising in lurches) | Quakes and swirls through `RenderHooks::world_warp` ([[Rendering toolkit]]) |

## 🛠️ Techniques worth porting (any event)
1. **One formula, two sides.** Whatever the pass draws that later becomes blocks (meteors, panes, crystals, statues) is computed by the **same function in the mod and in the shader** (same hash, same seed), or computed once by the mod and sent to the shader as a table. That is how its effects end as real terrain with no jump. For us: the pure crate computes, the glue sends it as a uniform / storage buffer to our pass. Fits [[ADR-002 Pure core, thin glue]].
2. **Table instead of per-pixel hashing.** Heavy layouts (crack graph, spire list, pane poses) are built once when the event starts and uploaded; the pass reads them. It halved the Crystal Bloom's GPU time at its peak.
3. **Rebuild world position from depth** so ground effects (glow, shock rings, crater light) sit on real blocks. We already do it for the sky (depth 0); the same works for ground decals.
4. **Analytic shapes instead of meshes**: beams as cylinders (closest approach between view ray and axis), rings and wings as planes, hulls met floor by floor, crystals plane by plane, spheres and domes traced. Volumes (smoke, dust, fireball) are noise **marched along the view ray**, the Downfall's dust integrated in closed form. Cheap however much sky it covers.
5. **Pre-baked distance grids for organic shapes.** The hand is a CC0 base mesh cut at its joints, each piece baked into a small grid of signed distances (`tools/bake_hand.py` → `sb_hand.bin`), posed by the mod 30 times a second as a chain hung from the shoulder.
6. **Half-size stage for soft things** (dust, smoke) and full size for sharp ones (cracks, panes): its QUALITY FAST default.
7. **Motion blur by shutter averaging** on fast arrivals.
8. **Impact frames**: half a second of hard black-and-white frames at the climax (styles: black flash, "Kanada", cinematic), always with a SOFT switch for photosensitivity.
9. **Sound comes late by distance**: what happens in the sky is heard on the picture, what happens on the land arrives at distance / 343 s, the ground's thump first (at five times that speed). Camera jolt and dust reach the player with the shock front.
10. **The strike is a timed plan**: every command and sound gets its second when it fires, played tick by tick, the pass given the strike's clock each frame. Pause stops it cleanly. Same shape as our `crimson_core` night clock.
11. **Work budget**: block edits capped per tick (20,000 blocks, 400 commands) and paced by frame time, the heavy plans split in stages. Worth keeping in mind for structure awakenings and craters.

## 🧰 Tooling worth copying (idea, written our way)
- **Offscreen preview** (`tools/preview` in Rust with `wgpu` + `png`, driven by `tools/preview.py`): renders the **real** WGSL pass over a synthetic scene (sky, rolling ground, cloud layer) at chosen seconds and views, as one labelled contact sheet, plus a GPU bench (median of 9). "Seconds a sheet, against a rebuild, a restart and a whole strike in the game." For us this would let Claude look at `sky_pass.rs`' WGSL at t = 0, 30, 60 s **without Bastien building**. `wgpu` 30.0.1 is in Horizon's `Cargo.lock` at `9f42064` (seen 2026-11-22), the same version their tool uses.
- **Shader check** (`tools/wgslcheck`: naga parse + validate + overrides, the naga version the game ships, with the game's prelude in front): prints the real WGSL error with its line, where the game only logs "did not compile". naga 30.0.1 is in Horizon's `Cargo.lock` at `9f42064` (seen 2026-11-22), the same version as theirs. Useful here because `check-glue.sh` cannot build on this PC (no gcc).
- **Synthesised sounds** (`tools/synth_sounds.py`, `soundlib.py`, one `sounds_<laser>.py` each): noise, sweeps, modal synthesis (struck glass), a reverb from a synthetic impulse response, and a `--listen` mix at 30, 300 and 800 blocks. We already synthesise ours (`tools/make-sounds.py`); their glass modes and the distance mix are the parts to borrow.
- **Tests that tie the pass to the world**: `a_lodged_pane_is_where_the_pass_draws_it`, `the_arm_never_jerks`, `sb_sounds_every_cue_has_its_file`, `a_sky_breaks_on_far_unloaded_land_stays_light`. Same spirit as our pure-crate tests.

## ❌ What not to take
- Wrecking the land for good: our rule is spectacle under the blood moon, not craters 500 blocks wide ([[Concept]]).
- Their fork-only capabilities: we stay on catalog hook points ([[ADR-003 Hook points over raw injections]]).
- The affiliate link and Tripo sponsoring in their README.

## Where to read it
- `docs/HOW-IT-WORKS.md` (200 KB): every strike in detail with its timings. Sky Breaks from line ~1166, Colossi ~1714, effects ~725, sounds ~767.
- `docs/LASERS.md`, `docs/CHANGES.md`; screenshots `docs/01-…87-*.jpg` (58-62 the Sky Breaks, 21-24 the Crystal Bloom, 84-87 the Colossi).
- `mod/shaders/*.wgsl`, `mod/src/strike/*.rs`, `tools/`.
