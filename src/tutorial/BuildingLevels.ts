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

// Helper functions for level checking

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
  let bestFloor = 0;
  let bestWall = 0;

  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        let floorCount = 0;
        const floorY = sy;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (cm.isPlayerPlaced(px + dx + i, floorY, pz + dz + j)) {
              floorCount++;
            }
          }
        }

        if (floorCount < 9) continue;

        let wallCount = 0;
        const wallY = floorY + 1;

        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (i === 0 || i === 2 || j === 0 || j === 2) {
              if (cm.isPlayerPlaced(px + dx + i, wallY, pz + dz + j)) {
                wallCount++;
              }
            }
          }
        }

        const outerPositions = [
          [0, -1], [1, -1], [2, -1],
          [0, 3], [1, 3], [2, 3],
          [-1, 0], [-1, 1], [-1, 2],
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
  return counts.floor >= 9 && counts.wall >= 4;
}

function hasMultiStoryHouse(cm: ChunkManager, px: number, py: number, pz: number, floors: number): boolean {
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        // Check base floor (3x3)
        let baseFloor = 0;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz + j)) baseFloor++;
          }
        }
        if (baseFloor < 9) continue;

        // Check walls for each floor
        let validFloors = 0;
        for (let f = 0; f < floors; f++) {
          const wallY = sy + 1 + f * 3;
          let wallCount = 0;
          // Walls at this level
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              if (i === 0 || i === 2 || j === 0 || j === 2) {
                for (let h = 0; h < 2; h++) {
                  if (cm.isPlayerPlaced(px + dx + i, wallY + h, pz + dz + j)) wallCount++;
                }
              }
            }
          }
          if (wallCount >= 8) validFloors++;
          // Check floor above
          if (f < floors - 1) {
            let nextFloor = 0;
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                if (cm.isPlayerPlaced(px + dx + i, wallY + 2, pz + dz + j)) nextFloor++;
              }
            }
            if (nextFloor < 9) break;
          }
        }
        if (validFloors >= floors) return true;
      }
    }
  }
  return false;
}

function hasBridge(cm: ChunkManager, px: number, py: number, pz: number, length: number): boolean {
  for (let dz = -5; dz <= 5; dz++) {
    for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
      // Check horizontal bridge
      let bridgeCount = 0;
      for (let i = 0; i < length; i++) {
        if (cm.isPlayerPlaced(px + i, sy, pz + dz) && cm.isPlayerPlaced(px + i, sy, pz + dz + 1)) {
          bridgeCount++;
        }
      }
      if (bridgeCount >= length) return true;

      // Check vertical bridge
      bridgeCount = 0;
      for (let j = 0; j < length; j++) {
        if (cm.isPlayerPlaced(px + dz, sy, pz + j) && cm.isPlayerPlaced(px + dz + 1, sy, pz + j)) {
          bridgeCount++;
        }
      }
      if (bridgeCount >= length) return true;
    }
  }
  return false;
}

function hasFence(cm: ChunkManager, px: number, py: number, pz: number, length: number): boolean {
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        // Check fence in any direction
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
  // Tunnel: dug through ground (air blocks where player removed)
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      // Check for dug tunnel (air blocks)
      let tunnelCount = 0;
      const startY = py - 3;
      for (let i = 0; i < length; i++) {
        // Check 1x2 tunnel (width 1, height 2)
        const isTunnel = !cm.isSolid(px + dx + i, startY, pz + dz) &&
                         !cm.isSolid(px + dx + i, startY + 1, pz + dz);
        if (isTunnel) tunnelCount++;
      }
      if (tunnelCount >= length) return true;

      // Also check vertical direction
      tunnelCount = 0;
      for (let j = 0; j < length; j++) {
        const isTunnel = !cm.isSolid(px + dx, startY, pz + dz + j) &&
                         !cm.isSolid(px + dx, startY + 1, pz + dz + j);
        if (isTunnel) tunnelCount++;
      }
      if (tunnelCount >= length) return true;
    }
  }
  return false;
}

function hasWaterPool(cm: ChunkManager, px: number, py: number, pz: number, size: number): boolean {
  // Check for water pool surrounded by player-placed blocks
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        // Check for water surrounded by blocks
        let waterCount = 0;
        let surroundCount = 0;
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            const wx = px + dx + i;
            const wz = pz + dz + j;
            // Water block (blockId 28)
            if (cm.getBlock(wx, sy - 1, wz) === 28) waterCount++;
          }
        }
        // Check surrounding edge
        for (let i = 0; i < size; i++) {
          if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz - 1)) surroundCount++;
          if (cm.isPlayerPlaced(px + dx + i, sy, pz + dz + size)) surroundCount++;
        }
        for (let j = 0; j < size; j++) {
          if (cm.isPlayerPlaced(px + dx - 1, sy, pz + dz + j)) surroundCount++;
          if (cm.isPlayerPlaced(px + dx + size, sy, pz + dz + j)) surroundCount++;
        }
        if (waterCount >= size * size && surroundCount >= size * 2) return true;
      }
    }
  }
  return false;
}

function hasStairs(cm: ChunkManager, px: number, py: number, pz: number, steps: number): boolean {
  // Check for stair structure (blocks ascending)
  for (let dx = -10; dx <= 10; dx++) {
    for (let dz = -10; dz <= 10; dz++) {
      for (let sy = Math.max(0, py - 10); sy <= py + 10; sy++) {
        // Ascending stairs
        let stairCount = 0;
        for (let i = 0; i < steps; i++) {
          if (cm.isPlayerPlaced(px + dx + i, sy + i, pz + dz)) stairCount++;
        }
        if (stairCount >= steps) return true;

        // Descending stairs
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

function hasComplexStructure(cm: ChunkManager, px: number, py: number, pz: number): boolean {
  // Complex: multiple connected structures
  let structureCount = 0;

  // Check for multiple platforms
  for (let dx = -15; dx <= 15; dx++) {
    for (let dz = -15; dz <= 15; dz++) {
      for (let sy = Math.max(0, py - 15); sy <= py + 15; sy++) {
        // Check for 3x3 platform
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

  // Need at least 3 separate structures
  return structureCount >= 3;
}

// 20 Levels with progressive difficulty

export const LEVELS: LevelGoal[] = [
  // Level 1-4: Basic building
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

  // Level 5-8: Intermediate building
  {
    title: '更高的塔',
    description: '堆叠5个方块成塔',
    hint: '继续向上堆叠方块，建造更高的塔',
    checkComplete: (cm, playerPos) => {
      return hasPillar(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 5);
    },
  },
  {
    title: '大平台',
    description: '建造5x5的平台',
    hint: '放置25个方块组成5x5平面',
    checkComplete: (cm, playerPos) => {
      return hasPlatform(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 5);
    },
  },
  {
    title: '石头房子',
    description: '用不同材料建房子',
    hint: '尝试用石头或其他方块建造房子',
    checkComplete: (cm, playerPos) => {
      return hasSmallHouse(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z));
    },
  },
  {
    title: '双层小楼',
    description: '建造两层楼的房子',
    hint: '先建一层，再在上面建第二层',
    checkComplete: (cm, playerPos) => {
      return hasMultiStoryHouse(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 2);
    },
  },

  // Level 9-12: Structural elements
  {
    title: '围栏',
    description: '建造一条6格长的围栏',
    hint: '在地面上方放置一排方块作为围栏',
    checkComplete: (cm, playerPos) => {
      return hasFence(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 6);
    },
  },
  {
    title: '桥梁',
    description: '建造一座6格长的桥',
    hint: '在水面上或空中建造一座桥',
    checkComplete: (cm, playerPos) => {
      return hasBridge(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 6);
    },
  },
  {
    title: '长廊',
    description: '建造一条8格长的走廊',
    hint: '建造一条有顶盖的走廊',
    checkComplete: (cm, playerPos) => {
      return hasBridge(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 8);
    },
  },
  {
    title: '观景台',
    description: '在高处建造平台',
    hint: '先建一座塔，再在塔顶建平台',
    checkComplete: (cm, playerPos) => {
      const p = Math.floor(playerPos.x);
      const py = Math.floor(playerPos.y);
      const pz = Math.floor(playerPos.z);
      // Check for platform above ground level
      for (let y = py + 5; y >= py; y--) {
        if (hasPlatform(cm, p, y, pz, 3)) return true;
      }
      return false;
    },
  },

  // Level 13-16: Advanced structures
  {
    title: '窗户房子',
    description: '建造带窗户的房子',
    hint: '在房子墙壁中留出空位作为窗户',
    checkComplete: (cm, playerPos) => {
      return hasSmallHouse(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z));
    },
  },
  {
    title: '城堡一角',
    description: '建造城堡的一个角落',
    hint: '建造带有高墙的城堡结构',
    checkComplete: (cm, playerPos) => {
      return hasPillar(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 7);
    },
  },
  {
    title: '隧道',
    description: '挖掘一条5格长的隧道',
    hint: '在地面下挖掘一条通道',
    checkComplete: (cm, playerPos) => {
      return hasTunnel(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 5);
    },
  },
  {
    title: '地下室',
    description: '挖掘一个地下室空间',
    hint: '向下挖掘3格深，建造一个空间',
    checkComplete: (cm, playerPos) => {
      const px = Math.floor(playerPos.x);
      const py = Math.floor(playerPos.y);
      const pz = Math.floor(playerPos.z);
      // Check for dug space below
      for (let dy = 1; dy <= 5; dy++) {
        let spaceCount = 0;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (!cm.isSolid(px + dx, py - dy, pz + dz)) spaceCount++;
          }
        }
        if (spaceCount >= 9) return true;
      }
      return false;
    },
  },

  // Level 17-20: Expert challenges
  {
    title: '水池',
    description: '建造一个有边框的水池',
    hint: '挖一个坑，放置水，再用方块围起来',
    checkComplete: (cm, playerPos) => {
      return hasWaterPool(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 3);
    },
  },
  {
    title: '阶梯建筑',
    description: '建造带有阶梯的建筑',
    hint: '建造阶梯通往高处',
    checkComplete: (cm, playerPos) => {
      return hasStairs(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 5);
    },
  },
  {
    title: '复合结构',
    description: '建造多个相连的建筑',
    hint: '建造房子、塔、平台等多个结构并连接',
    checkComplete: (cm, playerPos) => {
      return hasComplexStructure(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z));
    },
  },
  {
    title: '自由创作',
    description: '建造你的梦想建筑',
    hint: '发挥创意，建造任何你想要的建筑！',
    checkComplete: (cm, playerPos) => {
      return countPlayerPlacedBlocks(cm, Math.floor(playerPos.x), Math.floor(playerPos.y), Math.floor(playerPos.z), 20) >= 50;
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
