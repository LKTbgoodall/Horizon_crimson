// Crimson Eclipse preview engine: the world (a grid of blocks), building helpers, Minecraft-style light and the mesher.
// The grid rule is enforced here: W.set() refuses anything that is not on integer coordinates.
'use strict';
(function () {
const CE = window.CE = window.CE || {};
const { REG, S, bake, parseState, stateString, DIRV, FACES, fullSolid } = CE.blocks;

// ------------------------------------------------------------------ small maths
const ss = (a, b, x) => { x = Math.min(1, Math.max(0, (x-a)/(b-a))); return x*x*(3-2*x); };
function hash3(x, y, z) { let h = (Math.imul(x|0, 374761393) + Math.imul(y|0, 668265263) + Math.imul(z|0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const s = t => t*t*(3-2*t), u = s(x-xi), v = s(y-yi), w = s(z-zi), h = (a, b, c) => hash3(xi+a, yi+b, zi+c), l = (a, b, t) => a + (b-a)*t;
  return l(l(l(h(0,0,0), h(1,0,0), u), l(h(0,1,0), h(1,1,0), u), v), l(l(h(0,0,1), h(1,0,1), u), l(h(0,1,1), h(1,1,1), u), v), w); }
CE.math = { ss, hash3, vnoise };

// ------------------------------------------------------------------ the world
const KEY = (x, y, z) => (x + 1024)*4194304 + (y + 1024)*2048 + (z + 1024);
const isInt = v => Number.isInteger(v);
CE.World = function () {
  const M = new Map(), ENT = [], LIGHTS = [], PARTS = [];
  const toState = s => typeof s === 'string' ? parseState(s) : s;
  return { M, ENT, LIGHTS, PARTS,
    // opts: g (moving group), d (awakening delay, s), awake (state string, 'air', or props to change at night), parts ({part: group})
    set(x, y, z, state, opts = {}) {
      if (!isInt(x) || !isInt(y) || !isInt(z)) throw new Error(`Off the block grid: ${typeof state === 'string' ? state : state.id} at (${x}, ${y}, ${z}). A block sits in exactly one cell.`);
      const s = toState(state);
      if (s.id === 'air') { M.delete(KEY(x, y, z)); return null; }
      if (!REG[s.id]) throw new Error('Unknown block: ' + s.id);
      let awake = null;
      if (opts.awake) { awake = typeof opts.awake === 'string' ? parseState(opts.awake) : { id:s.id, props:{ ...s.props, ...opts.awake } };
        if (awake.id !== 'air' && !REG[awake.id]) throw new Error('Unknown block: ' + awake.id); }
      const e = { x, y, z, id:s.id, p:{ ...s.props }, g:opts.g || 0, d:opts.d || 0, awake, parts:opts.parts || null };
      M.set(KEY(x, y, z), e); return e;
    },
    get(x, y, z) { return M.get(KEY(x, y, z)); },
    del(x, y, z) { M.delete(KEY(x, y, z)); },
    box(x0, y0, z0, x1, y1, z1, state, opts) { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.set(x, y, z, state, opts); },
    // two-block doors: both halves at once
    door(x, y, z, id, props = {}, opts = {}) { for (const [dy, half] of [[0, 'lower'], [1, 'upper']]) this.set(x, y+dy, z, { id, props:{ ...props, half } }, opts); },
    figure(x, y, z) { if (!isInt(x) || !isInt(y) || !isInt(z)) throw new Error('The player figure stands in a cell too'); ENT.push({ kind:'figure', x, y, z }); },
    light(p, c, rad, d, grp = 0) { LIGHTS.push({ p, c, rad, d, grp }); },
    part(x, y, z, kind, ph, size, d, ex, r, g, b) { PARTS.push(x, y, z, kind, ph, size, d, ex, r, g, b); },
  };
};

// ------------------------------------------------------------------ building kit
const K = CE.kit = {};
K.dropRubble = (W, x, y, z, state) => { let yy = y; while (yy > -2 && !W.get(x, yy-1, z)) yy--; if (!W.get(x, yy, z)) W.set(x, yy, z, state); };
// remove what `test` picks (static blocks only); some of it falls as rubble below
K.collapse = (W, test, rubble = 'cobblestone', chance = .35) => {
  const gone = []; for (const e of W.M.values()) if (e.g === 0 && test(e)) gone.push(e);
  for (const e of gone) W.del(e.x, e.y, e.z);
  for (const e of gone) if (e.y > 2 && hash3(e.x+11, e.y, e.z) < chance)
    K.dropRubble(W, e.x + Math.round((hash3(e.x, e.y+5, e.z)-.5)*3), e.y, e.z + Math.round((hash3(e.x, e.y, e.z+5)-.5)*3), typeof rubble === 'function' ? rubble(e) : rubble);
};
// age: rules {id: (e, noise, rnd) => new id or null}
K.weather = (W, rules) => { for (const e of W.M.values()) { if (e.g || !rules[e.id]) continue;
  const id = rules[e.id](e, vnoise(e.x*.21+3, e.y*.21, e.z*.21), hash3(e.x, e.y, e.z)); if (id) e.id = id; } };
// vines hang from walls down into the air cells next to them, one vine block per cell
K.vines = (W, test, chance, seed) => { const D = [[1,0,'west'], [-1,0,'east'], [0,1,'north'], [0,-1,'south']];
  for (const e of [...W.M.values()]) { if (e.y < 3 || e.g || !test(e) || hash3(e.x*3 + seed, e.y, e.z) > chance) continue;
    for (const [dx, dz, side] of D) { if (W.get(e.x+dx, e.y, e.z+dz)) continue;
      const len = 3 + Math.floor(hash3(e.x, e.y*7, e.z)*9);
      for (let k = 0; k < len; k++) { const y = e.y - k; if (y < 0 || !W.get(e.x, y, e.z) || W.get(e.x+dx, y, e.z+dz)) break;
        W.set(e.x+dx, y, e.z+dz, `vine[${side}=true]`); }
      break; } } };
K.terrain = (W, flat, R = 76, plants = .1) => {
  const hgt = (x, z) => { const v = 1.3*Math.sin(x*.09+z*.05) + .9*Math.sin(z*.13-x*.07+2) + .5*Math.sin(x*.31+z*.23);
    return Math.round(Math.max(-.6, v+.7) * ss(0, 16, flat(x, z))); };
  const tops = [];
  for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    const h = hgt(x, z); let lo = h;
    for (const [dx, dz] of [[1,0], [-1,0], [0,1], [0,-1]]) lo = Math.min(lo, hgt(x+dx, z+dz));
    for (let y = h-1; y >= Math.min(lo-1, h-1); y--) if (!W.get(x, y, z)) W.set(x, y, z, y === h-1 ? 'grass_block' : 'dirt');
    if (flat(x, z) > 2) tops.push([x, h, z]);
  }
  const P = ['short_grass', 'short_grass', 'short_grass', 'short_grass', 'fern', 'poppy', 'dandelion', 'oxeye_daisy', 'azure_bluet'];
  for (const [x, h, z] of tops) { const r = hash3(x, 77, z); if (r < plants && !W.get(x, h, z) && W.get(x, h-1, z)?.id === 'grass_block')
    W.set(x, h, z, P[Math.floor(hash3(x, 78, z)*P.length)]); }
};
K.spruce = (W, x, z, h) => { const y0 = W.get(x, 0, z) ? 1 : 0;
  for (let y = 0; y < h; y++) W.set(x, y0+y, z, 'spruce_log');
  for (let y = 3; y <= h+1; y++) { const r = Math.max(0, Math.round((h+1-y)*.42));
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++)
      if ((dx || dz || y > h-1) && Math.abs(dx)+Math.abs(dz) <= r + (y % 2) && hash3(x+dx, y, z+dz) > .12 && !W.get(x+dx, y0+y, z+dz)) W.set(x+dx, y0+y, z+dz, 'spruce_leaves'); } };
// what holds a block up, as the game checks it on a neighbour update: [direction, test] pairs it needs
const OFF = { north:[0,0,-1], south:[0,0,1], east:[1,0,0], west:[-1,0,0], up:[0,1,0], down:[0,-1,0] }, BACK = { north:'south', south:'north', east:'west', west:'east' };
const holds = b => !!b && !/carpet|candle|lantern|torch|campfire|banner|vine|ladder|cobweb|short_grass|fern|flower|chain/.test(b.id);
K.needs = e => { const id = e.id, p = e.p, n = [];
  if (/lantern/.test(id)) n.push(p.hanging ? ['up', b => holds(b) || /chain/.test(b?.id || '')] : ['down', holds]);
  else if (/candle|campfire|carpet|_cluster$/.test(id) || (/_door$/.test(id) && p.half === 'lower')) n.push(['down', holds]);
  else if (/_wall_banner$/.test(id)) n.push([BACK[p.facing || 'south'], holds]);
  else if (id === 'ladder') n.push([BACK[p.facing || 'north'], holds]);
  else if (id === 'bell') n.push([p.attachment === 'ceiling' ? 'up' : 'down', holds]);
  else if (id === 'vine') for (const d of ['north', 'south', 'east', 'west']) if (p[d]) n.push([d, holds]);
  return n; };
// the needs it lacks; `groundY`: cells at that height stand on the natural ground (not in the build)
K.unsupported = (W, e, groundY = null) => K.needs(e).filter(([dir, ok]) => { if (dir === 'down' && e.y === groundY) return false;
  const o = OFF[dir]; return !ok(W.get(e.x + o[0], e.y + o[1], e.z + o[2])); }).map(([dir]) => dir);
// take away whatever holds to nothing (repeat: a vine may hang from a carpet that goes)
K.settle = (W, groundY = null) => { let gone = 0;
  for (let changed = true; changed;) { changed = false;
    for (const e of [...W.M.values()]) if (K.unsupported(W, e, groundY).length) { W.del(e.x, e.y, e.z); gone++; changed = true; } }
  return gone; };
// size of what was built so far (call it before the terrain): [x, y, z] in blocks
K.sizeOf = W => { const a = [1e9, 1e9, 1e9], b = [-1e9, -1e9, -1e9];
  for (const e of W.M.values()) { if (e.y < 0) continue; for (const [k, v] of [[0, e.x], [1, e.y], [2, e.z]]) { a[k] = Math.min(a[k], v); b[k] = Math.max(b[k], v); } }
  return [b[0]-a[0]+1, b[1]-Math.max(a[1], 0)+1, b[2]-a[2]+1]; };
// a stepped pyramid roof: rings[k] = half-width at level y0+k; the outer cells of a ring that has a smaller ring above are stairs facing in
K.pyramid = (W, cx, cz, y0, rings, block, stairs, opts) => rings.forEach((h, k) => {
  const up = rings[k+1] ?? -1;
  for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== h) continue;
    if (h > up && h > 0) { const f = Math.abs(dx) >= Math.abs(dz) ? (dx < 0 ? 'east' : 'west') : (dz < 0 ? 'south' : 'north');
      W.set(cx+dx, y0+k, cz+dz, `${stairs}[facing=${f}]`, opts); }
    else W.set(cx+dx, y0+k, cz+dz, block, opts); } });
K.deadTree =(W, x, z, h, seed, log = 'dark_oak_log') => { for (let y = 0; y < h; y++) W.set(x, y, z, log);
  const arms = [[1,0], [-1,0], [0,1], [0,-1]];
  for (let i = 0; i < 4; i++) { const [dx, dz] = arms[Math.floor(hash3(seed, i, 3)*arms.length)]; let px = x, pz = z, py = h-4+i;
    for (let k = 0; k < 3 + Math.floor(hash3(seed, i, 9)*3); k++) { px += dx; pz += dz; if (k % 2) py++; W.set(px, py, pz, `${log}[axis=${dx ? 'x' : 'z'}]`); } } };

// ------------------------------------------------------------------ light (Minecraft levels 0..15)
// sky: 15 above everything, -1 per step sideways. Block light: warm (vanilla torches, candles, lanterns) and red (ours),
// each cell remembers the delay of the source that lights it (-1 = always on, otherwise it turns on at the awakening).
function lightVolume(W, b) {
  const X0 = b[0][0]-1, Y0 = b[0][1]-1, Z0 = b[0][2]-1, NX = b[1][0]-X0+2, NY = b[1][1]-Y0+4, NZ = b[1][2]-Z0+2, N = NX*NY*NZ;
  const SX = NY*NZ, SY = NZ, idx = (x, y, z) => (x-X0)*SX + (y-Y0)*SY + (z-Z0);
  const op = new Uint8Array(N), sky = new Uint8Array(N);
  const F = { warm:{ L:new Uint8Array(N), D:new Float32Array(N).fill(-1) }, red:{ L:new Uint8Array(N), D:new Float32Array(N).fill(-1) } };
  const seeds = { warm:[], red:[] };
  for (const e of W.M.values()) { const d = REG[e.id], i = idx(e.x, e.y, e.z);
    op[i] = fullSolid(e) && d.render === 'solid' ? 1 : d.damp ? 2 : 0;
    const L = typeof d.light === 'function' ? d.light(e.p) : d.light;
    if (L > 0) seeds[d.lightColor].push([i, L, -1]);
    if (d.lightAwake > 0) seeds[d.lightColor].push([i, d.lightAwake, e.d]);
    if (e.awake && e.awake.id !== 'air') { const a = REG[e.awake.id], La = typeof a.light === 'function' ? a.light(e.awake.props) : a.light; if (La > 0) seeds[a.lightColor].push([i, La, e.d]); } }
  const nbs = i => { const x = (i / SX) | 0, y = ((i % SX) / SY) | 0, z = i % SY, o = [];
    if (x > 0) o.push(i - SX); if (x < NX-1) o.push(i + SX); if (y > 0) o.push(i - SY); if (y < NY-1) o.push(i + SY); if (z > 0) o.push(i - 1); if (z < NZ-1) o.push(i + 1); return o; };
  function spread(Lv, Dv, buckets) {
    for (let l = 15; l >= 2; l--) { const bk = buckets[l];
      for (let k = 0; k < bk.length; k++) { const i = bk[k]; if (Lv[i] !== l) continue;
        for (const j of nbs(i)) { if (op[j] === 1) continue; const nl = l - 1 - (op[j] === 2 ? 1 : 0); if (nl <= 0) continue;
          if (nl > Lv[j] || (Dv && nl === Lv[j] && Dv[i] < Dv[j])) { Lv[j] = nl; if (Dv) Dv[j] = Dv[i]; buckets[nl].push(j); } } } } }
  // sky: straight down from the top, then sideways
  for (let x = 0; x < NX; x++) for (let z = 0; z < NZ; z++) { let l = 15;
    for (let y = NY-1; y >= 0; y--) { const i = x*SX + y*SY + z; if (op[i] === 1) l = 0; else if (op[i] === 2) l = Math.max(0, l-1); sky[i] = l; } }
  const bk = Array.from({ length:16 }, () => []);
  for (let i = 0; i < N; i++) if (sky[i] >= 2) { for (const j of nbs(i)) if (op[j] !== 1 && sky[j] < sky[i]-1) { bk[sky[i]].push(i); break; } }
  spread(sky, null, bk);
  for (const c of ['warm', 'red']) { const f = F[c], b2 = Array.from({ length:16 }, () => []);
    for (const [i, L, d] of seeds[c]) if (L > f.L[i] || (L === f.L[i] && d < f.D[i])) { f.L[i] = L; f.D[i] = d; b2[L].push(i); }
    spread(f.L, f.D, b2); }
  const at = (x, y, z) => { if (x < X0 || y < Y0 || z < Z0 || x >= X0+NX || y >= Y0+NY || z >= Z0+NZ) return y >= Y0 ? [15, 0, -1, 0, -1, 0] : [0, 0, -1, 0, -1, 0];
    const i = idx(x, y, z); return [sky[i], F.warm.L[i], F.warm.D[i], F.red.L[i], F.red.D[i], op[i]]; };
  return { at };
}

// ------------------------------------------------------------------ mesher
// vertex: pos3 | uv3 (u, v, layer) | normal3 + shade | sky, warmL, warmD, redL | redD, glow, glowAwake, group | vis, delay, cellY, tiled
const VF = 22;
function Buf() { let v = new Float32Array(1 << 18), n = 0, ix = new Uint32Array(1 << 17), m = 0;
  return { push(a) { if (n + a.length > v.length) { const w = new Float32Array(v.length*2); w.set(v); v = w; } v.set(a, n); n += a.length; },
    quad() { const b = n/VF - 4; if (m + 6 > ix.length) { const w = new Uint32Array(ix.length*2); w.set(ix); ix = w; } ix.set([b, b+1, b+2, b, b+2, b+3], m); m += 6; },
    out() { return { v:v.subarray(0, n), i:ix.subarray(0, m) }; } }; }
const faceShade = n => n[0]*n[0]*.6 + n[2]*n[2]*.8 + n[1]*n[1]*(n[1] > 0 ? 1 : .5);
const AO = [.42, .6, .78, 1];
const DYN = new Set([S.fence, S.wall, S.pane, S.stairs, S.liquid]);
const FIGURE = (() => { const t = 'ce:figure', six = () => { const o = {}; for (const f of FACES) o[f] = { t }; return o; };
  const b = (a, c) => ({ from:a, to:c, faces:six() });
  return { els:[b([4,0,6], [8,12,10]), b([8,0,6], [12,12,10]), b([4,12,6], [12,24,10]), b([0,12,6], [4,24,10]), b([12,12,6], [16,24,10]), b([4,24,4], [12,32,12])] }; })();

CE.mesh = function (W) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const e of W.M.values()) { lo[0] = Math.min(lo[0], e.x); lo[1] = Math.min(lo[1], e.y); lo[2] = Math.min(lo[2], e.z); hi[0] = Math.max(hi[0], e.x); hi[1] = Math.max(hi[1], e.y); hi[2] = Math.max(hi[2], e.z); }
  hi[1] += 8;
  const LV = lightVolume(W, [lo, hi]);
  const layers = new Map(), layerOf = t => { t = t || 'ce:missing'; if (!layers.has(t)) layers.set(t, layers.size); return layers.get(t); };
  const solid = Buf(), trans = Buf(), cache = new Map();
  const occ = (x, y, z) => { const n = W.get(x, y, z); return !!n && n.g === 0 && fullSolid(n) && REG[n.id].render === 'solid'; };
  const vtx = new Float32Array(VF);
  function emit(e, q, def, vis, buf, ent) {
    const n = q.n, sh = faceShade(n), dir = q.edge ? (q.cull || FACES.find(f => { const d = DIRV[f]; return d[0] === Math.round(n[0]) && d[1] === Math.round(n[1]) && d[2] === Math.round(n[2]); })) : null;
    const group = q.part && e.parts && e.parts[q.part] != null ? e.parts[q.part] : (e.g || 0);
    const glow = q.glow != null ? q.glow : def.glow, glowA = q.glowA != null ? q.glowA : q.glow != null ? 0 : def.glowAwake;
    const own = LV.at(e.x, e.y, e.z), layer = layerOf(q.t);
    for (let k = 0; k < 4; k++) {
      const P = q.P[k], wx = e.x + P[0]/16, wy = e.y + P[1]/16, wz = e.z + P[2]/16;
      let L = own, ao = 1;
      if (dir && !ent) {
        const d = DIRV[dir], ox = e.x + d[0], oy = e.y + d[1], oz = e.z + d[2];
        const tg = [0, 1, 2].filter(a => d[a] === 0), t1 = [0, 0, 0], t2 = [0, 0, 0];
        t1[tg[0]] = P[tg[0]] > 8 ? 1 : -1; t2[tg[1]] = P[tg[1]] > 8 ? 1 : -1;
        const s1 = occ(ox+t1[0], oy+t1[1], oz+t1[2]), s2 = occ(ox+t2[0], oy+t2[1], oz+t2[2]), c = occ(ox+t1[0]+t2[0], oy+t1[1]+t2[1], oz+t1[2]+t2[2]);
        ao = AO[s1 && s2 ? 0 : 3 - (s1 + s2 + c)];
        const cells = [[ox, oy, oz]]; if (!s1) cells.push([ox+t1[0], oy+t1[1], oz+t1[2]]); if (!s2) cells.push([ox+t2[0], oy+t2[1], oz+t2[2]]);
        if (!(s1 && s2) && !c) cells.push([ox+t1[0]+t2[0], oy+t1[1]+t2[1], oz+t1[2]+t2[2]]);
        const acc = [0, 0, -1, 0, -1]; let cnt = 0, bw = -1, br = -1;
        for (const [x, y, z] of cells) { const s = LV.at(x, y, z); if (s[5] === 1) continue; cnt++;
          acc[0] += s[0]; acc[1] += s[1]; acc[3] += s[3];
          if (s[1] > bw) { bw = s[1]; acc[2] = s[2]; } if (s[3] > br) { br = s[3]; acc[4] = s[4]; } }
        L = cnt ? [acc[0]/cnt, acc[1]/cnt, acc[2], acc[3]/cnt, acc[4]] : LV.at(ox, oy, oz);
      }
      vtx[0] = wx; vtx[1] = wy; vtx[2] = wz; vtx[3] = q.UV[k][0]; vtx[4] = q.UV[k][1]; vtx[5] = layer;
      vtx[6] = n[0]; vtx[7] = n[1]; vtx[8] = n[2]; vtx[9] = sh*ao;
      vtx[10] = L[0]; vtx[11] = L[1]; vtx[12] = L[2]; vtx[13] = L[3]; vtx[14] = L[4];
      vtx[15] = glow; vtx[16] = glowA; vtx[17] = group; vtx[18] = vis; vtx[19] = e.d || 0; vtx[20] = e.y; vtx[21] = 0;
      buf.push(vtx);
    }
    buf.quad();
  }
  function model(e, id, props) {
    const def = REG[id], dyn = DYN.has(def.shape);
    const ckey = dyn ? null : id + JSON.stringify(props);
    if (ckey && cache.has(ckey)) return cache.get(ckey);
    const ctx = { nb: dir => { const d = DIRV[dir]; return W.get(e.x + d[0], e.y + d[1], e.z + d[2]); } };
    const q = bake(def.shape(props, ctx, def));
    if (ckey) cache.set(ckey, q); return q;
  }
  let quads = 0;
  for (const e of W.M.values()) {
    const states = e.awake ? [[e.id, e.p, 1], [e.awake.id, e.awake.props, 2]] : [[e.id, e.p, 0]];
    for (const [id, props, vis] of states) { if (id === 'air') continue;
      const def = REG[id], buf = def.render === 'translucent' ? trans : solid;
      for (const q of model(e, id, props)) {
        if (q.cull) { const d = DIRV[q.cull], nb = W.get(e.x + d[0], e.y + d[1], e.z + d[2]);
          if (nb && !nb.awake && nb.g === (e.g || 0) && ((fullSolid(nb) && REG[nb.id].render === 'solid') || (def.cullSame && nb.id === id))) continue; }
        emit(e, q, def, vis, buf, false); quads++;
      }
    }
  }
  for (const en of W.ENT) { const e = { x:en.x, y:en.y, z:en.z, g:0, d:0 };
    for (const q of bake(FIGURE)) { emit(e, q, { glow:0, glowAwake:0 }, 0, solid, true); quads++; } }
  return { solid:solid.out(), trans:trans.out(), layers:[...layers.keys()], quads, bounds:[lo, hi] };
};
CE.mesh.VF = VF;

// ------------------------------------------------------------------ picking: the first block along a ray (rest positions)
CE.raycast = function (W, o, d, maxT = 400, cutY = 1e9) {
  let x = Math.floor(o[0]), y = Math.floor(o[1]), z = Math.floor(o[2]);
  const st = d.map(v => v > 0 ? 1 : -1), tD = d.map(v => Math.abs(1 / (v || 1e-9)));
  const tM = [0, 1, 2].map(a => { const c = [x, y, z][a]; return (d[a] > 0 ? (c + 1 - o[a]) : (o[a] - c)) * tD[a]; });
  for (let i = 0; i < 1200; i++) {
    const e = W.get(x, y, z); if (e && y <= cutY) return e;
    const a = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : (tM[1] < tM[2] ? 1 : 2);
    if (tM[a] > maxT) return null;
    if (a === 0) x += st[0]; else if (a === 1) y += st[1]; else z += st[2];
    tM[a] += tD[a];
  }
  return null;
};
CE.describe = e => { let s = stateString(e.id, e.p);
  if (e.awake) s += `  →  under the blood moon (${e.d.toFixed(1)} s): ${e.awake.id === 'air' ? 'gone' : stateString(e.awake.id, e.awake.props)}`;
  if (e.g) s += `  · moving part ${e.g}`; return s; };
})();
