import { describe, it, expect } from 'vitest';
import { ChunkManager } from '../engine/ChunkManager';
import { BLOCK_PLANKS, BLOCK_STONE } from '../blocks/BlockRegistry';

describe('ChunkManager', () => {
  it('does not update chunks again while the player remains in one chunk', () => {
    const cm = new ChunkManager(42);

    const first = cm.updatePlayerPosition(0, 0, 1);
    const second = cm.updatePlayerPosition(15.9, 0, 1);

    expect(first.loaded).toHaveLength(9);
    expect(first.unloaded).toHaveLength(0);
    expect(second).toEqual({ loaded: [], unloaded: [] });
  });

  it('returns only edge chunk deltas after crossing a chunk boundary', () => {
    const cm = new ChunkManager(42);
    cm.updatePlayerPosition(0, 0, 1);

    const delta = cm.updatePlayerPosition(16, 0, 1);

    expect(delta.loaded.map(chunk => `${chunk.cx},${chunk.cz}`).sort()).toEqual([
      '2,-1',
      '2,0',
      '2,1',
    ]);
    expect(delta.unloaded.map(chunk => `${chunk.cx},${chunk.cz}`).sort()).toEqual([
      '-1,-1',
      '-1,0',
      '-1,1',
    ]);
  });

  it('should track player-placed blocks', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);

    expect(cm.isPlayerPlaced(5, 10, 5)).toBe(false);

    cm.setPlayerBlock(5, 10, 5, BLOCK_STONE);

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
    cm.setPlayerBlock(0, foundY + 10, 0, BLOCK_STONE);
    expect(cm.isPlayerPlaced(0, foundY + 10, 0)).toBe(true);
  });

  it('should clear player-placed tracking when a block is removed', () => {
    const cm = new ChunkManager(42);

    cm.setPlayerBlock(2, 8, 3, BLOCK_STONE);
    expect(cm.isPlayerPlaced(2, 8, 3)).toBe(true);

    cm.setPlayerBlock(2, 8, 3, 0);

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

    cm.setPlayerBlock(0, foundY, 0, 0);

    expect(cm.isPlayerRemoved(0, foundY, 0)).toBe(true);

    cm.setPlayerBlock(0, foundY, 0, BLOCK_STONE);

    expect(cm.isPlayerRemoved(0, foundY, 0)).toBe(false);
    expect(cm.isPlayerPlaced(0, foundY, 0)).toBe(true);
  });

  it('exports player placements and removals with increasing revisions', () => {
    const cm = new ChunkManager(42);

    cm.setPlayerBlock(1, 12, 1, BLOCK_PLANKS);
    cm.setPlayerBlock(2, 8, 2, 0);

    expect(cm.exportMutations()).toEqual([
      { x: 1, y: 12, z: 1, blockId: BLOCK_PLANKS, revision: 1 },
      { x: 2, y: 8, z: 2, blockId: 0, revision: 2 },
    ]);
    expect(cm.getPlacementRevision()).toBe(2);
  });

  it('reapplies mutations after a chunk unload and regeneration', () => {
    const cm = new ChunkManager(42);
    cm.updatePlayerPosition(0, 0, 0);
    cm.setPlayerBlock(1, 12, 1, BLOCK_PLANKS);

    cm.updatePlayerPosition(64, 0, 0);
    expect(cm.getChunk(0, 0)).toBeUndefined();

    cm.updatePlayerPosition(0, 0, 0);

    expect(cm.getBlock(1, 12, 1)).toBe(BLOCK_PLANKS);
    expect(cm.isPlayerPlaced(1, 12, 1)).toBe(true);
  });

  it('imports mutations atomically and reports affected chunks', () => {
    const cm = new ChunkManager(42);
    cm.updatePlayerPosition(0, 0, 0);

    const affected = cm.importMutations([
      { x: 1, y: 12, z: 1, blockId: BLOCK_PLANKS, revision: 4 },
      { x: 17, y: 10, z: 1, blockId: BLOCK_STONE, revision: 5 },
    ]);

    expect(affected).toEqual([{ cx: 0, cz: 0 }, { cx: 1, cz: 0 }]);
    expect(cm.getBlock(1, 12, 1)).toBe(BLOCK_PLANKS);
    expect(cm.getPlacementRevision()).toBe(5);

    expect(() => cm.importMutations([
      { x: 3, y: 12, z: 3, blockId: BLOCK_PLANKS, revision: 6 },
      { x: 4.5, y: 12, z: 4, blockId: BLOCK_STONE, revision: 7 },
    ])).toThrow(/invalid world mutation/i);

    expect(cm.getBlock(3, 12, 3)).not.toBe(BLOCK_PLANKS);
    expect(cm.exportMutations()).toHaveLength(2);
  });

  it('rejects unknown block IDs and unreasonably large mutation lists', () => {
    const cm = new ChunkManager(42);

    expect(() => cm.importMutations([
      { x: 1, y: 1, z: 1, blockId: 9999, revision: 1 },
    ])).toThrow(/invalid world mutation/i);

    const excessive = Array.from({ length: 20_001 }, (_, index) => ({
      x: index,
      y: 1,
      z: 0,
      blockId: BLOCK_STONE,
      revision: index + 1,
    }));
    expect(() => cm.importMutations(excessive)).toThrow(/too many world mutations/i);
  });

  it('counts current placements by revision and block ID near a base', () => {
    const cm = new ChunkManager(42);
    cm.setPlayerBlock(1, 10, 1, BLOCK_PLANKS);
    const baseline = cm.getPlacementRevision();
    cm.setPlayerBlock(2, 10, 2, BLOCK_STONE);
    cm.setPlayerBlock(3, 10, 3, BLOCK_PLANKS);
    cm.setPlayerBlock(3, 10, 3, 0);
    cm.setPlayerBlock(50, 10, 50, BLOCK_STONE);

    expect(cm.countPlayerPlacementsSince(baseline, 0, 10, 0, 16)).toBe(1);
    expect(cm.countPlacedBlockIds(0, 10, 0, 16)).toEqual({
      [BLOCK_PLANKS]: 1,
      [BLOCK_STONE]: 1,
    });
  });
});
