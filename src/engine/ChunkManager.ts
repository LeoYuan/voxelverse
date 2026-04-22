import { WorldGenerator } from './WorldGenerator';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk';

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private generator: WorldGenerator;
  /** Tracks coordinates of blocks placed by the player (not world-generated) */
  private playerPlaced = new Set<string>();

  constructor(seed = 12345) {
    this.generator = new WorldGenerator(seed);
  }

  markPlayerPlaced(wx: number, wy: number, wz: number) {
    this.playerPlaced.add(`${wx},${wy},${wz}`);
  }

  isPlayerPlaced(wx: number, wy: number, wz: number): boolean {
    return this.playerPlaced.has(`${wx},${wy},${wz}`);
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(this.key(cx, cz));
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const k = this.key(cx, cz);
    let chunk = this.chunks.get(k);
    if (!chunk) {
      chunk = this.generator.generateChunk(cx, cz);
      this.chunks.set(k, chunk);
    }
    return chunk;
  }

  getBlock(wx: number, wy: number, wz: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return 0;
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx: number, wy: number, wz: number, id: number) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.ensureChunk(cx, cz);
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    chunk.setBlock(lx, wy, lz, id);
    if (id === 0) {
      this.playerPlaced.delete(`${wx},${wy},${wz}`);
    }
  }

  isSolid(wx: number, wy: number, wz: number): boolean {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return false;
    const lx = wx - cx * CHUNK_SIZE;
    const lz = wz - cz * CHUNK_SIZE;
    return chunk.isSolid(lx, wy, lz);
  }

  /** Load chunks around player, unload distant ones */
  updatePlayerPosition(px: number, pz: number, renderDistance: number) {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const dist = renderDistance;

    // Ensure chunks exist
    for (let dx = -dist; dx <= dist; dx++) {
      for (let dz = -dist; dz <= dist; dz++) {
        this.ensureChunk(pcx + dx, pcz + dz);
      }
    }

    // Unload distant chunks
    for (const [k, chunk] of this.chunks) {
      const dx = Math.abs(chunk.cx - pcx);
      const dz = Math.abs(chunk.cz - pcz);
      if (dx > dist + 2 || dz > dist + 2) {
        this.chunks.delete(k);
      }
    }
  }

  getAllChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  /** Calculate light level at world position (0-15). Simplified: only sky light. */
  getLightLevel(wx: number, wy: number, wz: number, isDay: boolean): number {
    let light = isDay ? 15 : 0;
    for (let y = CHUNK_HEIGHT - 1; y > wy; y--) {
      if (this.isSolid(wx, y, wz)) {
        light = Math.max(0, light - 1);
        if (light === 0) break;
      }
    }
    return light;
  }
}
