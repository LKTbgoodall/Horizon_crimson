//! The sky's fissures (C1, ADR-016): real cracks fixed in the sky, planned
//! once per blood moon night.
//!
//! Nothing grows on its own: every crack is born on a heartbeat, at the
//! moon's edge or off a crack already there. Its tip runs fast then slows,
//! and it stays where it was born in the sky while the moon rises on. A main
//! fault is torn from the moon on both sides and pushed across the sky in
//! stages; at the climax a burst of cracks shoots out all around the moon.
//! Later the two lips of each crack part into a lens onto the world behind
//! the sky: how far each one opens is planned here, the opening itself is
//! the shader's.
//!
//! A crack is a polyline on the unit sphere (world directions, x east, y up),
//! cut into segments; segments come in chunks of [`CHUNK`] with a bounding
//! cap so the shader only tests the chunks near a pixel. Times are seconds
//! since the eclipse began. The numbers are `preview/abyss-climax.html`'s.

use crate::moon::TICKS_PER_SECOND;
use crate::night::{DAWN_START, ECLIPSE_START};
use crate::rise::{beat_time, frame, EYE_OPENS};
use crate::rng::Rng;
use crate::sky::{moon_direction, MOON_RADIUS};

/// The length of one segment, in radians.
pub const STEP: f32 = 0.03;
/// Segments per chunk.
pub const CHUNK: usize = 8;
/// The most segments and chunks a plan holds (the GPU buffers' sizes).
pub const MAX_SEGMENTS: usize = 2048;
pub const MAX_CHUNKS: usize = 512;
/// Floats per segment and per chunk, as the shader reads them.
pub const SEGMENT_FLOATS: usize = 12;
pub const CHUNK_FLOATS: usize = 8;
/// New cracks stop here: the hush before the eye.
const LAST_CRACK: f32 = 58.0;
/// How far a crack's glow reaches past its line, in radians (for the caps).
const GLOW_REACH: f32 = 0.04;

/// One segment: the tip reaches `a` at `ta` and `b` at `tb`.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Segment {
    pub a: [f32; 3],
    pub ta: f32,
    pub b: [f32; 3],
    pub tb: f32,
    /// Where `a` and `b` sit along their crack, 0 to 1 (the lens is widest in the middle).
    pub along: [f32; 2],
    /// When the crack was born.
    pub born: f32,
    /// How far its lips part at most, in radians.
    pub opening: f32,
}

/// Up to [`CHUNK`] segments of one crack, and a cap holding them and their glow.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Chunk {
    pub center: [f32; 3],
    /// The cosine of the cap's angular radius: a direction `d` is outside when `dot(d, center) < cos_reach`.
    pub cos_reach: f32,
    pub first: u32,
    pub count: u32,
    /// When its first segment starts.
    pub starts: f32,
    /// The crack's line width, relative.
    pub width: f32,
}

/// A night's fissures.
#[derive(Clone, Debug, PartialEq)]
pub struct Plan {
    pub segments: Vec<Segment>,
    pub chunks: Vec<Chunk>,
    /// Each new crack or stage: when, and how strong its flicker of light is.
    pub events: Vec<(f32, f32)>,
}

impl Plan {
    /// The flicker of light from cracks born just now, at `seconds`.
    pub fn flash(&self, seconds: f32) -> f32 {
        self.events
            .iter()
            .filter(|(t, _)| seconds >= *t && seconds - *t < 1.0)
            .map(|(t, k)| k * (-(seconds - t) * 7.0).exp())
            .sum()
    }

    /// The cracks born after `after` and up to `until` (seconds): the strength of each, for its sound.
    pub fn events_between(&self, after: f32, until: f32) -> impl Iterator<Item = f32> + '_ {
        self.events
            .iter()
            .filter(move |(t, _)| *t > after && *t <= until)
            .map(|(_, k)| *k)
    }

    /// The segments as the shader reads them: per segment `a, ta, b, tb, along, born, opening`.
    pub fn segment_floats(&self) -> Vec<f32> {
        let mut out = Vec::with_capacity(self.segments.len() * SEGMENT_FLOATS);
        for s in &self.segments {
            out.extend_from_slice(&[s.a[0], s.a[1], s.a[2], s.ta, s.b[0], s.b[1], s.b[2], s.tb]);
            out.extend_from_slice(&[s.along[0], s.along[1], s.born, s.opening]);
        }
        out
    }

    /// The chunks as the shader reads them: per chunk `center, cos_reach, first, count, starts, width`.
    pub fn chunk_floats(&self) -> Vec<f32> {
        let mut out = Vec::with_capacity(self.chunks.len() * CHUNK_FLOATS);
        for c in &self.chunks {
            out.extend_from_slice(&[c.center[0], c.center[1], c.center[2], c.cos_reach]);
            out.extend_from_slice(&[c.first as f32, c.count as f32, c.starts, c.width]);
        }
        out
    }
}

/// How a new crack grows: its length, its tip's start speed, its flicker,
/// how jagged, how wide its line and how far its lips part.
#[derive(Clone, Copy, Debug)]
struct Growth {
    len: f32,
    v0: f32,
    flicker: f32,
    jitter: f32,
    width: f32,
    opening: f32,
}

/// One stage of a crack's growth: from `s0` to `s1` along it, starting at `t0`, tip speed `v0`.
#[derive(Clone, Copy, Debug)]
struct Stage {
    t0: f32,
    s0: f32,
    s1: f32,
    v0: f32,
}

#[derive(Clone, Debug)]
struct Crack {
    points: Vec<[f32; 3]>,
    headings: Vec<[f32; 3]>,
    stages: Vec<Stage>,
    width: f32,
    opening: f32,
}

impl Crack {
    /// When the tip reaches point `i` (infinity if no stage reaches it).
    fn time_at(&self, i: usize) -> f32 {
        let s = i as f32 * STEP;
        for g in &self.stages {
            if s <= g.s1 + 1e-4 {
                return g.t0 + run_time((s - g.s0).max(0.0), g.s1 - g.s0, g.v0);
            }
        }
        f32::INFINITY
    }

    /// The index of the last point reached by the last stage.
    fn last(&self) -> usize {
        self.stages
            .last()
            .map_or(0, |g| (g.s1 / STEP).round() as usize)
            .min(self.points.len() - 1)
    }
}

/// The tip runs fast then slows: the time to reach `x` along a stage of
/// length `len` with a start speed `v0` (radians per second).
fn run_time(x: f32, len: f32, v0: f32) -> f32 {
    let k = 1.3 * len.max(1e-4);
    let tau = k / v0.max(1e-4);
    -tau * (1.0 - (x / k).min(0.999)).ln()
}

/// Where the moon is and how big it looks, `seconds` after the eclipse began.
fn moon_at(seconds: f32) -> ([f32; 3], f32) {
    let tod = ECLIPSE_START as f32 + seconds * TICKS_PER_SECOND as f32;
    (moon_direction(tod), MOON_RADIUS * frame(seconds).moon_scale)
}

struct Planner {
    rng: Rng,
    cracks: Vec<Crack>,
    events: Vec<(f32, f32)>,
}

impl Planner {
    fn unit(&mut self) -> f32 {
        self.rng.unit()
    }

    /// A point on the moon's edge at `seconds`, at angle `th` around it, and the heading away from it.
    fn limb(&self, seconds: f32, th: f32) -> ([f32; 3], [f32; 3]) {
        let (m, radius) = moon_at(seconds);
        let right = norm(cross(m, [0.0, 1.0, 0.0]));
        let up = cross(right, m);
        let t = add(scale(right, th.cos()), scale(up, th.sin()));
        // From under the moon: once it has moved on, no empty disc is left where it was.
        let r = radius * 0.3;
        (
            norm(add(scale(m, r.cos()), scale(t, r.sin()))),
            norm(add(scale(m, -r.sin()), scale(t, r.cos()))),
        )
    }

    /// A jagged walk on the sphere from `p` heading `h`, `len` long.
    fn walk(
        &mut self,
        mut p: [f32; 3],
        mut h: [f32; 3],
        len: f32,
        jitter: f32,
        width: f32,
        opening: f32,
    ) -> usize {
        let steps = (len / STEP).round().max(1.0) as usize;
        let mut points = vec![p];
        let mut headings = vec![h];
        let (c, s) = (STEP.cos(), STEP.sin());
        for _ in 0..steps {
            let p2 = norm(add(scale(p, c), scale(h, s)));
            let mut h2 = add(scale(p, -s), scale(h, c));
            let mut turn = (self.unit() - 0.5) * 2.0 * jitter;
            if self.unit() < 0.14 {
                // A kink: a real crack is jagged.
                let side = if self.unit() < 0.5 { -1.0 } else { 1.0 };
                turn += side * (0.35 + 0.4 * self.unit());
            }
            h2 = norm(add(scale(h2, turn.cos()), scale(cross(p2, h2), turn.sin())));
            p = p2;
            h = h2;
            points.push(p);
            headings.push(h);
        }
        self.cracks.push(Crack {
            points,
            headings,
            stages: Vec::new(),
            width,
            opening,
        });
        self.cracks.len() - 1
    }

    /// Pushes crack `i` on to `s1` along it, from `t0`, and notes its flicker.
    fn stage(&mut self, i: usize, t0: f32, s1: f32, v0: f32, flicker: f32) {
        let crack = &mut self.cracks[i];
        let s0 = crack.stages.last().map_or(0.0, |g| g.s1);
        // On a whole point, so the last point reached has a time.
        let s1 = (s1 / STEP).round().min((crack.points.len() - 1) as f32) * STEP;
        if s1 > s0 {
            crack.stages.push(Stage { t0, s0, s1, v0 });
            if flicker > 0.0 {
                self.events.push((t0, flicker));
            }
        }
    }

    /// A new crack leaving the moon's edge at angle `th`, at `t`.
    fn moon_crack(&mut self, t: f32, th: f32, g: Growth) {
        let (p, h) = self.limb(t, th);
        let i = self.walk(p, h, g.len, g.jitter, g.width, g.opening);
        self.stage(i, t, g.len, g.v0, g.flicker);
    }

    /// A new crack splitting off one already there, from a point its tip passed a while ago.
    fn branch(&mut self, t: f32, len: f32, v0: f32, flicker: f32, opening: f32) {
        let candidates: Vec<usize> = (0..self.cracks.len())
            .filter(|&i| !self.cracks[i].stages.is_empty() && self.cracks[i].time_at(3) < t - 0.3)
            .collect();
        if candidates.is_empty() {
            return;
        }
        let parent =
            candidates[(self.unit() * candidates.len() as f32) as usize % candidates.len()];
        let crack = &self.cracks[parent];
        let mut n = 3;
        while n + 1 < crack.points.len() && crack.time_at(n + 1) < t - 0.2 {
            n += 1;
        }
        let pick = self.rng.unit();
        let crack = &self.cracks[parent];
        let j = 2 + ((pick * (n - 2).max(1) as f32) as usize).min(n.saturating_sub(3));
        let (p, h0, width) = (crack.points[j], crack.headings[j], crack.width);
        let side = if self.unit() < 0.5 { -1.0 } else { 1.0 };
        let a = side * (0.55 + 0.55 * self.unit());
        let h = norm(add(scale(h0, a.cos()), scale(cross(p, h0), a.sin())));
        let i = self.walk(p, h, len, 0.25, width * 0.7, opening);
        self.stage(i, t, len, v0, flicker);
    }
}

/// How the fissures seal at dawn, `seconds` after the eclipse began: how open their lips still are
/// (1 all night, 0 once closed) and how much of their lines is left (they fade once closed). The lips
/// close over the first 20 seconds of dawn, the lines are gone 15 seconds later, before sunrise.
pub fn seal(seconds: f32) -> (f32, f32) {
    let dawn = (DAWN_START - ECLIPSE_START) as f32 / TICKS_PER_SECOND as f32;
    let ramp = |a: f32, b: f32| {
        let t = ((seconds - a) / (b - a)).clamp(0.0, 1.0);
        1.0 - t * t * (3.0 - 2.0 * t)
    };
    (ramp(dawn, dawn + 20.0), ramp(dawn + 18.0, dawn + 33.0))
}

/// The seed of the fissures of the blood moon on `day`: every client of a world sees the same sky.
pub fn seed_for_day(day: i64) -> u64 {
    crate::rng::mix(day as u64 ^ 0xC1E5_0F15_5E5E)
}

/// The fissures of the night with `seed`. The same seed gives the same plan.
pub fn plan(seed: u64) -> Plan {
    let mut pl = Planner {
        rng: Rng::new(seed),
        cracks: Vec::new(),
        events: Vec::new(),
    };
    let tau = std::f32::consts::TAU;

    // The main fault, torn from the moon on both sides, climbing into the sky, pushed further in stages.
    let tf = beat_time(18.0);
    let (lp, lh) = pl.limb(tf, std::f32::consts::PI - 0.45);
    let (rp, rh) = pl.limb(tf, 0.4);
    let left = pl.walk(lp, lh, 1.3, 0.1, 2.2, 0.028);
    let right = pl.walk(rp, rh, 1.3, 0.1, 2.2, 0.028);
    for (k, (n, s)) in [
        (18.0, 0.2),
        (24.0, 0.38),
        (31.0, 0.56),
        (40.0, 0.76),
        (49.0, 0.98),
        (56.0, 1.3),
    ]
    .into_iter()
    .enumerate()
    {
        pl.stage(left, beat_time(n), s, 0.9, if k == 0 { 0.8 } else { 0.5 });
        pl.stage(right, beat_time(n + 1.0), s, 0.9, 0.5);
    }
    for n in [26.0, 37.0, 47.0, 53.0] {
        let (len, th) = (0.25 + 0.3 * pl.unit(), pl.unit() * tau);
        pl.moon_crack(
            beat_time(n),
            th,
            Growth {
                len,
                v0: 1.1,
                flicker: 0.4,
                jitter: 0.22,
                width: 1.0,
                opening: 0.004,
            },
        );
    }
    for n in [34.0, 43.0, 45.0, 51.0] {
        let len = 0.15 + 0.3 * pl.unit();
        pl.branch(beat_time(n), len, 0.8, 0.25, 0.0025);
    }
    // Faster and faster toward the climax.
    let mut n = 58.0;
    while beat_time(n) < LAST_CRACK && n < 200.0 {
        if pl.unit() < 0.45 {
            let (len, th) = (0.2 + 0.35 * pl.unit(), pl.unit() * tau);
            pl.moon_crack(
                beat_time(n),
                th,
                Growth {
                    len,
                    v0: 1.2,
                    flicker: 0.35,
                    jitter: 0.22,
                    width: 1.0,
                    opening: 0.004,
                },
            );
        } else {
            let len = 0.12 + 0.3 * pl.unit();
            pl.branch(beat_time(n), len, 0.9, 0.22, 0.0025);
        }
        n += if n < 72.0 { 2.0 } else { 1.0 };
    }
    // The climax: the moon bursts the shell, cracks shoot out all around it, then branch.
    for i in 0..14 {
        let t = EYE_OPENS + 0.02 * pl.unit();
        let len = 0.5 + 0.8 * pl.unit();
        let th = i as f32 / 14.0 * tau + (pl.unit() - 0.5) * 0.35;
        let opening = 0.006 + 0.006 * pl.unit();
        pl.moon_crack(
            t,
            th,
            Growth {
                len,
                v0: 2.6,
                flicker: 0.0,
                jitter: 0.2,
                width: 1.3,
                opening,
            },
        );
    }
    for _ in 0..10 {
        let t = EYE_OPENS + 0.35 + 0.5 * pl.unit();
        let len = 0.15 + 0.35 * pl.unit();
        pl.branch(t, len, 1.4, 0.0, 0.003);
    }

    // Segments, in chunks with a bounding cap.
    let mut segments = Vec::new();
    let mut chunks = Vec::new();
    for crack in &pl.cracks {
        if crack.stages.is_empty() {
            continue;
        }
        let last = crack.last();
        let born = crack.stages[0].t0;
        let mut c = 0;
        while c < last {
            let n = CHUNK.min(last - c);
            if segments.len() + n > MAX_SEGMENTS || chunks.len() >= MAX_CHUNKS {
                break;
            }
            let pts = &crack.points[c..=c + n];
            let center = norm(pts.iter().fold([0.0; 3], |acc, p| add(acc, *p)));
            let reach = pts
                .iter()
                .map(|p| dot(center, *p).clamp(-1.0, 1.0).acos())
                .fold(0.0, f32::max);
            chunks.push(Chunk {
                center,
                cos_reach: (reach + GLOW_REACH + crack.opening * 1.3).cos(),
                first: segments.len() as u32,
                count: n as u32,
                starts: crack.time_at(c),
                width: crack.width,
            });
            for i in c..c + n {
                segments.push(Segment {
                    a: crack.points[i],
                    ta: crack.time_at(i),
                    b: crack.points[i + 1],
                    tb: crack.time_at(i + 1),
                    along: [i as f32 / last as f32, (i + 1) as f32 / last as f32],
                    born,
                    opening: crack.opening,
                });
            }
            c += n;
        }
    }
    let mut events = pl.events;
    events.sort_by(|a, b| a.0.total_cmp(&b.0));
    Plan {
        segments,
        chunks,
        events,
    }
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
    if l > 0.0 && l.is_finite() {
        scale(a, 1.0 / l)
    } else {
        [0.0, 1.0, 0.0]
    }
}
