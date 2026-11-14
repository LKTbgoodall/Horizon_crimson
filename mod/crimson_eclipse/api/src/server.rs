//! Server side: ticks the night with the overworld clock and runs the test
//! command. The rules are `crate::night`'s; this file only talks to Horizon.

use crate::moon::{day_of, time_of_day};
use crate::night::{Night, Phase};
use horizon_client::mod_api::{
    Flow, Host, NativeCommand, PerformCommandEvent, RegisterCommandsEvent, Text,
};
use std::sync::atomic::{AtomicI64, Ordering};
use std::sync::{Mutex, MutexGuard};

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
}

impl Default for Shared {
    fn default() -> Self {
        Self {
            night: Mutex::new(Night::default()),
            showing: AtomicI64::new(NO_DAY),
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
