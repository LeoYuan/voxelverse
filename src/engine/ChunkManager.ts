import { WorldGenerator } from './WorldGenerator';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk';
import { BlockRegistry } from '../blocks/BlockRegistry';

export interface ChunkLoadDelta {
  loaded: Chunk[];
  unloaded: Array<{ cx: number; cz: number }>;
}

export interface WorldMutation {
  x: number;
  y: number;
  z: number;
  blockId: number;
  revision: number;
}

const MAX_WORLD_MUTATIONS = 20_000;

export interface BlockDeltaEntry {
  x: number;
  y: number;
  z: number;
  blockId: number;
}

export interface BlockDeltaSnapshot {
  placed: BlockDeltaEntry[];
  removed: Array<{ x: number; y: number; z: number }>;
}

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private generator: WorldGenerator;
  private lastPlayerChunk: { cx: number; cz: number; renderDistance: number } | null = null;
  private mutations = new Map<string, WorldMutation>();
  private mutationKeysByChunk = new Map<string, Set<string>>();
  private placementRevision = 0;
  /** Tracks coordinates of blocks placed by the player (not world-generated) */
  private playerPlaced = new Set<string>();
  /** Tracks coordinates of generated blocks removed directly by the player. */
  private playerRemoved = new Set<string>();

  constructor(seed = 12345) {
    this.generator = new WorldGenerator(seed);
  }

  markPlayerPlaced(wx: number, wy: number, wz: number) {
    this.playerPlaced.add(`${wx},${wy},${wz}`);
    this.playerRemoved.delete(`${wx},${wy},${wz}`);
  }

  isPlayerPlaced(wx: number, wy: number, wz: number): boolean {
    return this.playerPlaced.has(`${wx},${wy},${wz}`);
  }

  markPlayerRemoved(wx: number, wy: number, wz: number) {
    this.playerRemoved.add(`${wx},${wy},${wz}`);
    this.playerPlaced.delete(`${wx},${wy},${wz}`);
  }

  isPlayerRemoved(wx: number, wy: number, wz: number): boolean {
    return this.playerRemoved.has(`${wx},${wy},${wz}`);
  }

  private key(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  private parseBlockKey(key: string): { x: number; y: number; z: number } {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  }

  private blockKey(wx: number, wy: number, wz: number): string {
    return `${wx},${wy},${wz}`;
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
      this.applyMutationsToChunk(chunk);
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
  }

  setPlayerBlock(wx: number, wy: number, wz: number, id: number) {
    this.setBlock(wx, wy, wz, id);

    const key = this.blockKey(wx, wy, wz);
    this.placementRevision++;
    const mutation: WorldMutation = {
      x: wx,
      y: wy,
      z: wz,
      blockId: id,
      revision: this.placementRevision,
    };
    this.indexMutation(key, mutation);

    if (id === 0) {
      this.playerPlaced.delete(key);
      this.playerRemoved.add(key);
    } else {
      this.playerPlaced.add(key);
      this.playerRemoved.delete(key);
    }
  }

  getBlockDeltas(): BlockDeltaSnapshot {
    const placed: BlockDeltaEntry[] = [];
    for (const key of this.playerPlaced) {
      const pos = this.parseBlockKey(key);
      placed.push({ ...pos, blockId: this.getBlock(pos.x, pos.y, pos.z) });
    }

    const removed = Array.from(this.playerRemoved, (key) => this.parseBlockKey(key));
    return { placed, removed };
  }

  applyBlockDeltas(snapshot: BlockDeltaSnapshot) {
    const records: WorldMutation[] = [];
    for (const removed of snapshot.removed) {
      records.push({ ...removed, blockId: 0, revision: records.length + 1 });
    }
    for (const placed of snapshot.placed) {
      records.push({ ...placed, revision: records.length + 1 });
    }
    this.importMutations(records);
  }

  rebuildLoadedChunks(rebuild: (chunk: Chunk) => void) {
    for (const chunk of this.chunks.values()) {
      rebuild(chunk);
    }
  }

  exportMutations(): WorldMutation[] {
    return Array.from(this.mutations.values())
      .sort((a, b) => a.revision - b.revision)
      .map(mutation => ({ ...mutation }));
  }

  importMutations(records: WorldMutation[]): Array<{ cx: number; cz: number }> {
    if (records.length > MAX_WORLD_MUTATIONS) {
      throw new Error('Too many world mutations');
    }

    const knownBlockIds = new Set(BlockRegistry.getAll().map(block => block.id));
    const validated = records.map(record => {
      const valid =
        Number.isInteger(record.x) &&
        Number.isInteger(record.y) &&
        Number.isInteger(record.z) &&
        record.y >= 0 &&
        record.y < CHUNK_HEIGHT &&
        Number.isInteger(record.blockId) &&
        knownBlockIds.has(record.blockId) &&
        Number.isInteger(record.revision) &&
        record.revision > 0;
      if (!valid) throw new Error('Invalid world mutation');
      return { ...record };
    });

    this.mutations.clear();
    this.mutationKeysByChunk.clear();
    this.playerPlaced.clear();
    this.playerRemoved.clear();
    this.placementRevision = 0;

    const affected = new Map<string, { cx: number; cz: number }>();
    for (const mutation of validated) {
      const key = this.blockKey(mutation.x, mutation.y, mutation.z);
      this.indexMutation(key, mutation);
      this.placementRevision = Math.max(this.placementRevision, mutation.revision);
      if (mutation.blockId === 0) {
        this.playerRemoved.add(key);
      } else {
        this.playerPlaced.add(key);
      }

      const cx = Math.floor(mutation.x / CHUNK_SIZE);
      const cz = Math.floor(mutation.z / CHUNK_SIZE);
      affected.set(this.key(cx, cz), { cx, cz });
      const chunk = this.getChunk(cx, cz);
      if (chunk) this.applyMutationToChunk(chunk, mutation);
    }

    return Array.from(affected.values());
  }

  getPlacementRevision(): number {
    return this.placementRevision;
  }

  countPlayerPlacementsSince(
    revision: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    radius: number,
  ): number {
    let count = 0;
    for (const mutation of this.mutations.values()) {
      if (mutation.blockId === 0 || mutation.revision <= revision) continue;
      if (
        Math.abs(mutation.x - centerX) <= radius &&
        Math.abs(mutation.y - centerY) <= radius &&
        Math.abs(mutation.z - centerZ) <= radius
      ) {
        count++;
      }
    }
    return count;
  }

  countPlacedBlockIds(
    centerX: number,
    centerY: number,
    centerZ: number,
    radius: number,
  ): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const mutation of this.mutations.values()) {
      if (mutation.blockId === 0) continue;
      if (
        Math.abs(mutation.x - centerX) <= radius &&
        Math.abs(mutation.y - centerY) <= radius &&
        Math.abs(mutation.z - centerZ) <= radius
      ) {
        counts[mutation.blockId] = (counts[mutation.blockId] ?? 0) + 1;
      }
    }
    return counts;
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
  updatePlayerPosition(
    px: number,
    pz: number,
    renderDistance: number,
    maxLoads = Number.POSITIVE_INFINITY,
  ): ChunkLoadDelta {
    const pcx = Math.floor(px / CHUNK_SIZE);
    const pcz = Math.floor(pz / CHUNK_SIZE);
    const dist = renderDistance;
    const previous = this.lastPlayerChunk;
    const sameTarget =
      previous &&
      previous.cx === pcx &&
      previous.cz === pcz &&
      previous.renderDistance === dist;
    const missing: Array<{ cx: number; cz: number; distance: number }> = [];
    for (let dx = -dist; dx <= dist; dx++) {
      for (let dz = -dist; dz <= dist; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        if (!this.getChunk(cx, cz)) {
          missing.push({
            cx,
            cz,
            distance: dx * dx + dz * dz,
          });
        }
      }
    }
    if (sameTarget && missing.length === 0) {
      return { loaded: [], unloaded: [] };
    }
    this.lastPlayerChunk = { cx: pcx, cz: pcz, renderDistance: dist };

    const loaded: Chunk[] = [];
    const unloaded: Array<{ cx: number; cz: number }> = [];

    // Generate nearby chunks first and cap work for smooth streaming.
    missing.sort((a, b) =>
      a.distance - b.distance ||
      a.cx - b.cx ||
      a.cz - b.cz,
    );
    const loadLimit = Number.isFinite(maxLoads)
      ? Math.max(0, Math.floor(maxLoads))
      : missing.length;
    for (const { cx, cz } of missing.slice(0, loadLimit)) {
      loaded.push(this.ensureChunk(cx, cz));
    }

    // Unload distant chunks
    for (const [k, chunk] of this.chunks) {
      const dx = Math.abs(chunk.cx - pcx);
      const dz = Math.abs(chunk.cz - pcz);
      if (dx > dist || dz > dist) {
        this.chunks.delete(k);
        unloaded.push({ cx: chunk.cx, cz: chunk.cz });
      }
    }

    return { loaded, unloaded };
  }

  getAllChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  private indexMutation(key: string, mutation: WorldMutation) {
    const previous = this.mutations.get(key);
    if (previous) {
      const previousChunkKey = this.key(
        Math.floor(previous.x / CHUNK_SIZE),
        Math.floor(previous.z / CHUNK_SIZE),
      );
      this.mutationKeysByChunk.get(previousChunkKey)?.delete(key);
    }

    this.mutations.set(key, mutation);
    const chunkKey = this.key(
      Math.floor(mutation.x / CHUNK_SIZE),
      Math.floor(mutation.z / CHUNK_SIZE),
    );
    const keys = this.mutationKeysByChunk.get(chunkKey) ?? new Set<string>();
    keys.add(key);
    this.mutationKeysByChunk.set(chunkKey, keys);
  }

  private applyMutationsToChunk(chunk: Chunk) {
    const keys = this.mutationKeysByChunk.get(this.key(chunk.cx, chunk.cz));
    if (!keys) return;
    for (const key of keys) {
      const mutation = this.mutations.get(key);
      if (mutation) this.applyMutationToChunk(chunk, mutation);
    }
  }

  private applyMutationToChunk(chunk: Chunk, mutation: WorldMutation) {
    const lx = mutation.x - chunk.cx * CHUNK_SIZE;
    const lz = mutation.z - chunk.cz * CHUNK_SIZE;
    chunk.setBlock(lx, mutation.y, lz, mutation.blockId);
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
