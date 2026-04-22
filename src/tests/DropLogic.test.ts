import { describe, expect, it } from 'vitest';
import {
  BLOCK_FURNACE,
  BLOCK_REDSTONE_DUST,
  BLOCK_REDSTONE_ORE,
  BLOCK_STONE,
  BLOCK_WOODEN_PICKAXE,
  BLOCK_COBBLESTONE,
} from '../blocks/BlockRegistry';
import { resolveBlockDrops } from '../player/dropLogic';

describe('resolveBlockDrops', () => {
  it('does not drop tool-gated blocks when the wrong tool is used', () => {
    expect(resolveBlockDrops(BLOCK_STONE, 0, () => 0)).toEqual([]);
  });

  it('uses configured drop items and counts when the required tool is present', () => {
    expect(resolveBlockDrops(BLOCK_REDSTONE_ORE, BLOCK_WOODEN_PICKAXE, () => 0)).toEqual([
      BLOCK_REDSTONE_DUST,
      BLOCK_REDSTONE_DUST,
      BLOCK_REDSTONE_DUST,
      BLOCK_REDSTONE_DUST,
    ]);
  });

  it('falls back to dropping the block itself when no explicit drop list is configured', () => {
    expect(resolveBlockDrops(BLOCK_FURNACE, BLOCK_WOODEN_PICKAXE, () => 0)).toEqual([BLOCK_FURNACE]);
  });

  it('honors explicit drop replacements for harvestable blocks', () => {
    expect(resolveBlockDrops(BLOCK_STONE, BLOCK_WOODEN_PICKAXE, () => 0)).toEqual([BLOCK_COBBLESTONE]);
  });
});
