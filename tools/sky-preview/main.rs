//! The sky pass, offscreen (run it through tools/sky-preview.sh).
//!
//! 1. A synthetic scene: rolling land, water and a dark night sky, drawn into a
//!    `Bgra8Unorm` colour target and a reversed `Depth32Float` (1 near, 0 the
//!    sky), like the frame the game hands `RenderHooks::world_drawn`.
//! 2. The real sky pass: the WGSL of sky_pass.rs, its `fs_copy` pipeline, the
//!    uniforms of `crimson_core::sky_uniforms::uniforms` and tonight's break
//!    (`crimson_core::shell::plan`), the eye stepped from the eclipse's start.
//! 3. Each frame read back to a PNG, and all of them on one contact sheet.

use crimson_core::eye::Eye;
use crimson_core::moon::DAY;
use crimson_core::night::{eclipse_seconds, ECLIPSE_START};
use crimson_core::rise::frame;
use crimson_core::shell::{plan, seed_for_day};
use crimson_core::sky::{look, moon_direction, since_open};
use crimson_core::sky_uniforms::{uniforms, View, UNIFORM_FLOATS};
use std::path::{Path, PathBuf};

const FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Bgra8Unorm;
const CAMERA_Y: f32 = 70.0;
const FOV_Y_DEGREES: f32 = 70.0;
const NEAR: f32 = 0.05;
const LABEL: u32 = 14;

struct Args {
    shader: PathBuf,
    out: PathBuf,
    times: Vec<f32>,
    views: Vec<String>,
    size: [u32; 2],
    day: i64,
}

fn args() -> Args {
    let mut a = Args {
        shader: PathBuf::new(),
        out: PathBuf::from("out"),
        times: vec![-45.0, -10.0, 5.0, 20.0, 40.0, 59.0, 62.0, 90.0, 180.0],
        views: ["moon", "horizon", "up", "away"].map(String::from).to_vec(),
        size: [480, 270],
        day: 8,
    };
    let mut it = std::env::args().skip(1);
    while let Some(flag) = it.next() {
        let mut value = || it.next().unwrap_or_else(|| panic!("{flag} needs a value"));
        match flag.as_str() {
            "--shader" => a.shader = value().into(),
            "--out" => a.out = value().into(),
            "-t" | "--times" => {
                a.times = value()
                    .split(',')
                    .map(|s| s.trim().parse().expect("a time in seconds"))
                    .collect()
            }
            "-v" | "--views" => a.views = value().split(',').map(|s| s.trim().to_string()).collect(),
            "--size" => {
                let v = value();
                let (w, h) = v.split_once('x').expect("--size WxH");
                a.size = [w.parse().expect("width"), h.parse().expect("height")];
            }
            "--day" => a.day = value().parse().expect("a day number"),
            other => panic!("unknown argument {other}"),
        }
    }
    a
}

/// The SHADER constant of sky_pass.rs, as tools/check-shader.sh reads it.
fn sky_shader(path: &Path) -> String {
    let rust = std::fs::read_to_string(path).expect("sky_pass.rs");
    let marker = "pub const SHADER: &str = r#\"";
    let start = rust.find(marker).expect("the SHADER constant") + marker.len();
    let end = start + rust[start..].find("\"#;").expect("the end of SHADER");
    rust[start..end].to_string()
}

// ---- matrices, column-major like glam's to_cols_array ----

type M4 = [f32; 16];

fn mul(a: &M4, b: &M4) -> M4 {
    std::array::from_fn(|i| {
        let (col, row) = (i / 4, i % 4);
        (0..4).map(|k| a[k * 4 + row] * b[col * 4 + k]).sum()
    })
}

fn invert(m: &M4) -> M4 {
    // Gauss-Jordan on rows of the row-major copy.
    let mut a = [[0.0f64; 8]; 4];
    for (r, row) in a.iter_mut().enumerate() {
        for c in 0..4 {
            row[c] = f64::from(m[c * 4 + r]);
        }
        row[4 + r] = 1.0;
    }
    for col in 0..4 {
        let pivot = (col..4)
            .max_by(|&x, &y| a[x][col].abs().total_cmp(&a[y][col].abs()))
            .unwrap();
        a.swap(col, pivot);
        let p = a[col][col];
        assert!(p.abs() > 1e-12, "singular matrix");
        for v in a[col].iter_mut() {
            *v /= p;
        }
        for r in 0..4 {
            if r != col {
                let f = a[r][col];
                let pivot_row = a[col];
                for (v, pv) in a[r].iter_mut().zip(pivot_row) {
                    *v -= f * pv;
                }
            }
        }
    }
    std::array::from_fn(|i| a[i % 4][4 + i / 4] as f32)
}

fn norm(v: [f32; 3]) -> [f32; 3] {
    let l = (v[0] * v[0] + v[1] * v[1] + v[2] * v[2]).sqrt();
    [v[0] / l, v[1] / l, v[2] / l]
}

fn cross(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

/// Camera-relative view-projection looking along `f`, reversed infinite depth.
fn view_proj(f: [f32; 3], aspect: f32) -> M4 {
    let f = norm(f);
    let r = norm(cross(f, [0.0, 1.0, 0.0]));
    let u = cross(r, f);
    #[rustfmt::skip]
    let view: M4 = [
        r[0], u[0], -f[0], 0.0,
        r[1], u[1], -f[1], 0.0,
        r[2], u[2], -f[2], 0.0,
        0.0,  0.0,  0.0,   1.0,
    ];
    let fy = 1.0 / (FOV_Y_DEGREES.to_radians() * 0.5).tan();
    #[rustfmt::skip]
    let proj: M4 = [
        fy / aspect, 0.0, 0.0,  0.0,
        0.0,         fy,  0.0,  0.0,
        0.0,         0.0, 0.0, -1.0,
        0.0,         0.0, NEAR, 0.0,
    ];
    mul(&proj, &view)
}

/// Where a view looks at an instant: `moon` at the moon, `horizon` low under
/// it, `up` high under it, `away` low the other way.
fn direction(view: &str, moon: [f32; 3]) -> [f32; 3] {
    let flat = norm([moon[0], 0.0, moon[2] + 1e-4]);
    let at = |pitch: f32, sign: f32| {
        let (s, c) = pitch.to_radians().sin_cos();
        [flat[0] * c * sign, s, flat[2] * c * sign]
    };
    match view {
        "moon" => moon,
        "horizon" => at(8.0, 1.0),
        "up" => at(72.0, 1.0),
        "away" => at(12.0, -1.0),
        other => panic!("unknown view {other} (moon, horizon, up, away)"),
    }
}

// ---- the scene ----

const SCENE: &str = r#"
struct S { inv: mat4x4<f32>, vp: mat4x4<f32>, p: vec4<f32> };
@group(0) @binding(0) var<uniform> s: S;
struct V { @builtin(position) pos: vec4<f32>, @location(0) ray: vec3<f32> };
@vertex fn vs(@builtin(vertex_index) i: u32) -> V {
    let p = vec2<f32>(f32((i << 1u) & 2u), f32(i & 2u)) * 2.0 - 1.0;
    let n = s.inv * vec4<f32>(p, 1.0, 1.0);
    let f = s.inv * vec4<f32>(p, 0.5, 1.0);
    var o: V; o.pos = vec4<f32>(p, 0.0, 1.0); o.ray = f.xyz / f.w - n.xyz / n.w; return o;
}
fn hash(p: vec2<f32>) -> f32 { return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453); }
fn noise(p: vec2<f32>) -> f32 {
    let i = floor(p); let f = fract(p); let w = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2<f32>(1.0, 0.0)), w.x), mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), w.x), w.y);
}
// The land's height at a world column (the camera stands at x = z = 0).
fn height(xz: vec2<f32>) -> f32 {
    let q = xz + vec2<f32>(37.0, -91.0);
    return 63.0 + 9.0 * noise(q / 90.0) + 4.0 * noise(q / 31.0) + 1.5 * noise(q / 9.0) - 4.0 + 14.0 * smoothstep(250.0, 600.0, length(xz)) * noise(q / 160.0);
}
struct O { @location(0) c: vec4<f32>, @builtin(frag_depth) d: f32 };
@fragment fn fs(v: V) -> O {
    let rd = normalize(v.ray);
    let eye = vec3<f32>(0.0, s.p.x, 0.0);
    var o: O;
    var t = 0.5; var hit = false; var last = 0.5;
    for (var i = 0; i < 320; i++) {
        let p = eye + rd * t;
        let h = max(height(p.xz), 62.0);
        if (p.y < h) { hit = true; break; }
        last = t; t += max(0.25, 0.012 * t + 0.4 * (p.y - h));
        if (t > 900.0) { break; }
    }
    if (hit) {
        var a = last; var b = t;
        for (var k = 0; k < 8; k++) { let m = 0.5 * (a + b); let p = eye + rd * m; if (p.y < max(height(p.xz), 62.0)) { b = m; } else { a = m; } }
        let p = eye + rd * b;
        var col: vec3<f32>;
        if (height(p.xz) < 62.0) {
            col = vec3<f32>(0.05, 0.08, 0.2);
        } else {
            let e = 0.6;
            let n = normalize(vec3<f32>(height(p.xz - vec2<f32>(e, 0.0)) - height(p.xz + vec2<f32>(e, 0.0)), 2.0 * e,
                                        height(p.xz - vec2<f32>(0.0, e)) - height(p.xz + vec2<f32>(0.0, e))));
            let cell = floor(p.xz);
            let grass = vec3<f32>(0.22, 0.36, 0.14) * (0.85 + 0.3 * hash(cell));
            let stone = vec3<f32>(0.36, 0.36, 0.37) * (0.85 + 0.3 * hash(cell + 7.0));
            col = mix(stone, grass, smoothstep(0.75, 0.9, n.y));
            col *= 0.55 + 0.45 * n.y;
            // A tree here and there: darker tufts.
            if (hash(floor(p.xz / 5.0)) > 0.86 && n.y > 0.9) { col = vec3<f32>(0.08, 0.17, 0.06); }
        }
        // Night: the land is dim; far land fades to the sky's colour.
        col *= 0.32;
        col = mix(col, vec3<f32>(0.03, 0.04, 0.08), smoothstep(80.0, 700.0, b));
        let clip = s.vp * vec4<f32>(p - eye, 1.0);
        o.c = vec4<f32>(col, 1.0);
        o.d = clip.z / clip.w;
        return o;
    }
    // A vanilla night sky: dark blue, a few stars.
    let up = rd.y;
    var col = mix(vec3<f32>(0.04, 0.05, 0.1), vec3<f32>(0.0, 0.0, 0.015), smoothstep(-0.05, 0.6, up));
    let st = floor(rd * 300.0);
    if (fract(sin(dot(st, vec3<f32>(12.9898, 78.233, 37.719))) * 43758.5453) > 0.9985 && up > 0.0) { col += vec3<f32>(0.6); }
    o.c = vec4<f32>(col, 1.0);
    o.d = 0.0;
    return o;
}
"#;

struct Ctx {
    device: wgpu::Device,
    queue: wgpu::Queue,
}

fn ctx() -> Ctx {
    let instance = wgpu::Instance::new(wgpu::InstanceDescriptor::new_without_display_handle_from_env());
    let adapter = pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        ..Default::default()
    }))
    .expect("a GPU adapter");
    let info = adapter.get_info();
    println!("GPU: {} ({:?})", info.name, info.backend);
    let (device, queue) =
        pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor::default()))
            .expect("a GPU device");
    Ctx { device, queue }
}

fn uniform_entry(binding: u32) -> wgpu::BindGroupLayoutEntry {
    wgpu::BindGroupLayoutEntry {
        binding,
        visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
        ty: wgpu::BindingType::Buffer {
            ty: wgpu::BufferBindingType::Uniform,
            has_dynamic_offset: false,
            min_binding_size: None,
        },
        count: None,
    }
}

fn pipeline(
    device: &wgpu::Device,
    shader: &wgpu::ShaderModule,
    layout: &wgpu::BindGroupLayout,
    fragment: &str,
    depth: bool,
) -> wgpu::RenderPipeline {
    let pl = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: Some(fragment),
        bind_group_layouts: &[Some(layout)],
        ..Default::default()
    });
    device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
        label: Some(fragment),
        layout: Some(&pl),
        vertex: wgpu::VertexState {
            module: shader,
            entry_point: Some("vs"),
            compilation_options: Default::default(),
            buffers: &[],
        },
        primitive: Default::default(),
        depth_stencil: depth.then(|| wgpu::DepthStencilState {
            format: wgpu::TextureFormat::Depth32Float,
            depth_write_enabled: Some(true),
            depth_compare: Some(wgpu::CompareFunction::Always),
            stencil: Default::default(),
            bias: Default::default(),
        }),
        multisample: Default::default(),
        fragment: Some(wgpu::FragmentState {
            module: shader,
            entry_point: Some(fragment),
            compilation_options: Default::default(),
            targets: &[Some(wgpu::ColorTargetState {
                format: FORMAT,
                blend: None,
                write_mask: wgpu::ColorWrites::COLOR,
            })],
        }),
        multiview_mask: None,
        cache: None,
    })
}

fn bytes(floats: &[f32]) -> Vec<u8> {
    floats.iter().flat_map(|f| f.to_le_bytes()).collect()
}

fn texture(device: &wgpu::Device, size: [u32; 2], format: wgpu::TextureFormat, usage: wgpu::TextureUsages) -> wgpu::Texture {
    device.create_texture(&wgpu::TextureDescriptor {
        label: None,
        size: wgpu::Extent3d {
            width: size[0],
            height: size[1],
            depth_or_array_layers: 1,
        },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format,
        usage,
        view_formats: &[],
    })
}

/// Renders the sky pass at `seconds` from `view`, as RGB rows.
struct Renderer {
    scene_pipe: wgpu::RenderPipeline,
    scene_layout: wgpu::BindGroupLayout,
    sky_pipe: wgpu::RenderPipeline,
    sky_layout: wgpu::BindGroupLayout,
    shell: wgpu::Buffer,
    plan: crimson_core::shell::Plan,
    size: [u32; 2],
}

impl Renderer {
    fn new(c: &Ctx, sky_src: &str, size: [u32; 2], day: i64) -> Self {
        let d = &c.device;
        let scope = d.push_error_scope(wgpu::ErrorFilter::Validation);
        let scene = d.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("scene"),
            source: wgpu::ShaderSource::Wgsl(SCENE.into()),
        });
        let sky = d.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("sky"),
            source: wgpu::ShaderSource::Wgsl(sky_src.into()),
        });
        let scene_layout = d.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("scene"),
            entries: &[uniform_entry(0)],
        });
        // The same bindings as sky_pass.rs' Gpu::new.
        let sky_layout = d.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("sky"),
            entries: &[
                uniform_entry(0),
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
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: true },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
        let scene_pipe = pipeline(d, &scene, &scene_layout, "fs", true);
        let sky_pipe = pipeline(d, &sky, &sky_layout, "fs_copy", false);
        if let Some(e) = pollster::block_on(scope.pop()) {
            eprintln!("The GPU refused a shader or a pipeline:\n{e}");
            std::process::exit(1);
        }
        let plan = plan(seed_for_day(day));
        let floats = plan.floats();
        let shell = d.create_buffer(&wgpu::BufferDescriptor {
            label: Some("shell"),
            size: (floats.len() * 4) as u64,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        c.queue.write_buffer(&shell, 0, &bytes(&floats));
        Self {
            scene_pipe,
            scene_layout,
            sky_pipe,
            sky_layout,
            shell,
            plan,
            size,
        }
    }

    fn render(&self, c: &Ctx, day_time: i64, partial: f32, f: [f32; 3], eye: &Eye) -> Vec<u8> {
        let d = &c.device;
        let size = self.size;
        let vp = view_proj(f, size[0] as f32 / size[1] as f32);
        let inv = invert(&vp);
        let rt = wgpu::TextureUsages::RENDER_ATTACHMENT;
        let color = texture(d, size, FORMAT, rt | wgpu::TextureUsages::COPY_SRC);
        let copy = texture(d, size, FORMAT, wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST);
        let depth = texture(d, size, wgpu::TextureFormat::Depth32Float, rt | wgpu::TextureUsages::TEXTURE_BINDING);
        let color_view = color.create_view(&Default::default());
        let copy_view = copy.create_view(&Default::default());
        let depth_view = depth.create_view(&Default::default());

        let mut scene_u = Vec::with_capacity(36);
        scene_u.extend_from_slice(&inv);
        scene_u.extend_from_slice(&vp);
        scene_u.extend_from_slice(&[CAMERA_Y, 0.0, 0.0, 0.0]);
        let scene_buf = d.create_buffer(&wgpu::BufferDescriptor {
            label: Some("scene uniforms"),
            size: (scene_u.len() * 4) as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        c.queue.write_buffer(&scene_buf, 0, &bytes(&scene_u));

        let view = View {
            inverse: inv,
            size,
            depth_size: size,
            camera_y: CAMERA_Y,
            can_copy: true,
            srgb: FORMAT.is_srgb(),
        };
        let u = uniforms(day_time, partial, &view, eye, &self.plan, None);
        assert_eq!(u.len(), UNIFORM_FLOATS);
        let sky_buf = d.create_buffer(&wgpu::BufferDescriptor {
            label: Some("sky uniforms"),
            size: (UNIFORM_FLOATS * 4) as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        c.queue.write_buffer(&sky_buf, 0, &bytes(&u));

        let scene_group = d.create_bind_group(&wgpu::BindGroupDescriptor {
            label: None,
            layout: &self.scene_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: scene_buf.as_entire_binding(),
            }],
        });
        let sky_group = d.create_bind_group(&wgpu::BindGroupDescriptor {
            label: None,
            layout: &self.sky_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: sky_buf.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(&depth_view),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::TextureView(&copy_view),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: self.shell.as_entire_binding(),
                },
            ],
        });

        let row = (size[0] * 4).div_ceil(256) * 256;
        let read = d.create_buffer(&wgpu::BufferDescriptor {
            label: Some("readback"),
            size: u64::from(row * size[1]),
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });
        let extent = wgpu::Extent3d {
            width: size[0],
            height: size[1],
            depth_or_array_layers: 1,
        };
        let whole = |texture| wgpu::TexelCopyTextureInfo {
            texture,
            mip_level: 0,
            origin: wgpu::Origin3d::ZERO,
            aspect: wgpu::TextureAspect::All,
        };
        let mut enc = d.create_command_encoder(&Default::default());
        {
            let mut pass = enc.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("scene"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &color_view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &depth_view,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(0.0),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                ..Default::default()
            });
            pass.set_pipeline(&self.scene_pipe);
            pass.set_bind_group(0, &scene_group, &[]);
            pass.draw(0..3, 0..1);
        }
        // As the game's hook does: copy the frame, then draw the pass onto it from the copy.
        enc.copy_texture_to_texture(whole(&color), whole(&copy), extent);
        {
            let mut pass = enc.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("sky"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &color_view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Load,
                        store: wgpu::StoreOp::Store,
                    },
                })],
                ..Default::default()
            });
            pass.set_pipeline(&self.sky_pipe);
            pass.set_bind_group(0, &sky_group, &[]);
            pass.draw(0..3, 0..1);
        }
        enc.copy_texture_to_buffer(
            whole(&color),
            wgpu::TexelCopyBufferInfo {
                buffer: &read,
                layout: wgpu::TexelCopyBufferLayout {
                    offset: 0,
                    bytes_per_row: Some(row),
                    rows_per_image: Some(size[1]),
                },
            },
            extent,
        );
        c.queue.submit([enc.finish()]);
        read.map_async(wgpu::MapMode::Read, .., |r| r.expect("map the readback"));
        d.poll(wgpu::PollType::wait_indefinitely()).expect("the GPU finished");
        let data = read.get_mapped_range(..).expect("mapped");
        let mut rgb = Vec::with_capacity((size[0] * size[1] * 3) as usize);
        for y in 0..size[1] {
            let line = &data[(y * row) as usize..][..(size[0] * 4) as usize];
            for px in line.chunks_exact(4) {
                rgb.extend_from_slice(&[px[2], px[1], px[0]]);
            }
        }
        rgb
    }
}

/// The eye at `seconds`, stepped at 20 Hz from before the eclipse as the game moves it.
fn eye_at(seconds: f32, view: &str) -> Eye {
    let mut eye = Eye::default();
    let dt = 0.05;
    let mut t = -2.0f32.min(seconds);
    while t < seconds {
        t = (t + dt).min(seconds);
        let tod = ECLIPSE_START as f32 + t * 20.0;
        let moon = moon_direction(tod);
        let f = norm(direction(view, moon));
        eye.update(dt, since_open(t), look(f, moon), frame(t).beat);
    }
    eye
}

// ---- the sheet ----

/// 3 × 5 glyphs for the labels.
fn glyph(c: char) -> [u8; 5] {
    match c {
        '0' => [7, 5, 5, 5, 7],
        '1' => [2, 6, 2, 2, 7],
        '2' => [7, 1, 7, 4, 7],
        '3' => [7, 1, 7, 1, 7],
        '4' => [5, 5, 7, 1, 1],
        '5' => [7, 4, 7, 1, 7],
        '6' => [7, 4, 7, 5, 7],
        '7' => [7, 1, 1, 1, 1],
        '8' => [7, 5, 7, 5, 7],
        '9' => [7, 5, 7, 1, 7],
        '-' => [0, 0, 7, 0, 0],
        '.' => [0, 0, 0, 0, 2],
        's' => [0, 3, 6, 1, 6],
        'a' => [0, 6, 1, 7, 7],
        'e' => [7, 5, 7, 4, 7],
        'h' => [4, 4, 7, 5, 5],
        'i' => [2, 0, 2, 2, 2],
        'm' => [0, 7, 7, 5, 5],
        'n' => [0, 6, 5, 5, 5],
        'o' => [0, 7, 5, 5, 7],
        'p' => [0, 7, 5, 7, 4],
        'r' => [0, 6, 4, 4, 4],
        'u' => [0, 5, 5, 5, 7],
        'w' => [0, 5, 7, 7, 5],
        'y' => [5, 5, 7, 1, 7],
        'z' => [7, 1, 2, 4, 7],
        _ => [0; 5],
    }
}

fn text(img: &mut [u8], width: u32, x0: u32, y0: u32, s: &str) {
    for (i, c) in s.chars().enumerate() {
        let g = glyph(c);
        for (gy, bits) in g.iter().enumerate() {
            for gx in 0..3 {
                if bits & (4 >> gx) != 0 {
                    for dy in 0..2 {
                        for dx in 0..2 {
                            let x = x0 + i as u32 * 8 + gx * 2 + dx;
                            let y = y0 + gy as u32 * 2 + dy;
                            let o = ((y * width + x) * 3) as usize;
                            if o + 2 < img.len() {
                                img[o..o + 3].copy_from_slice(&[230, 230, 230]);
                            }
                        }
                    }
                }
            }
        }
    }
}

fn write_png(path: &Path, size: [u32; 2], rgb: &[u8]) {
    let file = std::io::BufWriter::new(std::fs::File::create(path).expect("create the png"));
    let mut enc = png::Encoder::new(file, size[0], size[1]);
    enc.set_color(png::ColorType::Rgb);
    enc.set_depth(png::BitDepth::Eight);
    enc.write_header()
        .and_then(|mut w| w.write_image_data(rgb))
        .expect("write the png");
}

fn main() {
    let a = args();
    let c = ctx();
    let r = Renderer::new(&c, &sky_shader(&a.shader), a.size, a.day);
    std::fs::create_dir_all(&a.out).expect("the output folder");
    let [w, h] = a.size;
    let cell_h = h + LABEL;
    let sheet_size = [w * a.times.len() as u32, cell_h * a.views.len() as u32];
    let mut sheet = vec![16u8; (sheet_size[0] * sheet_size[1] * 3) as usize];
    let base = a.day * DAY + ECLIPSE_START;
    for (row, view) in a.views.iter().enumerate() {
        for (col, &t) in a.times.iter().enumerate() {
            let ticks = t * 20.0;
            let day_time = base + ticks.floor() as i64;
            let partial = ticks - ticks.floor();
            debug_assert!((eclipse_seconds(day_time, partial) - t).abs() < 1e-3);
            let tod = (day_time.rem_euclid(DAY)) as f32 + partial;
            let moon = moon_direction(tod);
            let f = direction(view, moon);
            let eye = eye_at(t, view);
            let rgb = r.render(&c, day_time, partial, f, &eye);
            write_png(&a.out.join(format!("{view}-{t}.png")), a.size, &rgb);
            let (x0, y0) = (col as u32 * w, row as u32 * cell_h);
            for y in 0..h {
                let src = &rgb[(y * w * 3) as usize..][..(w * 3) as usize];
                let o = (((y0 + LABEL + y) * sheet_size[0] + x0) * 3) as usize;
                sheet[o..o + src.len()].copy_from_slice(src);
            }
            text(&mut sheet, sheet_size[0], x0 + 4, y0 + 2, &format!("{view} {t}s"));
        }
    }
    let path = a.out.join("sheet.png");
    write_png(&path, sheet_size, &sheet);
    println!(
        "{} ({} views x {} moments, {}x{} each; seconds since the eclipse began, the omens negative)",
        path.display(),
        a.views.len(),
        a.times.len(),
        w,
        h
    );
}
