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
// game texture name -> preview painter
const TEXTURES = { crimson_crystal:'crimson_crystal', crimson_crystal_cluster:'crimson_crystal_cluster', crimson_vein:'crimson_vein',
  helm_eye:'eclipse_eye', vigil_lantern:'vigil_lantern', vigil_lantern_lit:'vigil_lantern_lit' };

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
const dir = join(root, 'mod', 'content', 'assets', 'crimson_eclipse', 'textures', 'block');
mkdirSync(dir, { recursive:true });
for (const [name, painter] of Object.entries(TEXTURES)) {
  const c = ctx.CE.textures.OURS[painter](); if (!c.image) throw new Error('no pixels for ' + painter);
  writeFileSync(join(dir, name + '.png'), png(c.image)); console.log(`${name}.png (${c.image.width}x${c.image.height}) from ${painter}`);
}
