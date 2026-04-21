import { PerlinNoise } from '../utils/PerlinNoise';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk';
import {
  BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_BEDROCK,
  BLOCK_GRAVEL, BLOCK_COAL_ORE, BLOCK_IRON_ORE,
  BLOCK_GOLD_ORE, BLOCK_DIAMOND_ORE, BLOCK_REDSTONE_ORE,
  BLOCK_WOOD, BLOCK_LEAVES
} from '../blocks/BlockRegistry';

export type BiomeType = 'plains' | 'forest' | 'mountain';

export class WorldGenerator {
  private noise: PerlinNoise;
  private oreNoise: PerlinNoise;
  private treeNoise: PerlinNoise;
  private biomeNoise: PerlinNoise;

  constructor(seed = 12345) {
    this.noise = new PerlinNoise(seed);
    this.oreNoise = new PerlinNoise(seed + 1);
    this.treeNoise = new PerlinNoise(seed + 2);
    this.biomeNoise = new PerlinNoise(seed + 3);
  }

  private getBiome(wx: number, wz: number): BiomeType {
    const val = this.biomeNoise.fbm2D(wx * 0.002, wz * 0.002, 2, 0.5, 2);
    if (val < -0.2) return 'mountain';
    if (val > 0.2) return 'plains';
    return 'forest';
  }

  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const worldX = cx * CHUNK_SIZE;
    const worldZ = cz * CHUNK_SIZE;

    // Base terrain
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = worldX + x;
        const wz = worldZ + z;
        const biome = this.getBiome(wx, wz);

        const heightNoise = this.noise.fbm2D(wx * 0.01, wz * 0.01, 4, 0.5, 2);
        let height: number;
        if (biome === 'mountain') {
          height = Math.floor(12 + heightNoise * 18);
        } else if (biome === 'plains') {
          height = Math.floor(6 + heightNoise * 3);
        } else {
          height = Math.floor(8 + heightNoise * 6);
        }
        height = Math.max(1, Math.min(CHUNK_HEIGHT - 1, height));

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            chunk.setBlock(x, y, z, BLOCK_BEDROCK);
          } else if (y === height) {
            chunk.setBlock(x, y, z, BLOCK_GRASS);
          } else if (y >= height - 3 && y < height) {
            chunk.setBlock(x, y, z, BLOCK_DIRT);
          } else if (y < height - 3) {
            // Stone with ore veins
            const oreVal = this.oreNoise.noise3D(wx * 0.1, y * 0.1, wz * 0.1);
            const block = this.pickOre(y, oreVal);
            chunk.setBlock(x, y, z, block);
          }
        }
      }
    }

    // Trees
    for (let x = 2; x < CHUNK_SIZE - 2; x++) {
      for (let z = 2; z < CHUNK_SIZE - 2; z++) {
        const wx = worldX + x;
        const wz = worldZ + z;
        const biome = this.getBiome(wx, wz);
        const heightNoise = this.noise.fbm2D(wx * 0.01, wz * 0.01, 4, 0.5, 2);
        let height: number;
        if (biome === 'mountain') {
          height = Math.floor(12 + heightNoise * 18);
        } else if (biome === 'plains') {
          height = Math.floor(6 + heightNoise * 3);
        } else {
          height = Math.floor(8 + heightNoise * 6);
        }
        height = Math.max(1, Math.min(CHUNK_HEIGHT - 1, height));

        // Tree chance varies by biome
        const treeVal = this.treeNoise.noise2D(wx * 0.05, wz * 0.05);
        let treeThreshold = 0.6;
        if (biome === 'forest') treeThreshold = 0.35;
        if (biome === 'plains') treeThreshold = 0.85;
        if (biome === 'mountain') treeThreshold = 0.75;

        if (treeVal > treeThreshold && height < CHUNK_HEIGHT - 6) {
          this.placeTree(chunk, x, height + 1, z);
        }
      }
    }

    return chunk;
  }

  private pickOre(y: number, noiseVal: number): number {
    // Ores appear at different depths with different frequencies
    if (y <= 3 && noiseVal > 0.75) return BLOCK_DIAMOND_ORE;
    if (y <= 5 && noiseVal > 0.7) return BLOCK_REDSTONE_ORE;
    if (y <= 6 && noiseVal > 0.65) return BLOCK_GOLD_ORE;
    if (y <= 8 && noiseVal > 0.6) return BLOCK_IRON_ORE;
    if (y <= 10 && noiseVal > 0.5) return BLOCK_COAL_ORE;
    if (y <= 12 && noiseVal > 0.85) return BLOCK_GRAVEL;
    return BLOCK_STONE;
  }

  private placeTree(chunk: Chunk, x: number, y: number, z: number) {
    // Trunk - deterministic height based on position
    const trunkHeight = 3 + Math.floor(Math.abs(this.treeNoise.noise3D(x * 0.3, y * 0.3, z * 0.3)) * 2);
    for (let i = 0; i < trunkHeight; i++) {
      if (y + i < CHUNK_HEIGHT) {
        chunk.setBlock(x, y + i, z, BLOCK_WOOD);
      }
    }

    // Leaves
    const leafStart = y + trunkHeight - 2;
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        for (let ly = 0; ly < 3; ly++) {
          const dist = Math.abs(lx) + Math.abs(lz) + Math.abs(ly - 1);
          if (dist <= 3) {
            const bx = x + lx;
            const by = leafStart + ly;
            const bz = z + lz;
            if (bx >= 0 && bx < CHUNK_SIZE && by >= 0 && by < CHUNK_HEIGHT && bz >= 0 && bz < CHUNK_SIZE) {
              if (chunk.getBlock(bx, by, bz) === 0) {
                chunk.setBlock(bx, by, bz, BLOCK_LEAVES);
              }
            }
          }
        }
      }
    }
  }
}
