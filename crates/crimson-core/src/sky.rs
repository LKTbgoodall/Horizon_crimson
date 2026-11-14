//! What the sky pass needs beyond the rise's numbers: where the moon is, the
//! sky's colours, how much of the vanilla sky is replaced, the lid of the eye
//! and how the player's look is seen from the moon.

use crate::eye::{blink, Look};
use crate::moon::DAY;
use crate::rise::{Frame, EYE_OPENING_SECONDS, EYE_OPENS};

/// The vanilla moon's disc, in radians from its centre to its edge.
pub const MOON_RADIUS: f32 = 0.12;

/// The sun's angle at `time_of_day` (ticks, 0 to 24000), in degrees: 0 at
/// noon, growing with time, as vanilla's `visual/sun_angle`.
/// Assumed linear in time; to check against the game's moon.
pub fn sun_angle_degrees(time_of_day: f32) -> f32 {
    time_of_day / DAY as f32 * 360.0 - 90.0
}

/// The direction of the moon in the world at `time_of_day`: a unit vector,
/// x east, y up. The moon is opposite the sun and both turn in the x/y plane.
pub fn moon_direction(time_of_day: f32) -> [f32; 3] {
    let a = (sun_angle_degrees(time_of_day) + 180.0).to_radians();
    [-a.sin(), a.cos(), 0.0]
}

/// The sky's own colours and how much of the vanilla sky they replace.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Colors {
    pub horizon: [f32; 3],
    pub zenith: [f32; 3],
    /// 0: the vanilla sky as it is. 1: only ours.
    pub weight: f32,
    /// How solid our own moon is drawn over the vanilla one, 0 to 1.
    pub moon: f32,
}

/// The sky's colours for `frame`, with the blood moon `presence` (0 to 1) of the hour.
pub fn colors(frame: &Frame, presence: f32) -> Colors {
    let presence = presence.clamp(0.0, 1.0);
    let dusk = frame.omens;
    let blood = smoothstep(0.0, 0.7, frame.progress);
    Colors {
        horizon: mix3(
            mix3([1.0, 0.15, 0.04], [0.30, 0.06, 0.07], dusk),
            [0.5, 0.035, 0.03],
            blood,
        ),
        zenith: mix3(
            mix3([0.20, 0.13, 0.32], [0.025, 0.02, 0.06], dusk),
            [0.055, 0.0, 0.008],
            blood,
        ),
        // A third of the sky is ours by the end of the omens (the sunset is
        // too red), all of it a quarter into the eclipse.
        weight: presence * (0.35 + 0.65 * smoothstep(0.0, 0.25, frame.progress)),
        moon: smoothstep(0.0, 0.5, presence),
    }
}

/// How open the lid is, `seconds` after the eclipse began: the rise opens it,
/// blinks close it for an instant, and dawn closes it for good.
pub fn lid(frame: &Frame, seconds: f32, presence: f32) -> f32 {
    let dawn = (presence * 4.0 - 3.0).clamp(0.0, 1.0);
    frame.open * blink(seconds - EYE_OPENS - EYE_OPENING_SECONDS) * dawn
}

/// Seconds the eye has been awake, for [`crate::eye::Eye::update`]: it starts
/// looking around a second after the lid begins to open.
pub fn since_open(seconds: f32) -> f32 {
    seconds - EYE_OPENS - 1.0
}

/// The player's look as the moon sees it, from the camera's `forward` and
/// the direction of the `moon` (unit vectors in the world).
pub fn look(forward: [f32; 3], moon: [f32; 3]) -> Look {
    let right = normalize(cross(moon, [0.0, 1.0, 0.0]));
    let up = cross(right, moon);
    Look {
        offset: [dot(forward, right), dot(forward, up)],
        facing: dot(forward, moon) > 0.0,
    }
}

fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

fn normalize(a: [f32; 3]) -> [f32; 3] {
    let len = dot(a, a).sqrt();
    if len > 1e-6 {
        [a[0] / len, a[1] / len, a[2] / len]
    } else {
        // The moon straight overhead: any horizontal direction is its right.
        [0.0, 0.0, 1.0]
    }
}

fn mix3(a: [f32; 3], b: [f32; 3], k: f32) -> [f32; 3] {
    [
        a[0] + (b[0] - a[0]) * k,
        a[1] + (b[1] - a[1]) * k,
        a[2] + (b[2] - a[2]) * k,
    ]
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}
