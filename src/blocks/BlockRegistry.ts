export interface BlockDefinition {
  id: number;
  key: string;
  name: string;
  color: number;
  hardness: number;
  transparent: boolean;
  solid: boolean;
  /** Collision box: [minX, minY, minZ, maxX, maxY, maxZ], defaults to full block */
  collision?: [number, number, number, number, number, number];
  /** Tool required to collect drops */
  toolRequired?: ToolType;
  /** Drops when broken. Defaults to self. Empty = no drops. */
  drops?: DropConfig[];
  /** Block emits light (0-15) */
  lightLevel?: number;
}

export interface DropConfig {
  item: string;
  count: number;
  chance?: number;
}

export type ToolType = 'pickaxe' | 'axe' | 'shovel';

// Natural blocks
export const BLOCK_AIR = 0;
export const BLOCK_GRASS = 1;
export const BLOCK_DIRT = 2;
export const BLOCK_STONE = 3;
export const BLOCK_COBBLESTONE = 6;
export const BLOCK_SAND = 7;
export const BLOCK_GRAVEL = 8;
export const BLOCK_BEDROCK = 9;

// Wood / plant
export const BLOCK_WOOD = 4;
export const BLOCK_PLANKS = 10;
export const BLOCK_LEAVES = 11;
export const BLOCK_SAPLING = 12;

// Ores
export const BLOCK_COAL_ORE = 13;
export const BLOCK_IRON_ORE = 14;
export const BLOCK_GOLD_ORE = 15;
export const BLOCK_DIAMOND_ORE = 16;
export const BLOCK_REDSTONE_ORE = 17;

// Decorative / building
export const BLOCK_GLASS = 5;
export const BLOCK_WOODEN_STAIRS = 18;
export const BLOCK_STONE_STAIRS = 19;
export const BLOCK_SLAB_WOOD = 20;
export const BLOCK_SLAB_STONE = 21;
export const BLOCK_BRICK = 22;

// Functional
export const BLOCK_CRAFTING_TABLE = 23;
export const BLOCK_FURNACE = 24;
export const BLOCK_CHEST = 25;
export const BLOCK_DOOR = 26;
export const BLOCK_LADDER = 27;
export const BLOCK_BED = 29;

// Liquid
export const BLOCK_WATER = 28;

// Food / items
export const BLOCK_ROTTEN_FLESH = 30;
export const BLOCK_RAW_BEEF = 31;

// Redstone components
export const BLOCK_REDSTONE_DUST = 32;
export const BLOCK_REDSTONE_TORCH = 33;
export const BLOCK_REDSTONE_LAMP = 34;
export const BLOCK_REDSTONE_LAMP_LIT = 35;
export const BLOCK_LEVER = 36;
export const BLOCK_BUTTON = 37;
export const BLOCK_REDSTONE_BLOCK = 38;
export const BLOCK_REPEATER = 39;

// Tools
export const BLOCK_STICK = 40;
export const BLOCK_WOODEN_PICKAXE = 41;
export const BLOCK_STONE_PICKAXE = 42;
export const BLOCK_IRON_PICKAXE = 43;
export const BLOCK_DIAMOND_PICKAXE = 44;

const BLOCKS: BlockDefinition[] = [
  // Natural
  { id: BLOCK_AIR, key: 'air', name: '空气', color: 0x000000, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_GRASS, key: 'grass', name: '草方块', color: 0x5a8c38, hardness: 0.6, transparent: false, solid: true },
  { id: BLOCK_DIRT, key: 'dirt', name: '泥土', color: 0x7a5c3a, hardness: 0.5, transparent: false, solid: true },
  { id: BLOCK_STONE, key: 'stone', name: '石头', color: 0x7a7a7a, hardness: 1.5, transparent: false, solid: true, drops: [{ item: 'cobblestone', count: 1 }], toolRequired: 'pickaxe' },
  { id: BLOCK_COBBLESTONE, key: 'cobblestone', name: '圆石', color: 0x6e6e6e, hardness: 2.0, transparent: false, solid: true },
  { id: BLOCK_SAND, key: 'sand', name: '沙子', color: 0xdbd3a0, hardness: 0.5, transparent: false, solid: true },
  { id: BLOCK_GRAVEL, key: 'gravel', name: '砂砾', color: 0x8a8a8a, hardness: 0.6, transparent: false, solid: true },
  { id: BLOCK_BEDROCK, key: 'bedrock', name: '基岩', color: 0x333333, hardness: -1, transparent: false, solid: true },

  // Wood
  { id: BLOCK_WOOD, key: 'wood', name: '原木', color: 0x5c4033, hardness: 2.0, transparent: false, solid: true },
  { id: BLOCK_PLANKS, key: 'planks', name: '木板', color: 0x8b6914, hardness: 2.0, transparent: false, solid: true },
  { id: BLOCK_LEAVES, key: 'leaves', name: '树叶', color: 0x3a7a3a, hardness: 0.2, transparent: true, solid: true },

  // Ores
  { id: BLOCK_COAL_ORE, key: 'coal_ore', name: '煤矿石', color: 0x3a3a3a, hardness: 3.0, transparent: false, solid: true, toolRequired: 'pickaxe' },
  { id: BLOCK_IRON_ORE, key: 'iron_ore', name: '铁矿石', color: 0x8b7355, hardness: 3.0, transparent: false, solid: true, toolRequired: 'pickaxe' },
  { id: BLOCK_GOLD_ORE, key: 'gold_ore', name: '金矿石', color: 0xc5a000, hardness: 3.0, transparent: false, solid: true, toolRequired: 'pickaxe' },
  { id: BLOCK_DIAMOND_ORE, key: 'diamond_ore', name: '钻石矿石', color: 0x4a9e9e, hardness: 3.0, transparent: false, solid: true, toolRequired: 'pickaxe' },
  { id: BLOCK_REDSTONE_ORE, key: 'redstone_ore', name: '红石矿石', color: 0x8b0000, hardness: 3.0, transparent: false, solid: true, toolRequired: 'pickaxe', drops: [{ item: 'redstone_dust', count: 4 }] },

  // Decorative
  { id: BLOCK_GLASS, key: 'glass', name: '玻璃', color: 0xadd8e6, hardness: 0.3, transparent: true, solid: true },
  { id: BLOCK_WOODEN_STAIRS, key: 'wooden_stairs', name: '木楼梯', color: 0x8b6914, hardness: 2.0, transparent: false, solid: true, collision: [0, 0, 0, 1, 0.5, 1] },
  { id: BLOCK_STONE_STAIRS, key: 'stone_stairs', name: '石楼梯', color: 0x7a7a7a, hardness: 2.0, transparent: false, solid: true, collision: [0, 0, 0, 1, 0.5, 1] },
  { id: BLOCK_SLAB_WOOD, key: 'wooden_slab', name: '木台阶', color: 0x8b6914, hardness: 2.0, transparent: false, solid: true, collision: [0, 0, 0, 1, 0.5, 1] },
  { id: BLOCK_SLAB_STONE, key: 'stone_slab', name: '石台阶', color: 0x7a7a7a, hardness: 2.0, transparent: false, solid: true, collision: [0, 0, 0, 1, 0.5, 1] },
  { id: BLOCK_BRICK, key: 'brick', name: '砖块', color: 0x8b4513, hardness: 2.0, transparent: false, solid: true },

  // Functional
  { id: BLOCK_CRAFTING_TABLE, key: 'crafting_table', name: '工作台', color: 0x6b4226, hardness: 2.5, transparent: false, solid: true },
  { id: BLOCK_FURNACE, key: 'furnace', name: '熔炉', color: 0x5a5a5a, hardness: 3.5, transparent: false, solid: true, toolRequired: 'pickaxe' },
  { id: BLOCK_CHEST, key: 'chest', name: '箱子', color: 0x8b6914, hardness: 2.5, transparent: false, solid: true },
  { id: BLOCK_DOOR, key: 'door', name: '门', color: 0x5c4033, hardness: 3.0, transparent: false, solid: true },
  { id: BLOCK_LADDER, key: 'ladder', name: '梯子', color: 0x8b6914, hardness: 0.4, transparent: true, solid: true },
  { id: BLOCK_BED, key: 'bed', name: '床', color: 0x8b0000, hardness: 0.2, transparent: false, solid: true },

  // Liquid
  { id: BLOCK_WATER, key: 'water', name: '水', color: 0x3f76e4, hardness: 0, transparent: true, solid: false },

  // Food / items
  { id: BLOCK_ROTTEN_FLESH, key: 'rotten_flesh', name: '腐肉', color: 0x6b4c35, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_RAW_BEEF, key: 'raw_beef', name: '生牛肉', color: 0xb71c1c, hardness: 0, transparent: true, solid: false },

  // Redstone components
  { id: BLOCK_REDSTONE_DUST, key: 'redstone_dust', name: '红石粉', color: 0x8b0000, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_REDSTONE_TORCH, key: 'redstone_torch', name: '红石火把', color: 0xff4444, hardness: 0, transparent: true, solid: false, lightLevel: 7 },
  { id: BLOCK_REDSTONE_LAMP, key: 'redstone_lamp', name: '红石灯', color: 0x4a3728, hardness: 0.3, transparent: false, solid: true },
  { id: BLOCK_REDSTONE_LAMP_LIT, key: 'redstone_lamp_lit', name: '红石灯（亮）', color: 0xffdd88, hardness: 0.3, transparent: false, solid: true, lightLevel: 15 },
  { id: BLOCK_LEVER, key: 'lever', name: '拉杆', color: 0x8b7355, hardness: 0.5, transparent: true, solid: false },
  { id: BLOCK_BUTTON, key: 'button', name: '按钮', color: 0x8b7355, hardness: 0.5, transparent: true, solid: false },
  { id: BLOCK_REDSTONE_BLOCK, key: 'redstone_block', name: '红石块', color: 0xcc0000, hardness: 5, transparent: false, solid: true },
  { id: BLOCK_REPEATER, key: 'repeater', name: '红石中继器', color: 0x8b7355, hardness: 0.5, transparent: true, solid: false },

  // Tools
  { id: BLOCK_STICK, key: 'stick', name: '木棍', color: 0x8b6914, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_WOODEN_PICKAXE, key: 'wooden_pickaxe', name: '木镐', color: 0x8b6914, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_STONE_PICKAXE, key: 'stone_pickaxe', name: '石镐', color: 0x7a7a7a, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_IRON_PICKAXE, key: 'iron_pickaxe', name: '铁镐', color: 0x8b7355, hardness: 0, transparent: true, solid: false },
  { id: BLOCK_DIAMOND_PICKAXE, key: 'diamond_pickaxe', name: '钻石镐', color: 0x4a9e9e, hardness: 0, transparent: true, solid: false },
];

class BlockRegistryClass {
  private byId = new Map<number, BlockDefinition>();
  private byKey = new Map<string, BlockDefinition>();

  constructor() {
    for (const b of BLOCKS) {
      this.register(b);
    }
  }

  register(def: BlockDefinition) {
    this.byId.set(def.id, def);
    this.byKey.set(def.key, def);
  }

  getById(id: number): BlockDefinition {
    return this.byId.get(id) ?? BLOCKS[0];
  }

  getByKey(key: string): BlockDefinition | undefined {
    return this.byKey.get(key);
  }

  getAll(): BlockDefinition[] {
    return Array.from(this.byId.values());
  }
}

export const BlockRegistry = new BlockRegistryClass();
