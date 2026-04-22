import type { BlockDefinition } from './BlockRegistry';

export type BlockBounds = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

const FULL_BLOCK_BOUNDS: BlockBounds = {
  minX: 0,
  minY: 0,
  minZ: 0,
  maxX: 1,
  maxY: 1,
  maxZ: 1,
};

const SPECIAL_RENDER_BOUNDS: Record<string, BlockBounds> = {
  sapling: { minX: 0.38, minY: 0, minZ: 0.38, maxX: 0.62, maxY: 0.75, maxZ: 0.62 },
  tall_grass: { minX: 0.3, minY: 0, minZ: 0.3, maxX: 0.7, maxY: 0.78, maxZ: 0.7 },
  flower_yellow: { minX: 0.34, minY: 0, minZ: 0.34, maxX: 0.66, maxY: 0.8, maxZ: 0.66 },
  flower_red: { minX: 0.34, minY: 0, minZ: 0.34, maxX: 0.66, maxY: 0.8, maxZ: 0.66 },
  redstone_dust: { minX: 0.05, minY: 0, minZ: 0.05, maxX: 0.95, maxY: 0.06, maxZ: 0.95 },
  redstone_torch: { minX: 0.4, minY: 0, minZ: 0.4, maxX: 0.6, maxY: 0.8, maxZ: 0.6 },
  lever: { minX: 0.32, minY: 0, minZ: 0.32, maxX: 0.68, maxY: 0.22, maxZ: 0.68 },
  button: { minX: 0.28, minY: 0, minZ: 0.28, maxX: 0.72, maxY: 0.14, maxZ: 0.72 },
  repeater: { minX: 0.08, minY: 0, minZ: 0.18, maxX: 0.92, maxY: 0.12, maxZ: 0.82 },
  ladder: { minX: 0.08, minY: 0, minZ: 0.44, maxX: 0.92, maxY: 1, maxZ: 0.56 },
  bed: { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 0.56, maxZ: 1 },
};

export function getBlockRenderBounds(def: BlockDefinition): BlockBounds {
  const special = SPECIAL_RENDER_BOUNDS[def.key];
  if (special) return special;

  if (def.collision) {
    const [minX, minY, minZ, maxX, maxY, maxZ] = def.collision;
    return { minX, minY, minZ, maxX, maxY, maxZ };
  }

  return FULL_BLOCK_BOUNDS;
}
