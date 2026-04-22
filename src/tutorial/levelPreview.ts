import type { TargetBlock } from './BuildingLevels';

export interface RenderedPreviewBlock {
  left: number;
  top: number;
  color: string;
  zIndex: number;
}

export interface LevelPreviewLayout {
  width: number;
  height: number;
  blocks: RenderedPreviewBlock[];
}

const TILE_WIDTH = 18;
const TILE_HEIGHT = 10;
const BLOCK_HEIGHT = 16;
const BLOCK_SIZE = 14;
const PADDING = 8;

function project(block: TargetBlock) {
  return {
    x: (block.x - block.z) * TILE_WIDTH,
    y: (block.x + block.z) * TILE_HEIGHT - block.y * BLOCK_HEIGHT,
    depth: block.x + block.y + block.z,
  };
}

export function getLevelPreviewLayout(targetBlocks: TargetBlock[]): LevelPreviewLayout {
  if (targetBlocks.length === 0) {
    return { width: 0, height: 0, blocks: [] };
  }

  const projected = targetBlocks.map((block) => ({
    block,
    ...project(block),
  }));

  const minX = Math.min(...projected.map((item) => item.x));
  const maxX = Math.max(...projected.map((item) => item.x));
  const minY = Math.min(...projected.map((item) => item.y));
  const maxY = Math.max(...projected.map((item) => item.y));

  const blocks = projected
    .sort((a, b) => a.depth - b.depth || a.y - b.y || a.x - b.x)
    .map((item, index) => ({
      left: item.x - minX + PADDING,
      top: item.y - minY + PADDING,
      color: `#${item.block.color.toString(16).padStart(6, '0')}`,
      zIndex: index + 1,
    }));

  return {
    width: maxX - minX + BLOCK_SIZE + PADDING * 2,
    height: maxY - minY + BLOCK_HEIGHT + PADDING * 2,
    blocks,
  };
}
