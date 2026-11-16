// Crimson Eclipse structures: shared helpers for the builders (distance functions, furnishing, spiral stairs).
// Loaded by the preview pages and by tools/export-structure.mjs.
'use strict';
(function () {
const CE = window.CE;
const { hash3, vnoise, ss } = CE.math, K = CE.kit;
const { M4, Tm, Sm, RX, RY, RZ, about, applyP, spinUp, norm, dirFrom } = CE.m;
const pick = (list, r) => list[Math.floor(r*list.length) % list.length];
const facingIn = (dx, dz) => Math.abs(dx) >= Math.abs(dz) ? (dx < 0 ? 'east' : 'west') : (dz < 0 ? 'south' : 'north');
const facingOut = (dx, dz) => ({ east:'west', west:'east', north:'south', south:'north' })[facingIn(dx, dz)];
const LIT = d => ({ awake:{ lit:true }, d });
const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]], dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2], len = a => Math.hypot(a[0], a[1], a[2]);
// distance functions (negative inside)
const taper = (a, b, r0, r1 = r0) => { const f = p => { const pa = sub(p, a), ba = sub(b, a), h = Math.max(0, Math.min(1, dot(pa, ba)/dot(ba, ba)));
  return len([pa[0]-ba[0]*h, pa[1]-ba[1]*h, pa[2]-ba[2]*h]) - (r0 + (r1 - r0)*h); }; f.seg = [a, b, Math.max(r0, r1) + 1]; return f; };
const ell = (c, r) => { const f = p => (len([(p[0]-c[0])/r[0], (p[1]-c[1])/r[1], (p[2]-c[2])/r[2]]) - 1)*Math.min(...r); f.seg = [c, c, Math.max(...r) + 1]; return f; };
const axisOf = v => { const a = v.map(Math.abs); return a[1] >= a[0] && a[1] >= a[2] ? 'y' : a[0] >= a[2] ? 'x' : 'z'; };
// fill every cell inside a distance function that has .seg; mat(x, y, z) or a state; skip(x, y, z) keeps a cell untouched
function rast(W, f, mat, opts = {}, skip = null) { const [a, b, r] = f.seg;
  for (let x = Math.floor(Math.min(a[0], b[0]) - r); x <= Math.max(a[0], b[0]) + r; x++) for (let y = Math.floor(Math.min(a[1], b[1]) - r); y <= Math.max(a[1], b[1]) + r; y++)
    for (let z = Math.floor(Math.min(a[2], b[2]) - r); z <= Math.max(a[2], b[2]) + r; z++)
      if (f([x + .5, y + .5, z + .5]) < 0 && !(skip && skip(x, y, z))) W.set(x, y, z, typeof mat === 'function' ? mat(x, y, z) : mat, opts); }
const bez = (P, t) => { const u = 1 - t; return [0, 1, 2].map(k => u*u*u*P[0][k] + 3*u*u*t*P[1][k] + 3*u*t*t*P[2][k] + t*t*t*P[3][k]); };
// a smooth curve through [z, value] points
const curve = pts => z => { let i = 0; while (i < pts.length - 2 && z > pts[i + 1][0]) i++;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], t = Math.max(0, Math.min(1, (z - p1[0])/(p2[0] - p1[0])));
  return .5*(2*p1[1] + (p2[1] - p0[1])*t + (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1])*t*t + (3*p1[1] - p0[1] - 3*p2[1] + p3[1])*t*t*t); };
// a lantern on a chain under whatever is above (x, y, z): finds the first block upwards, hangs `links` links, only into free cells
function hangLantern(W, x, y, z, links, d, opts = {}) { let top = y; while (top < y + 40 && !W.get(x, top, z)) top++; if (top >= y + 40) return false;
  const yl = top - 1 - links; if (yl < 1) return false; for (let k = top - 1; k > yl; k--) if (W.get(x, k, z)) return false;
  if (W.get(x, yl, z) || W.get(x, yl - 1, z)) return false;
  for (let k = top - 1; k > yl; k--) W.set(x, k, z, 'iron_chain', opts); W.set(x, yl, z, 'crimson_eclipse:vigil_lantern[hanging=true]', { ...opts, d }); return true; }
const box = (c, h) => p => { const q = [Math.abs(p[0]-c[0]) - h[0], Math.abs(p[1]-c[1]) - h[1], Math.abs(p[2]-c[2]) - h[2]]; return len(q.map(v => Math.max(v, 0))) + Math.min(Math.max(...q), 0); };
const rbox = (c, h, r) => { const b = box(c, h.map(v => v - r)); return p => b(p) - r; };
// set a block only where nothing is (furnishing never cuts walls)
const put = (W, x, y, z, s, o) => { if (!W.get(x, y, z)) W.set(x, y, z, s, o); };
const onFloor = (W, x, y, z) => !W.get(x, y, z) && W.get(x, y - 1, z) && CE.blocks.fullSolid(W.get(x, y - 1, z));
// a spiral stair round a pole: 8 cells round (cx, cz), one step up each cell; headroom is cut through floors on the way
function spiral(W, cx, cz, y0, y1, mat, pole) {
  const R = [[1,0], [1,1], [0,1], [-1,1], [-1,0], [-1,-1], [0,-1], [1,-1]], steps = [];
  for (let y = y0, i = 0; y <= y1; y++, i++) { const [a, b] = R[i % 8], [c, d] = R[(i + 1) % 8]; steps.push([cx + a, y, cz + b, c - a > 0 ? 'east' : c - a < 0 ? 'west' : d - b > 0 ? 'south' : 'north']); }
  const isStep = new Set(steps.map(s => s[0] + ',' + s[1] + ',' + s[2]));
  for (const [x, y, z] of steps) for (let k = 1; k <= 3; k++) if (!isStep.has(x + ',' + (y + k) + ',' + z)) W.del(x, y + k, z);
  for (const [x, y, z, f] of steps) W.set(x, y, z, `${mat}[facing=${f}]`);
  for (let y = y0 - 1; y <= y1 + 2; y++) W.set(cx, y, cz, pole);
}

CE.sk = { hash3, vnoise, ss, K, M4, Tm, Sm, RX, RY, RZ, about, applyP, spinUp, norm, dirFrom, pick, facingIn, facingOut, LIT, sub, dot, len, taper, ell, box, rbox, put, onFloor, spiral,
  axisOf, rast, bez, curve, hangLantern };
})();
