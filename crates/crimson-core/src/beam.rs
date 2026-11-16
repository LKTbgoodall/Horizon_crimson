//! The moon's beam onto a waking structure's crown (staging D, "The Moon's
//! Gift", ADR-023): when it reaches down, how wide it is, where it lands.
//!
//! The preview (`preview/colossus-awakening.html`, D) reaches down from 3 s to
//! 5 s, and thins from 10 s to 14 s; the game runs the preview's seconds at
//! 60 ticks each, counted from the eclipse's start (as the wake table).

use crate::wake::place;

/// Ticks after the eclipse begins when the beam starts down from the moon.
pub const BEAM_START: f32 = 180.0;
/// Ticks it takes to reach the crown.
pub const BEAM_REACH: f32 = 120.0;
/// When it starts to thin, and how long it takes.
pub const BEAM_THIN_START: f32 = 600.0;
pub const BEAM_THIN: f32 = 240.0;
/// Its width in blocks, as it lands and once thinned.
pub const BEAM_WIDE: f32 = 2.2;
pub const BEAM_NARROW: f32 = 1.1;
/// How far up the beam's lower end starts, in blocks along the moon's direction.
pub const BEAM_DROP: f32 = 400.0;

/// The beam at one instant.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Beam {
    /// How far above the crown its lower end is, along the moon's direction (0 once it has landed).
    pub lower: f32,
    /// Its width in blocks.
    pub width: f32,
    /// Its brightness, 0 to 1.
    pub strength: f32,
}

fn smooth(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// The beam `awake` ticks after the eclipse began (None: the structure
/// sleeps, so no beam).
pub fn beam(awake: Option<f32>) -> Option<Beam> {
    let t = awake?;
    if t < BEAM_START {
        return None;
    }
    let reach = smooth(BEAM_START, BEAM_START + BEAM_REACH, t);
    let thin = smooth(BEAM_THIN_START, BEAM_THIN_START + BEAM_THIN, t);
    Some(Beam {
        lower: (1.0 - reach) * BEAM_DROP,
        width: BEAM_WIDE + (BEAM_NARROW - BEAM_WIDE) * thin,
        strength: smooth(BEAM_START, BEAM_START + 24.0, t),
    })
}

/// Where the beam lands in the world: the middle of the bottom of the cell
/// `crown` (from the anchor, as built) once the structure is turned `turns`
/// quarter turns.
pub fn landing(anchor: [i32; 3], crown: [i16; 3], turns: u8) -> [f64; 3] {
    let [x, y, z] = place(anchor, crown, turns);
    [f64::from(x) + 0.5, f64::from(y), f64::from(z) + 0.5]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kneeling_colossus_wake::{KNEELING_COLOSSUS, KNEELING_COLOSSUS_CROWN};

    #[test]
    fn no_beam_before_it_starts() {
        assert_eq!(beam(None), None);
        assert_eq!(beam(Some(BEAM_START - 1.0)), None);
    }

    #[test]
    fn it_reaches_down_then_thins() {
        let first = beam(Some(BEAM_START)).unwrap();
        assert_eq!(first.lower, BEAM_DROP);
        assert_eq!(first.strength, 0.0);
        let landed = beam(Some(BEAM_START + BEAM_REACH)).unwrap();
        assert_eq!(landed.lower, 0.0);
        assert_eq!(landed.width, BEAM_WIDE);
        assert_eq!(landed.strength, 1.0);
        let late = beam(Some(BEAM_THIN_START + BEAM_THIN + 1000.0)).unwrap();
        assert_eq!(late.width, BEAM_NARROW);
        assert_eq!(late.lower, 0.0);
    }

    #[test]
    fn it_lands_as_the_crown_lights() {
        // the light it brings runs down him: the crown is the first block to light
        let first_lit = KNEELING_COLOSSUS
            .iter()
            .map(|&(_, d)| f32::from(d))
            .fold(f32::MAX, f32::min);
        assert!(BEAM_START + BEAM_REACH <= first_lit + 1.0);
    }

    #[test]
    fn it_lands_on_the_crown_however_the_colossus_is_turned() {
        let anchor = [100, 70, -40];
        assert_eq!(
            landing(anchor, KNEELING_COLOSSUS_CROWN, 0),
            [100.5, 90.0, -36.5]
        );
        assert_eq!(
            landing(anchor, KNEELING_COLOSSUS_CROWN, 1),
            [97.5, 90.0, -39.5]
        );
        assert_eq!(
            landing(anchor, KNEELING_COLOSSUS_CROWN, 2),
            [100.5, 90.0, -42.5]
        );
    }
}
