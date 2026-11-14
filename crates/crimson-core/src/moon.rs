//! The vanilla clock: days, the hour, the moon's phase.
//! `day_time` is the overworld clock in ticks; it keeps counting past 24000.

/// Ticks in a day.
pub const DAY: i64 = 24_000;
/// Ticks in a second.
pub const TICKS_PER_SECOND: i64 = 20;

/// The day `day_time` is in (0 for the first).
pub fn day_of(day_time: i64) -> i64 {
    day_time.div_euclid(DAY)
}

/// The hour of `day_time`, 0 to 23999 (0 is sunrise, 12000 sunset, 18000 midnight).
pub fn time_of_day(day_time: i64) -> i64 {
    day_time.rem_euclid(DAY)
}

/// The moon's phase on `day`, as vanilla counts it: 0 is the full moon, 4 the new moon.
pub fn moon_phase(day: i64) -> u8 {
    day.rem_euclid(8) as u8
}

/// Whether the night of `day` has a full moon.
pub fn is_full_moon(day: i64) -> bool {
    moon_phase(day) == 0
}
