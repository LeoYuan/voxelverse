import { describe, expect, it } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { LEVELS, LevelManager } from '../tutorial/BuildingLevels';
import { Vec3 } from '../utils/Vec3';
import {
  BLOCK_PLANKS,
  BLOCK_STONE,
  BLOCK_WATER,
} from '../blocks/BlockRegistry';

type BuildScenario = {
  levelIndex: number;
  title: string;
  build: (cm: ChunkManager) => Vec3;
};

function place(cm: ChunkManager, x: number, y: number, z: number, blockId = BLOCK_PLANKS) {
  cm.setBlock(x, y, z, blockId);
  cm.markPlayerPlaced(x, y, z);
}

function setLevel(index: number): LevelManager {
  const lm = new LevelManager();
  lm.currentLevel = index;
  return lm;
}

function platform(cm: ChunkManager, size: number, y: number, ox = 0, oz = 0, blockId = BLOCK_PLANKS) {
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      place(cm, ox + x, y, oz + z, blockId);
    }
  }
}

function house(cm: ChunkManager, y: number, ox = 0, oz = 0, blockId = BLOCK_PLANKS) {
  platform(cm, 3, y, ox, oz, blockId);
  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) {
      if ((x === 0 || x === 2 || z === 0 || z === 2) && !(x === 1 && z === 0)) {
        place(cm, ox + x, y + 1, oz + z, blockId);
      }
    }
  }
}

const scenarios: BuildScenario[] = [
  {
    levelIndex: 0,
    title: '第一块方块',
    build: (cm) => {
      place(cm, 0, 18, 0, BLOCK_STONE);
      return new Vec3(0, 20, 0);
    },
  },
  {
    levelIndex: 1,
    title: '小小高塔',
    build: (cm) => {
      for (let y = 18; y < 21; y++) place(cm, 0, y, 0, BLOCK_STONE);
      return new Vec3(0, 20, 0);
    },
  },
  {
    levelIndex: 2,
    title: '小平台',
    build: (cm) => {
      platform(cm, 3, 18);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 3,
    title: '小房子',
    build: (cm) => {
      house(cm, 18);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 4,
    title: '更高的塔',
    build: (cm) => {
      for (let y = 18; y < 23; y++) place(cm, 0, y, 0, BLOCK_STONE);
      return new Vec3(0, 22, 0);
    },
  },
  {
    levelIndex: 5,
    title: '大平台',
    build: (cm) => {
      platform(cm, 5, 18);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 6,
    title: '石头房子',
    build: (cm) => {
      house(cm, 18, 0, 0, BLOCK_STONE);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 7,
    title: '叠加平台',
    build: (cm) => {
      platform(cm, 3, 18);
      platform(cm, 3, 19);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 8,
    title: '围栏',
    build: (cm) => {
      for (let x = 0; x < 6; x++) place(cm, x, 19, 0);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 9,
    title: '木栈道',
    build: (cm) => {
      for (let x = 0; x < 6; x++) {
        place(cm, x, 18, 0);
        place(cm, x, 18, 1);
      }
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 10,
    title: '长廊',
    build: (cm) => {
      for (let x = 0; x < 8; x++) {
        place(cm, x, 18, -1, BLOCK_STONE);
        place(cm, x, 18, 0, BLOCK_STONE);
        place(cm, x, 18, 1, BLOCK_STONE);
        place(cm, x, 18, 2, BLOCK_STONE);
        place(cm, x, 19, -1, BLOCK_STONE);
        place(cm, x, 19, 2, BLOCK_STONE);
        place(cm, x, 20, -1, BLOCK_STONE);
        place(cm, x, 20, 2, BLOCK_STONE);
      }
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 11,
    title: '观景台',
    build: (cm) => {
      for (let y = 18; y < 22; y++) {
        platform(cm, 3, y, 0, 0, BLOCK_STONE);
      }
      platform(cm, 3, 22);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 12,
    title: '窗户房子',
    build: (cm) => {
      house(cm, 18);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 13,
    title: '城堡一角',
    build: (cm) => {
      for (let y = 18; y < 25; y++) {
        place(cm, 0, y, 0, BLOCK_STONE);
        place(cm, 1, y, 0, BLOCK_STONE);
      }
      return new Vec3(0, 22, 0);
    },
  },
  {
    levelIndex: 14,
    title: '隧道',
    build: (cm) => {
      cm.ensureChunk(0, 0);
      return new Vec3(0, 21, 0);
    },
  },
  {
    levelIndex: 15,
    title: '地下室',
    build: (cm) => {
      cm.ensureChunk(0, 0);
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          cm.setBlock(x, 18, z, 0);
          cm.markPlayerRemoved(x, 18, z);
        }
      }
      return new Vec3(0, 21, 0);
    },
  },
  {
    levelIndex: 16,
    title: '水池',
    build: (cm) => {
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          if (x === 0 || x === 2 || z === 0 || z === 2) {
            place(cm, x, 10, z);
          } else {
            cm.setBlock(x, 9, z, BLOCK_WATER);
          }
        }
      }
      return new Vec3(5, 12, 5);
    },
  },
  {
    levelIndex: 17,
    title: '阶梯建筑',
    build: (cm) => {
      for (let i = 0; i < 5; i++) {
        for (let y = 18; y <= 18 + i; y++) {
          place(cm, i, y, 0);
        }
      }
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 18,
    title: '复合结构',
    build: (cm) => {
      platform(cm, 3, 18, 0, 0);
      platform(cm, 3, 18, 5, 0);
      platform(cm, 3, 18, 10, 0);
      return new Vec3(5, 20, 5);
    },
  },
  {
    levelIndex: 19,
    title: '自由创作',
    build: (cm) => {
      for (let x = 0; x < 10; x++) {
        for (let z = 0; z < 5; z++) {
          place(cm, x, 18, z);
        }
      }
      return new Vec3(5, 20, 5);
    },
  },
];

describe('all tutorial levels', () => {
  it('has one passing scenario for every level', () => {
    expect(scenarios).toHaveLength(LEVELS.length);
    expect(scenarios.map((scenario) => scenario.title)).toEqual(LEVELS.map((level) => level.title));
  });

  it.each(scenarios)('level %# $title passes with its documented minimal build', ({ levelIndex, build }) => {
    const cm = new ChunkManager(42);
    const lm = setLevel(levelIndex);
    const playerPos = build(cm);

    expect(lm.check(cm, playerPos)).toBe(true);
  });
});
