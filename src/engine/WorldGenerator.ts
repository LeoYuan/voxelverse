import { PerlinNoise } from '../utils/PerlinNoise';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk';
import {
  BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_BEDROCK,
  BLOCK_GRAVEL, BLOCK_COAL_ORE, BLOCK_IRON_ORE,
  BLOCK_GOLD_ORE, BLOCK_DIAMOND_ORE, BLOCK_REDSTONE_ORE,
  BLOCK_WOOD, BLOCK_LEAVES, BLOCK_TALL_GRASS,
  BLOCK_FLOWER_YELLOW, BLOCK_FLOWER_RED
} from '../blocks/BlockRegistry';

export type BiomeType = 'plains' | 'forest' | 'mountain';

export class WorldGenerator {
  private noise: PerlinNoise;
  private oreNoise: PerlinNoise;
  private treeNoise: PerlinNoise;
  private biomeNoise: PerlinNoise;
  private detailNoise: PerlinNoise;

  constructor(seed = 12345) {
    this.noise = new PerlinNoise(seed);
    this.oreNoise = new PerlinNoise(seed + 1);
    this.treeNoise = new PerlinNoise(seed + 2);
    this.biomeNoise = new PerlinNoise(seed + 3);
    this.detailNoise = new PerlinNoise(seed + 4);
  }

  private getBiome(wx: number, wz: number): BiomeType {
    const val = this.biomeNoise.fbm2D(wx * 0.002, wz * 0.002, 2, 0.5, 2);
    if (val < -0.2) return 'mountain';
    if (val > 0.2) return 'plains';
    return 'forest';
  }

  private getTerrainHeight(wx: number, wz: number, biome: BiomeType): number {
    // Multi-octave terrain for more natural rolling hills
    const baseNoise = this.noise.fbm2D(wx * 0.008, wz * 0.008, 6, 0.5, 2);
    const detailNoise = this.detailNoise.fbm2D(wx * 0.03, wz * 0.03, 3, 0.4, 2);

    let height: number;
    if (biome === 'mountain') {
      height = Math.floor(14 + baseNoise * 22 + detailNoise * 4);
    } else if (biome === 'plains') {
      height = Math.floor(7 + baseNoise * 4 + detailNoise * 1.5);
    } else {
      // Forest - gentle rolling hills
      height = Math.floor(9 + baseNoise * 7 + detailNoise * 2);
    }
    return Math.max(2, Math.min(CHUNK_HEIGHT - 5, height));
  }

  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const worldX = cx * CHUNK_SIZE;
    const worldZ = cz * CHUNK_SIZE;

    // First pass: base terrain
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = worldX + x;
        const wz = worldZ + z;
        const biome = this.getBiome(wx, wz);
        const height = this.getTerrainHeight(wx, wz, biome);

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            chunk.setBlock(x, y, z, BLOCK_BEDROCK);
          } else if (y === height) {
            // Surface block varies by biome
            if (biome === 'mountain' && height > 20) {
              chunk.setBlock(x, y, z, BLOCK_STONE);
            } else {
              chunk.setBlock(x, y, z, BLOCK_GRASS);
            }
          } else if (y >= height - 3 && y < height) {
            // Dirt layer, but mountains have stone deeper
            if (biome === 'mountain' && height > 18 && y > height - 2) {
              chunk.setBlock(x, y, z, BLOCK_STONE);
            } else {
              chunk.setBlock(x, y, z, BLOCK_DIRT);
            }
          } else if (y < height - 3) {
            // Stone with ore veins
            const oreVal = this.oreNoise.noise3D(wx * 0.1, y * 0.1, wz * 0.1);
            const block = this.pickOre(y, oreVal);
            chunk.setBlock(x, y, z, block);
          }
        }
      }
    }

    // Second pass: trees, flowers, grass
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const wx = worldX + x;
        const wz = worldZ + z;
        const biome = this.getBiome(wx, wz);
        const height = this.getTerrainHeight(wx, wz, biome);

        if (height >= CHUNK_HEIGHT - 4) continue;

        // Only place vegetation on grass
        if (chunk.getBlock(x, height, z) !== BLOCK_GRASS) continue;

        // Tree chance varies by biome
        const treeVal = this.treeNoise.noise2D(wx * 0.05, wz * 0.05);
        let treeThreshold = 0.6;
        if (biome === 'forest') treeThreshold = 0.3;
        if (biome === 'plains') treeThreshold = 0.88;
        if (biome === 'mountain') treeThreshold = 0.82;

        if (treeVal > treeThreshold) {
          this.placeTree(chunk, x, height + 1, z);
        } else {
          // Flowers and tall grass on empty spots
          const detailVal = this.detailNoise.noise2D(wx * 0.1, wz * 0.1);
          const flowerVal = this.detailNoise.noise2D(wx * 0.3 + 100, wz * 0.3 + 100);

          if (biome === 'plains' && detailVal > 0.3) {
            // Plains have more flowers
            if (flowerVal > 0.6) {
              chunk.setBlock(x, height + 1, z, BLOCK_FLOWER_YELLOW);
            } else if (flowerVal > 0.3) {
              chunk.setBlock(x, height + 1, z, BLOCK_FLOWER_RED);
            } else {
              chunk.setBlock(x, height + 1, z, BLOCK_TALL_GRASS);
            }
          } else if (biome === 'forest' && detailVal > 0.5) {
            // Forest has occasional flowers and grass
            if (flowerVal > 0.7) {
              chunk.setBlock(x, height + 1, z, BLOCK_FLOWER_RED);
            } else {
              chunk.setBlock(x, height + 1, z, BLOCK_TALL_GRASS);
            }
          } else if (biome === 'mountain' && detailVal > 0.7) {
            // Mountains have sparse grass
            if (flowerVal > 0.5) {
              chunk.setBlock(x, height + 1, z, BLOCK_TALL_GRASS);
            }
          }
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
    // Deterministic height based on position
    const trunkHeight = 4 + Math.floor(Math.abs(this.treeNoise.noise3D(x * 0.3, y * 0.3, z * 0.3)) * 3);

    // Trunk
    for (let i = 0; i < trunkHeight; i++) {
      if (y + i < CHUNK_HEIGHT) {
        chunk.setBlock(x, y + i, z, BLOCK_WOOD);
      }
    }

    // Leaves - more natural shape
    const leafStart = y + trunkHeight - 3;
    const leafTop = y + trunkHeight;

    for (let ly = leafStart; ly <= leafTop + 1; ly++) {
      const layer = ly - leafStart;
      let radius = 2;
      if (layer === 0) radius = 2;
      else if (layer === 1) radius = 2;
      else if (layer === 2) radius = 1;
      else radius = 0;

      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          // Skip corners for rounder look
          if (Math.abs(lx) === radius && Math.abs(lz) === radius && radius > 0) continue;

          const bx = x + lx;
          const by = ly;
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
