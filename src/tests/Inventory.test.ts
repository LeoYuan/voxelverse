import { describe, expect, it } from 'vitest';
import { Inventory } from '../player/Inventory';
import { BLOCK_COBBLESTONE, BLOCK_FURNACE, BLOCK_PLANKS } from '../blocks/BlockRegistry';

describe('Inventory', () => {
  it('snapshots and restores slots without sharing mutable references', () => {
    const inventory = new Inventory();
    inventory.slots[0] = { blockId: BLOCK_PLANKS, count: 12 };
    inventory.selectedSlot = 4;

    const snapshot = inventory.snapshot();
    inventory.slots[0].count = 2;
    inventory.selectedSlot = 0;

    expect(snapshot).toEqual({
      slots: [
        { blockId: BLOCK_PLANKS, count: 12 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
        { blockId: 0, count: 0 },
      ],
      selectedSlot: 4,
    });

    const restored = new Inventory();
    restored.restore(snapshot);
    snapshot.slots[0].count = 1;

    expect(restored.slots[0]).toEqual({ blockId: BLOCK_PLANKS, count: 12 });
    expect(restored.selectedSlot).toBe(4);
  });

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
