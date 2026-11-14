use crimson_core::eye::{
    blink, is_stared_at, target_gaze, Eye, Look, PUPIL_REST, PUPIL_SLIT, PUPIL_WIDE, SEARCH_SECONDS,
};
use crimson_core::rise::{
    beats_at, frame, heartbeat, shake_angles, Frame, BLACKOUT_START, ECLIPSE_SECONDS, EYE_OPENS,
};

/// Every instant from the omens to well into the night, in steps of 10 ms.
fn instants() -> impl Iterator<Item = f32> {
    (-7_000..20_000).map(|i| i as f32 / 100.0)
}

fn values(f: &Frame) -> Vec<(&'static str, f32, f32, f32)> {
    vec![
        ("progress", f.progress, 0.0, 1.0),
        ("omens", f.omens, 0.0, 1.0),
        ("beat", f.beat, 0.0, 1.0),
        ("moon_scale", f.moon_scale, 1.0, 2.42),
        ("void_radius", f.void_radius, 0.0, 1.35),
        ("crack_reach", f.crack_reach, 0.0, 1.6),
        ("torn", f.torn, 0.0, 0.26),
        ("corona", f.corona, 0.0, 1.4),
        ("blood", f.blood, 0.0, 1.0),
        ("stars_pull", f.stars_pull, 0.0, 1.0),
        ("grade", f.grade, 0.0, 0.7),
        ("foliage", f.foliage, 0.0, 1.0),
        ("fog r", f.fog_rgb[0], 0.0, 1.0),
        ("fog g", f.fog_rgb[1], 0.0, 1.0),
        ("fog b", f.fog_rgb[2], 0.0, 1.0),
        ("fog_weight", f.fog_weight, 0.0, 0.9),
        ("dark", f.dark, 0.04, 1.0),
        ("flash", f.flash, 0.0, 1.1),
        ("shock_radius", f.shock_radius, 0.0, 2.0),
        ("shock_strength", f.shock_strength, 0.0, 1.0),
        ("seam", f.seam, 0.0, 1.0),
        ("open", f.open, 0.0, 1.0),
        ("shake_degrees", f.shake_degrees, 0.0, 1.75),
    ]
}

#[test]
fn every_value_stays_in_its_range() {
    for s in instants() {
        for (name, value, min, max) in values(&frame(s)) {
            assert!(
                value.is_finite() && (min - 1e-4..=max + 1e-4).contains(&value),
                "{name} = {value} at {s}"
            );
        }
    }
    for odd in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY, -1e9, 1e9] {
        for (name, value, ..) in values(&frame(odd)) {
            assert!(value.is_finite(), "{name} at {odd}");
        }
    }
}

#[test]
fn nothing_shows_before_the_omens_and_they_build_up() {
    let before = frame(-61.0);
    assert_eq!(before.omens, 0.0);
    assert_eq!(before.fog_weight, 0.0);
    assert_eq!(
        (
            before.progress,
            before.corona,
            before.crack_reach,
            before.grade
        ),
        (0.0, 0.0, 0.0, 0.0)
    );
    let half = frame(-30.0);
    assert!((half.omens - 0.5).abs() < 1e-4);
    assert!(
        half.fog_weight > 0.0 && half.fog_rgb[0] > half.fog_rgb[1] * 4.0,
        "the sunset is too red"
    );
    assert_eq!(half.progress, 0.0);
}

#[test]
fn the_eclipse_only_grows() {
    let mut last = frame(0.0);
    for s in instants().filter(|s| (0.0..=ECLIPSE_SECONDS).contains(s)) {
        let now = frame(s);
        for (a, b, name) in [
            (last.progress, now.progress, "progress"),
            (last.moon_scale, now.moon_scale, "moon_scale"),
            (last.void_radius, now.void_radius, "void_radius"),
            (last.crack_reach, now.crack_reach, "crack_reach"),
            (last.torn, now.torn, "torn"),
            (last.blood, now.blood, "blood"),
            (last.grade, now.grade, "grade"),
            (last.foliage, now.foliage, "foliage"),
        ] {
            assert!(b >= a, "{name} went back at {s}");
        }
        last = now;
    }
    let end = frame(ECLIPSE_SECONDS);
    assert!(end.void_radius > 1.0, "the void has eaten the whole moon");
    assert!(end.moon_scale > 2.3 && end.torn > 0.2 && end.blood == 1.0);
}

#[test]
fn the_smooth_values_never_jump() {
    let mut last = frame(-70.0);
    for s in instants() {
        let now = frame(s);
        for (a, b, name, step) in [
            (last.moon_scale, now.moon_scale, "moon_scale", 0.01),
            (last.void_radius, now.void_radius, "void_radius", 0.01),
            (last.crack_reach, now.crack_reach, "crack_reach", 0.01),
            (last.grade, now.grade, "grade", 0.01),
            (last.fog_weight, now.fog_weight, "fog_weight", 0.01),
            (last.fog_rgb[0], now.fog_rgb[0], "fog red", 0.01),
            (last.open, now.open, "open", 0.02),
            (last.dark, now.dark, "dark", 0.04),
        ] {
            assert!((b - a).abs() <= step, "{name} jumps from {a} to {b} at {s}");
        }
        last = now;
    }
}

#[test]
fn the_climax_is_darkness_then_a_flash_and_the_eye() {
    assert_eq!(frame(BLACKOUT_START - 0.1).dark, 1.0);
    assert!(frame(60.0).dark < 0.05, "black just before the eye");
    assert_eq!(frame(EYE_OPENS - 0.01).flash, 0.0);
    assert!(frame(EYE_OPENS).flash > 1.0);
    assert!(frame(EYE_OPENS + 0.5).dark == 1.0);
    assert_eq!(frame(EYE_OPENS).open, 0.0);
    assert_eq!(frame(EYE_OPENS + 2.5).open, 1.0);
    assert!(
        frame(EYE_OPENS).seam == 1.0,
        "the seam is drawn before the lid opens"
    );
    assert!(frame(EYE_OPENS).shake_degrees > 1.4);
    let later = frame(EYE_OPENS + 10.0);
    assert!(later.flash < 0.001 && later.shake_degrees < 0.001 && later.shock_strength == 0.0);
    assert_eq!(later.open, 1.0);
}

#[test]
fn the_heart_speeds_up_stops_and_comes_back_slow() {
    assert!((beats_at(1.0) - 91.5).abs() < 0.01);
    let mut last = 0;
    let mut gaps = Vec::new();
    let mut since = 0.0;
    for s in instants().filter(|s| (0.0..ECLIPSE_SECONDS).contains(s)) {
        let (pulse, count) = heartbeat(s);
        assert!((0.0..=1.0).contains(&pulse));
        assert!(
            count == last || count == last + 1,
            "a beat is skipped at {s}"
        );
        if count != last {
            gaps.push(s - since);
            since = s;
            last = count;
        }
    }
    assert_eq!(last, 91);
    assert!(
        gaps[1] > 1.2 && gaps[gaps.len() - 1] < 0.5,
        "from {} s to {} s between beats",
        gaps[1],
        gaps[gaps.len() - 1]
    );
    assert_eq!(heartbeat(62.0), (0.0, 0), "silence at the climax");
    assert_eq!(heartbeat(-5.0), (0.0, 0));
    let night: Vec<u32> = [65.0, 66.6, 68.4, 75.0]
        .iter()
        .map(|s| heartbeat(*s).1)
        .collect();
    assert_eq!(night, [0, 0, 2, 6]);
    assert!((heartbeat(65.0).0 - 1.0).abs() < 1e-5);
}

#[test]
fn the_shake_never_exceeds_its_size() {
    for s in instants() {
        let size = frame(s).shake_degrees;
        let [pitch, yaw] = shake_angles(s, size);
        assert!(pitch.abs() <= size + 1e-6 && yaw.abs() <= size + 1e-6);
    }
    assert_eq!(shake_angles(12.3, 0.0), [0.0, 0.0]);
}

const AWAY: Look = Look {
    offset: [0.4, -0.1],
    facing: true,
};
const STARING: Look = Look {
    offset: [0.02, 0.01],
    facing: true,
};

#[test]
fn the_eye_searches_then_follows_the_player() {
    assert_eq!(target_gaze(0.2, STARING), [-0.85, 0.2]);
    assert_eq!(target_gaze(1.0, STARING), [0.8, -0.25]);
    let follow = target_gaze(
        SEARCH_SECONDS,
        Look {
            offset: [0.2, 0.1],
            facing: true,
        },
    );
    assert_eq!(follow, [0.5, 0.25]);
    let far = target_gaze(
        5.0,
        Look {
            offset: [0.9, 0.0],
            facing: true,
        },
    );
    assert_eq!(far, [1.0, 0.0], "the iris stays inside the eye");
    for offset in [[f32::NAN, 0.0], [f32::INFINITY, 1.0]] {
        let g = target_gaze(
            5.0,
            Look {
                offset,
                facing: true,
            },
        );
        assert!(g[0].is_finite() && g[1].is_finite());
    }
}

#[test]
fn the_pupil_narrows_only_when_stared_at() {
    assert!(is_stared_at(STARING));
    assert!(!is_stared_at(AWAY));
    assert!(
        !is_stared_at(Look {
            offset: [0.0, 0.0],
            facing: false
        }),
        "back turned"
    );

    let mut eye = Eye::default();
    assert_eq!(eye.pupil, PUPIL_WIDE);
    let mut t = 0.0;
    let mut run = |eye: &mut Eye, seconds: f32, look: Look| {
        for _ in 0..(seconds * 60.0) as u32 {
            eye.update(1.0 / 60.0, t, look, 0.0);
            t += 1.0 / 60.0;
        }
    };
    run(&mut eye, 4.0, AWAY);
    assert!((eye.pupil - PUPIL_REST).abs() < 0.01);
    assert!(
        (eye.gaze[0] - 1.0).abs() < 0.05,
        "it looks where the player looks: {:?}",
        eye.gaze
    );
    run(&mut eye, 2.0, STARING);
    assert!(
        (eye.pupil - PUPIL_SLIT).abs() < 0.01,
        "a slit: {}",
        eye.pupil
    );
    assert!(eye.gaze[0].abs() < 0.1);
    run(&mut eye, 2.0, AWAY);
    assert!(eye.pupil > PUPIL_REST - 0.01, "it relaxes again");
}

#[test]
fn the_eye_moves_smoothly_and_survives_odd_frame_times() {
    let mut eye = Eye::default();
    let mut last = eye;
    for i in 0..600 {
        let t = i as f32 / 60.0;
        eye.update(1.0 / 60.0, t, AWAY, (t * 3.0).sin().abs());
        assert!((eye.gaze[0] - last.gaze[0]).abs() < 0.45 && (eye.pupil - last.pupil).abs() < 0.03);
        assert!(eye.gaze.iter().all(|g| (-1.0..=1.0).contains(g)));
        last = eye;
    }
    for dt in [0.0, -1.0, 50.0, f32::NAN, f32::INFINITY] {
        eye.update(dt, 10.0, AWAY, 2.0);
        assert!(eye.gaze.iter().all(|g| g.is_finite() && g.abs() <= 1.0) && eye.pupil.is_finite());
        assert!((PUPIL_SLIT..=PUPIL_WIDE).contains(&eye.pupil));
    }
}

#[test]
fn the_eye_blinks_once_per_window_and_quickly() {
    assert_eq!(blink(-1.0), 1.0);
    assert_eq!(blink(f32::NAN), 1.0);
    for window in 0..40 {
        let mut closed = 0;
        let mut shut = false;
        for i in 0..900 {
            let s = window as f32 * 9.0 + i as f32 / 100.0;
            let b = blink(s);
            assert!((0.0..=1.0).contains(&b));
            if b < 1.0 {
                closed += 1;
                assert!(
                    (3.0 - 0.23..=7.0 + 0.23).contains(&(i as f32 / 100.0)),
                    "blink at the edge of window {window}"
                );
            }
            shut |= b < 0.05;
        }
        assert!(shut, "window {window} has no blink");
        assert!(
            (40..=46).contains(&closed),
            "a blink lasts 0.44 s, not {closed} hundredths"
        );
    }
}
