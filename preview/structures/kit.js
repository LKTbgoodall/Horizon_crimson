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
const ell = (c, r) => p => (len([(p[0]-c[0])/r[0], (p[1]-c[1])/r[1], (p[2]-c[2])/r[2]]) - 1)*Math.min(...r);
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

CE.sk = { hash3, vnoise, ss, K, M4, Tm, Sm, RX, RY, RZ, about, applyP, spinUp, norm, dirFrom, pick, facingIn, facingOut, LIT, sub, dot, len, taper, ell, box, rbox, put, onFloor, spiral };
})();
