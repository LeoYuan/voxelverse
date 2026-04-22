import { describe, expect, it } from 'vitest';
import {
  BLOCK_REDSTONE_BLOCK,
  BLOCK_REDSTONE_DUST,
  BLOCK_REDSTONE_LAMP,
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
});
