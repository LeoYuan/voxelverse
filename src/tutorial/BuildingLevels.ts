import type { ChunkManager } from '../engine/ChunkManager';
import type { Vec3 } from '../utils/Vec3';
import { createCustomSpec, createHouseSpec, createLinearSpec, createPlacedBlockCountSpec, createPlatformSpec, createTowerSpec } from './levelTemplates';
import { targetBlock, type LevelSpec, type TargetBlock } from './levelSpec';
import { evaluateLevelSpec, type LevelProgress } from './levelValidation';

export type { TargetBlock } from './levelSpec';
export type { LevelProgress } from './levelValidation';

export interface LevelGoal {
  title: string;
  description: string;
  hint: string;
  checkComplete: (cm: ChunkManager, playerPos: Vec3) => boolean;
  getProgress?: (cm: ChunkManager, playerPos: Vec3) => LevelProgress[];
  targetBlocks?: TargetBlock[];
  spec: LevelSpec;
}

function evaluate(spec: LevelSpec, cm: ChunkManager, playerPos: Vec3) {
  return evaluateLevelSpec(spec, cm, playerPos);
}

function toGoal(spec: LevelSpec): LevelGoal {
  return {
    title: spec.title,
    description: spec.description,
    hint: spec.hint,
    targetBlocks: spec.target.blocks,
    spec,
    checkComplete: (cm, playerPos) => evaluate(spec, cm, playerPos).complete,
    getProgress: spec.target.progress
      ? (cm, playerPos) => evaluate(spec, cm, playerPos).progress
      : undefined,
  };
}

const stone = 0x8a8a8a;
const wood = 0xb8864b;
const wall = 0xe1d2bb;
const brick = 0xa05020;
const water = 0x5ea9ff;

const levelSpecs: LevelSpec[] = [
  createPlacedBlockCountSpec({
    id: 'first_block',
    title: '第一块方块',
    description: '放置任意1个方块',
    hint: '右键点击地面放置一个方块',
  }, 1, stone),
  createTowerSpec({
    id: 'small_tower',
    title: '小小高塔',
    description: '堆叠3个方块成一列',
    hint: '站在原地，按住右键往脚下连续放置方块',
  }, 3, stone),
  createPlatformSpec({
    id: 'small_platform',
    title: '小平台',
    description: '建造3x3的平台',
    hint: '在地面上连续放置9个方块组成3x3平面',
  }, 3, wood),
  createHouseSpec({
    id: 'small_house',
    title: '小房子',
    description: '建造一个简单的房子',
    hint: '先铺 3x3 地板，再围出 7 块墙，正面留 1 格门洞',
  }, {
    floorSize: 3,
    floorColor: wood,
    wallColor: wall,
    doorway: { x: 0, z: -1 },
  }),
  createTowerSpec({
    id: 'tall_tower',
    title: '更高的塔',
    description: '堆叠5个方块成塔',
    hint: '继续向上堆叠方块，建造更高的塔',
  }, 5, stone),
  createPlatformSpec({
    id: 'large_platform',
    title: '大平台',
    description: '建造5x5的平台',
    hint: '放置25个方块组成5x5平面',
  }, 5, wood),
  createHouseSpec({
    id: 'stone_house',
    title: '石头房子',
    description: '用不同材料建房子',
    hint: '尝试用石头或其他方块建造房子',
  }, {
    floorSize: 3,
    floorColor: stone,
    wallColor: 0xb9b9b9,
    doorway: { x: 0, z: -1 },
  }),
  createCustomSpec({
    id: 'stacked_platform',
    title: '叠加平台',
    description: '建造上下叠在一起的两个3x3平台',
    hint: '先铺 3x3 平台，再在正上方叠一层 3x3',
  }, [
    ...Array.from({ length: 3 }, (_, x) => Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, 0, z - 1, wood, 'floor'))).flat(),
    ...Array.from({ length: 3 }, (_, x) => Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, 1, z - 1, wood, 'floor'))).flat(),
  ], { type: 'stacked_platform', size: 3, layers: 2 }),
  createLinearSpec({
    id: 'fence',
    title: '围栏',
    description: '建造一条6格长的围栏',
    hint: '在地面上方放置一排方块作为围栏',
  }, { length: 6, color: wood, validator: 'fence', role: 'wall' }),
  createLinearSpec({
    id: 'bridge',
    title: '木栈道',
    description: '建造一条6格长、2格宽的通道',
    hint: '在地面上铺一条 6 格长、2 格宽的木栈道',
  }, { length: 6, color: wood, validator: 'bridge', role: 'bridge', doubleWidth: true }),
  createCustomSpec({
    id: 'corridor',
    title: '长廊',
    description: '建造一条8格长、有地基和两侧高墙的长廊',
    hint: '先铺 8x4 地基，中间 2 格作为通道，再在两侧地基上砌墙并加一层压顶',
  }, [
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 0, -1, stone, 'floor')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 0, 0, stone, 'floor')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 0, 1, stone, 'floor')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 0, 2, stone, 'floor')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 1, -1, stone, 'wall')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 1, 2, stone, 'wall')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 2, -1, brick, 'roof')),
    ...Array.from({ length: 8 }, (_, i) => targetBlock(i - 4, 2, 2, brick, 'roof')),
  ], { type: 'walled_corridor', length: 8 }),
  createCustomSpec({
    id: 'view_tower',
    title: '观景台',
    description: '在高处建造平台',
    hint: '先堆起 3x3 高台，再在最上层铺出观景平台',
  }, [
    ...Array.from({ length: 4 }, (_, y) =>
      Array.from({ length: 3 }, (_, x) =>
        Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, y, z - 1, stone, 'support'))
      ).flat()
    ).flat(),
    ...Array.from({ length: 3 }, (_, x) =>
      Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, 4, z - 1, wood, 'floor'))
    ).flat(),
  ], { type: 'stacked_platform', size: 3, layers: 5 }),
  createHouseSpec({
    id: 'window_house',
    title: '窗户房子',
    description: '建造带窗户的房子',
    hint: '在房子墙壁中留出空位作为窗户',
  }, {
    floorSize: 3,
    floorColor: wood,
    wallColor: wall,
    doorway: { x: 0, z: -1 },
    wallHeight: 1,
  }),
  createCustomSpec({
    id: 'castle_corner',
    title: '城堡一角',
    description: '建造城堡的一个角落',
    hint: '建造带有高墙的城堡结构',
  }, [
    ...Array.from({ length: 7 }, (_, y) => targetBlock(-1, y, 0, stone, 'wall')),
    ...Array.from({ length: 7 }, (_, y) => targetBlock(0, y, -1, stone, 'wall')),
  ], { type: 'pillar', height: 7 }),
  createLinearSpec({
    id: 'tunnel',
    title: '隧道',
    description: '挖掘一条5格长的隧道',
    hint: '在地面下挖掘一条通道',
  }, { length: 5, color: brick, validator: 'tunnel', role: 'void' }),
  createCustomSpec({
    id: 'basement',
    title: '地下室',
    description: '挖掘一个地下室空间',
    hint: '向下挖掘3格深，建造一个空间',
  }, [
    targetBlock(-1, -3, -1, stone, 'void'),
    targetBlock(1, -3, -1, stone, 'void'),
    targetBlock(-1, -3, 1, stone, 'void'),
    targetBlock(1, -3, 1, stone, 'void'),
    targetBlock(0, -3, 0, stone, 'void'),
  ], { type: 'basement', size: 3, depth: 3 }),
  createCustomSpec({
    id: 'pool',
    title: '水池',
    description: '建造一个有边框的水池',
    hint: '挖一个坑，放置水，再用方块围起来',
  }, [
    targetBlock(-1, 0, -1, wood, 'wall'),
    targetBlock(0, 0, -1, wood, 'wall'),
    targetBlock(1, 0, -1, wood, 'wall'),
    targetBlock(-1, 0, 0, wood, 'wall'),
    targetBlock(1, 0, 0, wood, 'wall'),
    targetBlock(-1, 0, 1, wood, 'wall'),
    targetBlock(0, 0, 1, wood, 'wall'),
    targetBlock(1, 0, 1, wood, 'wall'),
    targetBlock(0, -1, 0, water, 'water'),
  ], { type: 'water_pool', size: 3 }),
  createCustomSpec({
    id: 'stairs',
    title: '阶梯建筑',
    description: '建造带有阶梯的建筑',
    hint: '每一级台阶下面都补满支撑，做成实心阶梯',
  }, [
    ...Array.from({ length: 5 }, (_, step) =>
      Array.from({ length: step + 1 }, (_, y) =>
        targetBlock(step - 2, y, 0, wood, y === step ? 'path' : 'support')
      )
    ).flat(),
  ], { type: 'supported_stairs', steps: 5 }),
  createCustomSpec({
    id: 'complex',
    title: '复合结构',
    description: '建造 3 个分开的 3x3 平台',
    hint: '在附近分三处各铺一个 3x3 平台，一共完成 3 个',
  }, [
    ...Array.from({ length: 3 }, (_, x) =>
      Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, 0, z - 1, wood, 'floor'))
    ).flat(),
    ...Array.from({ length: 3 }, (_, x) =>
      Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, 0, z + 4, stone, 'floor'))
    ).flat(),
    ...Array.from({ length: 3 }, (_, x) =>
      Array.from({ length: 3 }, (_, z) => targetBlock(x - 1, 0, z + 9, wood, 'floor'))
    ).flat(),
  ], { type: 'complex_structure', count: 3 }),
  createPlacedBlockCountSpec({
    id: 'creative',
    title: '自由创作',
    description: '建造你的梦想建筑',
    hint: '发挥创意，建造任何你想要的建筑！',
  }, 50, wood),
];

export const LEVELS: LevelGoal[] = levelSpecs.map(toGoal);

export class LevelManager {
  currentLevel = 0;
  skipped = false;

  get current(): LevelGoal | null {
    if (this.skipped || this.currentLevel >= LEVELS.length) return null;
    return LEVELS[this.currentLevel];
  }

  check(cm: ChunkManager, playerPos: Vec3): boolean {
    const level = this.current;
    if (!level) return false;
    return level.checkComplete(cm, playerPos);
  }

  nextLevel(): void {
    this.currentLevel++;
  }

  skip(): void {
    this.skipped = true;
  }

  isComplete(): boolean {
    return this.skipped || this.currentLevel >= LEVELS.length;
  }

  get progress(): string {
    if (this.skipped) return '已跳过';
    if (this.isComplete()) return '自由创造模式';
    return `第 ${this.currentLevel + 1} / ${LEVELS.length} 关`;
  }
}
