//! A small deterministic generator (SplitMix64): the same seed gives the same
//! night on the server and in every test.

#[derive(Clone, Debug)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Self(seed)
    }

    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        mix(self.0)
    }

    /// A number in `0..n` (0 when `n` is 0).
    pub fn below(&mut self, n: u64) -> u64 {
        if n == 0 {
            0
        } else {
            self.next_u64() % n
        }
    }

    /// A number in `0.0..1.0`.
    pub fn unit(&mut self) -> f32 {
        unit_of(self.next_u64())
    }
}

/// One well-mixed value from `x`: a hash, for rolls that need no state.
pub fn mix(x: u64) -> u64 {
    let mut z = x;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

/// The top 24 bits of `x` as a number in `0.0..1.0`.
pub fn unit_of(x: u64) -> f32 {
    (x >> 40) as f32 / (1u64 << 24) as f32
}
