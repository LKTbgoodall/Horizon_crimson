use crimson_core::night::{DAWN_START, NIGHT_START};
use crimson_core::rng::Rng;
use crimson_core::schedule::{plan, running, EventSpec, Pause, Slot};

const SPECS: [EventSpec; 3] = [
    EventSpec {
        id: 1,
        weight: 3,
        ticks: 900,
    },
    EventSpec {
        id: 2,
        weight: 2,
        ticks: 600,
    },
    EventSpec {
        id: 3,
        weight: 1,
        ticks: 1_400,
    },
];
const PAUSE: Pause = Pause { min: 200, max: 500 };

fn night(seed: u64) -> Vec<Slot> {
    plan(seed, NIGHT_START, DAWN_START, PAUSE, &SPECS)
}

#[test]
fn the_same_seed_gives_the_same_night() {
    assert_eq!(night(42), night(42));
    assert!(
        (0..20).any(|s| night(s) != night(s + 1)),
        "seeds change the night"
    );
}

#[test]
fn events_fit_in_the_night_without_overlap_and_with_pauses() {
    for seed in 0..500 {
        let slots = night(seed);
        assert!(
            slots.len() >= 5,
            "seed {seed}: a night holds several events, not {}",
            slots.len()
        );
        let mut at = NIGHT_START;
        for slot in &slots {
            let spec = SPECS
                .iter()
                .find(|s| s.id == slot.id)
                .expect("a known event");
            assert_eq!(slot.end - slot.start, spec.ticks);
            let pause = slot.start - at;
            assert!(
                (PAUSE.min..=PAUSE.max).contains(&pause),
                "seed {seed}: pause of {pause}"
            );
            assert!(
                slot.end <= DAWN_START,
                "seed {seed}: an event runs into dawn"
            );
            at = slot.end;
        }
        // The night is full: after the longest pause, no event other than the last one
        // (900 ticks at most for the shortest of those) fits any more.
        assert!(
            at + PAUSE.max + 900 > DAWN_START,
            "seed {seed}: the night stops early at {at}"
        );
    }
}

#[test]
fn the_same_event_never_runs_twice_in_a_row() {
    for seed in 0..500 {
        for pair in night(seed).windows(2) {
            assert_ne!(pair[0].id, pair[1].id, "seed {seed}");
        }
    }
}

#[test]
fn weights_decide_how_often_an_event_comes() {
    let mut counts = [0u32; 4];
    for seed in 0..2_000 {
        for slot in night(seed) {
            counts[slot.id as usize] += 1;
        }
    }
    assert!(counts[1] > counts[2] && counts[2] > counts[3], "{counts:?}");
    assert!(counts[3] > 0);
}

#[test]
fn an_event_with_no_weight_or_no_length_never_comes() {
    let specs = [
        EventSpec {
            id: 1,
            weight: 0,
            ticks: 500,
        },
        EventSpec {
            id: 2,
            weight: 5,
            ticks: 0,
        },
        EventSpec {
            id: 3,
            weight: 1,
            ticks: 500,
        },
    ];
    for seed in 0..50 {
        let slots = plan(seed, 0, 20_000, PAUSE, &specs);
        assert!(
            !slots.is_empty() && slots.iter().all(|s| s.id == 3),
            "one choice may repeat"
        );
    }
}

#[test]
fn odd_inputs_give_an_empty_or_a_sane_plan() {
    assert!(plan(1, 0, 10_000, PAUSE, &[]).is_empty());
    assert!(plan(1, 5_000, 5_000, PAUSE, &SPECS).is_empty());
    assert!(
        plan(1, 5_000, 1_000, PAUSE, &SPECS).is_empty(),
        "a night that ends before it starts"
    );
    assert!(
        plan(1, 0, 700, PAUSE, &SPECS).is_empty(),
        "too short for anything after the pause"
    );
    let backwards = Pause { min: 300, max: -5 };
    let slots = plan(1, 0, 10_000, backwards, &SPECS);
    assert!(slots.windows(2).all(|p| p[1].start - p[0].end == 300));
    let no_pause = Pause { min: 0, max: 0 };
    let slots = plan(1, 0, 10_000, no_pause, &SPECS);
    assert!(slots.windows(2).all(|p| p[1].start == p[0].end));
}

#[test]
fn the_running_event_is_found_by_its_tick() {
    let slots = night(7);
    let first = slots[0];
    assert_eq!(running(&slots, first.start), Some(first));
    assert_eq!(running(&slots, first.end - 1), Some(first));
    assert_eq!(running(&slots, first.end), None, "a pause follows");
    assert_eq!(running(&slots, NIGHT_START), None);
    assert_eq!(running(&[], 100), None);
}

#[test]
fn the_generator_is_even_and_in_range() {
    let mut rng = Rng::new(3);
    let mut buckets = [0u32; 10];
    for _ in 0..100_000 {
        buckets[rng.below(10) as usize] += 1;
        let u = rng.unit();
        assert!((0.0..1.0).contains(&u));
    }
    assert!(
        buckets.iter().all(|n| (9_500..10_500).contains(n)),
        "{buckets:?}"
    );
    assert_eq!(rng.below(0), 0);
}
