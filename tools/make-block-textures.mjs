// Writes our blocks' textures (PNG) for the game from the same painters the previews use (preview/lib/textures.js),
// so a block looks in the game as it does in the preview.
//
//   node tools/make-block-textures.mjs
//
// Output: mod/content/assets/crimson_eclipse/textures/block/<name>.png
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// our blocks in the game: each has a day texture and a lit one (the state the blood moon turns on); the lit one's
// glowing pixels also make its emissive layer (textures/emissive/<name>_lit.png, drawn full bright by the game)
const BLOCKS = ['crimson_crystal', 'crimson_crystal_cluster', 'crimson_vein', 'helm_eye', 'vigil_lantern'];

// a canvas that only keeps the pixels the painters put
const document = { createElement: () => { const c = { width:0, height:0, getContext: () => ({
  createImageData: (w, h) => ({ width:w, height:h, data:new Uint8ClampedArray(w*h*4) }), putImageData: im => { c.image = im; } }) }; return c; } };
const ctx = { console, Math, Set, Map, JSON, Number, String, Array, Object, Error, Promise, Uint8ClampedArray, document, setTimeout };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['lib/blocks.js', 'lib/world.js', 'lib/textures.js']) vm.runInContext(readFileSync(join(root, 'preview', f), 'utf8'), ctx, { filename:f });

// PNG: RGBA, 8 bits, no filter
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const t = Buffer.from(type), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
function png({ width:w, height:h, data }) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((w*4 + 1)*h); for (let y = 0; y < h; y++) { raw[y*(w*4 + 1)] = 0; Buffer.from(data.buffer, y*w*4, w*4).copy(raw, y*(w*4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const tex = join(root, 'mod', 'content', 'assets', 'crimson_eclipse', 'textures'), dir = join(tex, 'block'), glow = join(tex, 'emissive');
mkdirSync(dir, { recursive:true }); mkdirSync(glow, { recursive:true });
const paint = name => { const c = ctx.CE.textures.OURS[name](); if (!c.image) throw new Error('no pixels for ' + name); return c.image; };
for (const block of BLOCKS) for (const name of [block, block + '_lit']) {
  const im = paint(name); writeFileSync(join(dir, name + '.png'), png(im)); console.log(`block/${name}.png (${im.width}x${im.height})`);
  if (!name.endsWith('_lit')) continue;
  // the layer: the lit pixels, opaque where they are bright and saturated (glass, crystal, the eye), clear on iron and stone
  const d = new Uint8ClampedArray(im.data);
  for (let i = 0; i < d.length; i += 4) { const mx = Math.max(d[i], d[i+1], d[i+2])/255, mn = Math.min(d[i], d[i+1], d[i+2])/255;
    const a = Math.max(0, Math.min(1, (mx - .42)/.38))*Math.max(0, Math.min(1, (mx - mn)/.35 + .3)); d[i+3] = Math.round(d[i+3]*a); }
  writeFileSync(join(glow, name + '.png'), png({ width:im.width, height:im.height, data:d })); console.log(`emissive/${name}.png`);
}
