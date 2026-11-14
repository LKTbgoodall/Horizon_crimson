use crimson_core::moon::{day_of, is_full_moon, moon_phase, time_of_day, DAY};
use crimson_core::night::{
    eclipse_seconds, phase_of, presence, rolls_blood_moon, Change, Night, Phase, Rules,
    CLIMAX_START, DAWN_END, DAWN_START, ECLIPSE_START, NIGHT_START, OMENS_START,
};

const ALWAYS: Rules = Rules { odds: 1.0, salt: 7 };
const NEVER: Rules = Rules { odds: 0.0, salt: 7 };

#[test]
fn the_clock_splits_into_days_and_hours() {
    assert_eq!((day_of(0), time_of_day(0)), (0, 0));
    assert_eq!((day_of(23_999), time_of_day(23_999)), (0, 23_999));
    assert_eq!((day_of(24_000), time_of_day(24_000)), (1, 0));
    assert_eq!((day_of(-1), time_of_day(-1)), (-1, 23_999));
    assert_eq!(moon_phase(0), 0);
    assert_eq!(moon_phase(4), 4);
    assert_eq!(moon_phase(8), 0);
    assert!(is_full_moon(16) && !is_full_moon(17));
}

#[test]
fn phases_follow_each_other_through_the_day() {
    let expected = [
        (0, Phase::Quiet),
        (OMENS_START - 1, Phase::Quiet),
        (OMENS_START, Phase::Omens),
        (ECLIPSE_START, Phase::Eclipse),
        (CLIMAX_START - 1, Phase::Eclipse),
        (CLIMAX_START, Phase::Climax),
        (NIGHT_START, Phase::Night),
        (DAWN_START, Phase::Dawn),
        (DAWN_END, Phase::Quiet),
        (DAY - 1, Phase::Quiet),
    ];
    for (t, phase) in expected {
        assert_eq!(phase_of(t), phase, "at {t}");
    }
}

#[test]
fn the_eclipse_lasts_one_minute() {
    assert_eq!(eclipse_seconds(ECLIPSE_START, 0.0), 0.0);
    assert_eq!(eclipse_seconds(CLIMAX_START, 0.0), 60.0);
    assert_eq!(eclipse_seconds(OMENS_START, 0.0), -60.0);
    assert_eq!(eclipse_seconds(3 * DAY + ECLIPSE_START + 10, 0.5), 0.525);
}

#[test]
fn presence_fades_in_and_out_without_a_jump() {
    assert_eq!(presence(0), 0.0);
    assert_eq!(presence(OMENS_START), 0.0);
    assert_eq!(presence(ECLIPSE_START), 1.0);
    assert_eq!(presence(18_000), 1.0);
    assert_eq!(presence(DAWN_END), 0.0);
    let mut last = presence(0);
    for t in 1..DAY {
        let now = presence(t);
        assert!((0.0..=1.0).contains(&now));
        assert!((now - last).abs() < 0.002, "jump at {t}");
        last = now;
    }
}

#[test]
fn only_full_moons_roll_and_the_roll_never_changes() {
    for day in 0..400 {
        if !is_full_moon(day) {
            assert!(
                !rolls_blood_moon(day, ALWAYS),
                "day {day} is not a full moon"
            );
        } else {
            assert!(rolls_blood_moon(day, ALWAYS));
            assert!(!rolls_blood_moon(day, NEVER));
        }
        let rules = Rules {
            odds: 0.5,
            salt: 99,
        };
        assert_eq!(rolls_blood_moon(day, rules), rolls_blood_moon(day, rules));
    }
}

#[test]
fn the_odds_are_roughly_kept_and_the_salt_changes_the_nights() {
    let count = |salt| {
        (0..8_000)
            .filter(|d| rolls_blood_moon(d * 8, Rules { odds: 0.5, salt }))
            .count()
    };
    for salt in [0, 1, 12_345] {
        let n = count(salt);
        assert!((3_700..4_300).contains(&n), "salt {salt}: {n} of 8000");
    }
    let differ = (0..200).filter(|d| {
        rolls_blood_moon(d * 8, Rules { odds: 0.5, salt: 1 })
            != rolls_blood_moon(d * 8, Rules { odds: 0.5, salt: 2 })
    });
    assert!(differ.count() > 50);
}

#[test]
fn a_night_ticks_through_every_phase_once() {
    let mut night = Night::new(ALWAYS);
    let day = 8;
    let mut changes = Vec::new();
    for t in 0..DAY {
        if let Some(change) = night.tick(day * DAY + t) {
            changes.push((t, change.from, change.to));
        }
    }
    assert_eq!(
        changes,
        [
            (OMENS_START, Phase::Quiet, Phase::Omens),
            (ECLIPSE_START, Phase::Omens, Phase::Eclipse),
            (CLIMAX_START, Phase::Eclipse, Phase::Climax),
            (NIGHT_START, Phase::Climax, Phase::Night),
            (DAWN_START, Phase::Night, Phase::Dawn),
            (DAWN_END, Phase::Dawn, Phase::Quiet),
        ]
    );
}

#[test]
fn a_plain_night_changes_nothing() {
    let mut night = Night::new(ALWAYS);
    for t in 0..DAY {
        assert_eq!(night.tick(9 * DAY + t), None, "day 9 is not a full moon");
    }
    let mut night = Night::new(NEVER);
    for t in (0..DAY * 16).step_by(7) {
        assert_eq!(night.tick(t), None);
    }
}

#[test]
fn the_test_command_forces_tonight_and_jumps_before_the_omens() {
    let mut night = Night::new(NEVER);
    let now = 5 * DAY + 3_000;
    assert_eq!(night.phase_at(now), Phase::Quiet);
    let jump = night.force(now);
    assert_eq!(day_of(jump), 5);
    assert!(time_of_day(jump) < OMENS_START && time_of_day(jump) > OMENS_START - 200);
    assert_eq!(night.tick(jump), None);
    assert_eq!(
        night.tick(5 * DAY + OMENS_START),
        Some(Change {
            day: 5,
            from: Phase::Quiet,
            to: Phase::Omens
        })
    );
    assert_eq!(night.showing(5 * DAY + 15_000), Some(5));
    assert_eq!(night.showing(6 * DAY + 15_000), None, "only that night");
}

#[test]
fn forcing_in_the_middle_of_the_night_replays_the_same_night() {
    let mut night = Night::new(NEVER);
    let jump = night.force(2 * DAY + 20_000);
    assert_eq!(day_of(jump), 2);
    assert_eq!(night.phase_at(2 * DAY + 20_000), Phase::Night);
}

#[test]
fn cancelling_stops_a_forced_and_a_rolled_night() {
    let mut night = Night::new(NEVER);
    night.force(DAY + 100);
    night.cancel(DAY + 14_000);
    assert_eq!(night.phase_at(DAY + 14_000), Phase::Quiet);

    let mut night = Night::new(ALWAYS);
    assert_eq!(
        night.tick(8 * DAY + 15_000).map(|c| c.to),
        Some(Phase::Night)
    );
    night.cancel(8 * DAY + 15_001);
    assert_eq!(
        night.tick(8 * DAY + 15_001),
        Some(Change {
            day: 8,
            from: Phase::Night,
            to: Phase::Quiet
        })
    );
    assert_eq!(
        night.phase_at(16 * DAY + 15_000),
        Phase::Night,
        "the next one still comes"
    );
    // Forcing again brings it back.
    night.force(8 * DAY + 15_002);
    assert_eq!(night.phase_at(8 * DAY + 15_002), Phase::Night);
}

#[test]
fn a_clock_jump_lands_in_the_right_phase_with_one_change() {
    let mut night = Night::new(ALWAYS);
    assert_eq!(night.tick(8 * DAY + 100), None);
    assert_eq!(
        night.tick(8 * DAY + 18_000),
        Some(Change {
            day: 8,
            from: Phase::Quiet,
            to: Phase::Night
        })
    );
    // Sleeping: straight to the next morning.
    assert_eq!(
        night.tick(9 * DAY + 10),
        None,
        "a new day starts quiet: the night that was skipped ends without a change of its own"
    );
}
