//! The sky pass (`RenderHooks::world_drawn`): one full-screen draw right after
//! the world. Where the world's depth says "sky" it paints the blood moon's
//! sky (the swelling moon and its spiral void, the corona, the spiral aurora,
//! the eye) and, since ADR-016, C1's break: real fissures fixed in the sky
//! that open onto the Pale Realm (its black sun, shards, the Spire, a black
//! shadow walking, far serpents). On the land it grades the picture red.
//! Darkness and the flash cover both.
//!
//! The numbers are `crate::rise`'s, `crate::sky`'s and `crate::fissures`'s;
//! this file uploads them and draws. The shader is `preview/blood-moon-rise.html`'s
//! version C plus `preview/abyss-climax.html`'s C1 (W2, S1), in WGSL.

use crate::eye::Eye;
use crate::fissures::{seed_for_day, CHUNK_FLOATS, MAX_CHUNKS, MAX_SEGMENTS, SEGMENT_FLOATS};
use crate::moon::{day_of, time_of_day};
use crate::night::{eclipse_seconds, presence};
use crate::rise::frame;
use crate::server::{Shared, TARGET};
use crate::sky::{colors, lid, look, moon_direction, since_open, MOON_RADIUS};
use horizon_client::mod_api::{wgpu, RenderHooks, RenderNeedsEvent, WorldDrawnEvent};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Instant;

/// Floats in the uniform block: a 4 × 4 matrix and twelve `vec4`s.
const UNIFORM_FLOATS: usize = 64;

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// The render side of the mod.
pub struct Sky {
    shared: Arc<Shared>,
    gpu: Mutex<Option<Gpu>>,
    /// The eye, and when it was last moved.
    eye: Mutex<(Eye, Option<Instant>)>,
    told: AtomicBool,
}

impl Sky {
    pub fn new(shared: Arc<Shared>) -> Self {
        Self {
            shared,
            gpu: Mutex::new(None),
            eye: Mutex::new((Eye::default(), None)),
            told: AtomicBool::new(false),
        }
    }
}

struct Gpu {
    format: wgpu::TextureFormat,
    /// Draws from a copy of the frame: the land is graded, the sky replaced.
    from_copy: wgpu::RenderPipeline,
    /// For a frame that can't be copied: blended over it.
    blended: wgpu::RenderPipeline,
    layout: wgpu::BindGroupLayout,
    uniform: wgpu::Buffer,
    /// Bound in place of the frame's copy when there is none.
    blank: wgpu::TextureView,
    /// The frame's copy, its size and its view.
    copy: Option<(wgpu::Texture, [u32; 2], wgpu::TextureView)>,
    /// The fissures' segments and chunks (`crate::fissures`), and the seed of the plan they hold.
    segments: wgpu::Buffer,
    chunks: wgpu::Buffer,
    uploaded: Option<u64>,
}

impl RenderHooks for Sky {
    fn render_needs(&self, event: &mut RenderNeedsEvent<'_>) {
        // The sky is where the world's depth is 0.
        if self.shared.client_clock().is_some() {
            event.needs.world_depth = true;
        }
    }

    fn world_drawn(&self, event: &mut WorldDrawnEvent<'_, '_>) {
        let Some((day_time, partial)) = self.shared.client_clock() else {
            return;
        };
        let w = &mut *event.world;
        if w.color.sample_count() != 1 || w.size[0] == 0 || w.size[1] == 0 {
            return;
        }
        let tod = time_of_day(day_time);
        let seconds = eclipse_seconds(day_time, partial);
        let frame = frame(seconds);
        let presence = presence(tod);
        let colors = colors(&frame, presence);
        let moon = moon_direction(tod as f32 + partial);
        // Tonight's fissures, planned once per night (shared with the sounds and the shake).
        let seed = seed_for_day(day_of(day_time));
        let fissures = Some(self.shared.fissures(day_time));

        // The camera: where it looks, for the eye.
        let inverse = w.view_proj.inverse().to_cols_array();
        let forward = forward(&inverse);
        let eye = {
            let mut guard = lock(&self.eye);
            let now = Instant::now();
            let dt = guard.1.map_or(0.0, |last| now.duration_since(last).as_secs_f32());
            guard.1 = Some(now);
            guard.0.update(dt, since_open(seconds), look(forward, moon), frame.beat);
            guard.0
        };

        let mut guard = lock(&self.gpu);
        if guard.as_ref().is_none_or(|g| g.format != w.color_format) {
            *guard = Some(Gpu::new(w.device, w.color_format));
        }
        let Some(gpu) = guard.as_mut() else {
            return;
        };
        let can_copy = w.color.usage().contains(wgpu::TextureUsages::COPY_SRC);
        if !self.told.swap(true, Ordering::Relaxed) {
            log::info!(
                target: TARGET,
                "crimson_eclipse: sky pass on {:?} ({:?} texture), {}x{}, depth {}x{}, frame copy: {can_copy}",
                w.color_format,
                w.color.format(),
                w.size[0],
                w.size[1],
                w.depth_size[0],
                w.depth_size[1]
            );
        }
        if can_copy {
            gpu.ensure_copy(w.device, w.color, w.size, w.color_format);
        }
        let chunk_count = fissures.as_ref().map_or(0, |p| p.chunks.len());
        if let Some(p) = &fissures {
            if gpu.uploaded != Some(seed) {
                let bytes = |f: Vec<f32>| -> Vec<u8> { f.iter().flat_map(|x| x.to_le_bytes()).collect() };
                w.queue.write_buffer(&gpu.segments, 0, &bytes(p.segment_floats()));
                w.queue.write_buffer(&gpu.chunks, 0, &bytes(p.chunk_floats()));
                gpu.uploaded = Some(seed);
            }
        }
        let crack_flash = fissures.as_ref().map_or(0.0, |p| p.flash(seconds));

        let mut u = Vec::with_capacity(UNIFORM_FLOATS);
        u.extend_from_slice(&inverse);
        u.extend_from_slice(&[moon[0], moon[1], moon[2], MOON_RADIUS * frame.moon_scale]);
        u.extend_from_slice(&[
            w.size[0] as f32,
            w.size[1] as f32,
            w.depth_size[0] as f32,
            w.depth_size[1] as f32,
        ]);
        // The preview's clock started 14 seconds before the eclipse.
        u.extend_from_slice(&[seconds + 14.0, frame.progress, frame.beat, w.camera.y as f32]);
        u.extend_from_slice(&[frame.void_radius, frame.crack_reach, frame.torn, frame.corona]);
        u.extend_from_slice(&[frame.blood, frame.stars_pull, frame.grade * presence, colors.weight]);
        u.extend_from_slice(&[
            1.0 - (1.0 - frame.dark) * presence,
            frame.flash,
            frame.shock_radius,
            frame.shock_strength,
        ]);
        u.extend_from_slice(&[
            frame.seam,
            lid(&frame, seconds, presence),
            eye.pupil,
            if can_copy { 1.0 } else { 0.0 },
        ]);
        u.extend_from_slice(&[
            eye.gaze[0],
            eye.gaze[1],
            colors.moon,
            if w.color_format.is_srgb() { 1.0 } else { 0.0 },
        ]);
        u.extend_from_slice(&[colors.horizon[0], colors.horizon[1], colors.horizon[2], 0.0]);
        u.extend_from_slice(&[colors.zenith[0], colors.zenith[1], colors.zenith[2], 0.0]);
        u.extend_from_slice(&[frame.fog_rgb[0], frame.fog_rgb[1], frame.fog_rgb[2], 0.0]);
        u.extend_from_slice(&[crack_flash, chunk_count as f32, presence, 0.0]);
        debug_assert_eq!(u.len(), UNIFORM_FLOATS);
        let bytes: Vec<u8> = u.iter().flat_map(|f| f.to_le_bytes()).collect();
        w.queue.write_buffer(&gpu.uniform, 0, &bytes);

        let scene = match (&gpu.copy, can_copy) {
            (Some((texture, size, view)), true) => {
                let whole = |texture| wgpu::TexelCopyTextureInfo {
                    texture,
                    mip_level: 0,
                    origin: wgpu::Origin3d::ZERO,
                    aspect: wgpu::TextureAspect::All,
                };
                w.encoder.copy_texture_to_texture(
                    whole(w.color),
                    whole(texture),
                    wgpu::Extent3d {
                        width: size[0],
                        height: size[1],
                        depth_or_array_layers: 1,
                    },
                );
                view
            }
            _ => &gpu.blank,
        };
        let group = w.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Crimson Eclipse sky"),
            layout: &gpu.layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: gpu.uniform.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(w.depth),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::TextureView(scene),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: gpu.segments.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: gpu.chunks.as_entire_binding(),
                },
            ],
        });
        let attachments = [Some(wgpu::RenderPassColorAttachment {
            view: w.color_view,
            resolve_target: None,
            depth_slice: None,
            ops: wgpu::Operations {
                load: wgpu::LoadOp::Load,
                store: wgpu::StoreOp::Store,
            },
        })];
        let mut pass = w.encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("Crimson Eclipse sky"),
            color_attachments: &attachments,
            ..Default::default()
        });
        pass.set_pipeline(if can_copy { &gpu.from_copy } else { &gpu.blended });
        pass.set_bind_group(0, &group, &[]);
        pass.draw(0..3, 0..1);
    }
}

/// The camera's forward direction, from the inverse of its view-projection
/// (column-major): the ray through the middle of the screen. Depth is
/// reversed: 1 is the near plane.
fn forward(inverse: &[f32; 16]) -> [f32; 3] {
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

/// A read-only storage buffer seen by the fragment stage.
fn storage_entry(binding: u32) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::FRAGMENT,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Storage { read_only: true },
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }
}

impl Gpu {
    fn new(device: &wgpu::Device, format: wgpu::TextureFormat) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Crimson Eclipse sky"),
            source: wgpu::ShaderSource::Wgsl(SHADER.into()),
        });
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Crimson Eclipse sky bindings"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Depth,
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                storage_entry(3),
                storage_entry(4),
            ],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Crimson Eclipse sky"),
            bind_group_layouts: &[Some(&layout)],
            ..Default::default()
        });
        let pipeline = |entry: &str, blend: Option<wgpu::BlendState>| {
            device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some(entry),
                layout: Some(&pipeline_layout),
                vertex: wgpu::VertexState {
                    module: &shader,
                    entry_point: Some("vs"),
                    compilation_options: Default::default(),
                    buffers: &[],
                },
                primitive: Default::default(),
                depth_stencil: None,
                multisample: Default::default(),
                fragment: Some(wgpu::FragmentState {
                    module: &shader,
                    entry_point: Some(entry),
                    compilation_options: Default::default(),
                    targets: &[Some(wgpu::ColorTargetState {
                        format,
                        blend,
                        write_mask: wgpu::ColorWrites::COLOR,
                    })],
                }),
                multiview_mask: None,
                cache: None,
            })
        };
        let uniform = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Crimson Eclipse sky uniforms"),
            size: (UNIFORM_FLOATS * 4) as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let storage = |label: &str, floats: usize| {
            device.create_buffer(&wgpu::BufferDescriptor {
                label: Some(label),
                size: (floats * 4) as u64,
                usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
                mapped_at_creation: false,
            })
        };
        let segments = storage("Crimson Eclipse fissure segments", MAX_SEGMENTS * SEGMENT_FLOATS);
        let chunks = storage("Crimson Eclipse fissure chunks", MAX_CHUNKS * CHUNK_FLOATS);
        let blank = device
            .create_texture(&wgpu::TextureDescriptor {
                label: Some("Crimson Eclipse blank"),
                size: wgpu::Extent3d {
                    width: 1,
                    height: 1,
                    depth_or_array_layers: 1,
                },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: wgpu::TextureFormat::Rgba8Unorm,
                usage: wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            })
            .create_view(&Default::default());
        Self {
            format,
            from_copy: pipeline("fs_copy", None),
            blended: pipeline("fs_blend", Some(wgpu::BlendState::ALPHA_BLENDING)),
            layout,
            uniform,
            blank,
            copy: None,
            segments,
            chunks,
            uploaded: None,
        }
    }

    /// A texture to copy the frame into, of the frame's own format and size,
    /// read through the same format the frame is drawn in.
    fn ensure_copy(&mut self, device: &wgpu::Device, color: &wgpu::Texture, size: [u32; 2], view_format: wgpu::TextureFormat) {
        if self.copy.as_ref().is_some_and(|(t, s, _)| *s == size && t.format() == color.format()) {
            return;
        }
        let view_formats: &[wgpu::TextureFormat] = if view_format == color.format() { &[] } else { &[view_format] };
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Crimson Eclipse frame copy"),
            size: wgpu::Extent3d {
                width: size[0],
                height: size[1],
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: color.format(),
            usage: wgpu::TextureUsages::COPY_DST | wgpu::TextureUsages::TEXTURE_BINDING,
            view_formats,
        });
        let view = texture.create_view(&wgpu::TextureViewDescriptor {
            format: Some(view_format),
            ..Default::default()
        });
        self.copy = Some((texture, size, view));
    }
}

/// The sky, in WGSL. `tools/check-shader.sh` validates it with Horizon's naga.
pub const SHADER: &str = r#"
struct U {
    inv: mat4x4<f32>,   // clip space to camera-relative world
    moon: vec4<f32>,    // xyz: direction of the moon, w: its radius in radians
    size: vec4<f32>,    // the frame's width and height, the depth's width and height
    a: vec4<f32>,       // time in seconds, eclipse progress, heartbeat pulse, the camera's height
    b: vec4<f32>,       // void radius, (unused: the old web's reach and torn share), corona
    c: vec4<f32>,       // blood, stars pull, world grade, sky weight
    d: vec4<f32>,       // dark, flash, shock radius, shock strength
    e: vec4<f32>,       // lid seam, lid opening, pupil width, 1 with a frame copy
    f: vec4<f32>,       // gaze x and y, moon weight, 1 when the target is sRGB
    hor: vec4<f32>,
    zen: vec4<f32>,
    fog: vec4<f32>,     // the colour the land's fog goes to
    g: vec4<f32>,       // the flicker of new cracks, the fissures' chunk count, presence
};
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var depth_tex: texture_depth_2d;
@group(0) @binding(2) var scene_tex: texture_2d<f32>;
// The fissures (crate::fissures): per segment three vec4 (a, ta), (b, tb), (along at a, along at b, born, opening);
// per chunk two vec4 (cap centre, cos of its reach), (first segment, count, start time, width).
@group(0) @binding(3) var<storage, read> fis_seg: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read> fis_chk: array<vec4<f32>>;

struct V {
    @builtin(position) pos: vec4<f32>,
    @location(0) ray: vec3<f32>,
    @location(1) uv: vec2<f32>,
};

@vertex
fn vs(@builtin(vertex_index) i: u32) -> V {
    let p = vec2<f32>(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0;
    // Reversed depth: 1 is the near plane, smaller is farther.
    let near = u.inv * vec4<f32>(p, 1.0, 1.0);
    let far = u.inv * vec4<f32>(p, 0.5, 1.0);
    var o: V;
    o.pos = vec4<f32>(p, 0.0, 1.0);
    o.ray = far.xyz / far.w - near.xyz / near.w;
    o.uv = vec2<f32>(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
    return o;
}

// smoothstep that also takes its edges the other way round.
fn ss(a: f32, b: f32, x: f32) -> f32 {
    let t = clamp((x - a) / (b - a), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
}
// Hashes work on whole cells, as integers. Float hashes, and even float cell
// coordinates, gave different values at two places of the shader on the GPU,
// which filled Voronoi cells with white or amber shapes.
fn hashu(x: u32) -> u32 {
    let s = x * 747796405u + 2891336453u;
    let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
    return (w >> 22u) ^ w;
}
fn hi(c: vec2<i32>) -> f32 {
    let b = bitcast<vec2<u32>>(c);
    return f32(hashu(b.x ^ hashu(b.y + 0x9e3779b9u)) >> 8u) / 16777216.0;
}
fn hi2(c: vec2<i32>) -> vec2<f32> {
    return vec2<f32>(hi(c), hi(c + vec2<i32>(57, 113)));
}
// For a cell given as floats: rounded, so a value a hair under 31 is still cell 31.
fn h21(p: vec2<f32>) -> f32 { return hi(vec2<i32>(floor(p + 0.5))); }
fn h22(p: vec2<f32>) -> vec2<f32> { return hi2(vec2<i32>(floor(p + 0.5))); }
fn h11(n: f32) -> f32 { return h21(vec2<f32>(n, 0.0)); }
fn vnoise(p: vec2<f32>) -> f32 {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2<f32>(1.0, 0.0)), f.x),
               mix(h21(i + vec2<f32>(0.0, 1.0)), h21(i + vec2<f32>(1.0, 1.0)), f.x), f.y);
}
fn fbm(p0: vec2<f32>) -> f32 {
    var p = p0;
    var a = 0.5;
    var s = 0.0;
    for (var i = 0; i < 5; i++) {
        s += a * vnoise(p);
        p = p * 2.03 + vec2<f32>(17.3, 9.1);
        a *= 0.5;
    }
    return s;
}
// Noise around a circle, with no seam.
fn pn(a: f32, x: f32, f: f32) -> f32 {
    return fbm(vec2<f32>(cos(a), sin(a)) * f + vec2<f32>(x, -x * 0.7));
}
fn rot(a: f32) -> mat2x2<f32> {
    let c = cos(a);
    let s = sin(a);
    return mat2x2<f32>(c, -s, s, c);
}
// One pass over the 5 x 5 cells around p. x: about the distance to the nearest
// cell edge (half the gap between the two nearest points), y: the cell's
// hash, z: the distance to its point. Nothing is computed twice, so nothing
// can disagree with itself.
fn voro(p: vec2<f32>) -> vec3<f32> {
    let n = vec2<i32>(floor(p));
    let f = p - vec2<f32>(n);
    var d1 = 64.0;
    var d2 = 64.0;
    var cell = n;
    for (var j = -2; j <= 2; j++) {
        for (var i = -2; i <= 2; i++) {
            let c = n + vec2<i32>(i, j);
            let r = vec2<f32>(f32(i), f32(j)) + hi2(c) - f;
            let d = dot(r, r);
            if (d < d1) {
                d2 = d1;
                d1 = d;
                cell = c;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }
    return vec3<f32>(0.5 * (sqrt(d2) - sqrt(d1)), hi(cell), sqrt(d1));
}

// The spiral aurora around the moon. rgb: its light, a: how much sky it hides.
fn aurora(ang: f32, a: f32) -> vec4<f32> {
    let k = ss(0.08, 0.5, u.a.y);
    if (k <= 0.0) { return vec4<f32>(0.0); }
    let t = u.a.x;
    let sp = a * 2.0 - log(ang + 0.02) * 3.5 + t * 0.25;
    let ray = 0.4 + 0.6 * vnoise(vec2<f32>(cos(a), sin(a)) * 4.5 + vec2<f32>(t * 0.2, ang * 5.0));
    let i = ss(0.35, 1.0, sin(sp)) * ray * exp(-ang * 1.1) * ss(0.0, 0.25, ang) * 1.3;
    let b = ss(0.3, 1.0, sin(sp + 2.6)) * exp(-ang * 0.8);
    let c = mix(vec3<f32>(0.75, 0.02, 0.05), vec3<f32>(1.0, 0.28, 0.12), clamp(i * 0.6, 0.0, 1.0)) * i;
    return vec4<f32>(c * k, clamp(b * k, 0.0, 0.92));
}

// Stars: small points of one size everywhere. Near the moon they sit on rings
// that flow inward and they stretch a little toward it; far from it they are
// a plain field. All of them go out as the eclipse advances.
fn stars(d: vec3<f32>, ang: f32, a: f32) -> f32 {
    let pull = u.c.y;
    let twinkle_t = u.a.x * 3.0;
    var near = 0.0;
    if (ang < 1.0) {
        let g = vec2<f32>(a / 6.2832 * 88.0, log(ang + 0.03) * 9.0 + pull * pull * 5.0);
        let id = floor(g);
        let h = h21(id);
        if (h >= 0.86) {
            let s = fract(g) - 0.5 - (h22(id + 3.0) - 0.5) * 0.6;
            // From cell units to radians: a cell is ang * 2 pi / 88 wide and (ang + 0.03) / 9 deep.
            let m = vec2<f32>(s.x * ang * 0.0714, s.y * (ang + 0.03) / 9.0);
            let stretch = 1.0 + pull * 3.0 * exp(-ang * 1.5);
            near = ss(0.004, 0.0, length(vec2<f32>(m.x, m.y / stretch)))
                * (0.7 + 0.3 * sin(twinkle_t + h * 90.0)) * step(pull * 1.12, h21(id + 7.0)) * (0.5 + 0.5 * h21(id + 1.0));
        }
    }
    var far = 0.0;
    if (ang > 0.5) {
        let el = asin(clamp(d.y, -1.0, 1.0));
        let g = vec2<f32>(atan2(d.z, d.x), el) * 46.0;
        let id = floor(g);
        let h = h21(id + 31.0);
        if (h >= 0.8) {
            let s = fract(g) - 0.5 - (h22(id + 13.0) - 0.5) * 0.6;
            let m = vec2<f32>(s.x * cos(el), s.y) / 46.0;
            far = ss(0.0035, 0.0, length(m))
                * (0.7 + 0.3 * sin(twinkle_t + h * 90.0)) * step(pull * 1.12, h21(id + 17.0)) * (0.4 + 0.6 * h21(id + 11.0));
        }
    }
    return mix(near, far, ss(0.5, 1.0, ang));
}

// The fissures at `d`, `s` seconds into the eclipse. The tip of each crack runs along its segments; then its
// lips part into a lens (widest mid-crack), a little through the eclipse, wide at the climax. The whole crack is
// one shape (the union of its segments), so its rim is clean. Only the chunks whose cap holds `d` are tested.
struct Fis { core: f32, glow: f32, heat: f32, tip: f32, win: f32, lip: f32 };
// Broken, not melted: the lips' width jumps from one random value to the next in straight lines (no
// smoothing), so the edges are facets with corners, like broken glass.
fn jag(x: f32, sd: f32) -> f32 {
    let k = x * 22.0;
    let i = floor(k);
    let row = i32(sd * 13.0);
    return 0.45 + 1.1 * mix(hi(vec2<i32>(i32(i), row)), hi(vec2<i32>(i32(i) + 1, row)), k - i);
}
fn fissures(d: vec3<f32>, s: f32) -> Fis {
    let tc = s - 60.5;
    var tip = 0.0;
    var emin = 1.0;
    var hmin = 0.0;
    var wmin = 1.0;
    let n = u32(u.g.y);
    for (var c = 0u; c < n; c++) {
        let k1 = fis_chk[c * 2u + 1u];
        if (s < k1.z) { continue; }
        let k0 = fis_chk[c * 2u];
        if (dot(d, k0.xyz) < k0.w) { continue; }
        let first = u32(k1.x);
        let count = u32(k1.y);
        for (var i = 0u; i < count; i++) {
            let si = (first + i) * 3u;
            let pa = fis_seg[si];
            if (s < pa.w) { break; }
            let pb = fis_seg[si + 1u];
            let pc = fis_seg[si + 2u];
            let f = clamp((s - pa.w) / max(pb.w - pa.w, 0.0001), 0.0, 1.0);
            let b = mix(pa.xyz, pb.xyz, f);
            let ab = b - pa.xyz;
            let h = clamp(dot(d - pa.xyz, ab) / max(dot(ab, ab), 1e-10), 0.0, 1.0);
            let dist = length(d - pa.xyz - ab * h);
            let age = s - mix(pa.w, pb.w, h * f);
            let sf = mix(pc.x, pc.y, h * f);
            let op = pc.w * (0.22 * ss(pc.z, pc.z + 18.0, s) + 0.78 * ss(0.0, 1.4, tc))
                * pow(max(sin(3.14159 * sf), 0.0), 0.7) * jag(sf, pc.z) * ss(0.0, 0.4, age);
            let e = dist - op;
            if (e < emin) {
                emin = e;
                hmin = exp(-age * 0.9);
                wmin = k1.w;
            }
            if (f < 1.0) { tip = max(tip, exp(-length(d - b) * 300.0)); }
        }
    }
    let w = wmin * 0.0013;
    var o: Fis;
    o.core = ss(w, w * 0.3, abs(emin));
    o.glow = exp(-max(emin, 0.0) / 0.0022) * min(wmin, 1.3);
    o.heat = ss(w * 2.2, 0.0, abs(emin)) * hmin;
    o.tip = tip;
    o.win = ss(0.0008, -0.0008, emin);
    o.lip = ss(0.006, 0.0, -emin) * step(emin, 0.0);
    return o;
}

fn sd_box(p: vec2<f32>, b: vec2<f32>) -> f32 {
    let d = abs(p) - b;
    return length(max(d, vec2<f32>(0.0))) + min(max(d.x, d.y), 0.0);
}
fn sd_seg(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}
fn smin(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
fn hk(k: i32) -> f32 { return hi(vec2<i32>(k, 0)); }

// The Pale Realm, the world behind the sky (ADR-016). World-fixed: x is the azimuth (the moon rises at 0), y the
// elevation. Its own fog, far below, hides any ground.
const PALE_FOG = vec3<f32>(0.8, 0.78, 0.74);
const PALE_H0 = 0.24;

// The Spire, its main structure, in local units at its distance; `glow` gets the pale light at its tip.
fn spire(lp: vec2<f32>, glow: ptr<function, f32>) -> f32 {
    let t = u.a.x;
    let hgt = 120.0;
    let y = clamp(lp.y, 0.0, hgt);
    let k = 1.0 - y / hgt;
    let w = 1.6 + 15.0 * pow(k, 1.3) + 3.5 * step(fract(y / 14.0), 0.18) * k;
    var d = max(abs(lp.x) - w, max(-lp.y, lp.y - hgt));
    for (var i = 0; i < 6; i++) {
        let yy = 18.0 + f32(i) * 16.0;
        let kk = 1.0 - yy / hgt;
        let sd = select(-1.0, 1.0, i % 2 == 1);
        d = min(d, sd_seg(lp, vec2<f32>((1.6 + 15.0 * pow(kk, 1.3)) * sd, yy), vec2<f32>((8.0 + 20.0 * kk) * sd, yy + 7.0 + 5.0 * kk)) - 1.2 * kk - 0.4);
    }
    for (var i = 0; i < 2; i++) {
        let ry = 74.0 + f32(i) * 22.0;
        let rr = 30.0 - f32(i) * 9.0;
        let q = vec2<f32>(lp.x, (lp.y - ry) * 3.2);
        let ang = atan2(q.y, q.x) + t * 0.05 * select(-1.3, 1.0, i == 0);
        let ring = max(abs(length(q) - rr) - 0.9, -(0.15 - abs(fract(ang * 2.5 / 6.2832) - 0.5)));
        d = min(d, ring);
    }
    *glow = exp(-length(lp - vec2<f32>(0.0, hgt + 2.0)) * 0.25) * (0.7 + 0.3 * sin(t * 1.7));
    return d;
}

fn pale(uv: vec2<f32>) -> vec3<f32> {
    let t = u.a.x;
    var c = mix(vec3<f32>(0.85, 0.83, 0.79), vec3<f32>(0.6, 0.6, 0.64), ss(PALE_H0, 1.1, uv.y));
    // The black sun, its thin bright ring and fine rays.
    let sp = uv - vec2<f32>(-0.42, 0.7);
    let sr = length(sp);
    let sa = atan2(sp.y, sp.x);
    c += vec3<f32>(1.0) * exp(-sr * 4.0) * 0.1;
    c += vec3<f32>(1.0) * pow(max(0.0, sin(sa * 14.0 + 3.0 * fbm(vec2<f32>(sa * 3.0, t * 0.1)))), 20.0) * exp(-sr * 5.0) * 0.3 * step(0.088, sr);
    c = mix(c, vec3<f32>(0.01), ss(0.088, 0.084, sr));
    c += vec3<f32>(1.0) * exp(-abs(sr - 0.087) * 220.0) * 0.8;
    c = mix(c, PALE_FOG * 1.02, ss(0.45, 0.75, fbm(uv * vec2<f32>(2.0, 6.0) + vec2<f32>(t * 0.02, 0.0))) * 0.35);
    // Floating black shards.
    for (var k = 0; k < 6; k++) {
        let fk = f32(k);
        let ctr = vec2<f32>(-1.2 + 0.5 * fk + 0.08 * sin(t * 0.1 + fk), 0.5 + 0.3 * hk(k) + 0.03 * sin(t * 0.3 + fk * 2.0));
        let q = rot(t * 0.08 * (hk(k + 3) - 0.5) + fk) * (uv - ctr);
        let sz = 0.02 + 0.03 * hk(k + 7);
        let sd = abs(q.x) / (sz * 0.55) + abs(q.y) / (sz * 1.6);
        c = mix(c, mix(vec3<f32>(0.03), PALE_FOG, 0.1 + 0.35 * hk(k + 11)), ss(1.02, 0.98, sd));
        c += vec3<f32>(1.0) * exp(-abs(sd - 1.0) * 30.0) * 0.12;
    }
    // The Spire, far off on the left, its base lost in the fog.
    {
        let dist = 160.0;
        let lp = vec2<f32>(uv.x * dist + 0.62 * dist, (uv.y - (PALE_H0 - 0.26)) * dist);
        var glow = 0.0;
        let sd = spire(lp, &glow);
        let rise = ss(PALE_H0 - 0.14, PALE_H0 + 0.12, uv.y);
        let hz = 0.26 - 0.1 * ss(PALE_H0, PALE_H0 + 0.5, uv.y);
        c += vec3<f32>(0.95, 0.95, 1.0) * glow * rise * 0.9;
        c = mix(c, mix(vec3<f32>(0.025, 0.022, 0.03), PALE_FOG, hz), ss(0.7, -0.7, sd) * rise);
    }
    return mix(c, PALE_FOG * 1.04, ss(PALE_H0 + 0.12, PALE_H0 - 0.25, uv.y));
}

// Things that fly in the Pale Realm's fog all night. Unseen, until a flash lights the fog behind one: then, for
// a second and a half, a black shape. Abstract on purpose: a body, a long neck, a tail, wings beating.
fn sd_tri(p: vec2<f32>, p0: vec2<f32>, p1: vec2<f32>, p2: vec2<f32>) -> f32 {
    let e0 = p1 - p0;
    let e1 = p2 - p1;
    let e2 = p0 - p2;
    let v0 = p - p0;
    let v1 = p - p1;
    let v2 = p - p2;
    let q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
    let q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
    let q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
    let sg = sign(e0.x * e2.y - e0.y * e2.x);
    let dd = min(min(vec2<f32>(dot(q0, q0), sg * (v0.x * e0.y - v0.y * e0.x)), vec2<f32>(dot(q1, q1), sg * (v1.x * e1.y - v1.y * e1.x))),
        vec2<f32>(dot(q2, q2), sg * (v2.x * e2.y - v2.y * e2.x)));
    return -sqrt(dd.x) * sign(dd.y);
}
// Where flying thing `m` is at `t`: it never stops, it wraps around the sky.
fn monster_at(m: i32, t: f32) -> vec2<f32> {
    let fm = f32(m);
    let dir = select(1.0, -1.0, m == 1);
    let range = 3.4;
    let v = t * (0.05 + 0.015 * fm) * dir + fm * 1.3;
    let x = v - range * floor(v / range) - range * 0.5;
    return vec2<f32>(x, 0.42 + 0.14 * fm - select(0.0, 0.1, m == 2) + 0.06 * sin(t * 0.21 + fm * 2.0));
}
// Its silhouette, in local units, heading +x.
fn monster(lp: vec2<f32>, t: f32, sd: f32) -> f32 {
    var d = sd_seg(lp, vec2<f32>(-6.0, 0.0), vec2<f32>(6.0, 0.6)) - 2.4;
    d = smin(d, sd_seg(lp, vec2<f32>(6.0, 0.6), vec2<f32>(12.0, 3.6)) - 1.1, 1.5);
    d = smin(d, length((lp - vec2<f32>(14.2, 4.0)) / vec2<f32>(2.3, 1.1)) - 1.0, 1.0);
    let te = vec2<f32>(-25.0, -1.5 + 3.0 * sin(t * 1.3 + sd));
    d = smin(d, sd_seg(lp, vec2<f32>(-6.0, 0.0), te) - 0.5 - 0.06 * clamp(lp.x + 25.0, 0.0, 19.0), 1.5);
    for (var k = 0; k < 2; k++) {
        let f = sin(t * 2.3 + sd + select(0.5, 0.0, k == 0));
        let sc = select(0.85, 1.0, k == 0);
        let o = vec2<f32>(select(-1.5, 0.0, k == 0), 0.0);
        let sh = vec2<f32>(3.0, 1.5) + o;
        let tip = vec2<f32>(-9.0, 1.5 + 21.0 * f) * sc + o;
        let rear = vec2<f32>(-8.0, 0.5) + o;
        var w = sd_tri(lp, sh, tip, rear);
        let en = normalize(vec2<f32>(tip.y - rear.y, rear.x - tip.x));
        for (var i = 0; i < 3; i++) {
            let cc = mix(rear, tip, (f32(i) + 0.5) / 3.0) - en * 1.6 * sign(f + 0.001);
            w = max(w, -(length(lp - cc) - 2.2));
        }
        d = min(d, w);
    }
    return d;
}
// A flash in the fog, right behind the flying thing nearest the moon: xy where, z how bright.
fn fog_flash() -> vec3<f32> {
    let t = u.a.x;
    let period = 6.5;
    let k = floor(t / period);
    let t0 = k * period + 2.0 * hk(i32(k) + 101);
    let dt = t - t0;
    var m = 0;
    var best = 9.0;
    for (var i = 0; i < 3; i++) {
        let ax = abs(monster_at(i, t0).x);
        if (ax < best) {
            best = ax;
            m = i;
        }
    }
    let at = monster_at(m, t0) + vec2<f32>(0.04, 0.03);
    if (dt < 0.0 || dt > 1.8 || t < 50.0) { return vec3<f32>(at, 0.0); }
    let e = (exp(-dt * 1.5) * (0.8 + 0.2 * sin(dt * 47.0)) + 0.9 * exp(-(dt - 0.22) * (dt - 0.22) * 300.0)) * (1.0 - ss(1.3, 1.8, dt));
    return vec3<f32>(at, e);
}

// What is behind the sky along `d`: the Pale Realm, its fog, the things flying in it (seen only in a flash), ash.
fn other_side(d: vec3<f32>, flash: vec3<f32>) -> vec3<f32> {
    let t = u.a.x;
    let uv = vec2<f32>(atan2(d.z, d.x) * 0.88, asin(clamp(d.y, -1.0, 1.0)));
    var c = pale(uv);
    c = mix(c, PALE_FOG, 0.45 * ss(0.3, 0.8, fbm(uv * vec2<f32>(3.0, 7.0) + vec2<f32>(t * 0.03, t * 0.01))));
    let light = flash.z * exp(-length((uv - flash.xy) * vec2<f32>(1.0, 1.3)) / 0.3);
    c += vec3<f32>(0.95, 0.97, 1.0) * light * 0.9;
    for (var m = 0; m < 3; m++) {
        let mp = monster_at(m, t);
        let lp = vec2<f32>((uv.x - mp.x) * select(1.0, -1.0, m == 1), uv.y - mp.y) * 70.0;
        if (abs(lp.x) > 32.0 || abs(lp.y) > 26.0) { continue; }
        let shape = ss(1.0, -1.0, monster(lp, t, f32(m) * 2.1));
        c = mix(c, vec3<f32>(0.03, 0.03, 0.035), shape * clamp(light * 3.0, 0.0, 1.0) * 0.95);
    }
    let ag = uv * 70.0 + vec2<f32>(t * 0.5, -t * 0.2);
    let ai = vec2<i32>(floor(ag));
    let af = fract(ag) - 0.5 - (hi2(ai) - 0.5) * 0.5;
    c = mix(c, vec3<f32>(0.12, 0.11, 0.1), step(hi(ai + vec2<i32>(4, 4)), 0.12) * ss(0.09, 0.03, length(af * vec2<f32>(1.0, 1.8))));
    return c;
}

// The eye inside the lid: a reptile iris holding a nebula, a void for a pupil.
fn eye(e: vec2<f32>, lid: f32, dy: f32) -> vec3<f32> {
    let ri = 0.47;
    let cosmic = 0.8;
    let t = u.a.x;
    let beat = u.a.z;
    let ie = e - u.f.xy * 0.17;
    let il = length(ie);
    let ir = il / ri;
    let dv = ie / (il + 0.0001);
    var scl = vec3<f32>(0.16, 0.005, 0.012) + vec3<f32>(0.9, 0.12, 0.03) * exp(-voro(e * 7.0 + 50.0).x * 22.0) * 0.5;
    scl = mix(scl, vec3<f32>(0.02, 0.0, 0.04) + vec3<f32>(1.0) * pow(h21(floor(e * 140.0)), 70.0), cosmic * 0.8);
    let fib = fbm(dv * 7.0 + ir * 0.9 + 3.0);
    var dr = mix(vec3<f32>(1.0, 0.8, 0.22), vec3<f32>(1.0, 0.27, 0.03), ss(0.1, 0.6, ir));
    dr = mix(dr, vec3<f32>(0.3, 0.01, 0.015), ss(0.6, 1.0, ir)) * (0.45 + 1.1 * fib);
    dr += vec3<f32>(1.0, 0.55, 0.15) * exp(-voro(ie * 10.0 + 70.0).x * 26.0) * 0.6 * (1.0 - ir * 0.5) * (0.7 + 0.6 * beat);
    let ne = rot(1.4 / (ir + 0.35) + t * 0.12) * ie;
    let n1 = fbm(ne * 5.0 + 9.0);
    let n2 = fbm(ne * 9.0 - 4.0);
    var nb = vec3<f32>(0.85, 0.07, 0.1) * n1 * 1.5 + vec3<f32>(0.45, 0.08, 0.65) * n2 * n2 * 1.6 + vec3<f32>(1.0, 0.5, 0.2) * pow(n1, 4.0) * 1.5;
    nb += vec3<f32>(1.0, 0.9, 0.85) * pow(h21(floor(ne * 120.0)), 50.0) * 1.5;
    nb *= ss(1.05, 0.5, ir) + 0.25;
    var c = mix(dr * (1.0 - cosmic * 0.75) + nb * cosmic * 1.25, scl, ss(0.96, 1.03, ir));
    c *= mix(1.0, 0.35, exp(-pow((ir - 1.0) * 14.0, 2.0)));
    let ph = ri * 0.93;
    let yy = ie.y / ph;
    var dp = abs(ie.x) + (abs(yy) - 1.0) * ph;
    if (abs(yy) < 1.0) { dp = abs(ie.x) - u.e.z * ri * (1.0 - yy * yy); }
    let pm = ss(0.012, -0.012, dp);
    c = mix(c, vec3<f32>(0.5, 0.1, 0.6) * pow(h21(floor(ie * 200.0)), 90.0) * cosmic, pm);
    c += mix(vec3<f32>(1.0, 0.45, 0.1), vec3<f32>(1.0, 0.85, 0.7), cosmic) * exp(-abs(dp) * 55.0) * (1.0 - pm) * 0.9;
    let gp = ie - vec2<f32>(-0.13, 0.15);
    c += vec3<f32>(1.0, 0.85, 0.8) * exp(-dot(gp, gp) * 260.0) * 0.8 * (1.0 - cosmic * 0.6);
    c *= 0.3 + 0.7 * ss(0.0, 0.13, lid - dy);
    return c * 1.25;
}

// The moon's disc: the spiral void eating it from the centre, its cracks, the lid and the eye.
fn moon_col(q: vec2<f32>, r: f32, a: f32) -> vec3<f32> {
    let t = u.a.x;
    let p = u.a.y;
    let beat = u.a.z;
    let z = sqrt(max(1.0 - r * r, 0.0));
    // Seas, craters with a lit rim, fine grain: a moon, not a cloud.
    let cr = voro(q * 4.6 + 3.0);
    let crater = ss(0.34, 0.2, cr.z) * (0.4 + 0.6 * cr.y);
    let rim = ss(0.07, 0.0, abs(cr.z - 0.33)) * cr.y;
    let seas = ss(0.42, 0.62, fbm(q * 1.6 + 4.0));
    let alb = (0.8 + 0.2 * fbm(q * 7.0 + 1.0)) * (1.0 - 0.3 * seas) * (1.0 - 0.25 * crater) + 0.1 * rim;
    let s = ss(0.08, -0.08, r - u.b.x - 0.12 * sin(a * 3.0 + r * 9.0 - t * 0.8) * ss(0.0, 0.3, p));
    let v = voro(q * 3.3 + 31.0);
    let on = ss(0.0, 0.12, p * 1.25 - (vnoise(q * 1.5 + 2.0) * 0.8 + r * 0.3)) * ss(0.38, 0.55, vnoise(q * 2.7 + 8.0));
    let lit = mix(vec3<f32>(1.0, 0.72, 0.44), vec3<f32>(1.0, 0.46, 0.22), p * 0.85) * alb * (0.5 + 0.65 * z);
    let drk = mix(vec3<f32>(0.22, 0.012, 0.012), vec3<f32>(0.8, 0.07, 0.04), u.c.x) * alb * (0.7 + 0.5 * z);
    var c = mix(lit, drk, s);
    c += vec3<f32>(1.0, 0.35, 0.06) * 4.0 * s * (1.0 - s) * 0.9;
    c += vec3<f32>(1.0, 0.4, 0.08) * (ss(0.022, 0.004, v.x) * 1.6 + exp(-v.x * 22.0) * 0.3) * on * (0.6 + 0.27 * beat);
    if (u.e.x > 0.0) {
        let e = rot(0.1) * q;
        let xn = e.x / 0.93;
        if (abs(xn) < 1.0) {
            let shape = pow(1.0 - xn * xn, 0.75);
            let lid = u.e.y * 0.5 * shape;
            let dy = abs(e.y - 0.07 * (vnoise(vec2<f32>(e.x * 7.0, 3.0)) - 0.5) * clamp(1.0 - u.e.y, 0.0, 1.0));
            let seam_on = step(abs(xn), u.e.x);
            if (dy < lid) { c = eye(e, lid, dy); }
            c += vec3<f32>(1.0, 0.45, 0.1) * exp(-abs(dy - lid) * 45.0) * seam_on * (1.2 + beat) * pow(shape, 0.3);
        }
    }
    return c;
}

// The sky along `dir`. rgb: its colour, a: how much of the vanilla sky it replaces.
fn sky(dir: vec3<f32>) -> vec4<f32> {
    let d = normalize(dir);
    let t = u.a.x;
    let moon = u.moon.xyz;
    let mr = normalize(cross(moon, vec3<f32>(0.0, 1.0, 0.0)));
    let mu = cross(mr, moon);
    let ang = acos(clamp(dot(d, moon), -1.0, 1.0));
    let qa = normalize(vec2<f32>(dot(d, mr), dot(d, mu)) + 0.000001) * ang;
    let q = qa / u.moon.w;
    let r = length(q);
    let a = atan2(q.y, q.x);
    var weight = u.c.w;

    var col = mix(u.hor.rgb, u.zen.rgb, pow(ss(-0.02, 0.75, d.y), 0.6));
    col += vec3<f32>(1.0, 0.95, 0.9) * stars(d, ang, a);
    let au = aurora(ang, a);
    col = col * (1.0 - au.a) + au.rgb;
    // The fissures, and the Pale Realm through them.
    let s = t - 14.0;
    let tc = s - 60.5;
    let present = u.g.z;
    let fs = fissures(d, s);
    let win = fs.win * present;
    let flash = fog_flash();
    if (win > 0.0) {
        col = mix(col, other_side(d, flash) * (1.0 - 0.55 * fs.lip), win);
        weight = max(weight, win);
    }
    let hush = select(0.0, ss(58.3, 59.5, s), s < 60.5);
    let att = 1.0 - 0.6 * hush + select(0.0, 0.5 * exp(-tc * 0.8), tc >= 0.0);
    let lc = mix(vec3<f32>(1.0, 0.25, 0.1), vec3<f32>(3.0, 2.2, 1.7), fs.heat);
    col += (lc * (fs.core * 1.7 + fs.glow * 0.4 * (1.0 - fs.win)) * (0.75 + 0.25 * u.a.z + u.d.y) * att
        + vec3<f32>(4.0, 3.0, 2.4) * fs.tip * 2.5) * present;
    col += vec3<f32>(1.0, 0.35, 0.25) * u.g.x * 0.12 * present;
    // A flash behind the sky leaks through the cracks near it.
    let duv = vec2<f32>(atan2(d.z, d.x) * 0.88, asin(clamp(d.y, -1.0, 1.0)));
    let leak = flash.z * exp(-length((duv - flash.xy) * vec2<f32>(1.0, 1.3)) / 0.35);
    col += vec3<f32>(0.9, 0.95, 1.0) * leak * (fs.core * 2.5 + fs.glow * 1.5) * present;
    weight = max(weight, max(fs.core, max(fs.glow * 0.6, fs.tip)) * present);
    col += vec3<f32>(1.0, 0.4, 0.3) * exp(-abs(ang - u.d.z) * 35.0) * u.d.w * 2.0;
    if (ang < 1.7) {
        let rr = max(r - 1.0, 0.0);
        let sw = a + 2.2 * log(max(r, 0.2)) - t * 0.45;
        // The corona is on our side of the shell: it does not cover the openings.
        let glow = (exp(-rr * 2.0) * (pn(sw, rr * 1.2, 2.0) * 0.7 + 0.5 * pow(0.5 + 0.5 * sin(sw * 3.0), 3.0)) * 1.8 + exp(-rr * 7.0)) * u.b.w * (1.0 - 0.9 * win);
        col += vec3<f32>(1.0, 0.2, 0.04) * glow + vec3<f32>(1.0, 0.7, 0.3) * glow * glow * 0.5;
        weight = max(weight, clamp(glow, 0.0, 1.0));
    }
    // Without bloom the bright parts would clip to white: compress them.
    col = vec3<f32>(1.0) - exp(-col * 1.2);
    // The sky sinks into the land's fog near the horizon and below it.
    let haze = max(exp(-max(d.y, 0.0) * 14.0) * 0.65, ss(0.0, -0.1, d.y));
    col = mix(col, u.fog.rgb, haze);
    // The moon goes over the haze, solid, so the vanilla moon behind it never
    // shows; the haze only tints it a little, and it sinks under the horizon.
    if (r < 1.03) {
        let disc = ss(1.0, 0.985, r);
        var mc = vec3<f32>(1.0) - exp(-moon_col(q, r, a) * 1.2);
        mc = mix(mc, u.fog.rgb, max(haze * 0.3, ss(-0.02, -0.12, d.y)));
        col = mix(col, mc, disc);
        weight = max(weight, disc * u.f.z);
    }
    return vec4<f32>(col, clamp(weight, 0.0, 1.0));
}

// Our colours are written for the screen: an sRGB target wants them linear.
fn to_target(c: vec3<f32>) -> vec3<f32> {
    if (u.f.w > 0.5) { return pow(max(c, vec3<f32>(0.0)), vec3<f32>(2.2)); }
    return c;
}

// Sky is where nothing was drawn (depth 0). The vanilla clouds leave their
// depth even once faded out, so a far pixel inside the cloud layer (192.33 to
// 196.33 blocks up) is sky too.
fn is_sky(v: V) -> bool {
    let at = min(vec2<i32>(v.uv * u.size.zw), vec2<i32>(u.size.zw) - vec2<i32>(1, 1));
    let depth = textureLoad(depth_tex, max(at, vec2<i32>(0, 0)), 0);
    if (depth <= 0.0) { return true; }
    let ndc = vec2<f32>(v.uv.x * 2.0 - 1.0, 1.0 - v.uv.y * 2.0);
    let p = u.inv * vec4<f32>(ndc, depth, 1.0);
    let rel = p.xyz / p.w;
    let y = u.a.w + rel.y;
    return y > 192.0 && y < 196.7 && dot(rel, rel) > 256.0;
}

fn flash_light(v: V) -> vec3<f32> {
    let ang = acos(clamp(dot(normalize(v.ray), u.moon.xyz), -1.0, 1.0));
    return u.d.y * vec3<f32>(1.0, 0.55, 0.45) * (0.3 + 0.7 * exp(-ang * 1.5));
}

// With a copy of the frame: the sky replaced, the land graded red.
@fragment
fn fs_copy(v: V) -> @location(0) vec4<f32> {
    let scene = textureLoad(scene_tex, vec2<i32>(v.pos.xy), 0).rgb;
    var col: vec3<f32>;
    if (is_sky(v)) {
        let s = sky(v.ray);
        col = mix(scene, to_target(s.rgb), s.a);
    } else {
        let lum = dot(scene, vec3<f32>(0.3, 0.5, 0.2));
        col = mix(scene, lum * to_target(vec3<f32>(1.5, 0.16, 0.12)), u.c.z);
    }
    col = col * u.d.x + to_target(flash_light(v));
    return vec4<f32>(col, 1.0);
}

// Without one: the sky blended over the frame, a red veil over the land.
@fragment
fn fs_blend(v: V) -> @location(0) vec4<f32> {
    let dim = 1.0 - u.d.x;
    if (is_sky(v)) {
        let s = sky(v.ray);
        return vec4<f32>(to_target(s.rgb * u.d.x + flash_light(v)), max(s.a, dim));
    }
    return vec4<f32>(to_target(vec3<f32>(0.25, 0.012, 0.01) * u.d.x + flash_light(v)), max(max(u.c.z * 0.45, dim), u.d.y * 0.4));
}
"#;
