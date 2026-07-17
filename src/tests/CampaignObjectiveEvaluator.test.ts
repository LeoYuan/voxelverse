import { describe, expect, it } from 'vitest';
import {
  BLOCK_CRAFTING_TABLE,
  BLOCK_FURNACE,
  BLOCK_PLANKS,
  BLOCK_REDSTONE_LAMP,
  BLOCK_REDSTONE_LAMP_LIT,
  BLOCK_STONE,
} from '../blocks/BlockRegistry';
import type { CampaignObjective } from '../campaign/CampaignConfig';
import { evaluateCampaignObjective } from '../campaign/CampaignObjectiveEvaluator';
import { ChunkManager } from '../engine/ChunkManager';
import { Vec3 } from '../utils/Vec3';

const base = new Vec3(0, 10, 0);

describe('evaluateCampaignObjective', () => {
  it('recognizes a player-built 3x3 shelter with seven wall blocks', () => {
    const cm = new ChunkManager(42);
    for (let x = 0; x < 3; x++) {
      for (let z = 0; z < 3; z++) {
        cm.setPlayerBlock(x, 10, z, BLOCK_PLANKS);
      }
    }
    const wallPositions = [
      [0, 0], [1, 0], [2, 0],
      [0, 1], [2, 1],
      [0, 2], [2, 2],
    ];
    for (const [x, z] of wallPositions) {
      cm.setPlayerBlock(x, 11, z, BLOCK_STONE);
    }

    const progress = evaluateCampaignObjective(
      { type: 'shelter', floor: 9, walls: 7 },
      cm,
      base,
      0,
    );

    expect(progress).toEqual({
      objectiveCurrent: 16,
      objectiveTarget: 16,
      requirementsMet: true,
    });
  });

  it('does not count generated blocks toward a shelter', () => {
    const cm = new ChunkManager(42);
    cm.ensureChunk(0, 0);

    const progress = evaluateCampaignObjective(
      { type: 'shelter', floor: 9, walls: 7 },
      cm,
      base,
      0,
    );

    expect(progress.requirementsMet).toBe(false);
    expect(progress.objectiveCurrent).toBe(0);
  });

  it('counts required utility blocks only inside the campaign radius', () => {
    const cm = new ChunkManager(42);
    cm.setPlayerBlock(2, 10, 2, BLOCK_CRAFTING_TABLE);
    cm.setPlayerBlock(4, 10, 4, BLOCK_FURNACE);
    cm.setPlayerBlock(40, 10, 40, BLOCK_FURNACE);

    const objective: CampaignObjective = {
      type: 'required_blocks',
      requirements: {
        [BLOCK_CRAFTING_TABLE]: 1,
        [BLOCK_FURNACE]: 1,
      },
    };

    expect(evaluateCampaignObjective(objective, cm, base, 0)).toEqual({
      objectiveCurrent: 2,
      objectiveTarget: 2,
      requirementsMet: true,
    });
  });

  it('counts only current placements after the chapter baseline', () => {
    const cm = new ChunkManager(42);
    cm.setPlayerBlock(1, 10, 1, BLOCK_STONE);
    const baseline = cm.getPlacementRevision();
    cm.setPlayerBlock(2, 10, 2, BLOCK_STONE);
    cm.setPlayerBlock(3, 10, 3, BLOCK_STONE);
    cm.setPlayerBlock(3, 10, 3, 0);

    const objective: CampaignObjective = {
      type: 'reinforcement',
      count: 2,
    };

    expect(evaluateCampaignObjective(objective, cm, base, baseline)).toEqual({
      objectiveCurrent: 1,
      objectiveTarget: 2,
      requirementsMet: true,
    });
  });

  it('treats lit and unlit redstone lamps as the same requirement', () => {
    const cm = new ChunkManager(42);
    const baseline = cm.getPlacementRevision();
    cm.setPlayerBlock(1, 10, 1, BLOCK_STONE);
    cm.setPlayerBlock(2, 10, 2, BLOCK_REDSTONE_LAMP);
    cm.setPlayerBlock(3, 10, 3, BLOCK_REDSTONE_LAMP_LIT);

    const objective: CampaignObjective = {
      type: 'reinforcement',
      count: 1,
      requirements: { [BLOCK_REDSTONE_LAMP]: 2 },
    };

    expect(evaluateCampaignObjective(objective, cm, base, baseline)).toEqual({
      objectiveCurrent: 1,
      objectiveTarget: 1,
      requirementsMet: true,
    });
  });
});
