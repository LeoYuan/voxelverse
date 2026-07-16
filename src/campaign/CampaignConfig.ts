import {
  BLOCK_COBBLESTONE,
  BLOCK_COOKED_BEEF,
  BLOCK_CRAFTING_TABLE,
  BLOCK_FURNACE,
  BLOCK_GLASS,
  BLOCK_IRON_ORE,
  BLOCK_IRON_PICKAXE,
  BLOCK_PLANKS,
  BLOCK_REDSTONE_DUST,
  BLOCK_REDSTONE_LAMP,
  BLOCK_REDSTONE_TORCH,
  BLOCK_STONE_PICKAXE,
  BLOCK_WOOD,
} from '../blocks/BlockRegistry';

export type CampaignEnemyKind = 'zombie' | 'skeleton' | 'creeper';

export type CampaignObjective =
  | { type: 'shelter'; floor: number; walls: number }
  | { type: 'required_blocks'; requirements: Record<number, number> }
  | { type: 'reinforcement'; count: number; requirements?: Record<number, number> };

export interface CampaignReward {
  blockId: number;
  count: number;
}

export interface CampaignDefense {
  duration: number;
  killTarget: number;
  spawnInterval: number;
  composition: Record<CampaignEnemyKind, number>;
}

export interface CampaignChapter {
  id: string;
  title: string;
  objectiveText: string;
  rewardText: string;
  objective: CampaignObjective;
  defense?: CampaignDefense;
  rewards: CampaignReward[];
}

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    id: 'establish-outpost',
    title: '建立据点',
    objectiveText: '建造 3×3 地板，并围出至少 7 块墙。',
    rewardText: '石镐与熟牛肉',
    objective: { type: 'shelter', floor: 9, walls: 7 },
    rewards: [
      { blockId: BLOCK_STONE_PICKAXE, count: 1 },
      { blockId: BLOCK_COOKED_BEEF, count: 2 },
    ],
  },
  {
    id: 'light-the-hearth',
    title: '点亮炉火',
    objectiveText: '在基地附近放置工作台和熔炉。',
    rewardText: '铁矿、木材与圆石',
    objective: {
      type: 'required_blocks',
      requirements: {
        [BLOCK_CRAFTING_TABLE]: 1,
        [BLOCK_FURNACE]: 1,
      },
    },
    defense: {
      duration: 30,
      killTarget: 3,
      spawnInterval: 3,
      composition: { zombie: 1, skeleton: 0, creeper: 0 },
    },
    rewards: [
      { blockId: BLOCK_IRON_ORE, count: 3 },
      { blockId: BLOCK_WOOD, count: 8 },
      { blockId: BLOCK_COBBLESTONE, count: 16 },
    ],
  },
  {
    id: 'first-night',
    title: '第一夜',
    objectiveText: '从本章开始后新增至少 16 块防御建筑。',
    rewardText: '铁镐与熟牛肉',
    objective: { type: 'reinforcement', count: 16 },
    defense: {
      duration: 45,
      killTarget: 5,
      spawnInterval: 2.8,
      composition: { zombie: 0.72, skeleton: 0.28, creeper: 0 },
    },
    rewards: [
      { blockId: BLOCK_IRON_PICKAXE, count: 1 },
      { blockId: BLOCK_COOKED_BEEF, count: 3 },
    ],
  },
  {
    id: 'fortify-base',
    title: '加固基地',
    objectiveText: '新增至少 28 块防御建筑，并在基地附近放置一盏红石灯。',
    rewardText: '红石元件与玻璃',
    objective: {
      type: 'reinforcement',
      count: 28,
      requirements: { [BLOCK_REDSTONE_LAMP]: 1 },
    },
    defense: {
      duration: 55,
      killTarget: 7,
      spawnInterval: 2.5,
      composition: { zombie: 0.55, skeleton: 0.3, creeper: 0.15 },
    },
    rewards: [
      { blockId: BLOCK_REDSTONE_DUST, count: 12 },
      { blockId: BLOCK_REDSTONE_TORCH, count: 4 },
      { blockId: BLOCK_GLASS, count: 16 },
    ],
  },
  {
    id: 'hold-until-dawn',
    title: '坚守黎明',
    objectiveText: '新增至少 40 块防御建筑，并维持两盏红石灯。',
    rewardText: '解锁无尽守夜',
    objective: {
      type: 'reinforcement',
      count: 40,
      requirements: { [BLOCK_REDSTONE_LAMP]: 2 },
    },
    defense: {
      duration: 70,
      killTarget: 10,
      spawnInterval: 2.2,
      composition: { zombie: 0.45, skeleton: 0.32, creeper: 0.23 },
    },
    rewards: [
      { blockId: BLOCK_PLANKS, count: 32 },
      { blockId: BLOCK_COOKED_BEEF, count: 4 },
    ],
  },
];

export function getEndlessDefense(wave: number): CampaignDefense {
  const normalizedWave = Math.max(1, Math.floor(wave));
  return {
    duration: 45 + Math.min(25, normalizedWave * 5),
    killTarget: 5 + normalizedWave * 2,
    spawnInterval: Math.max(1.4, 2.6 - normalizedWave * 0.08),
    composition: {
      zombie: Math.max(0.35, 0.58 - normalizedWave * 0.02),
      skeleton: Math.min(0.38, 0.27 + normalizedWave * 0.01),
      creeper: Math.min(0.27, 0.15 + normalizedWave * 0.01),
    },
  };
}

export function getEndlessRewards(wave: number): CampaignReward[] {
  return [
    { blockId: BLOCK_COBBLESTONE, count: 8 + Math.min(24, wave * 2) },
    { blockId: BLOCK_COOKED_BEEF, count: 1 },
  ];
}
