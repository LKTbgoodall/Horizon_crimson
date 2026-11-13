---
tags: [horizon, publication]
source: playhorizon.dev/docs/publish-a-mod, horizon-mods/MOD-POLICY.md, README.md (via Horizon Quests)
verified_on: 2026-11-13
---
# Publishing and mod policy

Back: [[Horizon - Overview]]

## Process
1. Source in a **public repository** under a free license (SPDX: MIT, Apache-2.0, GPL…).
2. Package the mod (our combined `.hmod`); check it with `cargo horizon-mod check <file>`.
3. Form at https://playhorizon.dev/mods/submit (GitHub login): file, id, game version 26.3, Markdown description, authors, license, source URL, PNG icon ≤ 256 KiB.
4. A **pull request** opens on `horizon-rust/horizon-mods` (`mods/<id>.toml`, `icons/<id>.png`).
5. **Human review**: a maintainer reads **every line**, and every update of a native mod is reviewed.
6. Each published version needs a new `version`. « A published file never changes. »

- Native publishing is **open** (read 2026-11-13: the submit page lists native mods; third-party native entries are merged).
- The registry compiles native mods **on the newest Nightly** with the most downloaded native mods, and marks a version `broken_on` a commit where it fails: re-pin before sending.
- A native entry may name a `.hnmod` (code only) or a `.hmod` (with content). The launcher snapshots the content under the build's `native-content/<id>/`. Launcher bug horizon-rust/horizon#15933 (content of a combined `.hmod` not installed) has a fix, horizon-rust/horizon#16007, seen working in game by Horizon Quests on 2026-11-13: check it shipped before relying on it.

## Policy (MOD-POLICY.md), summary
By submitting, you confirm:
1. the right to publish under the stated license;
2. for a port, respecting the original license (we port nothing: Crimson Eclipse is our own design);
3. **no Mojang code, assets or data** (vanilla textures are named, never copied; game data read at runtime);
4. nothing harmful (malware, data theft, hidden network access);
5. the `source` link matches the compiled code exactly.

## Player-side security
Native mods are **not sandboxed**: the player accepts a red warning and the launcher compiles the game with `--trust-native-code`, per instance.

See also: [[Build, test and tools]]
