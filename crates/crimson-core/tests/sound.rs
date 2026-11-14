use crimson_core::night::{CLIMAX_START, DAWN_START, ECLIPSE_START, NIGHT_START, OMENS_START};
use crimson_core::sound::{cues, Cue};

/// Every cue of a blood moon evening, tick by tick, with the tick it starts on.
fn evening(from: i64, to: i64) -> Vec<(i64, Cue)> {
    let mut out = Vec::new();
    for tick in from..to {
        for cue in cues(tick - 1, tick) {
            out.push((tick, cue));
        }
    }
    out
}

fn beats(all: &[(i64, Cue)]) -> Vec<(i64, f32, f32)> {
    all.iter()
        .filter_map(|(t, c)| match c {
            Cue::Heartbeat { volume, pitch } => Some((*t, *volume, *pitch)),
            _ => None,
        })
        .collect()
}

#[test]
fn nothing_sounds_before_the_omens_or_after_dawn() {
    assert!(evening(0, OMENS_START).is_empty());
    assert!(evening(DAWN_START + 1, 24_000).is_empty());
}

#[test]
fn the_omens_are_two_distant_sounds_and_a_faint_drone() {
    let all = evening(OMENS_START, ECLIPSE_START);
    let omens: Vec<i64> = all
        .iter()
        .filter(|(_, c)| *c == Cue::Omen)
        .map(|(t, _)| *t)
        .collect();
    assert_eq!(omens, [OMENS_START + 40, OMENS_START + 640]);
    assert!(beats(&all).is_empty(), "no heartbeat yet");
    for (_, cue) in &all {
        if let Cue::Drone { volume } = cue {
            assert!(
                *volume > 0.0 && *volume <= 0.12,
                "a faint drone, not {volume}"
            );
        }
    }
    assert!(all.iter().any(|(_, c)| matches!(c, Cue::Drone { .. })));
}

#[test]
fn the_heart_beats_faster_and_louder_through_the_eclipse_until_the_blackout() {
    let all = evening(ECLIPSE_START, CLIMAX_START);
    let b = beats(&all);
    assert!((86..=89).contains(&b.len()), "{} beats", b.len());
    assert!(
        b[b.len() - 1].0 < ECLIPSE_START + 1166,
        "none in the blackout"
    );
    let first_gap = b[2].0 - b[1].0;
    let last_gap = b[b.len() - 1].0 - b[b.len() - 2].0;
    assert!(
        first_gap >= 24 && last_gap <= 10,
        "from {first_gap} to {last_gap} ticks between beats"
    );
    assert!(b[1].1 < 0.45 && b[b.len() - 1].1 > 0.9, "louder");
    assert!(b[1].2 < b[b.len() - 1].2, "and a little higher");
    for (_, volume, pitch) in &b {
        assert!((0.0..=1.0).contains(volume) && (0.5..=2.0).contains(pitch));
    }
}

#[test]
fn the_drone_builds_then_the_world_goes_quiet_then_the_crack() {
    let all = evening(ECLIPSE_START, NIGHT_START + 1);
    let drone: Vec<(i64, f32)> = all
        .iter()
        .filter_map(|(t, c)| match c {
            Cue::Drone { volume } => Some((*t, *volume)),
            _ => None,
        })
        .collect();
    let rising: Vec<f32> = drone
        .iter()
        .filter(|(t, _)| *t < CLIMAX_START - 40)
        .map(|(_, v)| *v)
        .collect();
    assert!(
        rising.windows(2).all(|w| w[1] >= w[0]),
        "the drone only builds: {rising:?}"
    );
    assert!(rising[rising.len() - 1] > 0.8);

    let silence: Vec<(i64, Cue)> = all
        .iter()
        .filter(|(_, c)| matches!(c, Cue::Silence { .. }))
        .copied()
        .collect();
    assert_eq!(
        silence,
        [(ECLIPSE_START + 1166, Cue::Silence { ticks: 44 })]
    );
    let crack: Vec<i64> = all
        .iter()
        .filter(|(_, c)| *c == Cue::Crack)
        .map(|(t, _)| *t)
        .collect();
    assert_eq!(crack, [ECLIPSE_START + 1210], "once, as the eye opens");
    // Nothing but the silence between the blackout and the crack.
    for (tick, cue) in &all {
        if (ECLIPSE_START + 1167..ECLIPSE_START + 1210).contains(tick) {
            panic!("{cue:?} at {tick} breaks the silence");
        }
    }
}

#[test]
fn the_night_keeps_a_slow_heart_and_a_low_drone() {
    let all = evening(NIGHT_START + 100, NIGHT_START + 1_300);
    let b = beats(&all);
    assert!(
        (34..=38).contains(&b.len()),
        "about 36 beats a minute, not {}",
        b.len()
    );
    assert!(b
        .iter()
        .all(|(_, volume, pitch)| *volume == 0.45 && *pitch == 0.85));
    let drones = all
        .iter()
        .filter(|(_, c)| *c == Cue::Drone { volume: 0.3 })
        .count();
    assert_eq!(drones, 24, "one swell every 50 ticks");
}

#[test]
fn a_clock_jump_or_a_pause_starts_nothing() {
    assert!(cues(OMENS_START, CLIMAX_START).is_empty(), "/time set");
    assert!(
        cues(ECLIPSE_START + 500, ECLIPSE_START + 500).is_empty(),
        "paused"
    );
    assert!(
        cues(ECLIPSE_START + 500, ECLIPSE_START + 400).is_empty(),
        "backwards"
    );
    // Two ticks at once (a slow frame) still plays what fell in between.
    let slow = cues(ECLIPSE_START + 1209, ECLIPSE_START + 1211);
    assert!(slow.contains(&Cue::Crack));
}
