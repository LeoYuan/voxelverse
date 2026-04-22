import { describe, it, expect } from 'vitest';
import { WorldGenerator } from '../engine/WorldGenerator';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../engine/Chunk';
import {
  BLOCK_AIR, BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_BEDROCK,
  BLOCK_GRAVEL, BLOCK_COAL_ORE, BLOCK_IRON_ORE, BLOCK_GOLD_ORE,
  BLOCK_DIAMOND_ORE, BLOCK_REDSTONE_ORE, BLOCK_WOOD, BLOCK_LEAVES,
  BLOCK_TALL_GRASS, BLOCK_FLOWER_YELLOW, BLOCK_FLOWER_RED
} from '../blocks/BlockRegistry';

describe('WorldGenerator', () => {
  it('should generate a chunk with non-air blocks', () => {
    const gen = new WorldGenerator(42);
    const chunk = gen.generateChunk(0, 0);

    let hasSolid = false;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          const id = chunk.getBlock(x, y, z);
          if (id !== BLOCK_AIR) {
            hasSolid = true;
            expect([
              BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_BEDROCK,
              BLOCK_GRAVEL, BLOCK_COAL_ORE, BLOCK_IRON_ORE, BLOCK_GOLD_ORE,
              BLOCK_DIAMOND_ORE, BLOCK_REDSTONE_ORE, BLOCK_WOOD, BLOCK_LEAVES,
              BLOCK_TALL_GRASS, BLOCK_FLOWER_YELLOW, BLOCK_FLOWER_RED
            ]).toContain(id);
          }
        }
      }
    }
    expect(hasSolid).toBe(true);
  });

  it('should generate consistent terrain for same seed', () => {
    const gen1 = new WorldGenerator(42);
    const gen2 = new WorldGenerator(42);
    const chunk1 = gen1.generateChunk(5, 3);
    const chunk2 = gen2.generateChunk(5, 3);

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          expect(chunk1.getBlock(x, y, z)).toBe(chunk2.getBlock(x, y, z));
        }
      }
    }
  });

  it('should generate different terrain for different seeds', () => {
    const gen1 = new WorldGenerator(42);
    const gen2 = new WorldGenerator(99);
    const chunk1 = gen1.generateChunk(0, 0);
    const chunk2 = gen2.generateChunk(0, 0);

    let same = 0;
    let total = 0;
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          if (chunk1.getBlock(x, y, z) === chunk2.getBlock(x, y, z)) {
            same++;
          }
          total++;
        }
      }
    }
    // Should be significantly different
    expect(same / total).toBeLessThan(0.9);
  });
});
