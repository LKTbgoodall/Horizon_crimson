// Crimson Eclipse preview engine: textures.
// Vanilla textures come from window.MC_VANILLA (preview/vanilla/textures.js, made by tools/extract-textures.ps1 from the
// player's own client jar; gitignored, never committed). Missing ones are painted stand-ins, flagged in the page.
// Our own textures (ce:...) are painted here and are the real ones.
// A texture reference is "a|b+c#RRGGBB": alternatives (|), layers drawn in order (+), the tint applies to the last layer.
'use strict';
(function () {
const CE = window.CE = window.CE || {};
const { hash3 } = CE.math;
const LAYER = 64;

const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
const sh = (c, k) => [clamp(c[0]*k), clamp(c[1]*k), clamp(c[2]*k)];
const mix = (a, b, k) => [a[0] + (b[0]-a[0])*k, a[1] + (b[1]-a[1])*k, a[2] + (b[2]-a[2])*k];
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// paint(w, h, f(x, y) -> [r, g, b, a?] or null)
function paint(w, h, f) { const c = canvas(w, h), g = c.getContext('2d'), im = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = f(x, y); if (!p) continue; const i = (y*w + x)*4;
    im.data[i] = clamp(p[0]); im.data[i+1] = clamp(p[1]); im.data[i+2] = clamp(p[2]); im.data[i+3] = p[3] == null ? 255 : clamp(p[3]); }
  g.putImageData(im, 0, 0); return c; }
const seedOf = s => { let h = 7; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h; };

// ------------------------------------------------------------------ stand-ins for vanilla textures (approximations)
const DYE = { white:'E9ECEC', orange:'F07613', magenta:'BD44B3', light_blue:'3AAFD9', yellow:'F8C527', lime:'70B919', pink:'ED8DAC', gray:'3E4447',
  light_gray:'8E8E86', cyan:'158991', purple:'792AAC', blue:'35399D', brown:'724728', green:'546D1B', red:'A12722', black:'141519' };
const MAT = [['crying_obsidian','2a0d48'],['obsidian','15101f'],['gilded_blackstone','3a2c26'],['blackstone','2d272c'],['deepslate','4a4a50'],['tuff','6d6e66'],
  ['calcite','dfe0dc'],['dripstone','866b5c'],['mossy','6f7d55'],['cobblestone','7b7b7b'],['smooth_stone','a0a0a0'],['andesite','888a8a'],['diorite','c4c4c4'],
  ['granite','9a6a55'],['red_nether','4a0a0c'],['nether_brick','30161a'],['mud_brick','8b6b52'],['resin','d9701c'],['quartz','ebe5de'],
  ['red_sandstone','b5621f'],['sandstone','d9cc9d'],['end_stone','dcdd9f'],['purpur','a87aa8'],['prismarine','5ea595'],['oxidized','52a386'],['weathered','6c996e'],
  ['exposed','a27e68'],['copper','c06c50'],['gold','f3cf3f'],['iron_block','d8d8d8'],['netherite','443f42'],['coal','161616'],['amethyst','8762c0'],
  ['glowstone','d8b065'],['sea_lantern','b6cfc6'],['shroomlight','f19648'],['magma','8f3b1d'],['redstone_lamp_on','d9a25b'],['redstone_lamp','5d3a23'],
  ['soul_sand','513e32'],['soul_soil','4b3a2e'],['netherrack','703534'],['basalt','4c4b50'],['bone','e2ddc8'],['hay','b18f1a'],['dirt_path','947a46'],
  ['coarse_dirt','7a5739'],['rooted_dirt','8a6448'],['podzol','5d3e18'],['packed_mud','8e6b50'],['mud','3d3a3d'],['dirt','866043'],['gravel','857f7d'],['red_sand','b0571e'],
  ['sand','dbcfa2'],['clay','a1a7b4'],['pale_moss','b8bcb3'],['moss','5b6f2d'],['snow','f6fbfb'],['ice','92b5f9'],['sculk','0d2733'],['pale_oak','e3d9d4'],
  ['dark_oak','452c1a'],['spruce','6f5233'],['birch','c8b77a'],['jungle','a27350'],['acacia','a95a31'],['mangrove','763631'],['cherry','e3b4ad'],['crimson','6b3048'],
  ['warped','2c6a64'],['oak','a3834f'],['bookshelf','6b4f2f'],['crafting','8a6a3f'],['bell','e3b545'],['chest','a0702c'],['banner','e4e4e4'],['lantern','47474f'],
  ['chain','3d4250'],['iron_bars','6c6c70'],['iron_door','c8c8c8'],['iron_trapdoor','c8c8c8'],['torch','8a6a3f'],['cobweb','ececec'],['poppy','c8241b'],['dandelion','f0d63a'],
  ['cornflower','4a6cd8'],['azure','e8eef0'],['oxeye','eeeeee'],['allium','b06ad8'],['tulip','d8443a'],['wither_rose','2a2a2a'],['lily','f2f2f2'],['mushroom','b6463a'],
  ['dead_bush','6b4a24'],['eyeblossom','9a6aa8'],['torchflower','e88e3a'],['roots','8a2f3a'],['lava','d6561a'],['glass','dfeef4'],['stone_brick','7a7a7a'],['brick','985a48'],['stone','7f7f7f']];
const GREY = /grass_block_top|grass_block_side_overlay|short_grass|(^|\/)fern|vine|water_still|(oak|spruce|birch|jungle|acacia|dark_oak|mangrove)_leaves/;
function baseColor(n) {
  const dye = Object.keys(DYE).sort((a, b) => b.length - a.length).find(d => n.startsWith('block/' + d + '_'));
  if (dye) { const c = hex(DYE[dye]); return /terracotta/.test(n) && !/glazed/.test(n) ? sh(mix(c, [150, 100, 80], .45), .85) : c; }
  if (GREY.test(n)) return [168, 168, 168];
  for (const [k, c] of MAT) if (n.includes(k)) return hex(c);
  return [128, 128, 128];
}
function standIn(name) {
  const n = name, s = seedOf(n), c = baseColor(n), N = (x, y, k = 1) => hash3(x + s, y, k), nz = (x, y, a = .22) => sh(c, 1 - a + 2*a*N(x, y));
  if (n === 'entity/chest/normal') return paint(64, 64, (x, y) => { const w = hex('a0702c'), d = hex('5b3c18');
    if (x < 8 && y < 6) return [70, 70, 75]; if (y < 19 && x >= 56) return null; if (y >= 43 && y < 19+14) return null;
    return (x % 14 === 0 || y === 19 || y === 33 || y === 14 || y === 43 || y === 18) ? d : sh(w, .85 + .25*N(x >> 1, y)); });
  if (n === 'entity/bell/bell_body') return paint(32, 32, (x, y) => sh(hex('e3b545'), .78 + .35*N(x, y)));
  if (n === 'entity/banner_base') return paint(64, 64, (x, y) => y >= 42 ? sh(hex('6b4f2f'), .9 + .2*N(x, y)) : [236, 236, 236 - 20*N(x, y)]);
  if (/water_still/.test(n)) return paint(16, 16, (x, y) => { const v = 150 + 50*Math.sin((x + y*.5)*.9 + N(x, y)*2); return [v, v, v, 185]; });
  if (/_fire/.test(n)) { const soul = /soul/.test(n);
    return paint(16, 16, (x, y) => { const h = 4 + 10*hash3(x >> 1, 0, s), k = (16 - y)/h; if (k > 1 || ((x + 1) % 5 === 0)) return null;
      return mix(soul ? [60, 200, 230] : [255, 110, 20], soul ? [200, 255, 255] : [255, 236, 150], 1 - k); }); }
  if (/barrel/.test(n)) return paint(16, 16, (x, y) => /top|bottom/.test(n) ? ((x === 0 || y === 0 || x === 15 || y === 15) ? [92, 64, 34] : sh([130, 94, 52], (y % 4 === 3 ? .75 : 1)*(.9 + .2*N(x, y))))
    : (y === 2 || y === 13) ? [70, 70, 74] : sh([122, 86, 48], (x % 4 === 3 ? .72 : 1)*(.9 + .2*N(x, y))));
  if (/lava|magma/.test(n)) return paint(16, 16, (x, y) => { const v = N(x >> 1, y >> 1); return v > .7 ? [255, 190, 70] : sh(c, .7 + .5*v); });
  if (/glass_pane_top/.test(n)) return paint(16, 16, (x, y) => x >= 7 && x <= 8 ? sh(c, .85) : null);
  if (/stained_glass/.test(n)) return paint(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? [...sh(c, .8), 220] : [...c, 120]);
  if (/glass/.test(n)) return paint(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? [220, 235, 240, 230] : (x - y === 4 || x - y === 5) && x > 6 ? [255, 255, 255, 150] : null);
  if (/iron_bars/.test(n)) return paint(16, 16, (x, y) => (x % 4 === 1 || y === 0 || y === 15) ? sh(c, .8 + .3*N(x, y)) : null);
  if (/chain/.test(n)) return paint(16, 16, (x, y) => x < 3 ? ((y % 4 < 3) ? sh(c, .8 + .4*N(x, y)) : null) : x < 6 ? ((y % 4 > 1) ? sh(c, .7 + .4*N(x, y)) : null) : null);
  if (/soul_lantern|lantern/.test(n)) { const glow = /soul/.test(n) ? [120, 230, 255] : [255, 214, 110];
    return paint(16, 16, (x, y) => { if (x < 6 && y >= 2 && y < 9) return (x === 0 || x === 5 || y === 2 || y === 8) ? [55, 55, 62] : glow;
      if (x < 6 && y >= 9 && y < 15) return [60, 60, 68]; if (x >= 1 && x < 5 && y < 2) return [50, 50, 58]; if (x >= 11 && x < 14 && y >= 1 && y < 3) return [50, 50, 58];
      if (x >= 11 && x < 14 && y >= 10 && y < 12) return [50, 50, 58]; return null; }); }
  if (/candle/.test(n)) { const cc = /^block\/candle/.test(n) ? [222, 205, 168] : c, lit = /_lit/.test(n);
    return paint(16, 16, (x, y) => { if (x < 2 && y >= 8 && y < 16) return sh(cc, .85 + .2*N(x, y)); if (x < 2 && y >= 6 && y < 8) return sh(cc, 1.1);
      if (x === 0 && y === 5) return lit ? [255, 170, 60] : [40, 32, 30]; return null; }); }
  if (/torch/.test(n)) return paint(16, 16, (x, y) => x >= 7 && x < 9 ? (y >= 8 ? sh(c, .9 + .2*N(x, y)) : y >= 6 ? [255, 230, 120] : null) : null);
  if (/_leaves/.test(n)) return paint(16, 16, (x, y) => N(x, y) < .2 ? null : sh(c, .6 + .55*N(x, y, 3)));
  if (/vine/.test(n)) return paint(16, 16, (x, y) => (N(x >> 1, y >> 1) < .45 || N(x, y, 4) < .25) ? null : sh(c, .7 + .4*N(x, y)));
  if (/grass_block_side_overlay/.test(n)) return paint(16, 16, (x, y) => y < 3 + Math.floor(N(x, 0)*2.5) ? sh(c, .85 + .25*N(x, y)) : null);
  if (/grass_block_side/.test(n) || /podzol_side|mycelium_side|dirt_path_side/.test(n)) return paint(16, 16, (x, y) => sh(hex('866043'), .8 + .4*N(x, y)));
  if (/short_grass|fern|dead_bush|roots|sprouts/.test(n)) return paint(16, 16, (x, y) => { const k = (x*7) % 5; return (y > 4 + ((x*13) % 7) && (k === 0 || k === 2) && x > 1 && x < 15) ? sh(c, .7 + .4*N(x, y)) : null; });
  if (/cobweb/.test(n)) return paint(16, 16, (x, y) => (x === y || x === 15 - y || x === 8 || y === 8 || (Math.abs(Math.hypot(x-7.5, y-7.5) - 5) < .5)) ? [235, 235, 235, 220] : null);
  if (/poppy|dandelion|cornflower|azure|oxeye|allium|tulip|wither_rose|lily|torchflower|eyeblossom|mushroom/.test(n))
    return paint(16, 16, (x, y) => { if (Math.hypot(x - 7.5, y - 5) < 2.6) return sh(c, .85 + .3*N(x, y)); if ((x === 7 || x === 8) && y > 6) return [70, 120, 40]; return null; });
  if (/door|trapdoor/.test(n)) return paint(16, 16, (x, y) => { const fr = x < 2 || x > 13 || y < 2 || y > 13 || (/trapdoor/.test(n) && (x === 7 || x === 8 || y === 7 || y === 8));
    return fr ? sh(c, .7) : sh(c, (y % 4 === 0 ? .8 : 1) * (.9 + .2*N(x, y))); });
  if (/bookshelf/.test(n)) return paint(16, 16, (x, y) => { if (y < 1 || y === 7 || y === 8 || y > 14) return sh(hex('a3834f'), .9);
    const k = N(x, y < 8 ? 1 : 2), B = [[150, 40, 40], [50, 90, 50], [60, 70, 140], [150, 120, 60], [100, 60, 30]]; return sh(B[Math.floor(k*5)], .8 + .2*N(x, y)); });
  if (/_log_top|_stem_top/.test(n)) return paint(16, 16, (x, y) => { const r = Math.hypot(x - 7.5, y - 7.5); return r > 6.5 ? sh(baseColor(n.replace('_top', '')), .7) : sh(mix(c, [210, 180, 130], .35), (Math.floor(r) % 2 ? .85 : 1)); });
  if (/_log|_stem|_wood|hyphae/.test(n)) return paint(16, 16, (x, y) => sh(c, (.6 + .35*N(x, y >> 2)) * (x % 4 === 0 ? .8 : 1)));
  if (/planks/.test(n)) return paint(16, 16, (x, y) => sh(c, (y % 4 === 3 ? .72 : 1) * ((x + (y >> 2)*5) % 16 === 0 ? .78 : 1) * (.9 + .16*N(x, y))));
  if (/tiles/.test(n)) return paint(16, 16, (x, y) => (x % 8 === 7 || y % 8 === 7) ? sh(c, .6) : nz(x >> 1, y >> 1, .12));
  if (/brick/.test(n)) return paint(16, 16, (x, y) => (y % 4 === 3 || (x + (y >> 2)*4) % 8 === 7) ? sh(mix(c, [190, 185, 175], .35), .8) : nz(x, y, .12));
  if (/cobble/.test(n)) return paint(16, 16, (x, y) => { const v = N(x >> 2, y >> 2); return (x % 4 === 0 || y % 4 === 0) && N(x, y) > .3 ? sh(c, .55) : sh(c, .8 + .35*v); });
  if (/chiseled/.test(n)) return paint(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 || ((x === 3 || x === 12) && y > 2 && y < 13) || ((y === 3 || y === 12) && x > 2 && x < 13)) ? sh(c, .7) : nz(x, y, .1));
  if (/polished|smooth|cut_|_block_side|_block_top|_block_bottom|pillar/.test(n)) return paint(16, 16, (x, y) => (x === 0 || y === 0 || x === 15 || y === 15) ? sh(c, .82) : nz(x, y, .06));
  if (/cracked/.test(n)) return paint(16, 16, (x, y) => (y % 8 === 7 || (x + (y >> 3)*8) % 16 === 15 || Math.abs(x - 8 - 3*Math.sin(y*.6)) < .6) ? sh(c, .55) : nz(x, y, .12));
  if (/glazed/.test(n)) return paint(16, 16, (x, y) => ((x + y) % 8 < 2 || Math.abs(x - y) < 1) ? [240, 240, 230] : nz(x, y, .1));
  if (/concrete/.test(n)) return paint(16, 16, (x, y) => nz(x, y, .03));
  if (/wool/.test(n)) return paint(16, 16, (x, y) => nz(x, y, .1));
  return paint(16, 16, (x, y) => nz(x, y, .2));
}

// ------------------------------------------------------------------ our own textures (crimson_eclipse)
const crystalPx = (x, y, s) => { // faceted crimson crystal
  let best = 1e9, second = 1e9, id = 0;
  for (let i = 0; i < 6; i++) { const cx = hash3(i, 1, s)*16, cy = hash3(i, 2, s)*16;
    for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) { const d = Math.hypot(x - cx - ox, y - cy - oy); if (d < best) { second = best; best = d; id = i; } else if (d < second) second = d; } }
  const shade = .45 + .7*hash3(id, 3, s), edge = second - best < 1.1;
  let c = mix([70, 4, 14], [235, 40, 55], shade); if (edge) c = mix(c, [255, 130, 140], .55);
  if (hash3(x, y, s + 9) > .965) c = [255, 210, 215]; return c; };
const OURS = {
  crimson_crystal: () => paint(16, 16, (x, y) => crystalPx(x, y, 4)),
  crimson_crystal_cluster: () => paint(16, 16, (x, y) => { const shards = [[8, 1, 2.6], [4, 6, 2], [12, 5, 2.2], [6, 10, 1.6], [11, 10, 1.6]];
    for (const [cx, top, w] of shards) { const k = (y - top) / (16 - top); if (k >= 0 && Math.abs(x + .5 - cx) < w*(.25 + .75*Math.min(1, k*2.2))) return crystalPx(x, y, 7); } return null; }),
  eclipse_glass: () => paint(16, 16, (x, y) => { const lead = x === 0 || y === 0 || x === 15 || y === 15 || (x + y) % 8 === 0 || (x - y + 16) % 8 === 0;
    if (lead) return [24, 16, 18, 255]; const v = hash3(x, y, 21); return [150 + 70*v, 12 + 20*v, 24 + 18*v, 165]; }),
  eclipse_eye: () => paint(16, 16, (x, y) => { const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 7) return [40, 6, 8]; if (Math.abs(x - 7.5) < 1 && Math.abs(y - 7.5) < 5) return [8, 2, 3];
    if (r < 5.5) return mix([255, 60, 50], [255, 190, 150], Math.max(0, 1 - r/5.5) * (.7 + .3*hash3(x, y, 3))); return [120, 10, 16]; }),
  moon_lens: () => paint(16, 16, (x, y) => { const r = Math.hypot(x - 7.5, y - 7.5); if (r > 7.2) return [60, 50, 40];
    return mix([255, 230, 220], [200, 40, 40], Math.min(1, r/7)) .map((v, i) => v*(Math.floor(r) % 2 ? .85 : 1)); }),
  vigil_lantern: () => paint(16, 16, (x, y) => { const iron = [44, 40, 46], glass = [196, 66, 58];
    if (x < 6 && y >= 2 && y < 9) return (x === 0 || x === 5 || y === 2 || y === 8 || x === 3) ? iron : sh(glass, .85 + .3*hash3(x, y, 3));
    if (x < 6 && y >= 9 && y < 15) return sh(iron, .9 + .2*hash3(x, y, 4)); if (x >= 1 && x < 5 && y < 2) return iron;
    if (x >= 11 && x < 14 && ((y >= 1 && y < 3) || (y >= 10 && y < 12))) return iron; return null; }),
  crimson_vein: () => paint(16, 16, (x, y) => { const v = Math.abs(x - 7.5 - 3.5*Math.sin(y*.55) - 1.5*Math.sin(y*1.3 + 1)) < .9 || (y === 4 && x > 8 && x < 14) || (Math.abs(y - 11 - (x - 9)*.5) < .7 && x > 8);
    return v ? [235, 44, 38] : sh([62, 60, 68], .82 + .3*hash3(x, y, 12)); }),
  rune_stone: () => paint(16, 16, (x, y) => { const rune = (x === 7 && y > 2 && y < 13) || (y === 5 && x > 4 && x < 11) || (x - y === 2 && x > 6 && x < 12) || (x + y === 20 && x > 7 && x < 12);
    if (x === 0 || y === 0 || x === 15 || y === 15) return [32, 28, 36]; return rune ? [230, 46, 40] : sh([46, 40, 50], .85 + .3*hash3(x, y, 5)); }),
  blood_water: () => paint(16, 16, (x, y) => { const v = .5 + .5*Math.sin((x + y*.5)*.9 + hash3(x, y, 8)*2); return [120 + 70*v, 8 + 14*v, 14 + 10*v, 210]; }),
  flame: () => paint(16, 16, (x, y) => { const k = y/15, w = Math.sin(Math.PI*Math.min(1, k*1.15))*7*(k < .3 ? k/.3 : 1), d = Math.abs(x - 7.5);
    if (d > w) return null; const core = 1 - d/(w + .01); return mix([255, 120, 30], [255, 245, 190], core*k); }),
  brass: () => paint(16, 16, (x, y) => sh([196, 150, 64], .75 + .4*hash3(x, y, 11) + (y % 5 === 0 ? -.15 : 0))),
  figure: () => paint(16, 16, (x, y) => sh([34, 32, 40], .85 + .3*hash3(x, y, 2))),
  missing: () => paint(16, 16, (x, y) => ((x >> 3) + (y >> 3)) % 2 ? [255, 0, 220] : [10, 10, 10]),
};

// ------------------------------------------------------------------ the vanilla pack: textures.js, or read from the player's jar in the page
// Reading a jar here: the player picks their own client.jar; the textures are kept in this browser (IndexedDB), never uploaded.
const KEEP = /^assets\/minecraft\/textures\/(block\/[^/]+|entity\/chest\/[^/]+|entity\/bell\/[^/]+|entity\/banner_base|entity\/banner\/base)\.png$/;
async function readJar(file) {
  const buf = await file.arrayBuffer(), dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error(file.name + ' is not a jar');
  const count = dv.getUint16(eocd + 10, true), textures = {}; let p = dv.getUint32(eocd + 16, true), version = null;
  const inflate = async raw => new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  const jobs = [];
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true), name = dec.decode(u8.subarray(p + 46, p + 46 + nlen)).replace(/\\/g, '/');
    p += 46 + nlen + xlen + clen;
    const m = KEEP.exec(name); if (!m && name !== 'version.json') continue;
    const at = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true), raw = u8.slice(at, at + csize);
    jobs.push((method === 0 ? Promise.resolve(raw) : inflate(raw)).then(d => { if (m) textures[m[1]] = d; else { try { version = JSON.parse(dec.decode(d)).id; } catch (e) { /* no version */ } } }));
  }
  await Promise.all(jobs);
  if (!Object.keys(textures).length) throw new Error(file.name + ' holds no block textures: pick a Minecraft client jar.');
  return { version:version || '?', textures, from:'jar' };
}
const DB = { open: () => new Promise((res, rej) => { const r = indexedDB.open('crimson-preview', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async get(k) { const db = await DB.open(); return new Promise(res => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); },
  async put(k, v) { const db = await DB.open(); return new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); },
  async del(k) { const db = await DB.open(); return new Promise(res => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); t.oncomplete = () => res(true); t.onerror = () => res(false); }); } };
const ready = (async () => { if (window.MC_VANILLA) return; try { const p = await DB.get('vanilla'); if (p) window.MC_VANILLA = p; } catch (e) { /* storage off: stand-ins */ } })();

// ------------------------------------------------------------------ resolution and loading
const pack = () => window.MC_VANILLA || null;
const imgCache = new Map();
function loadImage(name) {
  if (imgCache.has(name)) return imgCache.get(name);
  const p = new Promise(res => {
    if (name.startsWith('ce:')) { const f = OURS[name.slice(3)] || OURS.missing; return res({ img:f(), real:true }); }
    const data = pack()?.textures?.[name];
    if (!data) return res({ img:standIn(name), real:false });
    const im = new Image(), url = typeof data === 'string' ? 'data:image/png;base64,' + data : URL.createObjectURL(new Blob([data], { type:'image/png' }));
    im.onload = () => res({ img:im, real:true }); im.onerror = () => res({ img:standIn(name), real:false }); im.src = url;
  });
  imgCache.set(name, p); return p;
}
function pickAlt(part) { const alts = part.split('|'); return alts.find(a => a.startsWith('ce:') || pack()?.textures?.[a]) || alts[0]; }
const stats = { real:new Set(), standIn:new Set() };
async function layerCanvas(ref) {
  const [body, tint] = ref.split('#'), parts = body.split('+'), c = canvas(LAYER), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let k = 0; k < parts.length; k++) {
    const name = pickAlt(parts[k]), { img, real } = await loadImage(name);
    (real ? stats.real : stats.standIn).add(name);
    const w = img.width, h = Math.min(img.height, img.width);               // animated strips: the first frame
    if (tint && k === parts.length - 1) {
      const t = canvas(LAYER), tg = t.getContext('2d'); tg.imageSmoothingEnabled = false; tg.drawImage(img, 0, 0, w, h, 0, 0, LAYER, LAYER);
      const d = tg.getImageData(0, 0, LAYER, LAYER), tc = hex(tint);
      for (let i = 0; i < d.data.length; i += 4) { d.data[i] = d.data[i]*tc[0]/255; d.data[i+1] = d.data[i+1]*tc[1]/255; d.data[i+2] = d.data[i+2]*tc[2]/255; }
      tg.putImageData(d, 0, 0); g.drawImage(t, 0, 0);
    } else g.drawImage(img, 0, 0, w, h, 0, 0, LAYER, LAYER);
  }
  return c;
}
CE.textures = {
  LAYER, standIn, OURS, stats, ready,
  hasVanilla: () => !!pack(),
  version: () => pack()?.version || null,
  source: () => pack()?.from || 'file',
  // the player picked their client jar: read it, keep it in this browser, start over with it
  async useJar(file) { const p = await readJar(file); window.MC_VANILLA = p; imgCache.clear(); stats.real.clear(); stats.standIn.clear();
    let kept = false; try { kept = await DB.put('vanilla', p); } catch (e) { kept = false; } return { count:Object.keys(p.textures).length, version:p.version, kept }; },
  async forget() { try { await DB.del('vanilla'); } catch (e) { /* nothing kept */ } },
  // a texture array, one 64 x 64 layer per reference, mipmapped
  async build(gl, refs) {
    const cs = await Promise.all(refs.map(layerCanvas));
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t);
    gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, LAYER, LAYER, Math.max(1, cs.length), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    cs.forEach((c, i) => gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, LAYER, LAYER, 1, gl.RGBA, gl.UNSIGNED_BYTE, c));
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return t;
  },
};
})();
