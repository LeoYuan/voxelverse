import type { CraftingRecipe } from '../crafting/CraftingRegistry';

export interface InventorySlot {
  blockId: number;
  count: number;
}

const MAX_STACK = 64;
const TOOL_IDS = new Set([40, 41, 42, 43, 44]); // stick + pickaxes

export class Inventory {
  public slots: InventorySlot[];
  public selectedSlot = 0;

  constructor() {
    this.slots = Array.from({ length: 9 }, () => ({ blockId: 0, count: 0 }));
  }

  getSelectedBlockId(): number {
    return this.slots[this.selectedSlot].blockId;
  }

  setSelectedSlot(index: number) {
    if (index >= 0 && index < 9) {
      this.selectedSlot = index;
    }
  }

  /** Add items to inventory. Returns overflow count that couldn't fit. */
  addItem(blockId: number, count: number): number {
    if (blockId === 0 || count <= 0) return count;

    const maxStack = TOOL_IDS.has(blockId) ? 1 : MAX_STACK;
    let remaining = count;

    // First, try to stack with existing slots
    for (const slot of this.slots) {
      if (slot.blockId === blockId && slot.count < maxStack) {
        const canAdd = Math.min(remaining, maxStack - slot.count);
        slot.count += canAdd;
        remaining -= canAdd;
        if (remaining <= 0) return 0;
      }
    }

    // Then, fill empty slots
    for (const slot of this.slots) {
      if (slot.blockId === 0) {
        const canAdd = Math.min(remaining, maxStack);
        slot.blockId = blockId;
        slot.count = canAdd;
        remaining -= canAdd;
        if (remaining <= 0) return 0;
      }
    }

    return remaining;
  }

  /** Remove items from a slot. Returns true if successful. */
  removeFromSlot(slotIndex: number, count: number): boolean {
    const slot = this.slots[slotIndex];
    if (slot.count < count) return false;
    slot.count -= count;
    if (slot.count === 0) {
      slot.blockId = 0;
    }
    return true;
  }

  /** Remove one item from the selected slot. Returns true if successful. */
  consumeSelected(): boolean {
    return this.removeFromSlot(this.selectedSlot, 1);
  }

  /** Check if inventory has enough items for a crafting recipe. */
  canCraft(recipe: CraftingRecipe): boolean {
    const needs = new Map<number, number>();
    for (const id of recipe.inputs) {
      if (id === 0) continue;
      needs.set(id, (needs.get(id) ?? 0) + 1);
    }

    const have = new Map<number, number>();
    for (const slot of this.slots) {
      if (slot.blockId !== 0) {
        have.set(slot.blockId, (have.get(slot.blockId) ?? 0) + slot.count);
      }
    }

    for (const [id, needCount] of needs) {
      if ((have.get(id) ?? 0) < needCount) return false;
    }
    return true;
  }

  /** Consume inputs and add output for a crafting recipe. Returns true if successful. */
  craft(recipe: CraftingRecipe): boolean {
    if (!this.canCraft(recipe)) return false;

    const needs = new Map<number, number>();
    for (const id of recipe.inputs) {
      if (id === 0) continue;
      needs.set(id, (needs.get(id) ?? 0) + 1);
    }

    // Consume inputs
    for (const [id, needCount] of needs) {
      let remaining = needCount;
      for (const slot of this.slots) {
        if (slot.blockId === id) {
          const take = Math.min(remaining, slot.count);
          slot.count -= take;
          remaining -= take;
          if (slot.count === 0) slot.blockId = 0;
          if (remaining <= 0) break;
        }
      }
    }

    // Add output
    this.addItem(recipe.output, recipe.count);
    return true;
  }

  /** Clear a slot (e.g. when tool breaks). */
  clearSlot(index: number) {
    if (index >= 0 && index < 9) {
      this.slots[index] = { blockId: 0, count: 0 };
    }
  }

  /** Get total count of a block ID across all slots. */
  countOf(blockId: number): number {
    return this.slots
      .filter(s => s.blockId === blockId)
      .reduce((sum, s) => sum + s.count, 0);
  }
}
