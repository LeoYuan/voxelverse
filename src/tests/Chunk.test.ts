import { describe, it, expect } from 'vitest';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from '../engine/Chunk';
import { BLOCK_AIR, BLOCK_STONE, BLOCK_GRASS } from '../blocks/BlockRegistry';

describe('Chunk', () => {
  it('should initialize with all air blocks', () => {
    const chunk = new Chunk(0, 0);
    expect(chunk.blocks.length).toBe(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    expect(chunk.getBlock(0, 0, 0)).toBe(BLOCK_AIR);
    expect(chunk.getBlock(15, 15, 15)).toBe(BLOCK_AIR);
  });

  it('should set and get blocks correctly', () => {
    const chunk = new Chunk(0, 0);
    chunk.setBlock(5, 5, 5, BLOCK_STONE);
    expect(chunk.getBlock(5, 5, 5)).toBe(BLOCK_STONE);
  });

  it('should return air for out of bounds', () => {
    const chunk = new Chunk(0, 0);
    expect(chunk.getBlock(-1, 0, 0)).toBe(BLOCK_AIR);
    expect(chunk.getBlock(0, 20, 0)).toBe(BLOCK_AIR);
    expect(chunk.getBlock(16, 0, 0)).toBe(BLOCK_AIR);
  });

  it('should silently ignore out of bounds setBlock', () => {
    const chunk = new Chunk(0, 0);
    chunk.setBlock(-1, 0, 0, BLOCK_STONE);
    // Should not throw
  });

  it('isSolid should return true for non-air', () => {
    const chunk = new Chunk(0, 0);
    chunk.setBlock(0, 0, 0, BLOCK_GRASS);
    expect(chunk.isSolid(0, 0, 0)).toBe(true);
  });

  it('isSolid should return false for air and out of bounds', () => {
    const chunk = new Chunk(0, 0);
    expect(chunk.isSolid(0, 0, 0)).toBe(false);
    expect(chunk.isSolid(-1, 0, 0)).toBe(false);
  });

  it('isOpaque should return false for air and out of bounds', () => {
    const chunk = new Chunk(0, 0);
    expect(chunk.isOpaque(0, 0, 0)).toBe(false);
    expect(chunk.isOpaque(-1, 0, 0)).toBe(false);
  });

  it('isOpaque should return true for solid non-transparent blocks', () => {
    const chunk = new Chunk(0, 0);
    chunk.setBlock(0, 0, 0, BLOCK_STONE);
    expect(chunk.isOpaque(0, 0, 0)).toBe(true);
  });

  it('isOpaque should return false for transparent solid blocks', () => {
    const chunk = new Chunk(0, 0);
    chunk.setBlock(0, 0, 0, 5); // glass
    expect(chunk.isOpaque(0, 0, 0)).toBe(false);
  });
});
