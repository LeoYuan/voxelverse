import type { ChunkManager } from '../engine/ChunkManager';
import type { Vec3 } from '../utils/Vec3';

export interface LevelProgress {
  current: number;
  target: number;
  label: string;
}

export interface LevelGoal {
  title: string;
  description: string;
  hint: string;
  checkComplete: (cm: ChunkManager, playerPos: Vec3) => boolean;
  getProgress?: (cm: ChunkManager, playerPos: Vec3) => LevelProgress[];
}

function countPlayerPlacedBlocks(cm: ChunkManager, px: number, py: number, pz: number, radius: number): number {
  let count = 0;
  for (let x = px - radius; x <= px + radius; x++) {
    for (let y = py - radius; y <= py + radius; y++) {
      for (let z = pz - radius; z <= pz + radius; z++) {
        if (cm.isPlayerPlaced(x, y, z)) {
          count++;
        }
      }
    }
  }
  return count;
}

function hasPillar(cm: ChunkManager, px: number, py: number, pz: number, height: number): boolean {
  // Check for a vertical stack of player-placed blocks anywhere near player
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let y = Math.max(0, py - 5); y <= py + 5; y++) {
        if (!cm.isPlayerPlaced(px + dx, y, pz + dz)) continue;
        let h = 1;
        for (let dy = 1; dy < height; dy++) {
          if (cm.isPlayerPlaced(px + dx, y + dy, pz + dz)) {
            h++;
          } else {
            break;
          }
        }
        if (h >= height) return true;
      }
    }
  }
  return false;
}

function hasPlatform(cm: ChunkManager, px: number, py: number, pz: number, size: number): boolean {
  // Check for a flat platform of player-placed blocks anywhere near player
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      for (let y = Math.max(0, py - 5); y <= py + 5; y++) {
        let count = 0;
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (cm.isPlayerPlaced(px + dx + i, y, pz + dz + j)) {
              count++;
            }
          }
        }
        if (count >= size * size) return true;
      }
    }
  }
  return false;
}

function countHouseBlocks(cm: ChunkManager, px: number, py: number, pz: number): { floor: number; wall: number } {
  // Search for a house structure near the player
  // Floor: a flat 3x3 area of player-placed blocks
  // Wall: blocks surrounding the floor (either on the floor edge or one block outside)

  let bestFloor = 0;
  let bestWall = 0;

  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        // Check for 3x3 floor at this position
        let floorCount = 0;
        const floorY = sy;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (cm.isPlayerPlaced(px + dx + i, floorY, pz + dz + j)) {
              floorCount++;
            }
          }
        }

        if (floorCount < 9) continue; // Must have complete floor

        // Count walls around the floor (1 block above floor level)
        // Walls can be: on floor perimeter (inner walls) OR one block outside (outer walls)
        let wallCount = 0;
        const wallY = floorY + 1;

        // Inner walls: on the 3x3 floor boundary
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 0 || i === 2 || j === 0 || j === 2) {
              if (cm.isPlayerPlaced(px + dx + i, wallY, pz + dz + j)) {
                wallCount++;
              }
            }
          }
        }

        // Outer walls: one block outside the 3x3 floor (5x5 perimeter minus corners)
        // Only count if there's a block directly below (on the floor edge or ground)
        const outerPositions = [
          // North side (z = -1 relative to floor)
          [0, -1], [1, -1], [2, -1],
          // South side (z = 3 relative to floor)
          [0, 3], [1, 3], [2, 3],
          // West side (x = -1 relative to floor)
          [-1, 0], [-1, 1], [-1, 2],
          // East side (x = 3 relative to floor)
          [3, 0], [3, 1], [3, 2],
        ];
        for (const [oi, oj] of outerPositions) {
          const wx = px + dx + oi;
          const wz = pz + dz + oj;
          if (cm.isPlayerPlaced(wx, wallY, wz)) {
            wallCount++;
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

function hasSmallHouse(cm: ChunkManager, px: number, py: number, pz: number): boolean {
  const counts = countHouseBlocks(cm, px, py, pz);
  // Need: 3x3 floor (9 blocks) + at least 4 wall blocks around it
  return counts.floor >= 9 && counts.wall >= 4;
}

export const LEVELS: LevelGoal[] = [
  {
    title: '第一块方块',
    description: '放置任意1个方块',
    hint: '右键点击地面放置一个方块',
    checkComplete: (cm, playerPos) => {
      return countPlayerPlacedBlocks(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 5) >= 1;
    },
  },
  {
    title: '小小高塔',
    description: '堆叠3个方块成一列',
    hint: '站在原地，按住右键往脚下连续放置方块',
    checkComplete: (cm, playerPos) => {
      return hasPillar(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 3);
    },
  },
  {
    title: '小平台',
    description: '建造3x3的平台',
    hint: '在地面上连续放置9个方块组成3x3平面',
    checkComplete: (cm, playerPos) => {
      return hasPlatform(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 3);
    },
  },
  {
    title: '小房子',
    description: '建造一个简单的房子',
    hint: '铺一个3×3的地板，再在四周放几块围墙',
    checkComplete: (cm, playerPos) => {
      return hasSmallHouse(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z));
    },
    getProgress: (cm, playerPos) => {
      const counts = countHouseBlocks(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z));
      return [
        { current: counts.floor, target: 9, label: '地板' },
        { current: counts.wall, target: 4, label: '围墙' },
      ];
    },
  },
];

export class LevelManager {
  currentLevel = 0;
  skipped = false;

  get current(): LevelGoal | null {
    if (this.skipped || this.currentLevel >= LEVELS.length) return null;
    return LEVELS[this.currentLevel];
  }

  check(cm: ChunkManager, playerPos: Vec3): boolean {
    const level = this.current;
    if (!level) return false;
    return level.checkComplete(cm, playerPos);
  }

  nextLevel(): void {
    this.currentLevel++;
  }

  skip(): void {
    this.skipped = true;
  }

  isComplete(): boolean {
    return this.skipped || this.currentLevel >= LEVELS.length;
  }

  get progress(): string {
    if (this.skipped) return '已跳过';
    if (this.isComplete()) return '自由创造模式';
    return `第 ${this.currentLevel + 1} / ${LEVELS.length} 关`;
  }
}
