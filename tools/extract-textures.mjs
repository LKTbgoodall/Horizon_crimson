// Builds preview/vanilla/textures.js from your own Minecraft client jar, so the structure previews show the real block textures.
// Reads assets/minecraft/textures/block/*.png and the entity textures the previews draw (chest, bell, banner).
// The output is gitignored: Mojang's textures never enter the repository. Nothing is downloaded.
// (The preview pages can also read the jar themselves: "Load real textures" button, no tool needed.)
//
//   node tools/extract-textures.mjs <path to client.jar> [output]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEEP = /^assets\/minecraft\/textures\/(block\/[^/]+|entity\/chest\/[^/]+|entity\/bell\/[^/]+|entity\/banner_base|entity\/banner\/base)\.png$/;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [jar, out = join(root, 'preview', 'vanilla', 'textures.js')] = process.argv.slice(2);
if (!jar) { console.error('usage: node tools/extract-textures.mjs <path to client.jar> [output]'); process.exit(1); }

const b = readFileSync(jar);
let eocd = -1;
for (let i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
if (eocd < 0) throw new Error(`${jar} is not a zip/jar file`);
const count = b.readUInt16LE(eocd + 10);
let p = b.readUInt32LE(eocd + 16), version = null;
const tex = [];
for (let k = 0; k < count; k++) {
  if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
  const method = b.readUInt16LE(p + 10), csize = b.readUInt32LE(p + 20), nlen = b.readUInt16LE(p + 28), xlen = b.readUInt16LE(p + 30), clen = b.readUInt16LE(p + 32);
  const local = b.readUInt32LE(p + 42), name = b.toString('utf8', p + 46, p + 46 + nlen).replace(/\\/g, '/');
  p += 46 + nlen + xlen + clen;
  const m = KEEP.exec(name);
  if (!m && name !== 'version.json') continue;
  const at = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28), raw = b.subarray(at, at + csize);
  const data = method === 0 ? raw : inflateRawSync(raw);
  if (m) tex.push([m[1], data.toString('base64')]);
  else version = JSON.parse(data.toString('utf8')).id || null;
}
if (!tex.length) throw new Error(`${jar} holds no block textures: is it a Minecraft client jar?`);
tex.sort((x, y) => x[0] < y[0] ? -1 : 1);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `// Made by tools/extract-textures.mjs from your own client jar. Mojang's textures: local use only, gitignored, never commit.\n` +
  `window.MC_VANILLA = { version: ${JSON.stringify(version || '?')}, textures: {\n${tex.map(([n, d]) => `'${n}':'${d}',`).join('\n')}\n} };\n`);
console.log(`${tex.length} textures (${version || 'unknown version'}) -> ${out}. Reload the preview pages.`);
