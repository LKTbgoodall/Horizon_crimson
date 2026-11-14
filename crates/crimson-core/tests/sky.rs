use crimson_core::night::{presence, CLIMAX_START, DAWN_START, ECLIPSE_START, OMENS_START};
use crimson_core::rise::{frame, EYE_OPENS};
use crimson_core::sky::{
    clouds, colors, day_turn, lid, look, moon_angle_degrees, moon_direction, since_open,
    MOON_RADIUS,
};

fn close(a: f32, b: f32) -> bool {
    (a - b).abs() < 1e-3
}

#[test]
fn the_moon_follows_the_games_eased_path() {
    assert!(close(day_turn(6_000.0), 0.0), "noon");
    assert!(close(day_turn(18_000.0), 0.5), "midnight");
    assert!(close(moon_angle_degrees(18_000.0), 360.0));
    let midnight = moon_direction(18_000.0);
    assert!(close(midnight[1], 1.0), "overhead: {midnight:?}");
    // Values of the game's own timeline (cubic Bezier 0.362, 0.241, 0.638, 0.759).
    for (tick, degrees_up) in [
        (12_500.0, -4.5),
        (13_000.0, 3.5),
        (13_400.0, 10.1),
        (14_600.0, 30.2),
        (22_800.0, 6.8),
    ] {
        let d = moon_direction(tick);
        let up = d[1].asin().to_degrees();
        assert!(
            (up - degrees_up).abs() < 0.15,
            "{up} degrees up at {tick}, the game says {degrees_up}"
        );
        assert_eq!(
            d[0] > 0.0,
            tick < 18_000.0,
            "east in the evening, west in the morning"
        );
    }
    let mut last = day_turn(6_000.0);
    for t in (6_010..30_000).step_by(10) {
        let now = day_turn(t as f32);
        let d = moon_direction(t as f32);
        assert!(close(d[0] * d[0] + d[1] * d[1] + d[2] * d[2], 1.0));
        assert!(
            now >= last - 1e-4 && now - last < 0.001,
            "the sky turns steadily: {last} to {now} at {t}"
        );
        last = now;
    }
    assert!(day_turn(f32::NAN).is_finite());
}

#[test]
fn the_moon_is_well_up_for_the_whole_eclipse() {
    assert!(
        moon_direction(OMENS_START as f32)[1] < 0.0,
        "still under the horizon when the omens start"
    );
    let start = moon_direction(ECLIPSE_START as f32)[1].asin().to_degrees();
    let end = moon_direction(CLIMAX_START as f32)[1].asin().to_degrees();
    assert!(
        (9.5..10.5).contains(&start),
        "{start} degrees up when the eclipse starts"
    );
    assert!(
        (29.5..31.0).contains(&end),
        "{end} degrees up when the eye opens"
    );
    // Even swollen 2.4 times, its lower edge clears the horizon at the climax.
    assert!(end.to_radians() - MOON_RADIUS * 2.42 > 0.2);
}

#[test]
fn our_sky_takes_over_through_the_omens_and_the_start_of_the_eclipse() {
    let at = |tod: i64| {
        let seconds = (tod - ECLIPSE_START) as f32 / 20.0;
        colors(&frame(seconds), presence(tod))
    };
    assert_eq!(at(OMENS_START).weight, 0.0);
    assert_eq!(at(OMENS_START).moon, 0.0);
    let dusk = at(ECLIPSE_START);
    assert!(close(dusk.weight, 0.35) && close(dusk.moon, 1.0));
    let quarter = at(ECLIPSE_START + 300);
    assert!(close(quarter.weight, 1.0));
    assert!(close(at(18_000).weight, 1.0), "all night");
    assert!(at(DAWN_START + 500).weight < 0.55, "fading at dawn");
    let mut last = at(OMENS_START - 10).weight;
    for tod in OMENS_START - 10..24_000 {
        let c = at(tod);
        assert!((0.0..=1.0).contains(&c.weight) && (0.0..=1.0).contains(&c.moon));
        assert!((c.weight - last).abs() < 0.01, "the sky jumps at {tod}");
        for v in c.horizon.iter().chain(&c.zenith) {
            assert!((0.0..=1.0).contains(v));
        }
        last = c.weight;
    }
}

#[test]
fn the_sunset_is_too_red_then_the_sky_goes_blood_dark() {
    let omens = colors(&frame(-55.0), 0.1);
    assert!(omens.horizon[0] > 0.9 && omens.horizon[1] < 0.2);
    let night = colors(&frame(70.0), 1.0);
    assert!(
        night.zenith[0] < 0.1 && night.zenith[1] == 0.0,
        "near black, a hint of red"
    );
    assert!(night.horizon[0] > night.horizon[1] * 10.0);
}

#[test]
fn the_lid_opens_blinks_and_closes_at_dawn() {
    assert_eq!(lid(&frame(30.0), 30.0, 1.0), 0.0);
    assert_eq!(lid(&frame(EYE_OPENS), EYE_OPENS, 1.0), 0.0);
    let half = lid(&frame(EYE_OPENS + 1.25), EYE_OPENS + 1.25, 1.0);
    assert!(close(half, 0.5));
    let mut blinks = 0;
    let mut shut = false;
    for i in 0..60_000 {
        let s = EYE_OPENS + 2.5 + i as f32 / 100.0;
        let open = lid(&frame(s), s, 1.0);
        assert!((0.0..=1.0).contains(&open));
        if open < 0.05 && !shut {
            blinks += 1;
        }
        shut = open < 0.05;
    }
    assert!(
        (60..=70).contains(&blinks),
        "about one blink every 9 seconds in 10 minutes, not {blinks}"
    );
    assert_eq!(
        lid(&frame(9_000.0), 9_000.0, 0.75),
        0.0,
        "closed a quarter into dawn"
    );
    assert!(lid(&frame(8_990.33), 8_990.33, 0.9) <= 0.6);
}

#[test]
fn the_eye_wakes_a_second_after_the_lid_moves() {
    assert_eq!(since_open(EYE_OPENS + 1.0), 0.0);
    assert!(since_open(EYE_OPENS) < 0.0);
}

#[test]
fn the_players_look_is_read_from_the_moon() {
    let moon = moon_direction(14_000.0);
    let at_it = look(moon, moon);
    assert!(at_it.facing && close(at_it.offset[0], 0.0) && close(at_it.offset[1], 0.0));
    let away = look([-moon[0], -moon[1], -moon[2]], moon);
    assert!(!away.facing);
    // Facing east, south (+z) is on the right.
    let right = look([0.8, 0.0, 0.6], [1.0, 0.0, 0.0]);
    assert!(right.facing && close(right.offset[0], 0.6) && close(right.offset[1], 0.0));
    let up = look([0.8, 0.6, 0.0], [1.0, 0.0, 0.0]);
    assert!(close(up.offset[0], 0.0) && close(up.offset[1], 0.6));
    // A moon straight overhead still gives finite numbers.
    let overhead = look([0.0, 1.0, 0.0], [0.0, 1.0, 0.0]);
    assert!(overhead.offset.iter().all(|v| v.is_finite()));
}

#[test]
fn the_clouds_dissolve_in_the_omens_and_return_at_dawn() {
    assert_eq!(clouds(presence(OMENS_START)), 1.0);
    assert_eq!(
        clouds(presence(ECLIPSE_START - 200)),
        0.0,
        "gone before the eclipse"
    );
    assert_eq!(clouds(presence(18_000)), 0.0);
    assert_eq!(
        clouds(presence(DAWN_START + 1_000)),
        1.0,
        "back when dawn ends"
    );
    let mut last = 1.0;
    for tod in OMENS_START..ECLIPSE_START {
        let now = clouds(presence(tod));
        assert!(
            now <= last && last - now < 0.005,
            "they fade smoothly, at {tod}"
        );
        last = now;
    }
}
