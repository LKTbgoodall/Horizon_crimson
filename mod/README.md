# Crimson Eclipse: the mod

- `crimson_eclipse/`: the native bundle (typed API). `api/src` holds only the hand-written glue
  (`glue.rs`, `server.rs`, `client.rs`, `sky_pass.rs`); the build adds the pure core (`crates/crimson-core/src`)
  and writes `lib.rs`.
- `content/`: the content mod: its manifest, the sounds, our blocks (declarations, models, textures), loot tables and
  the Kneeling Colossus (template `data/crimson_eclipse/structure/kneeling_colossus.nbt` and its worldgen files).
  These are generated: `node tools/export-structure.mjs`, `node tools/make-block-textures.mjs`,
  `node tools/write-colossus-content.mjs` (from `preview/structures/`, the builder the preview draws).
- `compatibility.json`: the Horizon pin (Nightly `9f42064`, hooks 415).

## Build and install (Bastien runs it, game closed)

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Instance cagebound-dev
```

`-NoBuild` installs without building, `-Uninstall` takes it out, `-Combined` installs the one `.hmod`.
Claude checks the glue first with `tools/check-glue.sh` and the sky shader with `tools/check-shader.sh`
(no game, nothing of the mod run).

## New in 0.6.1: step 2, the moon's beam onto the crown
- About 9 s after the eclipse begins (preview 3 s), a red beam comes down from the moon's real place in the sky and
  lands on the colossus' crown 6 s later, just as the crown lights; it stays all night, thinning a little after
  half a minute. Drawn in our sky pass: hidden behind hills and trees, a few pixels wide from far away.
- The anchor tells where it is when it ticks (a player within its ticking range); the nearest colossus gets the beam.
- Not yet: the sparks and mist, the ring, the heartbeat, the head and the shards. Single player only (a remote client
  is not told where the anchors are).

**Test**: `/crimson start` near a colossus, watch from 30 to 60 blocks away; then walk away (100, 200 blocks) and
look back. Screenshots: the beam landing, and from far. `latest.log` if nothing shows.

## New in 0.6.0: the colossus wakes as staging D, step 1 (timing)
Bastien picked staging D of `preview/colossus-awakening.html` ("The Moon's Gift", without the souls). Step 1 of 5
(ADR-023 in the vault): only the timing of what lights, from the builder, 60 game ticks for each preview second.
- About 15 s after the eclipse begins the crown lights, then the eyes, then the light runs **down** him: veins and
  lanterns from the top. At about 30 s the heart, then the sword fills from the guard down (about 38 to 45 s), candles
  at about 42 s, and all the braziers flare together at 48 s.
- Not yet: the moon's beam, the sparks and mist, the ring on the dais, the heart beating, the head and the shards.

**Test**: near a colossus, `/crimson start`; the eclipse begins about a minute later. Watch from the front for a
minute: does the light come from the crown downward, the heart, then the sword from the top? Screenshots.

## New in 0.5.2 (Bastien's look at 0.5.1: still dark under the blood moon)
- **Why 0.5.1 was still dark**: Horizon's worldgen keeps only vanilla block entities from a structure template
  (`structure_blocks.rs`, `generated_block_entity`): the anchor's was dropped again (the world save showed the
  anchor block, facing east, and no block entity). `/place` keeps it, worldgen does not.
- **The fix**: each chunk that loads in the overworld is read 32 blocks under its surface (`read_columns`); an
  anchor found there is set again by console command (`setblock` air, then the anchor with its facing), which
  gives it its block entity. It works on colossi already generated (0.4.0 to 0.5.1) too: just go near one.
  `latest.log` says `anchor at X Y Z set again (facing ...): done`.

**Test**: go back to the colossus you saw (or `/locate`, any colossus), check `latest.log` for the line above,
then `/crimson start` next to it. Screenshots at night.

## New in 0.5.1 (Bastien's first look at 0.5.0: floating chests, no light at night)
- **The colossus lights up now**: the anchor in its heart had no block entity in the template, and worldgen and
  `/place` only make the block entities a template carries (Horizon makes a mod's block entity by itself only when a
  player or a command places the block). The template now carries `{id: "crimson_eclipse:colossus_anchor"}`.
- **No more floating chests**: two reliquary chests and the heart chamber's chest and barrel stood where the floor
  does not reach; they now go to the nearest floor cell, and the exporter refuses a chest, barrel or bookshelf
  without a full block under it.
- A colossus already in the world (0.4.0 or 0.5.0) keeps both problems: test on a new one.

**Test**: `/place structure crimson_eclipse:kneeling_colossus` on flat ground (or `/locate` far from explored
land), `/crimson start` next to it; the wave starts about 20 s after the eclipse begins. Check the reliquary
(above the spiral's first floor) and the heart chamber: every chest on the floor.

## New in 0.5.0: the colossus wakes under the blood moon
- **It lights up**: a block hidden in its heart (`colossus_anchor`, a block entity that ticks while you are near)
  turns on 293 blocks one after the other during the eclipse, over about 13 seconds: the heart and the crystal sword,
  the veins spreading over the stone, the eyes, the crown's points, the lanterns, the candles and the braziers. They go
  out at dawn. Each of our blocks has a `lit` state (its light: crystal 4 to 12, eyes 1 to 12, lanterns 0 to 13...).
- **It glows**: the lit states draw textures with an emissive layer (`textures/emissive/`), drawn full bright: the
  crystal, the veins, the eyes and the lantern glass shine at night, not by day.
- **64 × 64 textures** for our five blocks, day and lit (painted by the preview's painters, `tools/make-block-textures.mjs`).
- Not yet: the head lifting and the heart beating (moving parts need a block entity renderer).

**Test** (a world where the colossus already stands works: its anchor is in the template):
1. Find one (`/locate structure crimson_eclipse:kneeling_colossus`) or place one (`/place structure crimson_eclipse:kneeling_colossus`).
   A colossus placed by 0.4.0 has no anchor: place a new one.
2. Stand near it and `/crimson start`: about a minute later the eclipse begins and the colossus lights up in a wave.
   Look: do the crystal, veins, eyes and lanterns shine (full bright) at night and not by day? Do candles and braziers catch?
3. Wait for dawn (or `/time set 23000`): everything goes out.
4. Screenshots by day and at night; `latest.log` if something is off.

## New in 0.4.0: the Kneeling Colossus generates in the world
The first real structure, block for block as `preview/kneeling-colossus.html` draws it (day state: nothing moves
yet, candles out, lanterns dark; the blood moon's awakening needs the mod's code, next step).
- **Where**: rare (one chance per 40 × 40 chunks, at least 16 apart), in plains, sunflower plains, meadows, savannas,
  savanna plateaus and snowy plains; new chunks only (an explored area keeps its land).
- **Inside**: a door between the knees, a spiral stair from a crypt under the dais (tombs, a treasure room behind
  iron bars) up through a reliquary in the pelvis to the heart chamber; 31 chests and barrels with our loot tables
  (`colossus_treasure`, `crypt`, `supplies`, `reliquary`, `heart`, `camp`).
- **Our blocks**: Crimson Crystal, Crimson Crystal Cluster, Crimson Vein, Helm Eye, Vigil Lantern (in the creative
  search; 16 px textures from the preview's painters).

**Test** (after the build, in a new world or far from explored land):
1. `/locate structure crimson_eclipse:kneeling_colossus`, then go there; or `/place structure crimson_eclipse:kneeling_colossus`
   on flat ground near you.
2. Look: is it whole and standing on the ground (the dais flat, no floating part, nothing buried)? Are our blocks
   textured (no purple and black)? The four little chains holding the crypt lanterns (`iron_chain`, a name to confirm)?
   The Vigil Lanterns' cage drawn right? The two eyes in the visor looking forward?
3. Go in: the door between the knees, down the spiral to the crypt, up to the reliquary and the heart; open chests.
4. Screenshots, and `latest.log` if a line says "content mods not loaded".

## New in 0.3.4 (Bastien's screenshot of the moon rising in 0.3.3)
- **The pale rectangle under the rising moon** should be gone (to confirm in game). Reading of the screenshot,
  not reproduced: it is the vanilla moon's square, under the horizon, seen through far water (not sky, so the
  sky pass does not repaint it; our own moon stops at the water's edge). `unmoon` in the shader: a land pixel
  inside the vanilla moon's square (0.075 rad each way round the moon) that is brighter than the picture just
  left and right of the square takes the brighter of those two. Only with a frame copy (`fs_copy`).

## New in 0.3.3 (Bastien's look at 0.3.2)
- **No pinwheel straight overhead**: through a hole at the zenith the Pale Realm's fog drew streaks meeting at
  one point (its noise was laid on azimuth and elevation, and every azimuth meets up there). High in the sky the
  fog and the ash now use a flat map of the top of the sky.
- **The low sky, seen from a mountain**: the cracks and slabs used to stop on a hard line with a flat band under
  it. They now fade into the haze over the last 9 degrees above the horizon and are gone at the horizon; under
  it the haze darkens with depth instead of being one flat colour.

## New in 0.3.2 (Bastien's look at 0.3.1)
- **The thin dark line across the Pale Realm is gone** (to confirm in game). It sat at the height of the Spire's
  tip, all round the sky, only in holes. Cause, deduced from the screenshots, not reproduced: above the tip the
  Spire's width was `pow(0, 1.3)`, which is not a number on his GPU, and the shape's distance then fell back to
  "height above the tip", painting a band 0.7 units thick. The power's base is now never 0 (same guard on the
  three other fractional powers of the shader).
- **The sky breaks under the moon too** (Bastien: it may): every slab within 0.25 rad of the impact falls at the
  climax, as long as it does not reach below the hole floor. The cracks now start 0.05 to 0.14 rad from the
  impact (the facets nearer than that are too small to read).

## New in 0.3.1 (Bastien's look at 0.3.0: much better, three things to fix)
- **Cracks crack, no spreading patch**: the cracks no longer appear as a disc growing from the moon with the
  cracked sky inside it. Twelve **rays** leave the impact, each running outward along slab borders in jumps on
  heartbeats, at its own pace, some starting later; the **cross cracks** between two rays snap one by one a
  moment after both rays have passed. A slab only settles askew (shift, tint) once it is cracked all round, on
  its own, over 0.2 s; the tint change is smaller.
- **Holes are in the sky**: a slab only falls if its lowest point is at least 0.22 rad (about 13 degrees) above
  the horizon, so no hole reaches the ground: nothing looks like a place one could walk to. Fewer slabs fall
  (about 9 to 21 a night, never fewer than 9).
- **Under the moon the sky stays whole**: no cracks, no askew slabs within about 0.1 rad of the impact, fading
  in up to 0.22 rad (the tiny dense facets there looked wrong).
- The Spire's slab still falls after the climax, unless it would reach too low.

What to look at: the cracks during the eclipse (rays then cross cracks, no patch), the horizon all round after
the climax (sky everywhere low down), the place under the moon once it has risen on.
Not seen in game yet.

## New in 0.3.0 (the break redone: the sky is a thick shell)
Bastien on 0.2.5: the break did not look natural. He picked **B1 · Impact glass** in `preview/sky-break.html`
(as first written). The fissure lines and the pentagon shards are gone (`fissures.rs` is replaced by `shell.rs`).
- **One fracture network**: small facets grouped into slabs, radial around the impact (where the moon is two
  thirds into the eclipse), small near it, huge far away. Cracks, loose slabs and holes all come from it.
- **Cracks run as a front** from the impact, in 16 jumps on heartbeats from 0:18 into the eclipse, faster and
  faster, further in some directions; hot for an instant, then a dark line with a red glint. Hairlines between
  facets follow 3 s later. Each jump is heard and jolts the camera.
- **A cracked slab sits askew**: the sky painted on it shifts and its tint changes.
- **Slabs come loose and fall**: 1.3 s before, pale light leaks round the slab; then it falls on our side,
  tumbling (its back is pale), its broken edge lit from behind, burning away. A few fall during the eclipse (two
  sounds each), most just after the eye opens. The hole is exactly the slab's outline.
- **The shell is thick**: under the upper edge of a hole its broken wall shows.
- **The Spire**: the slab in front of it always falls just after the climax.
- **Dawn**: the slabs come back one by one over 20 s, each seam glowing gold for a moment, then the cracks fade.
- One storage buffer instead of three (`shell::Plan::floats`, 2360 floats).

What to look at in game (`/crimson start`, then wait for the eclipse):
1. From 0:18 of the eclipse: cracks leaving the moon in jumps, with a sound each; slabs visibly askew.
2. A few slabs falling before the climax (light round them first), with the broken wall on the hole's upper edge.
3. The climax: the white light pressing through all the cracks in the hush, then many slabs falling.
4. The night: big holes onto the Pale Realm, the Spire on the left.
5. The frame rate (the facet search runs on every sky pixel, four times on hole pixels) and `latest.log`.
6. Dawn (`/time set 22700`): slabs coming back with a gold seam.
Not seen in game yet: nothing of this has run on the GPU; only the WGSL is validated and the glue type-checked.

## New in 0.2.5
- **Shards really break** (Bastien: they just appeared from nowhere). In three beats: 1.2 s before, a crack runs
  all around the piece, its tip racing along the outline, light leaking through (with a crack sound); then the
  piece of sky itself falls away, sliding down, turning and shrinking toward the world behind, darkening, its edge
  lit from behind (a second sound); burning debris scatters and falls. The hole is what the piece leaves.

## New in 0.2.4
- **No trace of a crack inside a hole**: the shaded edges of the cracks are gone there too.
- **A window onto the Spire**: a hole of its own on the left, where the Spire stands, opening just after the
  climax, so the Pale Realm's main structure can be seen.

## New in 0.2.3 (Bastien's look at 0.2.2)
- **Just a hole**: inside a hole there is only the other world now. No crack line crosses it, and where shards
  overlap only the outline of the whole opening burns (no edge drawn inside another hole).
- **Bigger, more holes**: shards about 60 % bigger, closer together along the main fault, two per climax crack,
  more on the moon's cracks.

## New in 0.2.2 (Bastien's look at 0.2.1)
- **Real broken glass**: the cracks are thin sharp lines again, and the big openings now come from **shards
  falling out**: convex pieces with straight edges and corners break off along the cracks, on either side (along
  the main fault every few steps, bigger further out; on some moon cracks; on most climax cracks). A few fall
  during the eclipse, most at the climax; each drops out over 0.3 s, its broken edge burning, and the holes show
  the Pale Realm well. They close again at dawn. Planned by `fissures.rs` (`Shard`), drawn from a third storage
  buffer.

## New in 0.2.1 (Bastien's look at 0.2.0)
- **Each crack is heard**: a new sound (`fissure.ogg`, a snap like ice and ticks running away) when a crack is
  born, a little higher or lower each time, and a small jolt of the camera.
- **Broken, not melted**: the cracks open far less (the main fault 0.028 rad instead of 0.08) and their lips are
  faceted, straight edges with corners, like broken glass, instead of round blobs.
- **No empty disc where the moon was**: cracks now start under the moon, so once it has risen on, they cross
  the place it left.
- **The tall shadow is gone**, and so are the serpents. Instead, things fly in the Pale Realm's fog all night,
  unseen, until a flash lights the fog behind one: for a second and a half, a black winged shape. The flash also
  leaks through the cracks near it.
- **The sky heals at dawn**: when dawn comes, the cracks' lips close over 20 seconds with a golden seam running
  along them, then the lines fade, all before sunrise (Bastien's request, seen in 0.2.0 still open at sunrise).

## New in 0.2.0 (C1 and the Pale Realm, ADR-016)
- **The sky breaks for real**: the old web of cracks around the moon is gone. Cracks are now fixed in the sky,
  born on heartbeats at the moon's edge or off another crack, their tip running fast then slowing; a main fault
  crosses the sky in stages; at the climax a burst of cracks shoots out all around the moon. Planned once per
  night by the pure core (`fissures.rs`), sent to the sky pass in two storage buffers.
- **The cracks open onto the Pale Realm**: their lips part into lenses, a little through the eclipse, wide at the
  climax. Behind: bone-white fog, a black sun, floating black shards, the Spire far off on the left, a black
  shadow with two bright eyes walking through the night, two far serpent dragons, ash.
- **To look at**: whether the cracks run and open as in the preview; whether the Pale Realm reads through them;
  the frame rate during the night (the fissure loop runs on every sky pixel); any GPU error in `latest.log`
  (the pass now uses storage buffers in the fragment stage).
- Not ported yet: C1's eye (strands, third eyelid), the god rays, the crack sounds and shake.

## New in 0.1.5
- **Stars are small points again** (seen in 0.1.4: huge stretched streaks far from the moon). One size
  everywhere, a slight stretch toward the moon only close to it, a plain field elsewhere.

## New in 0.1.4 (after Bastien's look at 0.1.3)
- **Our own sounds** instead of nether portal and other vanilla noises: heartbeat, drone, omen, crack, the
  eye. They are synthesised by `tools/make-sounds.py` into `content/assets/crimson_eclipse/sounds/` and
  declared in `sounds.json`. Nobody has heard them yet: they were made without listening.
- **No more amber shapes inside the moon**: the crack pattern is computed in one pass on integer cells, so
  the GPU cannot disagree with itself any more.
- **No blackout**: before the eye, the corona falls back into the moon and the light dips a little; nothing
  goes black.
- **Torn pieces of sky** show their whole outline, burning from inside, and their stars are round points.

## New in 0.1.3
- **The vanilla moon no longer shows through ours** (seen in 0.1.2: ours was drawn half transparent during
  the omens). Ours is solid from the first instant and is drawn over the horizon haze, which flattened it
  to a red disc. Its position was confirmed right in game.

## New in 0.1.2
- **No more clouds during the blood moon**: they dissolve through the omens and come back at dawn
  (the cloud fog's end is pulled to nothing with `render_fog`; the sky pass also paints over the cloud
  layer, 192 to 197 blocks up, in case their depth stays). Not seen in game yet.

## New in 0.1.1 (after the first look in game)
- **Sound**: heartbeat, a drone that builds, a distant omen, the world muffled before the eye, the crack
  with echoes and a growl as the eye opens (vanilla sound events in 0.1.1; the mod's own since 0.1.4).
- **The moon is where the real one is** (the game eases the sky's turn; the mod assumed a steady one) and
  it is amber and cratered instead of a pale blur. The whole night starts 20 seconds later so the moon is
  10 degrees up when the eclipse starts.
- **No more white shapes** over the moon and the eye (a hash that gave two answers on the GPU).
- **No more flat red band** under the horizon: the sky sinks into the fog's colour. Bright parts no longer
  clip to white.

## What it does

The night's logic and the rise in staging C "The Abyss". 0.1.0 ran in game on 2026-11-14; **0.1.1's fixes
are type-checked and validated, not seen in game yet.**

- Server: ticks the blood moon with the overworld clock (full moons, 1 chance in 2), logs each phase change.
- `/crimson start` (operators): jumps to sunset and forces tonight's blood moon. `/crimson stop`, `/crimson status`.
- Client: the fog turns red through the omens and the eclipse; the camera rumbles during the eclipse
  and jolts when the eye opens.
- Sky pass (our own GPU pass after the world): our moon over the vanilla one, swelling while a spiral void
  eats it; flame corona; spiral aurora; stars dragged in and put out; the web of sky cracks whose cells tear
  open on space; two seconds of darkness, a flash and a shock wave; the eye opens, follows where you look,
  narrows its pupil when you stare at it and blinks; the land is graded red. No bloom yet.

## Test

In a creative single player world (cheats on):

1. `/crimson start`: the clock jumps to sunset. The answer says the eclipse starts in about a minute.
2. Look east, sound on. For a minute (omens) the sunset reddens and the moon rises. Then the eclipse, one minute:
   compare with version C of `preview/blood-moon-rise.html`. Then darkness, the flash, the eye.
3. Look around with the eye open: its iris should follow, and the pupil narrow when your crosshair is on it.
4. `/crimson status` at any time names the phase. `/crimson stop` brings the vanilla sky back at once.

Send screenshots (omens, mid eclipse, the eye) and the `latest.log` lines with `crimson_eclipse`
(one per phase change, and one `sky pass on ...` line naming the frame's format).

### What to look for
- **The moon**: is the square vanilla moon fully hidden behind ours now, and does the amber moon look right?
- **White or amber shapes** over the moon or the eye: gone?
- **The horizon**: is the join between the sky and the land soft now?
- **Sound**: is each of the five right (heartbeat, drone, omen, crack, eye)? Too loud, too quiet? Any click
  or cut when the drone repeats?
- **The hush** before the eye: better than the blackout?
- **Torn sky**: do the pieces look clean now?
- **Clouds**: do they fade out during the omens and stay gone? Any cloud-shaped hole or dark shape left in the sky?

### Known for this first version
- No bloom yet, no burgundy grass, no particles.
- Single player only: a remote client is not told about the blood moon yet.
- A blood moon is not saved: leaving the world in the middle of a forced night ends it.
