use crimson_core::fissures::{
    plan, seed_for_day, CHUNK, CHUNK_FLOATS, MAX_CHUNKS, MAX_SEGMENTS, MAX_SHARDS, SEGMENT_FLOATS,
    SHARD_FLOATS,
};
use crimson_core::rise::{beat_time, beats_at, EYE_OPENS};

fn len(v: [f32; 3]) -> f32 {
    (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt()
}

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
    assert_ne!(plan(7).segments, plan(8).segments);
}

#[test]
fn a_plan_fits_the_gpu_buffers() {
    for seed in 0..20 {
        let p = plan(seed);
        assert!(
            p.segments.len() > 300 && p.segments.len() <= MAX_SEGMENTS,
            "seed {seed}: {}",
            p.segments.len()
        );
        assert!(p.chunks.len() <= MAX_CHUNKS);
        assert_eq!(p.segment_floats().len(), p.segments.len() * SEGMENT_FLOATS);
        assert_eq!(p.chunk_floats().len(), p.chunks.len() * CHUNK_FLOATS);
    }
}

#[test]
fn segments_are_on_the_sphere_and_run_forward_in_time() {
    let p = plan(3);
    for s in &p.segments {
        assert!((len(s.a) - 1.0).abs() < 1e-3 && (len(s.b) - 1.0).abs() < 1e-3);
        assert!(
            s.ta.is_finite() && s.tb.is_finite() && s.ta <= s.tb,
            "{s:?}"
        );
        assert!(s.ta >= 0.0 && s.ta < 64.0, "{s:?}");
        assert!((0.0..=1.0).contains(&s.along[0]) && s.along[0] < s.along[1] && s.along[1] <= 1.0);
        assert!(s.opening > 0.0 && s.opening < 0.1);
        assert!(s.born <= s.ta + 1e-4);
    }
}

#[test]
fn every_chunk_cap_holds_its_segments() {
    let p = plan(11);
    for c in &p.chunks {
        assert!(c.count >= 1 && c.count as usize <= CHUNK);
        let segs = &p.segments[c.first as usize..(c.first + c.count) as usize];
        assert_eq!(c.starts, segs[0].ta);
        for s in segs {
            assert!(dot(c.center, s.a) >= c.cos_reach && dot(c.center, s.b) >= c.cos_reach);
        }
    }
}

#[test]
fn cracks_are_born_on_heartbeats_before_the_hush_then_burst_at_the_climax() {
    let p = plan(5);
    let first = p.events.first().expect("events").0;
    assert!((first - beat_time(18.0)).abs() < 1e-3);
    assert!(p.events.iter().all(|(t, _)| *t < 58.0));
    let burst = p
        .chunks
        .iter()
        .filter(|c| c.starts >= EYE_OPENS && c.starts < EYE_OPENS + 0.05)
        .count();
    assert!(burst >= 14, "{burst}");
}

#[test]
fn the_flash_is_dark_before_the_first_crack_and_fades() {
    let p = plan(5);
    let first = p.events[0].0;
    assert_eq!(p.flash(first - 0.5), 0.0);
    assert!(p.flash(first) > 0.5);
    assert!(p.flash(first + 0.9) < p.flash(first + 0.1));
}

#[test]
fn each_crack_birth_is_heard_once() {
    let p = plan(seed_for_day(9));
    let all: usize = p.events_between(-1.0, 70.0).count();
    assert_eq!(all, p.events.len());
    // Tick by tick, nothing is heard twice and nothing is missed.
    let mut heard = 0;
    for tick in 0..1400 {
        heard += p
            .events_between(tick as f32 / 20.0, (tick + 1) as f32 / 20.0)
            .count();
    }
    assert_eq!(
        heard,
        p.events
            .iter()
            .filter(|(t, _)| *t > 0.0 && *t <= 70.0)
            .count()
    );
    assert_ne!(seed_for_day(9), seed_for_day(10));
}

#[test]
fn the_fissures_seal_at_dawn_before_sunrise() {
    use crimson_core::fissures::seal;
    use crimson_core::night::{DAWN_END, DAWN_START, ECLIPSE_START};
    let at = |tick: i64| (tick - ECLIPSE_START) as f32 / 20.0;
    assert_eq!(seal(at(DAWN_START) - 1.0), (1.0, 1.0));
    let (open, lines) = seal(at(DAWN_START) + 10.0);
    assert!(open > 0.0 && open < 1.0 && lines == 1.0);
    let (open, lines) = seal(at(DAWN_START) + 25.0);
    assert!(open == 0.0 && lines > 0.0 && lines < 1.0);
    assert_eq!(seal(at(DAWN_END) - 10.0), (0.0, 0.0));
}

#[test]
fn shards_break_off_along_the_cracks_mostly_at_the_climax() {
    for seed in 0..10 {
        let p = plan(seed);
        assert!(
            p.shards.len() >= 12 && p.shards.len() <= MAX_SHARDS,
            "seed {seed}: {}",
            p.shards.len()
        );
        assert_eq!(p.shard_floats().len(), p.shards.len() * SHARD_FLOATS);
        let late = p.shards.iter().filter(|s| s.falls >= EYE_OPENS).count();
        assert!(
            late * 2 >= p.shards.len(),
            "seed {seed}: {late} of {}",
            p.shards.len()
        );
        for s in &p.shards {
            assert!(s.falls.is_finite() && s.falls > 0.0 && s.size > 0.0 && s.size < 0.15);
            // Convex, counter-clockwise seen from inside the sky, and inside its cap.
            for k in 0..5 {
                let (a, b, c) = (s.corners[k], s.corners[(k + 1) % 5], s.corners[(k + 2) % 5]);
                let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
                let bc = [c[0] - b[0], c[1] - b[1], c[2] - b[2]];
                let n = [
                    ab[1] * bc[2] - ab[2] * bc[1],
                    ab[2] * bc[0] - ab[0] * bc[2],
                    ab[0] * bc[1] - ab[1] * bc[0],
                ];
                assert!(dot(n, s.center) >= -1e-7, "seed {seed}: not convex {s:?}");
                assert!(dot(a, s.center) >= s.cos_reach);
            }
        }
    }
}

#[test]
fn each_shard_is_heard_cracking_then_falling() {
    use crimson_core::fissures::BREAK_LEAD;
    let p = plan(4);
    let all = p.sounds_between(-10.0, 1e4).count();
    assert_eq!(all, p.events.len() + 2 * p.shards.len());
    let s = p.shards[0];
    let cracking = p.sounds_between(s.falls - BREAK_LEAD - 1e-3, s.falls - BREAK_LEAD);
    assert!(cracking.filter(|k| *k == 0.3).count() >= 1);
}
