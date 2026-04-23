import { describe, it, expect } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { BLOCK_STONE } from '../blocks/BlockRegistry';

describe('ChunkManager', () => {
  it('should track player-placed blocks', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);

    expect(cm.isPlayerPlaced(5, 10, 5)).toBe(false);

    cm.setBlock(5, 10, 5, BLOCK_STONE);
    cm.markPlayerPlaced(5, 10, 5);

    expect(cm.isPlayerPlaced(5, 10, 5)).toBe(true);
    expect(cm.isPlayerPlaced(5, 10, 6)).toBe(false);
  });

  it('should distinguish player-placed from generated blocks', () => {
    const cm = new ChunkManager(42);
    // Generate a chunk (world-generated blocks are not marked as player-placed)
    cm.ensureChunk(0, 0);

    // Find a generated non-air block
    let foundY = -1;
    for (let y = 0; y < 30; y++) {
      const id = cm.getBlock(0, y, 0);
      if (id !== 0) {
        foundY = y;
        break;
      }
    }
    expect(foundY).toBeGreaterThanOrEqual(0);

    // Generated blocks should not be player-placed
    expect(cm.isPlayerPlaced(0, foundY, 0)).toBe(false);

    // Player-placed block should be tracked
    cm.setBlock(0, foundY + 10, 0, BLOCK_STONE);
    cm.markPlayerPlaced(0, foundY + 10, 0);
    expect(cm.isPlayerPlaced(0, foundY + 10, 0)).toBe(true);
  });

  it('should clear player-placed tracking when a block is removed', () => {
    const cm = new ChunkManager(42);

    cm.setBlock(2, 8, 3, BLOCK_STONE);
    cm.markPlayerPlaced(2, 8, 3);
    expect(cm.isPlayerPlaced(2, 8, 3)).toBe(true);

    cm.setBlock(2, 8, 3, 0);

    expect(cm.isPlayerPlaced(2, 8, 3)).toBe(false);
  });

  it('should track player-removed generated blocks separately', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);

    let foundY = -1;
    for (let y = 0; y < 30; y++) {
      if (cm.getBlock(0, y, 0) !== 0) {
        foundY = y;
        break;
      }
    }

    expect(foundY).toBeGreaterThanOrEqual(0);
    expect(cm.isPlayerRemoved(0, foundY, 0)).toBe(false);

    cm.setBlock(0, foundY, 0, 0);
    cm.markPlayerRemoved(0, foundY, 0);

    expect(cm.isPlayerRemoved(0, foundY, 0)).toBe(true);

    cm.setBlock(0, foundY, 0, BLOCK_STONE);
    cm.markPlayerPlaced(0, foundY, 0);

    expect(cm.isPlayerRemoved(0, foundY, 0)).toBe(false);
    expect(cm.isPlayerPlaced(0, foundY, 0)).toBe(true);
  });
});
