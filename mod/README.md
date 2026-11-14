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

## What 0.1.0 does

The night's logic and the rise in staging C "The Abyss". **Never built or seen in game yet**: the sky pass
type-checks and its shader validates, but its look is only known from the preview page.

- Server: ticks the blood moon with the overworld clock (full moons, 1 chance in 2), logs each phase change.
- `/crimson start` (operators): jumps to sunset and forces tonight's blood moon. `/crimson stop`, `/crimson status`.
- Client: the fog turns red through the omens and the eclipse; the camera rumbles during the eclipse
  and jolts when the eye opens.
- Sky pass (our own GPU pass after the world): our moon over the vanilla one, swelling while a spiral void
  eats it; flame corona; spiral aurora; stars dragged in and put out; the web of sky cracks whose cells tear
  open on space; two seconds of darkness, a flash and a shock wave; the eye opens, follows where you look,
  narrows its pupil when you stare at it and blinks; the land is graded red. No bloom yet.

## Test of 0.1.0

In a creative single player world (cheats on):

1. `/crimson start`: the clock jumps to sunset. The answer says the eclipse starts in about a minute.
2. Look east. For a minute (omens) the sunset reddens and the moon rises. Then the eclipse, one minute:
   compare with version C of `preview/blood-moon-rise.html`. Then darkness, the flash, the eye.
3. Look around with the eye open: its iris should follow, and the pupil narrow when your crosshair is on it.
4. `/crimson status` at any time names the phase. `/crimson stop` brings the vanilla sky back at once.

Send screenshots (omens, mid eclipse, the eye) and the `latest.log` lines with `crimson_eclipse`
(one per phase change, and one `sky pass on ...` line naming the frame's format).

### What to look for (things only the game can tell)
- **Two moons**: ours is placed from the clock, assuming the moon's angle is linear in time. A second,
  vanilla moon peeking out next to ours means the angle is off.
- **Clouds**: if vanilla clouds hide our sky, or our sky paints over the clouds.
- **Colours** washed out or too dark: the frame's format (the log line) will say why.
- **Nothing in the sky at all**: the depth is not what the pass expects; send the log line.

### Known for this first version
- No bloom yet, no sound, no burgundy grass, no particles.
- Single player only: a remote client is not told about the blood moon yet.
- A blood moon is not saved: leaving the world in the middle of a forced night ends it.
