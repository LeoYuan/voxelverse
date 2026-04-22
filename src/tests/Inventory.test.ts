import { describe, expect, it } from 'vitest';
import { Inventory } from '../player/Inventory';
import { BLOCK_COBBLESTONE, BLOCK_FURNACE, BLOCK_PLANKS } from '../blocks/BlockRegistry';

describe('Inventory', () => {
  it('does not consume crafting inputs if the output cannot fit', () => {
    const inventory = new Inventory();

    for (let i = 0; i < 8; i++) {
      inventory.slots[i] = { blockId: BLOCK_COBBLESTONE, count: 1 };
    }
    inventory.slots[8] = { blockId: BLOCK_PLANKS, count: 64 };

    const crafted = inventory.craft({
      gridSize: 3,
      inputs: [
        BLOCK_COBBLESTONE, BLOCK_COBBLESTONE, BLOCK_COBBLESTONE,
        BLOCK_COBBLESTONE, 0, BLOCK_COBBLESTONE,
        BLOCK_COBBLESTONE, BLOCK_COBBLESTONE, BLOCK_COBBLESTONE,
      ],
      output: BLOCK_FURNACE,
      count: 1,
    });

    expect(crafted).toBe(false);
    expect(inventory.countOf(BLOCK_COBBLESTONE)).toBe(8);
    expect(inventory.countOf(BLOCK_FURNACE)).toBe(0);
  });
});
