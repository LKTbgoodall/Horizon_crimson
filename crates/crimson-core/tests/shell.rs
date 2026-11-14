use crimson_core::moon::TICKS_PER_SECOND;
use crimson_core::night::{DAWN_END, DAWN_START, ECLIPSE_START};
use crimson_core::rise::{beat_time, beats_at, BLACKOUT_START, EYE_OPENS};
use crimson_core::shell::{
    from_w, plan, seal, seed_for_day, slab_index, to_w, FLOATS, LOOSE, NEVER, RING0, RINGS, ROWS,
    SPIRE_AZIMUTH, SPIRE_ELEVATION, STEPS,
};

fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

#[test]
fn beat_time_inverts_beats_at() {
    for p in [0.0f32, 0.1, 0.37, 0.8, 1.0] {
        let t = beat_time(beats_at(p));
        assert!((t - p * 60.0).abs() < 1e-2, "p {p}: {t}");
    }
    assert_eq!(beat_time(-5.0), 0.0);
    assert_eq!(beat_time(1e6), 60.0);
}

#[test]
fn same_seed_same_plan_other_seed_other_plan() {
    assert_eq!(plan(7), plan(7));
    assert_ne!(plan(7).slabs, plan(8).slabs);
    assert_ne!(seed_for_day(9), seed_for_day(10));
}

#[test]
fn a_plan_fills_the_gpu_buffer_with_finite_numbers() {
    for seed in 0..20 {
        let p = plan(seed);
        assert_eq!(p.slabs.len(), (RINGS * ROWS) as usize);
        let floats = p.floats();
        assert_eq!(floats.len(), FLOATS);
        assert!(floats.iter().all(|f| f.is_finite()), "seed {seed}");
        assert!((dot(p.center, p.center) - 1.0).abs() < 1e-4);
        assert!(p.center[1] > 0.0, "the impact is above the horizon");
    }
}

#[test]
fn the_chart_goes_there_and_back() {
    for p in [[0.3f32, 0.1], [-0.8, 0.5], [0.05, -0.2], [-1.4, -0.9]] {
        let q = from_w(to_w(p));
        assert!(
            (q[0] - p[0]).abs() < 1e-4 && (q[1] - p[1]).abs() < 1e-4,
            "{p:?} -> {q:?}"
        );
    }
    assert_eq!(slab_index(RING0, 0), Some(0));
    assert_eq!(slab_index(RING0, -1), Some((ROWS - 1) as usize));
    assert_eq!(slab_index(RING0 - 1, 0), None);
    assert_eq!(slab_index(RING0 + RINGS, 0), None);
}

#[test]
fn every_direction_of_the_sky_has_a_slab() {
    let p = plan(seed_for_day(3));
    for i in 0..40 {
        for j in 0..10 {
            let (az, el) = (i as f32 * 0.157, j as f32 * 0.15);
            let d = [el.cos() * az.cos(), el.sin(), el.cos() * az.sin()];
            assert!(p.slab_at(d).is_some(), "az {az} el {el}");
        }
    }
}

#[test]
fn the_front_jumps_on_heartbeats_before_the_hush() {
    let p = plan(1);
    assert_eq!(p.steps.len(), STEPS);
    assert!(p.steps[0] > 15.0);
    assert!(p.steps.windows(2).all(|w| w[1] > w[0]));
    assert!(p.steps[STEPS - 1] < BLACKOUT_START);
    // Faster and faster.
    assert!(p.steps[STEPS - 1] - p.steps[STEPS - 2] < p.steps[1] - p.steps[0]);
    // Near the impact first, far later, everything by the climax.
    assert!(p.crack_time([0.05, 0.0]) < p.crack_time([0.6, 0.0]));
    assert_eq!(p.crack_time([3.0, 0.0]), EYE_OPENS);
    for s in p.spokes {
        assert!((0.6..=1.4).contains(&s));
    }
}

#[test]
fn slabs_fall_after_their_crack_a_few_early_most_at_the_climax() {
    for seed in 0..20 {
        let p = plan(seed);
        let falling: Vec<_> = p.slabs.iter().filter(|s| s.falls < NEVER).collect();
        let early = falling.iter().filter(|s| s.falls < EYE_OPENS).count();
        assert!(
            (6..=70).contains(&falling.len()),
            "seed {seed}: {} fall",
            falling.len()
        );
        assert!(
            early * 2 < falling.len(),
            "seed {seed}: {early} early of {}",
            falling.len()
        );
        for s in &falling {
            let at = p.to_p(s.dir);
            let r = (at[0] * at[0] + at[1] * at[1]).sqrt();
            assert!(r > 0.19, "nothing falls under the moon");
            assert!(
                s.falls >= p.crack_time(at) + 1.9 || s.falls >= EYE_OPENS,
                "seed {seed}"
            );
            assert!(s.falls < BLACKOUT_START - 0.4 || s.falls > EYE_OPENS);
            assert!(s.falls < EYE_OPENS + 5.0);
            assert!((dot(s.dir, s.dir) - 1.0).abs() < 1e-3);
        }
    }
}

#[test]
fn the_slab_in_front_of_the_spire_falls() {
    let spire = [
        SPIRE_ELEVATION.cos() * SPIRE_AZIMUTH.cos(),
        SPIRE_ELEVATION.sin(),
        SPIRE_ELEVATION.cos() * SPIRE_AZIMUTH.sin(),
    ];
    for seed in 0..20 {
        let p = plan(seed);
        let slab = p.slabs[p.slab_at(spire).expect("a slab")];
        assert!(slab.falls <= EYE_OPENS + 1.5, "seed {seed}: {}", slab.falls);
    }
}

#[test]
fn the_flash_is_dark_before_the_first_crack_and_fades() {
    let p = plan(5);
    assert_eq!(p.flash(p.steps[0] - 0.5), 0.0);
    assert!(p.flash(p.steps[0] + 0.01) > 0.5);
    assert!(p.flash(p.steps[0] + 0.01) > p.flash(p.steps[0] + 0.4));
}

#[test]
fn each_sound_is_heard_once_and_a_loose_slab_is_heard_twice() {
    let p = plan(seed_for_day(9));
    let mut heard = 0;
    let mut t = 0.0f32;
    while t < 80.0 {
        heard += p.sounds_between(t, t + 0.05).count();
        t += 0.05;
    }
    assert_eq!(heard, p.sounds.len());
    let early = p.slabs.iter().filter(|s| s.falls < EYE_OPENS).count();
    assert!(p.sounds.len() >= STEPS + 2 * early);
    for s in p.slabs.iter().filter(|s| s.falls < EYE_OPENS) {
        assert!(p
            .sounds
            .iter()
            .any(|(t, _)| (*t - (s.falls - LOOSE)).abs() < 1e-4));
    }
}

#[test]
fn the_sky_heals_at_dawn_before_sunrise() {
    let at = |tick: i64| (tick - ECLIPSE_START) as f32 / TICKS_PER_SECOND as f32;
    assert_eq!(seal(at(DAWN_START) - 1.0), (1.0, 1.0));
    let (open, lines) = seal(at(DAWN_START) + 10.0);
    assert!(open > 0.0 && open < 1.0 && lines == 1.0);
    let (open, lines) = seal(at(DAWN_START) + 25.0);
    assert!(open == 0.0 && lines > 0.0 && lines < 1.0);
    assert_eq!(seal(at(DAWN_END) - 10.0), (0.0, 0.0));
}
