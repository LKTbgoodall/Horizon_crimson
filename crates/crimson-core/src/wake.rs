//! The structures that wake under the blood moon: which of their blocks light,
//! when, and where those blocks are once the world has turned the structure.
//!
//! A structure carries an anchor block (facing south as built); its table
//! lists each block to light by its offset from the anchor and how many ticks
//! after the eclipse begins it lights. The world turns a template by quarter
//! turns, and the anchor's facing turns with it, so the facing found in the
//! world tells how to turn the offsets.

use crate::moon::time_of_day;
use crate::night::{Phase, ECLIPSE_START};

/// Quarter turns clockwise (seen from above) the world gave a structure whose
/// anchor now faces `facing`; the anchor faced south as built.
pub fn turns(facing: &str) -> Option<u8> {
    match facing {
        "south" => Some(0),
        "west" => Some(1),
        "north" => Some(2),
        "east" => Some(3),
        _ => None,
    }
}

/// Where the block `offset` from the anchor (as built) is, once the structure
/// is turned `turns` quarter turns clockwise, as the game turns a template:
/// each quarter turn takes (x, z) to (-z, x).
pub fn place(anchor: [i32; 3], offset: [i16; 3], turns: u8) -> [i32; 3] {
    let (mut x, y, mut z) = (
        i32::from(offset[0]),
        i32::from(offset[1]),
        i32::from(offset[2]),
    );
    for _ in 0..turns % 4 {
        (x, z) = (-z, x);
    }
    [anchor[0] + x, anchor[1] + y, anchor[2] + z]
}

/// Ticks since the structures woke, while the blood moon holds them awake (the
/// eclipse, the climax and the night under the eye); None otherwise: by day,
/// in the omens and from dawn on, everything is out.
pub fn awake_ticks(phase: Phase, day_time: i64) -> Option<i64> {
    match phase {
        Phase::Eclipse | Phase::Climax | Phase::Night => {
            Some(time_of_day(day_time) - ECLIPSE_START)
        }
        Phase::Quiet | Phase::Omens | Phase::Dawn => None,
    }
}

/// Whether a block that lights `delay` ticks after the waking is lit now.
pub fn lit(awake: Option<i64>, delay: u16) -> bool {
    awake.is_some_and(|ticks| ticks >= i64::from(delay))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kneeling_colossus_wake::KNEELING_COLOSSUS;
    use crate::night::{CLIMAX_START, DAWN_START, NIGHT_START, OMENS_START};

    #[test]
    fn the_facing_tells_the_turn() {
        assert_eq!(turns("south"), Some(0));
        assert_eq!(turns("west"), Some(1));
        assert_eq!(turns("north"), Some(2));
        assert_eq!(turns("east"), Some(3));
        assert_eq!(turns("up"), None);
    }

    #[test]
    fn a_quarter_turn_takes_north_to_east() {
        let anchor = [100, 64, -20];
        assert_eq!(place(anchor, [0, 3, -5], 0), [100, 67, -25]);
        assert_eq!(place(anchor, [0, 3, -5], 1), [105, 67, -20]);
        assert_eq!(place(anchor, [0, 3, -5], 2), [100, 67, -15]);
        assert_eq!(place(anchor, [0, 3, -5], 3), [95, 67, -20]);
        assert_eq!(place(anchor, [2, 0, 7], 4), place(anchor, [2, 0, 7], 0));
    }

    #[test]
    fn awake_from_the_eclipse_to_dawn() {
        assert_eq!(awake_ticks(Phase::Omens, OMENS_START + 10), None);
        assert_eq!(awake_ticks(Phase::Eclipse, ECLIPSE_START), Some(0));
        assert_eq!(
            awake_ticks(Phase::Climax, CLIMAX_START),
            Some(CLIMAX_START - ECLIPSE_START)
        );
        assert_eq!(
            awake_ticks(Phase::Night, NIGHT_START + 24_000),
            Some(NIGHT_START - ECLIPSE_START)
        );
        assert_eq!(awake_ticks(Phase::Dawn, DAWN_START), None);
        assert_eq!(awake_ticks(Phase::Quiet, 1_000), None);
    }

    #[test]
    fn blocks_light_one_after_the_other() {
        assert!(!lit(None, 0));
        assert!(!lit(Some(99), 100));
        assert!(lit(Some(100), 100));
    }

    #[test]
    fn the_colossus_lights_during_the_eclipse_and_stays_near_its_anchor() {
        assert!(KNEELING_COLOSSUS.len() > 50);
        for &(offset, delay) in KNEELING_COLOSSUS {
            assert!(
                i64::from(delay) < CLIMAX_START - ECLIPSE_START,
                "{offset:?} lights after the eclipse"
            );
            assert!(
                offset.iter().all(|v| v.abs() <= 64),
                "{offset:?} is far from the anchor"
            );
        }
    }
}
