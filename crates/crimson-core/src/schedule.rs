//! The night's events: which ones happen, and when.
//!
//! A plan is made once, when the eye opens, from the night's seed: the same
//! seed gives the same night. Events never overlap, a pause separates them,
//! and the same event never comes twice in a row when there is a choice.

use crate::rng::Rng;

/// An event the night can hold.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EventSpec {
    /// The mod's own number for the event.
    pub id: u16,
    /// How often it is picked, next to the others (0: never).
    pub weight: u32,
    /// How long it lasts, in ticks.
    pub ticks: i64,
}

/// An event's place in the night, in ticks of the day (`end` excluded).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Slot {
    pub id: u16,
    pub start: i64,
    pub end: i64,
}

/// The pause between two events, in ticks: between `min` and `max`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Pause {
    pub min: i64,
    pub max: i64,
}

/// Plans the events between the ticks `from` and `to`: after a first pause,
/// events picked by weight, each followed by a pause, as long as the next one
/// fits before `to`.
pub fn plan(seed: u64, from: i64, to: i64, pause: Pause, specs: &[EventSpec]) -> Vec<Slot> {
    let usable: Vec<EventSpec> = specs
        .iter()
        .copied()
        .filter(|s| s.weight > 0 && s.ticks > 0)
        .collect();
    let mut slots = Vec::new();
    if usable.is_empty() {
        return slots;
    }
    let min = pause.min.max(0);
    let max = pause.max.max(min);
    let mut rng = Rng::new(seed);
    let mut at = from;
    let mut last: Option<u16> = None;
    loop {
        at += min + rng.below((max - min + 1) as u64) as i64;
        // Not the one that just ran, when another can.
        let choices: Vec<EventSpec> = usable
            .iter()
            .copied()
            .filter(|s| Some(s.id) != last)
            .collect();
        let choices = if choices.is_empty() {
            usable.clone()
        } else {
            choices
        };
        let spec = pick(&mut rng, &choices);
        if at + spec.ticks > to {
            // A shorter one may still fit; if none does, the night is planned.
            match choices
                .iter()
                .copied()
                .filter(|s| at + s.ticks <= to)
                .max_by_key(|s| s.ticks)
            {
                Some(shorter) => push(&mut slots, &mut at, &mut last, shorter),
                None => return slots,
            }
        } else {
            push(&mut slots, &mut at, &mut last, spec);
        }
    }
}

/// The event running at tick `at`, if one is.
pub fn running(slots: &[Slot], at: i64) -> Option<Slot> {
    slots
        .iter()
        .copied()
        .find(|s| (s.start..s.end).contains(&at))
}

fn push(slots: &mut Vec<Slot>, at: &mut i64, last: &mut Option<u16>, spec: EventSpec) {
    slots.push(Slot {
        id: spec.id,
        start: *at,
        end: *at + spec.ticks,
    });
    *at += spec.ticks;
    *last = Some(spec.id);
}

fn pick(rng: &mut Rng, choices: &[EventSpec]) -> EventSpec {
    let total: u64 = choices.iter().map(|s| u64::from(s.weight)).sum();
    let mut roll = rng.below(total);
    for spec in choices {
        let weight = u64::from(spec.weight);
        if roll < weight {
            return *spec;
        }
        roll -= weight;
    }
    choices[choices.len() - 1]
}
