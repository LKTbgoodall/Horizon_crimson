# Crimson Eclipse: the mod

- `crimson_eclipse/`: the native bundle (typed API). `api/src` holds only the hand-written glue
  (`glue.rs`, `server.rs`, `client.rs`, `sky_pass.rs`); the build adds the pure core (`crates/crimson-core/src`)
  and writes `lib.rs`.
- `content/`: the content mod. Only its manifest for now (no block, item or texture yet).
- `compatibility.json`: the Horizon pin (Nightly `9f42064`, hooks 415).

## Build and install (Bastien runs it, game closed)

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Instance cagebound-dev
```

`-NoBuild` installs without building, `-Uninstall` takes it out, `-Combined` installs the one `.hmod`.
Claude checks the glue first with `tools/check-glue.sh` and the sky shader with `tools/check-shader.sh`
(no game, nothing of the mod run).

## New in 0.1.3
- **The vanilla moon no longer shows through ours** (seen in 0.1.2: ours was drawn half transparent during
  the omens). Ours is solid from the first instant and is drawn over the horizon haze, which flattened it
  to a red disc. Its position was confirmed right in game.

## New in 0.1.2
- **No more clouds during the blood moon**: they dissolve through the omens and come back at dawn
  (the cloud fog's end is pulled to nothing with `render_fog`; the sky pass also paints over the cloud
  layer, 192 to 197 blocks up, in case their depth stays). Not seen in game yet.

## New in 0.1.1 (after the first look in game)
- **Sound**: heartbeat, a drone that builds, a distant omen, the world muffled in the blackout, the crack
  with echoes and a growl as the eye opens. These are the game's own sound events, pitched down:
  stand-ins until the mod has its own files.
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
- **White shapes** over the moon or the eye: gone?
- **The horizon**: is the join between the sky and the land soft now?
- **Sound**: too loud, too quiet, the right mood? Does the heartbeat follow the red pulse?
- **Clouds**: do they fade out during the omens and stay gone? Any cloud-shaped hole or dark shape left in the sky?

### Known for this first version
- No bloom yet, no burgundy grass, no particles. Sounds are vanilla stand-ins.
- Single player only: a remote client is not told about the blood moon yet.
- A blood moon is not saved: leaving the world in the middle of a forced night ends it.
