//! Server side: ticks the night with the overworld clock and runs the test
//! command. The rules are `crate::night`'s; this file only talks to Horizon.

use crate::kneeling_colossus_wake::KNEELING_COLOSSUS;
use crate::moon::{day_of, time_of_day};
use crate::night::{Night, Phase};
use crate::shell::{Plan, plan, seed_for_day};
use crate::wake;
use horizon_client::mod_api::{
    Flow, Host, NativeCommand, NativeHeightmap, PerformCommandEvent, RegisterCommandsEvent, Text,
};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Instant;

/// `info` only passes for targets under `horizon`.
pub const TARGET: &str = "horizon::mod::crimson_eclipse";
const OVERWORLD: &str = "minecraft:overworld";
/// No blood moon shows.
const NO_DAY: i64 = i64::MIN;

/// What the server decides and the client reads. In single player both sides
/// share the mod's one instance; a remote client is not told yet.
pub struct Shared {
    night: Mutex<Night>,
    /// The day whose blood moon shows now, or [`NO_DAY`].
    showing: AtomicI64,
    /// The client's clock while a blood moon shows, for the render thread
    /// (which has no host): the day time, the fraction of a tick past it, and
    /// when the client last said so.
    clock: Mutex<Option<(i64, f32, Instant)>>,
    /// The hour of the last client tick that asked for sounds, or [`NO_DAY`].
    sound_tick: AtomicI64,
    /// Tonight's break and the day it was planned for.
    shell: Mutex<Option<(i64, Arc<Plan>)>>,
    /// Overworld chunks loaded since the last look for anchors.
    loaded_chunks: Mutex<Vec<[i32; 2]>>,
    /// The anchors that ticked lately (near a player): where, how many quarter turns, and when.
    anchors: Mutex<Vec<([i32; 3], u8, Instant)>>,
}

impl Default for Shared {
    fn default() -> Self {
        Self {
            night: Mutex::new(Night::default()),
            showing: AtomicI64::new(NO_DAY),
            clock: Mutex::new(None),
            sound_tick: AtomicI64::new(NO_DAY),
            shell: Mutex::new(None),
            loaded_chunks: Mutex::new(Vec::new()),
            anchors: Mutex::new(Vec::new()),
        }
    }
}

impl Shared {
    fn night(&self) -> MutexGuard<'_, Night> {
        self.night
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Whether a blood moon shows at `day_time`, for the client.
    pub fn shows(&self, day_time: i64) -> bool {
        self.showing.load(Ordering::Relaxed) == day_of(day_time)
    }

    /// The client says what time it shows, each frame a blood moon is up.
    pub fn set_client_clock(&self, day_time: i64, partial: f32) {
        *self.clock() = Some((day_time, partial, Instant::now()));
    }

    /// The client's clock, if it spoke in the last half second.
    pub fn client_clock(&self) -> Option<(i64, f32)> {
        let (day_time, partial, at) = (*self.clock())?;
        (at.elapsed().as_secs_f32() < 0.5 && self.shows(day_time)).then_some((day_time, partial))
    }

    /// Notes the hour of this client tick and gives the last one's, if a
    /// blood moon showed then too. `None` forgets it.
    pub fn swap_sound_tick(&self, now: Option<i64>) -> Option<i64> {
        let last = self
            .sound_tick
            .swap(now.unwrap_or(NO_DAY), Ordering::Relaxed);
        (last != NO_DAY).then_some(last)
    }

    /// Ticks since the structures woke (`crate::wake::awake_ticks`), with the
    /// fraction of a tick past `day_time`; None while they sleep.
    pub fn awake_ticks(&self, day_time: i64, partial: f32) -> Option<f32> {
        let phase = self.night().phase_at(day_time);
        wake::awake_ticks(phase, day_time).map(|t| t as f32 + partial)
    }

    /// An anchor ticked at `pos`, its structure turned `turns` quarter turns.
    fn note_anchor(&self, pos: [i32; 3], turns: u8) {
        let mut anchors = lock(&self.anchors);
        anchors.retain(|&(p, _, at)| p != pos && at.elapsed().as_secs_f32() < ANCHOR_FORGOTTEN);
        anchors.push((pos, turns, Instant::now()));
    }

    /// The anchors that ticked in the last few seconds.
    pub fn anchors(&self) -> Vec<([i32; 3], u8)> {
        lock(&self.anchors)
            .iter()
            .filter(|&&(_, _, at)| at.elapsed().as_secs_f32() < ANCHOR_FORGOTTEN)
            .map(|&(p, t, _)| (p, t))
            .collect()
    }

    /// The break of the sky for the blood moon of `day_time`'s day, planned once.
    pub fn shell(&self, day_time: i64) -> Arc<Plan> {
        let day = day_of(day_time);
        let mut guard = self
            .shell
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if let Some((d, p)) = guard.as_ref() {
            if *d == day {
                return Arc::clone(p);
            }
        }
        let p = Arc::new(plan(seed_for_day(day)));
        *guard = Some((day, Arc::clone(&p)));
        p
    }

    fn clock(&self) -> MutexGuard<'_, Option<(i64, f32, Instant)>> {
        self.clock
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn publish(&self, day_time: i64) {
        let day = self.night().showing(day_time).unwrap_or(NO_DAY);
        self.showing.store(day, Ordering::Relaxed);
    }
}

pub fn register_commands(event: &mut RegisterCommandsEvent<'_>) {
    for usage in ["crimson start", "crimson stop", "crimson status"] {
        event.commands.push(NativeCommand::op(usage, 2));
    }
}

pub fn perform_command(
    shared: &Shared,
    host: &mut dyn Host,
    event: &mut PerformCommandEvent<'_>,
) -> Flow {
    let mut words = event.command.split_whitespace();
    if words.next() != Some("crimson") {
        return Flow::Continue;
    }
    let Some(level) = host.level(OVERWORLD) else {
        return Flow::Continue;
    };
    let Some(day_time) = host.level_day_time(level) else {
        return Flow::Continue;
    };
    let reply = match words.next() {
        Some("start") => {
            let jump = shared.night().force(day_time);
            if host.level_set_day_time(level, jump) {
                shared.publish(jump);
                "Blood moon forced: sunset now, the eclipse starts in about a minute."
            } else {
                "Blood moon forced for tonight, but the clock could not be moved."
            }
        }
        Some("stop") => {
            shared.night().cancel(day_time);
            shared.publish(day_time);
            "Blood moon called off for tonight."
        }
        Some("status") => match shared.night().phase_at(day_time) {
            Phase::Quiet => "No blood moon right now.",
            Phase::Omens => "Blood moon: omens.",
            Phase::Eclipse => "Blood moon: eclipse.",
            Phase::Climax => "Blood moon: the eye opens.",
            Phase::Night => "Blood moon: night under the eye.",
            Phase::Dawn => "Blood moon: dawn.",
        },
        _ => "Usage: /crimson start | stop | status",
    };
    host.feedback(Text::literal(reply));
    Flow::Cancel
}

/// Seconds after its last tick when an anchor is no longer drawn (it ticks every half second while a player is near).
const ANCHOR_FORGOTTEN: f32 = 3.0;

/// The block hidden in the Kneeling Colossus' heart; its block entity wakes the colossus.
pub const ANCHOR: &str = "crimson_eclipse:colossus_anchor";
/// `Level.setBlock`'s flag that tells the clients and no neighbour: lighting a candle must not pop it off.
const UPDATE_CLIENTS: i32 = 2;

/// A tick of the colossus anchor's block entity (it ticks while players are
/// near): every half second, each block of the colossus' wake table gets the
/// `lit` that `crate::wake` gives for now: lit one after the other during the
/// eclipse, out from dawn. A block that is not there now (an unloaded chunk,
/// one a player replaced) has no `lit` and is left; it is tried again.
pub fn anchor_tick(shared: &Shared, host: &mut dyn Host, pos: [i32; 3]) {
    let Some(level) = host.level(OVERWORLD) else {
        return;
    };
    let (Some(game_time), Some(day_time)) =
        (host.level_game_time(level), host.level_day_time(level))
    else {
        return;
    };
    if game_time.rem_euclid(10) != 0 {
        return;
    }
    let Some(turns) = host
        .block_property(pos, "facing")
        .and_then(|facing| wake::turns(&facing))
    else {
        return;
    };
    shared.note_anchor(pos, turns);
    let awake = wake::awake_ticks(shared.night().phase_at(day_time), day_time);
    for &(offset, delay) in KNEELING_COLOSSUS {
        let at = wake::place(pos, offset, turns);
        let want = if wake::lit(awake, delay) {
            "true"
        } else {
            "false"
        };
        if host
            .block_property(at, "lit")
            .is_some_and(|now| now != want)
        {
            host.set_block_property_with(at, "lit", want, UPDATE_CLIENTS);
        }
    }
}

/// The most loaded chunks looked through for anchors in one tick.
const CHUNKS_PER_TICK: usize = 8;

/// A chunk came into the world: its anchors are looked for on a later tick
/// (the chunk's blocks are there, but the world is changed from a tick).
pub fn chunk_load(shared: &Shared, dimension: &str, chunk: [i32; 2]) {
    if dimension == OVERWORLD {
        lock(&shared.loaded_chunks).push(chunk);
    }
}

/// A structure generated in the world carries its anchor block but not the
/// anchor's block entity (Horizon's worldgen keeps vanilla block entities
/// only), so the anchor never ticks. Each loaded chunk is read near its
/// surface; an anchor found there is set again by command, which gives it its
/// block entity (it carries no data, so setting it again loses nothing).
fn reseat_anchors(shared: &Shared, host: &mut dyn Host) {
    let chunks: Vec<[i32; 2]> = {
        let mut loaded = lock(&shared.loaded_chunks);
        let keep = loaded.len().saturating_sub(CHUNKS_PER_TICK);
        loaded.split_off(keep)
    };
    for chunk in chunks {
        let columns = wake::chunk_columns(chunk);
        let depth = wake::ANCHOR_SEARCH_DEPTH;
        let Ok(read) = host.read_columns(
            OVERWORLD,
            &columns,
            NativeHeightmap::WorldSurface,
            (depth, 0),
        ) else {
            continue;
        };
        for pos in wake::find_in_columns(
            ANCHOR,
            &read.palette,
            &read.blocks,
            &columns,
            &read.bases,
            depth,
        ) {
            let Some(facing) = host.block_property(pos, "facing") else {
                continue;
            };
            let [clear, set] = wake::reseat_commands(ANCHOR, pos, &facing);
            let done = host.run_command(&clear) && host.run_command(&set);
            log::info!(
                target: TARGET,
                "crimson_eclipse: anchor at {} {} {} set again (facing {facing}): {}",
                pos[0],
                pos[1],
                pos[2],
                if done { "done" } else { "FAILED" }
            );
        }
    }
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

pub fn level_tick_post(shared: &Shared, host: &mut dyn Host, dimension: &str) {
    if dimension != OVERWORLD {
        return;
    }
    reseat_anchors(shared, host);
    let Some(day_time) = host
        .level(OVERWORLD)
        .and_then(|level| host.level_day_time(level))
    else {
        return;
    };
    let change = shared.night().tick(day_time);
    shared.publish(day_time);
    if let Some(change) = change {
        log::info!(
            target: TARGET,
            "crimson_eclipse: day {} at {}: {:?} -> {:?}",
            change.day,
            time_of_day(day_time),
            change.from,
            change.to
        );
    }
}
