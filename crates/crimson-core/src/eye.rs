//! The eye in the moon: where it looks, how wide its pupil is, when it blinks.
//!
//! It looks around when it opens, then follows where the player looks; the
//! pupil narrows to a slit when the player stares at it.

use crate::rng::{mix, unit_of};

/// The pupil's width, as a share of the iris: wide open, at rest, stared at.
pub const PUPIL_WIDE: f32 = 0.34;
pub const PUPIL_REST: f32 = 0.2;
pub const PUPIL_SLIT: f32 = 0.06;
/// The player stares when their look is this close to the moon's centre
/// (the length of [`Look::offset`]).
pub const STARE: f32 = 0.09;
/// Seconds the eye spends looking around before it finds the player.
pub const SEARCH_SECONDS: f32 = 1.5;

/// Where the player looks, seen from the moon.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Look {
    /// The player's look direction along the moon's right and up (parts of a
    /// unit vector): `[0, 0]` is straight at the moon, or straight away from it.
    pub offset: [f32; 2],
    /// Whether the player faces the moon's half of the sky.
    pub facing: bool,
}

/// The eye's moving parts.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Eye {
    /// Where the iris sits in the eye, each part -1 to 1.
    pub gaze: [f32; 2],
    /// The pupil's width, as a share of the iris.
    pub pupil: f32,
}

impl Default for Eye {
    fn default() -> Self {
        Self {
            gaze: [0.0, 0.0],
            pupil: PUPIL_WIDE,
        }
    }
}

impl Eye {
    /// Moves the eye by `dt` seconds. `since_open` is the time since the lid
    /// began to open, `beat` the heartbeat's pulse (0 to 1).
    pub fn update(&mut self, dt: f32, since_open: f32, look: Look, beat: f32) {
        let dt = if dt.is_finite() {
            dt.clamp(0.0, 1.0)
        } else {
            0.0
        };
        let target = target_gaze(since_open, look);
        // It darts while it searches, then follows more calmly.
        let speed = if since_open < SEARCH_SECONDS {
            14.0
        } else {
            8.0
        };
        let k = 1.0 - (-dt * speed).exp();
        self.gaze[0] += (target[0] - self.gaze[0]) * k;
        self.gaze[1] += (target[1] - self.gaze[1]) * k;
        let pupil = if since_open < 0.4 {
            PUPIL_WIDE
        } else if since_open >= SEARCH_SECONDS && is_stared_at(look) {
            PUPIL_SLIT
        } else {
            PUPIL_REST + 0.03 * beat.clamp(0.0, 1.0)
        };
        self.pupil += (pupil - self.pupil) * (1.0 - (-dt * 5.0).exp());
    }
}

/// Where the eye wants to look: left then right while it searches, then
/// toward where the player looks, never outside the eye.
pub fn target_gaze(since_open: f32, look: Look) -> [f32; 2] {
    if since_open < 0.7 {
        return [-0.85, 0.2];
    }
    if since_open < SEARCH_SECONDS {
        return [0.8, -0.25];
    }
    let [x, y] = [look.offset[0] * 2.5, look.offset[1] * 2.5];
    let len = (x * x + y * y).sqrt();
    if !len.is_finite() {
        [0.0, 0.0]
    } else if len > 1.0 {
        [x / len, y / len]
    } else {
        [x, y]
    }
}

/// Whether the player stares at the eye.
pub fn is_stared_at(look: Look) -> bool {
    look.facing
        && (look.offset[0] * look.offset[0] + look.offset[1] * look.offset[1]).sqrt() < STARE
}

/// How open the lid is kept by blinking, `seconds` after the eye opened:
/// 1 most of the time, dipping to 0 for a quick blink once in every 9 seconds.
pub fn blink(seconds: f32) -> f32 {
    const WINDOW: f32 = 9.0;
    const HALF: f32 = 0.22;
    if !seconds.is_finite() || seconds < 0.0 {
        return 1.0;
    }
    let window = (seconds / WINDOW).floor();
    // The blink falls between 3 and 7 seconds into its window, never on an edge.
    let centre = window * WINDOW + 3.0 + 4.0 * unit_of(mix(window as u64 + 1));
    let d = ((seconds - centre).abs() / HALF).min(1.0);
    d * d
}
