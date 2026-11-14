# Crimson Eclipse: the mod

- `crimson_eclipse/`: the native bundle (typed API). `api/src` holds only the hand-written glue
  (`glue.rs`, `server.rs`, `client.rs`, `sky_pass.rs`); the build adds the pure core (`crates/crimson-core/src`)
  and writes `lib.rs`.
- `content/`: the content mod: its manifest and the sounds (no block, item or texture yet).
- `compatibility.json`: the Horizon pin (Nightly `9f42064`, hooks 415).

## Build and install (Bastien runs it, game closed)

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Instance cagebound-dev
```

`-NoBuild` installs without building, `-Uninstall` takes it out, `-Combined` installs the one `.hmod`.
Claude checks the glue first with `tools/check-glue.sh` and the sky shader with `tools/check-shader.sh`
(no game, nothing of the mod run).

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
