import { describe, it, expect } from 'vitest';
import {
  BLOCK_AIR,
  BLOCK_ALU_INPUT_ON,
  BLOCK_ALU_OUTPUT_ON,
  BLOCK_GRASS,
  BLOCK_STONE,
  BlockRegistry,
} from '../blocks/BlockRegistry';

describe('BlockRegistry', () => {
  it('should return air for id 0', () => {
    const block = BlockRegistry.getById(BLOCK_AIR);
    expect(block.key).toBe('air');
    expect(block.solid).toBe(false);
  });

  it('should return grass for id 1', () => {
    const block = BlockRegistry.getById(BLOCK_GRASS);
    expect(block.key).toBe('grass');
    expect(block.solid).toBe(true);
  });

  it('should return stone for id 3', () => {
    const block = BlockRegistry.getById(BLOCK_STONE);
    expect(block.key).toBe('stone');
    expect(block.hardness).toBe(1.5);
  });

  it('should lookup by key', () => {
    const block = BlockRegistry.getByKey('glass');
    expect(block).toBeDefined();
    expect(block!.transparent).toBe(true);
  });

  it('should return all registered blocks', () => {
    const all = BlockRegistry.getAll();
    expect(all.length).toBeGreaterThanOrEqual(6);
  });

  it('registers creative ALU redstone components', () => {
    const input = BlockRegistry.getById(BLOCK_ALU_INPUT_ON);
    const output = BlockRegistry.getById(BLOCK_ALU_OUTPUT_ON);

    expect(input.category).toBe('redstone');
    expect(input.lightLevel).toBeGreaterThan(0);
    expect(output.key).toBe('alu_output_on');
  });
});
