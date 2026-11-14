//! What the blood moon sounds like, as cues: the client asks once a tick
//! which ones start now and plays them. The heartbeat follows the rise's own
//! beat, so sound and picture pulse together.

use crate::moon::TICKS_PER_SECOND;
use crate::night::{DAWN_START, ECLIPSE_START, NIGHT_START, OMENS_START};
use crate::rise::{frame, heartbeat, BLACKOUT_START, EYE_OPENS};

/// A sound that starts on this tick. Volumes are 0 to 1.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Cue {
    /// A low sound far away: something is coming.
    Omen,
    /// One swell of the rumbling drone.
    Drone { volume: f32 },
    /// One heartbeat; `pitch` rises a little as it races (1 is normal).
    Heartbeat { volume: f32, pitch: f32 },
    /// The world goes quiet for `ticks`, just before the eye.
    Silence { ticks: u32 },
    /// The huge crack of the climax, with its echoes, as the eye opens.
    Crack,
}

/// The drone swells this often, in ticks: its sound lasts eight seconds, so swells overlap.
const DRONE_EVERY: i64 = 100;

/// The cues that start between the ticks `last` (excluded) and `now`
/// (included), both hours of a blood moon day. A clock that jumped (more
/// than two seconds, or backwards) starts nothing: no pile of late sounds.
pub fn cues(last: i64, now: i64) -> Vec<Cue> {
    let mut out = Vec::new();
    if now <= last || now.saturating_sub(last) > 2 * TICKS_PER_SECOND {
        return out;
    }
    let crossed = |tick: i64| last < tick && tick <= now;
    let seconds = |tick: i64| (tick - ECLIPSE_START) as f32 / TICKS_PER_SECOND as f32;
    let tick_of = |seconds: f32| ECLIPSE_START + (seconds * TICKS_PER_SECOND as f32).round() as i64;

    if crossed(OMENS_START + 40) || crossed(OMENS_START + 640) {
        out.push(Cue::Omen);
    }
    for tick in last + 1..=now {
        if !(OMENS_START..DAWN_START).contains(&tick) || (tick - OMENS_START) % DRONE_EVERY != 0 {
            continue;
        }
        let f = frame(seconds(tick));
        // Quiet through the omens, building through the eclipse, cut by the
        // blackout, then a steady low bed for the night.
        let volume = if tick >= NIGHT_START {
            0.3
        } else if seconds(tick) >= BLACKOUT_START {
            0.0
        } else {
            0.12 * f.omens + 0.88 * f.progress * f.progress
        };
        if volume > 0.0 {
            out.push(Cue::Drone { volume });
        }
    }
    let (before, after) = (heartbeat(seconds(last)), heartbeat(seconds(now)));
    let in_night = seconds(now) > EYE_OPENS;
    // The heart is not heard in the blackout, nor once dawn has come.
    let silent = (BLACKOUT_START..EYE_OPENS).contains(&seconds(now)) || now >= DAWN_START;
    if !silent && (after.1 != before.1 || (before.0 == 0.0 && after.0 > 0.0)) {
        let p = frame(seconds(now)).progress;
        out.push(if in_night {
            Cue::Heartbeat {
                volume: 0.45,
                pitch: 0.85,
            }
        } else {
            Cue::Heartbeat {
                volume: 0.4 + 0.6 * p,
                pitch: 0.9 + 0.3 * p,
            }
        });
    }
    if crossed(tick_of(BLACKOUT_START)) {
        let ticks = ((EYE_OPENS - BLACKOUT_START) * TICKS_PER_SECOND as f32) as u32;
        out.push(Cue::Silence { ticks });
    }
    if crossed(tick_of(EYE_OPENS)) {
        out.push(Cue::Crack);
    }
    out
}
