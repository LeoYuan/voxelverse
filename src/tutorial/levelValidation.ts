import type { ChunkManager } from '../engine/ChunkManager';
import type { Vec3 } from '../utils/Vec3';
import type { LevelSpec } from './levelSpec';

export interface LevelProgress {
  current: number;
  target: number;
  label: string;
}

export interface LevelEvaluation {
  complete: boolean;
  progress: LevelProgress[];
}

function countPlayerPlacedBlocks(cm: ChunkManager, px: number, py: number, pz: number, radius: number): number {
  let count = 0;
  for (let x = px - radius; x <= px + radius; x++) {
    for (let y = py - radius; y <= py + radius; y++) {
      for (let z = pz - radius; z <= pz + radius; z++) {
        if (cm.isPlayerPlaced(x, y, z)) count++;
      }
    }
  }
  return count;
}

function getBestPillarHeight(cm: ChunkManager, px: number, py: number, pz: number): number {
  let best = 0;
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let y = Math.max(0, py - 5); y <= py + 5; y++) {
        if (!cm.isPlayerPlaced(px + dx, y, pz + dz)) continue;
        let h = 1;
        for (let dy = 1; dy < 10; dy++) {
          if (cm.isPlayerPlaced(px + dx, y + dy, pz + dz)) h++;
          else break;
        }
        best = Math.max(best, h);
      }
    }
  }
  return best;
}

function countBestPlatform(cm: ChunkManager, px: number, py: number, pz: number, size: number): number {
  let best = 0;
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let y = Math.max(0, py - 5); y <= py + 5; y++) {
        let count = 0;
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (cm.isPlayerPlaced(px + dx + i, y, pz + dz + j)) count++;
          }
        }
        best = Math.max(best, count);
      }
    }
  }
  return best;
}

function hasStackedPlatform(cm: ChunkManager, px: number, py: number, pz: number, size: number, layers: number): boolean {
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let completeLayers = 0;
        for (let layer = 0; layer < layers; layer++) {
          let count = 0;
          for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
              if (cm.isPlayerPlaced(px + dx + x, sy + layer, pz + dz + z)) count++;
            }
          }
          if (count >= size * size) completeLayers++;
        }

        if (completeLayers >= layers) {
          return true;
        }
      }
    }
  }
  return false;
}

function countHouseBlocks(cm: ChunkManager, px: number, py: number, pz: number): { floor: number; wall: number } {
  let bestFloor = 0;
  let bestWall = 0;
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let floorCount = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz + j)) floorCount++;
          }
        }
        if (floorCount < 9) continue;

        let wallCount = 0;
        const wallY = sy + 1;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if ((i === 0 || i === 2 || j === 0 || j === 2) && !(i === 1 && j === 0)) {
              if (cm.isPlayerPlaced(px + dx + i, wallY, pz + dz + j)) wallCount++;
            }
          }
        }
        if (floorCount > bestFloor || (floorCount === bestFloor && wallCount > bestWall)) {
          bestFloor = floorCount;
          bestWall = wallCount;
        }
      }
    }
  }
  return { floor: bestFloor, wall: bestWall };
}

function hasMultiStoryHouse(cm: ChunkManager, px: number, py: number, pz: number, floors: number): boolean {
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let baseFloor = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz + j)) baseFloor++;
          }
        }
        if (baseFloor < 9) continue;
        let validFloors = 0;
        for (let f = 0; f < floors; f++) {
          const floorY = sy + f * 2;
          const wallY = floorY + 1;
          let floorCount = 0;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if (cm.isPlayerPlaced(px + dx + i, floorY, pz + dz + j)) floorCount++;
            }
          }
          if (floorCount < 9) break;

          let wallCount = 0;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if ((i === 0 || i === 2 || j === 0 || j === 2) && !(i === 1 && j === 0)) {
                if (cm.isPlayerPlaced(px + dx + i, wallY, pz + dz + j)) wallCount++;
              }
            }
          }
          if (wallCount >= 7) validFloors++;
        }
        if (validFloors >= floors) return true;
      }
    }
  }
  return false;
}

function hasBridge(cm: ChunkManager, px: number, py: number, pz: number, length: number): boolean {
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let bridgeCount = 0;
        for (let i = 0; i < length; i++) {
          if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz) && cm.isPlayerPlaced(px + dx + i, sy, pz + dz + 1)) bridgeCount++;
        }
        if (bridgeCount >= length) return true;
        bridgeCount = 0;
        for (let j = 0; j < length; j++) {
          if (cm.isPlayerPlaced(px + dx, sy, pz + dz + j) && cm.isPlayerPlaced(px + dx + 1, sy, pz + dz + j)) bridgeCount++;
        }
        if (bridgeCount >= length) return true;
      }
    }
  }
  return false;
}

function hasWalledCorridor(cm: ChunkManager, px: number, py: number, pz: number, length: number): boolean {
  for (let dx = -8; dx <= 8; dx++) {
    for (let dz = -8; dz <= 8; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let straightFloor = 0;
        let straightWalls = 0;
        let straightCaps = 0;
        for (let i = 0; i < length; i++) {
          if (
            cm.isPlayerPlaced(px + dx + i, sy, pz + dz - 1) &&
            cm.isPlayerPlaced(px + dx + i, sy, pz + dz) &&
            cm.isPlayerPlaced(px + dx + i, sy, pz + dz + 1) &&
            cm.isPlayerPlaced(px + dx + i, sy, pz + dz + 2)
          ) {
            straightFloor++;
          }
          if (cm.isPlayerPlaced(px + dx + i, sy + 1, pz + dz - 1) && cm.isPlayerPlaced(px + dx + i, sy + 1, pz + dz + 2)) {
            straightWalls++;
          }
          if (cm.isPlayerPlaced(px + dx + i, sy + 2, pz + dz - 1) && cm.isPlayerPlaced(px + dx + i, sy + 2, pz + dz + 2)) {
            straightCaps++;
          }
        }

        if (straightFloor >= length && straightWalls >= length && straightCaps >= length) return true;

        let sidewaysFloor = 0;
        let sidewaysWalls = 0;
        let sidewaysCaps = 0;
        for (let j = 0; j < length; j++) {
          if (
            cm.isPlayerPlaced(px + dx - 1, sy, pz + dz + j) &&
            cm.isPlayerPlaced(px + dx, sy, pz + dz + j) &&
            cm.isPlayerPlaced(px + dx + 1, sy, pz + dz + j) &&
            cm.isPlayerPlaced(px + dx + 2, sy, pz + dz + j)
          ) {
            sidewaysFloor++;
          }
          if (cm.isPlayerPlaced(px + dx - 1, sy + 1, pz + dz + j) && cm.isPlayerPlaced(px + dx + 2, sy + 1, pz + dz + j)) {
            sidewaysWalls++;
          }
          if (cm.isPlayerPlaced(px + dx - 1, sy + 2, pz + dz + j) && cm.isPlayerPlaced(px + dx + 2, sy + 2, pz + dz + j)) {
            sidewaysCaps++;
          }
        }

        if (sidewaysFloor >= length && sidewaysWalls >= length && sidewaysCaps >= length) return true;
      }
    }
  }
  return false;
}

function hasFence(cm: ChunkManager, px: number, py: number, pz: number, length: number): boolean {
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let fenceCount = 0;
        for (let i = 0; i < length; i++) {
          if (cm.isPlayerPlaced(px + dx + i, sy + 1, pz + dz)) fenceCount++;
        }
        if (fenceCount >= length) return true;
        fenceCount = 0;
        for (let j = 0; j < length; j++) {
          if (cm.isPlayerPlaced(px + dx, sy + 1, pz + dz + j)) fenceCount++;
        }
        if (fenceCount >= length) return true;
      }
    }
  }
  return false;
}

function hasTunnel(cm: ChunkManager, px: number, py: number, pz: number, length: number): boolean {
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      let tunnelCount = 0;
      const startY = py - 3;
      for (let i = 0; i < length; i++) {
        const isTunnel = !cm.isSolid(px + dx + i, startY, pz + dz) && !cm.isSolid(px + dx + i, startY + 1, pz + dz);
        if (isTunnel) tunnelCount++;
      }
      if (tunnelCount >= length) return true;
      tunnelCount = 0;
      for (let j = 0; j < length; j++) {
        const isTunnel = !cm.isSolid(px + dx, startY, pz + dz + j) && !cm.isSolid(px + dx, startY + 1, pz + dz + j);
        if (isTunnel) tunnelCount++;
      }
      if (tunnelCount >= length) return true;
    }
  }
  return false;
}

function hasWaterPool(cm: ChunkManager, px: number, py: number, pz: number, size: number): boolean {
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let sy = Math.max(1, py - 5); sy <= py + 5; sy++) {
        let waterCount = 0;
        let borderCount = 0;
        for (let x = 0; x < size; x++) {
          for (let z = 0; z < size; z++) {
            const isEdge = x === 0 || x === size - 1 || z === 0 || z === size - 1;
            const wx = px + dx + x;
            const wz = pz + dz + z;
            if (isEdge) {
              if (cm.isPlayerPlaced(wx, sy, wz)) borderCount++;
            } else if (cm.getBlock(wx, sy - 1, wz) === 28) {
              waterCount++;
            }
          }
        }
        if (waterCount >= 1 && borderCount >= size * 4 - 4) return true;
      }
    }
  }
  return false;
}

function hasStairs(cm: ChunkManager, px: number, py: number, pz: number, steps: number): boolean {
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let stairCount = 0;
        for (let i = 0; i < steps; i++) {
          if (cm.isPlayerPlaced(px + dx + i, sy + i, pz + dz)) stairCount++;
        }
        if (stairCount >= steps) return true;
        stairCount = 0;
        for (let i = 0; i < steps; i++) {
          if (cm.isPlayerPlaced(px + dx + i, sy - i, pz + dz)) stairCount++;
        }
        if (stairCount >= steps) return true;
      }
    }
  }
  return false;
}

function hasSupportedStairs(cm: ChunkManager, px: number, py: number, pz: number, steps: number): boolean {
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let ascendingX = true;
        for (let step = 0; step < steps && ascendingX; step++) {
          for (let y = 0; y <= step; y++) {
            if (!cm.isPlayerPlaced(px + dx + step, sy + y, pz + dz)) {
              ascendingX = false;
              break;
            }
          }
        }
        if (ascendingX) return true;

        let ascendingZ = true;
        for (let step = 0; step < steps && ascendingZ; step++) {
          for (let y = 0; y <= step; y++) {
            if (!cm.isPlayerPlaced(px + dx, sy + y, pz + dz + step)) {
              ascendingZ = false;
              break;
            }
          }
        }
        if (ascendingZ) return true;
      }
    }
  }
  return false;
}

function hasComplexStructure(cm: ChunkManager, px: number, py: number, pz: number): boolean {
  let structureCount = 0;
  for (let dx = -15; dx <= 15; dx++) {
    for (let dz = -15; dz <= 15; dz++) {
      for (let sy = Math.max(0, py - 15); sy <= py + 15; sy++) {
        let platformCount = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz + j)) platformCount++;
          }
        }
        if (platformCount >= 9) structureCount++;
      }
    }
  }
  return structureCount >= 3;
}

export function evaluateLevelSpec(spec: LevelSpec, cm: ChunkManager, playerPos: Vec3): LevelEvaluation {
  const px = Math.floor(playerPos.x);
  const py = Math.floor(playerPos.y);
  const pz = Math.floor(playerPos.z);

  switch (spec.validator.type) {
    case 'placed_block_count': {
      const current = countPlayerPlacedBlocks(cm, px, py, pz, spec.validator.radius ?? 5);
      const target = spec.validator.count;
      return {
        complete: current >= target,
        progress: [{ label: '方块', current, target }],
      };
    }
    case 'pillar': {
      const current = getBestPillarHeight(cm, px, py, pz);
      const target = spec.validator.height;
      return {
        complete: current >= target,
        progress: [{ label: '高度', current: Math.min(current, target), target }],
      };
    }
    case 'platform': {
      const current = countBestPlatform(cm, px, py, pz, spec.validator.size);
      const target = spec.validator.size * spec.validator.size;
      return {
        complete: current >= target,
        progress: [{ label: '地板', current, target }],
      };
    }
    case 'stacked_platform':
      return {
        complete: hasStackedPlatform(cm, px, py, pz, spec.validator.size, spec.validator.layers),
        progress: [],
      };
    case 'house': {
      const counts = countHouseBlocks(cm, px, py, pz);
      return {
        complete: counts.floor >= spec.validator.floorTarget && counts.wall >= spec.validator.wallTarget,
        progress: [
          { label: '地板', current: counts.floor, target: spec.validator.floorTarget },
          { label: '围墙', current: counts.wall, target: spec.validator.wallTarget },
        ],
      };
    }
    case 'multistory_house': {
      const complete = hasMultiStoryHouse(cm, px, py, pz, spec.validator.floors);
      return {
        complete,
        progress: [],
      };
    }
    case 'fence':
      return { complete: hasFence(cm, px, py, pz, spec.validator.length), progress: [] };
    case 'bridge':
      return { complete: hasBridge(cm, px, py, pz, spec.validator.length), progress: [] };
    case 'walled_corridor':
      return { complete: hasWalledCorridor(cm, px, py, pz, spec.validator.length), progress: [] };
    case 'tunnel':
      return { complete: hasTunnel(cm, px, py, pz, spec.validator.length), progress: [] };
    case 'basement': {
      let current = 0;
      for (let dy = 1; dy <= spec.validator.depth + 2; dy++) {
        let spaceCount = 0;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const x = px + dx;
            const y = py - dy;
            const z = pz + dz;
            if (!cm.isSolid(x, y, z) && cm.isPlayerRemoved(x, y, z)) spaceCount++;
          }
        }
        current = Math.max(current, spaceCount);
      }
      return {
        complete: current >= spec.validator.size * spec.validator.size,
        progress: [{ label: '空间', current, target: spec.validator.size * spec.validator.size }],
      };
    }
    case 'water_pool':
      return { complete: hasWaterPool(cm, px, py, pz, spec.validator.size), progress: [] };
    case 'stairs':
      return { complete: hasStairs(cm, px, py, pz, spec.validator.steps), progress: [] };
    case 'supported_stairs':
      return { complete: hasSupportedStairs(cm, px, py, pz, spec.validator.steps), progress: [] };
    case 'complex_structure':
      return { complete: hasComplexStructure(cm, px, py, pz), progress: [] };
    default:
      return { complete: false, progress: [] };
  }
}
