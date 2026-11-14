---
tags: [horizon, reference, api, hooks]
source: horizon native-hooks.json, docs/native-mods.md, crates/horizon-client/src/game/native_*.rs, generated mod_api_generated*.rs (Organa, fdc87ae); Horizon Quests' API note (1453e0e / fdc87ae / 9f42064)
verified_on: 2026-11-13
---
# Horizon hooks and API ("mob machine" view)

Back: [[Horizon - Overview]]

> [!warning] Read before trusting
> - Everything below was **read in the source**, mostly at Nightly **`fdc87ae`** (API 411). Our next pin will be newer (`9f42064` or later): **recheck every signature in the generated traits** before coding against it.
> - **API N**: needs `"hooks": N` at least. **⏳ pending**: documented as `@API:name@`, not numbered, cannot be targeted yet.
> - Section A comes from the Organa prototype (typed API names, `host.x`). Section B comes from Horizon Quests (mixin names, `native_x` on `Game`); the typed `Host` has most of them without the `native_` prefix.
> - "Tested in game" is said explicitly; everything else is read only.

# A. Mobs, block entities, machines (Organa, `fdc87ae`)

## A1. Capturing and releasing a mob
- **Right-click an entity**: `interact_entity(host, InteractEntityEvent { entity: i32, kind: &str, stack: Option<&ItemStack> }) -> Flow`, server side, before vanilla, cancellable (API 29).
- **v2 with the hand**: `interact_entity_v2(host, InteractEntityV2Event { entity, kind, hand: Hand, stack })` and `right_click_block_v2(host, RightClickBlockV2Event { pos, face, hand })`. Called right after v1, once per hand tried (off hand only if the main hand did nothing); `Cancel` ends the click. They came from the build's injections, not from the source's `native-hooks.json`. `Hand::{Main, Off}` re-exported by `mod_api`. **Use the main hand only**: v1 runs for each hand, and a second call on the off hand undid the first (store then take back).
- **Read the mob**: `host.entity(id) -> EntityRef`, `host.entity_nbt(ref)` = the whole mob like `/data get entity` (`saveWithoutId`, UUID included) (API 386).
- **Remove without death or loot**: `host.remove_mob(dimension, id)` (API 37). The Wither is a mob like the others (`game/wither.rs`); the dragon has its own file (not read).
- **Release the same individual**: `host.summon(dimension, kind, pos, nbt)` (API 59) adds `id` and sets `Pos` itself (`native_entities.rs` 213).
- ✅ **Tested in game (2026-11-09)**: capture, release, same creeper back with its name and health, after reloads.

## A2. Holding a specimen in an item
- `component_types` hook: declare our NBT component id. `host.component(stack, id)` / `host.set_component(stack, id, tag)` (checks network NBT limits); `remove_component` leaves a `!id` mark (`native_components.rs`).
- **Change the held stack inside a click**: `host.carried_stack(slot) -> Option<&mut ItemStack>` on the acting player: 0..36 inventory, 100..103 armour, -106 off hand (`native_hooks.rs` 11568). Main hand = `acting_player().selected_slot` (u8, 0..8). `set_inventory_slot` and `native_inventory` refuse "inside a player's turn". Pattern: modify a copy, then replace the stack at once.
- `host.give_stack(uuid, stack)` gives a whole stack with components (API 98), returns what did not fit.
- Items in code: `items` hook (API 145): `Item { id, template, max_stack_size, rarity, components, crafting_remainder, place_block }`. Or in the content mod.
- `ItemStack { item: Arc<str>, count, damage, extra }`, `PartialEq`; `ItemStack::new(item, count)`.
- **NBT**: `Compound = BTreeMap<JavaString, Tag>`; `JavaString` not re-exported by `mod_api`, `From<&str>` works to insert, read keys with `to_string_lossy()`. `Tag::get(&str)` exists only on `Tag`. `mod_api::parse_snbt`.
- **Dropped item**: `item_expire(host, ItemExpireEvent { entity, stack, extra_life })`, `extra_life` capped at 32766 ticks (re-extend each time to keep a full net from despawning). `item_despawn`, `entity_leave_level` only listen.

## A3. Holding a specimen in a block (block entity)
- `block_entity(host, BlockEntityEvent { block }) -> Option<(String, Compound)>`: a block of ours gets a saved block entity on any template (API 15, 129).
- `ModBlockEntity { id, nbt, items, data }`, each `DerefMut` bumps its revision. `host.mod_block_entity(pos)` gives a copy; `host.change_mod_block_entity(pos, &mut |be| …)` changes it and marks it to save; `host.block_entity_sync(pos)` resends the tag (API 52).
- **Client tag**: `block_entity_update_tag(event) -> Option<Compound>` (no `Host`). The client **merges** the received tag and never removes a key: always send every key, an empty value rather than nothing.
- **Ticking**: `block_entity_ticks(BlockEntityTicksEvent { block, ticks })` set true; `block_entity_tick(BlockEntityTickEvent { pos, entity: &mut ModBlockEntity })` writes `entity.nbt` and `entity.items`. The block entity is out of the world during the call. `block_entity_sync` from a tick goes out next tick. `play_sound`, `send_particles` work from it (per their docs).
- **Container**: `block_entity_container(BlockEntityContainerEvent { block }) -> Option<ModContainer>`, `ModContainer { slots, faces: [down, up, north, south, west, east], inputs, outputs, menu }`, by block name. Hoppers: `inventory_move_item(host, InventoryMoveItemEvent { source, destination, item }) -> Flow` cancels a move. `host.insert_item(pos, face, stack)` puts a stack into a container like a hopper and returns the rest (machine output).
- **Removal** (`horizon-world/src/level/update.rs` 358, `game/spill.rs` 539): a mod block entity **with a container drops its items** (unless `UPDATE_SKIP_BLOCK_ENTITY_SIDEEFFECTS`); without one, its NBT just vanishes. No hook sees the removed NBT; `loot_drops` does not have the block entity. → keep the specimen **as an item in a container slot** so the engine drops it on any removal path.
- **Who removes a block, and which hook sees it first**: player → `destroy_block(host, DestroyBlockEvent { pos, state }) -> Flow` (cancellable); explosion → `explosion_detonate` (positions can be removed from the list); piston → no piston moves a block with a mod block entity; wither, dragon → no hook, use vanilla tags `wither_immune`, `dragon_immune`; `/setblock`, `/fill` → none.
- **Ctrl + middle click** copies a mod block entity into the item (`docs/native-block-clone-item.md`); `player_pick_item(host, PlayerPickItemEvent { player, name, from_entity, pos, entity_id }) -> Flow` cancels it.
- `host.destroy_block(pos, tool, collect)` breaks like a player (loot, contents), without going through the `destroy_block` hook.

## A4. Placing and block states
- `use_item_on(UseItemOnEvent { stack, pos, face })` can refuse a placement; `place_block(PlaceBlockEvent { stack, pos, state })` comes after placing, before the stack shrinks.
- `host.block_property(pos, key)`, `host.set_block_property(pos, key, value)` (block entity kept); client: `host.block_state_property(state, key)`. A property the mod declares (`state_properties`) works on any template.
- **A mod door is a real `DoorBlock`** (`level/place.rs` 1492 places the top half) **with a survival rule** (`level/survive.rs` 144): breaking the block below pops the door by a path no hook sees. Unusable for a machine holding a specimen.
- `block_changed(&self, level: &dyn LevelHost, BlockChangedEvent { dimension, pos, old, new })`: no `Host`, no block name (`LevelHost` has only `block_state`, `is_client_side`, `state_with_property`). `set_block` re-fires `block_changed` on the same thread: never hold the state lock in it.
- `right_click_block(host, RightClickBlockEvent { pos, face }) -> Flow`; `host.acting_player()` gives `uuid`, `dimension`, `sneaking`.

## A5. Drawing a mob inside a block (client)
- `block_entity_submit(host, BlockEntitySubmitEvent { pos, block, state, entity, draw })`: once per frame while in view, up to 64 blocks (API 71). `block_entity_render_bounding_box` must cover a two-block machine, or the top disappears at some angles.
- `host.bake_layer("minecraft:creeper#main")` → the vanilla model part tree; do it once and keep it. Baking a layer no mob has (player, chest) rereads resources each call: slow.
- `host.draw_model_part(draw, &part, sprite, tint)`: sprite like `entity/creeper/creeper` (atlas keys `gui.atlas.sprites` have **no namespace for vanilla**), or ours `crimson_eclipse:entity/x`.
- Mob model space: +y down, facing -z. Before drawing: `draw.scale([1.0, -1.0, -1.0])`, `draw.translate([0.0, -1.501, 0.0])`, then scale to fit.
- `BlockEntityDraw`: `push`, `pop`, `translate`, `rotate_about`, `scale`, `keep`, `spin`; fields `partial`, `game_time`, `light`.
- `ModelPart` (`mobs/model_layers.rs` 461): `x y z`, `x_rot y_rot z_rot` (radians, applied z then y then x), scales, `visible`, `skip_draw`; `get_child_mut("head")`, `reset_all_poses()`.
- **No free vanilla animation**: pose the parts yourself each frame, like `setupAnim`. Each mob's idle and work animations are ours to write.
- **Changing look per level**: another texture, a tint, or extra parts declared in `layer_definitions` (boxes built in code, like `createBodyLayer`). `draw.scale` for size.
- `draw_cube(draw, from, to, [Option<CubeFace { sprite, uv }>; 6], tint)` in texels; `draw_item(draw, &stack, DisplayContext::Ground, None, seed)`.
- Live mobs: `mob_submit` replaces a mob's model, `mob_layer` adds a layer (API 110, 149): for the mod's rare creatures.
- Creeper swelling (`CreeperRenderer.scale`, `mobs/render.rs` 1334): with progress `g` 0..1, `f = 1 + sin(g × 100) × g × 0.01`, `g = clamp(g, 0, 1)⁴`, scale `(1 + g × 0.4) × f` on x and z, `(1 + g × 0.1) / f` on y. Flash white when `floor(g × 10)` is odd. Charged aura: `energy_swirl`, scroll `xOffset = t × 0.01`; `draw_model_part` does not scroll UVs. `entity/creeper/creeper_armor` (64 × 32) has 644 opaque and 1404 transparent pixels: the aura draws as streaks.
- ✅ **Tested in game (2026-11-09)**: the real creeper model drawn in a block, right texture and lighting.

## A6. Machine GUI (`fdc87ae`, 2026-11-10, read only)
- **Who opens a menu**: only a block whose template opens one (furnace, barrel, chest, hopper, dispenser…, `horizon-world/src/level/interact.rs` 430) produces `PlayerEffect::OpenMenu`; `game.rs` 6285 then opens the mod container (`open_mod_menu`, `native_hooks.rs` 11710) if its `ModContainer.menu` is set. Glass opens none.
- **Menu type**: `data/<id>/horizon/menu/<name>.json` with `slots`, `data_slots`, `results` (`docs/mods.md`, "Menu types"). Data slots are `ModBlockEntity.data` (16 bits on the network). Clicks go through the vanilla menu engine.
- **Hooks**: `screen(host, ScreenEvent { block }) -> Option<NativeScreen>` (`width`, `height`, `slots: Vec<Option<[f32; 2]>>`, `inventory_x`, `inventory_y`, `own_labels`, `own_background`); `screen_draw(host, ScreenDrawEvent { block, data, batch, origin })`; `screen_tooltip(host, ScreenTooltipEvent { block, data, at, lines })`; `menu_slot_rules(MenuSlotRulesEvent { menu, slot, stack, may_place, max_stack })`, no `Host`, answer from the stack alone.
- **Drawing**: `host.fill(batch, [x, y, w, h], argb)`, `host.text(batch, text, [x, y], rgb, shadow)`, `host.sprite(batch, name, src, dst)` (`gui/...` vanilla or `mod:gui/...`), `host.item(batch, item, at, size)`.
- **Render layer of a block**: chosen per quad from the sprite's transparency (`horizon-client-render/src/mesher.rs` 2090), not from the template: a texture with holes is cutout even on a furnace template. A model can also say `render_type`.
- ❓ To check in game: the GUI opening on a furnace template with `occludes: false`, the mob lit inside.

## A7. World, time, effects
- `level_tick_post(host, LevelTickPostEvent { dimension })`: the dimension is "in place" (`block`, `set_block`, `summon`, `send_particles` act on it). Server `Game` only, solo included. In `server_tick` which level is in place is undefined: don't read blocks there.
- Time: `host.level_game_time(host.level("minecraft:overworld")?)` (same for all levels); client `draw.game_time`. Pattern: the server writes phase + start tick, the client animates alone; sync only on phase changes.
- `chunk_load` / `chunk_unload` (`dimension: &str`, `chunk: [i32; 2]`); spawn chunks arrive before `WorldOpenReady`.
- Particles: `ParticleOptions::simple(ParticleType::Explosion | LargeSmoke)`, `ParticleOptions::dust(rgb, size)`; `host.send_particles`, `host.play_sound`. Drop an item: `summon(dim, "minecraft:item", pos, parse_snbt("{Item:{id:…,count:N}}"))`.
- Saving: `world_saved` (API 306), `server_stopping`, `world_lifecycle` `WorldCloseFinal`; `host.world_dir()`.
- **Energy (API 142)**: `block_entity_energy`, `energy`, `energy_insert`, `energy_extract`, `move_energy`; fluids `block_entity_fluids`. Not evaluated yet ([[Open questions]]).
- Client commands: `command(host, CommandEvent { command })` (no slash, before the server; `Cancel` takes it), `commands` for completion; `host.client_action_bar(Text, animate)`.
- Logger: `info` only passes for targets `horizon…`: log with target `horizon::mod::crimson_eclipse`. A same `warn!` line is capped at 100 per minute. `error` always passes.
- The mod can call render modules re-exported by `horizon_client` (`atlas_sources`, `sprites`, `native_emissive`, `logging`): used by Organa's emissive diagnostic.

## A8. Spectacle: what a mod can draw (read 2026-11-13 in `docs/native-mods.md` of the launcher's source copy `2ebf00a`, API 411)
Read only, nothing tried in game. This is the toolbox for a "masterclass" look (Cagebound's press directions).
- **Our own GPU passes**: `native_world_drawn(world)` (API 58), a render hook point in `crates/horizon-client-render/src/gfx/native_render.rs`, targeted as `horizon_client_render::gfx::native_render::native_world_drawn` (mixin style, not the typed trait). Runs on the render thread after sky, terrain, entities, particles, weather and the world post pass, before the hand and HUD. `WorldDrawn` holds the wgpu device, queue and encoder, the frame's colour target (copy it out before sampling), the reversed depth, the camera position and matrices (with and without TAA jitter), the entity quads by entity, the entity atlas and the block sprite arrays (API 380). → shock waves, heat haze, bloom, volumetric dust, a cracked sky: what the "Minecraft rust rewrite" TikTok videos show. `native_render_needs` asks for entity runs and world depth without a shader pack. Most powerful and most fragile path (wgpu types).
- **Sky** (read 2026-11-14 at `9f42064`, `native-hooks.json` and `native_render.rs`): ❌ no hook point for the moon, the sun, the stars or the sky colour (sky-related points are only `compute_fog_color`, `render_fog`, `day_time`, `level_day_time`, `weather`). A custom sky is painted in `world_drawn` where the reversed depth is 0. `WorldWarp.source` may also carry, after a `// [fragments]` line, `fn world_fragment(f: Fragment) -> Painted` run for every terrain pixel. ❓ to check in game: whether vanilla clouds write depth.
- **The sky's turn is eased, and a custom sky pass works** (seen in game 2026-11-14 with Crimson Eclipse 0.1.0): `world_drawn` draws on a `Bgra8Unorm` copyable frame with full-size depth; sky pixels have depth 0; vanilla clouds write depth. The moon's angle comes from the vanilla day timeline (`visual/moon_angle` 180 → 540 from tick 6000 to the next, cubic Bézier ease `[0.362, 0.241, 0.638, 0.759]`): at tick 13000 the moon is 3.5° up, at 14600 30°. No hook or host method gives it: compute it (`crimson-core::sky::day_turn`).
- **Hiding vanilla clouds** (read 2026-11-14, type-checked, not seen): no hook turns them off, but `render_fog`'s `event.fog.cloud_end` is the distance their alpha fades to 0 at (`oit_clouds.wgsl`): near 0 hides them. Their depth may stay (the depth bounds stage sees the unfaded alpha).
- **Client sounds** (read 2026-11-14, type-checked): `host.play_local_sound(event, at, volume, pitch, delay)` in a client hook with `&mut dyn Host` (`tick`; `host.window()` tells the window's game from the server's), `host.muffle_sounds(amount, lowpass, ticks, exempt)`, `host.player()` for the position.
- **Coloured dynamic lights and rims**: `native_visuals` (API 46): camera-local RGB light added in the terrain and entity shaders (not gameplay light), **8 lights and 256 rims per mod**, within 32 blocks of the player, 16 coloured lights in all. Frame-local requests.
- **Custom particles**: `ParticleEngine::controlled(name, position, translucent, controller)`: a `ParticleController` ticks our own state, picks sprite frames, spawns more; `set_full_bright`; blended or not. Compiled API, needs the matching pin.
- **Camera shake**: `native_camera_shake(partial, shake)` (API 82): pitch / yaw / roll ≤ 10° and offset ≤ 0.5 block, scaled by the player's Distortion Effects setting. **Field of view**: `compute_fov`, `compute_fov_modifier`. **Camera pose**: `native_camera_pose` (API 402).
- **World primitives** (typed trait `world_primitives`): lines, outline and filled boxes, **beacon beams**, **camera-facing text** (holograms), optionally through walls.
- **Articulated models**: `native_standalone_models` (API 151) bakes JSON models no blockstate names (`crimson_eclipse:block/piston_rod`), drawn as parts by `native_draw_model(draw, model, tint)` in `block_entity_submit` or `mob_submit`; plus `draw_quad`, `draw_cube`, `draw_block`, `draw_item`, `draw_model_part`. `BlockEntityDraw.light` can be set to full bright for glowing parts.
- **Mod shader pack**: a native mod can bundle a Horizon shader pack named `native-<mod id>` and feed it eight `vec4`s per frame with `native_shader_params` (API 84), e.g. an explosion's centre and age.
- Also: `compute_fog_color` (API 113), `native_biome_colors` (grass, leaves, water colours live), `native_light(pos)` / `native_weather()` / `native_day_time()` (API 97), `music_layers`, `lightning_strike`, connected textures (OptiFine CTM rules in a content mod need no code).

# B. General API (Horizon Quests, `1453e0e` → `9f42064`)

## B1. Network and sync
- Mod messages (API 40): `native_net_send_to_player(player, channel, data)` / `native_net_send_to_server(channel, data)`; receive `native_net_from_client(player, channel, data)` (server, tick after arrival) / `native_net_from_server(channel, data)` (window only).
- Channel `horizon:mod_net`, subchannel `mod_id:name`. **30,000 bytes per message, 32 messages per tick** per direction and player; every mod hears everything, filter by channel. Vanilla clients never get them.
- Client data is **untrusted**: revalidate on the server.
- Synced attachments: `AttachmentType { sync: true }`, 1 MiB max. `native_player_logged_in` / `logged_out` (API 57), tracking (API 141).

## B2. Players and inventories
- Item helpers of API 9 (`carried_items`, `take_items`, `count_items`, `give_items`) act on the **acting player** (the command's player in a command; the host where none is swapped in).
- `native_server_players()` lists the LAN hub's guests (not the single-player host); host's place: `native_player()`.
- `native_inventory(uuid, kind)` (132) reads hub guests, else the player file.
- ❌ `native_as_player` is **private** at `fdc87ae`: calling it broke a build. Never call an engine method outside the catalog.
- XP / advancement events are **not called for the single-player host** (`lan_acting_uuid` is None for the host). Fallback: `native_run_command("execute if entity @a[...]")` (API 21) returns success.
- `native_run_command(line)`: console, level 4, no output, only where no player is injected (tick): defer effects to the tick.
- Messages: `native_tell`, `native_action_bar(uuid, text)`, `native_broadcast`; title / boss bar via commands.

## B3. Persistence
- Files in the world: `native_world_dir()`, a folder of our own so world backups carry it.
- Config: `native_register_configs` + `NativeConfig::new(mod_id, Client|Common|Server, default)` → `config/<id>-<kind>.toml` (397); every mod hears every config, check `mod_id`.
- Data packs: `native_add_server_reload_listeners` + `NativeReloadListener::json(id, folder)` reads `data/<ns>/<folder>/**/*.json` (400). Good for data-driven machine recipes and mob tables.
- Embedded data: `native_data!("<mod id>", "path")` (41). Client settings: `native_setting` / `native_set_setting`.
- Client recipes: `native_recipes()` (all items with names in the player's language, all recipes).

## B4. Client UI beyond block GUIs
- Mod screen (API 111): `native_mod_screen_open(mod_id)`, render in `native_screen_render_post`, inputs `*_pre` hooks (mouse 80/123/93, keys and chars 104). No widget library, no clip/scissor: build everything.
- Drawing: `native_fill`, `native_quad`, `native_text`, `native_sprite` (API 19; GUI textures `assets/<ns>/textures/gui/<path>.png` packed as `<ns>:gui/<path>`; **a GUI texture over 1024 wide or 512 tall is silently left out**), `native_item_stack` (313).
- HUD: `native_hud`, `native_world_primitives` (lines, boxes, text in the world).
- Toasts: client `native_add_toast` is ⏳.
- `native_show_recipes(stack, lookup)`: opens whatever recipe viewer (JEI) is installed.
- Keys: a mod's keys are rebindable only in Options > Mods (`native_mod_key`). Items claimed client side: `native_claim_items` + `native_poll` (116).
- Client `native_player()` is None during a dimension change, not only out of a world.

## B5. Commands
- `native_register_commands` (API 8): `NativeCommand::new("crimson_eclipse info [x:word]")` / `::op(usage, level)`. Argument types `word`, `text`, `integer`, `number`, `boolean`, `player`, `item`, `block_pos`.
- `native_perform_command(player, command, ran)`: not Brigadier, parse the line yourself.

## B6. Typed API dispatch
- « Mixin injections run first … The first `Cancel` stops dispatch. For replacement hooks, the first `Some` wins. Collection hooks call every mod. »
- Tests: `horizon_client::mod_api::dispatch_<hook>(&mut host, &mods, args…)` with a `Host` double.

# C. Read at the pin `9f42064` (2026-11-13), used by the 0.1.0 glue
Read in `ext/src-9f42064` (shallow fetch of the Nightly) and in the generated `mod_api_generated*.rs` (build/check). The glue type-checks against all of this (`tools/check-glue.sh`); nothing seen in game yet.
- `NATIVE_HOOKS_API` = **415**. Hook signatures that differ from Organa's `fdc87ae` code: `block_entity(&self, host: &mut dyn Host, event: &mut BlockEntityEvent)`, `block_entity_container(&self, host: &dyn Host, ...)`, `block_entity_ticks(&self, host: &dyn Host, ...)`; every event is `&mut` and `#[non_exhaustive]`.
- **Text on a block entity**: `host.draw_text(draw, &Text, at, color, glowing, outline) -> width`; one unit = one font pixel, y down: scale the pose by `[1/64, -1/64, 1/64]` as a sign does. Glowing text is full bright. Widen the render box for long lines.
- **A block's items** (API 48): `extract_item(dim, pos, face, slot, count)`, `move_items(dim, from, from_face, to, to_face, item, max) -> moved` (never loses an item), `insert_item(pos, face, stack) -> rest`. During a machine's own tick its container is out of the world (helpers see no container there): fill a machine from `level_tick_post` instead. `container_slots` is not on the typed `Host`.
- **Taking a plain item from the player**: `take_items(item, count)` takes plain stacks, main hand first. A net whose component was just removed is plain: that is how a full net leaves the hand in a click without emptying a slot by hand. `give_stack(uuid, stack) -> rest` gives a whole stack back (nothing dropped).
- `BlockEntityDraw::light` (16 × sky light in bits 0..8, 16 × block light in bits 8..16): `0xF0F0` = full bright. `rotate_about(axis, degrees, pivot)`: counter-clockwise seen from the axis' end, pivot in blocks. `spin` / `keep` exist for parts turning at a steady speed.
- `visuals` hook: `event.lights.push(NativeColoredLight { at, rgb, radius, intensity })`.
- **Clock and commands** (read 2026-11-14, type-checked by Crimson Eclipse 0.1.0's glue, not seen in game): `host.level("minecraft:overworld") -> Option<LevelRef>` (None on a client; `LevelRef` is `Copy`), `host.level_day_time(level)`, `host.level_set_day_time(level, time) -> bool` (as `/time set`), client `host.day_time()` (keeps counting past 24000). `register_commands`: `event.commands.push(NativeCommand::op("crimson start", 2))`; `perform_command`: `event.command` without its slash, `host.feedback(Text::literal(..))` answers, return `Flow::Cancel` when it is ours.
- **Fog and shake** (same status): `compute_fog_color`: `event.rgb: &mut [f32; 3]` (0..=1), `event.fog_type: horizon_client::fog::FogType` (`Atmospheric`, `Water`, `Lava`, `PowderSnow`), `event.partial`; `camera_shake`: add degrees to `event.shake.pitch / yaw / roll` and blocks to `offset`.
- Re-exports: `Direction` (Down, Up, North, South, West, East), `ParticleType::ElectricSpark`, `Text::colored` / `literal`, `parse_snbt`.
- **Checking a typed-API mod without the launcher**: a standalone workspace with the [api] crate, `horizon-client` as a path into the source, Horizon's `Cargo.lock`, and **Horizon's own `[patch.crates-io]`** (its forks of `wgpu-hal`, `naga`, `libmimalloc-sys` under `third_party/`). Without the patches `horizon-client-render` fails to compile (`dx12::disk_cache`).
