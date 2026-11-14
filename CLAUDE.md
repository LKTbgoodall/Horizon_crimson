# Crimson Eclipse: instructions for Claude

A **blood moon** mod for **Horizon** (Minecraft Java 26.3 rewritten in Rust), written as a **native Rust mod**. On some nights the moon turns red and the world goes through spectacular events, the kind seen in the TikTok videos of Horizon mods: a cracking sky, blood meteors, crimson crystal corruption, red lightning, rifts. **Rendering comes first**: our own GPU passes, real models, HD textures.
**Talk to the user (Bastien) in French**: casual, very direct, short answers, the next concrete action. He delegates creative choices: decide and say what you decided. **Write every project file in English**: vault notes, code, comments, commit messages.

## Project memory = `vault/` (Obsidian)
**At the start of every session, BEFORE anything else:**
1. Read `vault/00 - Home.md` (status, next step, vault map).
2. Read the most recent note in `vault/06 - Journal/`.
3. Read the notes the task needs. The most important ones:
   - `vault/04 - Design/Concept.md` (what the mod is, Bastien's rules)
   - `vault/04 - Design/Events.md` (the event catalogue)
   - `vault/02 - Horizon/Horizon hooks and API.md` (the API reference; § A8 and § C for rendering)
   - `vault/03 - History/From Cagebound.md` (what already worked in game, and the traps)

**At the end of every session (or after a significant step):**
1. Create or update `vault/06 - Journal/YYYY-MM-DD.md` (template: `vault/99 - Templates/Template - Journal.md`).
2. Tick off `vault/01 - Project/Roadmap.md`.
3. Update "Where we are", "Next step" and `updated` in `vault/00 - Home.md`.
4. Questions → `vault/01 - Project/Open questions.md`. Significant decision → a new ADR in `vault/05 - Decisions/` plus `Decision index.md`.
5. Something learned or corrected about Horizon → update the reference note, its `verified_on` and the commit it was read on. Keep **verified** and **to check** apart.

Vault conventions: `[[Note title]]` wiki links, YAML frontmatter, API status ✅ / ⏳ pending / ❌ / ❓.

## Project rules
- **Spectacle first**: every event must look like a "masterclass". Plain boxes with vanilla textures are not a final look (Bastien turned that down on Cagebound).
- **Preview first**: before coding a look, show a faithful animated preview page with candidates and let Bastien pick.
- **Nothing moves without a visible reason**, and **you must see it**: no effect hidden underground or explained by nothing.
- Logic goes in a **pure crate** (no dependency, no Horizon type), tested with `cargo test`; the hook layer translates, it does not decide.
- Use **catalog hook points** only (and the typed `RenderHooks` for frames); never call an engine method outside `native-hooks.json` / `docs/native-mods.md`.
- Only crates already in Horizon's `Cargo.lock`. `RUSTFLAGS=-D warnings`: any warning breaks the build.
- The Horizon API moves daily: **read the source, never your memory**. The pinned source lives in `ext/src-<rev>` (gitignored).
- No Mojang code or assets in the repo: vanilla textures are named, never copied.
- **Never run a command with `--trust-native-code` yourself**: Bastien runs the build. Claude runs `tools/check-glue.sh` (no game, nothing run) before asking for any in-game test.
- Before saying code is done: `cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, `tools/check-glue.sh`.

## Git and GitHub
- The only author is **LKTbgoodall** (repo-local `user.name` / `user.email`).
- **No `Co-Authored-By`**, and no Claude or "Generated with" attribution line, in commits or PRs.
- Remote: https://github.com/LKTbgoodall/Horizon_crimson (public, `origin`). Commit after each step and push. Commit messages in English.

## Machines and testing
- **Dev PC**: Horizon launcher (`%LOCALAPPDATA%\Programs\Horizon Launcher\horizon-launcher.exe`). Test in the **`cagebound-dev` instance** (on Nightly `9f42064`), not in `mon-horizon`, whose other mods are built for `fdc87ae`. Claude may read `%APPDATA%\horizon-launcher\native\build.log` and the instance's `logs/latest.log`.
- Build command for Bastien (game closed): `powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Instance cagebound-dev`.
- Ask for screenshots when a look needs checking.

## Mod identity
- Mod id `crimson_eclipse`, display name "Crimson Eclipse" (Claude's pick, to confirm). License: to choose (MIT proposed). In-game text English first.

## External references
- Horizon docs: https://playhorizon.dev/docs · Engine: https://github.com/horizon-rust/horizon
- Sister projects: `D:\dev\mod_minecraft\Horizon_quest` (shipped), `D:\dev\mod_minecraft\cagebound` (paused; its `fx.rs` is a GPU effects draft to start from)
