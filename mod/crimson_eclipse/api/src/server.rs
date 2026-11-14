//! Server side: ticks the night with the overworld clock and runs the test
//! command. The rules are `crate::night`'s; this file only talks to Horizon.

use crate::shell::{plan, seed_for_day, Plan};
use crate::moon::{day_of, time_of_day};
use crate::night::{Night, Phase};
use horizon_client::mod_api::{
    Flow, Host, NativeCommand, PerformCommandEvent, RegisterCommandsEvent, Text,
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
}

impl Default for Shared {
    fn default() -> Self {
        Self {
            night: Mutex::new(Night::default()),
            showing: AtomicI64::new(NO_DAY),
            clock: Mutex::new(None),
            sound_tick: AtomicI64::new(NO_DAY),
            shell: Mutex::new(None),
        }
    }
}

impl Shared {
    fn night(&self) -> MutexGuard<'_, Night> {
        self.night.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
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
        let last = self.sound_tick.swap(now.unwrap_or(NO_DAY), Ordering::Relaxed);
        (last != NO_DAY).then_some(last)
    }

    /// The break of the sky for the blood moon of `day_time`'s day, planned once.
    pub fn shell(&self, day_time: i64) -> Arc<Plan> {
        let day = day_of(day_time);
        let mut guard = self.shell.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
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
        self.clock.lock().unwrap_or_else(|poisoned| poisoned.into_inner())
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

pub fn perform_command(shared: &Shared, host: &mut dyn Host, event: &mut PerformCommandEvent<'_>) -> Flow {
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

pub fn level_tick_post(shared: &Shared, host: &mut dyn Host, dimension: &str) {
    if dimension != OVERWORLD {
        return;
    }
    let Some(day_time) = host.level(OVERWORLD).and_then(|level| host.level_day_time(level)) else {
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
