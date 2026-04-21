import { describe, it, expect } from 'vitest';
import { Crafting } from '../crafting/CraftingRegistry';
import {
  BLOCK_PLANKS, BLOCK_CRAFTING_TABLE, BLOCK_FURNACE, BLOCK_CHEST,
  BLOCK_REDSTONE_DUST, BLOCK_REDSTONE_TORCH, BLOCK_LEVER,
  BLOCK_BUTTON, BLOCK_REDSTONE_LAMP, BLOCK_REPEATER, BLOCK_REDSTONE_BLOCK
} from '../blocks/BlockRegistry';

describe('CraftingRegistry', () => {
  it('should craft planks from wood', () => {
    const result = Crafting.match([4, 0, 0, 0], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_PLANKS);
    expect(result!.count).toBe(4);
  });

  it('should craft crafting table from planks', () => {
    const result = Crafting.match([
      BLOCK_PLANKS, BLOCK_PLANKS,
      BLOCK_PLANKS, BLOCK_PLANKS,
    ], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_CRAFTING_TABLE);
  });

  it('should craft furnace from cobblestone', () => {
    const result = Crafting.match([
      6, 6, 6,
      6, 0, 6,
      6, 6, 6,
    ], 3);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_FURNACE);
  });

  it('should craft chest from planks', () => {
    const result = Crafting.match([
      BLOCK_PLANKS, BLOCK_PLANKS, BLOCK_PLANKS,
      BLOCK_PLANKS, 0, BLOCK_PLANKS,
      BLOCK_PLANKS, BLOCK_PLANKS, BLOCK_PLANKS,
    ], 3);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_CHEST);
  });

  it('should return null for invalid recipes', () => {
    const result = Crafting.match([1, 2, 3, 4], 2);
    expect(result).toBeNull();
  });

  it('should not match 2x2 recipe in 3x3 grid', () => {
    const result = Crafting.match([
      4, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ], 3);
    expect(result).toBeNull();
  });

  it('should craft redstone torch', () => {
    const result = Crafting.match([BLOCK_REDSTONE_DUST, 0, BLOCK_PLANKS, 0], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_REDSTONE_TORCH);
  });

  it('should craft lever', () => {
    const result = Crafting.match([6, 0, BLOCK_PLANKS, 0], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_LEVER);
  });

  it('should craft button', () => {
    const result = Crafting.match([6, 0, 0, 0], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_BUTTON);
  });

  it('should craft redstone lamp', () => {
    const result = Crafting.match([BLOCK_REDSTONE_DUST, 3, 3, 0], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_REDSTONE_LAMP);
  });

  it('should craft repeater', () => {
    const result = Crafting.match([BLOCK_REDSTONE_DUST, BLOCK_REDSTONE_DUST, 6, 6], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_REPEATER);
  });

  it('should craft redstone block', () => {
    const result = Crafting.match([
      BLOCK_REDSTONE_DUST, BLOCK_REDSTONE_DUST,
      BLOCK_REDSTONE_DUST, BLOCK_REDSTONE_DUST,
    ], 2);
    expect(result).not.toBeNull();
    expect(result!.output).toBe(BLOCK_REDSTONE_BLOCK);
  });
});
