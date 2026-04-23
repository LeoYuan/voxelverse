import type { TargetBlock } from './BuildingLevels';

export interface RenderedPreviewPolygon {
  points: string;
  fill: string;
  stroke: string;
  zIndex: number;
}

export interface LevelPreviewLayout {
  width: number;
  height: number;
  topFaces: RenderedPreviewPolygon[];
  leftFaces: RenderedPreviewPolygon[];
  rightFaces: RenderedPreviewPolygon[];
  ground: RenderedPreviewPolygon[];
}

const TILE_HALF_WIDTH = 14;
const TILE_HALF_HEIGHT = 8;
const BLOCK_HEIGHT = 16;
const PADDING = 10;

function getRoleShading(role: TargetBlock['role']) {
  switch (role) {
    case 'floor':
      return { top: 18, left: -12, right: -28, stroke: 42 };
    case 'wall':
      return { top: 28, left: -6, right: -22, stroke: 60 };
    case 'roof':
      return { top: 16, left: -20, right: -36, stroke: 38 };
    case 'support':
      return { top: 20, left: -16, right: -32, stroke: 48 };
    case 'bridge':
    case 'path':
      return { top: 22, left: -14, right: -30, stroke: 46 };
    case 'water':
      return { top: 26, left: -10, right: -20, stroke: 52 };
    case 'void':
      return { top: -18, left: -24, right: -30, stroke: 20 };
    default:
      return { top: 24, left: -18, right: -36, stroke: 52 };
  }
}

function shade(hex: number, delta: number): string {
  const r = Math.max(0, Math.min(255, ((hex >> 16) & 0xff) + delta));
  const g = Math.max(0, Math.min(255, ((hex >> 8) & 0xff) + delta));
  const b = Math.max(0, Math.min(255, (hex & 0xff) + delta));
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function point(x: number, y: number) {
  return `${x},${y}`;
}

function project(x: number, y: number, z: number) {
  return {
    x: (x - z) * TILE_HALF_WIDTH,
    y: (x + z) * TILE_HALF_HEIGHT - y * BLOCK_HEIGHT,
  };
}

function getCubePolygons(block: TargetBlock) {
  const top = project(block.x, block.y, block.z);

  const topFace = [
    point(top.x, top.y),
    point(top.x + TILE_HALF_WIDTH, top.y + TILE_HALF_HEIGHT),
    point(top.x, top.y + TILE_HALF_HEIGHT * 2),
    point(top.x - TILE_HALF_WIDTH, top.y + TILE_HALF_HEIGHT),
  ];

  const leftFace = [
    point(top.x - TILE_HALF_WIDTH, top.y + TILE_HALF_HEIGHT),
    point(top.x, top.y + TILE_HALF_HEIGHT * 2),
    point(top.x, top.y + TILE_HALF_HEIGHT * 2 + BLOCK_HEIGHT),
    point(top.x - TILE_HALF_WIDTH, top.y + TILE_HALF_HEIGHT + BLOCK_HEIGHT),
  ];

  const rightFace = [
    point(top.x + TILE_HALF_WIDTH, top.y + TILE_HALF_HEIGHT),
    point(top.x, top.y + TILE_HALF_HEIGHT * 2),
    point(top.x, top.y + TILE_HALF_HEIGHT * 2 + BLOCK_HEIGHT),
    point(top.x + TILE_HALF_WIDTH, top.y + TILE_HALF_HEIGHT + BLOCK_HEIGHT),
  ];

  return {
    topFace,
    leftFace,
    rightFace,
    depth: block.x + block.z + block.y * 2,
  };
}

function getBounds(polygons: string[][]) {
  const points = polygons.flatMap((polygon) =>
    polygon.map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    }),
  );
  return {
    minX: Math.min(...points.map((item) => item.x)),
    maxX: Math.max(...points.map((item) => item.x)),
    minY: Math.min(...points.map((item) => item.y)),
    maxY: Math.max(...points.map((item) => item.y)),
  };
}

export function getLevelPreviewLayout(targetBlocks: TargetBlock[]): LevelPreviewLayout {
  if (targetBlocks.length === 0) {
    return { width: 0, height: 0, topFaces: [], leftFaces: [], rightFaces: [], ground: [] };
  }

  const cubes = targetBlocks.map((block) => ({
    block,
    ...getCubePolygons(block),
  }));

  const footprintKeys = new Set(targetBlocks.map((block) => `${block.x},${block.z}`));
  const groundTiles = Array.from(footprintKeys).map((key) => {
    const [x, z] = key.split(',').map(Number);
    const origin = project(x, 0, z);
    return [
      point(origin.x, origin.y + TILE_HALF_HEIGHT * 2 + 2),
      point(origin.x + TILE_HALF_WIDTH, origin.y + TILE_HALF_HEIGHT * 3 + 2),
      point(origin.x, origin.y + TILE_HALF_HEIGHT * 4 + 2),
      point(origin.x - TILE_HALF_WIDTH, origin.y + TILE_HALF_HEIGHT * 3 + 2),
    ];
  });

  const bounds = getBounds([
    ...cubes.flatMap((cube) => [cube.topFace, cube.leftFace, cube.rightFace]),
    ...groundTiles,
  ]);

  const offsetX = PADDING - bounds.minX;
  const offsetY = PADDING - bounds.minY;

  const normalize = (polygon: string[]) =>
    polygon
      .map((pair) => {
        const [x, y] = pair.split(',').map(Number);
        return point(x + offsetX, y + offsetY);
      })
      .join(' ');

  const ground = groundTiles.map((tile, index) => ({
    points: normalize(tile),
    fill: 'rgba(255,255,255,0.06)',
    stroke: 'rgba(255,255,255,0.12)',
    zIndex: index,
  }));

  const ordered = cubes.sort((a, b) => a.depth - b.depth || a.block.y - b.block.y || a.block.x - b.block.x);

  return {
    width: bounds.maxX - bounds.minX + PADDING * 2,
    height: bounds.maxY - bounds.minY + PADDING * 2,
    ground,
    topFaces: ordered.map((cube, index) => ({
      points: normalize(cube.topFace),
      fill: shade(cube.block.color, getRoleShading(cube.block.role).top),
      stroke: shade(cube.block.color, getRoleShading(cube.block.role).stroke),
      zIndex: index * 3 + 2,
    })),
    leftFaces: ordered.map((cube, index) => ({
      points: normalize(cube.leftFace),
      fill: shade(cube.block.color, getRoleShading(cube.block.role).left),
      stroke: shade(cube.block.color, Math.max(getRoleShading(cube.block.role).left + 24, -8)),
      zIndex: index * 3 + 1,
    })),
    rightFaces: ordered.map((cube, index) => ({
      points: normalize(cube.rightFace),
      fill: shade(cube.block.color, getRoleShading(cube.block.role).right),
      stroke: shade(cube.block.color, Math.max(getRoleShading(cube.block.role).right + 24, -12)),
      zIndex: index * 3 + 1,
    })),
  };
}
