---
tags: [horizon, contribution]
status: draft (not posted)
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

## What we would bring
Not a second refactor: UMCEKO already does steps 1-3. Our part is the **mod side**, on the mod API fork `arismoko/horizon` once step 2 lands:
1. A **content mod ships a dimension**: `data/<ns>/dimension/*.json` and `dimension_type/*.json` inside a `.hmod` count as a data pack (so step 2 creates the level).
2. A **native mod generates its chunks**: a generator hook (fill a new chunk of a mod level from the mod's own code), so the Pale Realm's dunes, monoliths and Spire come from our pure generator.
3. Moving a player there is already possible (`native_run_command` + `execute in <id> run tp`), once step 2 accepts the id.
Help on step 2 or 3 if UMCEKO wants it.

## Draft comment for #11282 (Bastien posts it, or approves it first)
> Hi! I'm making a native mod (Crimson Eclipse) whose core is travelling to a custom dimension, so this plan is exactly what I need. Thanks for the work on step 1.
>
> Two questions so I don't step on your toes:
> 1. Is anyone on step 2 yet? I'd be happy to help on it if a piece can be split off.
> 2. Once step 2 creates levels from data pack dimensions, would it fit to let mods use it too: a `.hmod` carrying `data/<ns>/dimension/` and `dimension_type/` treated like a data pack, and a native hook to generate a mod level's chunks from the mod's own code? I'd open that part on arismoko/horizon, since it's mod API.
>
> (Written with the help of a coding agent.)
