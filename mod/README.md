# Crimson Eclipse: the mod

- `crimson_eclipse/`: the native bundle (typed API). `api/src` holds only the hand-written glue
  (`glue.rs`, `server.rs`, `client.rs`); the build adds the pure core (`crates/crimson-core/src`)
  and writes `lib.rs`.
- `content/`: the content mod. Only its manifest for now (no block, item or texture yet).
- `compatibility.json`: the Horizon pin (Nightly `9f42064`, hooks 415).

## Build and install (Bastien runs it, game closed)

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Instance cagebound-dev
```

`-NoBuild` installs without building, `-Uninstall` takes it out, `-Combined` installs the one `.hmod`.
Claude checks the glue first with `tools/check-glue.sh` (no game, nothing run).

## What 0.1.0 does

The night's logic runs, with only its cheapest looks: **the sky pass (moon, cracks, torn sky, eye) is not in yet.**

- Server: ticks the blood moon with the overworld clock (full moons, 1 chance in 2), logs each phase change.
- `/crimson start` (operators): jumps to sunset and forces tonight's blood moon. `/crimson stop`, `/crimson status`.
- Client: the fog turns red through the omens and the eclipse; the camera rumbles during the eclipse
  and jolts when the eye opens.

## Test of 0.1.0

In a creative single player world (cheats on):

1. `/crimson start`: the clock jumps to sunset. The answer says the eclipse starts in about a minute.
2. Watch the fog for two minutes: it reddens during the omens, goes dark crimson through the eclipse,
   almost black for two seconds near the end, then the camera jolts.
3. `/crimson status` at any time names the phase. `/crimson stop` brings the vanilla fog back at once.

Send a screenshot at mid eclipse, and the `latest.log` lines with `crimson_eclipse` (one per phase change).

### Known for this first version
- No sky yet: the vanilla moon stays as it is.
- Single player only: a remote client is not told about the blood moon yet.
- A blood moon is not saved: leaving the world in the middle of a forced night ends it.
