//! The rise of the blood moon, staging C "The Abyss" (the one Bastien chose):
//! what the sky and the world look like at each instant, as plain numbers.
//!
//! Time is in seconds since the eclipse began: negative during the omens
//! (one minute), 0 to 60 for the eclipse, then the climax and the night.
//! The numbers are those of `preview/blood-moon-rise.html`, version C.

/// The eclipse lasts a minute.
pub const ECLIPSE_SECONDS: f32 = 60.0;
/// The omens last a minute before it.
pub const OMENS_SECONDS: f32 = 60.0;
/// The hush before the eye starts here: the corona falls back, the light dips, the sound stops.
pub const BLACKOUT_START: f32 = 58.3;
/// The flash: the darkness lifts and the eye starts to open.
pub const EYE_OPENS: f32 = 60.5;
/// The eye takes this long to open.
pub const EYE_OPENING_SECONDS: f32 = 2.5;
/// The slow heartbeat of the night starts here.
pub const NIGHT_BEAT_START: f32 = 65.0;

/// Heartbeats per second when the eclipse starts, when it ends, and through the night.
const BEAT_START_HZ: f32 = 0.75;
const BEAT_END_HZ: f32 = 2.3;
const BEAT_NIGHT_HZ: f32 = 0.6;

/// The picture at one instant. Every value is finite; unless said otherwise it is 0 to 1.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Frame {
    /// How far the eclipse is.
    pub progress: f32,
    /// How far the omens are (1 from the eclipse on).
    pub omens: f32,
    /// The heartbeat's pulse: 1 on a beat, falling to 0 before the next.
    pub beat: f32,
    /// Heartbeats since the eclipse began (the night's own count starts again at 0).
    pub beat_count: u32,
    /// The moon's size, in vanilla moon sizes: 1 to about 2.4.
    pub moon_scale: f32,
    /// The spiral void eating the moon from its centre, in moon radii: 0 to 1.35.
    pub void_radius: f32,
    /// How far from the moon the sky cracks reach, in radians: 0 to 1.6.
    pub crack_reach: f32,
    /// The share of the crack web's cells torn open on space: 0 to 0.26.
    pub torn: f32,
    /// The flame corona's strength: 0 to about 1.4.
    pub corona: f32,
    /// How red the eclipsed moon glows.
    pub blood: f32,
    /// How far the stars are dragged toward the moon and put out.
    pub stars_pull: f32,
    /// The red grade over the world.
    pub grade: f32,
    /// Grass and leaves turning burgundy.
    pub foliage: f32,
    /// The fog's colour to move toward, and how far to move.
    pub fog_rgb: [f32; 3],
    pub fog_weight: f32,
    /// The whole picture's brightness: 1, dipping to 0.7 in the hush before the eye.
    pub dark: f32,
    /// The flash when the eye opens: 0 to 1.1.
    pub flash: f32,
    /// The shock wave across the sky: its radius in radians and its strength.
    pub shock_radius: f32,
    pub shock_strength: f32,
    /// The lid's seam across the moon, then how open the lid is.
    pub seam: f32,
    pub open: f32,
    /// The camera shake's size, in degrees: 0 to about 1.7.
    pub shake_degrees: f32,
}

/// The picture `seconds` after the eclipse began.
pub fn frame(seconds: f32) -> Frame {
    let s = if seconds.is_finite() { seconds } else { 0.0 };
    let p = clamp01(s / ECLIPSE_SECONDS);
    let omens = clamp01(1.0 + s / OMENS_SECONDS);
    let (beat, beat_count) = heartbeat(s);

    let open = smoothstep(EYE_OPENS, EYE_OPENS + EYE_OPENING_SECONDS, s);
    let after = s - EYE_OPENS;
    // The hush before the eye: the corona falls back into the moon and the
    // light dips, but nothing goes black (Bastien: the blackout felt wrong).
    let hush = if s < BLACKOUT_START {
        0.0
    } else if after < 0.0 {
        smoothstep(BLACKOUT_START, 59.5, s)
    } else {
        1.0 - clamp01(after / 0.35)
    };
    let dark = 1.0 - 0.3 * hush;
    let flash = if after >= 0.0 {
        1.1 * (-after * 1.6).exp()
    } else {
        0.0
    };
    let (shock_radius, shock_strength) = if (0.0..4.0).contains(&after) {
        (after * 0.5, 1.0 - after / 4.0)
    } else {
        (0.0, 0.0)
    };
    let mut shake_degrees = if (0.0..ECLIPSE_SECONDS).contains(&s) {
        0.04 + 0.2 * p * p
    } else {
        0.0
    };
    if after >= 0.0 {
        shake_degrees += 1.5 * (-after * 1.4).exp();
    }

    let reddening = smoothstep(0.0, 0.7, p);
    Frame {
        progress: p,
        omens,
        beat,
        beat_count,
        moon_scale: mix(1.0, 0.29 / 0.12, smoothstep(0.0, 1.0, p)),
        void_radius: p * 1.35,
        crack_reach: 1.6 * p.powf(1.3),
        torn: (p * 0.3 - 0.04).max(0.0),
        corona: smoothstep(0.03, 0.6, p)
            * (0.45 + 0.55 * p)
            * (1.0 + 0.09 * beat)
            * (1.0 - 0.85 * hush)
            + 0.25 * open,
        blood: smoothstep(0.8, 1.0, p),
        stars_pull: p,
        grade: 0.7 * smoothstep(0.1, 0.9, p),
        foliage: smoothstep(0.15, 0.75, p),
        fog_rgb: mix3([0.85, 0.13, 0.035], [0.25, 0.018, 0.015], reddening),
        fog_weight: omens * mix(0.6, 0.9, reddening),
        dark,
        flash,
        shock_radius,
        shock_strength,
        seam: clamp01((s - 60.1) / 0.4),
        open,
        shake_degrees,
    }
}

/// The heartbeat `seconds` after the eclipse began: its pulse and the count
/// of beats. It speeds up through the eclipse, stops for the climax, and
/// comes back slow for the night.
pub fn heartbeat(seconds: f32) -> (f32, u32) {
    let phase = if (0.0..ECLIPSE_SECONDS).contains(&seconds) {
        beats_at(seconds / ECLIPSE_SECONDS)
    } else if seconds >= NIGHT_BEAT_START {
        (seconds - NIGHT_BEAT_START) * BEAT_NIGHT_HZ
    } else {
        return (0.0, 0);
    };
    let x = phase.fract();
    // Two thumps: the second, softer, a third of a beat later.
    let second = if x > 0.3 {
        0.7 * (-(x - 0.3) * 8.0).exp()
    } else {
        0.0
    };
    ((-x * 8.0).exp().max(second), phase as u32)
}

/// Beats since the eclipse began, at `progress` (0 to 1) of it.
pub fn beats_at(progress: f32) -> f32 {
    let p = clamp01(progress);
    ECLIPSE_SECONDS * (BEAT_START_HZ * p + (BEAT_END_HZ - BEAT_START_HZ) * p * p / 2.0)
}

/// The camera shake at `seconds`, as pitch and yaw in degrees, for a shake of
/// `degrees`: a quick wobble that never exceeds that size.
pub fn shake_angles(seconds: f32, degrees: f32) -> [f32; 2] {
    [
        degrees * ((seconds * 31.3).sin() + (seconds * 19.1).cos()) * 0.5,
        degrees * ((seconds * 37.0).sin() + (seconds * 23.7).sin()) * 0.5,
    ]
}

fn clamp01(x: f32) -> f32 {
    x.clamp(0.0, 1.0)
}

fn mix(a: f32, b: f32, k: f32) -> f32 {
    a + (b - a) * k
}

fn mix3(a: [f32; 3], b: [f32; 3], k: f32) -> [f32; 3] {
    [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)]
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = clamp01((x - a) / (b - a));
    t * t * (3.0 - 2.0 * t)
}
