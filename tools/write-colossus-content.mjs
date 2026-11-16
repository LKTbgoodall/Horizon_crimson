// Writes the content-mod files of the Kneeling Colossus: our blocks (declarations, blockstates, models, items, names,
// drops), the chests' loot tables and the worldgen files (structure, structure set, template pool, biome tag).
// Formats: Horizon docs/mods.md and docs/modpacks.md (registries 0.2) and 26.3's data and resource packs.
//
//   node tools/write-colossus-content.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NS = 'crimson_eclipse', root = join(dirname(fileURLToPath(import.meta.url)), '..', 'mod', 'content');
const files = [];
const put = (path, obj) => { const p = join(root, path); mkdirSync(dirname(p), { recursive:true }); writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); files.push(path); };
const M = name => `${NS}:block/${name}`;

// ---- our blocks: each copies a vanilla template (behaviour, states, shape) and changes what differs
const BLOCKS = {
  crimson_crystal: { name:'Crimson Crystal', decl:{ template:'minecraft:amethyst_block', properties:{ hardness:2.0, explosion_resistance:6.0, light:6, requires_tool:true }, item:true },
    states:{ variants:{ '':{ model:M('crimson_crystal') } } }, models:{ crimson_crystal:{ parent:'minecraft:block/cube_all', textures:{ all:M('crimson_crystal') } } } },
  crimson_crystal_cluster: { name:'Crimson Crystal Cluster', decl:{ template:'minecraft:amethyst_cluster', properties:{ light:5 }, item:true },
    states:{ variants:{ 'facing=up':{ model:M('crimson_crystal_cluster') }, 'facing=down':{ model:M('crimson_crystal_cluster'), x:180 },
      'facing=north':{ model:M('crimson_crystal_cluster'), x:90 }, 'facing=south':{ model:M('crimson_crystal_cluster'), x:90, y:180 },
      'facing=east':{ model:M('crimson_crystal_cluster'), x:90, y:90 }, 'facing=west':{ model:M('crimson_crystal_cluster'), x:90, y:270 } } },
    models:{ crimson_crystal_cluster:{ parent:'minecraft:block/cross', textures:{ cross:M('crimson_crystal_cluster') } } } },
  crimson_vein: { name:'Crimson Vein', decl:{ template:'minecraft:polished_deepslate', properties:{ light:2 }, item:true },
    states:{ variants:{ '':{ model:M('crimson_vein') } } }, models:{ crimson_vein:{ parent:'minecraft:block/cube_all', textures:{ all:M('crimson_vein') } } } },
  // an eye on one face only (the helm's eyes): a template with a facing and no behaviour of its own
  helm_eye: { name:'Helm Eye', decl:{ template:'minecraft:black_glazed_terracotta', properties:{ light:9 }, item:true },
    states:{ variants:{ 'facing=north':{ model:M('helm_eye') }, 'facing=east':{ model:M('helm_eye'), y:90 }, 'facing=south':{ model:M('helm_eye'), y:180 }, 'facing=west':{ model:M('helm_eye'), y:270 } } },
    models:{ helm_eye:{ parent:'minecraft:block/orientable', textures:{ front:M('helm_eye'), side:'minecraft:block/black_concrete', top:'minecraft:block/black_concrete' } } } },
  // dark by day; `lit` is for the mod's code to turn on under the blood moon
  vigil_lantern: { name:'Vigil Lantern', decl:{ template:'minecraft:lantern', state_properties:{ lit:{ type:'boolean' } }, default_state:{ lit:'false' },
      state_light:{ properties:['lit'], values:{ false:0, true:13 } }, item:true },
    states:{ variants:{ 'hanging=false,lit=false':{ model:M('vigil_lantern') }, 'hanging=true,lit=false':{ model:M('vigil_lantern_hanging') },
      'hanging=false,lit=true':{ model:M('vigil_lantern_lit') }, 'hanging=true,lit=true':{ model:M('vigil_lantern_hanging_lit') } } },
    models:{ vigil_lantern:{ parent:'minecraft:block/template_lantern', textures:{ lantern:M('vigil_lantern') } },
      vigil_lantern_hanging:{ parent:'minecraft:block/template_hanging_lantern', textures:{ lantern:M('vigil_lantern') } },
      vigil_lantern_lit:{ parent:'minecraft:block/template_lantern', textures:{ lantern:M('vigil_lantern_lit') } },
      vigil_lantern_hanging_lit:{ parent:'minecraft:block/template_hanging_lantern', textures:{ lantern:M('vigil_lantern_lit') } } } },
};
const lang = {};
for (const [id, b] of Object.entries(BLOCKS)) {
  put(`data/${NS}/horizon/block/${id}.json`, b.decl);
  put(`assets/${NS}/blockstates/${id}.json`, b.states);
  for (const [m, model] of Object.entries(b.models)) put(`assets/${NS}/models/block/${m}.json`, model);
  put(`assets/${NS}/items/${id}.json`, { model:{ type:'minecraft:model', model:M(id) } });
  put(`data/${NS}/loot_table/blocks/${id}.json`, { type:'minecraft:block', pools:[{ rolls:1, entries:[{ type:'minecraft:item', name:`${NS}:${id}` }],
    conditions:[{ condition:'minecraft:survives_explosion' }] }] });
  lang[`block.${NS}.${id}`] = b.name;
}
put(`assets/${NS}/lang/en_us.json`, lang);
put('data/minecraft/tags/block/mineable/pickaxe.json', { replace:false, values:Object.keys(BLOCKS).map(id => `${NS}:${id}`) });

// ---- loot: what each room of the colossus holds
const item = (name, weight, min = 1, max = 1, more = []) => ({ type:'minecraft:item', name, weight,
  functions:[...(max > 1 ? [{ function:'minecraft:set_count', count:{ type:'minecraft:uniform', min, max } }] : []), ...more] });
const ench = { function:'minecraft:enchant_randomly' };
const table = (rolls, entries, extra = []) => ({ type:'minecraft:chest', pools:[{ rolls:{ type:'minecraft:uniform', min:rolls[0], max:rolls[1] }, entries }, ...extra] });
const C = `${NS}:crimson_crystal`, CL = `${NS}:crimson_crystal_cluster`;
put(`data/${NS}/loot_table/chests/colossus_treasure.json`, table([4, 7], [
  item('minecraft:gold_ingot', 20, 2, 7), item('minecraft:gold_block', 6, 1, 2), item('minecraft:diamond', 10, 1, 3), item('minecraft:emerald', 10, 2, 5),
  item('minecraft:golden_apple', 8), item('minecraft:enchanted_golden_apple', 1), item('minecraft:book', 8, 1, 1, [ench]), item('minecraft:golden_sword', 5, 1, 1, [ench]),
  item('minecraft:netherite_scrap', 2), item(C, 8, 1, 3), item('minecraft:music_disc_pigstep', 1)]));
put(`data/${NS}/loot_table/chests/colossus_crypt.json`, table([3, 6], [
  item('minecraft:bone', 25, 2, 6), item('minecraft:arrow', 15, 3, 10), item('minecraft:iron_ingot', 12, 1, 4), item('minecraft:gold_nugget', 15, 3, 9),
  item('minecraft:candle', 10, 1, 3), item('minecraft:iron_sword', 4, 1, 1, [ench]), item('minecraft:chainmail_helmet', 3), item('minecraft:name_tag', 3), item(CL, 6, 1, 2)]));
put(`data/${NS}/loot_table/chests/colossus_supplies.json`, table([1, 4], [
  item('minecraft:bread', 20, 1, 4), item('minecraft:coal', 15, 2, 8), item('minecraft:string', 12, 2, 6), item('minecraft:torch', 12, 2, 8),
  item('minecraft:leather', 10, 1, 3), item('minecraft:paper', 8, 1, 4), item('minecraft:glass_bottle', 6, 1, 2)]));
put(`data/${NS}/loot_table/chests/colossus_reliquary.json`, table([3, 6], [
  item('minecraft:book', 20, 1, 1, [ench]), item('minecraft:paper', 15, 2, 6), item('minecraft:candle', 12, 1, 4), item('minecraft:gold_ingot', 10, 1, 4),
  item('minecraft:experience_bottle', 10, 1, 4), item('minecraft:amethyst_shard', 10, 2, 6), item(C, 6, 1, 2), item('minecraft:golden_apple', 4)]));
put(`data/${NS}/loot_table/chests/colossus_heart.json`, table([3, 5], [
  item(C, 20, 2, 6), item(CL, 15, 2, 5), item('minecraft:diamond', 12, 1, 4), item('minecraft:gold_ingot', 10, 2, 6), item('minecraft:enchanted_golden_apple', 2),
  item('minecraft:totem_of_undying', 2), item('minecraft:diamond_sword', 3, 1, 1, [ench]), item('minecraft:experience_bottle', 10, 2, 6)]));
put(`data/${NS}/loot_table/chests/colossus_camp.json`, table([2, 5], [
  item('minecraft:bread', 20, 1, 5), item('minecraft:apple', 15, 1, 4), item('minecraft:torch', 15, 2, 8), item('minecraft:candle', 12, 1, 3),
  item('minecraft:map', 4), item('minecraft:compass', 4), item('minecraft:wheat', 10, 2, 8), item('minecraft:white_wool', 8, 1, 3), item('minecraft:iron_nugget', 10, 2, 7)]));

// ---- worldgen: a rare single-piece jigsaw on open land, model y 0 on the ground (start height = the template's lowest y)
put(`data/${NS}/worldgen/structure/kneeling_colossus.json`, {
  type:'minecraft:jigsaw', biomes:`#${NS}:has_structure/kneeling_colossus`, step:'surface_structures', spawn_overrides:{}, terrain_adaptation:'none',
  start_pool:`${NS}:kneeling_colossus/start`, size:1, start_height:{ absolute:-9 }, project_start_to_heightmap:'WORLD_SURFACE_WG',
  max_distance_from_center:80, use_expansion_hack:false });
put(`data/${NS}/worldgen/structure_set/kneeling_colossus.json`, {
  structures:[{ structure:`${NS}:kneeling_colossus`, weight:1 }],
  placement:{ type:'minecraft:random_spread', spacing:40, separation:16, salt:1387114023 } });
put(`data/${NS}/worldgen/template_pool/kneeling_colossus/start.json`, {
  fallback:'minecraft:empty', elements:[{ weight:1, element:{ element_type:'minecraft:single_pool_element', location:`${NS}:kneeling_colossus`, processors:'minecraft:empty', projection:'rigid' } }] });
put(`data/${NS}/tags/worldgen/biome/has_structure/kneeling_colossus.json`, {
  replace:false, values:['minecraft:plains', 'minecraft:sunflower_plains', 'minecraft:meadow', 'minecraft:savanna', 'minecraft:savanna_plateau', 'minecraft:snowy_plains'] });

console.log(files.length + ' files under mod/content:\n' + files.join('\n'));
