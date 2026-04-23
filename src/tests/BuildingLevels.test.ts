import { describe, it, expect } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { LevelManager, LEVELS } from '../tutorial/BuildingLevels';
import { Vec3 } from '../utils/Vec3';
import {
  BLOCK_STONE, BLOCK_WOOD, BLOCK_PLANKS
} from '../blocks/BlockRegistry';

function expectNoFloatingTargetBlocks(startLevelIndex: number) {
  for (let levelIndex = startLevelIndex; levelIndex < LEVELS.length; levelIndex++) {
    const blocks = LEVELS[levelIndex].targetBlocks ?? [];
    const occupied = new Set(blocks.map((block) => `${block.x},${block.y},${block.z}`));
    for (const block of blocks) {
      if (block.y <= 0 || block.role === 'water' || block.role === 'void') continue;
      expect(
        occupied.has(`${block.x},${block.y - 1},${block.z}`),
        `${LEVELS[levelIndex].title} has unsupported block at (${block.x}, ${block.y}, ${block.z})`,
      ).toBe(true);
    }
  }
}

describe('LevelManager', () => {
  it('should start at level 1', () => {
    const lm = new LevelManager();
    expect(lm.currentLevel).toBe(0);
    expect(lm.current?.title).toBe('第一块方块');
    expect(lm.isComplete()).toBe(false);
  });

  it('should progress through levels', () => {
    const lm = new LevelManager();

    for (let i = 1; i < LEVELS.length; i++) {
      lm.nextLevel();
      expect(lm.currentLevel).toBe(i);
      expect(lm.current?.title).toBe(LEVELS[i].title);
    }

    lm.nextLevel();

    expect(lm.isComplete()).toBe(true);
    expect(lm.current).toBeNull();
  });

  it('should allow skipping', () => {
    const lm = new LevelManager();
    lm.skip();
    expect(lm.isComplete()).toBe(true);
    expect(lm.progress).toBe('已跳过');
  });

  it('should expose target previews for early building levels', () => {
    expect(LEVELS[0].targetBlocks).toEqual([{ x: 0, y: 0, z: 0, color: 0x8a8a8a, role: 'structure' }]);
    expect(LEVELS[1].targetBlocks).toHaveLength(3);
    expect(LEVELS[2].targetBlocks).toHaveLength(9);
    expect(LEVELS[3].targetBlocks).toHaveLength(16);
  });

  it('should provide structure previews for every level', () => {
    for (const level of LEVELS) {
      expect(level.targetBlocks?.length ?? 0).toBeGreaterThan(0);
    }
    expect(LEVELS[7].title).toBe('叠加平台');
    expect(Math.max(...LEVELS[7].targetBlocks!.map((block) => block.y))).toBe(1);
  });

  it('should avoid floating preview targets from level 12 onward', () => {
    expectNoFloatingTargetBlocks(11);
  });
});

describe('Level 8: 叠加平台', () => {
  it('should complete when two 3x3 platforms are stacked directly', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    for (let i = 0; i < 7; i++) lm.nextLevel();

    for (let y = 18; y <= 19; y++) {
      for (let x = 0; x < 3; x++) {
        for (let z = 0; z < 3; z++) {
          cm.setBlock(x, y, z, BLOCK_PLANKS);
          cm.markPlayerPlaced(x, y, z);
        }
      }
    }

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
  });
});

describe('Level 10: 木栈道', () => {
  it('should complete with a 6 long by 2 wide path on the ground', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    for (let i = 0; i < 9; i++) lm.nextLevel();

    for (let x = 0; x < 6; x++) {
      for (let z = 0; z < 2; z++) {
        cm.setBlock(x, 18, z, BLOCK_PLANKS);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    expect(LEVELS[9].title).toBe('木栈道');
    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
  });
});

describe('Level 11: 长廊', () => {
  it('should complete with foundation, side walls, and supported wall caps', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    for (let i = 0; i < 10; i++) lm.nextLevel();

    for (let x = 0; x < 8; x++) {
      for (let z = -1; z <= 2; z++) {
        cm.setBlock(x, 18, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 18, z);
      }
      for (const z of [-1, 2]) {
        cm.setBlock(x, 19, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 19, z);
        cm.setBlock(x, 20, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 20, z);
      }
    }

    expect(LEVELS[10].title).toBe('长廊');
    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
  });

  it('should NOT complete with only the 8x2 floor', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    for (let i = 0; i < 10; i++) lm.nextLevel();

    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 2; z++) {
        cm.setBlock(x, 18, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(false);
  });

  it('should NOT complete when side walls have no foundation underneath', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    for (let i = 0; i < 10; i++) lm.nextLevel();

    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 2; z++) {
        cm.setBlock(x, 18, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 18, z);
      }
      for (const z of [-1, 2]) {
        cm.setBlock(x, 19, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 19, z);
        cm.setBlock(x, 20, z, BLOCK_STONE);
        cm.markPlayerPlaced(x, 20, z);
      }
    }

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(false);
  });

  it('should show all required corridor parts in the preview target', () => {
    const blocks = LEVELS[10].targetBlocks ?? [];

    expect(blocks.filter((block) => block.role === 'floor')).toHaveLength(32);
    expect(blocks.filter((block) => block.role === 'wall')).toHaveLength(16);
    expect(blocks.filter((block) => block.role === 'roof')).toHaveLength(16);
  });
});

describe('Level 16: 地下室', () => {
  it('should NOT auto-complete from generated terrain alone', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);
    const lm = new LevelManager();
    for (let i = 0; i < 15; i++) lm.nextLevel();

    expect(LEVELS[15].title).toBe('地下室');
    expect(lm.check(cm, new Vec3(0, 21, 0))).toBe(false);
  });

  it('should complete after the player digs a 3x3 basement space', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);
    const lm = new LevelManager();
    for (let i = 0; i < 15; i++) lm.nextLevel();

    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        cm.setBlock(x, 18, z, 0);
        cm.markPlayerRemoved(x, 18, z);
      }
    }

    expect(lm.check(cm, new Vec3(0, 21, 0))).toBe(true);
  });
});

describe('Level 19: 复合结构', () => {
  it('should preview three full 3x3 platforms instead of placeholder blocks', () => {
    const blocks = LEVELS[18].targetBlocks ?? [];

    expect(LEVELS[18].title).toBe('复合结构');
    expect(blocks.filter((block) => block.role === 'floor')).toHaveLength(27);
  });
});

describe('Level 1: 第一块方块', () => {
  it('should complete when any player-placed block exists nearby', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    const playerPos = new Vec3(0, 20, 0);

    expect(lm.check(cm, playerPos)).toBe(false);

    cm.setBlock(0, 18, 0, BLOCK_STONE);
    cm.markPlayerPlaced(0, 18, 0);

    expect(lm.check(cm, playerPos)).toBe(true);
  });

  it('should NOT complete for world-generated blocks', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);
    const lm = new LevelManager();

    expect(lm.check(cm, new Vec3(0, 20, 0))).toBe(false);
  });
});

describe('Level 2: 小小高塔', () => {
  it('should complete when 3 player-placed blocks are stacked', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();

    for (let y = 23; y < 26; y++) {
      cm.setBlock(0, y, 0, BLOCK_STONE);
      cm.markPlayerPlaced(0, y, 0);
    }

    expect(lm.check(cm, new Vec3(0, 25, 0))).toBe(true);
  });

  it('should NOT complete for scattered blocks', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();

    cm.setBlock(0, 18, 0, BLOCK_STONE);
    cm.markPlayerPlaced(0, 18, 0);
    cm.setBlock(1, 18, 0, BLOCK_STONE);
    cm.markPlayerPlaced(1, 18, 0);
    cm.setBlock(2, 18, 0, BLOCK_STONE);
    cm.markPlayerPlaced(2, 18, 0);

    expect(lm.check(cm, new Vec3(0, 25, 0))).toBe(false);
  });
});

describe('Level 3: 小平台', () => {
  it('should complete when 3x3 player-placed platform exists', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();
    lm.nextLevel();

    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setBlock(x, 18, z, BLOCK_WOOD);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
  });
});

describe('Level 4: 小房子', () => {
  it('should complete with 3x3 floor and a full wall ring', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();
    lm.nextLevel();
    lm.nextLevel();

    // Build 3x3 floor
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setBlock(x, 18, z, BLOCK_PLANKS);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    // Build the full perimeter ring except the doorway
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        if ((x === 0 || x === 2 || z === 0 || z === 2) && !(x === 1 && z === 0)) {
          cm.setBlock(x, 19, z, BLOCK_PLANKS);
          cm.markPlayerPlaced(x, 19, z);
        }
      }
    }

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
  });

  it('should NOT complete with only four corner walls', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();
    lm.nextLevel();
    lm.nextLevel();

    // Build 3x3 floor
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setBlock(x, 18, z, BLOCK_PLANKS);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    cm.setBlock(0, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 0);
    cm.setBlock(2, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 0);
    cm.setBlock(0, 19, 2, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 2);
    cm.setBlock(2, 19, 2, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 2);

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(false);
  });

  it('should NOT complete with floor but no walls', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();
    lm.nextLevel();
    lm.nextLevel();

    // Build 3x3 floor only
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setBlock(x, 18, z, BLOCK_PLANKS);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(false);
  });

  it('should NOT complete with walls but no floor', () => {
    const cm = new ChunkManager(42);
    const lm = new LevelManager();
    lm.nextLevel();
    lm.nextLevel();
    lm.nextLevel();

    // Build walls only (no floor)
    cm.setBlock(0, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 0);
    cm.setBlock(2, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 0);
    cm.setBlock(0, 19, 2, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 2);
    cm.setBlock(2, 19, 2, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 2);

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(false);
  });

  it('should show correct progress', () => {
    const cm = new ChunkManager(42);

    // Build 3x3 floor
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setBlock(x, 18, z, BLOCK_PLANKS);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    // Build 8 inner wall blocks (full perimeter)
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i === 0 || i === 2 || j === 0 || j === 2) {
          cm.setBlock(i, 19, j, BLOCK_PLANKS);
          cm.markPlayerPlaced(i, 19, j);
        }
      }
    }

    const level = LEVELS[3];
    const progress = level.getProgress!(cm, new Vec3(5, 20, 5));
    expect(progress[0]).toEqual({ current: 9, target: 9, label: '地板' });
    expect(progress[1]).toEqual({ current: 7, target: 7, label: '围墙' });
  });

  it('should show partial progress when walls are incomplete', () => {
    const cm = new ChunkManager(42);

    // Build 3x3 floor
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setBlock(x, 18, z, BLOCK_PLANKS);
        cm.markPlayerPlaced(x, 18, z);
      }
    }

    // Build only 2 wall blocks
    cm.setBlock(0, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 0);
    cm.setBlock(2, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 0);

    const level = LEVELS[3];
    const progress = level.getProgress!(cm, new Vec3(5, 20, 5));
    expect(progress[0]).toEqual({ current: 9, target: 9, label: '地板' });
    expect(progress[1].current).toBe(2);
    expect(progress[1].target).toBe(7);
  });
});
