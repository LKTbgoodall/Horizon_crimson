// Crimson Eclipse preview engine: the block registry.
// Every block is a real Minecraft block (vanilla id, vanilla state syntax, vanilla texture names) or one of ours
// (namespace crimson_eclipse). Shapes are written here from the vanilla pixel sizes (no Mojang file is copied);
// textures are loaded by name from preview/vanilla/textures.js, which tools/extract-textures.ps1 builds from the
// player's own client jar (gitignored). Without it, painted stand-ins are used.
// A model lives in pixel space 0..16 inside ONE cell: nothing is placed between two blocks.
'use strict';
(function () {
const CE = window.CE = window.CE || {};

// ------------------------------------------------------------------ directions
const FACES = ['down', 'up', 'north', 'south', 'west', 'east'];
const DIRV = { down:[0,-1,0], up:[0,1,0], north:[0,0,-1], south:[0,0,1], west:[-1,0,0], east:[1,0,0] };
const HORIZ = ['north', 'east', 'south', 'west'];
const OPP = { north:'south', south:'north', east:'west', west:'east', up:'down', down:'up' };
const ccwOf = f => HORIZ[(HORIZ.indexOf(f) + 3) % 4];
const dirOf = v => FACES.find(f => { const d = DIRV[f]; return Math.abs(d[0]-v[0]) < .5 && Math.abs(d[1]-v[1]) < .5 && Math.abs(d[2]-v[2]) < .5; }) || null;
const YROT = { north:0, east:90, south:180, west:270 };          // a model drawn facing north, turned clockwise

// ------------------------------------------------------------------ geometry (pixel space, cell = 0..16)
function defaultUV(face, a, b) {
  switch (face) {
    case 'down':  return [a[0], 16-b[2], b[0], 16-a[2]];
    case 'up':    return [a[0], a[2], b[0], b[2]];
    case 'north': return [16-b[0], 16-b[1], 16-a[0], 16-a[1]];
    case 'south': return [a[0], 16-b[1], b[0], 16-a[1]];
    case 'west':  return [a[2], 16-b[1], b[2], 16-a[1]];
    default:      return [16-b[2], 16-b[1], 16-a[2], 16-a[1]];
  }
}
// the face corner at (s, t): s runs along u, t along v (top of the texture first)
function facePoint(face, a, b, s, t) {
  const L = (p, q, k) => p + (q - p)*k;
  switch (face) {
    case 'north': return [L(b[0],a[0],s), L(b[1],a[1],t), a[2]];
    case 'south': return [L(a[0],b[0],s), L(b[1],a[1],t), b[2]];
    case 'west':  return [a[0], L(b[1],a[1],t), L(a[2],b[2],s)];
    case 'east':  return [b[0], L(b[1],a[1],t), L(b[2],a[2],s)];
    case 'up':    return [L(a[0],b[0],s), b[1], L(a[2],b[2],t)];
    default:      return [L(a[0],b[0],s), a[1], L(b[2],a[2],t)];
  }
}
const onEdge = (face, a, b) => (face === 'down' && a[1] <= 0) || (face === 'up' && b[1] >= 16) || (face === 'north' && a[2] <= 0) ||
  (face === 'south' && b[2] >= 16) || (face === 'west' && a[0] <= 0) || (face === 'east' && b[0] >= 16);

const rotPY = p => [16 - p[2], p[1], p[0]], rotVY = v => [-v[2], v[1], v[0]];       // 90° clockwise seen from above
const rotPX = p => [p[0], 16 - p[2], p[1]], rotVX = v => [v[0], -v[2], v[1]];
function rotAxis(p, axis, deg, o) {
  const a = deg*Math.PI/180, c = Math.cos(a), s = Math.sin(a), q = [p[0]-o[0], p[1]-o[1], p[2]-o[2]];
  let r;
  if (axis === 'y') r = [q[0]*c + q[2]*s, q[1], -q[0]*s + q[2]*c];
  else if (axis === 'x') r = [q[0], q[1]*c - q[2]*s, q[1]*s + q[2]*c];
  else r = [q[0]*c - q[1]*s, q[0]*s + q[1]*c, q[2]];
  return [r[0]+o[0], r[1]+o[1], r[2]+o[2]];
}

// a box turned by quarter turns stays a box: faces are renamed, default UVs recomputed (vanilla "uvlock")
function turnBox(el, x, y) {
  let a = el.from, b = el.to, faces = el.faces;
  const step = (P, V) => {
    const p = P(a), q = P(b); a = [Math.min(p[0],q[0]), Math.min(p[1],q[1]), Math.min(p[2],q[2])]; b = [Math.max(p[0],q[0]), Math.max(p[1],q[1]), Math.max(p[2],q[2])];
    const nf = {}; for (const f in faces) { const g = faces[f]; nf[dirOf(V(DIRV[f]))] = { ...g, uv: undefined, cull: g.cull ? dirOf(V(DIRV[g.cull])) : g.cull }; } faces = nf;
  };
  for (let k = 0; k < ((x/90)|0); k++) step(rotPX, rotVX);
  for (let k = 0; k < ((y/90)|0); k++) step(rotPY, rotVY);
  return { ...el, from:a, to:b, faces };
}

// model {els, x, y, uvlock} -> quads {P[4], UV[4], t, n, cull, edge, part, glow}
function bake(model) {
  const out = [], mx = model.x || 0, my = model.y || 0;
  for (const el0 of model.els) {
    const lock = model.uvlock && !el0.rot && !el0.quad;
    const el = lock ? turnBox(el0, mx, my) : el0;
    const qs = [];
    if (el.quad) qs.push({ P:el.quad.map(p => p.slice()), UV:el.uv.map(u => [u[0]/(el.ts||16), u[1]/(el.ts||16)]), t:el.t, n:el.n.slice(), cull:null, edge:false });
    else for (const face of FACES) { const f = el.faces[face]; if (!f) continue;
      const a = el.from, b = el.to, uv = f.uv || defaultUV(face, a, b), ts = f.ts || 16;
      const P = [[0,0],[1,0],[1,1],[0,1]].map(([s, t]) => facePoint(face, a, b, s, t));
      let UV = [[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]].map(([u, v]) => [u/ts, v/ts]);
      for (let k = 0; k < (((f.rot || 0)/90)|0); k++) UV = [UV[3], UV[0], UV[1], UV[2]];
      const edge = onEdge(face, a, b);
      qs.push({ P, UV, t:f.t, n:DIRV[face].slice(), cull:f.cull === false ? null : (f.cull || (edge ? face : null)), edge, glow:f.glow });
    }
    for (const q of qs) {
      q.part = el.part || null; if (q.glow == null) q.glow = el.glow; q.glowA = el.glowAwake;
      if (el.rot) { const o = el.rot.origin || [8,8,8]; q.P = q.P.map(p => rotAxis(p, el.rot.axis, el.rot.angle, o)); q.n = rotAxis(q.n, el.rot.axis, el.rot.angle, [0,0,0]); q.edge = false; q.cull = null; }
      if (!lock) {
        for (let k = 0; k < ((mx/90)|0); k++) { q.P = q.P.map(rotPX); q.n = rotVX(q.n); if (q.cull) q.cull = dirOf(rotVX(DIRV[q.cull])); }
        for (let k = 0; k < ((my/90)|0); k++) { q.P = q.P.map(rotPY); q.n = rotVY(q.n); if (q.cull) q.cull = dirOf(rotVY(DIRV[q.cull])); }
      }
      out.push(q);
    }
  }
  return out;
}

// ------------------------------------------------------------------ element helpers
const six = t => { const o = {}; for (const f of FACES) o[f] = { t: typeof t === 'function' ? t(f) : t }; return o; };
const only = (t, list, extra = {}) => { const o = {}; for (const f of list) o[f] = { t, ...extra }; return o; };
const B = (from, to, faces, more) => ({ from, to, faces, ...more });
function texOf(d, face) {
  const t = d.tex; if (typeof t === 'string') return t;
  if (t[face]) return t[face];
  if (face === 'up') return t.top || t.end || t.all;
  if (face === 'down') return t.bottom || t.end || t.top || t.all;
  return t.side || t.all;
}
// cuboid unwrap of an entity texture (vanilla ModelPart layout), sides stored upside down like the chest
function cuboid(u, v, dx, dy, dz, ts, t, flipSides = true) {
  const u1 = u+dz, u2 = u+dz+dx, u3 = u+dz+dx+dx, u4 = u+dz+dx+dz, u5 = u+dz+dx+dz+dx, v1 = v+dz, v2 = v+dz+dy;
  const S = (a, b) => flipSides ? [a, v2, b, v1] : [a, v1, b, v2];
  return { down:{ t, ts, uv:[u1, v, u2, v1] }, up:{ t, ts, uv:[u2, v1, u3, v] },
    west:{ t, ts, uv:S(u, u1) }, north:{ t, ts, uv:S(u1, u2) }, east:{ t, ts, uv:S(u2, u4) }, south:{ t, ts, uv:S(u4, u5) } };
}

// ------------------------------------------------------------------ connections (fences, panes, walls)
function fullSolid(e) { if (!e) return false; const d = REG[e.id]; return !!d && (typeof d.opaque === 'function' ? d.opaque(e.p) : d.opaque); }
function connects(ctx, dir, test) { const n = ctx.nb(dir); if (!n) return false; const nd = REG[n.id]; return !!nd && (test(nd, n) || fullSolid(n)); }

// ------------------------------------------------------------------ shapes
const S = {};
S.cube = (p, ctx, d) => ({ els:[B([0,0,0], [16,16,16], six(f => texOf(d, f)))] });
S.column = (p, ctx, d) => { const ax = p.axis || 'y';
  return { els:S.cube(p, ctx, d).els, x: ax === 'y' ? 0 : 90, y: ax === 'x' ? 90 : 0 }; };
S.slab = (p, ctx, d) => { const ty = p.type || 'bottom';
  if (ty === 'double') return S.cube(p, ctx, d);
  return { els:[B([0, ty === 'top' ? 8 : 0, 0], [16, ty === 'top' ? 16 : 8, 16], six(f => texOf(d, f)))] }; };
const isStairs = e => e && REG[e.id] && REG[e.id].shape === S.stairs;
function stairsShape(p, ctx) {
  const facing = p.facing || 'north', half = p.half || 'bottom', st = e => ({ f:e.p.facing || 'north', h:e.p.half || 'bottom' });
  const axis = f => (f === 'north' || f === 'south') ? 'z' : 'x';
  const canTake = dir => { const n = ctx.nb(dir); if (!isStairs(n)) return true; const s = st(n); return s.f !== facing || s.h !== half; };
  const b1 = ctx.nb(facing);
  if (isStairs(b1)) { const s = st(b1); if (s.h === half && axis(s.f) !== axis(facing) && canTake(OPP[s.f])) return s.f === ccwOf(facing) ? 'outer_left' : 'outer_right'; }
  const b2 = ctx.nb(OPP[facing]);
  if (isStairs(b2)) { const s = st(b2); if (s.h === half && axis(s.f) !== axis(facing) && canTake(s.f)) return s.f === ccwOf(facing) ? 'inner_left' : 'inner_right'; }
  return 'straight';
}
S.stairs = (p, ctx, d) => {
  const half = p.half || 'bottom', facing = p.facing || 'north', shape = p.shape || stairsShape(p, ctx), F = six(f => texOf(d, f));
  const els = [B([0,0,0], [16,8,16], F)];
  if (shape === 'straight') els.push(B([8,8,0], [16,16,16], F));
  else if (shape.startsWith('outer')) els.push(B([8,8,8], [16,16,16], F));
  else els.push(B([8,8,0], [16,16,16], F), B([0,8,8], [8,16,16], F));
  let y = { east:0, south:90, west:180, north:270 }[facing];
  if (shape.endsWith('left')) y += 270;
  if (half === 'top' && shape !== 'straight') y += 90;
  return { els, x: half === 'top' ? 180 : 0, y: y % 360, uvlock:true };
};
const armDirs = ['north', 'east', 'south', 'west'];
S.fence = (p, ctx, d) => {
  const t = texOf(d, 'side'), els = [B([6,0,6], [10,16,10], six(t))];
  for (const dir of armDirs) if (connects(ctx, dir, nd => nd.fam === d.fam || nd.shape === S.gate))
    for (const [y0, y1] of [[12,15], [6,9]]) els.push(turnBox(B([7,y0,0], [9,y1,6], six(t)), 0, YROT[dir]));
  return { els };
};
S.wall = (p, ctx, d) => {
  const t = texOf(d, 'side'), C = {};
  for (const dir of armDirs) C[dir] = connects(ctx, dir, nd => nd.shape === S.wall || nd.shape === S.pane || nd.shape === S.gate);
  const straight = (C.north && C.south && !C.east && !C.west) || (C.east && C.west && !C.north && !C.south);
  const up = ctx.nb('up'), post = !straight || (up && REG[up.id] && REG[up.id].shape !== S.cross && up.id !== 'air');
  const tall = up && (REG[up.id].shape === S.wall || fullSolid(up)) ? 16 : 14;
  const els = post ? [B([4,0,4], [12,16,12], six(t))] : [];
  for (const dir of armDirs) if (C[dir]) els.push(turnBox(B([5,0,0], [11,tall,8], six(t)), 0, YROT[dir]));
  if (!els.length) els.push(B([4,0,4], [12,16,12], six(t)));
  return { els };
};
S.pane = (p, ctx, d) => {
  const t = d.tex.pane || d.tex, edge = d.tex.edge || t, C = {};
  for (const dir of armDirs) C[dir] = connects(ctx, dir, nd => nd.shape === S.pane || nd.shape === S.wall);
  const pf = { up:{ t:edge }, down:{ t:edge } };
  for (const dir of armDirs) if (!C[dir]) pf[dir] = { t: Object.values(C).some(Boolean) ? edge : t };
  const els = [B([7,0,7], [9,16,9], pf)];
  for (const dir of armDirs) if (C[dir]) els.push(turnBox(B([7,0,0], [9,16,7], { west:{ t }, east:{ t }, up:{ t:edge }, down:{ t:edge }, north:{ t:edge } }), 0, YROT[dir]));
  return { els };
};
S.gate = (p, ctx, d) => { const t = texOf(d, 'side'), F = six(t), els = [];
  els.push(B([0,5,7], [2,16,9], F), B([14,5,7], [16,16,9], F));
  if (!p.open) els.push(B([6,6,7], [8,15,9], F), B([8,6,7], [10,15,9], F), B([2,6,7], [6,9,9], F), B([2,12,7], [6,15,9], F), B([10,6,7], [14,9,9], F), B([10,12,7], [14,15,9], F));
  else els.push(B([0,6,9], [2,15,13], F), B([14,6,9], [16,15,13], F), B([0,6,13], [2,9,15], F), B([14,6,13], [16,9,15], F), B([0,12,13], [2,15,15], F), B([14,12,13], [16,15,15], F));
  return { els, y: YROT[p.facing || 'north'], uvlock:true }; };
S.carpet = (p, ctx, d) => ({ els:[B([0,0,0], [16,1,16], six(f => texOf(d, f)))] });
S.cross = (p, ctx, d) => { const t = texOf(d, 'side'), q = (a, b) => ({ quad:[[a[0],16,a[1]], [b[0],16,b[1]], [b[0],0,b[1]], [a[0],0,a[1]]], uv:[[0,0],[16,0],[16,16],[0,16]], t, n:norm3([b[1]-a[1], 0, a[0]-b[0]]) });
  return { els:[q([.8,.8], [15.2,15.2]), q([.8,15.2], [15.2,.8])] }; };
S.vine = (p, ctx, d) => { const t = texOf(d, 'side'), els = [], o = .8;
  const Q = (P, n) => ({ quad:P, uv:[[0,0],[16,0],[16,16],[0,16]], t, n });
  if (p.north) els.push(Q([[16,16,o],[0,16,o],[0,0,o],[16,0,o]], [0,0,1]));
  if (p.south) els.push(Q([[0,16,16-o],[16,16,16-o],[16,0,16-o],[0,0,16-o]], [0,0,-1]));
  if (p.west) els.push(Q([[o,16,0],[o,16,16],[o,0,16],[o,0,0]], [1,0,0]));
  if (p.east) els.push(Q([[16-o,16,16],[16-o,16,0],[16-o,0,0],[16-o,0,16]], [-1,0,0]));
  if (p.up) els.push(Q([[0,16-o,0],[16,16-o,0],[16,16-o,16],[0,16-o,16]], [0,-1,0]));
  return { els }; };
S.liquid = (p, ctx, d) => { const up = ctx.nb('up'), top = up && up.id === d.id ? 16 : 14, t = texOf(d, 'side');
  return { els:[B([0,0,0], [16,top,16], six(t))] }; };
S.lantern = (p, ctx, d) => { const t = texOf(d, 'side'), h = p.hanging ? 1 : 0, els = [
  B([5,h,5], [11,7+h,11], { down:{ t, uv:[0,9,6,15] }, up:{ t, uv:[0,9,6,15] }, north:{ t, uv:[0,2,6,9] }, south:{ t, uv:[0,2,6,9] }, west:{ t, uv:[0,2,6,9] }, east:{ t, uv:[0,2,6,9] } }),
  B([6,7+h,6], [10,9+h,10], { up:{ t, uv:[1,10,5,14] }, north:{ t, uv:[1,0,5,2] }, south:{ t, uv:[1,0,5,2] }, west:{ t, uv:[1,0,5,2] }, east:{ t, uv:[1,0,5,2] } }),
  B([6.5,9+h,8], [9.5,11+h + (h ? 4 : 0),8], { north:{ t, uv:[14,1,11,3] }, south:{ t, uv:[11,1,14,3] } }, { rot:{ axis:'y', angle:45, origin:[8,8,8] } }),
  B([8,9+h,6.5], [8,11+h + (h ? 4 : 0),9.5], { west:{ t, uv:[14,10,11,12] }, east:{ t, uv:[11,10,14,12] } }, { rot:{ axis:'y', angle:45, origin:[8,8,8] } }) ];
  return { els }; };
S.chain = (p, ctx, d) => { const t = texOf(d, 'side'), ax = p.axis || 'y', R = { axis:'y', angle:45, origin:[8,8,8] };
  const els = [B([6.5,0,8], [9.5,16,8], { north:{ t, uv:[0,0,3,16] }, south:{ t, uv:[0,0,3,16] } }, { rot:R }),
    B([8,0,6.5], [8,16,9.5], { west:{ t, uv:[3,0,6,16] }, east:{ t, uv:[3,0,6,16] } }, { rot:R })];
  return { els, x: ax === 'y' ? 0 : 90, y: ax === 'x' ? 90 : 0 }; };
const CANDLE_AT = { 1:[[7,7,6]], 2:[[5,7,6],[9,6,5]], 3:[[7,5,6],[5,9,5],[9,9,4]], 4:[[5,5,6],[9,5,5],[5,9,4],[9,8,3]] };
S.candle = (p, ctx, d) => { const n = Math.min(4, Math.max(1, p.candles || 1)), t = p.lit ? d.tex.lit : d.tex.side, els = [];
  for (const [x, z, h] of CANDLE_AT[n]) {
    const s = { t, uv:[0, 8, 2, 8 + h] };
    els.push(B([x,0,z], [x+2,h,z+2], { up:{ t, uv:[0,6,2,8] }, down:{ t, uv:[0,14,2,16] }, north:s, south:s, west:s, east:s }));
    els.push(B([x+.5,h,z+1], [x+1.5,h+1,z+1], { north:{ t, uv:[0,5,1,6] }, south:{ t, uv:[0,5,1,6] } }));
    if (p.lit) { const ft = 'ce:flame', g = 3.2;
      els.push(B([x,h+.5,z+1], [x+2,h+3.5,z+1], { north:{ t:ft, glow:g }, south:{ t:ft, glow:g } }), B([x+1,h+.5,z], [x+1,h+3.5,z+2], { west:{ t:ft, glow:g }, east:{ t:ft, glow:g } })); }
  }
  return { els }; };
S.torch = (p, ctx, d) => { const t = texOf(d, 'side'), s = { t, uv:[7,6,9,16] };
  const F = { up:{ t, uv:[7,6,9,8] }, down:{ t, uv:[7,14,9,16] }, north:s, south:s, west:s, east:s };
  if (!p.facing) return { els:[B([7,0,7], [9,10,9], F)] };
  return { els:[B([7,3.5,13], [9,13.5,15], F, { rot:{ axis:'x', angle:-22.5, origin:[8,3.5,16] } })], y: YROT[p.facing] }; };
S.door = (p, ctx, d) => { const t = p.half === 'upper' ? d.tex.top : d.tex.bottom, m = p.hinge === 'right';
  const U = (a, b, c, e) => m ? [c, b, a, e] : [a, b, c, e];
  const els = [B([0,0,0], [3,16,16], { west:{ t, uv:U(16,0,0,16) }, east:{ t, uv:U(0,0,16,16) }, north:{ t, uv:[3,0,0,16] }, south:{ t, uv:[0,0,3,16] },
    up:{ t, uv:[13,0,16,16], rot:90 }, down:{ t, uv:[13,0,16,16], rot:90 } })];
  let y = { east:0, south:90, west:180, north:270 }[p.facing || 'east'];
  if (p.open) y += m ? 270 : 90;
  return { els, y: y % 360 }; };
S.trapdoor = (p, ctx, d) => { const t = texOf(d, 'side'), F = six(t);
  if (p.open) return { els:[B([0,0,13], [16,16,16], F)], y: YROT[p.facing || 'north'], uvlock:true };
  return { els:[p.half === 'top' ? B([0,13,0], [16,16,16], F) : B([0,0,0], [16,3,16], F)] }; };
S.chest = (p, ctx, d) => { const t = d.tex.entity, ts = 64;
  const lock = cuboid(0, 0, 2, 4, 1, ts, t), lid = cuboid(0, 0, 14, 5, 14, ts, t), body = cuboid(0, 19, 14, 10, 14, ts, t);
  return { els:[B([1,0,1], [15,10,15], body), B([1,9,1], [15,14,15], lid, { part:'lid' }), B([7,7,15], [9,11,16], lock, { part:'lid' })],
    y: ({ south:0, west:90, north:180, east:270 })[p.facing || 'south'] }; };
S.bell = (p, ctx, d) => { const bt = d.tex.body, ts = 32, att = p.attachment || 'floor';
  const els = [B([5,6,5], [11,13,11], cuboid(0, 0, 6, 7, 6, ts, bt), { part:'body' }), B([4,4,4], [12,6,12], cuboid(0, 13, 8, 2, 8, ts, bt), { part:'body' })];
  if (att === 'floor') els.push(B([1,0,6], [3,16,10], six(d.tex.post)), B([13,0,6], [15,16,10], six(d.tex.post)), B([3,13,7], [13,15,9], six(d.tex.bar)));
  else if (att === 'ceiling') els.push(B([7,13,7], [9,16,9], six(d.tex.bar)));
  else els.push(B([7,13,0], [9,15,13], six(d.tex.bar)));
  return { els, y: YROT[p.facing || 'north'] }; };
S.banner = (p, ctx, d) => { const t = d.tex.entity, ts = 64;
  const flag = cuboid(0, 0, 20, 40, 1, ts, t, false), bar = cuboid(0, 42, 20, 2, 2, ts, t, false);
  return { els:[B([-2,-26,1], [18,14,2], flag), B([-2,14,0], [18,16,2], bar)], y: ({ south:0, west:90, north:180, east:270 })[p.facing || 'south'] }; };
S.campfire = (p, ctx, d) => { const lit = p.lit !== false, log = lit ? d.tex.lit : d.tex.log;
  const els = [B([1,0,0], [5,4,16], six(log)), B([11,0,0], [15,4,16], six(log)), B([0,3,1], [16,7,5], six(log)), B([0,3,11], [16,7,15], six(log)), B([5,0,0], [11,1,16], six(d.tex.log))];
  if (lit) { const t = d.tex.fire, g = 2.6, q = (a, b, n) => ({ quad:[[a[0],16,a[1]], [b[0],16,b[1]], [b[0],0,b[1]], [a[0],0,a[1]]], uv:[[0,0],[16,0],[16,16],[0,16]], t, n, glow:g });
    els.push(q([.8,.8], [15.2,15.2], [.7,0,-.7]), q([.8,15.2], [15.2,.8], [.7,0,.7])); }
  return { els, y: YROT[p.facing || 'north'] }; };
// our anchors: models that move are parts; the anchor block itself sits in one cell
S.armillary = (p, ctx, d) => { const t = d.tex.ring, els = [B([5,5,5], [11,11,11], six(d.tex.core), { glowAwake:3 })];
  const ring = (rad, plane, part, n) => { for (let i = 0; i < n; i++) { const a = i/n*Math.PI*2, c = 8 + Math.cos(a)*rad, s = Math.sin(a)*rad, q = 1.5;
    const ctr = plane === 'xz' ? [c, 8, 8 + s] : [c, 8 + s, 8];
    els.push(B([ctr[0]-q, ctr[1]-q, ctr[2]-q], [ctr[0]+q, ctr[1]+q, ctr[2]+q], six(t), { part })); } };
  ring(43, 'xz', 'ringA', 64); ring(37, 'xy', 'ringB', 56); ring(31, 'xz', 'ringC', 48);
  return { els }; };
S.clockHands = (p, ctx, d) => { const t = d.tex.hand;
  return { els:[B([0,0,0], [16,16,16], six(d.tex.face)), B([7.4,8,16], [8.6,30,16.8], six(t), { part:'minute' }), B([7.2,8,16.8], [8.8,22,17.6], six(t), { part:'hour' }), B([6.5,6.5,16], [9.5,9.5,18], six(t))],
    y: ({ south:0, west:90, north:180, east:270 })[p.facing || 'south'] }; };
const norm3 = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };

// ------------------------------------------------------------------ registry
const REG = {};
function reg(id, def) { REG[id] = Object.assign({ id, shape:S.cube, render:'solid', opaque:true, light:0, glow:0, lightAwake:0, glowAwake:0, lightColor:'warm' }, def); }
const GRASS = '#91BD59', FOLIAGE = '#77AB2F', WATER = '#3F76E4';
const DYES = { white:'F9FFFE', orange:'F9801D', magenta:'C74EBD', light_blue:'3AB3DA', yellow:'FED83D', lime:'80C71F', pink:'F38BAA', gray:'474F52',
  light_gray:'9D9D97', cyan:'169C9C', purple:'8932B8', blue:'3C44AA', brown:'835432', green:'5E7C16', red:'B02E26', black:'1D1D21' };
const cube = (id, tex, more) => reg(id, { tex: tex || 'block/' + id, ...more });
const nonFull = { opaque:false };
const stairs = (id, tex) => reg(id, { shape:S.stairs, tex, ...nonFull });
const slab = (id, tex) => reg(id, { shape:S.slab, tex, opaque:p => p.type === 'double' });
const wall = (id, tex) => reg(id, { shape:S.wall, tex, ...nonFull });

// stone-like families: [block, texture(s), stairs/slab/wall base name or null, has wall]
const FAM = [
  ['stone', 'block/stone', 'stone', false], ['cobblestone', 'block/cobblestone', 'cobblestone', true], ['mossy_cobblestone', 'block/mossy_cobblestone', 'mossy_cobblestone', true],
  ['stone_bricks', 'block/stone_bricks', 'stone_brick', true], ['mossy_stone_bricks', 'block/mossy_stone_bricks', 'mossy_stone_brick', true],
  ['granite', 'block/granite', 'granite', true], ['polished_granite', 'block/polished_granite', 'polished_granite', false],
  ['diorite', 'block/diorite', 'diorite', true], ['polished_diorite', 'block/polished_diorite', 'polished_diorite', false],
  ['andesite', 'block/andesite', 'andesite', true], ['polished_andesite', 'block/polished_andesite', 'polished_andesite', false],
  ['cobbled_deepslate', 'block/cobbled_deepslate', 'cobbled_deepslate', true], ['polished_deepslate', 'block/polished_deepslate', 'polished_deepslate', true],
  ['deepslate_bricks', 'block/deepslate_bricks', 'deepslate_brick', true], ['deepslate_tiles', 'block/deepslate_tiles', 'deepslate_tile', true],
  ['blackstone', { side:'block/blackstone', top:'block/blackstone_top' }, 'blackstone', true], ['polished_blackstone', 'block/polished_blackstone', 'polished_blackstone', true],
  ['polished_blackstone_bricks', 'block/polished_blackstone_bricks', 'polished_blackstone_brick', true],
  ['tuff', 'block/tuff', 'tuff', true], ['polished_tuff', 'block/polished_tuff', 'polished_tuff', true], ['tuff_bricks', 'block/tuff_bricks', 'tuff_brick', true],
  ['bricks', 'block/bricks', 'brick', true], ['mud_bricks', 'block/mud_bricks', 'mud_brick', true],
  ['nether_bricks', 'block/nether_bricks', 'nether_brick', true], ['red_nether_bricks', 'block/red_nether_bricks', 'red_nether_brick', true],
  ['sandstone', { side:'block/sandstone', top:'block/sandstone_top', bottom:'block/sandstone_bottom' }, 'sandstone', true],
  ['smooth_sandstone', 'block/sandstone_top', 'smooth_sandstone', false],
  ['red_sandstone', { side:'block/red_sandstone', top:'block/red_sandstone_top', bottom:'block/red_sandstone_bottom' }, 'red_sandstone', true],
  ['quartz_block', { side:'block/quartz_block_side', top:'block/quartz_block_top', bottom:'block/quartz_block_bottom' }, 'quartz', false],
  ['smooth_quartz', 'block/quartz_block_bottom', 'smooth_quartz', false],
  ['end_stone_bricks', 'block/end_stone_bricks', 'end_stone_brick', true], ['purpur_block', 'block/purpur_block', 'purpur', false],
  ['prismarine', 'block/prismarine', 'prismarine', true], ['prismarine_bricks', 'block/prismarine_bricks', 'prismarine_brick', false], ['dark_prismarine', 'block/dark_prismarine', 'dark_prismarine', false],
  ['resin_bricks', 'block/resin_bricks', 'resin_brick', true],
];
for (const [id, tex, base, hasWall] of FAM) { cube(id, tex); if (!base) continue;
  stairs(base + '_stairs', tex); slab(base + '_slab', tex); if (hasWall) wall(base + '_wall', typeof tex === 'string' ? tex : tex.side); }
reg('smooth_stone', { tex:'block/smooth_stone' }); slab('smooth_stone_slab', { side:'block/smooth_stone_slab_side', top:'block/smooth_stone', bottom:'block/smooth_stone' });
for (const id of ['cracked_stone_bricks', 'chiseled_stone_bricks', 'cracked_deepslate_bricks', 'cracked_deepslate_tiles', 'chiseled_deepslate', 'calcite', 'dripstone_block',
  'gilded_blackstone', 'chiseled_polished_blackstone', 'cracked_polished_blackstone_bricks', 'obsidian', 'gold_block', 'iron_block', 'copper_block', 'exposed_copper',
  'weathered_copper', 'oxidized_copper', 'cut_copper', 'exposed_cut_copper', 'weathered_cut_copper', 'oxidized_cut_copper', 'chiseled_copper', 'oxidized_chiseled_copper',
  'coal_block', 'netherite_block', 'amethyst_block', 'quartz_bricks', 'chiseled_tuff', 'chiseled_tuff_bricks', 'chiseled_resin_bricks', 'cracked_nether_bricks', 'chiseled_nether_bricks',
  'dirt', 'coarse_dirt', 'rooted_dirt', 'mud', 'packed_mud', 'gravel', 'sand', 'red_sand', 'clay', 'moss_block', 'snow_block', 'netherrack', 'soul_sand', 'soul_soil',
  'smooth_basalt', 'tinted_glass', 'nether_wart_block', 'packed_ice', 'blue_ice', 'sculk', 'terracotta', 'pale_moss_block', 'end_stone', 'deepslate_coal_ore', 'mossy_cobblestone'])
  if (!REG[id]) cube(id);
for (const c of ['copper', 'exposed', 'weathered', 'oxidized']) { const cc = c === 'copper' ? 'cut_copper' : c + '_cut_copper'; stairs(cc + '_stairs', 'block/' + cc); slab(cc + '_slab', 'block/' + cc); }
REG.tinted_glass.render = 'translucent'; REG.tinted_glass.opaque = false; REG.tinted_glass.cullSame = true;
cube('crying_obsidian', null, { light:10, glow:.6 });
cube('glowstone', null, { light:15, glow:1.1 }); cube('sea_lantern', null, { light:15, glow:1.1 }); cube('shroomlight', null, { light:15, glow:.9 });
cube('magma_block', 'block/magma', { light:3, glow:.9 });
cube('redstone_lamp', null); cube('redstone_lamp_on', 'block/redstone_lamp_on', { light:15, glow:1.2 });
reg('deepslate', { shape:S.column, tex:{ side:'block/deepslate', end:'block/deepslate_top' } });
reg('quartz_pillar', { shape:S.column, tex:{ side:'block/quartz_pillar', end:'block/quartz_pillar_top' } });
reg('chiseled_quartz_block', { tex:{ side:'block/chiseled_quartz_block', end:'block/chiseled_quartz_block_top' } });
reg('chiseled_sandstone', { tex:{ side:'block/chiseled_sandstone', end:'block/sandstone_top' } });
reg('hay_block', { shape:S.column, tex:{ side:'block/hay_block_side', end:'block/hay_block_top' } });
reg('bone_block', { shape:S.column, tex:{ side:'block/bone_block_side', end:'block/bone_block_top' } });
reg('basalt', { shape:S.column, tex:{ side:'block/basalt_side', end:'block/basalt_top' } });
reg('polished_basalt', { shape:S.column, tex:{ side:'block/polished_basalt_side', end:'block/polished_basalt_top' } });
reg('purpur_pillar', { shape:S.column, tex:{ side:'block/purpur_pillar', end:'block/purpur_pillar_top' } });
reg('bookshelf', { tex:{ side:'block/bookshelf', end:'block/oak_planks' } });
reg('crafting_table', { tex:{ north:'block/crafting_table_front', south:'block/crafting_table_side', east:'block/crafting_table_side', west:'block/crafting_table_front', top:'block/crafting_table_top', bottom:'block/oak_planks' } });
reg('grass_block', { tex:{ top:'block/grass_block_top' + GRASS, side:'block/grass_block_side+block/grass_block_side_overlay' + GRASS, bottom:'block/dirt' } });
reg('podzol', { tex:{ top:'block/podzol_top', side:'block/podzol_side', bottom:'block/dirt' } });
reg('mycelium', { tex:{ top:'block/mycelium_top', side:'block/mycelium_side', bottom:'block/dirt' } });
reg('dirt_path', { shape:(p, c, d) => ({ els:[B([0,0,0], [16,15,16], six(f => texOf(d, f)))] }), opaque:false, tex:{ top:'block/dirt_path_top', side:'block/dirt_path_side', bottom:'block/dirt' } });
reg('glass', { tex:'block/glass', render:'cutout', opaque:false, cullSame:true });
reg('glass_pane', { shape:S.pane, tex:{ pane:'block/glass', edge:'block/glass_pane_top' }, render:'cutout', opaque:false });
reg('iron_bars', { shape:S.pane, tex:{ pane:'block/iron_bars', edge:'block/iron_bars' }, render:'cutout', opaque:false });
reg('ice', { tex:'block/ice', render:'translucent', opaque:false, cullSame:true });
for (const c in DYES) {
  cube(c + '_wool'); cube(c + '_concrete'); cube(c + '_terracotta'); cube(c + '_glazed_terracotta');
  reg(c + '_carpet', { shape:S.carpet, tex:'block/' + c + '_wool', ...nonFull });
  reg(c + '_stained_glass', { tex:'block/' + c + '_stained_glass', render:'translucent', opaque:false, cullSame:true });
  reg(c + '_stained_glass_pane', { shape:S.pane, tex:{ pane:'block/' + c + '_stained_glass', edge:'block/' + c + '_stained_glass_pane_top' }, render:'translucent', opaque:false });
  reg(c + '_candle', { shape:S.candle, tex:{ side:'block/' + c + '_candle', lit:'block/' + c + '_candle_lit' }, render:'cutout', ...nonFull, light:p => p.lit ? 3*(p.candles || 1) : 0 });
  reg(c + '_wall_banner', { shape:S.banner, tex:{ entity:'entity/banner_base#' + DYES[c] }, ...nonFull });
}
reg('moss_carpet', { shape:S.carpet, tex:'block/moss_block', ...nonFull });
reg('pale_moss_carpet', { shape:S.carpet, tex:'block/pale_moss_carpet|block/pale_moss_block', ...nonFull });
reg('snow', { shape:(p, c, d) => ({ els:[B([0,0,0], [16,2*(p.layers || 1),16], six('block/snow'))] }), ...nonFull });

// woods
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak', 'mangrove', 'cherry', 'pale_oak', 'crimson', 'warped'];
const LEAF_TINT = { oak:FOLIAGE, jungle:FOLIAGE, acacia:FOLIAGE, dark_oak:FOLIAGE, mangrove:'#92C648', spruce:'#619961', birch:'#80A755' };
for (const w of WOODS) {
  const nether = w === 'crimson' || w === 'warped', log = nether ? w + '_stem' : w + '_log', wood = nether ? w + '_hyphae' : w + '_wood', pl = 'block/' + w + '_planks';
  cube(w + '_planks', pl);
  reg(log, { shape:S.column, tex:{ side:'block/' + log, end:'block/' + log + '_top' } });
  reg('stripped_' + log, { shape:S.column, tex:{ side:'block/stripped_' + log, end:'block/stripped_' + log + '_top' } });
  reg(wood, { shape:S.column, tex:'block/' + log }); reg('stripped_' + wood, { shape:S.column, tex:'block/stripped_' + log });
  stairs(w + '_stairs', pl); slab(w + '_slab', pl);
  reg(w + '_fence', { shape:S.fence, tex:pl, fam:'wood_fence', ...nonFull });
  reg(w + '_fence_gate', { shape:S.gate, tex:pl, ...nonFull });
  reg(w + '_door', { shape:S.door, tex:{ top:'block/' + w + '_door_top', bottom:'block/' + w + '_door_bottom' }, render:'cutout', ...nonFull });
  reg(w + '_trapdoor', { shape:S.trapdoor, tex:'block/' + w + '_trapdoor', render:'cutout', ...nonFull });
  if (!nether) reg(w + '_leaves', { tex:'block/' + w + '_leaves' + (LEAF_TINT[w] || ''), render:'cutout', opaque:false, damp:1 });
}
reg('azalea_leaves', { tex:'block/azalea_leaves', render:'cutout', opaque:false, damp:1 });
reg('flowering_azalea_leaves', { tex:'block/flowering_azalea_leaves', render:'cutout', opaque:false, damp:1 });
reg('nether_brick_fence', { shape:S.fence, tex:'block/nether_bricks', fam:'nether_fence', ...nonFull });
reg('iron_door', { shape:S.door, tex:{ top:'block/iron_door_top', bottom:'block/iron_door_bottom' }, render:'cutout', ...nonFull });
reg('iron_trapdoor', { shape:S.trapdoor, tex:'block/iron_trapdoor', render:'cutout', ...nonFull });

// light, small things, plants
reg('lantern', { shape:S.lantern, tex:'block/lantern', render:'cutout', ...nonFull, light:15, glow:1.6 });
reg('soul_lantern', { shape:S.lantern, tex:'block/soul_lantern', render:'cutout', ...nonFull, light:10, glow:1.6 });
reg('iron_chain', { shape:S.chain, tex:'block/iron_chain|block/chain', render:'cutout', ...nonFull });
REG.chain = REG.iron_chain;
reg('candle', { shape:S.candle, tex:{ side:'block/candle', lit:'block/candle_lit' }, render:'cutout', ...nonFull, light:p => p.lit ? 3*(p.candles || 1) : 0 });
reg('torch', { shape:S.torch, tex:'block/torch', render:'cutout', ...nonFull, light:14, glow:1.6 });
reg('wall_torch', { shape:S.torch, tex:'block/torch', render:'cutout', ...nonFull, light:14, glow:1.6 });
reg('soul_torch', { shape:S.torch, tex:'block/soul_torch', render:'cutout', ...nonFull, light:10, glow:1.6 });
reg('campfire', { shape:S.campfire, tex:{ log:'block/campfire_log', lit:'block/campfire_log_lit', fire:'block/campfire_fire' }, render:'cutout', ...nonFull, light:p => p.lit === false ? 0 : 15 });
reg('soul_campfire', { shape:S.campfire, tex:{ log:'block/campfire_log', lit:'block/soul_campfire_log_lit', fire:'block/soul_campfire_fire' }, render:'cutout', ...nonFull, light:p => p.lit === false ? 0 : 10 });
reg('barrel', { tex:{ top:'block/barrel_top', side:'block/barrel_side', bottom:'block/barrel_bottom' } });
reg('chest', { shape:S.chest, tex:{ entity:'entity/chest/normal' }, ...nonFull });
reg('bell', { shape:S.bell, tex:{ body:'entity/bell/bell_body', post:'block/stone', bar:'block/dark_oak_planks' }, ...nonFull });
reg('cobweb', { shape:S.cross, tex:'block/cobweb', render:'cutout', ...nonFull });
reg('vine', { shape:S.vine, tex:'block/vine' + FOLIAGE, render:'cutout', ...nonFull });
reg('water', { shape:S.liquid, tex:'block/water_still' + WATER, render:'translucent', opaque:false, cullSame:true, damp:1 });
reg('lava', { shape:S.liquid, tex:'block/lava_still', render:'solid', opaque:false, cullSame:true, light:15, glow:1.4 });
for (const id of ['short_grass', 'fern']) reg(id, { shape:S.cross, tex:'block/' + id + GRASS, render:'cutout', ...nonFull });
for (const id of ['dead_bush', 'poppy', 'dandelion', 'cornflower', 'azure_bluet', 'oxeye_daisy', 'allium', 'lily_of_the_valley', 'red_tulip', 'white_tulip', 'wither_rose',
  'brown_mushroom', 'red_mushroom', 'sweet_berry_bush_stage0', 'crimson_roots', 'warped_roots', 'nether_sprouts', 'torchflower', 'closed_eyeblossom', 'open_eyeblossom'])
  reg(id, { shape:S.cross, tex:'block/' + id, render:'cutout', ...nonFull });
REG.open_eyeblossom.glowAwake = 0; REG.open_eyeblossom.glow = .8;

// ------------------------------------------------------------------ ours (crimson_eclipse:)
const ours = (id, def) => reg('crimson_eclipse:' + id, { lightColor:'red', ...def });
ours('crimson_crystal', { tex:'ce:crimson_crystal', glow:.12, glowAwake:2.2, lightAwake:13 });
ours('crimson_crystal_cluster', { shape:S.cross, tex:'ce:crimson_crystal_cluster', render:'cutout', ...nonFull, glow:.15, glowAwake:2.6, lightAwake:9 });
ours('eclipse_glass', { tex:'ce:eclipse_glass', render:'translucent', opaque:false, cullSame:true, glow:.05, glowAwake:1.8, lightAwake:9 });
ours('eclipse_eye', { tex:'ce:eclipse_eye', glow:.05, glowAwake:4.5, lightAwake:15 });
ours('moon_lens', { tex:'ce:moon_lens', glow:.05, glowAwake:6, lightAwake:12 });
ours('vigil_lantern', { shape:S.lantern, tex:'ce:vigil_lantern', render:'cutout', ...nonFull, glowAwake:2.4, lightAwake:13 });
ours('crimson_vein', { tex:'ce:crimson_vein', glow:.05, glowAwake:2.2, lightAwake:5 });
ours('rune_stone',{ tex:'ce:rune_stone', glowAwake:2.5, lightAwake:7 });
ours('blood_water', { shape:S.liquid, tex:'ce:blood_water', render:'translucent', opaque:false, cullSame:true, glow:.4, light:8, damp:1 });
ours('armillary', { shape:S.armillary, tex:{ ring:'ce:brass', core:'ce:crimson_crystal' }, ...nonFull, lightAwake:12 });
ours('vigil_clock', { shape:S.clockHands, tex:{ hand:'block/black_concrete', face:'block/calcite' }, ...nonFull });

// ------------------------------------------------------------------ state strings: "oak_stairs[facing=east,half=top]"
function parseState(s) {
  const m = /^(?:minecraft:)?([a-z0-9_:]+)(?:\[(.*)\])?$/.exec(String(s).trim());
  if (!m) throw new Error('Bad block state: ' + s);
  const props = {};
  if (m[2]) for (const kv of m[2].split(',')) { if (!kv.trim()) continue; const [k, v] = kv.split('=').map(x => x.trim());
    props[k] = v === 'true' ? true : v === 'false' ? false : /^-?\d+(\.\d+)?$/.test(v) ? +v : v; }
  return { id:m[1], props };
}
function stateString(id, props) { const k = Object.keys(props || {}); const ns = id.includes(':') ? id : 'minecraft:' + id;
  return k.length ? `${ns}[${k.map(x => x + '=' + props[x]).join(',')}]` : ns; }

CE.blocks = { REG, S, FACES, DIRV, HORIZ, OPP, bake, parseState, stateString, fullSolid, DYES, GRASS, FOLIAGE };
})();
