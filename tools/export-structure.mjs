// Writes a structure template (.nbt, the format vanilla's structure blocks and worldgen read) from a preview builder,
// so what the preview shows is what generates in the game, block for block.
//
//   node tools/export-structure.mjs kneelingColossus kneeling_colossus
//
// Reads preview/structures/<builder>.js (through the preview engine), writes
// mod/content/data/crimson_eclipse/structure/<name>.nbt and checks it by reading it back.
// The day state is written (the blood moon's changes are the mod's code's job); containers get the loot table the
// builder's `loot(e)` names; cells the builder marks in W.AIR are written as air (the crypt, the stair shaft...).
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_VERSION = 5023;                      // 26.3 (Horizon docs/world-data.md)
const NS = 'crimson_eclipse';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [builder = 'kneelingColossus', name = 'kneeling_colossus'] = process.argv.slice(2);

// ---- run the preview engine and the builder
const ctx = { console, Math, Set, Map, JSON, Number, String, Array, Object, Error };
ctx.window = ctx; vm.createContext(ctx);
const file = builder.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
for (const f of ['lib/blocks.js', 'lib/world.js', 'lib/viewer.js', 'structures/kit.js', `structures/${file}.js`])
  vm.runInContext(readFileSync(join(root, 'preview', f), 'utf8'), ctx, { filename: f });
const CE = ctx.CE, build = CE.structures[builder];
if (!build) throw new Error(`no builder CE.structures.${builder}`);
const W = CE.World(), meta = build(W);
if (meta.ground) meta.ground(W);

// ---- support: what would break at the first neighbour update in the game (a hanging lantern under nothing...)
// model y 0 is the ground level: what stands there stands on the natural ground
const unsupported = [];
for (const e of W.M.values()) for (const dir of CE.kit.unsupported(W, e, 0)) unsupported.push(`${CE.describe(e)} at ${e.x} ${e.y} ${e.z} (nothing ${dir})`);
// containers and furniture hold in the game in mid-air, but a floating chest looks broken: they need a full block under
for (const e of W.M.values()) if (e.y !== 0 && /^(chest|barrel|bookshelf)/.test(e.id) && !CE.blocks.fullSolid(W.get(e.x, e.y - 1, e.z)))
  unsupported.push(`${CE.describe(e)} at ${e.x} ${e.y} ${e.z} (no floor under it)`);
if (unsupported.length) { console.error(`${unsupported.length} blocks with nothing to hold them:\n  ` + unsupported.slice(0, 40).join('\n  ')); if (!process.argv.includes('--force')) process.exit(1); }

// ---- cells: every block, plus the air the builder asked for
const cells = [...W.M.values()].map(e => ({ e }));
for (const k of W.AIR || []) { const [x, y, z] = k.split(',').map(Number); if (!W.get(x, y, z)) cells.push({ air: [x, y, z] }); }
const pos = c => c.e ? [c.e.x, c.e.y, c.e.z] : c.air;
const lo = [0, 1, 2].map(i => Math.min(...cells.map(c => pos(c)[i]))), hi = [0, 1, 2].map(i => Math.max(...cells.map(c => pos(c)[i])));
const size = [0, 1, 2].map(i => hi[i] - lo[i] + 1);

const palette = [], index = new Map(), blocks = [];
const stateOf = c => { if (c.air) return { Name: 'minecraft:air', Properties: {} };
  const props = CE.blocks.gameState(W, c.e), Properties = {};
  for (const k of Object.keys(props).sort()) Properties[k] = String(props[k]);
  return { Name: c.e.id.includes(':') ? c.e.id : 'minecraft:' + c.e.id, Properties }; };
const loots = {};
for (const c of cells) {
  const s = stateOf(c), key = s.Name + JSON.stringify(s.Properties);
  if (!index.has(key)) { index.set(key, palette.length); palette.push(s); }
  const p = pos(c), b = { state: index.get(key), pos: [p[0] - lo[0], p[1] - lo[1], p[2] - lo[2]] };
  if (c.e && (c.e.id === 'chest' || c.e.id === 'barrel') && build.loot) { const t = build.loot(c.e);
    if (t) { b.nbt = { id: 'minecraft:' + c.e.id, LootTable: `${NS}:chests/${t}` }; loots[t] = (loots[t] || 0) + 1; } }
  // an anchor's block entity must be in the template: worldgen and /place only make the block entities the template
  // carries (Horizon makes a mod's block entity on its own only when the block is placed by a player or a command)
  if (c.e && c.e.id.startsWith(NS + ':') && c.e.id.endsWith('_anchor')) b.nbt = { id: c.e.id };
  blocks.push(b);
}

// ---- NBT (big-endian, gzip), the few tag types a template needs
const TAG = { end: 0, int: 3, string: 8, list: 9, compound: 10 };
function enc(out, t, v) {
  if (t === 'int') { const b = Buffer.alloc(4); b.writeInt32BE(v); out.push(b); }
  else if (t === 'string') { const s = Buffer.from(v, 'utf8'), l = Buffer.alloc(2); l.writeUInt16BE(s.length); out.push(l, s); }
  else if (t === 'list') { const h = Buffer.alloc(5); h.writeUInt8(TAG[v.of]); h.writeInt32BE(v.items.length, 1); out.push(h); for (const it of v.items) enc(out, v.of, it); }
  else if (t === 'compound') { for (const [k, [tt, vv]] of Object.entries(v)) { out.push(Buffer.from([TAG[tt]])); enc(out, 'string', k); enc(out, tt, vv); } out.push(Buffer.from([0])); }
}
const strings = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ['string', v]]));
const ints = a => ({ of: 'int', items: a });
const rootTag = {
  DataVersion: ['int', DATA_VERSION],
  size: ['list', ints(size)],
  palette: ['list', { of: 'compound', items: palette.map(p => Object.keys(p.Properties).length
    ? { Name: ['string', p.Name], Properties: ['compound', strings(p.Properties)] } : { Name: ['string', p.Name] }) }],
  blocks: ['list', { of: 'compound', items: blocks.map(b => ({ state: ['int', b.state], pos: ['list', ints(b.pos)], ...(b.nbt ? { nbt: ['compound', strings(b.nbt)] } : {}) })) }],
  entities: ['list', { of: 'compound', items: [] }],
};
const parts = [Buffer.from([TAG.compound])]; enc(parts, 'string', ''); enc(parts, 'compound', rootTag);
const raw = Buffer.concat(parts), out = join(root, 'mod', 'content', 'data', NS, 'structure', name + '.nbt');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, gzipSync(raw));

// ---- read it back
function dec(buf) { let o = 0;
  const rd = t => { switch (t) {
    case 3: { const v = buf.readInt32BE(o); o += 4; return v; }
    case 8: { const l = buf.readUInt16BE(o); o += 2; const v = buf.toString('utf8', o, o + l); o += l; return v; }
    case 9: { const et = buf.readUInt8(o), n = buf.readInt32BE(o + 1); o += 5; return Array.from({ length: n }, () => rd(et)); }
    case 10: { const c = {}; for (;;) { const tt = buf.readUInt8(o++); if (tt === 0) return c; const k = rd(8); c[k] = rd(tt); } }
    default: throw new Error('unexpected tag ' + t); } };
  if (buf.readUInt8(o++) !== 10) throw new Error('root is not a compound'); rd(8); return rd(10); }
const back = dec(gunzipSync(readFileSync(out)));
if (back.DataVersion !== DATA_VERSION || back.blocks.length !== blocks.length || back.palette.length !== palette.length || back.size.join() !== size.join())
  throw new Error('read-back mismatch');
for (const b of back.blocks) { if (!back.palette[b.state]) throw new Error('bad state index'); if (b.pos.some((v, i) => v < 0 || v >= size[i])) throw new Error('block outside size'); }

// ---- the wake table: which blocks the structure's anchor lights under the blood moon, and when
// (crates/crimson-core/src/<name>_wake.rs; the preview's delays, in seconds, become ticks after the eclipse begins, slowed
// fivefold: in the game the wave runs over a dozen seconds of the eclipse)
const anchor = [...W.M.values()].find(e => e.id.startsWith(NS + ':') && e.id.endsWith('_anchor'));
if (anchor) {
  const rows = [];
  for (const e of W.M.values()) { if (!e.awake || e.awake.id !== e.id) continue;
    const changed = Object.keys({ ...e.p, ...e.awake.props }).filter(k => String(e.awake.props[k]) !== String(CE.blocks.gameState(W, e)[k]));
    if (changed.length !== 1 || changed[0] !== 'lit' || e.awake.props.lit !== true) { console.warn(`not in the wake table (it changes ${changed.join(', ')}): ${CE.describe(e)}`); continue; }
    rows.push([[e.x - anchor.x, e.y - anchor.y, e.z - anchor.z], Math.round((e.d || 0)*100)]); }
  rows.sort((a, b) => a[1] - b[1] || a[0][1] - b[0][1] || a[0][0] - b[0][0] || a[0][2] - b[0][2]);
  const rust = `//! @generated by tools/export-structure.mjs from preview/structures/${file}.js; do not edit.
//! The blocks of the ${name.replace(/_/g, ' ')} that light under the blood moon: their offset from the structure's
//! anchor (as built, the anchor facing south) and how many ticks after the eclipse begins they light.

/// \`(offset, ticks)\` for each block whose \`lit\` turns on, in lighting order.
pub const ${name.toUpperCase()}: &[([i16; 3], u16)] = &[
${rows.map(([o, d]) => `    ([${o.join(', ')}], ${d}),`).join('\n')}
];
`;
  const rs = join(root, 'crates', 'crimson-core', 'src', `${name}_wake.rs`);
  writeFileSync(rs, rust);
  console.log(`${rs}: ${rows.length} blocks light, from ${rows[0][1]} to ${rows[rows.length - 1][1]} ticks`);
}

const ours = [...new Set(palette.map(p => p.Name).filter(n => n.startsWith(NS + ':')))];
console.log(`${out}`);
console.log(`size ${size.join(' x ')}, ${blocks.length} blocks (${cells.filter(c => c.air).length} air), ${palette.length} states, ${(readFileSync(out).length/1024).toFixed(0)} KB`);
console.log(`model origin: x ${lo[0]}, y ${lo[1]}, z ${lo[2]} (worldgen start_height = ${lo[1]} puts model y 0 on the ground)`);
console.log('containers with loot:', JSON.stringify(loots));
console.log('our blocks:', ours.join(', '));
