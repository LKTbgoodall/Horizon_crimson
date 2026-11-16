// Crimson Eclipse structures: the Leviathan's Rest (vault/04 - Design/Structures.md, round 5, kept by Bastien).
// The fossil of a sea serpent with a village of the moon-watchers in its ribcage. Bastien liked the skeleton and the skull
// but not round 5's village (empty, stilts, the bones not used): two villages that live in the bones are offered here,
// A grafted onto the bones, B the carcass closed into a great hall. One builder, as for the colossus (ADR-021).
// Every block sits in one cell; shapes are centred on .5 (the middle of column x = 0), so body and head mirror on one column.
'use strict';
(function () {
const CE = window.CE;
const { hash3, vnoise, ss, K, Sm, RX, about, applyP, norm, pick, LIT, sub, len, taper, ell, put, spiral, axisOf, rast, bez, curve, hangLantern } = CE.sk;

function leviathan(W, opts = {}) {
  const isBone = e => !!e && /bone_block|calcite|diorite$|polished_diorite/.test(e.id);
  const BONE = ax => (x, y, z) => { const n = vnoise(x*.17 + 7, y*.17, z*.17), r = hash3(x, y, z);
    return n > .73 ? 'calcite' : r > .95 ? 'polished_diorite' : `bone_block[axis=${ax}]`; };
  // the spine: humps of the tail in and out of the plain, a high arch over the ribcage, the neck down to the skull
  const H = curve([[-84,-8], [-74,-3], [-66,12], [-58,-3], [-49,17], [-41,9], [-33,23], [-21,29], [-9,31], [3,29], [13,26], [21,21], [27,13]]);
  const SX = z => .5 + 5*Math.sin((z + 34)*.09)*ss(-30, -42, z);       // the tail sways; the body and the head stay on x = 0
  const SC = z => (.72 + .28*ss(-84, -42, z))*(1 - .18*ss(12, 26, z));
  const VEIN = z => 3.6 + (z + 82)/110*2.6;                            // red light runs from the tail to the head
  const CENTRUM = new Set(), key = (x, y, z) => x + ',' + y + ',' + z, VZ = [];
  // the spinal column: a continuous cord along the curve, a vertebra every 3.4 blocks of its length (not of z: the humps are steep)
  const ARC = []; { let acc = 0, prev = null; for (let z = -84; z <= 27; z += .2) { const p = [SX(z), H(z), z]; if (prev) acc += len(sub(p, prev)); ARC.push([z, acc, p]); prev = p; } }
  for (let k = 0; k + 5 < ARC.length; k += 5) { const a = ARC[k][2], b = ARC[k + 5][2], sc = SC(ARC[k][0]); if (Math.max(a[1], b[1]) < -2) continue;
    rast(W, taper(a, b, 1.25*sc), (x, y, z) => { CENTRUM.add(key(x, y, z)); return BONE(axisOf(sub(b, a)))(x, y, z); }); }
  const VERT = []; for (let k = 0, next = 0; k < ARC.length; k++) if (ARC[k][1] >= next) { VERT.push(ARC[k][0]); next += 3.4; }
  for (const z of VERT) { const h = H(z), sc = SC(z), c = [SX(z), h, z]; if (h + 3*sc < -.5) continue; VZ.push(z);
    rast(W, ell(c, [2.5*sc, 2.5*sc, 1.4]), (x, y, zz) => { CENTRUM.add(key(x, y, zz)); return BONE('z')(x, y, zz); });
    const L = 3.4 + 3.2*ss(-40, -26, z)*(1 - ss(6, 22, z));
    rast(W, taper([c[0], h + 1.6*sc, z], [c[0], h + (2.2 + L)*sc, z - 2], .95*sc + .1, .4), BONE('y'));
    for (const s of [-1, 1]) rast(W, taper(c, [c[0] + s*3.6*sc, h - .7, z], .8*sc, .45), BONE('x')); }
  // the ribs: a barrel of arches down to the ground, one on every other vertebra; one snapped (left), one fallen (right)
  const RIBS = [];
  VZ.filter(z => z >= -34 && z <= 15).filter((z, j) => j % 2 === 0).forEach((z, i) => { const h = H(z), bul = 1 - Math.pow((z + 9)/27, 2)*.38, Wd = 17*bul;
    for (const s of [-1, 1]) { const P = [[.5 + s*2, h - .5, z], [.5 + s*Wd*.86, h + 2.6, z - 1], [.5 + s*(Wd + 3.2), h*.42, z - 3], [.5 + s*Wd*.93, -3, z - 4.5]];
      const snapped = s < 0 && i === 2, fallen = s > 0 && i === 4; RIBS.push({ z, s, P, i, snapped, fallen });
      if (fallen) { rast(W, taper([21, .3, z - 6], [33, .3, z + 3], 1, .7), BONE('x')); continue; }
      for (let k = 0; k < 9; k++) { if (snapped && k >= 5) break; const a = bez(P, k/9), b = bez(P, (k + 1)/9);
        rast(W, taper(a, b, 1.05 - k*.04, 1.05 - (k + 1)*.04), BONE(axisOf(sub(b, a)))); }
      if (snapped) for (let k = 0; k < 6; k++) { const p = bez(P, .6 + k*.07); put(W, Math.round(p[0]) - 2 - (k % 3), 0, Math.round(p[2]) + (k % 2), `bone_block[axis=${k % 2 ? 'x' : 'z'}]`); } } });
  // where a rib runs at each height: { y: {x, z} } along its outer, descending part
  const tab = r => { if (r.tab) return r.tab; const T = {}; let tTop = 0, ymax = -1e9;
    for (let t = 0; t <= 1; t += .005) { const p = bez(r.P, t); if (p[1] > ymax) { ymax = p[1]; tTop = t; } }
    for (let t = tTop; t <= 1.0001; t += .002) { const p = bez(r.P, t), y = Math.round(p[1]), e = Math.abs(p[1] - y); if (!T[y] || e < T[y].e) T[y] = { x:p[0], z:p[2], e }; }
    return (r.tab = T); };
  // the line of the bones on one side at height y, between the ribs of `list` (null outside them)
  const wallX = (list, y, z) => { const pts = list.map(r => tab(r)[y]).filter(Boolean).sort((a, b) => a.z - b.z);
    for (let k = 0; k + 1 < pts.length; k++) if (z >= pts[k].z && z <= pts[k + 1].z) { const t = (z - pts[k].z)/(pts[k + 1].z - pts[k].z); return pts[k].x + (pts[k + 1].x - pts[k].x)*t; }
    return null; };
  // stretch something between the ribs (hides, daub): one cell on the line of the bones for each (y, z), bones kept
  const panel = (list, zA, zB, y0, y1, mat) => { for (let z = zA; z <= zB; z++) for (let y = y0; y <= y1; y++) {
    const x = wallX(list, y, z + .5); if (x == null) continue; const x2 = wallX(list, y + 1, z + .5), a = Math.floor(x), b = x2 == null ? a : Math.floor(x2);
    for (let xx = Math.min(a, b); xx <= Math.max(a, b); xx++) { if (isBone(W.get(xx, y, z))) continue; const m = mat(xx, y, z); if (m) W.set(xx, y, z, m); } } };
  const side = (s, all) => RIBS.filter(r => r.s === s && (all || (!r.snapped && !r.fallen))).sort((a, b) => a.z - b.z);
  // ---- the skull: on x = 0, its jaw on the ground; the upper skull (group 1) lifts at the awakening
  const SK = { g:1 }, HINGE = [.5, 4, 30.5];
  const cran = ell([.5, 8, 36], [7.6, 7, 8.4]), snout = ell([.5, 7.3, 49], [5, 2.6, 9]), snout2 = ell([.5, 7.6, 44], [6.2, 3.2, 5]);
  const brows = [ell([-4.5, 11.6, 41], [3.2, 1.6, 3.6]), ell([5.5, 11.6, 41], [3.2, 1.6, 3.6])];
  const sockets = [-1, 1].map(s => ell([.5 + s*5.6, 8.6, 42.6], [2.3, 2, 2.3])), skull = p => Math.min(cran(p), snout(p), snout2(p), ...brows.map(f => f(p)));
  for (let x = -9; x <= 9; x++) for (let y = 2; y <= 16; y++) for (let z = 26; z <= 59; z++) { const p = [x + .5, y + .5, z + .5], d = skull(p);
    if (d >= 0 || (d < -1.9 && z > 29) || sockets.some(f => f(p) < 0)) continue;
    if (y < (z < 33 ? 2 : 5)) continue;
    W.set(x, y, z, d > -1 && vnoise(x*.3, y*.3, z*.3) > .72 ? 'calcite' : hash3(x, y, z) > .9 ? 'polished_diorite' : 'bone_block[axis=z]', SK); }
  for (const s of [-1, 1]) for (let y = 9; y <= 10; y++) W.del(s, y, 57);                        // nostrils
  for (let z = 30; z <= 46; z += 2) { const top = (() => { for (let y = 16; y > 4; y--) if (W.get(0, y, z)) return y; return 0; })();      // a crest on the midline
    if (top) for (let k = 1; k <= (z % 4 ? 1 : 2); k++) W.set(0, top + k, z, 'calcite', SK); }
  for (const s of [-1, 1]) { const A = [.5 + s*4.5, 12, 33], M = [.5 + s*8.3, 16.5, 27], T = [.5 + s*9.6, 21.5, 23.5];      // horns of black stone, gilded tips
    rast(W, taper(A, M, 1.5, 1.05), 'blackstone', SK); rast(W, taper(M, T, 1.05, .45), (x, y, z) => y > 19 ? 'gilded_blackstone' : 'blackstone', SK);
    const E = [.5 + s*5.2, 8.5, 42.3];      // the eyes: balls of crystal deep in the sockets, an eye looking out of each
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2) {
      const x = Math.round(E[0] - .5) + dx, y = Math.round(E[1] - .5) + dy, z = Math.round(E[2] - .5) + dz;
      W.set(x, y, z, dx === s && dy === 0 && dz === 0 ? 'crimson_eclipse:eclipse_eye' : 'crimson_eclipse:crimson_crystal', { g:1, d:6.2 }); } }
  // the lower jaw on the ground: two arms, a chin, a floor between; teeth up and down, the front left open to walk in
  const jaw = [taper([-5.9, 1.2, 31], [-2.8, 1.2, 55], 1.8, 1.3), taper([6.9, 1.2, 31], [3.8, 1.2, 55], 1.8, 1.3), ell([.5, 1, 56], [3.6, 1.6, 2.2])];
  for (const f of jaw) rast(W, f, (x, y, z) => vnoise(x*.3, y*.3, z*.3) > .7 ? 'calcite' : 'bone_block[axis=z]');
  for (let z = 29; z <= 55; z++) { const half = Math.floor(6.4 - (z - 31)*3.1/24); for (let x = -half; x <= half; x++) put(W, x, 0, z, ((x + z) & 1) ? 'calcite' : 'bone_block'); }
  for (let z = 34; z <= 54; z += 2) { const xs = Math.round(6.4 - (z - 31)*3.1/24); for (const s of [-1, 1]) {
    if (!W.get(s*xs, 3, z)) put(W, s*xs, 3, z, 'diorite_wall');
    const xu = Math.round(Math.min(4.6, 6 - (z - 40)*.12)); if (W.get(s*xu, 5, z + 1)) put(W, s*xu, 4, z + 1, 'diorite_wall', SK); } }
  for (const s of [-1, 1]) { put(W, s*3, 4, 56, 'diorite_wall', SK); put(W, s*3, 3, 56, 'diorite_wall', SK); }    // two fangs
  // the shrine in the skull: an altar of rune stone with a crystal, candles, chests and the jaw's reliquary
  for (let x = -1; x <= 1; x++) W.set(x, 1, 31, 'chiseled_polished_blackstone'); W.set(0, 2, 31, 'crimson_eclipse:rune_stone', { awake:'crimson_eclipse:rune_stone', d:5.6 });
  W.set(0, 3, 31, 'crimson_eclipse:crimson_crystal_cluster', { d:5.8 });
  for (const s of [-1, 1]) { W.set(s*2, 1, 32, 'candle[candles=4,lit=false]', LIT(4.4)); W.set(s*4, 1, 33, `chest[facing=${s < 0 ? 'east' : 'west'}]`); W.set(s*4, 1, 35, 'barrel');
    W.set(s*3, 1, 44, `chest[facing=${s < 0 ? 'east' : 'west'}]`); W.set(s*3, 1, 47, 'bone_block'); W.set(s*3, 2, 47, 'candle[candles=3,lit=false]', LIT(4.6)); W.set(s*2, 1, 50, 'barrel'); }
  for (let z = 34; z <= 52; z++) put(W, 0, 1, z, 'red_carpet');
  for (const [x, z] of [[0, 36], [-3, 39], [3, 39]]) hangLantern(W, x, 2, z, 2, 4.8, SK);
  // ---- the well, and the shaft down to the vault in the belly
  for (let x = -1; x <= 1; x++) for (let z = 8; z <= 10; z++) if (x || z !== 9) W.set(x, 0, z, 'mossy_cobblestone_wall');
  for (const [x, z] of [[-1, 8], [1, 8], [-1, 10], [1, 10]]) { W.set(x, 1, z, 'spruce_fence'); W.set(x, 2, z, 'spruce_fence'); }
  for (let x = -1; x <= 1; x++) for (let z = 8; z <= 10; z++) W.set(x, 3, z, 'spruce_slab');
  W.set(0, 2, 9, 'crimson_eclipse:vigil_lantern[hanging=true]', { d:3.8 });
  for (let y = -12; y <= -1; y++) for (const [x, z] of [[-1, 9], [1, 9], [0, 10], [0, 8]]) W.set(x, y, z, 'mossy_cobblestone');
  W.set(0, -12, 9, 'mud_bricks'); W.del(0, -11, 9); W.del(0, -10, 9);
  for (let z = 2; z <= 8; z++) for (let y = -12; y <= -9; y++) { const wall = y === -12 || y === -9; W.set(-1, y, z, 'packed_mud'); W.set(1, y, z, 'packed_mud'); W.set(0, y, z, wall ? 'mud_bricks' : 'air'); }
  for (let y = -9; y <= 0; y++) W.set(0, y, 9, 'ladder[facing=south]');
  // the vault in the belly: ribs of bone over a room of mud brick, the leviathan's pearl (group 2) on a cradle, its hoard
  for (let x = -9; x <= 9; x++) for (let z = -24; z <= 1; z++) for (let y = -12; y <= -2; y++) { const wall = Math.abs(x) === 9 || z === -24 || z === 1 || y === -12 || y === -2;
    const rib = (z + 24) % 4 === 0 && (Math.abs(x) === 9 || y === -2);
    if (wall) W.set(x, y, z, rib ? 'bone_block[axis=y]' : y === -12 ? (((x + z) & 1) ? 'packed_mud' : 'mud_bricks') : hash3(x, y, z) > .85 ? 'packed_mud' : 'mud_bricks'); else W.del(x, y, z); }
  W.del(0, -11, 1); W.del(0, -10, 1); W.door(0, -11, 1, 'spruce_door', { facing:'north' });
  for (let x = -2; x <= 2; x++) for (let z = -14; z <= -10; z++) if (Math.abs(x) + Math.abs(z + 12) <= 3) W.set(x, -11, z, Math.abs(x) + Math.abs(z + 12) === 3 ? 'bone_block' : 'calcite');
  const PEARL = [0, -8, -12];
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) if (dx*dx + dy*dy + dz*dz <= 5) W.set(dx, PEARL[1] + dy, PEARL[2] + dz, 'crimson_eclipse:crimson_crystal', { g:2, d:4 });
  for (const [x, z, f] of [[-8, -20, 'east'], [-8, -6, 'east'], [8, -16, 'west'], [8, -3, 'west'], [-3, -23, 'south'], [3, -23, 'south']]) W.set(x, -11, z, `chest[facing=${f}]`);
  for (const [x, z] of [[-8, -22], [-7, -23], [8, -22], [8, -21], [-8, -2], [7, 0], [8, 0]]) { W.set(x, -11, z, 'barrel'); if (hash3(x, z, 1) > .5) W.set(x, -10, z, 'barrel'); }
  for (const [x, z] of [[6, -8], [7, -8], [6, -7], [-6, -18], [-7, -18], [-6, -17]]) W.set(x, -11, z, hash3(x, z, 4) > .4 ? 'gold_block' : 'raw_gold_block');
  W.set(6, -10, -8, 'gold_block'); W.set(-6, -10, -18, 'gilded_blackstone');
  for (const [x, z] of [[-4, -12], [4, -12], [0, -16], [0, -8]]) W.set(x, -11, z, 'candle[candles=4,lit=false]', LIT(4.3));
  for (const [x, z] of [[-8, -12], [8, -10], [-3, 0], [3, -23]]) put(W, x, -11, z, 'soul_lantern');
  for (let i = 0; i < 22; i++) { const x = Math.floor(hash3(i, 1, 51)*17) - 8, z = Math.floor(hash3(i, 2, 51)*25) - 23; put(W, x, -3, z, 'cobweb'); }
  // age on the bones (before the village, which clears what it builds over)
  K.vines(W, e => isBone(e) && !e.g && e.y > 4, .025, 13);
  for (const e of [...W.M.values()]) if (isBone(e) && !e.g && e.y > 6 && !W.get(e.x, e.y + 1, e.z) && hash3(e.x, e.y, e.z + 3) < .18) W.set(e.x, e.y + 1, e.z, 'moss_carpet');
  // ---- the village
  const V = { W, RIBS, H, SX, SC, isBone, BONE, tab, wallX, panel, side };
  const village = opts.village === 'B' ? villageB(V) : villageA(V, opts.look || 'harbour');
  // the red light: veins along the spine and down the ribs, from the tail to the head
  for (const e of W.M.values()) { if (!isBone(e) || e.g) continue; const k = key(e.x, e.y, e.z);
    const exposed = [[1,0,0], [-1,0,0], [0,1,0], [0,-1,0], [0,0,1], [0,0,-1]].some(([a, b, c]) => !W.get(e.x + a, e.y + b, e.z + c));
    if (!exposed || e.y < 0) continue;
    if (CENTRUM.has(k) && Math.abs(vnoise(e.x*.5, e.y*.5, e.z*.5) - .5) < .06) { e.id = 'crimson_eclipse:crimson_vein'; e.p = {}; e.d = VEIN(e.z); }
    else if (!CENTRUM.has(k) && e.y > 1 && Math.abs(e.x) > 3 && e.z > -40 && e.z < 18 && Math.abs(vnoise(e.x*.22, e.y*.22, e.z*.22) - .5) < .025) { e.id = 'crimson_eclipse:crimson_vein'; e.p = {}; e.d = VEIN(e.z) + Math.abs(e.x)*.03; } }
  // lanterns on long chains from the spine, wherever there is room under it
  for (const z of VZ.filter(z => z >= -30 && z <= 12)) { const zz = Math.round(z); let top = Math.floor(H(z) - 2.6); if (!W.get(0, top, zz) || W.get(0, top - 1, zz)) continue;
    let y = top - 1; for (; y > top - 16 && !W.get(0, y - 1, zz) && !W.get(0, y - 2, zz); y--) W.set(0, y, zz, 'iron_chain');
    if (y > 5 && !W.get(0, y - 1, zz)) W.set(0, y, zz, 'crimson_eclipse:vigil_lantern[hanging=true]', { d:3.8 + (zz + 30)*.02 }); else W.del(0, y, zz); }
  const MOON = norm([0, .58, .81]), LIFT = Math.asin(.58), EYES = [-1, 1].map(s => [.5 + s*5.2, 9, 44]);
  return {
    tag:village.tag,
    cam:{ target:[0, 14, -8], dist:150, yaw:.95, pitch:.16 }, groundR:100,
    sun:norm([.4, .78, .55]), moon:MOON,
    flat:(x, z) => Math.max(Math.abs(x) - 26, z - 64, -86 - z, 0),
    shakeAt:7.2,
    ground(W) {
      for (let z = -40; z <= 24; z++) for (let x = -3; x <= 3; x++) { const g = W.get(x, -1, z); if (g && g.id === 'grass_block' && hash3(x, z, 7) > (Math.abs(x) >= 2 ? .55 : .1)) g.id = Math.abs(x) < 2 ? 'dirt_path' : 'coarse_dirt'; }
      for (const e of [...W.M.values()]) if (e.y === -1 && e.id === 'grass_block' && isBone(W.get(e.x, 0, e.z)) && hash3(e.x, 2, e.z) < .7) e.id = 'coarse_dirt';
      W.figure(3, 0, 18);
    },
    groups(nt, t) {
      const g = [], k = ss(7, 9.5, nt);
      g[1] = about(HINGE, RX(-LIFT*k - .03*k*Math.sin(t*.8)));
      const on = ss(4, 5, nt), beat = Math.pow(Math.max(Math.sin(t*3.4), 0), 10) + .6*Math.pow(Math.max(Math.sin(t*3.4 - .7), 0), 10);
      g[2] = about([PEARL[0] + .5, PEARL[1] + .5, PEARL[2] + .5], Sm(1 + .12*beat*on));
      return g;
    },
    beams(nt, t, G) { const e = ss(9.6, 11, nt), eyes = EYES.map(p => { const a = applyP(G[1], p); return { a, b:[a[0] + MOON[0]*320, a[1] + MOON[1]*320, a[2] + MOON[2]*320], w:.9, e }; });
      return village.beams ? village.beams(nt, t, G, eyes) : eyes; },
    lights(W) {
      for (const p of EYES) W.light([p[0], p[1], p[2] - 1.5], [5, .5, .35], 10, 6.2, 1);
      W.light([PEARL[0] + .5, PEARL[1] + .5, PEARL[2] + .5], [5, .5, .35], 10, 4, 2);
      for (const l of village.lights) W.light(...l);
      for (let i = 0; i < 220; i++) W.part(-14 + hash3(i,1,6)*28, 2 + hash3(i,2,6)*24, -34 + hash3(i,3,6)*50, 0, hash3(i,4,6), .07, 0, 0, 1,1,1);
      for (const [x, y, z, h] of village.smoke) for (let i = 0; i < 40; i++) W.part(x + (hash3(i, x, 5) - .5)*1.4, y, z + (hash3(i, z, 6) - .5)*1.4, 1, hash3(i, 7, z), .1, 3.9, h*(.6 + .4*hash3(i, 8, x)), 4, .8, .3);
    },
    trees:[[-48,-60,12], [-52,-10,14], [-46,40,11], [44,-70,12], [52,-30,13], [48,20,12], [-40,76,13], [40,74,12], [-36,-90,12], [30,-92,13]],
  };
}

const HIDE = (x, y, z) => { const r = hash3(x, y, z), n = vnoise(x*.4 + 3, y*.4, z*.4); return n > .64 ? 'brown_wool' : n < .3 ? 'light_gray_wool' : r > .93 ? 'red_wool' : 'white_wool'; };
// half-timbering for the village's walls between the bones: a stone sill, dark oak beams and studs, daub between
// the backs of the houses between the bones, one look per direction of village A
const BONEWALL = (x, y, z) => y === 0 ? 'calcite' : (((x + y + z) % 5) + 5) % 5 === 0 ? 'packed_mud' : y % 2 ? 'bone_block[axis=z]' : hash3(x, y, z) > .5 ? 'bone_block[axis=x]' : 'calcite';
const MOSSWALL = (x, y, z) => { const n = vnoise(x*.3, y*.3, z*.3); return y === 0 ? 'cobblestone' : n > .62 ? 'mossy_cobblestone' : n < .3 ? 'stone_bricks' : hash3(x, y, z) > .5 ? 'mossy_stone_bricks' : 'cobblestone'; };
const HULL = (x, y, z) => y % 3 === 0 ? 'stripped_dark_oak_log[axis=z]' : (y === 2 || y === 7) && (((z % 4) + 4) % 4 === 1) ? 'glass_pane' : y % 2 ? 'dark_oak_planks' : 'spruce_planks';
const TIMBER = (x, y, z) => y === 0 ? 'cobblestone' : y % 4 === 0 ? 'stripped_dark_oak_log[axis=z]' : ((z % 3) + 3) % 3 === 0 ? 'stripped_dark_oak_log' : hash3(x, y, z) > .6 ? 'packed_mud' : 'mud_bricks';
const out = s => s < 0 ? 'west' : 'east', inn = s => s < 0 ? 'east' : 'west';

// ================================================================ A · a village grafted onto the bones
// Each gap between two ribs is a house: the two ribs are its side walls, hides stretched between them its back, a lean-to
// roof climbs to the bones. Above, nests between the same ribs open on a gallery that hangs from the ribs on chains;
// cocoon houses hang under the spine on the middle line, bridges join them to both galleries. Where a rib is broken,
// a spiral stair climbs to the gallery. The street below: a fire, stalls, drying racks, the well.
function villageA(V, look) {
  const { W, isBone, tab, wallX, panel, side, H, SX, SC } = V, smoke = [], lights = [];
  const WALL = look === 'ridge' ? BONEWALL : look === 'arches' ? MOSSWALL : HULL;
  const ROLES = ['home', 'smith', 'carver', 'tannery', 'tavern', 'store', 'home', 'smith', 'carver', 'store', 'tavern', 'tannery'];
  let hn = 0;
  for (const s of [-1, 1]) {
    const Ls = side(s), xw = (y, z) => wallX(Ls, y, z + .5);
    const inside = (ax, y, z, off = .9) => { const w = xw(y, z); return w != null && ax + .5 < Math.abs(w) - off; };       // inside the line of the bones
    for (let g = 0; g + 1 < Ls.length; g++) { const ra = Ls[g], rb = Ls[g + 1];
      if (rb.i - ra.i !== 1) { stairTower(s, (tab(ra)[12].z + tab(rb)[12].z)/2); continue; }
      house(s, ra, rb, ROLES[hn++ % ROLES.length], 4.1 + hn*.06);
      nest(s, ra, rb, 4.6 + hn*.05); }
    // the gallery: three planks wide at y = 12, along the inside of the ribs, chained to the bones above
    const zs = Ls.map(r => tab(r)[12].z), zA = Math.ceil(Math.min(...zs)) + 1, zB = Math.floor(Math.max(...zs)) - 1;
    for (let z = zA; z <= zB; z++) for (let ax = 7; ax <= 9; ax++) { const x = s*ax; if (isBone(W.get(x, 12, z))) continue;
      W.set(x, 12, z, (z % 5 === 0) ? `stripped_spruce_log[axis=x]` : 'spruce_planks'); if (ax === 7 && z % 5) put(W, x, 13, z, 'spruce_fence'); }
    for (const r of side(s, true)) { const z = Math.round(r.z - 1); let top = 13; while (top < 40 && !W.get(s*8, top, z)) top++; if (top < 40 && top > 16) for (let y = 13; y < top; y++) W.set(s*8, y, z, 'iron_chain');
      W.set(s*8, 11, z, `spruce_stairs[facing=${out(s)},half=top]`); }
    for (let z = zA + 2; z <= zB; z += 6) hangLantern(W, s*7, 4, z, 1, 3.9 + (z + 40)*.01);
  }
  // cocoons hung under the spine, bridges to both galleries
  for (const [zc, d] of [[-27, 4.4], [-13, 4.6], [1, 4.8]]) cocoon(zc, d);
  // the street: a fire pit with log benches, stalls with striped awnings, drying racks of hides
  W.set(0, 0, -2, 'campfire[lit=false]', LIT(3.9)); smoke.push([.5, 1, -1.5, 9]); lights.push([[.5, 2, -1.5], [3, 1, .4], 12, 3.9]);
  for (const [x, z] of [[-1,-3], [1,-3], [-1,-1], [1,-1], [0,-4], [0,0], [-1,-2], [1,-2]]) W.set(x, 0, z, 'cobblestone_slab');
  for (const [x, z, a] of [[0, -6, 'x'], [-1, -6, 'x'], [1, -6, 'x'], [0, 2, 'x'], [-1, 2, 'x'], [1, 2, 'x'], [-4, -2, 'z'], [-4, -1, 'z'], [4, -2, 'z'], [4, -3, 'z']]) W.set(x, 0, z, `spruce_log[axis=${a}]`);
  for (const [cx, cz] of [[-3, -31], [3, -31], [-3, -19], [3, -21], [-3, -11], [3, 5], [-3, 5]]) { const s = Math.sign(cx);
    for (const dz of [-1, 1]) for (let y = 0; y <= 2; y++) { W.set(cx - s, y, cz + dz, 'spruce_fence'); W.set(cx + s, y, cz + dz, 'spruce_fence'); }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) W.set(cx + dx, 3, cz + dz, dz === 0 ? 'white_wool' : (cz & 1) ? 'red_wool' : 'brown_wool');
    W.set(cx - s, 0, cz, pick(['barrel', 'hay_block', `chest[facing=${inn(s)}]`, 'cauldron'], hash3(cx, cz, 1))); W.set(cx, 0, cz, pick(['barrel', 'hay_block', 'barrel', 'bone_block'], hash3(cx, cz, 2)));
    put(W, cx - s, 1, cz, 'candle[candles=2,lit=false]', LIT(4.1)); }
  for (const [x, z0] of [[-5, -27], [5, -15], [-5, -6], [5, -1]]) for (let z = z0; z <= z0 + 2; z++) { W.set(x, 0, z, 'spruce_fence'); W.set(x, 1, z, 'spruce_fence'); W.set(x, 2, z, pick(['white_carpet', 'brown_carpet', 'light_gray_carpet'], hash3(x, z, 3))); }
  const pave = (x, z, id) => { if (!W.get(x, -1, z) && !isBone(W.get(x, 0, z))) W.set(x, -1, z, id); };
  const ext = look === 'ridge' ? ridge() : look === 'arches' ? arches() : harbour();
  return { smoke, lights, beams:ext.beams,
    tag:'The fossil of a sea serpent, some 130 blocks long, its skull resting its jaw on the plain (a shrine inside), a vault in its belly down the well. <b>The village is grafted onto the bones:</b> every gap between two ribs is a house (the ribs are its walls, ' + ext.wall + ' between them its back, a roof that climbs to the bones, a trade inside), nests above them on two galleries hung from the ribs on chains, three cocoon houses hung under the spine, spiral stairs where a rib is broken, a street with a fire pit and stalls. ' + ext.tag + ' <i>Under the blood moon:</i> every lantern lights, red light runs along the spine and the ribs, the pearl beats, the skull lifts to the moon and fires at it. <i>Cut slider: look inside.</i>' };

  // ---------------------------------------------------------------- 1 · the ridge walk: life on top of the skeleton
  function ridge() {
    const yd = z => Math.floor(H(z) + 2.5*SC(z) + .5), cxAt = z => Math.floor(SX(z));
    // the walkway: three planks wide on the spine from where the tail leaves the ground to the neck; spikes stand through it
    let py = null; const DECK = {};
    for (let z = -74; z <= 26; z++) { const y = yd(z), cx = cxAt(z); if (y < 1) { py = null; continue; }
      for (let dx = -1; dx <= 1; dx++) { const x = cx + dx; if (isBone(W.get(x, y, z))) continue; W.set(x, y, z, z % 4 === 0 ? 'stripped_spruce_log[axis=x]' : 'spruce_planks'); }
      DECK[z] = [cx, y];
      if (py != null && Math.abs(y - py) >= 2) { const up = y > py, zr = up ? z : z - 1, zl = up ? z - 1 : z, lo = Math.min(y, py), hi = Math.max(y, py), xr = isBone(W.get(cx, lo + 1, zr)) ? cx + 1 : cx;
        for (let yy = lo + 1; yy < hi; yy++) { if (!isBone(W.get(xr, yy, zr))) W.set(xr, yy, zr, 'spruce_planks'); W.set(xr, yy, zl, `ladder[facing=${up ? 'north' : 'south'}]`); }
        W.set(xr, hi, zl, `ladder[facing=${up ? 'north' : 'south'}]`); }
      if (z % 6 === 0) { put(W, cx + 2, y, z, 'spruce_planks'); put(W, cx + 2, y + 1, z, 'spruce_fence'); put(W, cx + 2, y + 2, z, 'crimson_eclipse:vigil_lantern', { d:3.7 + (z + 74)*.012 }); }
      py = y; }
    // a cabin astride the vertebrae on each hump, the walk passing through it; a ladder down from the high one
    const perch = (zA, zB, d, ladder) => { let zc = null; for (let z = zA; z <= zB; z++) if (DECK[z] && (zc == null || DECK[z][1] > DECK[zc][1])) zc = z;
      if (zc == null) return; const [cx, yp] = DECK[zc];
      for (let x = cx - 2; x <= cx + 2; x++) for (let z = zc - 2; z <= zc + 2; z++) { const ex = Math.abs(x - cx) === 2, ez = Math.abs(z - zc) === 2;
        if (!isBone(W.get(x, yp, z))) W.set(x, yp, z, 'spruce_planks');
        for (let y = yp + 1; y <= yp + 3; y++) { if (isBone(W.get(x, y, z))) continue; if (!(ex || ez)) { W.del(x, y, z); continue; }
          W.set(x, y, z, ex && ez ? 'stripped_dark_oak_log' : y === yp + 2 && ex && z === zc ? 'glass_pane' : WALL(x, y - yp, z)); } }
      for (const dz of [-2, 2]) { W.del(cx, yp + 1, zc + dz); W.del(cx, yp + 2, zc + dz); }
      [3, 2, 1, 0].forEach((h, k) => { for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== h) continue; const x = cx + dx, z = zc + dz, y = yp + 4 + k;
        if (isBone(W.get(x, y, z))) continue; W.set(x, y, z, h ? `dark_oak_stairs[facing=${Math.abs(dx) >= Math.abs(dz) ? (dx < 0 ? 'east' : 'west') : (dz < 0 ? 'south' : 'north')}]` : 'dark_oak_planks'); } });
      put(W, cx - 1, yp + 1, zc - 1, 'chest[facing=east]'); put(W, cx + 1, yp + 1, zc + 1, 'barrel'); put(W, cx + 1, yp + 1, zc - 1, 'spruce_slab[type=top]'); put(W, cx + 1, yp + 2, zc - 1, 'candle[candles=3,lit=false]', LIT(d));
      hangLantern(W, cx - 1, yp + 1, zc + 1, 0, d + .1);
      if (ladder) { for (let y = 0; y < yp; y++) W.set(cx + 3, y, zc, 'stripped_spruce_log'); W.set(cx + 3, yp, zc, 'spruce_planks'); for (let y = 0; y <= yp + 1; y++) W.set(cx + 4, y, zc, 'ladder[facing=east]'); W.del(cx + 2, yp + 1, zc); W.del(cx + 2, yp + 2, zc); } };
    perch(-56, -42, 4.3, true); perch(-74, -61, 4.2, false);
    // the watchman's house on the skull, between the horns (group 1: it rises with the head), an open bell-cote on its roof
    const G1 = { g:1 }, top = z => { for (let y = 18; y > 4; y--) if (W.get(0, y, z)?.g === 1) return y; return 14; }, yf = top(35) + 1;
    for (let x = -2; x <= 2; x++) for (let z = 33; z <= 37; z++) { const ex = Math.abs(x) === 2, ez = z === 33 || z === 37;
      for (let y = top(z) + 1; y < yf; y++) W.set(x, y, z, WALL(x, y, z), G1); W.set(x, yf, z, 'spruce_planks', G1);
      for (let y = yf + 1; y <= yf + 3; y++) { if (!(ex || ez)) { W.del(x, y, z); continue; } W.set(x, y, z, ex && ez ? 'stripped_dark_oak_log' : y === yf + 2 && (x === 0 || z === 35) ? 'glass_pane' : WALL(x, y, z), G1); } }
    W.del(0, yf + 1, 33); W.del(0, yf + 2, 33); W.door(0, yf + 1, 33, 'spruce_door', { facing:'north' }, G1);
    [3, 2, 1, 0].forEach((h, k) => { for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== h) continue;
      W.set(dx, yf + 4 + k, 35 + dz, h ? `dark_oak_stairs[facing=${Math.abs(dx) >= Math.abs(dz) ? (dx < 0 ? 'east' : 'west') : (dz < 0 ? 'south' : 'north')}]` : 'dark_oak_planks', G1); } });
    for (const x of [-1, 1]) for (let y = yf + 8; y <= yf + 9; y++) W.set(x, y, 35, 'stripped_dark_oak_log', G1); for (let x = -1; x <= 1; x++) W.set(x, yf + 10, 35, 'dark_oak_slab', G1);
    W.set(0, yf + 9, 35, 'bell[attachment=ceiling,facing=north]', G1);
    W.set(-1, yf + 1, 36, 'chest[facing=east]', G1); W.set(1, yf + 1, 36, 'spruce_slab[type=top]', G1); W.set(1, yf + 2, 36, 'candle[candles=2,lit=false]', { ...LIT(5.2), g:1 }); W.set(0, yf + 3, 35, 'crimson_eclipse:vigil_lantern[hanging=true]', { g:1, d:5.2 });
    const n26 = DECK[26] || DECK[25];
    for (let z = 27; z <= 32; z++) for (let x = -1; x <= 1; x++) { const y = n26 ? Math.round(n26[1] + (yf - n26[1])*(z - 26)/7) : yf; if (!W.get(x, y, z)) W.set(x, y, z, 'spruce_planks'); }
    return { wall:'walls of stacked small bones', tag:'<b>Life on top of the skeleton:</b> a plank walk rides the spine from where the tail leaves the ground to the head, threaded between the spikes, with ladders where it climbs; a cabin sits astride the vertebrae on each hump of the tail (the walk passes through it, a ladder down from the high one); on the skull, between the horns, the watchman\'s house with a bell-cote (it rises with the head).' };
  }

  // ---------------------------------------------------------------- 2 · the lived-in arches: the town spills out of the ribcage
  function arches() {
    // a market hall under a hump: the spine is its ridge beam, plank roofs slope down both sides to posts, stalls under it
    const hall = (zA, zB, d) => { for (let z = zA; z <= zB; z++) { const cx = Math.floor(SX(z)); let yb = 0; while (yb < 30 && ![-1, 0, 1].some(dx => isBone(W.get(cx + dx, yb, z)))) yb++;
        if (yb < 8 || yb >= 30) continue;
        for (const s of [-1, 1]) { for (let k = 1; k <= 2; k++) if (!W.get(cx + s*k, yb - 1, z)) W.set(cx + s*k, yb - 1, z, 'dark_oak_planks');
          for (let k = 0; k <= 9; k++) { const x = cx + s*(3 + k), y = yb - 1 - k;
            if (y < 5) { if ((z - zA) % 4 === 0) for (let yy = 0; yy <= y; yy++) W.set(x - s, yy, z, 'stripped_spruce_log'); if ((z - zA) % 4 === 2) hangLantern(W, x - s*2, 1, z, 0, d + (z - zA)*.02); break; }
            W.set(x, y, z, `dark_oak_stairs[facing=${s < 0 ? 'east' : 'west'}]`); } }
        for (let x = cx - 9; x <= cx + 9; x++) pave(x, z, ((x + z) & 1) ? 'cobblestone' : 'stone_bricks');
        if ((z - zA) % 3 === 1) for (const s of [-1, 1]) { put(W, cx + s*4, 0, z, 'spruce_slab[type=top]');
          const g = pick([`chest[facing=${s < 0 ? 'east' : 'west'}]`, 'candle', 'barrel', 'hay_block', 'cauldron'], hash3(z, s, 21));
          put(W, cx + s*4, 1, z, g === 'candle' ? 'candle[candles=3,lit=false]' : g, g === 'candle' ? LIT(d) : {});
          put(W, cx + s*6, 0, z, pick(['barrel', 'hay_block', 'barrel', `chest[facing=${s < 0 ? 'east' : 'west'}]`], hash3(z, s, 22))); }
        if ((z - zA) % 6 === 3) { put(W, cx, 0, z, 'spruce_slab[type=top]'); put(W, cx - 1, 0, z, 'spruce_stairs[facing=east]'); put(W, cx + 1, 0, z, 'spruce_stairs[facing=west]'); put(W, cx, 1, z, 'candle[candles=2,lit=false]', LIT(d)); } } };
    hall(-56, -38, 4.2); hall(-73, -62, 4.4);
    for (let z = -61; z <= -37; z++) for (let x = -2; x <= 2; x++) pave(x + 3, z, Math.abs(x) < 2 ? 'dirt_path' : 'coarse_dirt');
    // toward the head: the way under the neck, the market in the jaw (stalls between the teeth, a fountain), a square at the mouth
    for (let z = 11; z <= 30; z++) for (let x = -1; x <= 1; x++) pave(x, z, x ? 'coarse_dirt' : 'dirt_path');
    for (let z = 31; z <= 58; z++) for (const s of [-1, 1]) for (let ax = 9; ax <= 11; ax++) pave(s*ax, z, ax === 10 ? 'dirt_path' : 'coarse_dirt');
    for (let k = 0; k <= 9; k++) for (const s of [-1, 1]) pave(s*k, 30 + Math.round(k*.15), 'dirt_path');
    for (const z of [38, 41, 52]) for (const s of [-1, 1]) { const xs = Math.round(6.4 - (z - 31)*3.1/24) - 1;
      put(W, s*xs, 1, z, 'spruce_slab[type=top]'); put(W, s*xs, 2, z, z === 41 ? 'candle[candles=3,lit=false]' : 'barrel', z === 41 ? LIT(4.6) : {}); put(W, s*(xs - 1), 1, z, 'barrel'); }
    for (let x = -1; x <= 1; x++) for (let z = 48; z <= 50; z++) { const e = W.get(x, 1, z); if (e && /carpet/.test(e.id)) W.del(x, 1, z); W.set(x, 1, z, x === 0 && z === 49 ? 'water' : 'stone_bricks'); }
    // the square at the mouth: a round fountain, four stalls under plank awnings, braziers
    for (let x = -9; x <= 9; x++) for (let z = 56; z <= 72; z++) { const r = Math.hypot(x, z - 64); if (r <= 8.4) pave(x, z, r > 7.4 ? 'stone_bricks' : ((x + z) & 1) ? 'cobblestone' : 'mossy_cobblestone'); }
    for (let x = -3; x <= 3; x++) for (let z = 61; z <= 67; z++) { const r = Math.hypot(x, z - 64); if (r > 3.3) continue;
      if (r > 2.3) W.set(x, 0, z, 'stone_bricks'); else { W.set(x, 0, z, 'water'); W.set(x, -1, z, 'stone_bricks'); } }
    for (let y = 0; y <= 2; y++) W.set(0, y, 64, 'chiseled_stone_bricks'); W.set(0, 3, 64, 'water');
    for (const [cx, cz] of [[-6, 60], [6, 60], [-6, 68], [6, 68]]) { const s = Math.sign(cx);
      for (const dz of [-1, 1]) for (let y = 0; y <= 2; y++) W.set(cx + s, y, cz + dz, 'spruce_fence');
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) W.set(cx + dx, 3, cz + dz, dx === s ? 'spruce_slab' : `spruce_stairs[facing=${s < 0 ? 'east' : 'west'}]`);
      W.set(cx - s, 0, cz, 'spruce_slab[type=top]'); W.set(cx, 0, cz, 'barrel'); put(W, cx - s, 1, cz, 'candle[candles=2,lit=false]', LIT(4.8)); W.set(cx, 2, cz, 'crimson_eclipse:vigil_lantern[hanging=true]', { d:4.8 }); }
    for (const s of [-1, 1]) { for (let y = 0; y <= 2; y++) W.set(s*9, y, 64, 'mossy_stone_bricks'); W.set(s*9, 3, 64, 'campfire[lit=false]', LIT(4.6)); }
    lights.push([[.5, 3, 64.5], [4, 1.4, .45], 14, 4.6]);
    for (let x = -1; x <= 1; x++) { put(W, x, 0, 58, 'stone_bricks'); put(W, x, 0, 59, 'stone_brick_stairs[facing=north]'); put(W, x, 1, 58, 'stone_brick_stairs[facing=north]'); }
    // ivy on the stone backs of the houses
    for (const e of [...W.M.values()]) { if (!/mossy|stone_bricks|^cobblestone$/.test(e.id) || e.y < 3 || Math.abs(e.x) < 12 || e.z > 14 || e.z < -40 || hash3(e.x, e.y*3, e.z) > .1) continue; const s = e.x < 0 ? -1 : 1;
      for (let k = 0; k < 4; k++) { const y = e.y - k; if (W.get(e.x + s, y, e.z) || !W.get(e.x, y, e.z)) break; W.set(e.x + s, y, e.z, `vine[${s < 0 ? 'east' : 'west'}=true]`); } }
    return { wall:'mossy stone', tag:'<b>The town spills out of the ribcage:</b> under each hump of the tail a market hall (the spine is its ridge beam, plank roofs slope down to posts, stalls, tables and lanterns under them); toward the head the way runs under the neck round the jaw, a market between the teeth round a fountain, and a square at the mouth with a round fountain, four stalls and braziers; the skull is the temple.' };
  }

  // ---------------------------------------------------------------- 3 · the fishermen's harbour: the sea serpent in its pond
  function harbour() {
    // the pond where the tail dives: water over sand and gravel, a sandy shore; the bones rise out of it
    for (let x = -22; x <= 18; x++) for (let z = -86; z <= -36; z++) { const d = ((x + 2)/17)**2 + ((z + 61)/23)**2; if (d > 1.2) continue;
      if (d > 1) { pave(x, z, hash3(x, z, 41) > .3 ? 'sand' : 'gravel'); continue; }
      if (W.get(x, -1, z)) continue;
      W.set(x, -1, z, 'water'); if (d < .6) { if (!W.get(x, -2, z)) W.set(x, -2, z, 'water'); if (!W.get(x, -3, z)) W.set(x, -3, z, hash3(x, z, 42) > .5 ? 'gravel' : 'clay'); }
      else if (!W.get(x, -2, z)) W.set(x, -2, z, 'sand'); }
    // jetties on posts, rails, lanterns; boats moored at them
    const jetty = (x0, x1, z0, z1, d) => { for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { if (isBone(W.get(x, 0, z))) continue; W.set(x, 0, z, ((x + z) & 1) ? 'spruce_planks' : 'stripped_spruce_log[axis=z]');
      if ((x === x0 || x === x1) && (z === z0 || z === z1 || (z - z0) % 4 === 0)) { for (const y of [-1, -2]) { const e = W.get(x, y, z); if (!e || e.id === 'water' || e.id === 'sand') W.set(x, y, z, 'stripped_spruce_log'); } }
      if ((x === x0 || x === x1) && (z - z0) % 4 === 0) { W.set(x, 1, z, 'spruce_fence'); if ((z - z0) % 8 === 0) W.set(x, 2, z, 'crimson_eclipse:vigil_lantern', { d }); } } };
    jetty(3, 4, -56, -40, 4.2); jetty(5, 13, -66, -65, 4.4); jetty(4, 6, -71, -61, 4.4); jetty(-17, -10, -51, -50, 4.5);
    const boat = (x0, z0, d) => { for (let z = z0; z <= z0 + 6; z++) { const end = z === z0 || z === z0 + 6;
        if (end) { W.set(x0, -1, z, `spruce_stairs[facing=${z === z0 ? 'south' : 'north'}]`); W.set(x0, 0, z, `spruce_stairs[facing=${z === z0 ? 'south' : 'north'},half=top]`); continue; }
        for (const dx of [-1, 0, 1]) W.set(x0 + dx, -1, z, 'spruce_planks'); for (const dx of [-1, 1]) W.set(x0 + dx, 0, z, 'spruce_slab'); }
      W.set(x0, 0, z0 + 3, 'spruce_slab'); W.set(x0, 0, z0 + 5, 'barrel'); W.set(x0, 0, z0 + 1, 'spruce_fence'); W.set(x0, 1, z0 + 1, 'crimson_eclipse:vigil_lantern', { d }); };
    boat(7, -54, 4.3); boat(9, -63, 4.5); boat(-13, -58, 4.6);
    // nets strung under the humps, between the bones and the water
    for (const [zA, zB] of [[-54, -40], [-71, -63]]) for (let z = zA; z <= zB; z++) { const cx = Math.floor(SX(z)); let yb = 0; while (yb < 30 && !isBone(W.get(cx + 3, yb, z)) && !isBone(W.get(cx + 2, yb, z))) yb++;
      if (yb >= 30 || yb < 4) continue; W.set(cx + 3, yb - 1, z, 'iron_chain'); for (let y = 1; y < yb - 1; y++) if (hash3(cx, y, z) > .3 && !W.get(cx + 3, y, z)) W.set(cx + 3, y, z, 'cobweb'); }
    // the harbour master's house on the shore (two storeys of ship planking), a fire for smoking the catch
    cabin(15, 19, -64, -60, 4.3);
    W.set(17, 0, -57, 'campfire[lit=false]', LIT(4.1)); smoke.push([17.5, 1, -56.5, 9]); for (const [x, z] of [[16, -57], [18, -57]]) { W.set(x, 0, z, 'spruce_fence'); W.set(x, 1, z, 'spruce_fence'); } W.set(16, 2, -57, 'spruce_slab'); W.set(17, 2, -57, 'spruce_slab'); W.set(18, 2, -57, 'spruce_slab');
    for (const [x, z] of [[14, -55], [15, -55], [14, -54]]) W.set(x, 0, z, 'barrel'); W.set(14, 1, -55, 'barrel'); W.set(19, 0, -55, 'chest[facing=west]');
    for (let z = -40; z <= -36; z++) for (let x = 0; x <= 4; x++) pave(x, z, 'dirt_path');
    // the lighthouse: a tower out of the skull's crown (group 1, it rises with the head), a lantern room, a ladder up from the shrine
    const G1 = { g:1 }, base = (() => { for (let y = 18; y > 4; y--) if (W.get(0, y, 37)?.g === 1) return y; return 14; })(), TOPY = base + 13;
    for (let x = -3; x <= 3; x++) for (let z = 34; z <= 40; z++) { const r = Math.hypot(x, z - 37);
      for (let y = base + 1; y <= TOPY; y++) { if (r > 2.4) continue; if (r > 1.4) W.set(x, y, z, Math.floor((y - base)/3) % 2 ? 'calcite' : 'polished_blackstone_bricks', G1); else W.del(x, y, z); }
      if (r <= 3.3) W.set(x, TOPY + 1, z, r > 2.4 ? 'stripped_dark_oak_log[axis=y]' : 'dark_oak_planks', G1);
      if (r > 2.4 && r <= 3.3) W.set(x, TOPY + 2, z, 'dark_oak_fence', G1);
      for (let y = TOPY + 2; y <= TOPY + 3; y++) if (r > 1.4 && r <= 2.4) W.set(x, y, z, Math.abs(x) === 2 && Math.abs(z - 37) === 2 ? 'stripped_dark_oak_log' : 'glass', G1);
      if (r <= 2.4) W.set(x, TOPY + 4, z, r > 1.4 ? `dark_oak_stairs[facing=${Math.abs(x) >= Math.abs(z - 37) ? (x < 0 ? 'east' : 'west') : (z < 37 ? 'south' : 'north')}]` : 'dark_oak_planks', G1);
      if (r <= 1.4) W.set(x, TOPY + 5, z, r > .5 ? 'dark_oak_slab' : 'gold_block', G1); }
    for (let y = TOPY + 2; y <= TOPY + 3; y++) W.set(0, y, 37, 'crimson_eclipse:crimson_crystal', { g:1, d:5 });
    for (let y = 13; y <= base; y++) for (const z of [36, 37]) W.del(0, y, z);
    for (let y = 1; y <= TOPY; y++) { if (y <= base) W.set(0, y, 36, 'stripped_spruce_log', G1); else if (!W.get(0, y, 36)) W.set(0, y, 36, 'calcite', G1); W.set(0, y, 37, 'ladder[facing=south]', G1); }
    W.set(0, TOPY + 1, 37, 'ladder[facing=south]', G1);
    lights.push([[.5, TOPY + 3, 37.5], [6, .7, .45], 20, 5, 1]);
    const LH = [.5, TOPY + 2.5, 37.5];
    return { wall:'ship planking with portholes', beams:(nt, t, G, eyes) => { if (nt > 9.8) return eyes; const a = applyP(G[1], LH), e = ss(5, 6.5, nt)*(1 - ss(9.2, 9.8, nt)), w = t*.8;
        return [{ a, b:[a[0] + Math.cos(w)*180, a[1] - 6, a[2] + Math.sin(w)*180], w:1.3, e }]; },
      tag:'<b>The sea serpent in its pond:</b> water fills the hollow where the tail dives, so the humps rise out of it; jetties on posts with lanterns, three boats moored, nets strung under the humps, the harbour master\'s house and a smoking fire on the shore; toward the head the skull is a lighthouse: a banded tower out of its crown (it rises with the head) with a lantern room whose light sweeps the land, and light in the sockets.' };
  }

  // a house between two ribs: front wall on the street (x = s·8), the ribs as side walls, hides at the back, a lean-to roof
  function house(s, ra, rb, role, d) {
    const xw = (y, z) => wallX(Ls(s), y, z + .5), za = tab(ra)[2].z, zb = tab(rb)[2].z, z0 = Math.floor(za + 1.3), z1 = Math.floor(zb - 1.3), zm = Math.round((z0 + z1)/2);
    const ins = (ax, y, z) => { const w = xw(y, Math.max(Math.min(z, zb - .6), za + .6)); return w != null && ax + .5 < Math.abs(w) - .9; };
    const RY = ax => Math.min(11, 5 + (ax - 8));
    let backAx = 8; for (let ax = 9; ax <= 20; ax++) if (ins(ax, 1, zm)) backAx = ax;
    for (let ax = 8; ax <= 20; ax++) for (let z = z0 - 1; z <= z1 + 1; z++) { const x = s*ax, edge = z === z0 - 1 || z === z1 + 1;
      if (!ins(ax, 1, z) && ax > 8) continue;
      W.set(x, 0, z, ax === 8 || edge ? 'stripped_spruce_log[axis=z]' : 'spruce_planks');
      for (let y = 1; y < RY(ax); y++) { if (isBone(W.get(x, y, z))) continue;
        if (ax === 8) W.set(x, y, z, edge ? 'stripped_spruce_log' : y === 4 ? 'spruce_planks' : (y === 2 || y === 3) && z !== zm && z1 - z0 >= 2 ? 'glass_pane' : 'spruce_planks');
        else if (edge) { if (ins(ax, y, z)) W.set(x, y, z, WALL(x, y, z)); }
        else if (ins(ax, y, z)) W.del(x, y, z); } }
    panel(Ls(s), z0 - 1, z1 + 1, 0, 11, WALL);
    for (let ax = 7; ax <= 20; ax++) { const y = RY(ax); for (let z = z0 - 1; z <= z1 + 1; z++) { const x = s*ax; if (ax > 8 && !ins(ax, Math.max(1, y - 1), z)) continue; if (isBone(W.get(x, y, z))) continue;
      W.set(x, y, z, y === 11 && ax > 14 ? 'spruce_slab[type=top]' : `dark_oak_stairs[facing=${out(s)}]`); } }
    W.door(s*8, 1, zm, 'spruce_door', { facing:inn(s) }); W.set(s*7, 0, zm, `spruce_stairs[facing=${out(s)}]`);
    for (let z = z0 - 1; z <= z1 + 1; z++) put(W, s*7, 4, z, 'spruce_trapdoor[half=top]');
    put(W, s*7, 3, z1 + 1, 'crimson_eclipse:vigil_lantern[hanging=true]', { d });
    put(W, s*7, 0, z0, pick(['barrel', 'hay_block', `spruce_stairs[facing=${out(s)}]`], hash3(z0, s, 3)));
    if (z1 > zm) put(W, s*7, 0, z1, pick(['barrel', 'cauldron', 'hay_block'], hash3(z1, s, 4)));
    // a loft at the back, a ladder up to it
    for (let ax = 12; ax <= backAx; ax++) for (let z = z0; z <= z1; z++) if (ins(ax, 6, z) && RY(ax) > 7) W.set(s*ax, 6, z, 'spruce_slab[type=top]');
    for (let y = 1; y <= 6; y++) W.set(s*11, y, z0, 'ladder[facing=south]');
    for (let z = z0 + 1; z <= z1; z++) { if (ins(backAx, 7, z)) put(W, s*backAx, 7, z, pick(['barrel', 'hay_block', `chest[facing=${inn(s)}]`], hash3(z, 7, s))); }
    // the trade
    const B = backAx, at = (ax, z, st, o) => { if (ax >= 9 && ax <= B && z >= z0 && z <= z1 && !W.get(s*ax, 1, z)) W.set(s*ax, 1, z, st, o); };
    const ch = `chest[facing=${inn(s)}]`;
    if (role === 'home') { at(B, z0 + 1, 'spruce_slab[type=top]'); put(W, s*B, 2, z0 + 1, 'red_carpet'); at(B, z1, ch); at(9, z1, 'barrel'); at(B - 1, z1, 'spruce_slab[type=top]'); put(W, s*(B - 1), 2, z1, 'candle[candles=2,lit=false]', LIT(d)); }
    if (role === 'smith') { at(B, z0 + 1, `furnace[facing=${inn(s)},lit=false]`, LIT(d)); at(B, z1, `blast_furnace[facing=${inn(s)},lit=false]`, LIT(d + .1)); at(B - 2, z1, 'anvil[facing=north]'); at(9, z1, ch); at(B - 1, z0 + 1, 'cauldron', { awake:'lava_cauldron', d }); }
    if (role === 'carver') { at(B, z0 + 1, 'bone_block'); at(B, z1, 'bone_block'); put(W, s*B, 2, z1, 'bone_block[axis=x]'); at(B - 1, z1, 'smithing_table'); at(9, z1, ch); at(B - 2, z0 + 1, 'calcite'); put(W, s*(B - 2), 2, z0 + 1, 'candle[candles=3,lit=false]', LIT(d)); }
    if (role === 'tannery') { at(B, z0 + 1, 'cauldron'); at(B, z1, 'barrel'); at(B - 1, z1, 'spruce_fence'); put(W, s*(B - 1), 2, z1, 'brown_carpet'); at(9, z1, ch); at(B - 2, z0 + 1, 'barrel'); put(W, s*(B - 2), 2, z0 + 1, 'brown_wool'); }
    if (role === 'tavern') { at(B, z0 + 1, 'barrel'); put(W, s*B, 2, z0 + 1, 'barrel'); at(B, z1, 'barrel'); at(B - 2, zm, 'spruce_slab[type=top]'); put(W, s*(B - 2), 2, zm, 'candle[candles=4,lit=false]', LIT(d)); at(B - 3, zm, `spruce_stairs[facing=${inn(s)}]`); at(9, z1, ch); }
    if (role === 'store') { for (let z = z0 + 1; z <= z1; z++) { at(B, z, z % 2 ? ch : 'barrel'); put(W, s*B, 2, z, 'barrel'); } at(9, z1, 'hay_block'); at(B - 2, z0 + 1, 'barrel'); }
    put(W, s*10, 1, z0 + 1, 'red_carpet');
    hangLantern(W, s*10, 1, zm, 1, d + .05);
  }
  // a nest above the house: floor at y = 12 between the same ribs, a door on the gallery, hides at the back, a plank ceiling
  function nest(s, ra, rb, d) {
    const xw = (y, z) => wallX(Ls(s), y, z + .5), za = tab(ra)[14].z, zb = tab(rb)[14].z, z0 = Math.floor(za + 1.3), z1 = Math.floor(zb - 1.3), zm = Math.round((z0 + z1)/2);
    const ins = (ax, y, z) => { const w = xw(y, Math.max(Math.min(z, zb - .6), za + .6)); return w != null && ax + .5 < Math.abs(w) - .9; };
    let B = 10; for (let ax = 11; ax <= 20; ax++) if (ins(ax, 14, zm)) B = ax;
    for (let ax = 10; ax <= 20; ax++) for (let z = z0 - 1; z <= z1 + 1; z++) { const x = s*ax, edge = z === z0 - 1 || z === z1 + 1;
      if (ax > 10 && !ins(ax, 13, z)) continue; if (isBone(W.get(x, 12, z))) continue;
      W.set(x, 12, z, edge || ax === 10 ? 'stripped_spruce_log[axis=z]' : 'spruce_planks');
      for (let y = 13; y <= 16; y++) { if (isBone(W.get(x, y, z))) continue;
        if (ax === 10) W.set(x, y, z, edge ? 'stripped_spruce_log' : (y === 14 || y === 15) && z !== zm ? 'glass_pane' : 'spruce_planks');
        else if (edge) { if (ins(ax, y, z)) W.set(x, y, z, 'spruce_planks'); } else if (ins(ax, y, z)) W.del(x, y, z); }
      if (ins(ax, 17, z) || ax === 10) W.set(x, 17, z, ax === 10 ? `spruce_stairs[facing=${out(s)},half=bottom]` : 'spruce_planks'); }
    for (let z = z0 - 1; z <= z1 + 1; z++) put(W, s*9, 17, z, `spruce_stairs[facing=${out(s)}]`);
    panel(Ls(s), z0 - 1, z1 + 1, 12, 17, (x, y, z) => y === 17 ? 'spruce_planks' : WALL(x, y - 12, z));
    W.door(s*10, 13, zm, 'spruce_door', { facing:inn(s) });
    const ch = `chest[facing=${inn(s)}]`, at = (ax, z, st, o) => { if (ax >= 11 && ax <= B && z >= z0 && z <= z1 && !W.get(s*ax, 13, z)) W.set(s*ax, 13, z, st, o); };
    at(B, z0 + 1, 'spruce_slab[type=top]'); put(W, s*B, 14, z0 + 1, pick(['red_carpet', 'white_carpet', 'brown_carpet'], hash3(z0, s, 9)));
    at(B, z1, ch); at(11, z1, 'barrel'); at(B - 1, z1, 'spruce_slab[type=top]'); put(W, s*(B - 1), 14, z1, 'candle[candles=2,lit=false]', LIT(d));
    hangLantern(W, s*11, 13, zm, 0, d + .05);
  }
  // a two-storey cabin of half-timbering (x0..x1, z0..z1 outside walls), door on the east; its roof stops at the bones and is chained to them
  function cabin(x0, x1, z0, z1, d) { const cx = Math.round((x0 + x1)/2), cz = Math.round((z0 + z1)/2), free = (x, y, z) => !isBone(W.get(x, y, z));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const ex = x === x0 || x === x1, ez = z === z0 || z === z1, corner = ex && ez;
      W.set(x, 0, z, 'spruce_planks'); W.set(x, 4, z, ex || ez ? 'stripped_dark_oak_log[axis=x]' : 'spruce_planks');
      for (const y of [1, 2, 3, 5, 6, 7]) { if (!free(x, y, z)) continue; if (!(ex || ez)) { W.del(x, y, z); continue; }
        W.set(x, y, z, corner ? 'stripped_dark_oak_log' : (y === 2 || y === 6) && (x === cx || z === cz) ? 'glass_pane' : WALL(x, y, z)); } }
    [3, 2, 1, 0].forEach((h, k) => { for (let dx = -h; dx <= h; dx++) for (let dz = -h; dz <= h; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== h) continue; const x = cx + dx, z = cz + dz, y = 8 + k; if (!free(x, y, z)) continue;
      W.set(x, y, z, h ? `dark_oak_stairs[facing=${Math.abs(dx) >= Math.abs(dz) ? (dx < 0 ? 'east' : 'west') : (dz < 0 ? 'south' : 'north')}]` : 'dark_oak_planks'); } });
    for (const [x, z] of [[cx, cz], [x0, z0], [x1, z1]]) { const y0 = x === cx ? 12 : 9; let t = y0; while (t < 30 && !W.get(x, t, z)) t++; if (t < 30 && isBone(W.get(x, t, z))) for (let y = y0; y < t; y++) W.set(x, y, z, 'iron_chain'); }
    W.door(x1, 1, cz, 'spruce_door', { facing:'east' }); W.set(x1 + 1, 0, cz, 'spruce_stairs[facing=west]');
    for (let y = 1; y <= 4; y++) W.set(x0 + 1, y, z0 + 1, 'ladder[facing=south]');
    W.set(x0 + 1, 1, z1 - 1, 'chest[facing=east]'); W.set(x0 + 2, 1, z1 - 1, 'barrel'); W.set(x1 - 1, 1, z0 + 1, `furnace[facing=west,lit=false]`, LIT(d)); W.set(cx, 1, cz, 'red_carpet');
    W.set(x0 + 1, 5, z1 - 1, 'spruce_slab[type=top]'); W.set(x0 + 1, 6, z1 - 1, 'white_carpet'); W.set(x1 - 1, 5, z1 - 1, 'chest[facing=west]'); W.set(x1 - 1, 5, z0 + 1, 'spruce_slab[type=top]');
    W.set(x1 - 1, 6, z0 + 1, 'candle[candles=3,lit=false]', LIT(d)); hangLantern(W, cx, 1, cz, 1, d); hangLantern(W, cx, 5, cz, 0, d + .1);
    W.set(x1 + 1, 3, z0, 'crimson_eclipse:vigil_lantern', { d }); W.set(x1 + 1, 2, z0, 'spruce_fence'); W.set(x1 + 1, 1, z0, 'spruce_fence'); W.set(x1 + 1, 0, z0, 'spruce_fence'); }
  // a spiral stair in the gap of a broken rib, framed by four posts and a little roof
  function stairTower(s, zc) { const cx = s*12, cz = Math.round(zc);
    spiral(W, cx, cz, 0, 11, 'spruce_stairs', 'stripped_spruce_log');
    for (let ax = 10; ax <= 11; ax++) for (let z = cz - 1; z <= cz + 1; z++) put(W, s*ax, 12, z, 'spruce_planks');
    for (const [a, b] of [[-2, -2], [-2, 2], [2, -2], [2, 2]]) for (let y = 0; y <= 14; y++) W.set(cx + a, y, cz + b, y % 5 === 4 ? 'spruce_log' : 'stripped_spruce_log');
    K.pyramid(W, cx, cz, 15, [3, 2, 1, 0], 'dark_oak_planks', 'dark_oak_stairs'); W.set(cx, 19, cz, 'crimson_eclipse:vigil_lantern', { d:4.2 });
    for (let y = 0; y <= 14; y += 7) for (let a = -1; a <= 1; a++) { put(W, cx + a, y + 4, cz - 2, 'spruce_fence'); put(W, cx + a, y + 4, cz + 2, 'spruce_fence'); } }
  // a cocoon house under the spine: a round room on x = 0, a pointed keel below, a stepped roof, chains up to the spine
  function cocoon(zc, d) {
    const R = (x, z) => Math.hypot(x, z - zc);
    for (let x = -4; x <= 4; x++) for (let z = zc - 4; z <= zc + 4; z++) { const r = R(x, z);
      if (r <= 1.2) { W.set(x, 9, z, 'stripped_spruce_log'); W.set(x, 10, z, 'spruce_planks'); }
      if (r <= 2.3) W.set(x, 11, z, r > 1.2 ? `spruce_stairs[facing=${x === 0 ? (z < zc ? 'north' : 'south') : x < 0 ? 'west' : 'east'},half=top]` : 'spruce_planks');
      if (r <= 3.3) W.set(x, 12, z, r > 2.4 ? 'stripped_spruce_log[axis=y]' : ((x + z) & 1) ? 'spruce_planks' : 'stripped_spruce_wood');
      for (let y = 13; y <= 16; y++) if (r > 2.4 && r <= 3.3) W.set(x, y, z, (y === 14 || y === 15) && (x === 0 || z === zc) ? 'glass_pane' : (Math.abs(x) === 2 && Math.abs(z - zc) === 2) ? 'stripped_spruce_log' : y === 16 ? 'stripped_dark_oak_log' : 'spruce_planks');
      if (r <= 3.6) W.set(x, 17, z, r > 2.4 ? `dark_oak_stairs[facing=${x === 0 ? (z < zc ? 'south' : 'north') : x < 0 ? 'east' : 'west'}]` : 'dark_oak_planks');
      if (r <= 2.4) W.set(x, 18, z, r > 1.3 ? `dark_oak_stairs[facing=${x === 0 ? (z < zc ? 'south' : 'north') : x < 0 ? 'east' : 'west'}]` : 'dark_oak_planks');
      if (r <= 1.3) W.set(x, 19, z, 'dark_oak_planks'); }
    W.set(0, 20, zc, 'stripped_spruce_log'); let top = 21; while (top < 40 && !W.get(0, top, zc)) W.set(0, top++, zc, 'iron_chain');
    for (const dz of [-2, 2]) { let t = 18; while (t < 40 && !W.get(0, t, zc + dz)) t++; if (t < 40) for (let y = 18; y < t; y++) W.set(0, y, zc + dz, 'iron_chain'); }
    for (const s of [-1, 1]) { W.del(s*3, 14, zc); W.door(s*3, 13, zc, 'spruce_door', { facing:out(s) });
      for (let ax = 4; ax <= 6; ax++) for (let dz = -1; dz <= 1; dz++) { W.set(s*ax, 12, zc + dz, dz ? 'spruce_planks' : 'stripped_spruce_log[axis=x]'); if (dz) put(W, s*ax, 13, zc + dz, 'spruce_fence'); }
      for (let dz = -1; dz <= 1; dz += 2) W.del(s*7, 13, zc + dz); }
    W.del(-7, 13, zc); W.del(7, 13, zc);
    W.set(-1, 13, zc - 1, `chest[facing=south]`); W.set(1, 13, zc - 1, 'barrel'); W.set(0, 13, zc + 1, 'spruce_slab[type=top]'); W.set(0, 14, zc + 1, 'candle[candles=3,lit=false]', LIT(d));
    W.set(0, 13, zc, 'red_carpet'); W.set(-1, 13, zc + 1, 'white_carpet'); W.set(1, 13, zc + 1, 'white_carpet');
    hangLantern(W, 0, 14, zc, 0, d + .1);
  }
  function Ls(s) { return side(s); }
}

// ================================================================ B · the carcass closed into a great hall
// The ribcage becomes a longhouse: daub and timber stretched between the ribs up to y = 14, hides above to y = 23 (a slit
// open under the spine for the smoke), timber ribs where a rib is broken, a front gable with a gate and a rose window of bone,
// a back gable with a door. Inside: hearths and long tables, a seat of bone; two decks along the sides (rooms between the
// ribs, then stores), stairs and ladders, two bridges across under the spine and a lookout with a bell.
function villageB(V) {
  const { W, isBone, tab, wallX, panel, RIBS } = V, smoke = [], lights = [];
  const DAUB = (x, y, z) => y % 5 === 0 ? 'stripped_spruce_log[axis=z]' : hash3(x, y, z) > .78 ? 'packed_mud' : 'mud_bricks';
  // timber ribs where the bones are broken: the hall needs every arch
  for (const r of RIBS) if (r.snapped || r.fallen) for (let k = r.snapped ? 5 : 0; k < 9; k++) { const a = bez(r.P, k/9), b = bez(r.P, (k + 1)/9);
    rast(W, taper(a, b, .85), `stripped_spruce_log[axis=${axisOf(sub(b, a))}]`, {}, (x, y, z) => isBone(W.get(x, y, z))); }
  const isFrame = e => isBone(e) || (!!e && /stripped_spruce_log/.test(e.id));
  const L = s => RIBS.filter(r => r.s === s).sort((a, b) => a.z - b.z);
  const xw = (s, y, z) => wallX(L(s), y, z + .5);
  const inB = (x, y, z) => { const s = x < 0 ? -1 : 1, w = xw(s, y, z); return w != null && Math.abs(x + .5 - .5) + .5 < Math.abs(w - .5) - .4; };
  // the walls: daub with timber bands, windows and doors in every gap; hides above, torn in places
  for (const s of [-1, 1]) { const Ls = L(s);
    panel(Ls, -40, 14, 0, 14, (x, y, z) => isFrame(W.get(x, y, z)) ? null : DAUB(x, y, z));
    panel(Ls, -40, 14, 15, 23, (x, y, z) => isFrame(W.get(x, y, z)) || (y > 19 && hash3(x, y, z) < .12) ? null : y === 19 ? 'red_wool' : HIDE(x, y, z));
    for (let g = 0; g + 1 < Ls.length; g++) { const zc = Math.round((tab(Ls[g])[6].z + tab(Ls[g + 1])[6].z)/2);
      for (const y of [3, 4, 8, 9, 12]) { const x = Math.floor(xw(s, y, zc)); if (!isFrame(W.get(x, y, zc))) W.set(x, y, zc, 'glass_pane'); }
      if (g === 2 || g === 5) { const x = Math.floor(xw(s, 1, zc)); W.door(x, 1, zc, 'spruce_door', { facing:out(s) }); W.set(x + s, 0, zc, `spruce_stairs[facing=${inn(s)}]`); } } }
  // the gables: the front at z = 12 (gate, rose window of bone), the back at z = -38 (a door, a small round window)
  const gable = (rib, zp, front) => { const T = tab(rib);
    for (let y = 0; y <= 27; y++) { const p = T[y]; if (!p) continue; const half = Math.floor(Math.abs(p.x - .5)), zr = Math.round(p.z);
      for (let x = -half; x <= half; x++) { const ax = Math.abs(x), r = Math.hypot(x, y - 16); if (isBone(W.get(x, y, zp))) continue;
        if (front && ax <= 1 && y >= 1 && y <= 4) { W.del(x, y, zp); continue; }
        if (!front && x === 0 && (y === 1 || y === 2)) continue;
        let m = y === 0 ? 'spruce_planks' : ax === half || y % 6 === 0 || ax === 4 || ax === 9 ? 'stripped_spruce_log' : DAUB(x, y, zp);
        if (front && r <= 3.3) m = 'red_stained_glass'; else if (front && r <= 4.3) m = 'bone_block';
        if (!front && Math.hypot(x, y - 12) <= 2.1) m = 'red_stained_glass';
        W.set(x, y, zp, m); }
      for (const s of [-1, 1]) for (let z = Math.min(zr, zp); z <= Math.max(zr, zp); z++) { const x = s < 0 ? -half - 1 : half + 1; if (!isFrame(W.get(x, y, z))) W.set(x, y, z, DAUB(x, y, z)); } }
    if (front) { for (const s of [-1, 1]) W.set(s, 4, zp, `spruce_stairs[facing=${s < 0 ? 'west' : 'east'},half=top]`); W.set(0, 5, zp, 'chiseled_polished_blackstone'); }
    else W.door(0, 1, zp, 'spruce_door', { facing:'north' }); };
  const R = L(1); gable(R[R.length - 1], 12, true); gable(R[0], -38, false);
  // the floor of the hall
  for (let z = -37; z <= 11; z++) for (let x = -18; x <= 18; x++) if (inB(x, 1, z)) put(W, x, 0, z, (x === 0 || Math.abs(x) === 8) ? 'stripped_spruce_log[axis=z]' : 'spruce_planks');
  // hearths down the middle, long tables either side, a seat of bone at the back
  for (const z of [-29, -19, -9]) { W.set(0, 1, z, 'campfire[lit=false]', LIT(3.8 + (z + 30)*.01)); for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) W.set(a, 1, z + b, 'cobblestone_slab'); smoke.push([.5, 2, z + .5, 22]); }
  lights.push([[.5, 3, -18.5], [4, 1.4, .45], 16, 3.8]);
  for (const s of [-1, 1]) for (let z = -32; z <= 2; z++) { if (z % 9 === 4) continue;
    W.set(s*4, 1, z, 'dark_oak_slab[type=top]'); W.set(s*3, 1, z, `spruce_stairs[facing=${s < 0 ? 'east' : 'west'}]`); W.set(s*5, 1, z, `spruce_stairs[facing=${s < 0 ? 'west' : 'east'}]`);
    if (z % 4 === 0) W.set(s*4, 2, z, 'candle[candles=3,lit=false]', LIT(4 + (z + 32)*.01)); }
  for (let x = -2; x <= 2; x++) for (let z = -36; z <= -34; z++) W.set(x, 1, z, 'calcite');
  W.set(0, 2, -35, 'spruce_stairs[facing=north]'); for (const s of [-1, 1]) { W.set(s, 2, -35, 'bone_block'); W.set(s, 3, -35, 'bone_block[axis=y]'); }
  for (let y = 2; y <= 4; y++) W.set(0, y, -36, 'bone_block[axis=y]'); W.set(0, 5, -36, 'crimson_eclipse:crimson_crystal', { d:5 });
  for (const s of [-1, 1]) { W.set(s*2, 2, -34, 'candle[candles=4,lit=false]', LIT(4.2)); W.set(s*2, 2, -36, 'barrel'); }
  // along the walls of the hall: the village's workshops and stores
  const WORK = ['barrel', 'chest', 'furnace', 'anvil', 'barrel', 'smithing_table', 'cauldron', 'hay_block', 'chest', 'barrel', 'bone_block'];
  for (const s of [-1, 1]) for (let z = -35; z <= 10; z++) { const w = xw(s, 1, z); if (w == null) continue; const ax = Math.floor(Math.abs(w - .5) - 1.4), x = s*ax;
    if (W.get(x, 1, z) || !W.get(x, 0, z) || hash3(x, 1, z) < .25) continue;
    const id = WORK[Math.floor(hash3(x, 2, z)*WORK.length)];
    W.set(x, 1, z, id === 'chest' ? `chest[facing=${inn(s)}]` : id === 'furnace' ? `furnace[facing=${inn(s)},lit=false]` : id === 'anvil' ? 'anvil[facing=north]' : id, id === 'furnace' ? LIT(4.3) : {});
    if (id === 'barrel' && hash3(x, 3, z) > .5) put(W, x, 2, z, 'barrel'); }
  // deck 1 (y = 9): a walk along the edge, rooms between the ribs behind plank fronts
  const DECK = (y, axMin) => { for (let z = -37; z <= 11; z++) for (let x = -18; x <= 18; x++) { if (Math.abs(x) < axMin || !inB(x, y + 1, z) || W.get(x, y, z)) continue;
    W.set(x, y, z, Math.abs(x) === axMin ? 'stripped_spruce_log[axis=z]' : 'dark_oak_planks'); if (Math.abs(x) === axMin) put(W, x, y + 1, z, 'dark_oak_fence'); } };
  DECK(9, 9);
  for (const s of [-1, 1]) { const Ls = L(s);
    for (let g = 0; g + 1 < Ls.length; g++) { const za = Math.round(tab(Ls[g])[11].z), zb = Math.round(tab(Ls[g + 1])[11].z), zm = Math.round((za + zb)/2);
      for (const zp of [za, zb]) for (let ax = 11; ax <= 18; ax++) for (let y = 10; y <= 13; y++) if (inB(s*ax, y, zp) && !isFrame(W.get(s*ax, y, zp))) W.set(s*ax, y, zp, 'spruce_planks');
      for (let z = za + 1; z < zb; z++) for (let y = 10; y <= 13; y++) W.set(s*11, y, z, (y === 11 || y === 12) && z !== zm ? 'glass_pane' : y === 13 ? 'stripped_spruce_log[axis=z]' : 'spruce_planks');
      W.door(s*11, 10, zm, 'spruce_door', { facing:inn(s) });
      let B = 12; for (let ax = 12; ax <= 18; ax++) if (inB(s*ax, 10, zm)) B = ax;
      const at = (ax, z, st, o) => { if (ax >= 12 && ax <= B && z > za && z < zb && !W.get(s*ax, 10, z) && inB(s*ax, 10, z)) W.set(s*ax, 10, z, st, o); };
      at(B, za + 1, 'spruce_slab[type=top]'); put(W, s*B, 11, za + 1, pick(['red_carpet', 'white_carpet', 'brown_carpet'], hash3(za, s, 1)));
      at(B, zb - 1, `chest[facing=${inn(s)}]`); at(12, zb - 1, 'barrel'); at(B - 1, zb - 1, 'spruce_slab[type=top]'); put(W, s*(B - 1), 11, zb - 1, 'candle[candles=2,lit=false]', LIT(4.4 + g*.08));
      put(W, s*12, 10, za + 1, 'red_carpet'); } }
  // deck 2 (y = 18): the stores under the hides
  DECK(18, 10);
  for (let z = -37; z <= 11; z++) for (const s of [-1, 1]) for (let ax = 11; ax <= 16; ax++) { const x = s*ax; if (!W.get(x, 18, z) || W.get(x, 19, z) || !inB(x, 19, z) || hash3(x, 19, z) < .55) continue;
    if (inB(x + s, 19, z)) continue; W.set(x, 19, z, pick(['barrel', 'hay_block', 'barrel', `chest[facing=${inn(s)}]`, 'hay_block'], hash3(x, 20, z))); if (hash3(x, 21, z) > .6) put(W, x, 20, z, 'hay_block'); }
  // stairs to deck 1, ladders to deck 2
  for (let y = 1; y <= 9; y++) { W.set(-8, y, -y, 'spruce_stairs[facing=north]'); W.set(8, y, -30 + y, 'spruce_stairs[facing=south]'); }
  for (const [x, z] of [[-9, -9], [-9, -10], [9, -21], [9, -20]]) W.del(x, 10, z);
  for (const [s, z] of [[-1, -23], [1, -9]]) { for (let y = 10; y <= 17; y++) W.set(s*11, y, z, 'stripped_spruce_log'); for (let y = 10; y <= 18; y++) W.set(s*10, y, z, `ladder[facing=${inn(s)}]`); W.del(s*10, 19, z); }
  // two bridges across under the spine; a mast on one up to a lookout with a bell
  for (const z0 of [-15, -1]) for (let x = -9; x <= 9; x++) for (let z = z0; z <= z0 + 2; z++) { W.set(x, 18, z, z === z0 + 1 ? 'stripped_spruce_log[axis=x]' : 'dark_oak_planks'); if (z !== z0 + 1 && Math.abs(x) < 9) W.set(x, 19, z, 'dark_oak_fence'); }
  for (const s of [-1, 1]) for (const z0 of [-15, -1]) for (let z = z0; z <= z0 + 2; z++) W.del(s*10, 19, z);
  W.del(0, 19, -13); for (let y = 19; y <= 24; y++) W.set(0, y, -14, 'stripped_spruce_log'); for (let y = 19; y <= 25; y++) W.set(0, y, -13, 'ladder[facing=south]');
  for (let x = -2; x <= 2; x++) for (let z = -16; z <= -12; z++) { if (x === 0 && z === -13) continue; W.set(x, 25, z, 'dark_oak_planks'); if (Math.abs(x) === 2 || z === -16 || z === -12) put(W, x, 26, z, 'dark_oak_fence'); }
  W.del(0, 26, -12); W.set(1, 26, -15, 'bell[attachment=floor,facing=east]');
  for (const z of [-16, -12, -1, 1]) { const y0 = z < -5 ? 26 : 19; W.del(0, y0, z); let t = y0; while (t < 40 && !W.get(0, t, z)) t++; if (t < 40) for (let y = y0; y < t; y++) W.set(0, y, z, 'iron_chain'); }
  // lanterns under the decks and the bridges
  for (const s of [-1, 1]) for (let z = -34; z <= 8; z += 5) hangLantern(W, s*9, 3, z, 1, 4 + (z + 34)*.01);
  for (const s of [-1, 1]) for (let z = -34; z <= 8; z += 7) hangLantern(W, s*11, 12, z, 0, 4.6);
  return { smoke, lights,
    tag:'The fossil of a sea serpent, some 130 blocks long, its skull resting its jaw on the plain (a shrine inside), a vault in its belly down the well. <b>The ribcage is closed into a great hall:</b> daub and timber stretched between the ribs, hides above them (a slit left open under the spine for the smoke), timber ribs where the bones are broken, a front gable with a gate and a rose window framed in bone, a back gable with a door. Inside: three hearths down the middle, long tables, a seat of bone, workshops along the walls; a first deck of rooms between the ribs, a second of stores under the hides, stairs and ladders, two bridges across and a lookout with a bell under the spine. <i>Under the blood moon:</i> every lantern lights, red light runs along the spine and the ribs, the pearl beats, the skull lifts to the moon and fires at it. <i>Cut slider: look inside.</i>' };
}

CE.structures = CE.structures || {};
CE.structures.leviathan = leviathan;
})();
