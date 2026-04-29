import { describe, expect, it } from 'vitest';
import {
  BLOCK_GLASS,
  BLOCK_IRON_INGOT,
  BLOCK_IRON_ORE,
  BLOCK_PLANKS,
  BLOCK_RAW_BEEF,
  BLOCK_SAND,
  BLOCK_WOOD,
} from '../blocks/BlockRegistry';
import { FurnaceRegistry, FurnaceState } from '../crafting/FurnaceRegistry';

describe('FurnaceRegistry', () => {
  it('matches smelting recipes', () => {
    const recipe = FurnaceRegistry.getRecipe(BLOCK_IRON_ORE);

    expect(recipe).toEqual({ input: BLOCK_IRON_ORE, output: BLOCK_IRON_INGOT, cookTicks: 5 });
  });

  it('burns fuel and smelts one input into output', () => {
    const furnace = new FurnaceState({ inputId: BLOCK_IRON_ORE, inputCount: 1, fuelId: BLOCK_WOOD, fuelCount: 1 });

    for (let i = 0; i < 5; i++) {
      furnace.tick();
    }

    expect(furnace.snapshot()).toMatchObject({
      inputId: 0,
      inputCount: 0,
      fuelId: 0,
      fuelCount: 0,
      outputId: BLOCK_IRON_INGOT,
      outputCount: 1,
    });
  });

  it('keeps remaining burn time after consuming stronger fuel', () => {
    const furnace = new FurnaceState({ inputId: BLOCK_SAND, inputCount: 1, fuelId: BLOCK_PLANKS, fuelCount: 1 });

    furnace.tick();

    expect(furnace.snapshot().burnTicksRemaining).toBeGreaterThan(0);
  });

  it('does not consume fuel for invalid input', () => {
    const furnace = new FurnaceState({ inputId: BLOCK_PLANKS, inputCount: 1, fuelId: BLOCK_WOOD, fuelCount: 1 });

    furnace.tick();

    expect(furnace.snapshot()).toMatchObject({
      inputId: BLOCK_PLANKS,
      inputCount: 1,
      fuelId: BLOCK_WOOD,
      fuelCount: 1,
      burnTicksRemaining: 0,
      cookTicks: 0,
    });
  });

  it('pauses when output slot contains a different item', () => {
    const furnace = new FurnaceState({
      inputId: BLOCK_RAW_BEEF,
      inputCount: 1,
      fuelId: BLOCK_WOOD,
      fuelCount: 1,
      outputId: BLOCK_GLASS,
      outputCount: 1,
    });

    furnace.tick();

    expect(furnace.snapshot()).toMatchObject({
      inputId: BLOCK_RAW_BEEF,
      inputCount: 1,
      fuelId: BLOCK_WOOD,
      fuelCount: 1,
      outputId: BLOCK_GLASS,
      outputCount: 1,
      burnTicksRemaining: 0,
      cookTicks: 0,
    });
  });
});
