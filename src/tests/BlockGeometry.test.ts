import { describe, expect, it } from 'vitest';
import {
  BLOCK_FLOWER_RED,
  BLOCK_FLOWER_YELLOW,
  BLOCK_REDSTONE_BLOCK,
  BLOCK_REDSTONE_DUST,
  BLOCK_REDSTONE_LAMP,
  BLOCK_SAPLING,
  BLOCK_TALL_GRASS,
  BlockRegistry,
} from '../blocks/BlockRegistry';
import { getBlockRenderBounds } from '../blocks/blockGeometry';

describe('block render bounds', () => {
  it('renders redstone dust as a thin surface, not a full cube', () => {
    const bounds = getBlockRenderBounds(BlockRegistry.getById(BLOCK_REDSTONE_DUST));

    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBeLessThan(0.2);
  });

  it('keeps full blocks as full cubes', () => {
    const lampBounds = getBlockRenderBounds(BlockRegistry.getById(BLOCK_REDSTONE_LAMP));
    const blockBounds = getBlockRenderBounds(BlockRegistry.getById(BLOCK_REDSTONE_BLOCK));

    expect(lampBounds).toEqual({ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 });
    expect(blockBounds).toEqual({ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 });
  });

  it('renders decorative plants as narrow non-solid props, not full cubes', () => {
    const ids = [BLOCK_SAPLING, BLOCK_TALL_GRASS, BLOCK_FLOWER_YELLOW, BLOCK_FLOWER_RED];

    for (const id of ids) {
      const bounds = getBlockRenderBounds(BlockRegistry.getById(id));
      expect(bounds.maxX - bounds.minX).toBeLessThan(0.5);
      expect(bounds.maxZ - bounds.minZ).toBeLessThan(0.5);
      expect(bounds.maxY).toBeLessThan(0.85);
    }
  });
});
