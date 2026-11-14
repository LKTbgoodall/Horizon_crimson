//! The sky is a thick shell, and it breaks (B1 "Impact glass", `preview/sky-break.html`).
//!
//! One fracture network decides everything: small facets grouped into slabs, radial around the impact (where
//! the moon is two thirds into the eclipse), small near it and huge far away. Cracks run along the slabs'
//! borders as a front that leaves the impact in jumps, on heartbeats, further in some directions than in
//! others. A cracked slab sits askew. Some slabs come loose and fall on our side, a few during the eclipse,
//! most at the climax; the hole a slab leaves is exactly its outline, onto the world behind the sky.
//!
//! What is decided is here: the impact, when the front jumps, how far it runs in each direction, where each
//! slab is, whether and when it falls, and the dice the shader needs for it. The shader draws: it finds the
//! facet and the slab of each pixel with the same integer hash and the same slab table. Times are seconds
//! since the eclipse began.

use crate::moon::TICKS_PER_SECOND;
use crate::night::{DAWN_START, ECLIPSE_START};
use crate::rise::{beat_time, BLACKOUT_START, EYE_OPENS};
use crate::rng::{mix, Rng};
use crate::sky::moon_direction;

/// Facets around the impact, and the chart's scale: fracture space is log-polar, `w = (ln r, angle) * A`.
pub const SECTORS: i32 = 36;
pub const A: f32 = SECTORS as f32 / std::f32::consts::TAU;
/// The facet grid is `w * FACET`: facets are longer away from the impact than around it.
pub const FACET: [f32; 2] = [0.625, 1.0];
/// A slab is about this wide in `w`.
pub const SLAB: [f32; 2] = [3.2, 3.0];
/// Slabs: rings from the impact outward (the first is ring [`RING0`]) by rows around it.
pub const RINGS: i32 = 12;
pub const ROWS: i32 = 12;
pub const RING0: i32 = -8;
/// The front jumps this many times, each time [`REACH`] radians further (before the direction's own factor).
pub const STEPS: usize = 16;
pub const REACH: f32 = 0.15;
/// A jump takes this long.
pub const JUMP: f32 = 0.14;
/// Directions around the impact for which the front's factor is given.
pub const SPOKES: usize = 36;
/// A slab that never falls "falls" then.
pub const NEVER: f32 = 1e9;
/// A slab comes loose this long before it falls: light leaks round it (the shader draws it).
pub const LOOSE: f32 = 1.3;
/// Floats per slab, and in the whole buffer the shader reads (see [`Plan::floats`]).
pub const SLAB_FLOATS: usize = 16;
pub const HEADER_FLOATS: usize = 4 + STEPS + SPOKES;
pub const FLOATS: usize = HEADER_FLOATS + (RINGS * ROWS) as usize * SLAB_FLOATS;
/// When the impact is fixed: the moon is behind it from the first crack to the climax.
const IMPACT_AT: f32 = 40.0;
/// Where the Spire stands behind the sky: its azimuth and elevation (the moon rises at azimuth 0).
pub const SPIRE_AZIMUTH: f32 = -0.62 / 0.88;
pub const SPIRE_ELEVATION: f32 = 0.5;

/// One slab of the shell.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Slab {
    /// Its centre in fracture space (its row's angle is in `0..SECTORS`).
    pub center_w: [f32; 2],
    /// Its centre as a direction in the world, and about its angular radius.
    pub dir: [f32; 3],
    pub size: f32,
    /// When it falls, or [`NEVER`].
    pub falls: f32,
    /// Dice, 0 to 1: `[0]` the order slabs close in at dawn; `[1..5]` how it flies once loose (drift, tumble,
    /// spin, axis); `[5..7]` how it sits askew once cracked; `[7]` its tint.
    pub dice: [f32; 8],
}

/// A night's break.
#[derive(Clone, Debug, PartialEq)]
pub struct Plan {
    /// The impact: the centre of the network, a direction in the world.
    pub center: [f32; 3],
    /// Mixed into the facets' hash, so each night has its own facets.
    pub salt: i32,
    /// When each jump of the front starts.
    pub steps: [f32; STEPS],
    /// How far the front must run to reach a point, per direction around the impact: a factor on its distance.
    pub spokes: [f32; SPOKES],
    /// Ring by ring from the impact outward, row by row.
    pub slabs: Vec<Slab>,
    /// Jolts and flickers: when, how strong.
    pub events: Vec<(f32, f32)>,
    /// What is heard: when, how strong.
    pub sounds: Vec<(f32, f32)>,
}

impl Plan {
    /// The flicker of light, and the jolt, from what broke just now.
    pub fn flash(&self, seconds: f32) -> f32 {
        self.events
            .iter()
            .filter(|(t, _)| seconds >= *t && seconds - *t < 1.0)
            .map(|(t, k)| k * (-(seconds - t) * 7.0).exp())
            .sum()
    }

    /// What is heard after `after` and up to `until`, as strengths.
    pub fn sounds_between(&self, after: f32, until: f32) -> impl Iterator<Item = f32> + '_ {
        self.sounds
            .iter()
            .filter(move |(t, _)| *t > after && *t <= until)
            .map(|(_, k)| *k)
    }

    /// When the crack front reaches `p` (a point around the impact, see [`Plan::to_p`]): at the climax at
    /// the latest.
    pub fn crack_time(&self, p: [f32; 2]) -> f32 {
        let r = (p[0] * p[0] + p[1] * p[1]).sqrt();
        let x = (p[1].atan2(p[0]) / std::f32::consts::TAU).rem_euclid(1.0) * SPOKES as f32;
        let i = (x as usize).min(SPOKES - 1);
        let f = x - i as f32;
        let spoke = self.spokes[i] + (self.spokes[(i + 1) % SPOKES] - self.spokes[i]) * f;
        let re = r * spoke / REACH;
        let k = re.floor();
        if k >= STEPS as f32 {
            return EYE_OPENS;
        }
        (self.steps[k as usize] + JUMP * (re - k)).min(EYE_OPENS)
    }

    /// A direction as a point around the impact: its angle from it, along the impact's right and up.
    pub fn to_p(&self, d: [f32; 3]) -> [f32; 2] {
        let (e1, e2) = frame_of(self.center);
        let ang = dot(d, self.center).clamp(-1.0, 1.0).acos();
        let q = [dot(d, e1), dot(d, e2)];
        let l = (q[0] * q[0] + q[1] * q[1]).sqrt().max(1e-6);
        [q[0] / l * ang, q[1] / l * ang]
    }

    /// The slab holding direction `d`: the index in [`Plan::slabs`], if the table has it.
    pub fn slab_at(&self, d: [f32; 3]) -> Option<usize> {
        let ctr = facet_center(to_w(self.to_p(d)), self.salt);
        let n = [
            (ctr[0] / SLAB[0]).floor() as i32,
            (ctr[1] / SLAB[1]).floor() as i32,
        ];
        let mut best = (f32::INFINITY, None);
        for j in -1..=1 {
            for i in -1..=1 {
                let Some(idx) = slab_index(n[0] + i, n[1] + j) else {
                    continue;
                };
                let c = self.slabs[idx].center_w;
                let turn = SECTORS as f32;
                let y = c[1] + turn * ((ctr[1] - c[1]) / turn).round();
                let dd = (c[0] - ctr[0]).powi(2) + (y - ctr[1]).powi(2);
                if dd < best.0 {
                    best = (dd, Some(idx));
                }
            }
        }
        best.1
    }

    /// The plan as the shader reads it: the impact and the salt, the steps, the spokes, then per slab four
    /// `vec4`: (centre in `w`, when it falls, dawn order), (direction, size), (flight dice), (askew, sheen, tint).
    pub fn floats(&self) -> Vec<f32> {
        let mut out = Vec::with_capacity(FLOATS);
        out.extend_from_slice(&[
            self.center[0],
            self.center[1],
            self.center[2],
            self.salt as f32,
        ]);
        out.extend_from_slice(&self.steps);
        out.extend_from_slice(&self.spokes);
        for s in &self.slabs {
            out.extend_from_slice(&[s.center_w[0], s.center_w[1], s.falls, s.dice[0]]);
            out.extend_from_slice(&[s.dir[0], s.dir[1], s.dir[2], s.size]);
            out.extend_from_slice(&s.dice[1..5]);
            out.extend_from_slice(&[s.dice[5], s.dice[6], s.dice[7], 0.0]);
        }
        out
    }
}

/// The index of the slab of ring `cx` and row `cy` (any row: they wrap), if the table has that ring.
pub fn slab_index(cx: i32, cy: i32) -> Option<usize> {
    let ring = cx - RING0;
    (0..RINGS)
        .contains(&ring)
        .then(|| (ring * ROWS + cy.rem_euclid(ROWS)) as usize)
}

/// A point around the impact, in fracture space.
pub fn to_w(p: [f32; 2]) -> [f32; 2] {
    let r = (p[0] * p[0] + p[1] * p[1]).sqrt().max(0.02);
    [r.ln() * A, p[1].atan2(p[0]) * A]
}

/// And back.
pub fn from_w(w: [f32; 2]) -> [f32; 2] {
    let (r, th) = ((w[0] / A).exp(), w[1] / A);
    [r * th.cos(), r * th.sin()]
}

/// The shader's integer hash (PCG), bit for bit: a facet must be the same here and on the GPU.
fn hashu(x: u32) -> u32 {
    let s = x.wrapping_mul(747_796_405).wrapping_add(2_891_336_453);
    let w = ((s >> ((s >> 28) + 4)) ^ s).wrapping_mul(277_803_737);
    (w >> 22) ^ w
}

fn hi(c: [i32; 2]) -> f32 {
    (hashu(c[0] as u32 ^ hashu((c[1] as u32).wrapping_add(0x9e37_79b9))) >> 8) as f32 / 16_777_216.0
}

fn hi2(c: [i32; 2]) -> [f32; 2] {
    [hi(c), hi([c[0].wrapping_add(57), c[1].wrapping_add(113)])]
}

/// The centre of the facet holding `w`: the nearest of the jittered points of the 5 x 5 cells around it.
fn facet_center(w: [f32; 2], salt: i32) -> [f32; 2] {
    let g = [w[0] * FACET[0], w[1] * FACET[1]];
    let n = [g[0].floor() as i32, g[1].floor() as i32];
    let mut best = (f32::INFINITY, [0.0; 2]);
    for j in -2..=2 {
        for i in -2..=2 {
            let c = [n[0] + i, n[1] + j];
            let h = hi2([c[0].wrapping_add(salt), c[1].rem_euclid(SECTORS)]);
            let pt = [
                (c[0] as f32 + 0.5 + (h[0] - 0.5) * 0.85) / FACET[0],
                (c[1] as f32 + 0.5 + (h[1] - 0.5) * 0.85) / FACET[1],
            ];
            let dd = (pt[0] - w[0]).powi(2) + (pt[1] - w[1]).powi(2);
            if dd < best.0 {
                best = (dd, pt);
            }
        }
    }
    best.1
}

/// Smooth noise on whole cells, 0 to 1.
fn vnoise(p: [f32; 2], salt: i32) -> f32 {
    let (fx, fy) = (p[0].floor(), p[1].floor());
    let (ix, iy) = (fx as i32, fy as i32);
    let ease = |t: f32| t * t * (3.0 - 2.0 * t);
    let (u, v) = (ease(p[0] - fx), ease(p[1] - fy));
    let at = |x: i32, y: i32| hi([x.wrapping_add(salt), y]);
    let (a, b) = (at(ix, iy), at(ix + 1, iy));
    let (c, d) = (at(ix, iy + 1), at(ix + 1, iy + 1));
    (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v
}

/// The seed of the break of the blood moon on `day`: every client of a world sees the same sky.
pub fn seed_for_day(day: i64) -> u64 {
    mix(day as u64 ^ 0xC1E5_0F15_5E5E)
}

/// How the sky heals at dawn, `seconds` after the eclipse began: how much of the holes is still open (1 all
/// night, 0 once every slab is back; they close one by one over the first 20 seconds of dawn) and how much
/// of the cracks is left (they fade once the holes are closed, gone 15 seconds later, before sunrise).
pub fn seal(seconds: f32) -> (f32, f32) {
    let dawn = (DAWN_START - ECLIPSE_START) as f32 / TICKS_PER_SECOND as f32;
    let ramp = |a: f32, b: f32| {
        let t = ((seconds - a) / (b - a)).clamp(0.0, 1.0);
        1.0 - t * t * (3.0 - 2.0 * t)
    };
    (ramp(dawn, dawn + 20.0), ramp(dawn + 18.0, dawn + 33.0))
}

/// The break of the night with `seed`. The same seed gives the same plan.
pub fn plan(seed: u64) -> Plan {
    let mut rng = Rng::new(seed);
    let salt = (rng.below(4096)) as i32;
    let center = moon_direction(ECLIPSE_START as f32 + IMPACT_AT * TICKS_PER_SECOND as f32);

    // The front jumps on heartbeats, from the eighteenth, faster and faster, the last before the hush.
    let mut steps = [0.0; STEPS];
    for (k, step) in steps.iter_mut().enumerate() {
        *step = beat_time((18.0 + 4.4 * k as f32).round());
    }
    // It runs further in some directions than in others.
    let mut spokes = [0.0; SPOKES];
    for (i, spoke) in spokes.iter_mut().enumerate() {
        let th = i as f32 / SPOKES as f32 * std::f32::consts::TAU;
        *spoke = 0.6 + 0.8 * vnoise([th.cos() * 1.7 + 7.3, th.sin() * 1.7 + 2.1], salt);
    }
    let mut plan = Plan {
        center,
        salt,
        steps,
        spokes,
        slabs: Vec::with_capacity((RINGS * ROWS) as usize),
        events: Vec::new(),
        sounds: Vec::new(),
    };

    let (e1, e2) = frame_of(center);
    for ring in 0..RINGS {
        for row in 0..ROWS {
            let jitter = [rng.unit(), rng.unit()];
            let center_w = [
                ((ring + RING0) as f32 + 0.5 + (jitter[0] - 0.5) * 0.7) * SLAB[0],
                (row as f32 + 0.5 + (jitter[1] - 0.5) * 0.7) * SLAB[1],
            ];
            let p = from_w(center_w);
            let r = (p[0] * p[0] + p[1] * p[1]).sqrt();
            let dir = add(
                scale(center, r.cos()),
                scale(add(scale(e1, p[0]), scale(e2, p[1])), r.sin() / r.max(1e-6)),
            );
            let mut dice = [0.0; 8];
            for d in &mut dice {
                *d = rng.unit();
            }
            let roll = rng.unit();
            // Patches of the sky fall, most of it near the impact, little far away; nothing under the moon.
            let patch = vnoise([p[0] * 2.4 + 5.3, p[1] * 2.4 + 1.7], salt);
            let mut falls = NEVER;
            if r > 0.2 && r < 2.2 && patch > 0.3 + 0.48 * smoothstep(0.3, 1.5, r) {
                falls = EYE_OPENS + 0.15 + r * 1.1 + roll * 0.5;
                if roll < 0.22 && r < 0.9 {
                    // A few fall during the eclipse, a while after the front passed, never in the hush.
                    let early = plan.crack_time(p) + 2.0 + 30.0 * roll;
                    if early < BLACKOUT_START - 0.5 {
                        falls = early;
                    }
                }
            }
            plan.slabs.push(Slab {
                center_w,
                dir,
                size: 0.5 * SLAB[1] * r / A,
                falls,
                dice,
            });
        }
    }
    // The slab in front of the Spire falls just after the eye opens, so the Spire can be seen (Bastien).
    let spire = [
        SPIRE_ELEVATION.cos() * SPIRE_AZIMUTH.cos(),
        SPIRE_ELEVATION.sin(),
        SPIRE_ELEVATION.cos() * SPIRE_AZIMUTH.sin(),
    ];
    if let Some(i) = plan.slab_at(spire) {
        if plan.slabs[i].falls > EYE_OPENS + 1.5 {
            plan.slabs[i].falls = EYE_OPENS + 1.0 + 0.5 * rng.unit();
        }
    }

    // Each jump of the front jolts and is heard; a slab is heard coming loose, then falling. At the climax
    // too many fall at once to hear each: one in three.
    for (k, t) in plan.steps.iter().enumerate() {
        let strength = if k == 0 { 0.8 } else { 0.5 };
        plan.events.push((*t, strength));
        plan.sounds.push((*t, strength));
    }
    for (i, s) in plan.slabs.iter().enumerate() {
        if s.falls >= NEVER {
            continue;
        }
        if s.falls < EYE_OPENS {
            plan.events.push((s.falls, 0.35));
            plan.sounds.push((s.falls - LOOSE, 0.3));
            plan.sounds.push((s.falls, 0.5));
        } else if i % 3 == 0 {
            plan.sounds.push((s.falls, 0.5));
        }
    }
    plan.events.sort_by(|a, b| a.0.total_cmp(&b.0));
    plan.sounds.sort_by(|a, b| a.0.total_cmp(&b.0));
    plan
}

/// The right and the up of the tangent plane at `c` (as the shader builds them).
fn frame_of(c: [f32; 3]) -> ([f32; 3], [f32; 3]) {
    let e1 = norm(cross([0.0, 1.0, 0.0], c));
    (e1, cross(c, e1))
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

fn add(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

fn scale(a: [f32; 3], k: f32) -> [f32; 3] {
    [a[0] * k, a[1] * k, a[2] * k]
}

fn dot(a: [f32; 3], b: [f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

fn norm(a: [f32; 3]) -> [f32; 3] {
    let l = dot(a, a).sqrt();
    if l > 1e-6 && l.is_finite() {
        scale(a, 1.0 / l)
    } else {
        [0.0, 0.0, 1.0]
    }
}
