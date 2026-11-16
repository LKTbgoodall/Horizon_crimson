---
tags: [project, questions]
status: living
updated: 2026-11-16
---
# Open questions

## Structures (asked to Bastien on 2026-11-15, answered the same day)
- ✅ **S-1 The tie**: both, depending on the structure (some wake under the blood moon, some are always alive).
- ✅ **S-2 Gameplay**: scenery and loot to start with.
- ✅ **S-3 Who builds**: both. Claude proposes structures, they are refined together, Claude codes them, Bastien edits in game when needed or says what to change.
- ✅ **S-4 First pick**: "a stylish structure, for example an abandoned building, but quite big, to start".
- ✅ **S-5 Vanilla villages**: allowed, but the start is something of our own.
- **Real textures for the previews** (2026-11-16): where does Horizon keep the vanilla client jar on the dev PC? The page's "Load real textures…" button takes any 26.3 client jar (the vanilla launcher's `%APPDATA%\.minecraft\versions\26.3\26.3.jar` works); `node tools/extract-textures.mjs <jar>` makes a lasting `preview/vanilla/textures.js`.
- To check: Horizon's structure block saves templates in game; jigsaw size limits; far terrain shows our structures; when `structure_template` gets numbered.

1. **Name**: "Crimson Eclipse" is Claude's pick of 2026-11-14. To confirm.
2. **Which events first**: see [[Events]].
3. **How often** (the core's default since 2026-11-14: full moons only, 1 chance in 2, so about one night in 16; `night::Rules`): every N nights, random, or called by the player (a ritual)? Proposed: random, about one night in eight, plus a ritual item later.
4. **Multiplayer**: one blood moon for the whole server (yes, proposed), events near each player.
5. **License**: MIT like Horizon Quests?
6. **Sky drawing**: partly answered 2026-11-14 at `9f42064`: there is no moon / sky / star hook, so the vanilla moon cannot be replaced, only painted over by our `world_drawn` pass where depth is 0. Answered in game on 2026-11-14 (0.1.0): the pass draws on a `Bgra8Unorm` frame, copyable, depth at full size; vanilla clouds do write depth (they pass in front of our sky, graded dark); the moon's angle is **not** linear (eased, see [[Horizon hooks and API]] § A8). Still open: does the engine cast moon shadows without a shader pack? Clouds: Bastien wants them gone during the blood moon (2026-11-14); done in 0.1.2, to see in game whether their depth stays once faded.
7. **GitHub repo**: now or later?
8. **Multiplayer sync**: 0.1.0 shares the night between server and client through the mod's one instance, which only works in single player. A remote client needs to be told (forced nights, the salt). How: to read in the source (custom payloads to a client exist server side; the client-side receive hook is not found yet).
9. **Own sounds**: done in 0.1.4 (`tools/make-sounds.py`, synthesised, Ogg Vorbis through `soundfile` in a local venv). Open: Bastien's ear on each of them; they were made without listening.
10. **Saving**: a forced blood moon and the roll's salt are not saved yet (`world_saved`, `host.world_dir()`); the salt is 0 for every world for now.

- **The other world as a destination** (2026-11-14): Bastien wants players to be able to go into the world seen behind the sky (Pale Realm or Storm Realm). To check in Horizon: can a native mod add a dimension (level, generator, sky)? What it means for the look: the preview's landmarks (monoliths, ribs, colossus, black sun) should become real things there.

- ❌ answered 2026-11-14, see [[Horizon hooks and API]] § Levels: no custom dimension at `9f42064`. (Was: Can a native mod add a custom dimension (the Pale Realm) and move a player into it, through catalog hooks only? If not, fallback: a far-away or high-altitude zone in the Overworld drawn as the Realm. See [[Events]] § Crossing to the Pale Realm.)

- ⏳ (2026-11-14) Pale Realm host → [[ADR-018 The Pale Realm lives in the far End]], waiting for Bastien. (Was: the End (proposed: pale end stone as the dunes, our own sky pass over its sky, `native_edit_blocks` for the structures, `native_run_command` `execute in minecraft:the_end run tp`) or a far zone of the Overworld? Bastien to confirm.)
