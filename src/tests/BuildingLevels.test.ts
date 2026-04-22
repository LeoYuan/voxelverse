import { describe, it, expect } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { LevelManager, LEVELS } from '../tutorial/BuildingLevels';
import { Vec3 } from '../utils/Vec3';
import {
  BLOCK_STONE, BLOCK_WOOD, BLOCK_PLANKS
} from '../blocks/BlockRegistry';

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
  it('should complete with 3x3 floor and inner walls', () => {
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

    // Build walls on floor perimeter (inner walls), just 4 blocks needed
    cm.setBlock(0, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 0);
    cm.setBlock(2, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 0);
    cm.setBlock(0, 19, 2, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 2);
    cm.setBlock(2, 19, 2, BLOCK_PLANKS);
    cm.markPlayerPlaced(2, 19, 2);

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
  });

  it('should complete with 3x3 floor and outer walls', () => {
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

    // Build walls one block outside the floor (outer walls)
    cm.setBlock(-1, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(-1, 19, 0);
    cm.setBlock(3, 19, 0, BLOCK_PLANKS);
    cm.markPlayerPlaced(3, 19, 0);
    cm.setBlock(0, 19, -1, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, -1);
    cm.setBlock(0, 19, 3, BLOCK_PLANKS);
    cm.markPlayerPlaced(0, 19, 3);

    expect(lm.check(cm, new Vec3(5, 20, 5))).toBe(true);
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
    expect(progress[1].current).toBe(8);
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
  });
});
