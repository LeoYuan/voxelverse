import {
  BLOCK_REDSTONE_LAMP,
  BLOCK_REDSTONE_LAMP_LIT,
} from '../blocks/BlockRegistry';
import type { ChunkManager } from '../engine/ChunkManager';
import type { CampaignObjective } from './CampaignConfig';
import type { CampaignProgress } from './CampaignManager';

const CAMPAIGN_RADIUS = 16;

export interface CampaignBasePosition {
  x: number;
  y: number;
  z: number;
}

export function evaluateCampaignObjective(
  objective: CampaignObjective,
  cm: ChunkManager,
  base: CampaignBasePosition,
  chapterStartRevision: number,
): CampaignProgress {
  const centerX = Math.floor(base.x);
  const centerY = Math.floor(base.y);
  const centerZ = Math.floor(base.z);

  if (objective.type === 'shelter') {
    const shelter = findBestShelter(cm, centerX, centerY, centerZ);
    return {
      objectiveCurrent:
        Math.min(shelter.floor, objective.floor) +
        Math.min(shelter.walls, objective.walls),
      objectiveTarget: objective.floor + objective.walls,
      requirementsMet:
        shelter.floor >= objective.floor &&
        shelter.walls >= objective.walls,
    };
  }

  const blockCounts = normalizeBlockCounts(
    cm.countPlacedBlockIds(centerX, centerY, centerZ, CAMPAIGN_RADIUS),
  );

  if (objective.type === 'required_blocks') {
    const requirements = evaluateRequirements(objective.requirements, blockCounts);
    return {
      objectiveCurrent: requirements.current,
      objectiveTarget: requirements.target,
      requirementsMet: requirements.complete,
    };
  }

  const placed = cm.countPlayerPlacementsSince(
    chapterStartRevision,
    centerX,
    centerY,
    centerZ,
    CAMPAIGN_RADIUS,
  );
  const requirements = evaluateRequirements(objective.requirements ?? {}, blockCounts);
  return {
    objectiveCurrent: Math.min(placed, objective.count),
    objectiveTarget: objective.count,
    requirementsMet: requirements.complete,
  };
}

function findBestShelter(
  cm: ChunkManager,
  centerX: number,
  centerY: number,
  centerZ: number,
): { floor: number; walls: number } {
  let bestFloor = 0;
  let bestWalls = 0;
  let bestScore = 0;

  for (let originX = centerX - 10; originX <= centerX + 10; originX++) {
    for (let originZ = centerZ - 10; originZ <= centerZ + 10; originZ++) {
      for (let floorY = Math.max(0, centerY - 6); floorY <= centerY + 6; floorY++) {
        let floor = 0;
        let walls = 0;

        for (let x = 0; x < 3; x++) {
          for (let z = 0; z < 3; z++) {
            const worldX = originX + x;
            const worldZ = originZ + z;
            if (cm.isPlayerPlaced(worldX, floorY, worldZ)) floor++;
            const edge = x === 0 || x === 2 || z === 0 || z === 2;
            if (edge && cm.isPlayerPlaced(worldX, floorY + 1, worldZ)) walls++;
          }
        }

        const score = floor + walls;
        if (score > bestScore) {
          bestScore = score;
          bestFloor = floor;
          bestWalls = walls;
        }
      }
    }
  }

  return { floor: bestFloor, walls: bestWalls };
}

function normalizeBlockCounts(counts: Record<number, number>): Record<number, number> {
  const normalized = { ...counts };
  normalized[BLOCK_REDSTONE_LAMP] =
    (normalized[BLOCK_REDSTONE_LAMP] ?? 0) +
    (normalized[BLOCK_REDSTONE_LAMP_LIT] ?? 0);
  delete normalized[BLOCK_REDSTONE_LAMP_LIT];
  return normalized;
}

function evaluateRequirements(
  requirements: Record<number, number>,
  counts: Record<number, number>,
): { current: number; target: number; complete: boolean } {
  let current = 0;
  let target = 0;
  let complete = true;

  for (const [blockIdText, required] of Object.entries(requirements)) {
    const blockId = Number(blockIdText);
    const count = counts[blockId] ?? 0;
    current += Math.min(count, required);
    target += required;
    if (count < required) complete = false;
  }

  return { current, target, complete };
}
