import { BLOCK_AIR, BlockRegistry } from '../blocks/BlockRegistry';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 16;

export class Chunk {
  cx: number;
  cz: number;
  // Flat array: index = (y * CHUNK_SIZE + z) * CHUNK_SIZE + x
  blocks: Uint16Array;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint16Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.blocks.fill(BLOCK_AIR);
  }

  getBlock(x: number, y: number, z: number): number {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return BLOCK_AIR;
    }
    return this.blocks[(y * CHUNK_SIZE + z) * CHUNK_SIZE + x];
  }

  setBlock(x: number, y: number, z: number, id: number) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return;
    }
    this.blocks[(y * CHUNK_SIZE + z) * CHUNK_SIZE + x] = id;
  }

  /** Check if block at local coords is solid (for collision) */
  isSolid(x: number, y: number, z: number): boolean {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return false;
    }
    const id = this.blocks[(y * CHUNK_SIZE + z) * CHUNK_SIZE + x];
    if (id === BLOCK_AIR) return false;
    const def = BlockRegistry.getById(id);
    return def.solid;
  }

  /** Check if block is opaque (for face culling) */
  isOpaque(x: number, y: number, z: number): boolean {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return false;
    }
    const id = this.blocks[(y * CHUNK_SIZE + z) * CHUNK_SIZE + x];
    if (id === BLOCK_AIR) return false;
    const def = BlockRegistry.getById(id);
    return def.solid && !def.transparent;
  }
}
