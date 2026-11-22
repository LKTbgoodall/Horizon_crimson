//! The sky pass's uniform block, packed from the rules: what the shader of
//! `sky_pass.rs` reads each frame. The game's hook and the offscreen preview
//! (`tools/sky-preview`) both call [`uniforms`], so the preview shows what the
//! game draws.

use crate::beam::Beam;
use crate::eye::Eye;
use crate::night::{eclipse_seconds, presence};
use crate::rise::frame;
use crate::shell::{seal, Plan};
use crate::sky::{colors, lid, moon_direction, MOON_RADIUS};

/// Floats in the uniform block: a 4 × 4 matrix and fourteen `vec4`s.
pub const UNIFORM_FLOATS: usize = 72;

/// What the pass knows of the frame it draws on.
#[derive(Clone, Copy, Debug)]
pub struct View {
    /// The inverse of the camera's view-projection, column-major (depth reversed: 1 is near).
    pub inverse: [f32; 16],
    /// The colour target's size in pixels.
    pub size: [u32; 2],
    /// The depth texture's size in pixels.
    pub depth_size: [u32; 2],
    /// The camera's height in the world.
    pub camera_y: f32,
    /// Whether the frame could be copied (the pass then draws from the copy).
    pub can_copy: bool,
    /// Whether the target is an sRGB format.
    pub srgb: bool,
}

/// The moon's beam onto a crown: where it lands, relative to the camera, and its shape.
#[derive(Clone, Copy, Debug)]
pub struct Landed {
    pub rel: [f32; 3],
    pub beam: Beam,
}

/// The uniform block for the instant `day_time` + `partial` ticks.
pub fn uniforms(
    day_time: i64,
    partial: f32,
    view: &View,
    eye: &Eye,
    shell: &Plan,
    landed: Option<Landed>,
) -> [f32; UNIFORM_FLOATS] {
    let tod = crate::moon::time_of_day(day_time);
    let seconds = eclipse_seconds(day_time, partial);
    let frame = frame(seconds);
    let presence = presence(tod);
    let colors = colors(&frame, presence);
    let moon = moon_direction(tod as f32 + partial);
    let (open, lines) = seal(seconds);
    let size = view.size.map(|n| n as f32);
    let depth = view.depth_size.map(|n| n as f32);
    let flag = |b: bool| if b { 1.0 } else { 0.0 };
    let (beam_a, beam_b) = match landed {
        Some(l) => (
            [l.rel[0], l.rel[1], l.rel[2], l.beam.width],
            [l.beam.lower, l.beam.strength, 0.0, 0.0],
        ),
        None => ([0.0; 4], [0.0; 4]),
    };
    let rows: [[f32; 4]; 14] = [
        [moon[0], moon[1], moon[2], MOON_RADIUS * frame.moon_scale],
        [size[0], size[1], depth[0], depth[1]],
        // The preview's clock started 14 seconds before the eclipse.
        [seconds + 14.0, frame.progress, frame.beat, view.camera_y],
        [frame.void_radius, 0.0, 0.0, frame.corona],
        [
            frame.blood,
            frame.stars_pull,
            frame.grade * presence,
            colors.weight,
        ],
        [
            1.0 - (1.0 - frame.dark) * presence,
            frame.flash,
            frame.shock_radius,
            frame.shock_strength,
        ],
        [
            frame.seam,
            lid(&frame, seconds, presence),
            eye.pupil,
            flag(view.can_copy),
        ],
        [eye.gaze[0], eye.gaze[1], colors.moon, flag(view.srgb)],
        [colors.horizon[0], colors.horizon[1], colors.horizon[2], 0.0],
        [colors.zenith[0], colors.zenith[1], colors.zenith[2], 0.0],
        [frame.fog_rgb[0], frame.fog_rgb[1], frame.fog_rgb[2], 0.0],
        // At dawn the slabs come back one by one, then the cracks fade.
        [shell.flash(seconds), 0.0, presence * lines, open],
        beam_a,
        beam_b,
    ];
    let mut u = [0.0; UNIFORM_FLOATS];
    u[..16].copy_from_slice(&view.inverse);
    for (i, row) in rows.iter().enumerate() {
        u[16 + 4 * i..20 + 4 * i].copy_from_slice(row);
    }
    u
}

/// The camera's forward direction, from the inverse of its view-projection
/// (column-major): the ray through the middle of the screen. Depth is
/// reversed: 1 is the near plane.
pub fn forward(inverse: &[f32; 16]) -> [f32; 3] {
    let at = |z: f32| {
        let p: [f32; 4] = std::array::from_fn(|row| inverse[8 + row] * z + inverse[12 + row]);
        [p[0] / p[3], p[1] / p[3], p[2] / p[3]]
    };
    let (near, far) = (at(1.0), at(0.5));
    let d = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
    let len = (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt();
    if len.is_finite() && len > 0.0 {
        [d[0] / len, d[1] / len, d[2] / len]
    } else {
        [0.0, 0.0, 1.0]
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::night::ECLIPSE_START;
    use crate::shell::{plan, seed_for_day};

    const IDENTITY: [f32; 16] = [
        1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0,
    ];

    fn view() -> View {
        View {
            inverse: IDENTITY,
            size: [640, 360],
            depth_size: [640, 360],
            camera_y: 70.0,
            can_copy: true,
            srgb: false,
        }
    }

    #[test]
    fn the_block_is_laid_out_as_the_shader_reads_it() {
        let shell = plan(seed_for_day(0));
        let u = uniforms(
            ECLIPSE_START + 200,
            0.0,
            &view(),
            &Eye::default(),
            &shell,
            None,
        );
        assert_eq!(&u[..16], &IDENTITY);
        assert_eq!(&u[20..24], &[640.0, 360.0, 640.0, 360.0]);
        // 200 ticks after the eclipse began is 10 s, the preview's 24 s.
        assert!((u[24] - 24.0).abs() < 1e-4);
        assert_eq!(u[27], 70.0);
        assert_eq!(u[43], 1.0, "can_copy");
        assert_eq!(&u[64..], &[0.0; 8], "no beam");
    }

    #[test]
    fn a_beam_lands_in_the_last_two_rows() {
        let shell = plan(seed_for_day(0));
        let landed = Landed {
            rel: [1.0, 2.0, 3.0],
            beam: Beam {
                lower: 4.0,
                width: 5.0,
                strength: 0.5,
            },
        };
        let u = uniforms(
            ECLIPSE_START,
            0.0,
            &view(),
            &Eye::default(),
            &shell,
            Some(landed),
        );
        assert_eq!(&u[64..], &[1.0, 2.0, 3.0, 5.0, 4.0, 0.5, 0.0, 0.0]);
    }

    #[test]
    fn forward_follows_reversed_depth() {
        // Identity: near is z = 1, far z = 0.5, so the camera looks down -z.
        assert_eq!(forward(&IDENTITY), [0.0, 0.0, -1.0]);
    }
}
