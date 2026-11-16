// Crimson Eclipse structures: the Kneeling Colossus (vault/04 - Design/Structures.md, round 4, kept by Bastien).
// One builder for the preview (preview/kneeling-colossus.html) and the game (tools/export-structure.mjs writes
// mod/content/data/crimson_eclipse/structure/kneeling_colossus.nbt from it). Every block sits in one cell.
'use strict';
(function () {
const CE = window.CE;
const { hash3, vnoise, ss, K, M4, Tm, Sm, RX, RY, RZ, about, applyP, spinUp, norm, dirFrom, pick, facingIn, facingOut, LIT, taper, ell, box, rbox, put, onFloor, spiral } = CE.sk;
function colossus(W) {
  const Y = 4, P = (x, y, z) => [x, y + Y, z], TB = 'polished_blackstone_bricks', TC = 'chiseled_polished_blackstone';
  // the dais, its ring of pillars and braziers
  for (let x = -26; x <= 26; x++) for (let z = -26; z <= 26; z++) { const r = Math.hypot(x, z); if (r > 24.5) continue;
    for (let y = 0; y < Y; y++) W.set(x, y, z, TB);
    if (r > 23) W.set(x, Y - 1, z, `polished_blackstone_brick_stairs[facing=${facingIn(x, z)}]`);
    else W.set(x, Y - 1, z, Math.floor(r) % 5 === 0 ? TC : r < 9 ? 'polished_blackstone' : TB); }
  for (let i = 0; i < 10; i++) { const a = i/10*Math.PI*2 + .31, x = Math.round(Math.sin(a)*20), z = Math.round(Math.cos(a)*20), fallen = i === 3 || i === 7, h = 6 + Math.floor(hash3(i, 1, 9)*4);
    W.set(x, Y, z, TC);
    if (fallen) { const dx = Math.sign(Math.round(Math.sin(a)*2)), dz = Math.sign(Math.round(Math.cos(a)*2)); for (let k = 1; k <= h - 2; k++) W.set(x + dx*k, Y, z + dz*k, TB); continue; }
    for (let y = Y + 1; y < Y + h; y++) W.set(x, y, z, TB); W.set(x, Y + h, z, TC); W.set(x, Y + h + 1, z, 'campfire[lit=false]', LIT(3.8 + i*.22)); }
  // the body: a hollow shell (stone limbs, dark carved armour); the head is a great helm
  const PELVIS = ell(P(0,17,-3), [10.5,5,6.5]), ABDO = ell(P(0,23.5,-2.5), [8.6,5.6,6.1]);
  const parts = [
    ['body', taper(P(-6,16,-3), P(-6,16,8), 4.3)], ['armor', ell(P(-6,16,9.5), [4.7,4.7,4.7])], ['body', taper(P(-6,15,10), P(-6,3,10.5), 3.7)], ['armor', box(P(-6,1.6,12.5), [3,1.6,4.6])],
    ['body', taper(P(6,16,-3), P(6,4,4), 4.3)], ['armor', ell(P(6,3.8,5), [4.6,4.4,4.6])], ['body', taper(P(6,3.4,4), P(6,3.4,-10), 3.4)], ['armor', box(P(6,1.7,-12.6), [2.8,1.7,3.3])],
    ['body', PELVIS], ['gold', ell(P(0,20.2,-2.6), [10.2,1.6,7.1])], ['body', ABDO],
    ['armor', ell(P(0,31,-1.5), [11.6,7.6,7.6])], ['armor', ell(P(-11.6,35,-1), [5.6,4.3,5.6])], ['armor', ell(P(11.6,35,-1), [5.6,4.3,5.6])],
    ['body', taper(P(-11.5,33,-1), P(-11,25,6), 3.4)], ['body', taper(P(11.5,33,-1), P(11,25,6), 3.4)], ['armor', ell(P(-11,25,6), [3.9,3.9,3.9])], ['armor', ell(P(11,25,6), [3.9,3.9,3.9])],
    ['body', taper(P(-11,25,6), P(-3,24,12), 3.1)], ['body', taper(P(11,25,6), P(3,24,12), 3.1)], ['body', ell(P(-2.7,24,12.7), [2.7,2.9,2.9])], ['body', ell(P(2.7,24,12.7), [2.7,2.9,2.9])],
    ['body', taper(P(0,37,-1), P(0,40,1), 3.3)], ['helm', ell(P(0,43.8,2.2), [5.4,6.2,5.9])],
  ];
  const HEART = P(0, 30, -1), chamber = ell(HEART, [6, 4.6, 5]);
  const mat = (k, x, y, z) => { const n = vnoise(x*.2, y*.2, z*.2), r = hash3(x, y, z);
    if (k === 'gold') return r > .5 ? 'gilded_blackstone' : 'polished_blackstone';
    if (k === 'helm') return r > .88 ? 'polished_blackstone_bricks' : 'polished_blackstone';
    if (k === 'armor') return n > .7 ? 'deepslate_bricks' : r > .88 ? 'deepslate_tiles' : 'polished_deepslate';
    return r > .8 ? 'cobbled_deepslate' : n > .6 ? 'tuff' : 'polished_tuff'; };
  const BODY = new Map(), key = (x, y, z) => x + ',' + y + ',' + z;
  for (let x = -18; x <= 18; x++) for (let y = Y; y <= Y + 51; y++) for (let z = -18; z <= 18; z++) {
    const p = [x, y + .5, z + .5]; let best = 1e9, k = null;     // symmetric about the column x = 0
    for (const [kk, f] of parts) { const d = f(p); if (d < best) { best = d; k = kk; } }
    if (best > 0 || best < -1.8 || chamber(p) < 0) continue;
    W.set(x, y, z, mat(k, x, y, z), k === 'helm' ? { g:1 } : {}); BODY.set(key(x, y, z), k);
  }
  // the face: a round helm with a T-shaped visor, eyes burning at the back of the slit, a gilded rim, a crown (all group 1)
  const front = (x, y) => { for (let z = 20; z >= -10; z--) { const e = W.get(x, y, z); if (e && e.g === 1) return z; } return null; };
  const SL = new Set(), EY = Y + 44; for (let x = -3; x <= 3; x++) SL.add(x + ',' + EY); for (let y = Y + 39; y < EY; y++) SL.add('0,' + y);
  const FR = {}; for (let x = -5; x <= 5; x++) for (let y = Y + 38; y <= Y + 49; y++) FR[x + ',' + y] = front(x, y);
  for (const s of SL) { const [x, y] = s.split(',').map(Number), z = FR[s]; if (z == null) continue;
    W.del(x, y, z); W.set(x, y, z - 1, y === EY && Math.abs(x) === 2 ? 'crimson_eclipse:helm_eye' : 'black_concrete', { g:1, d:4.8 }); }
  for (let x = -4; x <= 4; x++) for (let y = Y + 38; y <= EY + 1; y++) { const s = x + ',' + y; if (SL.has(s)) continue;
    const near = [[1,0], [-1,0], [0,1], [0,-1]].some(([a, b]) => SL.has((x + a) + ',' + (y + b))), z = FR[s]; if (near && z != null) W.set(x, y, z, 'gilded_blackstone', { g:1 }); }
  // the crown: a gold circlet worn round the brow (one cell outside the helm, so nothing sits over it),
  // twelve crystal points set symmetrically, each standing on the gold, the tallest over the visor; a point with no room is left out
  const CRY = Y + 46, HZ = 1.7, outside = ell(P(0,43.8,2.2), [5.4,6.2,5.9]), ring = [];
  for (let x = -8; x <= 8; x++) for (let z = -6; z <= 10; z++) {
    if (W.get(x, CRY, z) || outside([x, CRY + .5, z + .5]) <= 0) continue;
    if ([[1,0], [-1,0], [0,1], [0,-1]].some(([p, q]) => { const e = W.get(x + p, CRY, z + q); return e && e.g === 1; })) ring.push([x, z]); }
  for (const [x, z] of ring) W.set(x, CRY, z, 'gold_block', { g:1 });
  const used = new Set();
  for (let k = 0; k < 12; k++) { const ang = Math.PI/2 + k*Math.PI/6; let best = null, bd = 9;
    for (const [x, z] of ring) { let d = Math.atan2(z - HZ, x) - ang; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
      if (d < bd - 1e-6 || (Math.abs(d - bd) < 1e-6 && x === 0)) { bd = d; best = [x, z]; } }
    if (!best || used.has(best + '')) continue; used.add(best + '');
    const [x, z] = best, h = k === 0 ? 2 : 1; let y = CRY + 1;
    for (let j = 0; j < h && !W.get(x, y, z); j++, y++) W.set(x, y, z, 'crimson_eclipse:crimson_crystal', { g:1, d:5 });
    if (y > CRY + 1 && !W.get(x, y, z)) W.set(x, y, z, 'crimson_eclipse:crimson_crystal_cluster', { g:1, d:5 }); }
  // the cape
  for (let y = Y + 3; y <= Y + 36; y++) { const t = Y + 36 - y, w = 10 + t*.12, zc = -9.2 - t*.32;
    for (let x = Math.floor(-w); x <= Math.ceil(w); x++) { const zf = Math.round(zc + 1.1*Math.sin(x*.45)); if (y < Y + 4 + 6*hash3(x, 0, 21)) continue;
      for (const z of [zf, zf - 1]) put(W, x, y, z, hash3(x, y, z) > .8 ? 'red_terracotta' : 'red_wool'); } }
  // the heart chamber: floor, beating crystal heart (group 2), the crack in the breastplate, loot
  for (let x = -5; x <= 5; x++) for (let z = -6; z <= 3; z++) if (chamber([x, Y + 26.5, z + .5]) < 0) put(W, x, Y + 26, z, 'polished_blackstone');
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2)
    W.set(HEART[0] + dx, HEART[1] + dy, HEART[2] + dz, 'crimson_eclipse:crimson_crystal', { g:2, d:4 });
  for (const e of [...W.M.values()]) if (e.z >= 2 && Math.abs(e.x) < 3.5 + 1.5*vnoise(e.x*.5, e.y*.5, 2) && e.y >= Y + 28 && e.y <= Y + 34 && e.g === 0 && BODY.get(key(e.x, e.y, e.z)) === 'armor') W.del(e.x, e.y, e.z);
  // the crystal sword
  for (let y = Y - 1; y <= Y + 16; y++) for (let x = -1; x <= 1; x++) W.set(x, y, 15, 'crimson_eclipse:crimson_crystal', { d:4.4 + (y - Y)*.09 });
  for (let x = -5; x <= 5; x++) W.set(x, Y + 17, 15, 'gold_block'); W.set(0, Y + 17, 14, 'gold_block'); W.set(0, Y + 17, 16, 'gold_block');
  for (let y = Y + 18; y <= Y + 23; y++) W.set(0, y, 15, 'polished_blackstone');
  for (let x = -1; x <= 1; x++) W.set(x, Y + 24, 15, 'gold_block'); W.set(0, Y + 25, 15, 'crimson_eclipse:crimson_crystal', { d:6.2 });
  // veins, moss, a broken pauldron
  for (const e of [...W.M.values()]) { const k = BODY.get(key(e.x, e.y, e.z)); if (!k || k === 'gold' || e.g) continue;
    if (!W.get(e.x, e.y + 1, e.z) && e.y > Y + 6 && hash3(e.x, e.y, e.z) < .3) W.set(e.x, e.y + 1, e.z, 'moss_carpet');
    if (k === 'body' && Math.abs(vnoise(e.x*.11, e.y*.11, e.z*.11) - .5) < .017) { e.id = 'crimson_eclipse:crimson_vein'; e.d = 4 + Math.hypot(e.x - HEART[0], e.y - HEART[1], e.z - HEART[2])*.07; } }
  K.collapse(W, e => Math.hypot(e.x + 15, e.y - Y - 37, e.z + 1) < 2.6 + 1.6*vnoise(e.x*.4, e.y*.4, e.z*.4), 'cobbled_deepslate', .5);
  // ---- inside: the crypt under the dais, a stair tower between the legs, the reliquary in the pelvis
  for (let x = -9; x <= 9; x++) for (let z = -13; z <= 5; z++) for (let y = -9; y <= -1; y++) {
    const wall = Math.abs(x) === 9 || z === -13 || z === 5;
    if (y === -9) W.set(x, y, z, ((x + z) & 1) ? 'polished_deepslate' : 'deepslate_tiles');
    else if (y === -1) W.set(x, y, z, TB);
    else if (wall) W.set(x, y, z, (Math.abs(x) === 9 && z % 4 === 0) || (Math.abs(z + 4) === 9 && x % 4 === 0) ? TC : TB);
    else W.del(x, y, z); }
  for (const x of [-5, 0, 5]) { for (const z of [-11, -10]) { W.set(x, -8, z, 'polished_deepslate'); W.set(x, -7, z, 'polished_deepslate_slab'); }
    W.set(x, -8, -12, 'candle[candles=3,lit=false]', LIT(4.1 + x*.02)); W.set(x, -4, -12, 'red_wall_banner[facing=south]'); }
  for (let z = -1; z <= 4; z++) for (let y = -8; y <= -6; y++) W.set(5, y, z, 'iron_bars');                    // the treasure room behind bars
  W.door(5, -8, 1, 'iron_door', { facing:'west' });
  for (const [x, z, f] of [[8, 0, 'west'], [8, 3, 'west'], [6, 4, 'north']]) W.set(x, -8, z, `chest[facing=${f}]`);
  for (const [x, y, z] of [[8, -8, 2], [7, -8, 4], [8, -7, 2], [7, -8, 3]]) W.set(x, y, z, hash3(x, y, z) > .4 ? 'gold_block' : 'gilded_blackstone');
  W.set(6, -8, 2, 'candle[candles=4,lit=false]', LIT(4.3));
  for (const [x, z, f] of [[-8, -6, 'east'], [-8, 0, 'east'], [-3, 4, 'north'], [2, -12, 'south']]) W.set(x, -8, z, `chest[facing=${f}]`);
  for (const [x, z] of [[-8, 2], [-8, 3], [-7, 4], [-8, 4], [-8, -9], [-7, -12]]) { W.set(x, -8, z, 'barrel'); if (hash3(x, z, 2) > .5) W.set(x, -7, z, 'barrel'); }
  for (const [x, z] of [[-5, -4], [5, -4], [-5, 2], [0, -8]]) { W.set(x, -2, z, 'iron_chain'); W.set(x, -3, z, 'crimson_eclipse:vigil_lantern[hanging=true]', { d:4.2 + hash3(x, z, 3)*.5 }); }
  for (const [x, z] of [[-8, -12], [8, -12], [-8, -3], [8, -4], [-2, 4], [2, -8]]) put(W, x, -8, z, 'soul_lantern');      // eternal soul lanterns
  for (let i = 0; i < 26; i++) { const x = Math.floor(hash3(i, 1, 41)*17) - 8, z = Math.floor(hash3(i, 2, 41)*17) - 12, high = hash3(i, 3, 41) > .5;
    put(W, x, high ? -2 : -8, z, high ? 'cobweb' : hash3(i, 4, 41) > .5 ? 'bone_block' : 'cobweb'); }
  // the stair tower: a column of stone under the pelvis, a door between the knees, a spiral from the crypt to the heart
  const SC = [0, -4];
  for (let y = Y; y <= Y + 13; y++) for (let x = -4; x <= 4; x++) for (let z = -8; z <= 0; z++) { const d = Math.hypot(x - SC[0], z - SC[1]);
    if (d >= 2.5 && d < 3.6) W.set(x, y, z, y % 4 === 0 ? TC : TB); else if (d < 2.5) W.del(x, y, z); }
  for (let y = -1; y < Y; y++) for (let x = -2; x <= 2; x++) for (let z = -6; z <= -2; z++) if (Math.hypot(x - SC[0], z - SC[1]) < 2.5) W.del(x, y, z);
  W.door(0, Y, -1, 'dark_oak_door', { facing:'south' });
  for (const s of [-1, 1]) { W.set(s, Y + 2, -1, TC); W.set(s*3, Y, 1, 'polished_blackstone_wall'); W.set(s*3, Y + 1, 1, 'crimson_eclipse:vigil_lantern', { d:3.9 }); }
  // the reliquary: a floor across the pelvis, shelves, chests, a table
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 3; z++) if (PELVIS([x, Y + 14.5, z + .5]) < -1.6) put(W, x, Y + 14, z, 'dark_oak_planks');
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 3; z++) { if (!onFloor(W, x, Y + 15, z) || Math.hypot(x - SC[0], z - SC[1]) < 2.6) continue;
    const wallNear = [[1,0], [-1,0], [0,1], [0,-1]].some(([a, b]) => W.get(x + a, Y + 15, z + b)), r = hash3(x, 15, z);
    if (wallNear && r > .55) W.set(x, Y + 15, z, r > .8 ? 'bookshelf' : 'barrel'); }
  for (const [x, z, f] of [[-7, -3, 'east'], [7, -3, 'west'], [3, 1, 'north']]) if (!W.get(x, Y + 15, z)) W.set(x, Y + 15, z, `chest[facing=${f}]`);
  for (const x of [-4, -3]) put(W, x, Y + 15, 0, 'dark_oak_slab[type=top]'); put(W, -4, Y + 16, 0, 'candle[candles=3,lit=false]', LIT(4.5));
  for (const [x, z] of [[-5, -6], [5, -6], [0, 1]]) put(W, x, Y + 18, z, 'crimson_eclipse:vigil_lantern[hanging=true]', { d:4.6 });
  for (const [x, z] of [[-5, -1], [5, -1], [-5, -5], [5, -5]]) if (onFloor(W, x, Y + 15, z)) W.set(x, Y + 15, z, 'soul_lantern');
  for (const [x, z, f] of [[-3, -4, 'east'], [3, -2, 'west']]) put(W, x, Y + 27, z, `chest[facing=${f}]`);
  put(W, 3, Y + 27, -4, 'barrel'); put(W, -3, Y + 27, -1, 'candle[candles=4,lit=false]', LIT(4.2));
  spiral(W, SC[0], SC[1], -8, Y + 26, 'polished_blackstone_brick_stairs', 'polished_blackstone');
  K.vines(W, e => BODY.get(key(e.x, e.y, e.z)) === 'body', .03, 7);
  K.settle(W);                                   // nothing may hold to nothing (carpets over the stair hole, vines on carpets...)
  // for the game: a foundation under the dais rim (it may stand on a slope), and the air the template must carve
  // (the crypt, the stair shaft, a clearing over the dais); the preview ignores both
  for (let x = -25; x <= 25; x++) for (let z = -25; z <= 25; z++) { const r = Math.hypot(x, z); if (r > 24.5 || r < 17) continue;
    for (let y = -6; y <= -1; y++) if (!W.get(x, y, z)) W.set(x, y, z, hash3(x, y, z) > .7 ? 'cobbled_deepslate' : TB); }
  const AIR = W.AIR = new Set(), air = (x, y, z) => { if (!W.get(x, y, z)) AIR.add(x + ',' + y + ',' + z); };
  for (let x = -8; x <= 8; x++) for (let z = -12; z <= 4; z++) for (let y = -8; y <= -2; y++) air(x, y, z);
  for (let y = -1; y <= Y + 13; y++) for (let x = -3; x <= 3; x++) for (let z = -7; z <= -1; z++) if (Math.hypot(x - SC[0], z - SC[1]) < 2.5) air(x, y, z);
  for (let x = -25; x <= 25; x++) for (let z = -25; z <= 25; z++) if (Math.hypot(x, z) <= 24.5) for (let y = Y; y <= Y + 6; y++) air(x, y, z);
  return {
    tag:'He stays, now straight down one column, with a round helm (a T-shaped visor, eyes burning deep in the slit, a gold circlet with crystal points) and a whole dungeon inside: a door between his knees, a spiral stair from a crypt under the dais (tombs, a treasure room behind bars, chests and barrels) up through a reliquary in his pelvis to the chamber of his heart. <i>Under the blood moon:</i> braziers, the heart beats, veins spread, the sword lights, the eyes and the crown burn, he raises his head. <i>Cut slider: look inside.</i>',
    cam:{ target:[0, 26, 0], dist:96, yaw:.55, pitch:.12 },
    sun:norm([.4, .78, .55]), moon:dirFrom(.55 + Math.PI + .1, .42),
    flat:(x, z) => Math.max(Math.hypot(x, z) - 30, 0),
    shakeAt:3.5,
    ground(W) {     // a pilgrims' camp left behind, south-west of the dais
      for (const [cx, cz] of [[-22, 26], [-29, 20]]) for (let z = cz; z <= cz + 4; z++) for (const [x, y] of [[-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]]) W.set(cx + x, y, z, hash3(cx + x, y, z) > .85 ? 'light_gray_wool' : 'white_wool');
      W.set(-25, 0, 31, 'campfire[lit=false]', LIT(3.6)); W.set(-23, 0, 33, 'spruce_log[axis=x]'); W.set(-27, 0, 33, 'spruce_log[axis=z]');
      W.set(-20, 0, 32, 'barrel'); W.set(-20, 1, 32, 'barrel'); W.set(-19, 0, 32, 'chest[facing=west]'); W.set(-30, 0, 26, 'chest[facing=south]');
      W.figure(4, Y, 20);
    },
    groups(nt, t) {
      const g = [], kh = ss(6, 9, nt);
      g[1] = about([.5, Y + 39, .5], RX(-.34*kh + .015*kh*Math.sin(t*.9)));
      const on = ss(4, 5, nt), beat = Math.pow(Math.max(Math.sin(t*4.2), 0), 10) + .6*Math.pow(Math.max(Math.sin(t*4.2 - .7), 0), 10);
      g[2] = about([HEART[0] + .5, HEART[1] + .5, HEART[2] + .5], Sm(1 + .12*beat*on));
      return g;
    },
    lights(W) {
      W.light([HEART[0] + .5, HEART[1] + .5, HEART[2] + .5], [5, .5, .35], 12, 4, 2);
      W.light([.5, Y + 8, 16.5], [3, .3, .2], 9, 4.6);
      for (let i = 0; i < 160; i++) W.part(-12 + hash3(i,1,6)*24, Y + 1 + hash3(i,2,6)*30, -10 + hash3(i,3,6)*28, 0, hash3(i,4,6), .07, 0, 0, 1,1,1);
      for (let i = 0; i < 140; i++) { const a = hash3(i,5,6)*6.283; W.part(.5 + Math.sin(a)*20, Y + 9, .5 + Math.cos(a)*20, 1, hash3(i,7,6), .1, 4.5, 4 + hash3(i,8,6)*5, 4, .7, .3); }
    },
    trees:[[-44,-28,12], [-50,0,14], [-40,34,11], [46,-38,12], [54,-6,13], [-14,-54,12], [16,-52,13], [44,40,12]],
  };
}

// which loot table a container gets in the game, by where it stands (Y = 4 is the top of the dais)
colossus.loot = e => { const Y = 4;
  if (e.y < 0) return e.id === 'barrel' ? 'colossus_supplies' : e.x >= 6 && e.z >= -1 && e.z <= 4 ? 'colossus_treasure' : 'colossus_crypt';
  if (e.y >= Y + 25) return 'colossus_heart';
  if (e.y >= Y + 13) return e.id === 'barrel' ? 'colossus_supplies' : 'colossus_reliquary';
  return 'colossus_camp'; };
CE.structures = CE.structures || {};
CE.structures.kneelingColossus = colossus;
})();
