---
tags: [horizon, contribution]
status: posted 2026-11-14
date: 2026-11-14
source: https://github.com/horizon-rust/horizon/issues/11282, https://github.com/horizon-rust/horizon/pull/15041
---
# Proposal: mod dimensions

Back: [[ADR-018 The Pale Realm lives in the far End]] · [[Horizon hooks and API]]

## Where Horizon stands (read 2026-11-14)
- Issue **#11282** "Levels for every dimension, datapack dimensions included" (open, UMCEKO, filed by their agent). Plan in three steps:
  1. `Dim` becomes a level key (any `ResourceKey<Level>`), no behaviour change, in 9 sub-PRs. **7 merged** (#11291, #11415, #11303, #11344, #11366, #11390, #15004, #15028), **#15030 (8/9) and #15041 (9/9) open**, no current approval, CI failures the author calls unrelated.
  2. A level for every `dimension` registry entry, data pack ones included: generator, save folder, `/execute in`, `/tp`, its own `dimension_type`. **Not started.**
  3. Travel and the client: respawn, client dimension types, sky and fog from `dimension_type`. **Not started.**
- Mods (native or `.hmod`) are not mentioned anywhere.

## Re-read 2026-11-17
- Still open. Step 1: 8 PRs merged (#15004 and #15028 on 11-11); the last two pieces ("Levels in a list keyed by level", "Dim is a level key: any dimension, the three built-ins as constants") were pushed on 11-12 to **sunrise-org/sunrise**, which mirrors Horizon's issues (Bastien saw this one there as sunrise#385). The page does not show whether #15030 and #15041 were merged.
- Steps 2 (data pack levels, the one we need) and 3 (client): still no PR.
- Our comment of 11-14 has no reply yet.
- So nothing usable for the Pale Realm yet; [[ADR-018 The Pale Realm lives in the far End]] stands. Even once step 2 lands, our pin `9f42064` has to move up to get it.

## What we would bring
Not a second refactor: UMCEKO already does steps 1-3. Our part is the **mod side**, on the mod API fork `arismoko/horizon` once step 2 lands:
1. A **content mod ships a dimension**: `data/<ns>/dimension/*.json` and `dimension_type/*.json` inside a `.hmod` count as a data pack (so step 2 creates the level).
2. A **native mod generates its chunks**: a generator hook (fill a new chunk of a mod level from the mod's own code), so the Pale Realm's dunes, monoliths and Spire come from our pure generator.
3. Moving a player there is already possible (`native_run_command` + `execute in <id> run tp`), once step 2 accepts the id.

## Draft comment for #11282 (Bastien posts it himself)
Bastien: do not offer to help on step 2.
> Hi! I'm making a native mod (Crimson Eclipse) whose core is travelling to a custom dimension, so this plan is exactly what I need. Thanks for the work on step 1.
>
> Once step 2 creates levels from data pack dimensions, would it fit to let mods use it too: a `.hmod` carrying `data/<ns>/dimension/` and `dimension_type/` treated like a data pack, and a native hook to generate a mod level's chunks from the mod's own code? I'd open that part on arismoko/horizon, since it's mod API.
>
> (Written with the help of a coding agent.)
