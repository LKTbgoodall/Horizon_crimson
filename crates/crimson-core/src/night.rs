//! Which nights are blood moons, and the phases of such a night.
//!
//! A blood moon night lives inside one day of the vanilla clock: omens at
//! sunset, the eclipse at moonrise, the eye at its end, the night under the
//! eye, and dawn. The server ticks a [`Night`] with the clock and hears the
//! phase changes; the client reads the same clock and animates on its own.

use crate::moon::{day_of, is_full_moon, time_of_day, DAY, TICKS_PER_SECOND};
use crate::rng::{mix, unit_of};

/// The sunset turns too red: one minute before the eclipse.
pub const OMENS_START: i64 = 11_800;
/// The eclipse begins, the moon just above the horizon.
pub const ECLIPSE_START: i64 = 13_000;
/// The eclipse lasts a minute.
pub const ECLIPSE_TICKS: i64 = 1_200;
/// The climax: darkness, then the eye opens.
pub const CLIMAX_START: i64 = ECLIPSE_START + ECLIPSE_TICKS;
/// The eye is open: the night's events may start.
pub const NIGHT_START: i64 = CLIMAX_START + 120;
/// The eye closes and the golden wave burns the crimson away.
pub const DAWN_START: i64 = 22_800;
/// Everything is back to vanilla.
pub const DAWN_END: i64 = 23_800;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Phase {
    /// No blood moon, or its day has not reached sunset yet.
    Quiet,
    Omens,
    Eclipse,
    Climax,
    Night,
    Dawn,
}

/// The phase of a blood moon day at `time_of_day` (0 to 23999).
pub fn phase_of(time_of_day: i64) -> Phase {
    match time_of_day {
        t if t < OMENS_START => Phase::Quiet,
        t if t < ECLIPSE_START => Phase::Omens,
        t if t < CLIMAX_START => Phase::Eclipse,
        t if t < NIGHT_START => Phase::Climax,
        t if t < DAWN_START => Phase::Night,
        t if t < DAWN_END => Phase::Dawn,
        _ => Phase::Quiet,
    }
}

/// Seconds since the eclipse began, on a blood moon day: negative during the
/// omens. `partial` is the fraction of a tick past `day_time` (0 to 1).
pub fn eclipse_seconds(day_time: i64, partial: f32) -> f32 {
    ((time_of_day(day_time) - ECLIPSE_START) as f32 + partial) / TICKS_PER_SECOND as f32
}

/// How present the blood moon is at `time_of_day`, 0 to 1: it fades in with
/// the omens and out through dawn.
pub fn presence(time_of_day: i64) -> f32 {
    let t = time_of_day as f32;
    if !(OMENS_START..DAWN_END).contains(&time_of_day) {
        0.0
    } else if time_of_day < ECLIPSE_START {
        (t - OMENS_START as f32) / (ECLIPSE_START - OMENS_START) as f32
    } else if time_of_day < DAWN_START {
        1.0
    } else {
        1.0 - (t - DAWN_START as f32) / (DAWN_END - DAWN_START) as f32
    }
}

/// What decides a blood moon.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Rules {
    /// The chance that a full moon night is a blood moon, 0 to 1.
    pub odds: f32,
    /// Mixed into the roll, so two worlds get different nights.
    pub salt: u64,
}

impl Default for Rules {
    fn default() -> Self {
        Self { odds: 0.5, salt: 0 }
    }
}

/// Whether the night of `day` rolls a blood moon: full moons only, and the
/// same answer every time it is asked.
pub fn rolls_blood_moon(day: i64, rules: Rules) -> bool {
    is_full_moon(day) && unit_of(mix(rules.salt ^ mix(day as u64))) < rules.odds
}

/// A phase change the server hears.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Change {
    pub day: i64,
    pub from: Phase,
    pub to: Phase,
}

/// The server's view of the blood moon.
#[derive(Clone, Debug)]
pub struct Night {
    rules: Rules,
    /// A day made a blood moon by the test command.
    forced: Option<i64>,
    /// A day whose blood moon is called off.
    cancelled: Option<i64>,
    last: (i64, Phase),
}

impl Default for Night {
    fn default() -> Self {
        Self::new(Rules::default())
    }
}

impl Night {
    pub fn new(rules: Rules) -> Self {
        Self {
            rules,
            forced: None,
            cancelled: None,
            last: (i64::MIN, Phase::Quiet),
        }
    }

    /// Whether the night of `day` is a blood moon.
    pub fn is_blood_day(&self, day: i64) -> bool {
        self.cancelled != Some(day)
            && (self.forced == Some(day) || rolls_blood_moon(day, self.rules))
    }

    /// The phase at `day_time`.
    pub fn phase_at(&self, day_time: i64) -> Phase {
        if self.is_blood_day(day_of(day_time)) {
            phase_of(time_of_day(day_time))
        } else {
            Phase::Quiet
        }
    }

    /// The test command: makes the day of `day_time` a blood moon and gives
    /// the clock time to jump to, a few seconds before its omens.
    pub fn force(&mut self, day_time: i64) -> i64 {
        let day = day_of(day_time);
        self.forced = Some(day);
        self.cancelled = None;
        day * DAY + OMENS_START - 100
    }

    /// Calls off the blood moon of the day of `day_time`, forced or rolled.
    pub fn cancel(&mut self, day_time: i64) {
        let day = day_of(day_time);
        if self.forced == Some(day) {
            self.forced = None;
        }
        self.cancelled = Some(day);
    }

    /// The server's tick: the change of phase since the last one, if any.
    /// A clock that jumps (`/time set`, sleeping) gives one change, straight
    /// to the phase it lands in.
    pub fn tick(&mut self, day_time: i64) -> Option<Change> {
        let day = day_of(day_time);
        let to = self.phase_at(day_time);
        let (last_day, from) = self.last;
        self.last = (day, to);
        let from = if last_day == day { from } else { Phase::Quiet };
        (from != to).then_some(Change { day, from, to })
    }

    /// The day whose blood moon shows at `day_time`: None when quiet.
    pub fn showing(&self, day_time: i64) -> Option<i64> {
        (self.phase_at(day_time) != Phase::Quiet).then(|| day_of(day_time))
    }
}
