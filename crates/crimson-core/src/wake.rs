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

/// How far under a column's surface (the world-surface height, one above its
/// top block) the search for anchors looks. The colossus' anchor is 19 under
/// its column's surface (the helm and the crown above it); the rest is room
/// for what grows or is built on top.
pub const ANCHOR_SEARCH_DEPTH: u32 = 32;

/// The 256 columns of chunk `chunk` (`[x, z]` in chunks), as block `(x, z)`.
pub fn chunk_columns(chunk: [i32; 2]) -> Vec<(i32, i32)> {
    let (bx, bz) = (chunk[0] * 16, chunk[1] * 16);
    (0..16)
        .flat_map(|z| (0..16).map(move |x| (bx + x, bz + z)))
        .collect()
}

/// Where block `name` is in a read of `columns`: for each column, its surface
/// height in `bases` (None where not loaded) and `depth` block indexes into
/// `palette`, bottom first, starting `depth` under the surface.
pub fn find_in_columns(
    name: &str,
    palette: &[String],
    blocks: &[u16],
    columns: &[(i32, i32)],
    bases: &[Option<i32>],
    depth: u32,
) -> Vec<[i32; 3]> {
    let Some(wanted) = palette.iter().position(|n| n == name) else {
        return Vec::new();
    };
    let per = depth as usize;
    let mut found = Vec::new();
    for (i, (&(x, z), base)) in columns.iter().zip(bases).enumerate() {
        let (Some(base), Some(cells)) = (base, blocks.get(i * per..(i + 1) * per)) else {
            continue;
        };
        let bottom = base - depth as i32;
        for (k, &b) in cells.iter().enumerate() {
            if usize::from(b) == wanted {
                found.push([x, bottom + k as i32, z]);
            }
        }
    }
    found
}

/// The console commands that set an anchor again where it stands (air, then
/// the anchor facing as it did): a block placed by a command gets its block
/// entity, which a structure generated in the world does not give it.
pub fn reseat_commands(name: &str, pos: [i32; 3], facing: &str) -> [String; 2] {
    let [x, y, z] = pos;
    [
        format!("setblock {x} {y} {z} minecraft:air"),
        format!("setblock {x} {y} {z} {name}[facing={facing}]"),
    ]
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
    fn a_chunk_has_its_256_columns() {
        let columns = chunk_columns([-2, 3]);
        assert_eq!(columns.len(), 256);
        assert_eq!(columns[0], (-32, 48));
        assert_eq!(columns[255], (-17, 63));
    }

    #[test]
    fn an_anchor_is_found_where_it_stands_in_the_read() {
        let palette = ["minecraft:air", "crimson_eclipse:colossus_anchor"].map(String::from);
        let columns = [(5, 7), (6, 7), (7, 7)];
        let bases = [Some(100), None, Some(90)];
        // depth 3: the first column reads y 97..100, the last 87..90
        let blocks = [0, 1, 0, 0, 0, 0, 0, 0, 1];
        let found = find_in_columns(palette[1].as_str(), &palette, &blocks, &columns, &bases, 3);
        assert_eq!(found, vec![[5, 98, 7], [7, 89, 7]]);
        assert!(find_in_columns(
            "crimson_eclipse:other",
            &palette,
            &blocks,
            &columns,
            &bases,
            3
        )
        .is_empty());
    }

    #[test]
    fn the_anchor_is_set_again_facing_as_it_did() {
        let [clear, set] =
            reseat_commands("crimson_eclipse:colossus_anchor", [-1180, 112, 95], "east");
        assert_eq!(clear, "setblock -1180 112 95 minecraft:air");
        assert_eq!(
            set,
            "setblock -1180 112 95 crimson_eclipse:colossus_anchor[facing=east]"
        );
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
